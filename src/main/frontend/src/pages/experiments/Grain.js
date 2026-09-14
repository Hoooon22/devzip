import React, { useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Grain.css';

// GRAIN — 쌀 한 톨과 1조 톨 사이 (감이 안 오는 숫자 × 만질 수 있는 데이터 × rAF 물리 × 스크롤 없이 한 화면).
//   소재: "백만 톨", "1조 톨"은 숫자로는 감이 안 온다. 그 수를 실제 낟알 더미의 부피로 쌓아 눈으로 잰다.
//   형식: 만질 수 있는 데이터 — 큰 다이얼을 손으로 굴리면(회전) 톨 수가 1 → 1조까지 오른다.
//   기술: rAF 물리 — 실제 쌀 한 톨 부피에서 안식각 원뿔의 참높이를 역산하고, 그 높이를 스프링으로
//         따라가게 하며, 호퍼에서 쏟아진 낟알이 중력으로 떨어져 원뿔 비탈에 부딪혀(충돌) 미끄러진다.
//   제약: 스크롤 없이 한 화면 — 무대·다이얼·판독이 한 화면에 든다. 더미가 커지면 화면이 줄며(zoom)
//         옆의 사람·집·나무가 함께 축소돼 "백만 톨은 겨우 무릎 아래, 1조 톨은 건물만"을 체감한다.
//
//   도전: 이미지도 데이터도 없이 하나의 실측(쌀 한 톨의 쌓인 부피 ≈ 0.03 cm³)에서 시작해,
//         원뿔 부피 공식으로 참높이를 구하고, 그 높이에 맞춰 세계 배율(px/m)을 연속으로 줄여
//         실척 실루엣들이 자연스럽게 작아지게 만들 수 있느냐 — 그리고 그 위로 떨어지는 낟알이
//         비탈을 타고 흘러내리는 물리를, 한 화면 밖으로 넘치지 않게 얹을 수 있느냐.

const W = 760;
const H = 470;
const EXP_MAX = 12;                 // 10^12 = 1조 톨
const SWEEP = (135 * Math.PI) / 180; // 다이얼 반각(270° 게이지)

// 쌀 한 톨이 "쌓였을 때(공극 포함)" 차지하는 부피 ≈ 0.03 cm³ = 3e-8 m³.
const GRAIN_M3 = 3e-8;
const REPOSE = (34 * Math.PI) / 180;         // 안식각 ~34°
const TAN_R = Math.tan(REPOSE);              // ~0.6745
const CONE_K = Math.PI / (3 * TAN_R * TAN_R); // V = CONE_K · h³  (원뿔, r = h/tanθ)
const heightForCount = (n) => Math.cbrt((n * GRAIN_M3) / CONE_K); // 참높이(m)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// 실척 참조물(이름, 실제 높이 m) — 더미 크기에 맞춰 옆에 세운다.
const REFS = [
    { name: '쌀 한 톨', m: 0.006, kind: 'grain' },
    { name: '동전', m: 0.024, kind: 'coin' },
    { name: '커피잔', m: 0.095, kind: 'cup' },
    { name: '사람', m: 1.7, kind: 'person' },
    { name: '2층 집', m: 6.5, kind: 'house' },
    { name: '큰 나무', m: 22, kind: 'tree' },
    { name: '송전탑', m: 55, kind: 'tower' },
];

// 톨 수 → 큰 자릿수 한글 낱말(현재 자릿수 근사).
const MAG_WORDS = ['한', '열', '백', '천', '만', '십만', '백만', '천만', '억', '십억', '백억', '천억', '조'];
const magWord = (exp) => `${MAG_WORDS[clamp(Math.round(exp), 0, 12)]} 톨`;

// 더미 높이(m) → 손에 잡히는 크기 표현.
const heightWord = (h) => {
    if (h < 0.02) return '쌀 한 톨 크기';
    if (h < 0.1) return '한 줌';
    if (h < 0.35) return '무릎 아래';
    if (h < 0.9) return '허리 높이';
    if (h < 2.2) return '키를 넘본다';
    const r = h / 1.7;
    return `사람 키의 ${r < 20 ? r.toFixed(1) : Math.round(r)}배`;
};

// 부피(m³) → 리터/㎥ 표현.
const volWord = (v) => {
    const L = v * 1000;
    if (L < 1) return `${(L * 1000).toFixed(0)} mL`;
    if (L < 1000) return `${L < 10 ? L.toFixed(1) : Math.round(L)} L`;
    return `${v < 100 ? v.toFixed(1) : Math.round(v)} m³`;
};

// 자릿수 구간별 "감이 안 온다"의 반전 한 줄.
const caption = (exp) => {
    if (exp < 4) return '여기까진 눈에 잡힌다';
    if (exp < 6) return '한 컵과 한 됫박 사이';
    if (exp < 7) return '백만 톨 — 큰 대야 하나 남짓, 생각보다 작다';
    if (exp < 9) return '자루가 쌓이기 시작한다';
    if (exp < 10) return '십억 톨 — 드디어 당신을 덮는다';
    if (exp < 12) return '집을 삼키는 무더기';
    return '일조 톨 — 아파트 높이의 낟알 산';
};

const Grain = () => {
    const canvasRef = useRef(null);
    const knobRef = useRef(null);
    const expRef = useRef(4);          // 캔버스가 읽는 권위값(지수)
    const dragRef = useRef(false);
    const [exp, setExp] = useState(4); // 판독/다이얼 회전용

    // 다이얼 각도 ↔ 지수 매핑.
    const angleFromExp = (e) => (e / EXP_MAX) * 2 * SWEEP - SWEEP; // -SWEEP..+SWEEP (위=중간)
    const applyPointer = (clientX, clientY) => {
        const el = knobRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const a = Math.atan2(clientX - cx, -(clientY - cy)); // 위=0, 시계방향 +
        const e = clamp((a + SWEEP) / (2 * SWEEP), 0, 1) * EXP_MAX;
        expRef.current = e;
        setExp(e);
    };
    const onKnobDown = (e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        dragRef.current = true;
        applyPointer(e.clientX, e.clientY);
    };
    const onKnobMove = (e) => { if (dragRef.current) applyPointer(e.clientX, e.clientY); };
    const onKnobUp = (e) => {
        dragRef.current = false;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
    };
    const onKnobKey = (e) => {
        let d = 0;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') d = 0.25;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') d = -0.25;
        else if (e.key === 'Home') { expRef.current = 0; setExp(0); e.preventDefault(); return; }
        else if (e.key === 'End') { expRef.current = EXP_MAX; setExp(EXP_MAX); e.preventDefault(); return; }
        if (d !== 0) {
            const ne = clamp(expRef.current + d, 0, EXP_MAX);
            expRef.current = ne; setExp(ne); e.preventDefault();
        }
    };

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
            ? {
                paper: '#191510', ink: '#ece2cc', soft: 'rgba(236,226,204,0.55)',
                gTop: '#e8c069', gBot: '#a9762a', gLine: '#5f4419',
                ref: '#8a7d63', accent: '#e5674c', ruler: 'rgba(236,226,204,0.13)',
            }
            : {
                paper: '#efe7d6', ink: '#2c2417', soft: 'rgba(44,36,23,0.5)',
                gTop: '#e8bd5f', gBot: '#b9852f', gLine: '#8a5f1e',
                ref: '#9a8d70', accent: '#c1432c', ruler: 'rgba(44,36,23,0.14)',
            });

        const groundY = H - 42;
        const coneCx = W * 0.40;

        // 낟알 입자 풀(장식 — 중력·충돌·미끄러짐). 원뿔 크기는 다이얼이 정한다.
        const N = 96;
        const grains = new Array(N);
        const spawn = (g) => {
            g.x = coneCx + (Math.random() - 0.5) * 26;
            g.y = 20 + Math.random() * 26;
            g.vx = (Math.random() - 0.5) * 14;
            g.vy = 30 + Math.random() * 40;
            g.rest = false;
            g.life = 0;
        };
        for (let i = 0; i < N; i += 1) { grains[i] = {}; spawn(grains[i]); grains[i].y = Math.random() * groundY; }

        const G = { hdisp: heightForCount(Math.pow(10, expRef.current)), last: 0 };

        // 현재 표시 높이(m)로부터 세계 배율. 사람이 항상 보이도록 최소 시야 2.4m 확보.
        const scaleFor = (hm) => {
            const visM = Math.max(hm * 1.7, 2.4);
            return (groundY - 24) / visM; // px per meter
        };

        const drawSilhouette = (kind, x, hp, c) => {
            ctx.save();
            ctx.strokeStyle = c;
            ctx.fillStyle = c;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            const lw = Math.max(1.1, hp * 0.05);
            ctx.lineWidth = lw;
            if (kind === 'person') {
                const r = hp * 0.1;
                ctx.beginPath(); ctx.arc(x, groundY - hp + r, r, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(x, groundY - hp + 2 * r); ctx.lineTo(x, groundY - hp * 0.4); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x - hp * 0.15, groundY - hp * 0.66); ctx.lineTo(x + hp * 0.15, groundY - hp * 0.66); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x, groundY - hp * 0.4); ctx.lineTo(x - hp * 0.12, groundY);
                ctx.moveTo(x, groundY - hp * 0.4); ctx.lineTo(x + hp * 0.12, groundY); ctx.stroke();
            } else if (kind === 'house') {
                const w = hp * 0.82;
                ctx.beginPath();
                ctx.rect(x - w / 2, groundY - hp * 0.6, w, hp * 0.6); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x - w / 2 - hp * 0.06, groundY - hp * 0.6);
                ctx.lineTo(x, groundY - hp); ctx.lineTo(x + w / 2 + hp * 0.06, groundY - hp * 0.6);
                ctx.closePath(); ctx.stroke();
            } else if (kind === 'tree') {
                ctx.beginPath();
                ctx.moveTo(x, groundY); ctx.lineTo(x, groundY - hp * 0.5); ctx.stroke();
                ctx.beginPath();
                ctx.arc(x, groundY - hp * 0.66, hp * 0.34, 0, Math.PI * 2); ctx.stroke();
            } else if (kind === 'tower') {
                const w = hp * 0.4;
                ctx.beginPath();
                ctx.moveTo(x - w / 2, groundY); ctx.lineTo(x - w * 0.12, groundY - hp);
                ctx.lineTo(x + w * 0.12, groundY - hp); ctx.lineTo(x + w / 2, groundY);
                ctx.stroke();
                for (let k = 1; k <= 4; k += 1) {
                    const ty = groundY - (hp * k) / 5;
                    const hw = (w / 2) * (1 - k / 6);
                    ctx.beginPath(); ctx.moveTo(x - hw, ty); ctx.lineTo(x + hw, ty); ctx.stroke();
                }
            } else if (kind === 'cup') {
                const w = hp * 0.9;
                ctx.beginPath();
                ctx.moveTo(x - w / 2, groundY - hp); ctx.lineTo(x - w * 0.35, groundY);
                ctx.lineTo(x + w * 0.35, groundY); ctx.lineTo(x + w / 2, groundY - hp);
                ctx.stroke();
            } else { // coin / grain — 작은 점/타원
                ctx.beginPath();
                if (kind === 'grain') ctx.ellipse(x, groundY - hp / 2, Math.max(1.2, hp * 0.4), Math.max(2, hp * 0.6), 0, 0, Math.PI * 2);
                else ctx.arc(x, groundY - hp / 2, Math.max(2, hp / 2), 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        };

        const refLabel = (name, extra, x, topY, c) => {
            ctx.fillStyle = c;
            ctx.font = '600 11px ui-monospace, Menlo, Consolas, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(name, x, Math.max(14, topY - 8));
            if (extra) {
                ctx.font = '500 9.5px ui-monospace, Menlo, Consolas, monospace';
                ctx.fillText(extra, x, Math.max(24, topY - 8) + 11);
            }
            ctx.textAlign = 'left';
        };

        const draw = (now) => {
            const c = col();
            const exponent = expRef.current;
            const count = Math.pow(10, exponent);
            const hTarget = heightForCount(count);
            // 스프링으로 표시 높이가 목표를 따라간다(로그 공간에서 부드럽게).
            const lt = Math.log(Math.max(hTarget, 1e-4));
            let ld = Math.log(Math.max(G.hdisp, 1e-4));
            ld += (lt - ld) * 0.14;
            G.hdisp = Math.exp(ld);

            const ws = scaleFor(G.hdisp);        // px/m
            const conePx = G.hdisp * ws;         // 원뿔 화면 높이
            const baseHalf = conePx / TAN_R;     // 원뿔 밑변 반폭

            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = c.paper;
            ctx.fillRect(0, 0, W, H);

            // 세로 미터 눈금(연속 재배율).
            const unit = Math.pow(10, Math.round(Math.log10((groundY - 24) / ws / 3)));
            ctx.strokeStyle = c.ruler;
            ctx.fillStyle = c.soft;
            ctx.lineWidth = 1;
            ctx.font = '500 10px ui-monospace, Menlo, Consolas, monospace';
            ctx.textAlign = 'left';
            for (let k = 1; k <= 6; k += 1) {
                const y = groundY - k * unit * ws;
                if (y < 12) break;
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
                const lab = unit * k >= 1 ? `${unit * k} m` : `${(unit * k * 100).toFixed(0)} cm`;
                ctx.fillText(lab, 6, y - 3);
            }

            // 바닥선.
            ctx.strokeStyle = c.gLine;
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
            ctx.globalAlpha = 1;

            // 실척 참조물 — 사람(항상 시도) + 더미 크기에 가장 가까운 참조물 하나.
            const personPx = 1.7 * ws;
            if (personPx >= 6) {
                drawSilhouette('person', W * 0.66, personPx, c.ref);
                refLabel('사람', '1.7 m', W * 0.66, groundY - personPx, c.soft);
            } else {
                // 사람이 점이 될 만큼 작아짐 — 반전의 순간.
                drawSilhouette('person', W * 0.66, Math.max(3, personPx), c.accent);
                refLabel('사람', '여기 (거의 안 보임)', W * 0.66, groundY - 6, c.accent);
            }
            // 크기 짝 참조물(로그상 더미 높이에 가장 가까운 것, 사람 제외).
            let twin = null;
            let best = 1e9;
            for (let i = 0; i < REFS.length; i += 1) {
                const rf = REFS[i];
                if (rf.kind === 'person') continue;
                const px = rf.m * ws;
                if (px < 7 || px > (groundY - 20)) continue;
                const d = Math.abs(Math.log(rf.m) - Math.log(G.hdisp));
                if (d < best) { best = d; twin = rf; }
            }
            if (twin) {
                const px = twin.m * ws;
                drawSilhouette(twin.kind, W * 0.85, px, c.ref);
                const em = twin.m >= 1 ? `${twin.m} m` : `${(twin.m * 100).toFixed(twin.m < 0.1 ? 1 : 0)} cm`;
                refLabel(twin.name, em, W * 0.85, groundY - px, c.soft);
            }

            // ── 낟알 더미(원뿔) — 참높이에서 나온 실제 부피. ──
            const apexY = groundY - conePx;
            const grad = ctx.createLinearGradient(0, apexY, 0, groundY);
            grad.addColorStop(0, c.gTop);
            grad.addColorStop(1, c.gBot);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(coneCx - baseHalf, groundY);
            ctx.lineTo(coneCx, apexY);
            ctx.lineTo(coneCx + baseHalf, groundY);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = c.gLine;
            ctx.globalAlpha = 0.7;
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.globalAlpha = 1;
            // 표면 결(옅은 낟알 얼룩).
            ctx.fillStyle = c.gLine;
            ctx.globalAlpha = 0.16;
            for (let i = 0; i < 46; i += 1) {
                const t = (i * 2654435761 % 1000) / 1000;
                const s = ((i * 40503) % 1000) / 1000;
                const yy = apexY + s * conePx;
                const half = baseHalf * (s);
                const xx = coneCx + (t - 0.5) * 2 * half;
                ctx.fillRect(xx, yy, 1.6, 1.6);
            }
            ctx.globalAlpha = 1;

            // ── 떨어지는 낟알(중력·충돌·미끄러짐). ──
            const dt = Math.min(0.05, (now - G.last) / 1000) || 0;
            G.last = now;
            const surfaceY = (x) => {
                const d = Math.abs(x - coneCx);
                if (d >= baseHalf) return groundY;
                return groundY - (conePx) * (1 - d / baseHalf);
            };
            ctx.fillStyle = c.gTop;
            for (let i = 0; i < N; i += 1) {
                const g = grains[i];
                g.vy += 520 * dt;
                g.x += g.vx * dt;
                g.y += g.vy * dt;
                g.life += dt;
                const sy = surfaceY(g.x);
                if (g.y >= sy) {
                    g.y = sy;
                    if (g.vy > 20 && sy < groundY) {
                        // 비탈에 부딪혀 튕기고 아래로 미끄러진다.
                        g.vy *= -0.28;
                        g.vx += (g.x < coneCx ? -1 : 1) * (34 + Math.random() * 26);
                    } else {
                        g.vy = 0;
                        g.vx *= 0.7;
                    }
                }
                if (g.life > 2.6 || g.y > groundY + 4 || g.x < -20 || g.x > W + 20) spawn(g);
                ctx.fillRect(g.x - 1, g.y - 1.6, 2, 2.4);
            }

            raf = window.requestAnimationFrame(draw);
        };
        let raf = window.requestAnimationFrame(draw);

        const themeObs = new MutationObserver(() => { dark = isDark(); });
        const labOs = document.querySelector('.lab-os');
        if (labOs) themeObs.observe(labOs, { attributes: true, attributeFilter: ['data-theme'] });

        return () => {
            window.cancelAnimationFrame(raf);
            themeObs.disconnect();
        };
    }, []);

    // ── 판독값(React) ──
    const count = Math.pow(10, exp);
    const digits = Math.round(count).toLocaleString('en-US');
    const hm = heightForCount(count);
    const vol = count * GRAIN_M3;
    const knobDeg = (angleFromExp(exp) * 180) / Math.PI;

    return (
        <LabShell
            title="GRAIN"
            eyebrow="how big is a big number, really"
            subtitle={'// 쌀 한 톨부터 1조 톨까지 — 다이얼을 굴려 낟알 더미의 실제 부피로 큰 수를 눈으로 잰다'}
            path="grain"
        >
            <section className="grain-wrap" aria-label="큰 수를 낟알 더미로 재기">
                <div className="grain-readout" aria-live="polite">
                    <span className="grain-mag">{magWord(exp)}</span>
                    <span className="grain-digits k-mono">{digits} 톨</span>
                    <span className="grain-meta k-mono">
                        더미 높이 {hm < 1 ? `${(hm * 100).toFixed(hm < 0.1 ? 1 : 0)} cm` : `${hm.toFixed(hm < 20 ? 1 : 0)} m`}
                        {' · '}{heightWord(hm)}{' · '}부피 {volWord(vol)}
                    </span>
                </div>

                <div className="grain-stage">
                    <canvas ref={canvasRef} className="grain-canvas" aria-label="낟알 더미와 실척 참조물" />
                    <p className="grain-caption">{caption(exp)}</p>
                </div>

                <div className="grain-dialbar">
                    <div
                        ref={knobRef}
                        className="grain-knob"
                        role="slider"
                        tabIndex={0}
                        aria-label="톨 수 다이얼"
                        aria-valuemin={0}
                        aria-valuemax={EXP_MAX}
                        aria-valuenow={Number(exp.toFixed(1))}
                        aria-valuetext={magWord(exp)}
                        onPointerDown={onKnobDown}
                        onPointerMove={onKnobMove}
                        onPointerUp={onKnobUp}
                        onPointerCancel={onKnobUp}
                        onKeyDown={onKnobKey}
                    >
                        <span className="grain-knob-face">
                            <span className="grain-knob-ind" style={{ transform: `rotate(${knobDeg}deg)` }} />
                        </span>
                        <span className="grain-tick t0">한 톨</span>
                        <span className="grain-tick t1">만</span>
                        <span className="grain-tick t2">억</span>
                        <span className="grain-tick t3">조</span>
                    </div>
                    <p className="grain-dialhint k-mono">다이얼을 잡고 좌우로 돌린다 · ← → 미세조정</p>
                </div>

                <ReadBlock />
            </section>
        </LabShell>
    );
};

