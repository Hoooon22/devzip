import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Brim.css';

// BRIM — 물폭탄 돌리기 (규칙과 게임 × 진짜 쓰는 도구 × 실제 시각·경과시간에 반응 × 화면에 숫자가 하나도 안 보인다).
//   소재: 폭탄 돌리기 / 물풍선 돌리기 — 물이 차오르는 잔 하나를 옆으로 넘긴다.
//         찰랑찰랑 넘치는 순간 들고 있던 사람이 젖는다. 벌칙·탈락을 정할 때 실제로 쓰는 공정한 제거식 뽑기.
//   형식: 진짜 쓰는 도구 — 사람 수를 정하고 돌리면 한 명씩 젖어 나가고 마지막 한 사람이 살아남는다.
//   기술: 실제 시각·경과시간 — performance.now 로 잰 실제 흐른 시간만큼 물이 찬다. 넘기든 안 넘기든 물은 쉬지 않는다.
//   제약: 화면에 숫자가 하나도 안 보인다 — 사람 수는 잔의 개수, 남은 시간은 물의 높이, 결과는 젖은 잔. 숫자·타이머 없음.
//
//   도전: "언제 넘칠지"를 숫자 없이 공정하게 감추기. 넘침 선(brim)은 잔마다 매번 조금씩 다른 높이에 숨어 있고,
//         가득 찰수록 수면이 끓듯 출렁이고 잔이 떨려 남은 여유를 정확히 못 읽게 만든다 — 눈금을 보고 딱 맞추는
//         반응 게임이 아니라, "곧 넘칠 것 같다"는 불안으로 넘기는 진짜 폭탄 돌리기가 되느냐가 관건.

const MIN_P = 2;
const MAX_P = 6;
const DEFAULT_P = 4;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);

// 새 폭탄(물잔) 한 통 — 낮은 물에서 시작, 넘침 선은 매번 살짝 다르게 숨긴다.
const freshBomb = () => ({ fill: rand(0.06, 0.14), thr: rand(1.0, 1.09) });

const nextAlive = (players, from) => {
    const n = players.length;
    for (let k = 1; k <= n; k += 1) {
        const i = (from + k) % n;
        if (players[i].alive) return i;
    }
    return from;
};

