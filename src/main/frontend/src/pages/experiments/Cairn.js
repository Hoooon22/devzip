import React, { useEffect, useRef, useState, useCallback } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Cairn.css';

// CAIRN — 등고선 지형 종주 (공간과 지도 × 시간 챌린지 × 실제 경과시간 × 마우스 없이 키보드만).
//   소재: 오리엔티어링 — 지도의 등고선을 읽어 돌탑(control)을 시간 안에 순서대로 찍는 경기.
//   형식: 시간 챌린지 — 30초 카운트다운이 압박한다. 시간이 다하면 찍은 돌탑 수가 점수다.
//   기술: 실제 경과시간 — performance.now()의 dt로 카운트다운과 이동을 적분한다.
//         모든 움직임은 프레임 수가 아니라 '실제로 흐른 시간'에 비례한다.
//   제약: 마우스 없이 키보드만 — ← → ↑ ↓ (또는 WASD)로 달리고 Space로 다시 시작한다.
//
//   도전: 물리 엔진·이미지 없이, 가우시안 언덕들을 더한 높이장(scalar field)에서
//         화면폭이 일정한 등고선을 픽셀 단위로 직접 그린다(가파를수록 선이 촘촘). 그리고
//         달리는 사람의 속도를 그 지점의 경사(등고선 밀도)에 반비례시켜, "언덕을 넘을까
//         돌아갈까"라는 오리엔티어링의 경로 선택을 손끝으로 느끼게 한다.

const W = 680;
const H = 440;
const PAD = 26;
const DURATION = 30000;      // ms — 오늘의 제한 시간
const BASE_SPEED = 235;      // px/s (평지)
const SLOPE_K = 3.4;         // 경사가 속도를 깎는 강도
const ACCEL = 12;            // 방향 전환 반응(1/s)
const TOUCH_R = 17;          // 돌탑에 닿는 반경
const BANDS = 11;            // 등고선 밴드 수
const IDX_EVERY = 4;         // 굵은 지표 등고선 주기

// ── 지형: 가우시안 언덕들을 더한 높이장. 같은 페이지 로드 안에서 고정. ──
const makeField = () => {
    const n = 5 + Math.floor(Math.random() * 3); // 5~7개 언덕
    const hills = [];
    for (let i = 0; i < n; i += 1) {
        hills.push({
            cx: PAD + Math.random() * (W - 2 * PAD),
            cy: PAD + Math.random() * (H - 2 * PAD),
            amp: (Math.random() < 0.35 ? -1 : 1) * (0.5 + Math.random()), // 분지도 섞는다
            sig: 55 + Math.random() * 85,
        });
    }
    const raw = (x, y) => {
        let s = 0;
        for (let i = 0; i < hills.length; i += 1) {
            const h = hills[i];
            const dx = x - h.cx;
            const dy = y - h.cy;
            s += h.amp * Math.exp(-(dx * dx + dy * dy) / (2 * h.sig * h.sig));
        }
        return s;
    };
    return { raw };
};

