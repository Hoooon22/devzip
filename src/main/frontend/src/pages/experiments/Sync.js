import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Sync.css';

// SYNC — 결합 진동자의 자발적 동기화(쿠라모토 모형). 반딧불 무리가 서로의 불빛에 맞춰
//   스스로 박자를 맞추는 현상을 소재로 한다.
// 핵심: 각 반딧불 i 는 고유 위상 θ_i 와 고유 진동수 ω_i 를 가진다. 결합이 없으면(K=0)
//   저마다 제 박자로 깜빡여 전체는 흩어진다. 결합 K 가 커지면 각자가 무리의 평균 위상(ψ)
//   쪽으로 끌려가고, 임계 결합 K_c 를 넘는 순간 갑자기 모두가 같은 박자로 잠긴다(위상 전이).
// 모델(평균장 쿠라모토):
//   질서변수  r·e^{iψ} = (1/N) Σ e^{iθ_j}   (r=0 흩어짐 … r=1 완전 동기)
//   θ̇_i = ω_i + K·r·sin(ψ − θ_i)           ← (K/N)Σ_j sin(θ_j−θ_i) 와 동치
//   ω_i = F0 + spread·g_i (g_i 는 고정된 표준정규 표본) — 진동수 이질성이 클수록 동기화가 어렵다.
//   임계 결합 K_c ≈ spread 근방(개념값)에서 r 이 0에서 튀어오른다.

const TWO_PI = Math.PI * 2;
const SW = 560, SH = 300;      // 반딧불 무리 캔버스
const RW = 240, RH = 240;      // 위상 원 캔버스
const DT = 0.05;               // 적분 스텝(연출)
const KAPPA = 5.5;             // 플래시 뾰족함(θ=0 근처에서만 밝음)
const F0 = 1.35;               // 기준 진동수 (rad/s)

// 표준정규 표본 (Box–Muller)
function gaussian() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TWO_PI * v);
}

// 반딧불 위치: 지터드 그리드(무대에 고르게 흩뿌린다)
function makeField(n) {
    const cols = Math.max(1, Math.round(Math.sqrt((n * SW) / SH)));
    const rows = Math.ceil(n / cols);
    const cw = SW / cols, ch = SH / rows;
    const pts = [];
    for (let i = 0; i < n; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        pts.push({
            x: cw * (c + 0.5) + (Math.random() - 0.5) * cw * 0.55,
            y: ch * (r + 0.5) + (Math.random() - 0.5) * ch * 0.55,
        });
    }
    return pts;
}