const Brim = () => {
    const [phase, setPhase] = useState('setup');   // setup | play | over
    const [count, setCount] = useState(DEFAULT_P);
    const [wet, setWet] = useState(false);          // 방금 누가 젖었다(플래시)
    const [round, setRound] = useState(0);

    const canvasRef = useRef(null);
    const wrapRef = useRef(null);
    const palRef = useRef(null);

    // 게임 런타임 상태 — 프레임마다 바뀌므로 ref 로만 들고, 렌더는 phase/count 로만 한다.
    const g = useRef({
        phase: 'setup',
        players: [],
        holder: 0,
        fill: 0,
        thr: 1.05,
        pressure: 0,     // 한 명씩 빠질수록 물이 더 빨리 찬다
        baseRate: 0.155, // 초당 채움(빈 잔 기준)
        t: 0,
        splash: [],      // 튀는 물방울
        shake: 0,        // 젖는 순간 화면 진동
        pass: 0,         // 넘김 트랜지션(1→0)
        winner: -1,
    });

    const phaseRef = useRef(phase); useEffect(() => { phaseRef.current = phase; g.current.phase = phase; }, [phase]);

    // ── 팔레트: CSS 토큰을 읽어 캔버스에 쓴다(테마 토글 반영) ──
    const readPalette = useCallback(() => {
        const el = wrapRef.current;
        if (!el) return;
        const cs = getComputedStyle(el);
        const c = (n, f) => (cs.getPropertyValue(n).trim() || f);
        palRef.current = {
            tile: c('--tile', '#0c1f26'),
            tileHi: c('--tile-hi', '#12303a'),
            glass: c('--glass', '#bfeaf0'),
            water: c('--water', '#16c0d8'),
            waterLo: c('--water-lo', '#0c6e82'),
            warn: c('--warn', '#ff7a5c'),
            ink: c('--ink', '#dcefff'),
            dim: c('--dim', 'rgba(220,239,255,0.28)'),
        };
    }, []);

    // ── 게임 진행 ──
    const spawnSplash = useCallback((x, y, big) => {
        const gc = g.current;
        const n = big ? 26 : 12;
        for (let i = 0; i < n; i += 1) {
            const a = rand(-Math.PI, 0);
            const sp = rand(big ? 2.4 : 1.4, big ? 6.2 : 3.4);
            gc.splash.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(1, 3), life: rand(0.5, 1.1) });
        }
    }, []);

    const start = useCallback((n) => {
        const gc = g.current;
        gc.players = Array.from({ length: n }, () => ({ alive: true }));
        gc.holder = Math.floor(Math.random() * n);
        const b = freshBomb();
        gc.fill = b.fill; gc.thr = b.thr;
        gc.pressure = 0; gc.t = 0; gc.splash = []; gc.shake = 0; gc.pass = 0; gc.winner = -1;
        gc.phase = 'play';   // rAF 즉시 반영(phaseRef 동기화 한 프레임 앞당김)
        setWet(false);
        setRound((r) => r + 1);
        setPhase('play');
    }, []);

    const overflow = useCallback((pos) => {
        const gc = g.current;
        gc.players[gc.holder].alive = false;
        gc.shake = 1;
        spawnSplash(pos.x, pos.y - pos.h * 0.42, true);
        const alive = gc.players.filter((p) => p.alive);
        if (alive.length <= 1) {
            gc.winner = gc.players.findIndex((p) => p.alive);
            gc.phase = 'over';   // rAF 가 같은 잔을 다시 넘치게 판정하지 않도록 즉시 멈춤
            setPhase('over');
            return;
        }
        setWet(true);
        window.setTimeout(() => setWet(false), 420);
        gc.holder = nextAlive(gc.players, gc.holder);
        const b = freshBomb();
        gc.fill = b.fill; gc.thr = b.thr;
        gc.pressure += 0.3;
        gc.pass = 1;
    }, [spawnSplash]);

    const passIt = useCallback(() => {
        const gc = g.current;
        if (gc.phase !== 'play') return;
        gc.holder = nextAlive(gc.players, gc.holder);
        gc.pass = 1;   // 잔 사이 물이 옮겨가는 트랜지션 트리거
    }, []);

    // 키보드: 1회 바인딩, 최신 상태는 ref 로.
    useEffect(() => {
        const onKey = (e) => {
            const p = phaseRef.current;
            switch (e.key) {
                case 'ArrowLeft':
                    if (p === 'setup') { e.preventDefault(); setCount((c) => Math.max(MIN_P, c - 1)); }
                    break;
                case 'ArrowRight':
                    if (p === 'setup') { e.preventDefault(); setCount((c) => Math.min(MAX_P, c + 1)); }
                    break;
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    if (p === 'setup') start(count);
                    else if (p === 'play') passIt();
                    else if (p === 'over') setPhase('setup');
                    break;
                case 'Backspace':
                    if (p !== 'setup') { e.preventDefault(); setPhase('setup'); }
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [count, start, passIt]);

    useEffect(() => { readPalette(); }, [readPalette]);

    // 테마 토글 감지 → 팔레트 다시 읽기.
    useEffect(() => {
        const os = document.querySelector('.lab-os');
        if (!os) return undefined;
        const mo = new MutationObserver(() => readPalette());
        mo.observe(os, { attributes: true, attributeFilter: ['data-theme'] });
        return () => mo.disconnect();
    }, [readPalette]);

    // ── 캔버스 렌더 루프 ──
    useEffect(() => {
        const cv = canvasRef.current;
        if (!cv) return undefined;
        const ctx = cv.getContext('2d');
        let raf = 0;
        let last = performance.now();
        let W = 0; let H = 0; let dpr = 1;

        const resize = () => {
            const r = cv.getBoundingClientRect();
            dpr = Math.min(2, window.devicePixelRatio || 1);
            W = r.width; H = r.height;
            cv.width = Math.round(W * dpr);
            cv.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize);

        // 잔 하나 그리기. filled 0..>1 (rim=1). active 면 물+떨림.
        const drawCup = (cx, cy, w, h, filled, alive, active, pal, tms) => {
            const hw = w / 2;
            const rad = Math.min(hw, 16);
            let tx = 0; let ty = 0;
            const danger = clamp((filled - 0.72) / 0.36, 0, 1);
            if (active && alive) {
                const amp = 0.6 + danger * 2.6;
                tx = Math.sin(tms * 0.045) * amp;
                ty = Math.cos(tms * 0.052) * amp * 0.6;
            }
            ctx.save();
            ctx.translate(cx + tx, cy + ty);

            // 잔 몸통(위가 넓은 사다리꼴 유리잔)
            const topHW = hw;
            const botHW = hw * 0.74;
            const yTop = -h / 2;
            const yBot = h / 2;
            const cupPath = new Path2D();
            cupPath.moveTo(-topHW, yTop);
            cupPath.lineTo(topHW, yTop);
            cupPath.lineTo(botHW, yBot - rad);
            cupPath.quadraticCurveTo(botHW, yBot, botHW - rad, yBot);
            cupPath.lineTo(-botHW + rad, yBot);
            cupPath.quadraticCurveTo(-botHW, yBot, -botHW, yBot - rad);
            cupPath.closePath();

            // 유리 바탕
            ctx.fillStyle = alive ? pal.tileHi : pal.tile;
            ctx.fill(cupPath);

            if (alive) {
                // 물 — 잔 안쪽으로 클립하고 아래에서 채운다
                ctx.save();
                ctx.clip(cupPath);
                const level = clamp(filled, 0, 1);
                // rim(y=yTop)에서 바닥(y=yBot) 사이. filled=1 이면 물이 rim.
                const surfaceY = yBot - (yBot - yTop) * level;
                const wob = active ? (danger * 6) : 1.5;
                ctx.beginPath();
                ctx.moveTo(-topHW, yBot);
                ctx.lineTo(-topHW, surfaceY);
                const seg = 12;
                for (let i = 0; i <= seg; i += 1) {
                    const px = -topHW + (topHW * 2) * (i / seg);
                    const py = surfaceY + Math.sin(tms * 0.006 + i * 0.9 + level * 8) * wob
                        + Math.sin(tms * 0.013 + i * 0.5) * wob * 0.5;
                    ctx.lineTo(px, py);
                }
                ctx.lineTo(topHW, yBot);
                ctx.closePath();
                const grd = ctx.createLinearGradient(0, surfaceY, 0, yBot);
                const top = danger > 0.55 ? pal.warn : pal.water;
                grd.addColorStop(0, top);
                grd.addColorStop(1, pal.waterLo);
                ctx.fillStyle = grd;
                ctx.fill();

                // 넘치기 직전: rim 위로 볼록 솟은 표면장력 방울
                if (filled > 1) {
                    const bulge = Math.min((filled - 1) * h * 2.2, h * 0.16);
                    ctx.beginPath();
                    ctx.ellipse(0, yTop + Math.sin(tms * 0.05) * 1.4, topHW * 0.62, bulge, 0, Math.PI, 0);
                    ctx.fillStyle = pal.warn;
                    ctx.fill();
                }
                ctx.restore();
            } else {
                // 젖은/탈락한 잔 — 금 간 빈 잔 + 바닥 물자국
                ctx.save();
                ctx.clip(cupPath);
                ctx.fillStyle = pal.dim;
                ctx.fillRect(-topHW, yBot - h * 0.1, topHW * 2, h * 0.1);
                ctx.restore();
                ctx.strokeStyle = pal.dim;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(-hw * 0.2, yTop + 4);
                ctx.lineTo(hw * 0.05, 0);
                ctx.lineTo(-hw * 0.15, yBot - 6);
                ctx.stroke();
            }

            // 유리 테두리
            ctx.strokeStyle = alive ? pal.glass : pal.dim;
            ctx.lineWidth = active ? 3 : 2;
            ctx.stroke(cupPath);

            // 활성 잔 하이라이트 링
            if (active && alive) {
                ctx.strokeStyle = danger > 0.55 ? pal.warn : pal.water;
                ctx.globalAlpha = 0.5 + 0.4 * Math.sin(tms * 0.02);
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(0, yBot + h * 0.34, topHW * 1.15, h * 0.14, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            ctx.restore();
        };

        const step = (tms) => {
            const dt = clamp((tms - last) / 1000, 0, 0.05);
            last = tms;
            const gc = g.current;
            const pal = palRef.current || {};

            // 물리/시간 진행
            if (gc.phase === 'play') {
                gc.t += dt;
                const wob = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(gc.t * 4.1)) * (0.6 + 0.4 * Math.sin(gc.t * 1.7 + 1));
                const accel = 1 + 2.5 * clamp((gc.fill - 0.5) / 0.5, 0, 1);
                const rate = gc.baseRate * (1 + gc.pressure * 0.55) * accel * wob;
                gc.fill += rate * dt;
            }
            gc.shake = Math.max(0, gc.shake - dt * 2.6);
            gc.pass = Math.max(0, gc.pass - dt * 5);

            // 배경
            ctx.clearRect(0, 0, W, H);
            const sx = gc.shake > 0 ? Math.sin(tms * 0.09) * gc.shake * 7 : 0;
            const sy = gc.shake > 0 ? Math.cos(tms * 0.11) * gc.shake * 5 : 0;
            ctx.save();
            ctx.translate(sx, sy);

            const n = gc.players.length || count;
            const cx = W / 2;
            const cy = H / 2;
            const ringR = Math.min(W, H) * 0.34;
            const cupW = clamp(Math.min(W, H) * (n > 4 ? 0.15 : 0.185), 44, 120);
            const cupH = cupW * 1.25;

            // 잔 배치(위 12시부터 시계방향)
            const pos = [];
            for (let i = 0; i < n; i += 1) {
                const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
                pos.push({ x: cx + Math.cos(ang) * ringR, y: cy + Math.sin(ang) * ringR, w: cupW, h: cupH });
            }

            if (gc.phase === 'setup') {
                for (let i = 0; i < n; i += 1) {
                    drawCup(pos[i].x, pos[i].y, cupW, cupH, 0.12, true, false, pal, tms);
                }
            } else {
                // 넘김 화살표(시계방향)를 홀더 옆에 살짝
                for (let i = 0; i < n; i += 1) {
                    const active = (i === gc.holder) && gc.players[i] && gc.players[i].alive && gc.phase === 'play';
                    const fillHere = active ? gc.fill : (gc.phase === 'over' && i === gc.winner ? 0.5 : 0);
                    drawCup(pos[i].x, pos[i].y, cupW, cupH, fillHere, gc.players[i] ? gc.players[i].alive : true, active, pal, tms);
                }
                // 우승 잔 후광
                if (gc.phase === 'over' && gc.winner >= 0 && pos[gc.winner]) {
                    const p = pos[gc.winner];
                    ctx.strokeStyle = pal.water;
                    for (let k = 0; k < 3; k += 1) {
                        ctx.globalAlpha = 0.28 - k * 0.08;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, cupW * (0.8 + k * 0.22) + Math.sin(tms * 0.02) * 3, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    ctx.globalAlpha = 1;
                }
            }

            // 물방울
            const sp = gc.splash;
            for (let i = sp.length - 1; i >= 0; i -= 1) {
                const d = sp[i];
                d.life -= dt;
                if (d.life <= 0) { sp.splice(i, 1); continue; }
                d.vy += 26 * dt;
                d.x += d.vx; d.y += d.vy;
                ctx.globalAlpha = clamp(d.life, 0, 1);
                ctx.fillStyle = pal.warn;
                ctx.beginPath();
                ctx.arc(d.x, d.y, 2.6, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.restore();

            // 넘침 판정은 좌표가 필요하므로 draw 뒤에(홀더 위치 확보)
            if (gc.phase === 'play' && gc.fill >= gc.thr) {
                overflow(pos[gc.holder]);
            }

            raf = requestAnimationFrame(step);
        };

        raf = requestAnimationFrame(step);
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, [count, overflow]);

    const cap =
        phase === 'setup' ? '몇 명?'
            : phase === 'play' ? '넘겨'
                : '살아남았다';

    const hint =
        phase === 'setup' ? '‹ › 로 사람 수 · Space 로 시작'
            : phase === 'play' ? 'Space 로 옆 사람에게 넘긴다 · 넘치면 젖는다'
                : 'Space 로 다시 · Backspace 로 사람 수 바꾸기';

    return (
        <LabShell
            title="Brim"
            subtitle="물폭탄 돌리기 — 넘치기 전에 옆으로 넘겨라"
            eyebrow="rules · hot potato · real-time"
            path="brim"
        >
            <div className={`brim-wrap ph-${phase} ${wet ? 'is-wet' : ''}`} ref={wrapRef} data-round={round}>
                <span className="brim-cap k-mono">{cap}</span>

                <div className="brim-stage">
                    <canvas ref={canvasRef} className="brim-canvas" aria-label="물폭탄 돌리기" />

                    {phase === 'setup' && (
                        <div className="brim-ctrl" aria-hidden="true">
                            <button
                                type="button"
                                className="brim-step"
                                onClick={() => setCount((c) => Math.max(MIN_P, c - 1))}
                                aria-label="사람 수 줄이기"
                            >‹</button>
                            <button
                                type="button"
                                className="brim-go"
                                onClick={() => start(count)}
                            >시작</button>
                            <button
                                type="button"
                                className="brim-step"
                                onClick={() => setCount((c) => Math.min(MAX_P, c + 1))}
                                aria-label="사람 수 늘리기"
                            >›</button>
                        </div>
                    )}

                    {phase === 'play' && (
                        <button
                            type="button"
                            className="brim-tap"
                            onClick={passIt}
                            aria-label="옆 사람에게 넘기기"
                        />
                    )}

                    {phase === 'over' && (
                        <div key={`v-${round}`} className="brim-verdict">
                            <span className="w">마지막 한 잔</span>
                            <button type="button" className="brim-go" onClick={() => setPhase('setup')}>다시</button>
                        </div>
                    )}
                </div>

                <p className="brim-hint">{hint}</p>
            </div>
        </LabShell>
    );
};

export default Brim;