// 높이장 → 오프스크린 등고선 지도. 한 번만 그려 매 프레임 blit 한다.
const renderTerrain = (field, dark) => {
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const c = off.getContext('2d');
    const img = c.createImageData(W, H);
    const data = img.data;

    // 1) 높이값을 채우고 min/max 를 구한다.
    const hgt = new Float32Array(W * H);
    let lo = Infinity;
    let hi = -Infinity;
    for (let y = 0; y < H; y += 1) {
        for (let x = 0; x < W; x += 1) {
            const v = field.raw(x, y);
            hgt[y * W + x] = v;
            if (v < lo) lo = v;
            if (v > hi) hi = v;
        }
    }
    const span = hi - lo || 1;
    const L = 1 / BANDS; // 밴드 간격(정규화 높이)

    // 색 — 지형도 톤. 다크/라이트 각각.
    const paper = dark ? [22, 21, 14] : [233, 223, 199];
    const paperHi = dark ? [40, 36, 22] : [214, 199, 164]; // 고지대 음영
    const line = dark ? [163, 138, 92] : [154, 123, 79];
    const idxLine = dark ? [201, 174, 118] : [122, 92, 52];

    const mix = (a, b, t) => a + (b - a) * t;

    for (let y = 0; y < H; y += 1) {
        for (let x = 0; x < W; x += 1) {
            const i = y * W + x;
            const hn = (hgt[i] - lo) / span; // 0..1

            // 고도 음영(은은하게)
            let r = mix(paper[0], paperHi[0], hn);
            let g = mix(paper[1], paperHi[1], hn);
            let b = mix(paper[2], paperHi[2], hn);

            // 경사(정규화 높이의 화면당 기울기)
            const xr = Math.min(x + 1, W - 1);
            const xl = Math.max(x - 1, 0);
            const yd = Math.min(y + 1, H - 1);
            const yu = Math.max(y - 1, 0);
            const gx = (hgt[y * W + xr] - hgt[y * W + xl]) / (2 * span);
            const gy = (hgt[yd * W + x] - hgt[yu * W + x]) / (2 * span);
            const grad = Math.hypot(gx, gy) || 1e-6;

            // 가장 가까운 등고선까지의 화면 거리 → 폭이 일정한 선.
            const f = hn / L;
            const frac = f - Math.floor(f);
            const distH = Math.min(frac, 1 - frac) * L; // 높이 단위 거리
            const screenDist = distH / grad;            // 픽셀 단위 거리
            const isIdx = Math.round(f) % IDX_EVERY === 0;
            const width = isIdx ? 1.7 : 1.0;
            const ink = screenDist < width ? Math.min(1, 1 - screenDist / width + 0.15) : 0;

            if (ink > 0) {
                const lc = isIdx ? idxLine : line;
                r = mix(r, lc[0], ink);
                g = mix(g, lc[1], ink);
                b = mix(b, lc[2], ink);
            }

            const p = i * 4;
            data[p] = r;
            data[p + 1] = g;
            data[p + 2] = b;
            data[p + 3] = 255;
        }
    }
    c.putImageData(img, 0, 0);
    return off;
};

const grade = (n) => {
    if (n >= 12) return '지형을 읽는 발';
    if (n >= 9) return '길을 아는 다리';
    if (n >= 6) return '그럭저럭 종주';
    if (n >= 3) return '자꾸 언덕에 걸린다';
    return '산에 갇혔다';
};

const loadBest = () => {
    try { return parseInt(window.localStorage.getItem('cairn.best') || '0', 10) || 0; }
    catch { return 0; }
};
const saveBest = (v) => { try { window.localStorage.setItem('cairn.best', String(v)); } catch { /* 무시 */ } };

