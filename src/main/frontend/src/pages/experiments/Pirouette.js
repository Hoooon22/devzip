import React, { useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Pirouette.css';

// PIROUETTE — 각운동량 보존 (conservation of angular momentum).
//   외부 토크가 없으면 각운동량 L = I·ω 는 보존된다. 회전하는 계가 질량을 회전축 쪽으로
//   끌어당기면 관성모멘트 I = Σ mᵢrᵢ² 가 줄고, L 을 지키기 위해 각속도 ω 가 그만큼 커진다.
//   피겨 스케이터가 팔을 몸에 붙이면 빙글 빨라지는 그 현상이다.
// 밑바탕의 보편 개념: "가까이 당기면 왜 빨라지나". 배수구로 빨려드는 물이 중심으로 갈수록
//   소용돌이치고, 수축하는 성운이 원반으로 납작해지며 빨리 돌고, 회전의자 위에서 아령을
//   당기면 팽그르르 도는 것 — 모두 같은 보존 법칙의 얼굴이다. 여기에 반전이 하나 있다:
//   L 은 보존돼도 회전운동에너지 KE = ½Iω² = L²/2I 는 보존되지 않는다. 팔을 당기면 KE 가
//   오르고, 그 차이는 당신이 원심력을 거슬러 넣은 "일"이다. (특정 사건·인물이 아니라
//   "질량을 축으로 당기면 왜 빨라지나"라는 추상 개념으로만 다룬다.)

const I0 = 0.5;        // 허브(중심축)의 고정 관성모멘트 — 팔이 없어도 남는 기본 회전관성
const K = 4;           // 팔(=끝단 질량) 개수
const MASS = 1;        // 팔 끝 질량 하나의 크기
const R_MIN = 0.30;    // 팔 길이 최소(축에 바짝 당김), 캔버스 반지름 대비 비율
const R_MAX = 1.0;     // 팔 길이 최대(활짝 폄)
const KICK = 3.2;      // "밀어 돌리기" 한 번이 더해 주는 각운동량 임펄스
const FRICTION_B = 0.35;

const radiusOf = (ext) => R_MIN + ext * (R_MAX - R_MIN);
const inertiaOf = (ext) => {
    const r = radiusOf(ext);
    return I0 + K * MASS * r * r;
};

const I_REF = inertiaOf(1);   // 팔을 활짝 폈을 때의 I — 비교 기준

const fmt = (n, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

const Pirouette = () => {
    const canvasRef = useRef(null);
    const rafRef = useRef(0);
    const lastTRef = useRef(0);

    // 물리 상태(애니메이션 루프용 refs)
    const LRef = useRef(0);          // 각운동량 (보존량)
    const extRef = useRef(1);        // 팔 길이 0(당김)~1(폄)
    const angleRef = useRef(0);      // 현재 회전각(rad)
    const revsRef = useRef(0);       // 누적 회전수
    const frictionRef = useRef(false);
    const draggingRef = useRef(false);

    const [ext, setExt] = useState(1);
    const [friction, setFriction] = useState(false);
    const [ui, setUi] = useState(() => snapshot());

    function snapshot() {
        const L = LRef.current;
        const e = extRef.current;
        const I = inertiaOf(e);
        const omega = L / I;                 // ω = L / I
        const ke = 0.5 * L * L / I;          // KE = L²/2I
        const keRef = 0.5 * L * L / I_REF;   // 팔 폈을 때 KE
        return {
            I, omega, L, ke,
            rpm: omega * 60 / (2 * Math.PI),
            revs: revsRef.current,
            work: ke - keRef,                // 팔을 당기며 넣은 일(ΔKE)
        };
    }

    const palette = () => {
        const el = document.querySelector('.lab-os');
        const dark = el && el.getAttribute('data-theme') === 'dark';
        return dark
            ? { ink: '#e8eaed', arm: '#58a6bd', mass: '#7cc4d6', hot: '#f0a83a', ring: '#3a4048', hub: '#2a3038', faint: 'rgba(88,166,189,0.20)' }
            : { ink: '#20242a', arm: '#2f6d80', mass: '#2f6d80', hot: '#c9791a', ring: '#d6cfc2', hub: '#e7e0d3', faint: 'rgba(47,109,128,0.16)' };
    };

    const render = () => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const W = cv.width, H = cv.height;
        const cx = W / 2, cy = H / 2;
        const R = Math.min(W, H) / 2 - 14;   // 픽셀 반지름(팔 최대 길이)
        const pal = palette();

        ctx.clearRect(0, 0, W, H);

        // 반지름 가이드 링(최소/최대 팔 길이)
        ctx.strokeStyle = pal.ring;
        ctx.lineWidth = 1;
        [R_MIN, R_MAX].forEach((rr) => {
            ctx.beginPath();
            ctx.arc(cx, cy, rr * R, 0, Math.PI * 2);
            ctx.setLineDash(rr === R_MAX ? [] : [4, 5]);
            ctx.stroke();
        });
        ctx.setLineDash([]);

        const r = radiusOf(extRef.current) * R;
        const omega = LRef.current / inertiaOf(extRef.current);
        const theta = angleRef.current;

        // 모션 블러: ω가 클수록 잔상 팔을 뒤로 몇 개 그린다
        const ghosts = Math.min(5, Math.floor(Math.abs(omega) * 1.1));
        for (let g = ghosts; g >= 1; g -= 1) {
            const a = theta - Math.sign(omega) * g * 0.10;
            drawArms(ctx, cx, cy, r, a, pal, 0.10 * (1 - g / (ghosts + 1)));
        }
        drawArms(ctx, cx, cy, r, theta, pal, 1);

        // 허브
        ctx.fillStyle = pal.hub;
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // 회전 기준 눈금(허브의 방향 표시 — 도는 게 보이도록)
        ctx.strokeStyle = pal.hot;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(theta) * 15, cy + Math.sin(theta) * 15);
        ctx.stroke();
    };

    const drawArms = (ctx, cx, cy, r, theta, pal, alpha) => {
        ctx.globalAlpha = alpha;
        for (let i = 0; i < K; i += 1) {
            const a = theta + i * (2 * Math.PI / K);
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            ctx.strokeStyle = pal.arm;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.fillStyle = pal.mass;
            ctx.beginPath();
            ctx.arc(x, y, 11, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    };

    const ensureLoop = () => {
        if (!rafRef.current) {
            lastTRef.current = 0;
            rafRef.current = requestAnimationFrame(frame);
        }
    };

    function frame(t) {
        const last = lastTRef.current || t;
        let dt = (t - last) / 1000;
        lastTRef.current = t;
        if (dt > 0.05) dt = 0.05;   // 탭 전환 등으로 인한 큰 점프 방지

        const I = inertiaOf(extRef.current);
        let L = LRef.current;
        const omega = L / I;

        // 마찰: 토크 τ = -b·ω → dL = -b·ω·dt
        if (frictionRef.current && Math.abs(L) > 1e-4) {
            L -= FRICTION_B * omega * dt;
            if (Math.abs(L) < 1e-3) L = 0;
            LRef.current = L;
        }

        angleRef.current += omega * dt;
        revsRef.current += Math.abs(omega) * dt / (2 * Math.PI);

        render();
        setUi(snapshot());

        const spinning = Math.abs(LRef.current) > 1e-4;
        if (spinning || draggingRef.current) {
            rafRef.current = requestAnimationFrame(frame);
        } else {
            rafRef.current = 0;
        }
    }

    // ── 컨트롤 ──
    const applyExt = (v) => {
        const clamped = Math.max(0, Math.min(1, v));
        extRef.current = clamped;
        setExt(clamped);
        if (!rafRef.current) { render(); setUi(snapshot()); }   // 정지 상태에서도 즉시 반영
    };

    const kick = () => {
        LRef.current += KICK;
        ensureLoop();
    };

    const stop = () => {
        LRef.current = 0;
        ensureLoop();   // 한 프레임 돌려 정지 상태 렌더 후 루프 종료
    };

    const toggleFriction = () => {
        frictionRef.current = !frictionRef.current;
        setFriction(frictionRef.current);
    };

    const reset = () => {
        LRef.current = 0;
        extRef.current = 1;
        angleRef.current = 0;
        revsRef.current = 0;
        frictionRef.current = false;
        setExt(1);
        setFriction(false);
        render();
        setUi(snapshot());
    };

    // ── 캔버스에서 질량을 잡아 반지름으로 당기기/펴기 ──
    const extFromPointer = (e) => {
        const cv = canvasRef.current;
        const rect = cv.getBoundingClientRect();
        const cx = rect.width / 2, cy = rect.height / 2;
        const px = e.clientX - rect.left - cx;
        const py = e.clientY - rect.top - cy;
        const R = Math.min(rect.width, rect.height) / 2 - 14;
        const dist = Math.sqrt(px * px + py * py) / R;   // 0~1(+) 반지름 비율
        return (dist - R_MIN) / (R_MAX - R_MIN);
    };

    const onPointerDown = (e) => {
        draggingRef.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        applyExt(extFromPointer(e));
        ensureLoop();
    };
    const onPointerMove = (e) => {
        if (!draggingRef.current) return;
        applyExt(extFromPointer(e));
    };
    const onPointerUp = (e) => {
        draggingRef.current = false;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        if (!rafRef.current) { render(); setUi(snapshot()); }
    };

    // 마운트: 캔버스 해상도 + 초기 스핀
    useEffect(() => {
        const cv = canvasRef.current;
        if (cv) { cv.width = 420; cv.height = 420; }
        LRef.current = KICK * 1.4;     // 처음부터 살짝 돌아가는 상태로 시작
        ensureLoop();
        // StrictMode 이중 마운트 대비: 정리 시 raf 취소 후 ref를 반드시 0으로 되돌려
        // 재마운트의 ensureLoop()가 stale id에 막혀 no-op 되지 않게 한다.
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = 0; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 비교 메터: 팔 폈을 때(ext=1) 대비 배율
    const ratioI = ui.I / I_REF;
    const ratioW = I_REF / ui.I;    // ω ∝ 1/I
    const ratioKE = I_REF / ui.I;   // KE ∝ 1/I (같은 L)
    const meterW = (ratio) => `${Math.min(100, (ratio / 6) * 100)}%`;
    const spinning = Math.abs(ui.L) > 1e-4;

    return (
        <LabShell
            title="PIROUETTE"
            eyebrow="conservation of angular momentum · L = Iω"
            subtitle={'// 팔을 당기면 왜 빨라지나 — 각운동량은 지키고 에너지는 새로 넣는 회전'}
            path="pirouette.exe"
        >
            {/* 컨트롤 */}
            <section className="k-win pa-ctrl-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">/spin/</span>controls</span>
                    <span className="meta k-mono">외부 토크 0 → L 보존</span>
                </div>
                <div className="pa-ctrl">
                    <div className="pa-ctrl-block pa-grow">
                        <span className="pa-ctrl-lab k-mono">
                            팔 길이(반지름) <b>{fmt(radiusOf(ext), 2)}</b> · 관성 I <b>{fmt(inertiaOf(ext), 2)}</b>
                        </span>
                        <input
                            type="range" min="0" max="1" step="0.001" value={ext}
                            onChange={(e) => applyExt(parseFloat(e.target.value))}
                            className="pa-range"
                            aria-label="팔 길이(반지름)"
                        />
                        <div className="pa-range-ends k-mono">
                            <span>← 축으로 당김 (I 작아짐)</span>
                            <span>활짝 폄 (I 커짐) →</span>
                        </div>
                    </div>

                    <div className="pa-actions">
                        <button type="button" className="pa-btn pa-btn-hot" onClick={kick}>↻ 밀어 돌리기</button>
                        <button type="button" className={`pa-btn pa-btn-ghost${friction ? ' on' : ''}`} onClick={toggleFriction}>
                            마찰 {friction ? 'ON' : 'OFF'}
                        </button>
                        <button type="button" className="pa-btn pa-btn-ghost" onClick={stop}>■ 정지</button>
                        <button type="button" className="pa-btn pa-btn-ghost" onClick={reset}>초기화</button>
                    </div>
                </div>
            </section>

            {/* 스테이지 */}
            <section className="k-win pa-stage-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">/spin/</span>turntable</span>
                    <span className="meta k-mono">질량을 잡아 축으로 끌어당겨 보라</span>
                </div>
                <div className="pa-stage">
                    <div className="pa-canvas-wrap">
                        <canvas
                            ref={canvasRef}
                            className="pa-canvas"
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerLeave={onPointerUp}
                            aria-label="회전 원판 — 끝단 질량을 드래그해 축으로 당기거나 펼칩니다"
                        />
                        <span className="pa-canvas-hint k-mono">
                            {'// 돌아가는 중에 질량을 축으로 당기면 ω가 튀어 오른다 — L은 그대로'}
                        </span>
                    </div>

                    <div className="pa-side">
                        <div className="pa-live">
                            <div className="pa-live-item pa-live-hero">
                                <span className="pa-live-num k-mono">{fmt(ui.L, 2)}</span>
                                <span className="pa-live-lab">각운동량 L = I·ω <span className="pa-lock">🔒 보존</span></span>
                            </div>
                            <div className="pa-live-item">
                                <span className="pa-live-num k-mono" style={{ color: 'var(--pa-hot)' }}>{fmt(ui.rpm, 0)}</span>
                                <span className="pa-live-lab">각속도 ω · {fmt(ui.rpm, 0)} rpm ({fmt(ui.omega, 2)} rad/s)</span>
                            </div>
                            <div className="pa-live-item">
                                <span className="pa-live-num k-mono">{fmt(ui.I, 2)}</span>
                                <span className="pa-live-lab">관성모멘트 I = I₀ + Σmr²</span>
                            </div>
                            <div className="pa-live-item">
                                <span className="pa-live-num k-mono" style={{ color: 'var(--pa-hot)' }}>{fmt(ui.ke, 2)}</span>
                                <span className="pa-live-lab">회전운동에너지 KE = ½Iω²</span>
                            </div>
                        </div>

                        <div className="pa-revs">
                            <span className="pa-ctrl-lab k-mono">누적 회전 <b>{fmt(ui.revs, 1)}</b> 바퀴</span>
                            <span className={`pa-badge ${spinning ? 'spin' : 'idle'}`}>
                                {spinning ? (friction ? '감속 중 (마찰 토크)' : '자유 회전 (L 보존)') : '정지'}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* 비교 메터 */}
            <section className="k-win pa-meter-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">/compare/</span>relative</span>
                    <span className="meta k-mono">팔 폈을 때 대비 배율</span>
                </div>
                <div className="pa-meters">
                    <div className="pa-meter">
                        <span className="pa-meter-head">
                            <span className="pa-meter-name">관성모멘트 I</span>
                            <span className="pa-meter-val k-mono">×{fmt(ratioI, 2)}</span>
                        </span>
                        <div className="pa-meter-track">
                            <div className="pa-meter-fill steel" style={{ width: meterW(ratioI) }} />
                            <div className="pa-meter-ref" style={{ left: `${(1 / 6) * 100}%` }} />
                        </div>
                    </div>
                    <div className="pa-meter">
                        <span className="pa-meter-head">
                            <span className="pa-meter-name">각속도 ω</span>
                            <span className="pa-meter-val k-mono">×{fmt(ratioW, 2)}</span>
                        </span>
                        <div className="pa-meter-track">
                            <div className="pa-meter-fill hot" style={{ width: meterW(ratioW) }} />
                            <div className="pa-meter-ref" style={{ left: `${(1 / 6) * 100}%` }} />
                        </div>
                    </div>
                    <div className="pa-meter">
                        <span className="pa-meter-head">
                            <span className="pa-meter-name">회전에너지 KE</span>
                            <span className="pa-meter-val k-mono">×{fmt(ratioKE, 2)}</span>
                        </span>
                        <div className="pa-meter-track">
                            <div className="pa-meter-fill hot" style={{ width: meterW(ratioKE) }} />
                            <div className="pa-meter-ref" style={{ left: `${(1 / 6) * 100}%` }} />
                        </div>
                    </div>
                    <div className="pa-meter">
                        <span className="pa-meter-head">
                            <span className="pa-meter-name">각운동량 L <span className="pa-lock">🔒</span></span>
                            <span className="pa-meter-val k-mono">×1.00</span>
                        </span>
                        <div className="pa-meter-track">
                            <div className="pa-meter-fill lock" style={{ width: meterW(1) }} />
                            <div className="pa-meter-ref" style={{ left: `${(1 / 6) * 100}%` }} />
                        </div>
                    </div>
                </div>
                <div className="pa-work">
                    <span className="pa-ctrl-lab k-mono">팔을 당기며 넣은 일 ΔE (원심력을 거스른 일)</span>
                    <span className="pa-work-num k-mono" style={{ color: ui.work > 0.01 ? 'var(--pa-hot)' : 'var(--ink-mute)' }}>
                        {ui.work >= 0 ? '+' : ''}{fmt(ui.work, 2)}
                    </span>
                    <span className="pa-work-cap">
                        L은 그대로인데 KE가 늘었다 — 그 차이는 당신의 근육에서 나온다. 팔을 다시 펴면 에너지는 되돌아간다.
                    </span>
                </div>
            </section>

            {/* 해설 */}
            <section className="k-win pa-foot-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="pa-foot">
                    <p>
                        규칙은 단 하나다 — 외부에서 <b>토크(회전을 비트는 힘)</b>가 걸리지 않으면 <b>각운동량
                        L = I·ω</b> 는 변하지 않는다. 여기서 <b>I(관성모멘트)</b>는 질량이 회전축에서 얼마나
                        멀리 퍼져 있는지를 재는 값이다: I = I₀ + Σmr². 질량을 축 쪽으로 <b>당기면 r이 줄어
                        I가 작아지고</b>, L을 지키려면 <b>ω(각속도)가 그만큼 커져야</b> 한다. 돌아가는 원판에서
                        질량을 잡아 중심으로 끌어당겨 보라 — 손이 하는 일은 그저 반지름을 줄이는 것뿐인데,
                        회전이 팽그르르 빨라진다. 피겨 스케이터가 팔을 붙이면 빨라지는 그 장면 그대로다.
                    </p>
                    <p>
                        여기에 반전이 하나 있다. L은 보존돼도 <b>회전운동에너지 KE = ½Iω² = L²/2I</b> 는
                        보존되지 <b>않는다</b>. I가 절반이 되면 ω는 두 배가 되고 KE는 <b>두 배</b>로 뛴다.
                        이 늘어난 에너지는 어디서 왔을까 — 바로 당신이다. 회전하는 질량을 안쪽으로 당기려면
                        <b> 원심력을 거슬러 일을 해야</b> 하고, 그 일이 고스란히 회전에너지로 저장된다. 반대로
                        팔을 다시 펴면 질량이 바깥으로 밀리며 그 에너지를 되돌려 준다. 위의 &quot;넣은 일 ΔE&quot;
                        칸이 그 수지를 보여 준다.
                    </p>
                    <p>
                        <b>마찰</b>을 켜면 이야기가 달라진다. 이제 축에 미세한 저항 토크가 걸려 L이 서서히
                        새어 나가고(회전이 잦아든다), 당기든 펴든 결국 멈춘다. 현실의 팽이·회전목마·물레가
                        영원히 돌지 못하는 이유다 — 완벽한 &quot;외부 토크 0&quot;은 이상적인 조건이다.
                    </p>
                    <p>
                        이 작은 원판 하나가 왜 그렇게 자주 등장할까. <b>배수구로 빨려드는 물</b>은 중심으로
                        갈수록 소용돌이가 빨라지고, 중력으로 <b>수축하는 성운</b>은 납작한 원반이 되며 점점 빨리
                        돌아 별과 행성계를 빚고, <b>초신성 잔해가 중성자별</b>로 쪼그라들면 초당 수백 바퀴를 돈다.
                        <b> 다이빙 선수</b>가 몸을 말아 회전을 늘리고 펴서 입수하는 것도, 고양이가 떨어지며 몸을
                        비트는 것도 모두 같은 법칙의 얼굴이다. &quot;가까이 당기면 왜 빨라지나&quot;의 답은 언제나
                        하나 — 계가 각운동량을 지키려 하기 때문이다.
                    </p>
                    <p className="pa-disclaimer">
                        * 팔 끝에 점질량 {K}개가 달린 이상적 강체 회전자(rigid rotor)의 단순화 모형입니다.
                        I = I₀ + Σmr², L = Iω, KE = ½Iω² 를 그대로 적분하며, 마찰 OFF일 때 L은 보존됩니다
                        (수치 오차 제외). 물리량은 임의 단위(a.u.)이고, 배율 메터는 팔을 활짝 폈을 때(ext=1)를
                        기준 1.00으로 둡니다. 특정 사건·인물과 무관한 추상 회전 모형입니다.
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Pirouette;
