import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/SlowLight.css';

// SLOW LIGHT — 프로그래머블 포토닉 도파로에서 빛의 속도를 늦춰(군속도 제어) 광버퍼/지연선을 만드는 실험.
// 핵심: 매질 속 빛의 속도는 군굴절률 n_g 로 정해진다(v = c / n_g). n_g 를 셀마다 키우면
//   그 구간에서 빛이 느려지고(느린 빛) 펄스가 공간적으로 뭉친다. 구간 지연을 쌓으면
//   광신호를 원하는 만큼 "붙잡아 두는" 지연선/버퍼가 된다.
// 과제: 아래 도파로 B의 펄스는 위 도파로 A보다 offset(ps) 늦게 출발한다. A에 슬로우-라이트
//   셀을 넣어 A를 정확히 그만큼 늦추면 두 펄스가 검출기에 동시에 도착한다(광 동기화/버퍼).
//
// 모델(개념 데모):
//   - 셀 하나 길이 L = 1 mm. 진공 통과 시간 t0 = L / c ≈ 3.336 ps (c ≈ 0.299792 mm/ps).
//   - 셀 i 통과 시간 = n_g,i · t0.  A의 총 통과시간 = Σ n_g,i · t0.
//   - A가 진공 대비 더한 지연 = Σ (n_g,i − 1) · t0.  B는 전 구간 n_g=1(진공).
//   - A 도착 = Σ n_g,i·t0,  B 도착 = offset + K·t0.
//     gap = A도착 − B도착 = (Σ(n_g,i−1) − target) · t0.  target = offset/t0(정수 유닛).
//   - 느린 셀에서 펄스 공간폭은 1/n_g 로 압축된다(시간폭 고정, v 감소 → 공간폭 = v·Δt 감소).

const C_MM_PS = 0.299792458;     // 빛의 속도 (mm/ps)
const T0 = 1 / C_MM_PS;          // 셀 하나(1mm) 진공 통과 시간 ≈ 3.3356 ps
const K = 10;                    // 프로그래머블 셀 개수
const N_MIN = 1, N_MAX = 8;      // 군굴절률 범위 (정수 스텝, 클릭으로 순환)
const W0 = 0.85;                 // 펄스 기준 공간폭 (mm)

// 캔버스 물리 규격
const CW = 720, CH = 250;
const PAD_L = 18, PAD_R = 84;    // 오른쪽은 검출기 영역
const TRACK_W = CW - PAD_L - PAD_R;
const CELL_PX = TRACK_W / K;
const Y_A = 78, Y_B = 176;       // 두 도파로의 y
const TICK = 1.7;                // 프레임당 진행 시간(ps) — 재생 속도(연출)
const HOLD = 46;                 // 도착 후 잠깐 유지했다가 루프

// 진공 대비 추가 지연 유닛(Σ(n_g−1)) → 목표를 정수로 잡아 정확히 맞출 수 있게 한다.
function pickTargetUnits() {
    // 12 ~ 52 유닛 (최대 K*(N_MAX-1)=70). 항상 달성 가능하되 배분에 고민이 필요한 범위.
    return 12 + Math.floor(Math.random() * 41);
}

