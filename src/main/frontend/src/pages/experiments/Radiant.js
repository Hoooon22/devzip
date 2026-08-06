import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Radiant.css';

// RADIANT — 유성우의 복사점(radiant) 실험.
//   유성우는 혜성이 궤도에 뿌린 부스러기 무리 속으로 지구가 지나며 생긴다. 부스러기들은
//   거의 "평행하게" 같은 방향으로 대기에 뛰어든다. 그런데 관측자에게는 하늘의 한 점에서
//   사방으로 뻗어 나오는 것처럼 보인다 — 나란한 기찻길이 저 멀리 한 점(소실점)으로
//   모이는 것과 똑같은 원근 착시다. 그 소실점이 복사점(radiant)이다.
//   복사점 가까이 튄 유성은 정면으로 다가와 짧게(전축), 멀리 튄 유성은 옆으로 길게 흐른다.
//
//   두 번째 사실: 보이는 유성 수는 복사점이 지평선 위로 얼마나 높이 떴는지에 달렸다.
//     관측률 ≈ ZHR · sin(h)        (h = 복사점 고도)
//   복사점이 지평선에 걸쳐 있으면(h→0) 대기를 비스듬히 긁어 대부분 놓치고,
//   머리 위(h→90°)로 오를수록 같은 밀도의 부스러기라도 더 많이 잡힌다. 페르세우스자리
//   유성우가 "자정 넘어"가 절정인 이유 — 그때 복사점이 하늘 높이 올라오기 때문이다.
//
//   한계등급 보정: ZHR은 "한계등급 6.5의 완벽히 어두운 하늘" 기준값이다. 광공해로
//   하늘이 밝으면 어두운 유성이 묻혀 실제로는 덜 보인다.
//     보이는율 = ZHR · sin(h) · r^(limMag − 6.5)     (r = 개체수 지수 ≈ 2.2)

const R_POP = 2.2;          // 개체수 지수 (한계등급 1 낮아질 때 유성 수가 줄어드는 비)
const REF_MAG = 6.5;        // ZHR 기준 한계등급
const DEG = Math.PI / 180;

const W = 660, H = 420;     // 캔버스(하늘) 크기
const HORIZON = 348;        // 지평선 y
const TOP = 44;             // 천정(고도 90°)에 대응하는 y
const ACCELS = [15, 30, 60, 120];

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// 복사점 고도(deg) → 화면 y. h=0 이면 지평선, h=90 이면 천정.
const radiantY = (h) => HORIZON - (clamp(h, 0, 90) / 90) * (HORIZON - TOP);

// 배경 별 (정적) — 매 프레임 다시 그리므로 좌표만 미리 뽑아둔다.
function makeStars() {
    const stars = [];
    // 결정적 의사난수 (Date/Math.random 편차 없이 매번 같은 하늘)
    let seed = 20260806;
    const rnd = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    };
    for (let i = 0; i < 150; i++) {
        stars.push({
            x: rnd() * W,
            y: rnd() * (HORIZON - 4),
            r: rnd() * 1.1 + 0.2,
            a: rnd() * 0.5 + 0.25,
        });
    }
    return stars;
}