const Cairn = () => {
    const canvasRef = useRef(null);
    const ctrlRef = useRef(null);       // { begin } — 버튼/키가 공유
    const [phase, setPhase] = useState('ready'); // ready | run | over
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(loadBest);

    // 캔버스 + 루프 + 키 입력은 refs 로만 굴린다(리렌더 없이).
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const dark = document.querySelector('.lab-os')?.getAttribute('data-theme') === 'dark';
        let field = makeField();
        let terrain = renderTerrain(field, dark);

        const G = {
            phase: 'ready',
            x: W / 2, y: H / 2,
            vx: 0, vy: 0,
            keys: { up: false, down: false, left: false, right: false },
            cairn: null,
            trail: [],       // 최근 궤적(꼬리)
            route: [],       // 전체 경로(끝 화면용)
            count: 0,
            startAt: 0,
            last: 0,
        };

        let audio = null;
        const ping = (hz, dur, type) => {
            try {
                if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
                const o = audio.createOscillator();
                const gn = audio.createGain();
                o.type = type || 'triangle';
                o.frequency.value = hz;
                gn.gain.setValueAtTime(0.0001, audio.currentTime);
                gn.gain.exponentialRampToValueAtTime(0.09, audio.currentTime + 0.01);
                gn.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
                o.connect(gn); gn.connect(audio.destination);
                o.start(); o.stop(audio.currentTime + dur + 0.02);
            } catch { /* 소리는 있으면 좋고 없어도 그만 */ }
        };

        // 경사(연속장)로 속도를 깎는다. 완만한 골을 달리면 빠르다.
        const slopeAt = (x, y) => {
            const e = 3;
            const gx = (field.raw(x + e, y) - field.raw(x - e, y)) / (2 * e);
            const gy = (field.raw(x, y + e) - field.raw(x, y - e)) / (2 * e);
            return Math.hypot(gx, gy);
        };

        const spawnCairn = () => {
            for (let t = 0; t < 40; t += 1) {
                const cx = PAD + 14 + Math.random() * (W - 2 * PAD - 28);
                const cy = PAD + 14 + Math.random() * (H - 2 * PAD - 28);
                const d = Math.hypot(cx - G.x, cy - G.y);
                if (d > 190 && d < 470) { G.cairn = { x: cx, y: cy, born: performance.now() }; return; }
            }
            G.cairn = { x: W - PAD - 40, y: H / 2, born: performance.now() };
        };

        const arm = () => {
            G.x = W / 2; G.y = H / 2; G.vx = 0; G.vy = 0;
            G.trail = []; G.route = []; G.count = 0;
            G.cairn = null; spawnCairn();
            G.phase = 'ready';
        };

        const begin = () => {
            arm();
            G.phase = 'run';
            G.startAt = performance.now();
            G.last = G.startAt;
            setScore(0);
            setPhase('run');
            ping(660, 0.08);
        };

        const end = () => {
            G.phase = 'over';
            setPhase('over');
            setScore(G.count);
            setBest((b) => {
                const nb = Math.max(b, G.count);
                if (nb !== b) saveBest(nb);
                return nb;
            });
            ping(180, 0.4, 'sine');
        };

        ctrlRef.current = { begin };

        // ── 그리기 ─────────────────────────────
        const accent = dark ? '#ff5c86' : '#e01e5a';
        const inkText = dark ? '#e9dfc7' : '#3a2e1c';

        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            ctx.drawImage(terrain, 0, 0, W, H);

            // 전체 경로(끝 화면에서 옅게)
            if (G.phase === 'over' && G.route.length > 1) {
                ctx.beginPath();
                ctx.moveTo(G.route[0].x, G.route[0].y);
                for (let i = 1; i < G.route.length; i += 1) ctx.lineTo(G.route[i].x, G.route[i].y);
                ctx.strokeStyle = accent;
                ctx.globalAlpha = 0.28;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // 돌탑(control) — 오리엔티어링 원.
            if (G.cairn && G.phase !== 'over') {
                const c = G.cairn;
                const t = (performance.now() - c.born) / 1000;
                const pulse = 12 + Math.sin(t * 5) * 2.2;
                ctx.beginPath();
                ctx.arc(c.x, c.y, pulse, 0, Math.PI * 2);
                ctx.strokeStyle = accent;
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(c.x, c.y, 2.4, 0, Math.PI * 2);
                ctx.fillStyle = accent;
                ctx.fill();
            }

            // 꼬리(속도가 빠를수록 길게 보인다)
            if (G.trail.length > 1) {
                for (let i = 1; i < G.trail.length; i += 1) {
                    const a = i / G.trail.length;
                    ctx.beginPath();
                    ctx.moveTo(G.trail[i - 1].x, G.trail[i - 1].y);
                    ctx.lineTo(G.trail[i].x, G.trail[i].y);
                    ctx.strokeStyle = accent;
                    ctx.globalAlpha = a * 0.5;
                    ctx.lineWidth = 2.5;
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }

            // 달리는 사람(삼각 표식)
            const ang = Math.atan2(G.vy, G.vx);
            const moving = Math.hypot(G.vx, G.vy) > 6;
            ctx.save();
            ctx.translate(G.x, G.y);
            ctx.rotate(moving ? ang : -Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(9, 0);
            ctx.lineTo(-6, 5.5);
            ctx.lineTo(-6, -5.5);
            ctx.closePath();
            ctx.fillStyle = accent;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = dark ? '#16150e' : '#fff';
            ctx.stroke();
            ctx.restore();

            // 시간 막대(위) — 남은 시간.
            const left = G.phase === 'run'
                ? Math.max(0, 1 - (performance.now() - G.startAt) / DURATION)
                : (G.phase === 'ready' ? 1 : 0);
            ctx.fillStyle = dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
            ctx.fillRect(PAD, 12, W - 2 * PAD, 6);
            ctx.fillStyle = left < 0.17 && G.phase === 'run' && Math.floor(performance.now() / 250) % 2 === 0
                ? inkText : accent;
            ctx.fillRect(PAD, 12, (W - 2 * PAD) * left, 6);

            // 찍은 돌탑 수(좌상단)
            ctx.fillStyle = inkText;
            ctx.font = '600 15px ui-monospace, Menlo, Consolas, monospace';
            ctx.textBaseline = 'top';
            ctx.fillText(`◆ ${G.count}`, PAD, 26);

            // 상태 안내
            if (G.phase === 'ready') {
                ctx.textAlign = 'center';
                ctx.fillStyle = inkText;
                ctx.font = '700 22px ui-monospace, Menlo, Consolas, monospace';
                ctx.fillText('방향키로 출발', W / 2, H / 2 - 58);
                ctx.font = '500 13px ui-monospace, Menlo, Consolas, monospace';
                ctx.globalAlpha = 0.8;
                ctx.fillText('돌탑(○)을 시간 안에 잇는다 · 언덕은 발을 잡는다', W / 2, H / 2 - 32);
                ctx.globalAlpha = 1;
                ctx.textAlign = 'left';
            }
        };

        // ── 갱신 ───────────────────────────────
        const step = (now) => {
            const dt = Math.min(0.05, (now - G.last) / 1000) || 0;
            G.last = now;

            if (G.phase === 'run') {
                // 방향 입력 → 목표 속도, 경사로 감속.
                let dx = (G.keys.right ? 1 : 0) - (G.keys.left ? 1 : 0);
                let dy = (G.keys.down ? 1 : 0) - (G.keys.up ? 1 : 0);
                const mag = Math.hypot(dx, dy);
                if (mag > 0) { dx /= mag; dy /= mag; }
                const slope = slopeAt(G.x, G.y);
                const spd = BASE_SPEED / (1 + SLOPE_K * slope);
                const tvx = dx * spd;
                const tvy = dy * spd;
                const k = 1 - Math.exp(-ACCEL * dt);
                G.vx += (tvx - G.vx) * k;
                G.vy += (tvy - G.vy) * k;
                G.x += G.vx * dt;
                G.y += G.vy * dt;
                // 경계
                if (G.x < PAD) { G.x = PAD; G.vx = 0; }
                if (G.x > W - PAD) { G.x = W - PAD; G.vx = 0; }
                if (G.y < PAD) { G.y = PAD; G.vy = 0; }
                if (G.y > H - PAD) { G.y = H - PAD; G.vy = 0; }

                // 꼬리 + 경로
                G.trail.push({ x: G.x, y: G.y });
                if (G.trail.length > 26) G.trail.shift();
                const rl = G.route.length;
                if (rl === 0 || Math.hypot(G.x - G.route[rl - 1].x, G.y - G.route[rl - 1].y) > 6) {
                    G.route.push({ x: G.x, y: G.y });
                }

                // 돌탑 도착?
                if (G.cairn && Math.hypot(G.x - G.cairn.x, G.y - G.cairn.y) < TOUCH_R) {
                    G.count += 1;
                    setScore(G.count);
                    ping(760 + Math.min(G.count, 8) * 45, 0.09);
                    spawnCairn();
                }

                // 시간 종료?
                if (now - G.startAt >= DURATION) end();
            }

            draw();
            raf = window.requestAnimationFrame(step);
        };
        let raf = window.requestAnimationFrame(step);

        // ── 키 입력(한 번만 바인딩) ─────────────
        const MOVE = {
            ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
            w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
        };
        const onKeyDown = (e) => {
            const m = MOVE[e.key];
            if (m) {
                if (G.phase === 'ready') begin();
                if (G.phase === 'run') G.keys[m] = true;
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
                return;
            }
            if (e.key === ' ' || e.key === 'Enter') {
                if (G.phase !== 'run') begin();
                e.preventDefault();
            }
        };
        const onKeyUp = (e) => {
            const m = MOVE[e.key];
            if (m) G.keys[m] = false;
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        // 테마 전환 시 지형 다시 칠하기
        const themeObs = new MutationObserver(() => {
            const nowDark = document.querySelector('.lab-os')?.getAttribute('data-theme') === 'dark';
            terrain = renderTerrain(field, nowDark);
        });
        const labOs = document.querySelector('.lab-os');
        if (labOs) themeObs.observe(labOs, { attributes: true, attributeFilter: ['data-theme'] });

        arm();

        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            themeObs.disconnect();
            if (audio) { try { audio.close(); } catch { /* 무시 */ } }
            // 재시작(새 판)을 위해 field 갱신 여지 — 언마운트 시 정리만.
            field = null; terrain = null;
        };
    }, []);

    const onBegin = useCallback(() => { ctrlRef.current?.begin(); }, []);

    return (
        <LabShell
            title="CAIRN"
            eyebrow="read the contours, beat the clock"
            subtitle={'// 등고선을 읽어 돌탑을 시간 안에 잇는 오리엔티어링 — 방향키로 달리되, 언덕(촘촘한 선)은 발을 잡는다'}
            path="cairn"
        >
            <section className="cairn-wrap" aria-label="등고선 지형 종주">
                <div className="cairn-stage">
                    <canvas ref={canvasRef} className="cairn-canvas" aria-label="등고선 지도와 돌탑" />
                    {phase === 'over' && (
                        <div className="cairn-over">
                            <span className="cairn-k k-mono">time up</span>
                            <h2 className="cairn-score"><b>{score}</b> 돌탑</h2>
                            <p className="cairn-grade">{grade(score)}</p>
                            <p className="cairn-best k-mono">best {best}</p>
                            <button type="button" className="cairn-btn" onClick={onBegin}>다시 (Space)</button>
                        </div>
                    )}
                </div>

                <p className="cairn-legend k-mono" aria-hidden="true">
                    ← → ↑ ↓ / WASD 이동 · Space 다시 &nbsp;·&nbsp; ○ 돌탑 &nbsp;·&nbsp; 촘촘한 선 = 가파른 언덕(느려짐)
                </p>

                <ReadBlock />
            </section>
        </LabShell>
    );
};

