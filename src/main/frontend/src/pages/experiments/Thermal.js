import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Thermal.css';

// THERMAL — 열 확산과 라우팅 실험 (열방정식 유한차분).
// 핵심: 열은 뜨거운 곳에서 찬 곳으로 스스로 퍼진다(확산). 하지만 재료가 그 길을 바꾼다 —
// 도체는 열을 빠르게 실어 나르고, 단열재는 막아 세운다. 전기 회로에 배선을 깔듯,
// 열도 도체 "채널"을 놓아 원하는 곳으로 몰아줄 수 있다. 여기에 열 손실(주변으로 식음)이
// 더해지면, 열원에서 멀수록 온기가 닿기 어려워져 "어디로 흘려보낼지"가 문제가 된다.
//   각 칸의 온도 T는 이웃과의 온도차에 비례해 오간다:  T ← T + rate·Σ kEff·(T_이웃 − T)
//   kEff = 두 칸 열전도율의 조화평균 → 단열재가 하나라도 끼면 흐름이 거의 끊긴다.

const COLS = 30;
const ROWS = 18;
const IDX = (r, c) => r * COLS + c;
const CELL = 22; // 캔버스 백킹 픽셀(내부 해상도) — CSS로 100% 확대

// 재료 — 열전도율(diffusivity)이 확산 속도를 가른다. 열원/냉각원은 온도가 고정된다.
const NORMAL = 0;
const COND = 1;
const INS = 2;
const SOURCE = 3;
const SINK = 4;
const DIFF = { [NORMAL]: 0.35, [COND]: 1.0, [INS]: 0.02, [SOURCE]: 1.0, [SINK]: 1.0 };

const TOOLS = [
    { id: SOURCE, label: '열원', hint: '뜨겁게 고정', sw: 'src' },
    { id: COND, label: '도체', hint: '열을 빠르게', sw: 'cond' },
    { id: INS, label: '단열재', hint: '열을 막는 벽', sw: 'ins' },
    { id: SINK, label: '냉각원', hint: '차갑게 고정', sw: 'sink' },
    { id: NORMAL, label: '지우개', hint: '기본 바탕', sw: 'norm' },
    { id: 'probe', label: '측정기', hint: '온도를 잰다', sw: 'probe' },
];

// 흑체 발광풍 열 컬러맵(검정→적→주황→노랑→백열). AI풍 보라 그라데이션은 쓰지 않는다.
function buildLUT() {
    const stops = [
        [0.00, [10, 12, 18]],
        [0.18, [55, 16, 22]],
        [0.36, [140, 28, 24]],
        [0.52, [196, 64, 20]],
        [0.68, [232, 124, 26]],
        [0.84, [248, 190, 70]],
        [1.00, [255, 244, 212]],
    ];
    const lut = new Array(256);
    for (let k = 0; k < 256; k++) {
        const t = k / 255;
        let a = stops[0];
        let b = stops[stops.length - 1];
        for (let s = 0; s < stops.length - 1; s++) {
            if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
        }
        const span = (b[0] - a[0]) || 1;
        const f = (t - a[0]) / span;
        const r = Math.round(a[1][0] + (b[1][0] - a[1][0]) * f);
        const g = Math.round(a[1][1] + (b[1][1] - a[1][1]) * f);
        const bl = Math.round(a[1][2] + (b[1][2] - a[1][2]) * f);
        lut[k] = `rgb(${r},${g},${bl})`;
    }
    return lut;
}
const LUT = buildLUT();