// 본문 — 왜 큰 수는 감이 안 오는가, 이 더미는 어떻게 참인가.
const ReadBlock = () => (
    <section className="grain-read">
        <h3>백만 톨은 왜 생각보다 작은가</h3>
        <p>
            우리는 &lsquo;백만&rsquo;과 &lsquo;십억&rsquo;을 자릿수 차이로만 안다. 세 자리 더 붙었으니
            천 배쯤 크겠거니 하지만, 그 천 배가 몸에 닿는 부피로는 얼마인지 감이 오지 않는다. 그래서
            수를 <b>실제 낟알 더미의 부피</b>로 바꿔 세워 봤다. 쌀 한 톨이 쌓였을 때 차지하는 부피를
            약 <b>0.03 cm³</b>로 잡고, 톨 수에 곱하면 그 수의 진짜 부피가 나온다.
        </p>
        <p>
            그 부피를 낟알이 저절로 이루는 모양 — <b>안식각(약 34°)의 원뿔</b>로 쌓으면 높이가
            정해진다. 원뿔 부피는 높이의 세제곱에 비례하므로(V ∝ h³), 수가 천 배 커져도 더미 높이는
            <b> 열 배</b>밖에 안 자란다. 백만 톨은 <b>무릎 아래(약 24 cm)</b>, 십억 톨이라야 겨우
            사람 키를 넘고, 일조 톨이 되어서야 <b>아파트 높이</b>의 산이 된다. &lsquo;백만&rsquo;이
            뭔가 어마어마할 것 같았다면, 그건 우리가 자릿수를 부피로 환산하지 못하기 때문이다.
        </p>
        <p>
            그래서 더미가 커지면 <b>화면이 함께 줄어든다</b>. 옆에 선 사람·집·나무·송전탑은 모두
            실제 크기 그대로라, 배율이 줄면 사람이 점이 되고 낟알 산이 화면을 덮는다. 이 축소가
            없으면 1조 톨은 그릴 수조차 없다 — 감이 안 온다는 건, 눈에 담기지 않는다는 말이기도 하다.
        </p>
        <p className="grain-disc">
            * 다이얼을 돌리면 목표 높이가 정해지고, 표시 높이가 <b>스프링</b>으로 그 값을 좇는다.
            위에서 쏟아지는 낟알은 중력으로 떨어져 원뿔 비탈에 부딪혀 미끄러지는 <b>장식</b>이고,
            더미의 크기 자체는 오직 톨 수(부피)에서 나온다. 한 톨 부피는 품종·건조·다짐에 따라
            달라지는 어림값이다.
        </p>
    </section>
);

export default Grain;