const SlowLight = () => {
    const canvasRef = useRef(null);
    const rafRef = useRef(0);
    const cellsRef = useRef(null);     // 애니메이션 루프가 최신 셀 배열을 읽도록
    const simRef = useRef({ t: 0, flash: 0 });

    const [cells, setCells] = useState(() => new Array(K).fill(1));
    const [targetUnits, setTargetUnits] = useState(pickTargetUnits);
    const [playing, setPlaying] = useState(true);

    const curUnits = cells.reduce((s, n) => s + (n - 1), 0);
    const offsetPs = targetUnits * T0;                 // B가 늦게 출발한 양
    const addedPs = curUnits * T0;                     // A가 더한 지연
    const gapPs = (curUnits - targetUnits) * T0;        // A도착 − B도착
    const synced = curUnits === targetUnits;
    const arrivalA = cells.reduce((s, n) => s + n * T0, 0);
    const arrivalB = offsetPs + K * T0;

    useEffect(() => { cellsRef.current = cells; }, [cells]);

    const cycleCell = (i, dir = 1) => {
        setCells((prev) => {
            const next = prev.slice();
            let v = next[i] + dir;
            if (v > N_MAX) v = N_MIN;
            if (v < N_MIN) v = N_MAX;
            next[i] = v;
            return next;
        });
    };

    const clearCells = () => setCells(new Array(K).fill(1));
    const newTarget = () => { setTargetUnits(pickTargetUnits()); simRef.current.t = 0; };

    // 시간 t(ps)에서 A펄스의 위치(mm, 0..K)와 그 지점 셀의 n_g
    const posA = useCallback((t, cs) => {
        if (t <= 0) return { x: 0, ng: cs[0] };
        let acc = 0;
        for (let i = 0; i < K; i++) {
            const dt = cs[i] * T0;
            if (t < acc + dt) {
                const frac = (t - acc) / dt;      // 셀 내부 진행 비율
                return { x: i + frac, ng: cs[i] };
            }
            acc += dt;
        }
        return { x: K, ng: cs[K - 1] };            // 도착
    }, []);

    const draw = useCallback(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const cs = cellsRef.current || cells;
        const sim = simRef.current;

        // 배경(광학 벤치)
        ctx.fillStyle = '#06080d';
        ctx.fillRect(0, 0, CW, CH);

        const xPix = (mm) => PAD_L + mm * CELL_PX;

        // ── 도파로 A (프로그래머블) : 셀별 음영으로 n_g 표시 ──
        for (let i = 0; i < K; i++) {
            const n = cs[i];
            const f = (n - N_MIN) / (N_MAX - N_MIN);   // 0(빠름)..1(느림)
            const x = xPix(i), w = CELL_PX;
            // 빠름=강철, 느림=호박(amber) 으로 보간
            const r = Math.round(46 + f * (210 - 46));
            const g = Math.round(56 + f * (150 - 56));
            const b = Math.round(74 + f * (66 - 74));
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, Y_A - 11, w - 1.5, 22);
            ctx.strokeStyle = 'rgba(8,11,16,0.9)'; ctx.lineWidth = 1;
            ctx.strokeRect(x, Y_A - 11, w - 1.5, 22);
            // n_g 라벨
            ctx.fillStyle = f > 0.55 ? 'rgba(12,10,6,0.9)' : 'rgba(210,218,230,0.85)';
            ctx.font = '600 11px JetBrains Mono, monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(n, x + w / 2, Y_A);
        }

        // ── 도파로 B (진공, 균일) ──
        ctx.fillStyle = '#2a323c';
        ctx.fillRect(xPix(0), Y_B - 9, K * CELL_PX - 1.5, 18);
        ctx.strokeStyle = 'rgba(8,11,16,0.9)'; ctx.lineWidth = 1;
        ctx.strokeRect(xPix(0), Y_B - 9, K * CELL_PX - 1.5, 18);

        // 도파로 라벨
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = '600 11px JetBrains Mono, monospace';
        ctx.fillStyle = '#f2b24a'; ctx.fillText('A · 프로그래머블 (슬로우-라이트 셀)', PAD_L, Y_A - 20);
        ctx.fillStyle = '#35c0b4'; ctx.fillText('B · 기준 도파로 (진공 n_g=1)', PAD_L, Y_B - 18);

        // ── 검출기 / 비트 창 ──
        const dx = xPix(K) + 8;
        ctx.fillStyle = synced ? 'rgba(70,200,138,0.16)' : 'rgba(120,132,150,0.12)';
        ctx.fillRect(dx, 40, 60, CH - 78);
        ctx.strokeStyle = synced ? '#46c88a' : 'rgba(140,152,170,0.5)';
        ctx.setLineDash([4, 4]); ctx.lineWidth = 1.4;
        ctx.strokeRect(dx, 40, 60, CH - 78); ctx.setLineDash([]);
        ctx.fillStyle = synced ? '#46c88a' : 'rgba(180,190,205,0.75)';
        ctx.font = '600 10px JetBrains Mono, monospace'; ctx.textAlign = 'center';
        ctx.fillText('검출기', dx + 30, CH - 30);

        // ── 펄스 A ──
        const pa = posA(sim.t, cs);
        drawPulse(ctx, xPix(pa.x), Y_A, W0 / pa.ng, '#f2b24a', pa.x >= K);
        // ── 펄스 B (진공, offset 후 출발) ──
        const xB = Math.max(0, Math.min(K, (sim.t - targetUnits * T0) * C_MM_PS));
        if (sim.t >= targetUnits * T0) drawPulse(ctx, xPix(xB), Y_B, W0, '#35c0b4', xB >= K);

        // 동기화 성공 플래시
        if (sim.flash > 0) {
            ctx.fillStyle = `rgba(70,200,138,${(sim.flash / 30) * 0.5})`;
            ctx.fillRect(dx, 40, 60, CH - 78);
        }
    }, [cells, posA, synced, targetUnits]);

    // 애니메이션 루프
    useEffect(() => {
        let mounted = true;
        const loop = () => {
            if (!mounted) return;
            const sim = simRef.current;
            if (playing) {
                sim.t += TICK;
                const cs = cellsRef.current || cells;
                const aArr = cs.reduce((s, n) => s + n * T0, 0);
                const bArr = targetUnits * T0 + K * T0;
                const end = Math.max(aArr, bArr) + HOLD;
                // 동시 도착 순간 플래시 트리거
                if (curUnits === targetUnits && sim.t >= aArr && sim.t < aArr + TICK) sim.flash = 30;
                if (sim.flash > 0) sim.flash -= 1;
                if (sim.t > end) { sim.t = 0; sim.flash = 0; }
            }
            draw();
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => { mounted = false; cancelAnimationFrame(rafRef.current); };
    }, [draw, playing, cells, targetUnits, curUnits]);

    useEffect(() => {
        const cv = canvasRef.current;
        if (cv) { cv.width = CW; cv.height = CH; }
    }, []);

    const status = synced ? 'sync' : curUnits < targetUnits ? 'fast' : 'slow';
    const STATUS_LABEL = {
        sync: '동기화 ✓ — 두 펄스가 동시 도착',
        fast: '너무 빠름 ▲ — A를 더 늦춰라',
        slow: '너무 느림 ▼ — 지연이 과함',
    };

    return (
        <LabShell
            title="SLOW LIGHT"
            eyebrow="group velocity · optical buffering"
            subtitle={'// 빛의 속도를 셀마다 늦춰 광신호를 원하는 만큼 붙잡아 두는 지연선/버퍼'}
            path="slow-light.exe"
        >
            <section className="k-win sl-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/photonics/</span>delay-line</span>
                    <span className="meta k-mono">지연 = Σ n_g·L/c · 느린 빛으로 펄스를 붙잡는다</span>
                </div>

                <div className="sl-stage">
                    <div className="sl-view-col">
                        <div className="sl-screen">
                            <canvas ref={canvasRef} className="sl-canvas" />
                        </div>

                        <div className="sl-cellbar">
                            <span className="sl-cellbar-lab k-mono">
                                슬로우-라이트 셀 · 클릭 = 군굴절률 n<sub>g</sub> +1 (우클릭 −1)
                            </span>
                            <div className="sl-cells">
                                {cells.map((n, i) => {
                                    const f = (n - N_MIN) / (N_MAX - N_MIN);
                                    return (
                                        <button
                                            key={i} type="button"
                                            className={`sl-cell ${n > 1 ? 'sl-cell-on' : ''}`}
                                            style={{ '--f': f }}
                                            onClick={() => cycleCell(i, 1)}
                                            onContextMenu={(e) => { e.preventDefault(); cycleCell(i, -1); }}
                                            aria-label={`셀 ${i + 1} 군굴절률 ${n}`}
                                        >
                                            <span className="sl-cell-n">{n}</span>
                                            <span className="sl-cell-bar" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <p className="sl-view-foot k-mono">
                            아래 <b>B</b>는 <b>{offsetPs.toFixed(0)} ps</b> 늦게 출발한다 · <b>A</b>에 느린 셀을 넣어
                            딱 그만큼 늦추면 두 펄스가 <b>검출기에서 만난다</b>
                        </p>
                    </div>

                    <div className="sl-right">
                        <div className={`sl-amp sl-${status}`}>
                            <span className="sl-amp-lab k-mono">추가 지연 D = Σ(n_g−1)·t₀</span>
                            <span className="sl-amp-num">{addedPs.toFixed(1)}<u> ps</u></span>
                            <span className="sl-amp-sub k-mono">목표 {offsetPs.toFixed(1)} ps</span>
                        </div>

                        <div className="sl-stats">
                            <div className="sl-stat">
                                <span className="sl-stat-lab k-mono">슬로우 유닛 Σ(n_g−1)</span>
                                <span className="sl-stat-num k-mono">{curUnits} / {targetUnits}</span>
                                <span className="sl-stat-foot k-mono">셀 지연의 합</span>
                            </div>
                            <div className="sl-stat">
                                <span className="sl-stat-lab k-mono">도착 간격 gap</span>
                                <span className="sl-stat-num k-mono">{gapPs > 0 ? '+' : ''}{gapPs.toFixed(1)} ps</span>
                                <span className="sl-stat-foot k-mono">A도착 − B도착</span>
                            </div>
                        </div>

                        <div className="sl-arrivals">
                            <div className="sl-arr-row">
                                <span className="sl-arr-name" style={{ color: '#f2b24a' }}>● A 도착</span>
                                <span className="sl-arr-val k-mono">{arrivalA.toFixed(1)} ps</span>
                            </div>
                            <div className="sl-arr-row">
                                <span className="sl-arr-name" style={{ color: '#35c0b4' }}>● B 도착</span>
                                <span className="sl-arr-val k-mono">{arrivalB.toFixed(1)} ps</span>
                            </div>
                        </div>

                        <div className={`sl-verdict sl-${status}`}>
                            <p className="sl-verdict-txt">{STATUS_LABEL[status]}</p>
                        </div>

                        <div className="sl-actions">
                            <button type="button" className="sl-btn sl-btn-hot" onClick={() => setPlaying((p) => !p)}>
                                {playing ? '⏸ 정지' : '▶ 재생'}
                            </button>
                            <button type="button" className="sl-btn sl-btn-ghost" onClick={clearCells}>↺ 셀 초기화</button>
                            <button type="button" className="sl-btn sl-btn-ghost" onClick={newTarget}>↻ 새 목표</button>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win sl-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="sl-foot">
                    <p>
                        {'빛의 속도는 상수라고 배우지만, 그건 '}<b>{'진공'}</b>{'에서의 이야기다. 매질 속에서 펄스가 실제로 나아가는 '}
                        {'속도(군속도)는 '}<b>{'v = c / n_g'}</b>{' 로, '}<b>{'군굴절률 n_g'}</b>{'가 크면 빛이 느려진다. 이 값을 도파로 '}
                        {'구간마다 조절할 수 있다면, 원하는 구간에서 빛을 '}<b>{'붙잡아 두는'}</b>{' 지연선을 만들 수 있다 — 이것이 '}
                        <b>{'슬로우 라이트'}</b>{'다.'}
                    </p>
                    <p>
                        {'왜 필요한가. 빛은 전선 속 전자와 달리 멈추거나 대기시킬 수 없어서, 광컴퓨팅·광통신에서 신호를 잠깐 '}
                        <b>{'버퍼(대기)'}</b>{'시키거나 여러 채널의 '}<b>{'타이밍을 맞추는'}</b>{' 일이 오래 난제였다. 최근 화제가 된 '}
                        {'"빛의 속도를 실시간으로 다시 쓰는 프로그래머블 포토닉 칩" 뉴스도, 결국 이 '}<b>{'셀마다 다른 지연'}</b>{'을 '}
                        {'자유롭게 프로그램해 지연·동기화·버퍼를 한 칩에서 해내겠다는 아이디어다. 특정 장치가 아니라 그 밑바탕의 '}
                        {'보편 원리 — '}<b>{'지연은 경로를 지나며 쌓인 n_g 의 합'}</b>{' — 을 이 실험에 담았다.'}
                    </p>
                    <p>
                        {'이 데모의 과제는 실제 광버퍼가 하는 일 그대로다. 아래 '}<b>{'B'}</b>{' 펄스는 위 '}<b>{'A'}</b>{'보다 offset(ps)만큼 '}
                        {'늦게 출발한다. 두 신호를 검출기에서 '}<b>{'동시에'}</b>{' 만나게 하려면(멀티플렉싱·간섭에 필수) 먼저 도착할 A를 '}
                        {'정확히 그 offset만큼 늦춰 '}<b>{'붙잡아 둬야'}</b>{' 한다. 셀 하나 통과 시간은 '}<b>{'n_g·t₀'}</b>{' (t₀=L/c≈3.34 ps), '}
                        {'A가 더한 지연은 '}<b>{'Σ(n_g−1)·t₀'}</b>{'. 셀들을 클릭해 이 합을 목표에 맞추면 두 펄스가 '}<b>{'검출기에서 겹친다'}</b>{'.'}
                    </p>
                    <p>
                        {'화면에서 느린 셀(진한 호박색)에 들어간 A 펄스가 '}<b>{'속도가 뚝 떨어지며 공간적으로 뭉치는'}</b>{' 것을 보라 — '}
                        {'느려질수록 폭이 '}<b>{'1/n_g'}</b>{'로 압축된다(느린 빛의 특징). 지연을 너무 적게 주면 A가 먼저 '}
                        <b>{'앞질러'}</b>{' 나가 버리고, 과하면 B가 먼저 도착한다. 딱 맞추는 순간 검출기 창이 초록으로 '}<b>{'점등'}</b>{'된다.'}
                    </p>
                    <p className="sl-disclaimer">
                        {'* 군속도 지연만 남긴 개념 데모입니다. 실제 슬로우 라이트의 대역폭–지연 곱 한계, 분산·손실, 공진기/광결정 구현 '}
                        {'세부, 위상속도와 군속도의 구분 등은 단순화했으며 수치(ps·mm)는 예시입니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

// 가우시안 펄스 글로우 그리기
function drawPulse(ctx, cx, cy, widthMm, color, arrived) {
    const wpx = Math.max(6, widthMm * CELL_PX);
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, wpx);
    const a = arrived ? 0.35 : 0.95;
    glow.addColorStop(0, hexA(color, a));
    glow.addColorStop(0.5, hexA(color, a * 0.45));
    glow.addColorStop(1, hexA(color, 0));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, wpx, 0, Math.PI * 2); ctx.fill();
    // 밝은 코어
    ctx.fillStyle = hexA('#ffffff', arrived ? 0.4 : 0.95);
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(2.5, wpx * 0.22), 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
}

function hexA(hex, a) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
}

export default SlowLight;
