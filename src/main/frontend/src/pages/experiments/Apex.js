import React, { useEffect, useRef, useState, useCallback } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Apex.css';

// APEX — 등고선 읽고 정상 찾기 대결 (공간과 지도 × 대결 × 시드 기반 난수 × 마우스 없이 키보드만).
//   소재: 지형도 읽기 — 등고선만 보고 "가장 높은 한 점(정상)"이 어디인지 눈대중으로 찍는다.
//   형식: 대결 — 나 vs 컴퓨터. 둘 다 정상을 겨냥해 깃발을 꽂고, 정상에 더 가까운 쪽이 이긴다.
//   기술: 시드 기반 난수 — 지형도, 컴퓨터의 겨냥, 정답 정상까지 전부 하나의 seed에서 결정된다.
//         같은 seed면 언제 열어도 똑같은 지형·똑같은 승부다(mulberry32).
//   제약: 마우스 없이 키보드만 — ← → ↑ ↓ 로 겨냥, Enter 로 깃발, N 으로 다음 지형.
//
//   도전: 이미지도 지형 데이터도 없이, 하나의 정수 seed에서 가우시안 봉우리들을 더한 높이장을
//         만들고, 화면폭이 일정한 등고선(가파를수록 촘촘)을 청사진 톤으로 픽셀 단위로 직접 그린다.
//         그리고 그 높이장의 실제 최고점(argmax)을 정답으로 삼아, 사람이 "가장 촘촘하고 밝은
//         고리의 한가운데"를 눈으로 찍을 수 있는지 — 미끼 봉우리에 속지 않는지 — 를 겨룬다.

const W = 680;
const H = 440;
const PAD = 26;
const BANDS = 12;          // 등고선 밴드 수
const IDX_EVERY = 4;       // 굵은 지표 등고선 주기
const AIM_SPEED = 190;     // px/s — 겨냥 이동 속도
const GRID = 40;           // 청사진 눈금 간격(px)
const CPU_MIN = 26;        // 컴퓨터 겨냥 오차 최소(px)
const CPU_SPAN = 46;       // 컴퓨터 겨냥 오차 폭(px)