// 본문 — 등고선과 오리엔티어링의 경로 선택.
const ReadBlock = () => (
    <section className="cairn-read">
        <h3>지도에서 가장 빠른 길은 대개 직선이 아니다</h3>
        <p>
            등고선은 <b>같은 높이를 잇는 선</b>이다. 선이 촘촘한 곳은 짧은 거리에 높이가 확
            바뀌는 <b>가파른 비탈</b>, 선이 성긴 곳은 <b>완만한 땅</b>이다. 이 화면의 지형도
            그렇게 만든다 — 여러 언덕을 더한 높이장에서, 화면 폭이 일정하도록 등고선을 직접
            그린다. 그래서 촘촘한 줄무늬는 눈으로도 “여긴 힘들겠다”가 읽힌다.
        </p>
        <p>
            오리엔티어링 선수가 다음 돌탑까지 갈 때 늘 하는 고민이 이거다. <b>언덕을 곧장
            넘을까(짧지만 느림), 골을 따라 돌아갈까(길지만 빠름).</b> 이 화면에서도 사람의
            속도는 발밑 경사에 반비례한다 — 가파른 곳에선 같은 방향키를 눌러도 굼뜨게 나아간다.
            그래서 완만한 골을 찾아 흐르듯 도는 편이, 언덕을 정면으로 오르는 것보다 빠를 때가 많다.
        </p>
        <p>
            30초는 짧다. 지도를 <b>먼저 읽고</b> 움직인 사람과, 일단 직선으로 달리다 언덕에
            걸린 사람의 점수가 갈린다. 몇 판만 해보면, 다음 돌탑이 뜨는 순간 눈이 먼저
            <b> 성긴 선을 따라 길을 긋는다</b> — 지형을 읽는 발이 생기는 순간이다.
        </p>
        <p className="cairn-disc">
            * 지형은 페이지를 열 때마다 새로 생성된다(가우시안 언덕들의 합). ‘다시’는 같은
            지형에서 새 30초를 시작한다. 최고 기록은 이 브라우저에만 남는다.
        </p>
    </section>
);

export default Cairn;