const Thermal = () => {
    const canvasRef = useRef(null);
    const tempRef = useRef(new Float32Array(COLS * ROWS));
    const nextRef = useRef(new Float32Array(COLS * ROWS));
    const matRef = useRef(new Uint8Array(COLS * ROWS));
    const probeRef = useRef({ r: 9, c: COLS - 5 });
    const rateRef = useRef(0.12);
    const lossRef = useRef(0.004);
    const toolRef = useRef(SOURCE);
    const drawingRef = useRef(false);
    const stepsRef = useRef(0);

    const [tool, setTool] = useState(SOURCE);
    const [running, setRunning] = useState(true);
    const [rate, setRate] = useState(0.12);
    const [loss, setLoss] = useState(0.004);
    const [probe, setProbe] = useState({ r: 9, c: COLS - 5 });
    const [stats, setStats] = useState({ probe: 0, hot: 0, warm: 0, steps: 0 });

    // 한 스텝 — 이웃과의 열 교환(확산) + 주변으로의 손실. 열원/냉각원은 온도를 고정한다.
    const step = useCallback(() => {
        const T = tempRef.current;
        const M = matRef.current;
        const nx = nextRef.current;
        const rt = rateRef.current;
        const ls = lossRef.current;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const i = IDX(r, c);
                const m = M[i];
                if (m === SOURCE) { nx[i] = 1; continue; }
                if (m === SINK) { nx[i] = 0; continue; }
                const ki = DIFF[m];
                let flux = 0;
                if (r > 0) { const j = i - COLS; const kj = DIFF[M[j]]; flux += (2 * ki * kj / (ki + kj)) * (T[j] - T[i]); }
                if (r < ROWS - 1) { const j = i + COLS; const kj = DIFF[M[j]]; flux += (2 * ki * kj / (ki + kj)) * (T[j] - T[i]); }
                if (c > 0) { const j = i - 1; const kj = DIFF[M[j]]; flux += (2 * ki * kj / (ki + kj)) * (T[j] - T[i]); }
                if (c < COLS - 1) { const j = i + 1; const kj = DIFF[M[j]]; flux += (2 * ki * kj / (ki + kj)) * (T[j] - T[i]); }
                let v = T[i] + rt * flux;
                v -= ls * v; // 주변으로 식는 손실 — 열원에서 멀수록 온기가 닿기 어려워진다
                nx[i] = v < 0 ? 0 : v > 1 ? 1 : v;
            }
        }
        tempRef.current = nx;
        nextRef.current = T;
    }, []);

    const render = useCallback(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const T = tempRef.current;
        const M = matRef.current;
        const cw = cv.width / COLS;
        const ch = cv.height / ROWS;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const i = IDX(r, c);
                const m = M[i];
                let color;
                if (m === INS) color = '#2b313d';
                else if (m === SINK) color = '#12365c';
                else { const t = T[i]; color = LUT[t <= 0 ? 0 : t >= 1 ? 255 : (t * 255) | 0]; }
                ctx.fillStyle = color;
                ctx.fillRect(c * cw, r * ch, cw + 0.6, ch + 0.6);
                if (m === COND) {
                    ctx.strokeStyle = 'rgba(150,172,196,0.55)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(c * cw + 1.5, r * ch + 1.5, cw - 3, ch - 3);
                } else if (m === SOURCE) {
                    ctx.strokeStyle = 'rgba(255,244,214,0.9)';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(c * cw + 1.5, r * ch + 1.5, cw - 3, ch - 3);
                } else if (m === SINK) {
                    ctx.strokeStyle = 'rgba(150,200,255,0.85)';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(c * cw + 1.5, r * ch + 1.5, cw - 3, ch - 3);
                }
            }
        }
        // 측정기 마커
        const p = probeRef.current;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.c * cw + 2, p.r * ch + 2, cw - 4, ch - 4);
        ctx.beginPath();
        ctx.moveTo(p.c * cw + cw / 2, p.r * ch);
        ctx.lineTo(p.c * cw + cw / 2, p.r * ch + ch);
        ctx.moveTo(p.c * cw, p.r * ch + ch / 2);
        ctx.lineTo(p.c * cw + cw, p.r * ch + ch / 2);
        ctx.stroke();
    }, []);

    const updateStats = useCallback(() => {
        const T = tempRef.current;
        let hot = 0;
        let warm = 0;
        for (let i = 0; i < T.length; i++) {
            if (T[i] > hot) hot = T[i];
            if (T[i] > 0.5) warm++;
        }
        const p = probeRef.current;
        setStats({ probe: T[IDX(p.r, p.c)], hot, warm, steps: stepsRef.current });
    }, []);

    // 재생 루프 — rate/loss는 ref로 읽어 슬라이더 조작이 루프를 재시작시키지 않게 한다.
    useEffect(() => {
        if (!running) return undefined;
        const id = setInterval(() => {
            step();
            stepsRef.current += 1;
            render();
            updateStats();
        }, 33);
        return () => clearInterval(id);
    }, [running, step, render, updateStats]);

    const paint = useCallback((r, c) => {
        const t = toolRef.current;
        if (t === 'probe') {
            probeRef.current = { r, c };
            setProbe({ r, c });
            render();
            updateStats();
            return;
        }
        const i = IDX(r, c);
        matRef.current[i] = t;
        if (t === SOURCE) tempRef.current[i] = 1;
        else if (t === SINK || t === INS) tempRef.current[i] = 0;
        render();
    }, [render, updateStats]);

    const cellFromEvent = useCallback((e) => {
        const cv = canvasRef.current;
        const rect = cv.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * COLS;
        const y = ((e.clientY - rect.top) / rect.height) * ROWS;
        const c = Math.max(0, Math.min(COLS - 1, Math.floor(x)));
        const r = Math.max(0, Math.min(ROWS - 1, Math.floor(y)));
        return { r, c };
    }, []);

    const onDown = useCallback((e) => {
        e.preventDefault();
        drawingRef.current = true;
        const { r, c } = cellFromEvent(e);
        paint(r, c);
    }, [cellFromEvent, paint]);

    const onMove = useCallback((e) => {
        if (!drawingRef.current) return;
        const { r, c } = cellFromEvent(e);
        paint(r, c);
    }, [cellFromEvent, paint]);

    const endDraw = useCallback(() => { drawingRef.current = false; }, []);

    // 장면 구성 — 'default'는 왼쪽 열원 + 오른쪽 측정기, 'channel'은 도체 채널 시연.
    const applyScene = useCallback((kind) => {
        const T = tempRef.current;
        const M = matRef.current;
        T.fill(0);
        M.fill(NORMAL);
        const mid = Math.floor(ROWS / 2);
        if (kind !== 'clear') {
            for (let dr = -1; dr <= 1; dr++) {
                const i = IDX(mid + dr, 2);
                M[i] = SOURCE; T[i] = 1;
            }
        }
        if (kind === 'channel') {
            for (let c = 3; c < COLS - 3; c++) M[IDX(mid, c)] = COND;
            for (let c = 5; c < COLS - 5; c++) { M[IDX(mid - 3, c)] = INS; M[IDX(mid + 3, c)] = INS; }
        }
        probeRef.current = { r: mid, c: COLS - 5 };
        setProbe({ r: mid, c: COLS - 5 });
        stepsRef.current = 0;
        render();
        updateStats();
    }, [render, updateStats]);

    // 최초 마운트 — 캔버스 백킹 해상도 설정 + 기본 장면.
    useEffect(() => {
        const cv = canvasRef.current;
        cv.width = COLS * CELL;
        cv.height = ROWS * CELL;
        applyScene('default');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pickTool = (id) => { toolRef.current = id; setTool(id); };
    const changeRate = (v) => { rateRef.current = v; setRate(v); };
    const changeLoss = (v) => { lossRef.current = v; setLoss(v); };
    const stepOnce = () => { if (!running) { step(); stepsRef.current += 1; render(); updateStats(); } };

    const pct = (v) => `${Math.round(v * 100)}`;
    const probeHot = stats.probe > 0.5;

    return (
        <LabShell
            title="THERMAL"
            eyebrow="heat diffusion"
            subtitle={'// 재료를 칠해 열이 흐르는 길을 설계한다 — 도체로 나르고, 단열재로 막는다'}
            path="thermal.exe"
        >
            <section className="k-win th-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/field/</span>heat</span>
                    <span className="meta k-mono">T ← T + rate·Σ kEff·ΔT</span>
                </div>

                <div className="th-toolbar">
                    <div className="th-tools" role="group" aria-label="재료 붓">
                        {TOOLS.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                className={`th-tool ${tool === t.id ? 'is-on' : ''}`}
                                onClick={() => pickTool(t.id)}
                            >
                                <span className={`th-sw th-sw-${t.sw}`} />
                                <b>{t.label}</b>
                                <span className="th-tool-h k-mono">{t.hint}</span>
                            </button>
                        ))}
                    </div>
                    <div className="th-ctrls">
                        <div className="th-ctrl">
                            <label className="th-ctrl-label k-mono" htmlFor="th-rate">확산 속도 <b>{pct(rate / 0.15)}%</b></label>
                            <input id="th-rate" type="range" min="0.03" max="0.15" step="0.01"
                                value={rate} onChange={(e) => changeRate(Number(e.target.value))} />
                        </div>
                        <div className="th-ctrl">
                            <label className="th-ctrl-label k-mono" htmlFor="th-loss">열 손실 <b>{(loss * 100).toFixed(1)}%</b></label>
                            <input id="th-loss" type="range" min="0" max="0.02" step="0.001"
                                value={loss} onChange={(e) => changeLoss(Number(e.target.value))} />
                        </div>
                    </div>
                    <div className="th-actions">
                        <button type="button" className="th-btn" onClick={() => setRunning((v) => !v)}>
                            {running ? '⏸ 정지' : '▶ 재생'}
                        </button>
                        <button type="button" className="th-btn th-btn-ghost" onClick={stepOnce} disabled={running}>한 스텝</button>
                        <button type="button" className="th-btn th-btn-ghost" onClick={() => applyScene('channel')}>예시: 채널</button>
                        <button type="button" className="th-btn th-btn-ghost" onClick={() => applyScene('clear')}>비우기</button>
                        <button type="button" className="th-btn th-btn-ghost" onClick={() => applyScene('default')}>리셋</button>
                    </div>
                </div>

                <div className="th-stage">
                    <div className="th-canvas-col">
                        <div className="th-screen">
                            <canvas
                                ref={canvasRef}
                                className="th-canvas"
                                onPointerDown={onDown}
                                onPointerMove={onMove}
                                onPointerUp={endDraw}
                                onPointerLeave={endDraw}
                            />
                        </div>
                        <div className="th-scale" aria-hidden="true">
                            <span className="k-mono">차갑다</span>
                            <span className="th-scale-bar" />
                            <span className="k-mono">뜨겁다</span>
                        </div>
                        <p className="th-canvas-foot k-mono">
                            붓을 골라 화면을 <b>드래그</b>해 재료를 칠하세요 · <b>측정기</b>를 옮겨 그 지점 온도를 재고 · <b>예시: 채널</b>로 라우팅을 확인
                        </p>
                    </div>

                    <div className="th-right">
                        <div className={`th-probe ${probeHot ? 'is-hot' : ''}`}>
                            <span className="th-probe-lab k-mono">측정기 온도</span>
                            <span className="th-probe-num k-mono">{pct(stats.probe)}<i>%</i></span>
                            <span className="th-probe-sub k-mono">
                                {probeHot ? '열이 닿았다' : stats.probe > 0.1 ? '미지근하다' : '아직 차갑다'}
                            </span>
                        </div>

                        <div className="th-stats">
                            <div className="th-stat">
                                <span className="th-stat-lab k-mono">최고 온도</span>
                                <span className="th-stat-num k-mono">{pct(stats.hot)}%</span>
                            </div>
                            <div className="th-stat">
                                <span className="th-stat-lab k-mono">달군 칸</span>
                                <span className="th-stat-num k-mono">{stats.warm}</span>
                                <span className="th-stat-sub k-mono">/ {COLS * ROWS} (&gt;50%)</span>
                            </div>
                            <div className="th-stat">
                                <span className="th-stat-lab k-mono">스텝</span>
                                <span className="th-stat-num k-mono">{stats.steps}</span>
                            </div>
                        </div>

                        <div className="th-legend">
                            <div className="th-legend-head k-mono">재료</div>
                            <ul className="th-legend-list">
                                <li><span className="th-sw th-sw-src" /> 열원 — 온도 100% 고정</li>
                                <li><span className="th-sw th-sw-cond" /> 도체 — 열을 빠르게 전달</li>
                                <li><span className="th-sw th-sw-ins" /> 단열재 — 열을 막는 벽</li>
                                <li><span className="th-sw th-sw-sink" /> 냉각원 — 온도 0% 고정</li>
                                <li><span className="th-sw th-sw-probe" /> 측정기 — 온도 판독점</li>
                            </ul>
                        </div>

                        <div className={`th-verdict ${probeHot ? 'is-on' : ''}`}>
                            <p className="th-verdict-txt">
                                {probeHot
                                    ? <>열원에서 시작한 온기가 측정기까지 <b>닿았습니다</b>. 손실을 올리거나 도체를 지워 보세요.</>
                                    : <>측정기가 아직 차갑습니다. <b>도체</b>로 열원과 이어 주거나 <b>열 손실</b>을 낮춰 보세요.</>}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win th-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="th-foot">
                    <p>
                        {'열은 방향을 스스로 정하지 않는다 — 그저 뜨거운 곳에서 찬 곳으로, 온도차에 비례해 '}
                        {'끊임없이 흘러 고르게 퍼지려 한다. 이 '}<b>{'확산(diffusion)'}</b>{'을 칸 격자 위에서 흉내 내면, '}
                        {'각 칸의 온도는 매 순간 이웃 네 칸과 열을 주고받으며 조금씩 평평해진다. 열원 한 칸을 '}
                        {'뜨겁게 고정해 두면 온기가 물감처럼 사방으로 번져 나가는 것을 볼 수 있다.'}
                    </p>
                    <p>
                        {'재료가 그 흐름의 길을 바꾼다. '}<b>{'도체'}</b>{'는 열전도율이 높아 열을 빠르게 실어 나르고, '}
                        <b>{'단열재'}</b>{'는 거의 0에 가까워 흐름을 끊는다. 두 칸 사이의 실제 전달률은 두 열전도율의 '}
                        <b>{'조화평균'}</b>{'이라, 단열재가 하나만 끼어도 그 경계로는 열이 좀처럼 넘지 못한다 — '}
                        {'전기 회로에 배선을 깔고 절연체로 막듯, 열도 도체 채널을 놓아 원하는 곳으로 몰아줄 수 있다.'}
                    </p>
                    <p>
                        {'여기에 '}<b>{'열 손실'}</b>{'을 더하면 이야기가 달라진다. 매 순간 조금씩 주변으로 식어 버리면, '}
                        {'열원에서 멀리 떨어진 곳은 온기가 도착하기도 전에 사라져 좀처럼 데워지지 않는다. '}
                        {'이때 곧장 이어진 '}<b>{'도체 채널'}</b>{'은 손실에 밀리기 전에 열을 목표까지 실어 나른다 — '}
                        {'「예시: 채널」을 눌러 도체 줄 하나가 먼 측정기를 데우는 과정을, 손실을 올려 그 길이 끊기는 순간을 확인해 보세요.'}
                    </p>
                    <p className="th-disclaimer">
                        {'* 균일 격자·4방향 전도·명시적 유한차분(explicit Euler)의 핵심만 보여주는 데모입니다. '}
                        {'실제 열전달의 대류·복사, 재료별 비열·밀도, 3차원 형상 등은 단순화했습니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Thermal;
