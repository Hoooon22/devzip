import React, { useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Songpyeon.css';

// SONGPYEON — 반달을 빚는 손끝 감각 (뉴스·트렌드[추석] × 미니게임 × Canvas 2D 직접 그리기 × 색 3개까지만).
//   소재: 추석의 대표 세시 활동인 송편 빚기. 소를 얼마나 넣느냐가 전부다 — 적으면 밍밍하고,
//         지나치면 터진다. 이 "손끝 감각"을 게임으로 옮긴다. (오늘 09-21은 올 추석 직전.)
//   형식: 미니게임 — 예쁜 송편은 점수, 터지면 실패. 세 번 터지면 끝난다.
//   기술: Canvas 2D 직접 그리기 — 반죽 블롭·소가 차오르는 게이지 링·소반에 쌓이는 반달을 손으로 그린다.
//   제약: 색은 3개까지만 — 나무 작업대(갈색) · 쌀반죽(크림) · 팥소/경고(붉은). 그 이상 안 쓴다.
//
//   도전: 누르는 동안 차오르는 소를 "터지기 직전"의 밝은 구간에서 멈추는 타이밍 게임을,
//         손을 떼는 순간의 미세한 되메움(settle overshoot)까지 얹어 손 감각처럼 느껴지게 만들 수 있는가.
//         차오름은 레벨마다 빨라지고 좋은 구간은 좁아지고 자리를 옮긴다.

const W = 760;
const H = 470;
const CX = W / 2;
const CY = 196;
const R0 = 44;                       // 반죽 기본 반지름
const RING = 98;                     // 게이지 링 반지름
const START_A = Math.PI * 0.75;      // 게이지 시작각(7시 30분 방향)
const SWEEP = Math.PI * 1.5;         // 270° 게이지, 아래 90°는 비움
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angleAt = (t) => START_A + t * SWEEP;

const Songpyeon = () => {
    const canvasRef = useRef(null);

    // ── 게임 상태(캔버스 루프가 읽는 권위값은 ref, 화면 표시는 state) ──
    const gsRef = useRef('idle');        // 'idle' | 'playing' | 'over'
    const phaseRef = useRef('idle');     // 'fill' | 'settle' | 'burst'
    const holdRef = useRef(false);
    const pressRef = useRef(false);      // 키 반복 방지
    const fillRef = useRef(0);
    const bandRef = useRef({ lo: 0.5, hi: 0.68, center: 0.59, rate: 0.4 });
    const levelRef = useRef(0);
    const scoreRef = useRef(0);
    const comboRef = useRef(0);
    const failRef = useRef(0);
    const trayRef = useRef([]);          // 완성된 송편들 { q }
    const animRef = useRef(null);        // { t, dur, kind, q, from, parts }
    const flashRef = useRef(null);       // { t, dur, txt, bad }

    const [gs, setGs] = useState('idle');
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [fails, setFails] = useState(0);
    const [best, setBest] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const isDark = () => document.querySelector('.lab-os')?.getAttribute('data-theme') === 'dark';
        let dark = isDark();
        const col = () => (dark
            ? { board: '#241b12', wood: '#31261a', dough: '#ece1c6', dim: 'rgba(236,225,198,0.5)', fill: '#d9573f' }
            : { board: '#2f2418', wood: '#3b2e1f', dough: '#efe6d0', dim: 'rgba(239,230,208,0.5)', fill: '#c8402c' });

        const newBand = () => {
            const lv = levelRef.current;
            const gw = clamp(0.19 - 0.011 * lv, 0.075, 0.19);
            const center = 0.42 + Math.random() * 0.30;
            bandRef.current = {
                lo: center - gw / 2,
                hi: center + gw / 2,
                center,
                inner: gw * 0.28,
                rate: Math.min(0.98, 0.40 + 0.045 * lv),
            };
        };

        const startGame = () => {
            gsRef.current = 'playing';
            phaseRef.current = 'fill';
            holdRef.current = false;
            fillRef.current = 0;
            levelRef.current = 0;
            scoreRef.current = 0;
            comboRef.current = 0;
            failRef.current = 0;
            trayRef.current = [];
            animRef.current = null;
            flashRef.current = null;
            newBand();
            setGs('playing'); setScore(0); setCombo(0); setFails(0);
        };

        const nextDough = () => {
            if (failRef.current >= 3) {
                gsRef.current = 'over';
                phaseRef.current = 'idle';
                setGs('over');
                setBest((b) => Math.max(b, scoreRef.current));
                return;
            }
            levelRef.current += 1;
            fillRef.current = 0;
            phaseRef.current = 'fill';
            newBand();
        };

        const toTray = (q) => {
            const idx = trayRef.current.length;
            const tx = 60 + idx * 44;
            animRef.current = { t: 0, dur: 0.42, kind: 'settle', q, from: fillRef.current, tx };
            phaseRef.current = 'settle';
        };

        const release = () => {
            if (gsRef.current !== 'playing' || phaseRef.current !== 'fill') return;
            const b = bandRef.current;
            const t = fillRef.current;
            let q; let gain = 0; let txt; let bad = false;
            if (t < b.lo) {
                q = 'flat'; comboRef.current = 0; txt = '밍밍하다'; bad = true;
            } else {
                // 손을 떼는 순간의 미세한 되메움 — 상단 가장자리에서 놓으면 못난이로 밀린다.
                const finalT = t + 0.012 + Math.random() * 0.02;
                if (finalT <= b.hi) {
                    comboRef.current += 1;
                    if (Math.abs(finalT - b.center) <= b.inner) { q = 'perfect'; gain = 150; txt = '명품!'; }
                    else { q = 'good'; gain = 100; txt = '예쁘다'; }
                    gain += Math.min(comboRef.current, 12) * 12;
                } else {
                    q = 'lumpy'; gain = 25; comboRef.current = 0; txt = '못난이'; bad = true;
                }
            }
            scoreRef.current += gain;
            flashRef.current = { t: 0, dur: 0.6, txt, bad };
            setScore(scoreRef.current); setCombo(comboRef.current);
            toTray(q);
        };

        const burst = () => {
            failRef.current += 1;
            comboRef.current = 0;
            const parts = [];
            for (let i = 0; i < 26; i += 1) {
                const a = Math.random() * Math.PI * 2;
                const sp = 60 + Math.random() * 220;
                parts.push({ x: CX, y: CY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, r: 2 + Math.random() * 3 });
            }
            animRef.current = { t: 0, dur: 0.7, kind: 'burst', parts };
            flashRef.current = { t: 0, dur: 0.7, txt: '터졌다', bad: true };
            phaseRef.current = 'burst';
            setCombo(0); setFails(failRef.current);
        };

        // ── 그리기 프리미티브 ──
        const drawBlob = (x, y, r, wob, now, c) => {
            ctx.beginPath();
            for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 22) {
                const rr = r * (1 + wob * Math.sin(a * 3 + now * 0.003) + wob * 0.6 * Math.cos(a * 5 - now * 0.002));
                const px = x + Math.cos(a) * rr;
                const py = y + Math.sin(a) * rr;
                if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = c.dough;
            ctx.fill();
        };

        // 완성된 반달 송편(소반/날아가는 것 공용).
        const drawHalfmoon = (x, y, s, q, c) => {
            ctx.save();
            ctx.translate(x, y);
            const wob = q === 'lumpy' ? 0.14 : q === 'flat' ? 0.0 : 0.04;
            const flat = q === 'flat' ? 0.5 : 1;                 // 밍밍한 건 납작
            ctx.beginPath();
            const steps = 26;
            for (let i = 0; i <= steps; i += 1) {
                const a = Math.PI + (i / steps) * Math.PI;        // 위쪽 반원(왼→오)
                const rr = s * (1 + (q === 'lumpy' ? wob * Math.sin(a * 4 + x) : 0));
                ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * flat);
            }
            ctx.closePath();                                       // 바닥 평면으로 닫힘 = 반달
            ctx.fillStyle = c.dough;
            ctx.fill();
            // 크림프(오므린 자국) — 윗 능선을 따라 붉은 짧은 이.
            ctx.strokeStyle = c.fill;
            ctx.lineWidth = 1.4;
            ctx.globalAlpha = q === 'flat' ? 0.4 : 0.85;
            for (let i = 1; i < 7; i += 1) {
                const a = Math.PI + (i / 7) * Math.PI;
                const ex = Math.cos(a) * s;
                const ey = Math.sin(a) * s * flat;
                ctx.beginPath();
                ctx.moveTo(ex, ey);
                ctx.lineTo(ex * 0.86, ey * 0.86 - 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            if (q === 'perfect') {                                 // 명품엔 대추 한 점
                ctx.fillStyle = c.fill;
                ctx.beginPath();
                ctx.arc(0, -s * 0.45, s * 0.12, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        };

        const drawTray = (c) => {
            const ty = H - 46;
            ctx.fillStyle = c.wood;
            ctx.fillRect(0, ty, W, H - ty);
            ctx.strokeStyle = c.dim;
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(W, ty); ctx.stroke();
            ctx.globalAlpha = 1;
            const tray = trayRef.current;
            const startI = Math.max(0, tray.length - 15);
            for (let i = startI; i < tray.length; i += 1) {
                drawHalfmoon(60 + (i - startI) * 44, ty + 26, 15, tray[i].q, c);
            }
        };

        let last = 0;
        const draw = (now) => {
            const c = col();
            const dt = Math.min(0.05, (now - last) / 1000) || 0;
            last = now;

            // 작업대 배경 + 나뭇결.
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = c.board;
            ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = c.wood;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.6;
            for (let y = 34; y < H - 60; y += 30) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.bezierCurveTo(W * 0.3, y + 6, W * 0.6, y - 6, W, y + 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            const playing = gsRef.current === 'playing';
            const phase = phaseRef.current;

            // ── 게이지 링 ── (fill / settle 단계에서만)
            if (playing && phase === 'fill') {
                const b = bandRef.current;
                const t = fillRef.current;
                // 트랙
                ctx.lineCap = 'round';
                ctx.strokeStyle = c.dim;
                ctx.globalAlpha = 0.45;
                ctx.lineWidth = 9;
                ctx.beginPath(); ctx.arc(CX, CY, RING, angleAt(0), angleAt(1)); ctx.stroke();
                ctx.globalAlpha = 1;
                // 위험 구간(hi..1) — 붉게
                ctx.strokeStyle = c.fill;
                ctx.globalAlpha = 0.5;
                ctx.lineWidth = 9;
                ctx.beginPath(); ctx.arc(CX, CY, RING, angleAt(b.hi), angleAt(1)); ctx.stroke();
                ctx.globalAlpha = 1;
                // 좋은 구간 — 밝은 크림
                ctx.strokeStyle = c.dough;
                ctx.lineWidth = 11;
                ctx.beginPath(); ctx.arc(CX, CY, RING, angleAt(b.lo), angleAt(b.hi)); ctx.stroke();
                // 현재 채움
                const inDanger = t > b.hi;
                ctx.strokeStyle = inDanger ? c.fill : c.dough;
                ctx.lineWidth = 6;
                ctx.beginPath(); ctx.arc(CX, CY, RING, angleAt(0), angleAt(Math.max(0.001, t))); ctx.stroke();
                // 현재 위치 눈금
                const pa = angleAt(t);
                const px = CX + Math.cos(pa) * RING;
                const py = CY + Math.sin(pa) * RING;
                ctx.fillStyle = inDanger ? c.fill : c.dough;
                ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();

                // ── 반죽 블롭 ──
                const rr = R0 * (0.8 + 0.62 * t);
                drawBlob(CX, CY, rr, 0.03, now, c);
                // 소가 차오름(붉은 코어가 비쳐 보임)
                ctx.fillStyle = c.fill;
                ctx.globalAlpha = 0.55;
                ctx.beginPath(); ctx.ellipse(CX, CY + 2, rr * 0.6 * t, rr * 0.42 * t, 0, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
                // 위험 구간 균열
                if (inDanger) {
                    const dg = clamp((t - b.hi) / Math.max(0.001, 1 - b.hi), 0, 1);
                    ctx.strokeStyle = c.fill;
                    ctx.globalAlpha = 0.4 + dg * 0.5;
                    ctx.lineWidth = 1 + dg * 1.6;
                    for (let k = 0; k < 4; k += 1) {
                        const a0 = k * 1.7 + 0.4;
                        ctx.beginPath();
                        ctx.moveTo(CX + Math.cos(a0) * rr * 0.2, CY + Math.sin(a0) * rr * 0.2);
                        ctx.lineTo(CX + Math.cos(a0) * rr * (0.75 + dg * 0.2), CY + Math.sin(a0) * rr * (0.75 + dg * 0.2));
                        ctx.stroke();
                    }
                    ctx.globalAlpha = 1;
                }

                // 채움 진행
                if (holdRef.current) {
                    fillRef.current += b.rate * dt;
                    if (fillRef.current >= 1) { fillRef.current = 1; burst(); }
                }
            }

            // ── settle: 완성된 반달이 소반으로 날아감 ──
            if (playing && phase === 'settle' && animRef.current) {
                const an = animRef.current;
                an.t += dt;
                const p = clamp(an.t / an.dur, 0, 1);
                const ease = 1 - Math.pow(1 - p, 3);
                const x = CX + (an.tx - CX) * ease;
                const y = CY + (H - 46 + 26 - CY) * ease;
                const s = 40 - 25 * ease;
                drawHalfmoon(x, y, s, an.q, c);
                if (p >= 1) {
                    trayRef.current.push({ q: an.q });
                    animRef.current = null;
                    nextDough();
                }
            }

            // ── burst: 붉은 소가 튄다 ──
            if (playing && phase === 'burst' && animRef.current) {
                const an = animRef.current;
                an.t += dt;
                const p = clamp(an.t / an.dur, 0, 1);
                // 찢어진 반죽 잔해
                drawBlob(CX, CY, R0 * (1.1 - 0.5 * p), 0.14, now, c);
                ctx.fillStyle = c.fill;
                for (let i = 0; i < an.parts.length; i += 1) {
                    const pt = an.parts[i];
                    pt.vy += 520 * dt;
                    pt.x += pt.vx * dt;
                    pt.y += pt.vy * dt;
                    ctx.globalAlpha = 1 - p;
                    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
                if (p >= 1) { animRef.current = null; nextDough(); }
            }

            drawTray(c);

            // ── 떠오르는 결과 글자 ──
            if (flashRef.current) {
                const f = flashRef.current;
                f.t += dt;
                const p = clamp(f.t / f.dur, 0, 1);
                ctx.globalAlpha = 1 - p;
                ctx.fillStyle = f.bad ? c.fill : c.dough;
                ctx.font = '800 30px "Noto Sans KR", system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(f.txt, CX, CY - 66 - p * 24);
                ctx.textAlign = 'left';
                ctx.globalAlpha = 1;
                if (p >= 1) flashRef.current = null;
            }

            raf = window.requestAnimationFrame(draw);
        };
        let raf = window.requestAnimationFrame(draw);

        // ── 입력 ──
        const press = () => {
            if (gsRef.current === 'idle' || gsRef.current === 'over') { startGame(); return; }
            if (gsRef.current === 'playing' && phaseRef.current === 'fill') holdRef.current = true;
        };
        const lift = () => {
            if (holdRef.current) { holdRef.current = false; release(); } else holdRef.current = false;
        };
        const onDown = (e) => { e.preventDefault(); press(); };
        const onUp = (e) => { e.preventDefault(); lift(); };
        const onKeyDown = (e) => {
            if (e.code !== 'Space' && e.key !== ' ') return;
            e.preventDefault();
            if (pressRef.current) return;
            pressRef.current = true;
            press();
        };
        const onKeyUp = (e) => {
            if (e.code !== 'Space' && e.key !== ' ') return;
            e.preventDefault();
            pressRef.current = false;
            lift();
        };

        canvas.addEventListener('pointerdown', onDown);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        const themeObs = new MutationObserver(() => { dark = isDark(); });
        const labOs = document.querySelector('.lab-os');
        if (labOs) themeObs.observe(labOs, { attributes: true, attributeFilter: ['data-theme'] });

        return () => {
            window.cancelAnimationFrame(raf);
            canvas.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            themeObs.disconnect();
        };
    }, []);

    return (
        <LabShell
            title="송편"
            eyebrow="fold the half-moon"
            subtitle={'// 소를 얼마나 넣느냐가 전부다 — 터지기 직전에 손을 떼어 반달을 빚고 명절 소반을 채운다'}
            path="songpyeon"
        >
            <section className="sp-wrap" aria-label="송편 빚기">
                <div className="sp-readout" aria-live="polite">
                    <span className="sp-score">{score}</span>
                    <span className="sp-combo k-mono">{combo > 1 ? `연속 ${combo}` : ' '}</span>
                    <span className="sp-fails k-mono" aria-label={`남은 기회, 터진 송편 ${fails}개`}>
                        {[0, 1, 2].map((i) => (
                            <span key={i} className={`sp-dot${i < fails ? ' burst' : ''}`} />
                        ))}
                    </span>
                </div>

                <div className="sp-stage">
                    <canvas ref={canvasRef} className="sp-canvas" aria-label="반죽과 소반" />
                    {gs !== 'playing' && (
                        <div className="sp-overlay">
                            {gs === 'idle' ? (
                                <>
                                    <p className="sp-ov-title">송편 빚기</p>
                                    <p className="sp-ov-sub">누르고 있으면 소가 차오른다.<br />밝은 구간에서 손을 떼면 예쁜 반달.</p>
                                    <button type="button" className="sp-btn" onClick={() => canvasRef.current?.dispatchEvent(new Event('pointerdown'))}>
                                        빚기 시작
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="sp-ov-title">소반이 찼다</p>
                                    <p className="sp-ov-sub">이번 점수 <b>{score}</b>{best > score ? <> · 최고 {best}</> : null}</p>
                                    <button type="button" className="sp-btn" onClick={() => canvasRef.current?.dispatchEvent(new Event('pointerdown'))}>
                                        다시 빚기
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <p className="sp-hint k-mono">누르고 있기 = 소 채우기 · 떼기 = 오므리기 (마우스/터치 또는 Space) · 링을 꽉 채우면 터진다</p>

                <ReadBlock />
            </section>
        </LabShell>
    );
};

// 본문 — 왜 송편인가, 소의 양이 왜 전부인가.
const ReadBlock = () => (
    <section className="sp-read">
        <h3>소를 얼마나 넣느냐가 전부다</h3>
        <p>
            추석이 코앞이다. 명절의 여러 세시 중에서도 <b>송편 빚기</b>는 온 식구가 상 하나에 둘러앉아
            손으로 하는 몇 안 남은 일이다. 반죽을 떼어 우물을 파고 소를 넣고 오므려 반달로 접는다.
            이 단순한 동작에서 사람마다 결과가 갈리는 이유는 딱 하나 — <b>소의 양</b>이다.
        </p>
        <p>
            소가 적으면 심심하고 납작한 밍밍이가 되고, 지나치면 오므릴 때 <b>터져</b> 버린다. 예쁜 반달은
            그 사이의 좁은 구간, &lsquo;터지기 직전까지&rsquo;에서만 나온다. 손이 익은 사람은 반죽의
            팽팽함으로 그 순간을 안다. 이 게임은 그 감각을 게이지로 옮겼다 — 밝은 구간에서 손을 떼면
            예쁜 송편, 붉은 구간까지 밀면 못난이, 링을 꽉 채우면 터진다.
        </p>
        <p>
            판이 넘어갈수록 소는 더 빨리 차오르고 좋은 구간은 좁아지며 자리를 옮긴다. 그래서 눈이 아니라
            손끝으로 &lsquo;조금 일찍&rsquo; 떼는 버릇을 들여야 한다 — 손을 떼는 순간에도 소가 아주 조금
            더 밀려 들어가기 때문이다. 세 번 터지면 소반을 물린다.
        </p>
        <p className="sp-disc">
            * 반죽·소·소반의 반달은 전부 캔버스에 직접 그렸다. 쓰인 색은 나무 작업대·쌀반죽·팥소 세 가지뿐이다.
        </p>
    </section>
);

export default Songpyeon;
