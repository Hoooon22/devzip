import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Spiking.css';

// SPIKING — 스파이킹 뉴런 실험 (Leaky Integrate-and-Fire / 뉴로모픽).
// 핵심: 보통의 인공신경망은 매 스텝 모든 뉴런의 행렬곱을 "동기적으로" 돌린다.
//   스파이킹 신경망은 발상이 다르다 — 각 뉴런은 막전위(V)를 쥐고 있다가,
//     · 시간이 지나면 안정값으로 새어 나가고(leak),
//     · 들어온 입력을 더해 쌓다가(integrate),
//     · 문턱(θ)을 넘는 그 순간에만 "스파이크" 한 번을 쏘고 리셋한다(fire).
//   연산은 스파이크가 튀는 이벤트에서만 일어난다 — 조용한 뉴런은 에너지를 쓰지 않는다.
//   이 희소·이벤트 구동이 뉴로모픽 칩이 저전력으로 도는 원리다.

const NW = 540, NH = 360;      // 네트워크 캔버스 논리 크기
const RW = 540, RH = 132;      // 래스터(스파이크 타이밍) 캔버스
const R = 11;                  // 뉴런 반지름
const LAYERS = [6, 9, 9, 6];   // 입력 → 은닉 → 은닉 → 출력
const N = LAYERS.reduce((a, b) => a + b, 0);
const FANOUT = 4;              // 뉴런당 다음 층으로의 시냅스 수
const W_EXC = 0.55;            // 흥분성 시냅스 가중치(θ 대비)
const W_INH_MAX = 1.15;        // 억제성 시냅스 최대 세기(슬라이더로 스케일)
const DELAY = 0.05;            // 시냅스 전달 지연(초)
const REFRAC = 0.06;           // 불응기(초)
const RASTER_WIN = 3.4;        // 래스터 표시 구간(초)

// 네트워크(뉴런 좌표 + 시냅스)를 한 번 구성한다. 억제 여부는 고정, 세기만 슬라이더로 조절.
function buildNet() {
    const neurons = [];
    const colX = LAYERS.map((_, i) => 54 + (NW - 108) * (i / (LAYERS.length - 1)));
    let id = 0;
    const byLayer = [];
    LAYERS.forEach((cnt, li) => {
        const ids = [];
        for (let k = 0; k < cnt; k++) {
            const y = NH * ((k + 1) / (cnt + 1));
            neurons.push({ id, layer: li, x: colX[li], y, V: 0, ref: 0, glow: 0 });
            ids.push(id);
            id++;
        }
        byLayer.push(ids);
    });

    const syn = [];
    for (let li = 0; li < LAYERS.length - 1; li++) {
        const src = byLayer[li], dst = byLayer[li + 1];
        for (const s of src) {
            // dst에서 무작위로 FANOUT개 목표를 뽑는다(중복 없이).
            const pool = [...dst];
            const k = Math.min(FANOUT, pool.length);
            for (let n = 0; n < k; n++) {
                const idx = Math.floor(Math.random() * pool.length);
                const t = pool.splice(idx, 1)[0];
                const exc = Math.random() > 0.28; // 약 28%는 억제성
                syn.push({
                    from: s, to: t, exc,
                    x0: neurons[s].x, y0: neurons[s].y,
                    x1: neurons[t].x, y1: neurons[t].y,
                });
            }
        }
    }
    return { neurons, syn, inputIds: byLayer[0] };
}

// 막전위 v(0~1+)에 따른 코어 색 — 강철 → 점화 앰버.
function coreColor(v) {
    const t = Math.max(0, Math.min(1, v));
    const r = Math.round(56 + (242 - 56) * t);
    const g = Math.round(69 + (169 - 69) * t);
    const b = Math.round(90 + (59 - 90) * t);
    return `rgb(${r},${g},${b})`;
}