const Sync = () => {
    const swarmRef = useRef(null);
    const ringRef = useRef(null);
    const rafRef = useRef(0);

    const oscRef = useRef({ theta: new Float64Array(0), g: new Float64Array(0) });
    const fieldRef = useRef([]);
    const simRef = useRef({ r: 0, psi: 0, frame: 0 });

    const [n, setN] = useState(40);
    const [k, setK] = useState(0.4);
    const [spread, setSpread] = useState(0.9);
    const [playing, setPlaying] = useState(true);
    const [rDisp, setRDisp] = useState(0);

    // 컨트롤 값을 루프가 최신으로 읽도록 ref 미러
    const kRef = useRef(k), spreadRef = useRef(spread), playRef = useRef(playing);
    useEffect(() => { kRef.current = k; }, [k]);
    useEffect(() => { spreadRef.current = spread; }, [spread]);
    useEffect(() => { playRef.current = playing; }, [playing]);

    // 무리 생성/재생성 (N 변경·리셋 시). g_i 는 고정 → spread 를 밀어도 위상은 유지된다.
    const seed = useCallback((count) => {
        const theta = new Float64Array(count);
        const g = new Float64Array(count);
        for (let i = 0; i < count; i++) {
            theta[i] = Math.random() * TWO_PI;
            g[i] = gaussian();
        }
        oscRef.current = { theta, g };
        fieldRef.current = makeField(count);
    }, []);

    useEffect(() => { seed(n); }, [n, seed]);

    const draw = useCallback(() => {
        const sc = swarmRef.current, rc = ringRef.current;
        if (!sc || !rc) return;
        const { theta } = oscRef.current;
        const cnt = theta.length;
        const field = fieldRef.current;
        const { r, psi } = simRef.current;

        // ── 반딧불 무대 ──
        const ctx = sc.getContext('2d');
        ctx.fillStyle = '#070b07';
        ctx.fillRect(0, 0, SW, SH);
        // 동기화가 높을수록 무대 전체가 은은히 함께 밝아진다(합창의 payoff)
        const swarmGlow = Math.max(0, (r - 0.55)) * 0.16;
        if (swarmGlow > 0) {
            ctx.fillStyle = `rgba(190,214,60,${swarmGlow})`;
            ctx.fillRect(0, 0, SW, SH);
        }
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < cnt; i++) {
            const b = Math.exp(KAPPA * (Math.cos(theta[i]) - 1)); // 0..1, θ=0에서 최대
            const p = field[i];
            const rad = 3 + b * 15;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
            g.addColorStop(0, `rgba(226,240,150,${0.15 + b * 0.85})`);
            g.addColorStop(0.4, `rgba(190,214,60,${(0.1 + b * 0.6) * 0.6})`);
            g.addColorStop(1, 'rgba(150,180,40,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, TWO_PI); ctx.fill();
            // 코어
            ctx.fillStyle = `rgba(255,255,235,${0.2 + b * 0.8})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 + b * 1.8, 0, TWO_PI); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // ── 위상 원 ──
        const rx = rc.getContext('2d');
        rx.fillStyle = '#070b07';
        rx.fillRect(0, 0, RW, RH);
        const cx = RW / 2, cy = RH / 2, R = 92;
        // 눈금 원
        rx.strokeStyle = 'rgba(140,152,120,0.35)'; rx.lineWidth = 1;
        rx.beginPath(); rx.arc(cx, cy, R, 0, TWO_PI); rx.stroke();
        rx.strokeStyle = 'rgba(140,152,120,0.16)';
        rx.beginPath(); rx.arc(cx, cy, R * 0.5, 0, TWO_PI); rx.stroke();
        // 각 진동자 점(위상 위치)
        for (let i = 0; i < cnt; i++) {
            const b = Math.exp(KAPPA * (Math.cos(theta[i]) - 1));
            const x = cx + Math.cos(theta[i]) * R;
            const y = cy - Math.sin(theta[i]) * R;
            rx.fillStyle = `rgba(226,240,150,${0.35 + b * 0.65})`;
            rx.beginPath(); rx.arc(x, y, 2.4 + b * 2.2, 0, TWO_PI); rx.fill();
        }
        // 질서변수 벡터 (평균장) — 길이 r, 방향 ψ
        const vx = cx + Math.cos(psi) * R * r;
        const vy = cy - Math.sin(psi) * R * r;
        rx.strokeStyle = '#3fc8bb'; rx.lineWidth = 3;
        rx.beginPath(); rx.moveTo(cx, cy); rx.lineTo(vx, vy); rx.stroke();
        rx.fillStyle = '#3fc8bb';
        rx.beginPath(); rx.arc(vx, vy, 4.5, 0, TWO_PI); rx.fill();
        rx.fillStyle = 'rgba(180,190,205,0.5)';
        rx.font = '600 10px JetBrains Mono, monospace';
        rx.textAlign = 'center';
        rx.fillText('r · ψ', cx, RH - 10);
    }, []);

    // 시뮬레이션 루프
    useEffect(() => {
        let mounted = true;
        const loop = () => {
            if (!mounted) return;
            const sim = simRef.current;
            const { theta, g } = oscRef.current;
            const cnt = theta.length;
            if (cnt > 0) {
                // 질서변수 r, ψ
                let sx = 0, sy = 0;
                for (let i = 0; i < cnt; i++) { sx += Math.cos(theta[i]); sy += Math.sin(theta[i]); }
                sx /= cnt; sy /= cnt;
                const r = Math.hypot(sx, sy);
                const psi = Math.atan2(sy, sx);
                sim.r = r; sim.psi = psi;

                if (playRef.current) {
                    const K = kRef.current, sig = spreadRef.current;
                    for (let i = 0; i < cnt; i++) {
                        const omega = F0 + sig * g[i];
                        let t = theta[i] + (omega + K * r * Math.sin(psi - theta[i])) * DT;
                        t %= TWO_PI; if (t < 0) t += TWO_PI;
                        theta[i] = t;
                    }
                }
                sim.frame++;
                if (sim.frame % 4 === 0) setRDisp(r);
            }
            draw();
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => { mounted = false; cancelAnimationFrame(rafRef.current); };
    }, [draw]);

    useEffect(() => {
        if (swarmRef.current) { swarmRef.current.width = SW; swarmRef.current.height = SH; }
        if (ringRef.current) { ringRef.current.width = RW; ringRef.current.height = RH; }
    }, []);

    const kc = spread;                                   // 개념적 임계 결합 ≈ 진동수 스프레드
    const phase = rDisp > 0.7 ? 'lock' : rDisp > 0.32 ? 'part' : 'free';
    const PHASE_LABEL = {
        lock: '위상 잠금 ✓ — 무리가 한 박자로 깜빡인다',
        part: '부분 동기화 — 일부만 박자를 맞추는 중',
        free: '흩어짐 — 저마다 제 박자로 깜빡인다',
    };

    return (
        <LabShell
            title="SYNC"
            eyebrow="coupled oscillators · spontaneous synchronization"
            subtitle={'// 아무도 지휘하지 않는데 반딧불 무리가 스스로 한 박자로 맞춰지는 순간'}
            path="sync.exe"
        >
            <section className="k-win sy-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/kuramoto/</span>fireflies</span>
                    <span className="meta k-mono">θ̇ᵢ = ωᵢ + K·r·sin(ψ−θᵢ) · 결합이 무질서를 이긴다</span>
                </div>

                <div className="sy-stage">
                    <div className="sy-view-col">
                        <div className="sy-screen">
                            <canvas ref={swarmRef} className="sy-canvas" />
                        </div>

                        <div className="sy-sliders">
                            <label className="sy-slider">
                                <span className="sy-slider-lab k-mono">결합 세기 K <b>{k.toFixed(2)}</b></span>
                                <input type="range" min="0" max="3" step="0.02" value={k}
                                    onChange={(e) => setK(parseFloat(e.target.value))} />
                                <span className="sy-slider-foot k-mono">서로의 박자에 얼마나 끌리는가</span>
                            </label>
                            <label className="sy-slider">
                                <span className="sy-slider-lab k-mono">진동수 스프레드 Δω <b>{spread.toFixed(2)}</b></span>
                                <input type="range" min="0" max="1.8" step="0.02" value={spread}
                                    onChange={(e) => setSpread(parseFloat(e.target.value))} />
                                <span className="sy-slider-foot k-mono">타고난 박자의 제각각 정도(무질서)</span>
                            </label>
                            <label className="sy-slider">
                                <span className="sy-slider-lab k-mono">반딧불 수 N <b>{n}</b></span>
                                <input type="range" min="12" max="64" step="1" value={n}
                                    onChange={(e) => setN(parseInt(e.target.value, 10))} />
                                <span className="sy-slider-foot k-mono">무리 크기(바꾸면 새 무리)</span>
                            </label>
                        </div>

                        <p className="sy-view-foot k-mono">
                            <b>K</b>를 올려 결합을 키우면 흩어져 깜빡이던 무리가 어느 순간 <b>한 박자</b>로 잠긴다 ·
                            <b> Δω</b>를 키우면 타고난 박자가 제각각이라 동기화가 <b>더 어려워진다</b>
                        </p>
                    </div>

                    <div className="sy-right">
                        <div className={`sy-ring sy-${phase}`}>
                            <canvas ref={ringRef} className="sy-ring-canvas" />
                        </div>

                        <div className={`sy-amp sy-${phase}`}>
                            <span className="sy-amp-lab k-mono">질서변수 r = |⟨e^{'{iθ}'}⟩|</span>
                            <span className="sy-amp-num">{rDisp.toFixed(2)}</span>
                            <span className="sy-amp-sub k-mono">0 흩어짐 · 1 완전 동기</span>
                        </div>

                        <div className="sy-meter">
                            <div className="sy-meter-track">
                                <div className="sy-meter-fill" style={{ width: `${rDisp * 100}%` }} />
                            </div>
                        </div>

                        <div className="sy-stats">
                            <div className="sy-stat">
                                <span className="sy-stat-lab k-mono">결합 K</span>
                                <span className="sy-stat-num k-mono">{k.toFixed(2)}</span>
                                <span className="sy-stat-foot k-mono">끌어당김</span>
                            </div>
                            <div className="sy-stat">
                                <span className="sy-stat-lab k-mono">임계 K_c ≈ Δω</span>
                                <span className="sy-stat-num k-mono">{kc.toFixed(2)}</span>
                                <span className="sy-stat-foot k-mono">{k >= kc ? 'K ≥ K_c' : 'K < K_c'}</span>
                            </div>
                        </div>

                        <div className={`sy-verdict sy-${phase}`}>
                            <p className="sy-verdict-txt">{PHASE_LABEL[phase]}</p>
                        </div>

                        <div className="sy-actions">
                            <button type="button" className="sy-btn sy-btn-hot" onClick={() => setPlaying((p) => !p)}>
                                {playing ? '⏸ 정지' : '▶ 재생'}
                            </button>
                            <button type="button" className="sy-btn sy-btn-ghost" onClick={() => seed(n)}>↻ 새 무리</button>
                            <button type="button" className="sy-btn sy-btn-ghost" onClick={() => { setK(0); }}>K=0 풀기</button>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win sy-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="sy-foot">
                    <p>
                        {'동남아 강가에서 수천 마리의 반딧불이 지휘자도 없이 '}<b>{'일제히'}</b>{' 깜빡이는 장면은 오래도록 '}
                        {'수수께끼였다. 최근에도 반딧불 무리가 어떻게 스스로 박자를 맞추는지 — 개체가 옆의 불빛을 보고 제 '}
                        {'박자를 '}<b>{'앞당기거나 늦춰'}</b>{' 결국 무리 전체가 하나의 리듬으로 수렴한다는 '}
                        {'연구가 화제가 됐다. 특정 종·특정 연구가 아니라 그 밑바탕의 보편 구조 — '}
                        <b>{'제각각인 진동자들이 서로 약하게 끌어당기기만 해도 저절로 한 박자로 잠긴다'}</b>{' — 를 이 실험에 담았다.'}
                    </p>
                    <p>
                        {'이 자발적 동기화를 가장 단순하게 포착한 것이 '}<b>{'쿠라모토 모형'}</b>{'이다. 반딧불 i 는 위상 '}
                        <b>{'θ_i'}</b>{'(깜빡임의 진행도)와 타고난 진동수 '}<b>{'ω_i'}</b>{'(제 박자)를 갖는다. 결합이 없으면 저마다 '}
                        {'제 속도로 돌아 무리는 흩어진다. 결합 K 가 있으면 각자는 무리의 '}<b>{'평균 위상 ψ'}</b>{' 쪽으로 끌려간다: '}
                        <b>{'θ̇_i = ω_i + K·r·sin(ψ − θ_i)'}</b>{'. 여기서 '}<b>{'r'}</b>{'(질서변수)은 위상들이 얼마나 뭉쳤는지를 '}
                        {'0(완전 무질서)에서 1(완전 동기)로 나타낸다. 흥미로운 건 되먹임이다 — 조금 뭉치면 r 이 커지고, 커진 r 이 '}
                        {'끌어당김을 더 세게 만들어 더 뭉친다.'}
                    </p>
                    <p>
                        {'그래서 동기화는 서서히 오지 않고 '}<b>{'문턱에서 갑자기'}</b>{' 온다. 결합 K 가 진동수의 제각각 정도(Δω)로 '}
                        {'정해지는 임계값 '}<b>{'K_c'}</b>{' 보다 작으면 무질서가 이겨 r≈0 에 머물지만, K 가 K_c 를 넘는 순간 r 이 0에서 '}
                        <b>{'튀어올라'}</b>{' 무리가 한 박자로 잠긴다 — 물이 어느 온도에서 갑자기 어는 것과 같은 '}<b>{'상전이'}</b>{'다. '}
                        {'오른쪽 위상 원에서 청록색 화살표(질서변수 벡터)의 길이가 바로 r 이다. 흩어지면 화살표가 짧고, 잠기면 '}
                        {'점들이 한 덩어리로 뭉치며 화살표가 원 끝까지 뻗는다.'}
                    </p>
                    <p>
                        {'직접 만져보라. '}<b>{'K'}</b>{'를 천천히 올리며 어느 지점에서 무리가 '}<b>{'툭'}</b>{' 하고 한 박자로 맞춰지는지, '}
                        {'그 문턱을 지나 '}<b>{'Δω'}</b>{'(무질서)를 키우면 왜 더 센 결합이 있어야 겨우 동기화가 유지되는지, K 를 다시 '}
                        {'0으로 풀면 왜 무리가 서서히 흩어지는지를 보라. 심장 박동세포·박수치는 관객·전력망의 발전기·뇌의 신경 '}
                        {'진동까지, 제각각인 것들이 스스로 발맞추는 그 원형이 여기 있다.'}
                    </p>
                    <p className="sy-disclaimer">
                        {'* 평균장 쿠라모토 모형만 남긴 개념 데모입니다. 임계 결합 K_c 는 진동수 분포에 따라 정확한 값이 달라지며 '}
                        {'(여기선 K_c≈Δω 로 단순화), 유한한 무리에서는 r 이 0으로 완전히 떨어지지 않고 요동칩니다. 공간 구조·시간 '}
                        {'지연·잡음 등은 생략했습니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Sync;