const Radiant = () => {
    const [alt, setAlt] = useState(58);          // 복사점 고도 h (deg)
    const [zhr, setZhr] = useState(90);          // 시간당 천정 출현율
    const [limMag, setLimMag] = useState(5.6);   // 하늘 한계등급 (어두울수록 큼)
    const [showTrace, setShowTrace] = useState(true);   // 복사점 추적선
    const [showSporadic, setShowSporadic] = useState(true); // 산발 유성
    const [accel, setAccel] = useState(30);      // 시간 가속
    const [running, setRunning] = useState(true);
    const [tally, setTally] = useState(0);       // 이번 세션 관측 유성 수

    const canvasRef = useRef(null);
    const starsRef = useRef(makeStars());
    const meteorsRef = useRef([]);
    const tallyRef = useRef(0);
    const accRef = useRef(0);        // 스폰 누적자
    const sporAccRef = useRef(0);

    // 최신 컨트롤값을 rAF 루프에서 읽도록 ref 로 미러링 (스테일 클로저 방지)
    const st = useRef({ alt, zhr, limMag, showTrace, showSporadic, accel, running });
    useEffect(() => {
        st.current = { alt, zhr, limMag, showTrace, showSporadic, accel, running };
    }, [alt, zhr, limMag, showTrace, showSporadic, accel, running]);

    // HUD tally 는 0.4s 마다 동기화 (매 프레임 setState 방지)
    useEffect(() => {
        const id = setInterval(() => setTally(tallyRef.current), 400);
        return () => clearInterval(id);
    }, []);

    // 파생값 (표시 + 스폰율)
    const magFactor = Math.pow(R_POP, limMag - REF_MAG);       // ≤ 1
    const sinH = Math.sin(clamp(alt, 0, 90) * DEG);
    const observed = zhr * sinH * magFactor;                   // 실제 관측률 (개/시)
    const below = alt <= 0.5;

    const spawnShower = useCallback((rx, ry) => {
        const s = st.current;
        // 하늘 아무 점을 목표로 잡고, 복사점→그 점 방향으로 튀어나가게 한다.
        const px = Math.random() * W;
        const py = Math.random() * (HORIZON - 6);
        let dx = px - rx, dy = py - ry;
        let d = Math.hypot(dx, dy);
        if (d < 6) return;                    // 복사점에 너무 붙으면 스킵
        dx /= d; dy /= d;
        // 복사점에서 먼 유성일수록 옆에서 길게 흐른다(전축 효과). 가까우면 짧은 점.
        const spread = clamp(d / (W * 0.5), 0.12, 1);
        const startD = 18 + Math.random() * (d - 12);   // 복사점에서 얼마쯤 떨어져 나타날지
        meteorsRef.current.push({
            hx: rx + dx * startD, hy: ry + dy * startD,   // 머리 위치
            dx, dy,
            speed: 2.2 + spread * 5.5,
            len: 8 + spread * 60,                         // 최대 꼬리 길이
            grow: 0,
            life: 1,
            fade: 0.012 + Math.random() * 0.01,
            shower: true,
            rx, ry,
        });
        // 밝기 편차용 굵기
        const m = meteorsRef.current[meteorsRef.current.length - 1];
        m.wide = 1 + Math.random() * 1.4;
    }, []);

    const spawnSporadic = useCallback(() => {
        // 산발 유성: 유성우와 무관하게 아무 방향으로 — 복사점으로 역추적되지 않는다.
        const hx = Math.random() * W;
        const hy = Math.random() * (HORIZON - 40) + 8;
        const ang = Math.random() * Math.PI * 2;
        meteorsRef.current.push({
            hx, hy,
            dx: Math.cos(ang), dy: Math.sin(ang),
            speed: 2 + Math.random() * 3,
            len: 20 + Math.random() * 34,
            grow: 0, life: 1, fade: 0.02 + Math.random() * 0.012,
            shower: false, wide: 0.8 + Math.random() * 0.6,
        });
    }, []);

    // 애니메이션 루프 (마운트 1회)
    useEffect(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        let raf;
        let last = 0;

        const draw = (ts) => {
            const s = st.current;
            const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
            last = ts;
            const dark = cv.closest('.lab-os')?.getAttribute('data-theme') === 'dark';

            const rx = W * 0.5;
            const ry = radiantY(s.alt);
            const radiantUp = s.alt > 0.5;

            // ---- 배경: 밤하늘 ----
            const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
            sky.addColorStop(0, dark ? '#05070f' : '#0a1024');
            sky.addColorStop(1, dark ? '#0a1120' : '#131d38');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, W, HORIZON);

            // 광공해 지평선 글로우 — 하늘이 밝을수록(한계등급 낮을수록) 강해진다
            const pol = clamp((REF_MAG - s.limMag) / 3, 0, 1);
            if (pol > 0.01) {
                const g = ctx.createLinearGradient(0, HORIZON - 120, 0, HORIZON);
                g.addColorStop(0, 'rgba(196,120,58,0)');
                g.addColorStop(1, `rgba(214,132,64,${0.28 * pol})`);
                ctx.fillStyle = g;
                ctx.fillRect(0, HORIZON - 120, W, 120);
            }

            // 별 — 밝은 하늘에선 어두운 별이 묻힌다
            for (const stx of starsRef.current) {
                const vis = clamp(1 - pol * (1 - stx.a), 0, 1);
                ctx.globalAlpha = stx.a * vis;
                ctx.fillStyle = dark ? '#cdd6ea' : '#e6ecfa';
                ctx.beginPath();
                ctx.arc(stx.x, stx.y, stx.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // ---- 지면 ----
            ctx.fillStyle = dark ? '#070a12' : '#0a0e18';
            ctx.fillRect(0, HORIZON, W, H - HORIZON);
            ctx.strokeStyle = 'rgba(120,140,170,0.35)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, HORIZON + 0.5); ctx.lineTo(W, HORIZON + 0.5); ctx.stroke();
            ctx.fillStyle = 'rgba(150,168,196,0.5)';
            ctx.font = '10px monospace';
            ctx.fillText('지평선', 8, HORIZON + 16);

            // ---- 스폰 ----
            if (s.running) {
                if (radiantUp) {
                    const rate = s.zhr * Math.sin(s.alt * DEG) * Math.pow(R_POP, s.limMag - REF_MAG);
                    accRef.current += (rate / 3600) * s.accel * dt;
                    let guard = 0;
                    while (accRef.current >= 1 && guard < 8) {
                        accRef.current -= 1;
                        spawnShower(rx, ry);
                        tallyRef.current += 1;
                        guard++;
                    }
                }
                if (s.showSporadic) {
                    // 산발 유성: 대략 시간당 8개(가속 적용)
                    sporAccRef.current += (8 / 3600) * s.accel * dt;
                    if (sporAccRef.current >= 1) { sporAccRef.current -= 1; spawnSporadic(); }
                }
            }

            // ---- 복사점 추적선 ----
            if (s.showTrace && radiantUp) {
                ctx.strokeStyle = dark ? 'rgba(79,208,224,0.16)' : 'rgba(70,190,210,0.18)';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 5]);
                for (const m of meteorsRef.current) {
                    if (!m.shower || m.life <= 0) continue;
                    ctx.beginPath();
                    ctx.moveTo(m.hx, m.hy);
                    ctx.lineTo(rx, ry);
                    ctx.stroke();
                }
                ctx.setLineDash([]);
            }

            // ---- 유성 ----
            const alive = [];
            for (const m of meteorsRef.current) {
                if (s.running) {
                    m.hx += m.dx * m.speed * (s.accel / 30 > 2 ? 1.4 : 1);
                    m.hy += m.dy * m.speed * (s.accel / 30 > 2 ? 1.4 : 1);
                    m.grow = Math.min(m.len, m.grow + m.speed * 2);
                    m.life -= m.fade;
                }
                const off = m.hx < -80 || m.hx > W + 80 || m.hy < -80 || m.hy > HORIZON + 10;
                if (m.life <= 0 || off) continue;
                alive.push(m);

                const tx = m.hx - m.dx * m.grow;
                const ty = m.hy - m.dy * m.grow;
                const grad = ctx.createLinearGradient(m.hx, m.hy, tx, ty);
                const head = m.shower
                    ? (dark ? '#fdf3d8' : '#fbeecb')
                    : (dark ? '#c3ccdb' : '#b8c2d4');
                const mid = m.shower ? 'rgba(226,150,66,' : 'rgba(150,168,196,';
                grad.addColorStop(0, `rgba(255,255,255,${0.95 * m.life})`);
                grad.addColorStop(0.15, head);
                grad.addColorStop(0.6, `${mid}${0.5 * m.life})`);
                grad.addColorStop(1, `${mid}0)`);
                ctx.strokeStyle = grad;
                ctx.lineWidth = m.wide;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(m.hx, m.hy);
                ctx.lineTo(tx, ty);
                ctx.stroke();
                // 머리 반짝임
                ctx.globalAlpha = m.life;
                ctx.fillStyle = head;
                ctx.beginPath();
                ctx.arc(m.hx, m.hy, m.wide * 0.9, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            meteorsRef.current = alive;

            // ---- 복사점 표식 ----
            if (radiantUp) {
                ctx.save();
                ctx.strokeStyle = dark ? 'rgba(79,208,224,0.85)' : 'rgba(56,178,200,0.9)';
                ctx.fillStyle = ctx.strokeStyle;
                ctx.lineWidth = 1.4;
                const rr = 11;
                ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(rx - rr - 5, ry); ctx.lineTo(rx - rr + 3, ry);
                ctx.moveTo(rx + rr - 3, ry); ctx.lineTo(rx + rr + 5, ry);
                ctx.moveTo(rx, ry - rr - 5); ctx.lineTo(rx, ry - rr + 3);
                ctx.moveTo(rx, ry + rr - 3); ctx.lineTo(rx, ry + rr + 5);
                ctx.stroke();
                ctx.font = 'bold 10px monospace';
                ctx.fillText('◇ RADIANT / 복사점', rx + rr + 8, ry + 3.5);
                ctx.font = '9px monospace';
                ctx.fillText(`고도 ${s.alt.toFixed(0)}°`, rx + rr + 8, ry + 16);
                ctx.restore();
            } else {
                ctx.fillStyle = 'rgba(214,132,64,0.9)';
                ctx.font = 'bold 12px monospace';
                ctx.fillText('복사점이 지평선 아래 — 유성우 안 보임', W / 2 - 130, HORIZON - 16);
            }

            raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    }, [spawnShower, spawnSporadic]);

    const reset = useCallback(() => {
        meteorsRef.current = [];
        tallyRef.current = 0;
        accRef.current = 0;
        setTally(0);
    }, []);

    // 상태 판정
    let mode, mcls;
    if (below) { mode = '복사점 지평선 아래'; mcls = 'down'; }
    else if (observed >= 40) { mode = '활발 (좋은 조건)'; mcls = 'hi'; }
    else if (observed >= 12) { mode = '보통'; mcls = 'mid'; }
    else { mode = '한산 (조건 나쁨)'; mcls = 'lo'; }

    return (
        <LabShell
            title="RADIANT"
            eyebrow="meteor shower · the radiant is a vanishing point"
            subtitle={'// 나란히 떨어지는 유성이 한 점에서 뻗어 나오는 것처럼 보이는 원근 착시'}
            path="radiant.exe"
        >
            <section className="k-win rad-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/sky/</span>perseids</span>
                    <span className="meta k-mono">관측률 ≈ ZHR · sin(h)</span>
                </div>

                <div className="rad-stage">
                    {/* 왼쪽: 하늘 */}
                    <div className="rad-sky-col">
                        <div className={`rad-sky rad-${mcls}`}>
                            <canvas ref={canvasRef} width={W} height={H} className="rad-canvas" />
                            <div className="rad-sky-foot k-mono">
                                <span>◇ 나란한 부스러기 → 한 점(복사점)으로 수렴</span>
                                <span className={`rad-badge rad-badge-${mcls}`}>{mode}</span>
                            </div>
                        </div>

                        {/* 컨트롤 */}
                        <div className="rad-controls">
                            <label className="rad-ctl">
                                <span className="rad-ctl-lab k-mono">
                                    복사점 고도 h <b>{alt.toFixed(0)}°</b>
                                    <span className="rad-ctl-hint">지평선(0°)에선 0, 천정(90°)일수록 많이 보인다 · sin(h)={sinH.toFixed(2)}</span>
                                </span>
                                <input type="range" min={0} max={90} step={1}
                                    value={alt}
                                    onChange={(e) => setAlt(parseFloat(e.target.value))}
                                    className="rad-range rad-range-a" />
                                <div className="rad-scale k-mono">
                                    <span>0° 지평선</span><span>45°</span><span>90° 천정</span>
                                </div>
                            </label>

                            <label className="rad-ctl">
                                <span className="rad-ctl-lab k-mono">
                                    활동도 ZHR <b>{zhr}</b>
                                    <span className="rad-ctl-hint">천정·완벽한 하늘 기준 시간당 출현율 · 페르세우스 절정 ≈ 100</span>
                                </span>
                                <input type="range" min={5} max={120} step={5}
                                    value={zhr}
                                    onChange={(e) => setZhr(parseFloat(e.target.value))}
                                    className="rad-range rad-range-z" />
                            </label>

                            <label className="rad-ctl">
                                <span className="rad-ctl-lab k-mono">
                                    하늘 어둠 (한계등급) <b>{limMag.toFixed(1)}</b>
                                    <span className="rad-ctl-hint">클수록 어두운 하늘 · 광공해로 낮아지면 흐린 유성이 묻힌다 · 보정 ×{magFactor.toFixed(2)}</span>
                                </span>
                                <input type="range" min={3.5} max={6.5} step={0.1}
                                    value={limMag}
                                    onChange={(e) => setLimMag(parseFloat(e.target.value))}
                                    className="rad-range rad-range-m" />
                                <div className="rad-scale k-mono">
                                    <span>3.5 도심</span><span>5.0 교외</span><span>6.5 청정</span>
                                </div>
                            </label>

                            <div className="rad-toggles">
                                <button type="button"
                                    className={`rad-toggle ${showTrace ? 'on' : ''}`}
                                    onClick={() => setShowTrace((v) => !v)}>
                                    <span className="dot"></span>복사점 추적선
                                </button>
                                <button type="button"
                                    className={`rad-toggle ${showSporadic ? 'on' : ''}`}
                                    onClick={() => setShowSporadic((v) => !v)}>
                                    <span className="dot"></span>산발 유성
                                </button>
                            </div>

                            <div className="rad-run">
                                <button type="button" className="rad-btn" onClick={() => setRunning((r) => !r)}>
                                    {running ? '⏸ 일시정지' : '▶ 재생'}
                                </button>
                                <button type="button" className="rad-btn rad-btn-ghost" onClick={reset}>
                                    ↺ 초기화
                                </button>
                                <div className="rad-accel k-mono">
                                    시간 가속
                                    {ACCELS.map((a) => (
                                        <button key={a} type="button"
                                            className={`rad-accel-b ${accel === a ? 'on' : ''}`}
                                            onClick={() => setAccel(a)}>×{a}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 오른쪽: 계기판 + 해설 */}
                    <aside className="rad-side">
                        <div className="rad-hud">
                            <div className="rad-hud-row">
                                <span className="rad-hud-k k-mono">이론 관측률</span>
                                <span className="rad-hud-v rad-hud-big">{below ? 0 : Math.round(observed)}<em>개/시</em></span>
                            </div>
                            <div className="rad-hud-sub k-mono">
                                = {zhr} × sin({alt.toFixed(0)}°) × {magFactor.toFixed(2)}
                            </div>
                            <div className="rad-hud-grid k-mono">
                                <div><span>복사점 고도</span><b>{alt.toFixed(0)}°</b></div>
                                <div><span>고도 계수 sin h</span><b>{sinH.toFixed(2)}</b></div>
                                <div><span>한계등급 보정</span><b>×{magFactor.toFixed(2)}</b></div>
                                <div><span>세션 관측 수</span><b>{tally}</b></div>
                            </div>
                            <div className="rad-hud-note k-mono">
                                가속 ×{accel} — 시연은 시간을 빠르게 감았다. 실제 하늘에선
                                시간당 {below ? 0 : Math.round(observed)}개 남짓이다.
                            </div>
                        </div>

                        <div className="rad-read">
                            <h3>복사점은 &lsquo;소실점&rsquo;이다</h3>
                            <p>
                                혜성이 궤도에 뿌린 부스러기들은 거의 <b>나란한 방향</b>으로 대기에 뛰어든다.
                                나란한 기찻길이 저 멀리 한 점으로 모여 보이듯, 나란한 유성들도 하늘의
                                한 점 &mdash; <b>복사점</b> &mdash; 에서 뻗어 나오는 것처럼 보인다.
                                <b>복사점 추적선</b>을 켜면 모든 유성의 꼬리를 거꾸로 이었을 때 한 점에서
                                만나는 것을 볼 수 있다. <b>산발 유성</b>은 이 무리와 무관해 아무 방향으로
                                흘러 &mdash; 복사점으로 모이지 않는다.
                            </p>
                            <h3>왜 자정 넘어가 절정인가</h3>
                            <p>
                                보이는 수는 복사점이 얼마나 높이 떴는지에 달렸다 &mdash; <b>sin(h)</b>.
                                고도를 <b>0°</b>로 내리면 복사점이 지평선에 걸려 유성우가 사라지고,
                                <b>90°</b>로 올리면 같은 부스러기 밀도라도 훨씬 많이 잡힌다.
                                여기에 <b>도심(3.5)</b>으로 하늘을 밝히면 흐린 유성이 광공해에 묻혀 더 줄어든다.
                                복사점을 높이고 하늘을 어둡게 &mdash; 그것이 관측률을 최대로 끌어올리는 길이다.
                            </p>
                        </div>
                    </aside>
                </div>
            </section>
        </LabShell>
    );
};

export default Radiant;