const Spiking = () => {
    const netCanvasRef = useRef(null);
    const rasterCanvasRef = useRef(null);
    const rafRef = useRef(0);
    const lastTsRef = useRef(0);

    const netRef = useRef(buildNet());
    const eventsRef = useRef([]);    // {to, sentAt, at, w, exc, x0,y0,x1,y1}
    const rasterRef = useRef([]);    // {id, t}
    const simTRef = useRef(0);
    const spikesRef = useRef(0);
    const hudAccRef = useRef(0);

    const driveRef = useRef(10);     // 입력 자극(Hz/뉴런)
    const tauRef = useRef(0.15);     // 누수 시상수(초)
    const thetaRef = useRef(1.0);    // 문턱
    const inhRef = useRef(0.4);      // 억제 세기(0~1)
    const runningRef = useRef(true);

    const [drive, setDrive] = useState(10);
    const [tau, setTau] = useState(0.15);
    const [theta, setTheta] = useState(1.0);
    const [inh, setInh] = useState(0.4);
    const [running, setRunning] = useState(true);
    const [hud, setHud] = useState({ hz: 0, active: 0, total: 0, meanV: 0, t: 0 });

    const step = useCallback((dt) => {
        const t = simTRef.current + dt;
        simTRef.current = t;
        const { neurons, syn, inputIds } = netRef.current;
        const theta0 = thetaRef.current;
        const tau0 = tauRef.current;
        const inhScale = inhRef.current * W_INH_MAX;

        // 1) 입력층 자극(포아송 근사) — 입력 뉴런에 전류 주입
        const share = driveRef.current * dt;
        for (const nid of inputIds) {
            if (Math.random() < share) neurons[nid].V += theta0 * 0.6;
        }

        // 2) 누수 — 모든 뉴런의 막전위가 안정값(0)으로 새어 나간다
        for (const nu of neurons) {
            if (nu.ref > 0) { nu.ref = Math.max(0, nu.ref - dt); continue; }
            nu.V += (0 - nu.V) * Math.min(1, dt / tau0);
        }

        // 3) 도착한 시냅스 이벤트 전달
        const keepEv = [];
        for (const ev of eventsRef.current) {
            if (ev.at <= t) {
                const tgt = neurons[ev.to];
                if (tgt.ref <= 0) tgt.V += ev.exc ? ev.w : -ev.w * inhScale;
            } else {
                keepEv.push(ev);
            }
        }
        eventsRef.current = keepEv;

        // 4) 문턱 검사 → 스파이크 발화
        for (const nu of neurons) {
            if (nu.ref > 0 || nu.V < theta0) continue;
            nu.V = 0;
            nu.ref = REFRAC;
            nu.glow = 1;
            spikesRef.current += 1;
            rasterRef.current.push({ id: nu.id, t });
            for (const s of syn) {
                if (s.from !== nu.id) continue;
                eventsRef.current.push({
                    to: s.to, sentAt: t, at: t + DELAY, w: W_EXC, exc: s.exc,
                    x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1,
                });
            }
        }

        // 5) 글로우 감쇠 + 오래된 래스터 정리
        for (const nu of neurons) if (nu.glow > 0) nu.glow = Math.max(0, nu.glow - dt / 0.28);
        const cut = t - RASTER_WIN;
        if (rasterRef.current.length > 1200) {
            rasterRef.current = rasterRef.current.filter((r) => r.t >= cut);
        }

        // 6) HUD(0.1s 간격)
        hudAccRef.current += dt;
        if (hudAccRef.current >= 0.1) {
            hudAccRef.current = 0;
            const last1s = rasterRef.current.filter((r) => r.t >= t - 1);
            const firedSet = new Set(rasterRef.current.filter((r) => r.t >= t - 0.25).map((r) => r.id));
            let sumV = 0;
            for (const nu of neurons) sumV += Math.max(0, nu.V);
            setHud({
                hz: last1s.length,
                active: Math.round((firedSet.size / N) * 100),
                total: spikesRef.current,
                meanV: sumV / N / theta0,
                t,
            });
        }
    }, []);

    const render = useCallback(() => {
        const net = netCanvasRef.current, ras = rasterCanvasRef.current;
        if (!net || !ras) return;
        const t = simTRef.current;
        const { neurons, syn } = netRef.current;
        const theta0 = thetaRef.current;

        // --- 네트워크 캔버스 ---
        const ctx = net.getContext('2d');
        ctx.clearRect(0, 0, NW, NH);
        ctx.fillStyle = '#14161c';
        ctx.fillRect(0, 0, NW, NH);

        // 시냅스(30%): 흐릿한 배선
        for (const s of syn) {
            ctx.strokeStyle = s.exc ? 'rgba(120,132,150,0.16)' : 'rgba(63,159,208,0.16)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(s.x0, s.y0);
            ctx.lineTo(s.x1, s.y1);
            ctx.stroke();
        }

        // 이동 중인 스파이크(전달 지연 동안 선을 따라 흐르는 점)
        for (const ev of eventsRef.current) {
            const p = Math.max(0, Math.min(1, (t - ev.sentAt) / (ev.at - ev.sentAt)));
            const x = ev.x0 + (ev.x1 - ev.x0) * p;
            const y = ev.y0 + (ev.y1 - ev.y0) * p;
            ctx.fillStyle = ev.exc ? '#f2a93b' : '#3f9fd0';
            ctx.beginPath();
            ctx.arc(x, y, 2.6, 0, 7);
            ctx.fill();
        }

        // 뉴런
        for (const nu of neurons) {
            const v = Math.max(0, nu.V / theta0);
            // 발화 글로우 헤일로(10% 강조)
            if (nu.glow > 0) {
                ctx.fillStyle = `rgba(242,169,59,${0.32 * nu.glow})`;
                ctx.beginPath();
                ctx.arc(nu.x, nu.y, R + 9 * nu.glow, 0, 7);
                ctx.fill();
            }
            // 바깥 링
            ctx.strokeStyle = nu.ref > 0 ? 'rgba(120,132,150,0.5)' : 'rgba(150,164,184,0.85)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(nu.x, nu.y, R, 0, 7);
            ctx.stroke();
            // 충전 코어 — 막전위가 쌓일수록 커지고 뜨거워진다
            const cr = R * (0.32 + 0.68 * Math.min(1, v));
            ctx.fillStyle = nu.glow > 0.5 ? '#ffd27a' : coreColor(v);
            ctx.beginPath();
            ctx.arc(nu.x, nu.y, cr, 0, 7);
            ctx.fill();
        }

        // --- 래스터 캔버스 ---
        const rc = ras.getContext('2d');
        rc.clearRect(0, 0, RW, RH);
        rc.fillStyle = '#101216';
        rc.fillRect(0, 0, RW, RH);
        const pad = 6;
        const t0 = t - RASTER_WIN;
        for (const r of rasterRef.current) {
            if (r.t < t0) continue;
            const x = pad + (RW - pad * 2) * ((r.t - t0) / RASTER_WIN);
            const y = pad + (RH - pad * 2) * (r.id / (N - 1));
            const age = 1 - (t - r.t) / RASTER_WIN; // 최신일수록 밝게
            rc.fillStyle = `rgba(242,169,59,${0.25 + 0.7 * age})`;
            rc.fillRect(x, y - 1.4, 2, 2.8);
        }
        // "지금" 경계선
        rc.strokeStyle = 'rgba(150,164,184,0.35)';
        rc.lineWidth = 1;
        rc.beginPath();
        rc.moveTo(RW - pad, pad - 2);
        rc.lineTo(RW - pad, RH - pad + 2);
        rc.stroke();
    }, []);

    useEffect(() => {
        const loop = (ts) => {
            const last = lastTsRef.current || ts;
            let dt = (ts - last) / 1000;
            lastTsRef.current = ts;
            if (dt > 0.05) dt = 0.05;
            if (runningRef.current && dt > 0) step(dt);
            render();
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, [step, render]);

    useEffect(() => {
        const net = netCanvasRef.current, ras = rasterCanvasRef.current;
        net.width = NW; net.height = NH;
        ras.width = RW; ras.height = RH;
        render();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 캔버스 클릭 → 가장 가까운 뉴런에 전류 주입(수동 자극)
    const poke = useCallback((e) => {
        const net = netCanvasRef.current;
        const rect = net.getBoundingClientRect();
        const px = (e.clientX - rect.left) * (NW / rect.width);
        const py = (e.clientY - rect.top) * (NH / rect.height);
        let best = null, bestD = 1e9;
        for (const nu of netRef.current.neurons) {
            const d = (nu.x - px) ** 2 + (nu.y - py) ** 2;
            if (d < bestD) { bestD = d; best = nu; }
        }
        if (best && bestD < (R * 2.2) ** 2) best.V += thetaRef.current * 0.95;
    }, []);

    const reset = useCallback(() => {
        netRef.current = buildNet();
        eventsRef.current = [];
        rasterRef.current = [];
        simTRef.current = 0;
        spikesRef.current = 0;
        hudAccRef.current = 0;
        setHud({ hz: 0, active: 0, total: 0, meanV: 0, t: 0 });
    }, []);

    const changeDrive = (v) => { driveRef.current = v; setDrive(v); };
    const changeTau = (v) => { tauRef.current = v; setTau(v); };
    const changeTheta = (v) => { thetaRef.current = v; setTheta(v); };
    const changeInh = (v) => { inhRef.current = v; setInh(v); };
    const toggleRun = () => { const v = !running; runningRef.current = v; setRunning(v); };

    return (
        <LabShell
            title="SPIKING"
            eyebrow="leaky integrate-and-fire · neuromorphic"
            subtitle={'// 뉴런은 문턱을 넘는 순간에만 한 번 쏜다 — 이벤트에서만 계산한다'}
            path="spiking.exe"
        >
            <section className="k-win sp-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/lif/</span>network</span>
                    <span className="meta k-mono">V += Σw · fire when V ≥ θ · then reset</span>
                </div>

                <div className="sp-toolbar">
                    <div className="sp-ctrl">
                        <label className="sp-ctrl-label k-mono" htmlFor="sp-drive">입력 자극 <b>{drive} Hz</b></label>
                        <input id="sp-drive" type="range" min="0" max="30" step="1"
                            value={drive} onChange={(e) => changeDrive(Number(e.target.value))} />
                    </div>
                    <div className="sp-ctrl">
                        <label className="sp-ctrl-label k-mono" htmlFor="sp-tau">누수 τ <b>{tau.toFixed(2)}s</b></label>
                        <input id="sp-tau" type="range" min="0.05" max="0.4" step="0.01"
                            value={tau} onChange={(e) => changeTau(Number(e.target.value))} />
                    </div>
                    <div className="sp-ctrl">
                        <label className="sp-ctrl-label k-mono" htmlFor="sp-theta">문턱 θ <b>{theta.toFixed(2)}</b></label>
                        <input id="sp-theta" type="range" min="0.6" max="1.6" step="0.05"
                            value={theta} onChange={(e) => changeTheta(Number(e.target.value))} />
                    </div>
                    <div className="sp-ctrl">
                        <label className="sp-ctrl-label k-mono" htmlFor="sp-inh">억제 세기 <b>{Math.round(inh * 100)}%</b></label>
                        <input id="sp-inh" type="range" min="0" max="1" step="0.05"
                            value={inh} onChange={(e) => changeInh(Number(e.target.value))} />
                    </div>
                    <div className="sp-actions">
                        <button type="button" className="sp-btn sp-btn-ghost" onClick={toggleRun}>
                            {running ? '⏸ 정지' : '▶ 재생'}
                        </button>
                        <button type="button" className="sp-btn sp-btn-ghost" onClick={reset}>↻ 리셋</button>
                    </div>
                </div>

                <div className="sp-stage">
                    <div className="sp-screen-col">
                        <div className="sp-screen">
                            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                            <canvas ref={netCanvasRef} className="sp-canvas" onClick={poke} />
                            <span className="sp-hint k-mono">뉴런을 클릭해 직접 자극</span>
                        </div>
                        <div className="sp-raster-wrap">
                            <span className="sp-raster-lab k-mono">스파이크 래스터 · 뉴런 × 시간(최근 {RASTER_WIN}s)</span>
                            <canvas ref={rasterCanvasRef} className="sp-raster" />
                        </div>
                        <div className="sp-legend k-mono">
                            <span><i className="sp-key sp-key-exc" /> 흥분성 전달</span>
                            <span><i className="sp-key sp-key-inh" /> 억제성 전달</span>
                            <span><i className="sp-key sp-key-fire" /> 발화(스파이크)</span>
                        </div>
                    </div>

                    <div className="sp-right">
                        <div className="sp-stats">
                            <div className="sp-stat sp-stat-hero">
                                <span className="sp-stat-lab k-mono">발화율</span>
                                <span className="sp-stat-num k-mono">{hud.hz}</span>
                                <span className="sp-stat-sub k-mono">스파이크/초 (전체)</span>
                            </div>
                            <div className="sp-stat">
                                <span className="sp-stat-lab k-mono">순간 활성</span>
                                <span className="sp-stat-num k-mono">{hud.active}<small>%</small></span>
                                <span className="sp-stat-sub k-mono">방금 쏜 뉴런 비율</span>
                            </div>
                            <div className="sp-stat">
                                <span className="sp-stat-lab k-mono">평균 막전위</span>
                                <span className="sp-stat-num k-mono">{hud.meanV.toFixed(2)}</span>
                                <span className="sp-stat-sub k-mono">×θ (문턱 대비)</span>
                            </div>
                            <div className="sp-stat">
                                <span className="sp-stat-lab k-mono">누적 스파이크</span>
                                <span className="sp-stat-num k-mono">{hud.total}</span>
                                <span className="sp-stat-sub k-mono">= 연산 이벤트 · {hud.t.toFixed(0)}s</span>
                            </div>
                        </div>

                        <div className="sp-verdict">
                            <p className="sp-verdict-txt">
                                <b>입력 자극</b>을 올리면 왼쪽 입력층이 자주 쏘고, 스파이크가 층을 타고 번집니다.
                                <b>문턱 θ</b>를 낮추면 예민해져 폭주하고, <b>억제 세기</b>를 올리면 과열을 눌러
                                드문드문한(희소) 발화로 되돌립니다. 계산은 <b>스파이크가 튀는 순간</b>에만 일어난다는 점 —
                                조용한 뉴런은 공짜라는 점이 뉴로모픽의 핵심입니다.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win sp-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="sp-foot">
                    <p>
                        {'보통의 인공신경망은 매 스텝 '}<b>{'모든 뉴런의 값을 한꺼번에'}</b>{' 계산한다. '}
                        {'입력이 있든 없든 층 전체가 행렬곱을 돌리는 "동기식(클럭)" 계산이다. '}
                        {'스파이킹 신경망은 이 전제를 뒤집는다 — 뉴런은 평소 조용히 있다가, 조건이 맞는 '}
                        <b>{'그 순간에만'}</b>{' 스파이크 한 번을 쏜다.'}
                    </p>
                    <p>
                        {'각 뉴런은 '}<b>{'막전위(V)'}</b>{'라는 값을 쥐고 세 가지만 반복한다. '}
                        {'① 시간이 지나면 V가 안정값으로 조금씩 새어 나간다(누수). '}
                        {'② 다른 뉴런에서 스파이크가 도착하면 그 가중치만큼 V에 더한다(적분). '}
                        {'③ V가 '}<b>{'문턱 θ'}</b>{'를 넘으면 스파이크를 쏘고 V를 0으로 리셋한 뒤 잠깐 쉰다(불응기). '}
                        {'이 셋을 합쳐 Leaky Integrate-and-Fire(LIF) 뉴런이라 부른다.'}
                    </p>
                    <p>
                        {'슬라이더로 감을 잡아 보라. '}<b>{'입력 자극'}</b>{'을 높이면 발화가 잦아지고 물결처럼 번진다. '}
                        <b>{'누수 τ'}</b>{'가 짧으면 쌓기도 전에 잊어버려 좀처럼 못 넘고, 길면 오래 기억해 쉽게 넘는다. '}
                        <b>{'문턱 θ'}</b>{'를 낮추면 온 네트워크가 발작하듯 폭주하는데, '}<b>{'억제 세기'}</b>{'를 올리면 '}
                        {'억제성 뉴런이 과열을 끌어내려 다시 드문드문한 발화로 균형이 잡힌다 — 실제 뇌가 안정을 유지하는 방식이다.'}
                    </p>
                    <p>
                        {'아래 '}<b>{'래스터'}</b>{'는 가로축 시간·세로축 뉴런에 스파이크를 점으로 찍은 것이다. '}
                        {'세로로 줄이 서면 여러 뉴런이 동시에 터진 "동기 발화", 흩뿌려지면 희소한 비동기 발화다. '}
                        {'우측 '}<b>{'누적 스파이크'}</b>{'는 곧 '}<b>{'연산 이벤트 수'}</b>{'와 같다 — 이벤트 구동 하드웨어는 '}
                        {'딱 이 횟수만큼만 에너지를 쓴다. 조용한 뉴런이 공짜인 이 희소성이 뉴로모픽 칩의 저전력 비결이다.'}
                    </p>
                    <p className="sp-disclaimer">
                        {'* 교육용 단순화 모델이다. 실제 SNN은 시냅스 후 전위(PSP) 파형, 가소성(STDP) 학습, '}
                        {'다양한 뉴런 모델(Izhikevich, Hodgkin-Huxley 등)을 다룬다. 여기서는 순간 전달·고정 지연·피드포워드 구조로 줄였고, 수치는 예시다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Spiking;