// ── 시드 난수(mulberry32): 같은 seed면 같은 수열. ──
const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ── 지형: 하나의 seed → 가우시안 봉우리들의 합. 봉우리 하나는 확실히 더 높다(정답). ──
const makeField = (seed) => {
    const r = mulberry32(seed);
    const inX = () => PAD + 44 + r() * (W - 2 * PAD - 88);
    const inY = () => PAD + 44 + r() * (H - 2 * PAD - 88);

    const hills = [];
    // 정답 봉우리 — 가장 높다.
    const main = { cx: inX(), cy: inY(), amp: 1.0, sig: 62 + r() * 34 };
    hills.push(main);
    // 미끼 봉우리 1~2개 — 조금 낮게, 정답과 충분히 떨어뜨린다.
    const decoys = 1 + (r() < 0.5 ? 1 : 0);
    for (let i = 0; i < decoys; i += 1) {
        for (let t = 0; t < 40; t += 1) {
            const cx = inX();
            const cy = inY();
            if (Math.hypot(cx - main.cx, cy - main.cy) > 168) {
                hills.push({ cx, cy, amp: 0.60 + r() * 0.24, sig: 58 + r() * 40 });
                break;
            }
        }
    }
    // 분지(음의 봉우리) 하나 — 지형에 골을 판다.
    hills.push({ cx: inX(), cy: inY(), amp: -(0.45 + r() * 0.3), sig: 60 + r() * 40 });

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

// 높이장 → 오프스크린 청사진 등고선 지도 + 실제 최고점(정답 정상). 한 번만 그려 매 프레임 blit.
const renderTerrain = (field, dark) => {
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const c = off.getContext('2d');
    const img = c.createImageData(W, H);
    const data = img.data;

    const hgt = new Float32Array(W * H);
    let lo = Infinity;
    let hi = -Infinity;
    let maxIdx = 0;
    for (let y = 0; y < H; y += 1) {
        for (let x = 0; x < W; x += 1) {
            const v = field.raw(x, y);
            const i = y * W + x;
            hgt[i] = v;
            if (v < lo) lo = v;
            if (v > hi) { hi = v; maxIdx = i; }
        }
    }
    const span = hi - lo || 1;
    const L = 1 / BANDS;

    // 청사진 팔레트 — 라이트=중간 청, 다크=심야 네이비. 선은 밝은 시안 계열.
    const paper = dark ? [8, 22, 39] : [15, 76, 129];
    const paperHi = dark ? [17, 44, 74] : [44, 112, 172];   // 고지대일수록 밝게(정상=밝은 중심)
    const grid = dark ? [42, 74, 112] : [58, 120, 176];
    const line = dark ? [74, 150, 210] : [200, 224, 248];
    const idxLine = dark ? [152, 206, 255] : [240, 248, 255];

    const mix = (a, b, t) => a + (b - a) * t;

    for (let y = 0; y < H; y += 1) {
        for (let x = 0; x < W; x += 1) {
            const i = y * W + x;
            const hn = (hgt[i] - lo) / span; // 0..1

            let r = mix(paper[0], paperHi[0], hn);
            let g = mix(paper[1], paperHi[1], hn);
            let b = mix(paper[2], paperHi[2], hn);

            // 청사진 눈금(아주 옅게)
            if (x % GRID === 0 || y % GRID === 0) {
                r = mix(r, grid[0], 0.5);
                g = mix(g, grid[1], 0.5);
                b = mix(b, grid[2], 0.5);
            }

            // 경사(정규화 높이의 화면당 기울기) → 폭이 일정한 등고선.
            const xr = Math.min(x + 1, W - 1);
            const xl = Math.max(x - 1, 0);
            const yd = Math.min(y + 1, H - 1);
            const yu = Math.max(y - 1, 0);
            const gx = (hgt[y * W + xr] - hgt[y * W + xl]) / (2 * span);
            const gy = (hgt[yd * W + x] - hgt[yu * W + x]) / (2 * span);
            const gradv = Math.hypot(gx, gy) || 1e-6;

            const f = hn / L;
            const frac = f - Math.floor(f);
            const distH = Math.min(frac, 1 - frac) * L;
            const screenDist = distH / gradv;
            const isIdx = Math.round(f) % IDX_EVERY === 0;
            const width = isIdx ? 1.6 : 1.0;
            const ink = screenDist < width ? Math.min(1, 1 - screenDist / width + 0.15) : 0;

            if (ink > 0) {
                const lc = isIdx ? idxLine : line;
                const strength = isIdx ? ink : ink * 0.72;
                r = mix(r, lc[0], strength);
                g = mix(g, lc[1], strength);
                b = mix(b, lc[2], strength);
            }

            const p = i * 4;
            data[p] = r;
            data[p + 1] = g;
            data[p + 2] = b;
            data[p + 3] = 255;
        }
    }
    c.putImageData(img, 0, 0);
    return { canvas: off, summit: { x: maxIdx % W, y: Math.floor(maxIdx / W) } };
};

// 컴퓨터의 겨냥 — 같은 seed에서 결정. 정상에서 seed로 정해진 만큼 빗나간다(beatable).
const cpuAim = (seed, summit) => {
    const r = mulberry32((seed * 2654435761) >>> 0);
    const ang = r() * Math.PI * 2;
    const dist = CPU_MIN + r() * CPU_SPAN;
    return {
        x: Math.max(PAD, Math.min(W - PAD, summit.x + Math.cos(ang) * dist)),
        y: Math.max(PAD, Math.min(H - PAD, summit.y + Math.sin(ang) * dist)),
    };
};

const seedLabel = (seed) => (seed >>> 0).toString(36).slice(-4).toUpperCase();
const todaySeed = () => {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

const loadTally = () => {
    try {
        const raw = window.localStorage.getItem('apex.tally');
        if (raw) return JSON.parse(raw);
    } catch { /* 무시 */ }
    return { win: 0, loss: 0, draw: 0 };
};
const saveTally = (t) => { try { window.localStorage.setItem('apex.tally', JSON.stringify(t)); } catch { /* 무시 */ } };

const Apex = () => {
    const canvasRef = useRef(null);
    const ctrlRef = useRef(null);         // { next } — 버튼/키 공유
    const [phase, setPhase] = useState('aim'); // aim | reveal
    const [seed, setSeed] = useState(todaySeed);
    const [result, setResult] = useState(null); // { dYou, dCpu, verdict }
    const [tally, setTally] = useState(loadTally);

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

        const G = {
            phase: 'aim',
            seed: todaySeed(),
            terrain: null,
            summit: { x: W / 2, y: H / 2 },
            x: W / 2, y: H / 2,          // 겨냥 위치(내 깃발 후보)
            you: null, cpu: null,
            keys: { up: false, down: false, left: false, right: false },
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
                gn.gain.exponentialRampToValueAtTime(0.08, audio.currentTime + 0.01);
                gn.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
                o.connect(gn); gn.connect(audio.destination);
                o.start(); o.stop(audio.currentTime + dur + 0.02);
            } catch { /* 소리는 있으면 좋고 없어도 그만 */ }
        };

        const buildSeed = (s) => {
            const field = makeField(s);
            const t = renderTerrain(field, dark);
            G.seed = s;
            G.terrain = t.canvas;
            G.summit = t.summit;
            G.x = W / 2; G.y = H / 2;
            G.you = null; G.cpu = null;
            G.phase = 'aim';
            setPhase('aim');
            setResult(null);
            setSeed(s);
        };

        const plant = () => {
            if (G.phase !== 'aim') return;
            G.you = { x: G.x, y: G.y };
            G.cpu = cpuAim(G.seed, G.summit);
            const dYou = Math.hypot(G.you.x - G.summit.x, G.you.y - G.summit.y);
            const dCpu = Math.hypot(G.cpu.x - G.summit.x, G.cpu.y - G.summit.y);
            let verdict;
            if (Math.abs(dYou - dCpu) < 8) verdict = 'draw';
            else verdict = dYou < dCpu ? 'win' : 'loss';
            G.phase = 'reveal';
            setPhase('reveal');
            setResult({ dYou, dCpu, verdict });
            setTally((prev) => {
                const nt = { ...prev, [verdict]: prev[verdict] + 1 };
                saveTally(nt);
                return nt;
            });
            if (verdict === 'win') { ping(680, 0.09); setTimeout(() => ping(920, 0.12), 90); }
            else if (verdict === 'loss') ping(200, 0.32, 'sine');
            else ping(520, 0.14);
        };

        const next = () => { buildSeed((G.seed + 1) >>> 0); ping(560, 0.06); };
        ctrlRef.current = { next };

        // ── 그리기 ───────────────────────────────
        const col = () => (dark
            ? { you: '#ffb43d', cpu: '#8fbdec', summit: '#eaf3ff', ink: '#dbe9fb', soft: 'rgba(219,233,251,0.6)' }
            : { you: '#ffcf5a', cpu: '#d6e6fb', summit: '#ffffff', ink: '#eaf3ff', soft: 'rgba(234,243,255,0.72)' });

        const flag = (p, color, kind) => {
            // 깃발 — 장대 + 삼각기. kind: 'you' | 'cpu'
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -22);
            ctx.stroke();
            ctx.beginPath();
            if (kind === 'you') {
                ctx.moveTo(0, -22); ctx.lineTo(14, -17); ctx.lineTo(0, -12); ctx.closePath();
                ctx.fillStyle = color; ctx.fill();
            } else {
                ctx.moveTo(0, -22); ctx.lineTo(-14, -17); ctx.lineTo(0, -12); ctx.closePath();
                ctx.fillStyle = color; ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1;
            }
            ctx.beginPath();
            ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
            ctx.fillStyle = color; ctx.fill();
            ctx.restore();
        };

        const draw = (now) => {
            const c = col();
            ctx.clearRect(0, 0, W, H);
            if (G.terrain) ctx.drawImage(G.terrain, 0, 0, W, H);

            if (G.phase === 'reveal') {
                // 각 깃발 → 정상 잇는 점선.
                ctx.setLineDash([5, 4]);
                ctx.lineWidth = 1.6;
                [[G.you, c.you], [G.cpu, c.cpu]].forEach(([p, color]) => {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(G.summit.x, G.summit.y);
                    ctx.strokeStyle = color;
                    ctx.globalAlpha = 0.65;
                    ctx.stroke();
                });
                ctx.setLineDash([]);
                ctx.globalAlpha = 1;

                // 정답 정상 — 맥동하는 표적.
                const pulse = 9 + Math.sin(now / 260) * 2.4;
                ctx.beginPath();
                ctx.arc(G.summit.x, G.summit.y, pulse, 0, Math.PI * 2);
                ctx.strokeStyle = c.summit;
                ctx.lineWidth = 2.4;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(G.summit.x, G.summit.y, 2.6, 0, Math.PI * 2);
                ctx.fillStyle = c.summit;
                ctx.fill();

                flag(G.cpu, c.cpu, 'cpu');
                flag(G.you, c.you, 'you');
            } else {
                // 겨냥 십자선 — 내 깃발 후보.
                const t = now / 380;
                const pr = 12 + Math.sin(t) * 2.6;
                ctx.strokeStyle = c.you;
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.arc(G.x, G.y, pr, 0, Math.PI * 2);
                ctx.globalAlpha = 0.9;
                ctx.stroke();
                ctx.globalAlpha = 1;
                ctx.beginPath();
                ctx.moveTo(G.x - 16, G.y); ctx.lineTo(G.x - 5, G.y);
                ctx.moveTo(G.x + 5, G.y); ctx.lineTo(G.x + 16, G.y);
                ctx.moveTo(G.x, G.y - 16); ctx.lineTo(G.x, G.y - 5);
                ctx.moveTo(G.x, G.y + 5); ctx.lineTo(G.x, G.y + 16);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(G.x, G.y, 1.8, 0, Math.PI * 2);
                ctx.fillStyle = c.you;
                ctx.fill();
            }

            // seed 도장(우하단)
            ctx.fillStyle = c.soft;
            ctx.font = '600 11px ui-monospace, Menlo, Consolas, monospace';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`SEED ${seedLabel(G.seed)}`, W - 10, H - 8);
            ctx.textAlign = 'left';
        };

        const step = (now) => {
            const dt = Math.min(0.05, (now - G.last) / 1000) || 0;
            G.last = now;
            if (G.phase === 'aim') {
                let dx = (G.keys.right ? 1 : 0) - (G.keys.left ? 1 : 0);
                let dy = (G.keys.down ? 1 : 0) - (G.keys.up ? 1 : 0);
                const mag = Math.hypot(dx, dy);
                if (mag > 0) {
                    dx /= mag; dy /= mag;
                    G.x = Math.max(PAD, Math.min(W - PAD, G.x + dx * AIM_SPEED * dt));
                    G.y = Math.max(PAD, Math.min(H - PAD, G.y + dy * AIM_SPEED * dt));
                }
            }
            draw(now);
            raf = window.requestAnimationFrame(step);
        };
        let raf = window.requestAnimationFrame(step);

        // ── 키 입력(한 번만 바인딩) ───────────────
        const MOVE = {
            ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
            w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
        };
        const onKeyDown = (e) => {
            const m = MOVE[e.key];
            if (m) {
                if (G.phase === 'aim') G.keys[m] = true;
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
                return;
            }
            if (e.key === 'Enter' || e.key === ' ') {
                if (G.phase === 'aim') plant(); else next();
                e.preventDefault();
                return;
            }
            if (e.key === 'n' || e.key === 'N') { next(); e.preventDefault(); }
        };
        const onKeyUp = (e) => {
            const m = MOVE[e.key];
            if (m) G.keys[m] = false;
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        // 테마 전환 → 현재 seed 로 지형 다시 칠하기(단계 유지).
        const themeObs = new MutationObserver(() => {
            const nd = isDark();
            if (nd === dark) return;
            dark = nd;
            const t = renderTerrain(makeField(G.seed), dark);
            G.terrain = t.canvas;
            G.summit = t.summit;
        });
        const labOs = document.querySelector('.lab-os');
        if (labOs) themeObs.observe(labOs, { attributes: true, attributeFilter: ['data-theme'] });

        buildSeed(todaySeed());

        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            themeObs.disconnect();
            if (audio) { try { audio.close(); } catch { /* 무시 */ } }
        };
    }, []);

    const onNext = useCallback(() => { ctrlRef.current?.next(); }, []);

    const verdictText = result && (
        result.verdict === 'win' ? '당신 승'
            : result.verdict === 'loss' ? '컴퓨터 승'
                : '막상막하'
    );
    const maxD = result ? Math.max(result.dYou, result.dCpu, 1) : 1;

    return (
        <LabShell
            title="APEX"
            eyebrow="read the contours, plant the flag"
            subtitle={'// 등고선만 보고 가장 높은 한 점(정상)을 컴퓨터보다 정확히 찍는 눈대중 대결 — 화살표로 겨냥, Enter로 깃발'}
            path="apex"
        >
            <section className="apex-wrap" aria-label="등고선 정상 찾기 대결">
                <div className="apex-hud k-mono" aria-hidden="true">
                    <span className="apex-seed">SEED {seedLabel(seed)}</span>
                    <span className="apex-tally">
                        <b className="you">나 {tally.win}</b>
                        <span className="mid"> · {tally.draw} · </span>
                        <b className="cpu">{tally.loss} 컴퓨터</b>
                    </span>
                </div>

                <div className="apex-stage">
                    <canvas ref={canvasRef} className="apex-canvas" aria-label="청사진 등고선 지도" />
                    {phase === 'aim' && (
                        <p className="apex-hint">가장 높은 곳을 찾아 <b>Enter</b></p>
                    )}
                </div>

                {phase === 'reveal' && result && (
                    <div className={`apex-verdict apex-${result.verdict}`}>
                        <span className="apex-vtag k-mono">summit revealed</span>
                        <h2 className="apex-vhead">{verdictText}</h2>
                        <div className="apex-bars">
                            <div className="apex-bar">
                                <span className="lbl you">당신</span>
                                <span className="track"><i className="fill you" style={{ width: `${(result.dYou / maxD) * 100}%` }} /></span>
                            </div>
                            <div className="apex-bar">
                                <span className="lbl cpu">컴퓨터</span>
                                <span className="track"><i className="fill cpu" style={{ width: `${(result.dCpu / maxD) * 100}%` }} /></span>
                            </div>
                        </div>
                        <p className="apex-vsub k-mono">막대가 짧을수록 정상에 가깝다</p>
                        <button type="button" className="apex-btn" onClick={onNext}>다음 지형 (N)</button>
                    </div>
                )}

                <p className="apex-legend k-mono" aria-hidden="true">
                    ← → ↑ ↓ 겨냥 · Enter 깃발 · N 다음 지형 &nbsp;·&nbsp; 촘촘·밝은 고리의 한가운데가 정상
                </p>

                <ReadBlock />
            </section>
        </LabShell>
    );
};

// 본문 — 등고선 읽기와 눈대중 대결.
const ReadBlock = () => (
    <section className="apex-read">
        <h3>가장 높은 곳은 선이 가장 촘촘하게 감긴 한가운데다</h3>
        <p>
            등고선은 <b>같은 높이를 잇는 닫힌 선</b>이다. 고리가 안으로 겹겹이 감길수록 위로
            솟은 봉우리이고, 그 고리들의 한가운데, 가장 안쪽 고리 안에 <b>정상</b>이 있다. 선이
            촘촘한 곳은 짧은 거리에 높이가 확 바뀌는 <b>가파른 비탈</b>, 성긴 곳은 완만한 땅이다.
            이 화면의 지형도 그렇게 만든다 — 여러 가우시안 봉우리를 더한 높이장에서, 화면 폭이
            일정하도록 등고선을 직접 그리고, 높을수록 바탕을 조금 더 밝게 칠했다.
        </p>
        <p>
            그런데 봉우리는 하나가 아니다. 비슷하게 감긴 <b>미끼 봉우리</b>가 있어, 눈이 먼저
            큰 고리에 끌리면 진짜 정상을 놓친다. 가장 밝고, 고리가 가장 촘촘하게 겹친 쪽 —
            거기 한 점을 화살표로 겨냥해 Enter로 깃발을 꽂는다. 그 순간 컴퓨터도 같은 지형을
            읽고 자기 깃발을 꽂는다. <b>정상에 더 가까운 쪽이 이긴다.</b>
        </p>
        <p>
            컴퓨터의 겨냥은 매번 정상에서 조금씩 빗나가게 정해져 있어, 지형을 <b>제대로 읽으면
            이길 수 있다</b>. 대충 큰 고리 가운데를 찍으면 미끼에 걸려 진다. 몇 판만 해보면,
            지도를 펼친 순간 눈이 먼저 <b>가장 안쪽 고리를 찾아 들어간다</b> — 지형을 읽는 눈이
            생기는 순간이다.
        </p>
        <p className="apex-disc">
            * 지형·컴퓨터의 겨냥·정답 정상은 모두 하나의 <b>seed</b>(우하단 도장)에서 결정된다.
            같은 seed면 언제 열어도 똑같은 지형·똑같은 승부다. ‘다음 지형’은 seed를 하나 올려
            새 지형을 편다. 전적은 이 브라우저에만 남는다.
        </p>
    </section>
);

export default Apex;
