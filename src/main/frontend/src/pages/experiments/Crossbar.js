import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Crossbar.css';

// CROSSBAR — 사다리타기(고스트 레그)를 키보드로 놓는 공평 배정 도구
//   (규칙과 게임 × 진짜 쓰는 도구 × 키보드 조작계 × 숫자가 하나도 안 보인다).
//   소재: 사다리타기 — 누가 뭘 할지/뭘 받을지 공평하게 나누는 실제 규칙.
//         위상학적으로 보면 서로 다른 칸으로만 이어지는 순열(완전 짝짓기)이라,
//         두 신호가 절대 겹치지 않는다 = 크로스바 라우팅 네트워크.
//   형식: 진짜 쓰는 도구 — 점수/승패가 아니라 "정말 정하는" 배정기.
//   기술: 키보드가 조작계 — ← → ↑ ↓ 로 커서, Space 로 가로대, Enter 로 신호를 흘린다.
//         (렌더는 Canvas 2D, 트레이스가 회로처럼 흐른다. 마우스/터치도 보조로 열어 둠.)
//   제약: 숫자가 하나도 안 보인다 — 사람은 색 키캡, 결과는 그림(이모지)으로만 말한다.

const ROWS = 9;
const MIN_LANES = 2;
const MAX_LANES = 8;
const DURATION = 1500; // 신호 라우팅 애니메이션(ms)

// 참가자 색(키캡) — 단색만, 보라 그라데이션 금지.
const COLORS = ['#F5A623', '#3FC7C0', '#FF6B5C', '#C7E14C', '#5B8DEF', '#F45D9C', '#B98CFF', '#F2D14E'];
// 도착 칸(결과) — 집안일/보상 등, 숫자 없이 그림으로만.
const OUTCOMES = ['🧹', '☕', '💸', '🎉', '🍜', '🗑️', '🎁', '🚗'];

// 회로기판 팔레트 — 셸 테마와 무관하게 고정(암실/네온 톤과 겹치지 않게).
const BG = '#0c2b28';
const BG2 = '#123f38';
const TRACE = '#cdb489';
const TRACE_DIM = '#4f6157';
const PAD = '#e9d9b0';

const rk = (r, g) => `${r}:${g}`;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
};

// 무작위 초기 가로대(인접 겹침 금지) — 처음부터 살아 있는 판을 준다.
const seedRungs = (lanes) => {
    const set = new Set();
    for (let r = 0; r < ROWS; r += 1) {
        for (let g = 0; g < lanes - 1; g += 1) {
            if (Math.random() < 0.24 && !set.has(rk(r, g - 1))) set.add(rk(r, g));
        }
    }
    return set;
};

// 판 좌표계
const geom = (w, h, lanes) => {
    const mx = Math.max(48, w * 0.1);
    const topY = 60;
    const botY = h - 60;
    const laneGap = lanes > 1 ? (w - mx * 2) / (lanes - 1) : 0;
    const laneX = (i) => mx + i * laneGap;
    const rowY = (r) => topY + ((botY - topY) * (r + 1)) / (ROWS + 1);
    return { topY, botY, laneX, rowY };
};

// 각 시작 기둥에서 아래로 따라간 경로(지그재그) + 세그먼트 길이
const buildPaths = (lanes, rungs, g) => {
    const paths = [];
    for (let s = 0; s < lanes; s += 1) {
        let lane = s;
        const pts = [{ x: g.laneX(lane), y: g.topY }];
        for (let r = 0; r < ROWS; r += 1) {
            if (rungs.has(rk(r, lane))) {
                pts.push({ x: g.laneX(lane), y: g.rowY(r) });
                lane += 1;
                pts.push({ x: g.laneX(lane), y: g.rowY(r) });
            } else if (lane > 0 && rungs.has(rk(r, lane - 1))) {
                pts.push({ x: g.laneX(lane), y: g.rowY(r) });
                lane -= 1;
                pts.push({ x: g.laneX(lane), y: g.rowY(r) });
            }
        }
        pts.push({ x: g.laneX(lane), y: g.botY });

        let total = 0;
        const segs = [];
        for (let i = 1; i < pts.length; i += 1) {
            const a = pts[i - 1];
            const b = pts[i];
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            segs.push({ a, b, len });
            total += len;
        }
        paths.push({ start: s, end: lane, pts, segs, total });
    }
    return paths;
};

const pointAt = (p, frac) => {
    let d = frac * p.total;
    for (let i = 0; i < p.segs.length; i += 1) {
        const s = p.segs[i];
        if (d <= s.len || i === p.segs.length - 1) {
            const t = s.len ? clamp(d / s.len, 0, 1) : 1;
            return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
        }
        d -= s.len;
    }
    return p.pts[p.pts.length - 1];
};

const drawKeycap = (ctx, x, y, color) => {
    const s = 13;
    roundRect(ctx, x - s, y - s, s * 2, s * 2, 5);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    roundRect(ctx, x - s + 3, y - s + 3, s * 2 - 6, 5, 3);
    ctx.fill();
};

const drawOutcome = (ctx, x, y, emoji) => {
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#12403a';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = PAD;
    ctx.stroke();
    ctx.font = '18px system-ui, "Apple Color Emoji", "Segoe UI Emoji"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y + 1);
};

const Crossbar = () => {
    const canvasRef = useRef(null);
    const wrapRef = useRef(null);
    const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
    const boardRef = useRef({ lanes: 5, rungs: seedRungs(5), cursor: { row: 4, gap: 0 }, block: 0 });
    const revealRef = useRef({ active: false, start: 0, frac: 0, done: false, paths: null });
    const rafRef = useRef(0);
    const phaseRef = useRef('build');

    const [phase, setPhase] = useState('build'); // build | running | done
    const [result, setResult] = useState(null);

    const setPhaseBoth = useCallback((p) => {
        phaseRef.current = p;
        setPhase(p);
    }, []);

    // ── 그리기 ─────────────────────────────────────────────
    const drawAll = useCallback((ts) => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const { w, h, dpr } = sizeRef.current;
        if (!w || !h) return;
        const b = boardRef.current;
        const g = geom(w, h, b.lanes);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, BG2);
        grad.addColorStop(1, BG);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // 실크 노드(교차점) — PCB 느낌
        ctx.fillStyle = 'rgba(205,180,137,0.12)';
        for (let r = 0; r < ROWS; r += 1) {
            for (let i = 0; i < b.lanes; i += 1) {
                ctx.beginPath();
                ctx.arc(g.laneX(i), g.rowY(r), 1.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 세로 기둥(트레이스)
        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = TRACE_DIM;
        for (let i = 0; i < b.lanes; i += 1) {
            ctx.beginPath();
            ctx.moveTo(g.laneX(i), g.topY);
            ctx.lineTo(g.laneX(i), g.botY);
            ctx.stroke();
        }

        // 가로대
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = TRACE;
        b.rungs.forEach((s) => {
            const [r, gg] = s.split(':').map(Number);
            if (gg > b.lanes - 2) return;
            const y = g.rowY(r);
            ctx.beginPath();
            ctx.moveTo(g.laneX(gg), y);
            ctx.lineTo(g.laneX(gg + 1), y);
            ctx.stroke();
        });

        // 패드(위=키캡, 아래=결과 그림)
        for (let i = 0; i < b.lanes; i += 1) {
            drawKeycap(ctx, g.laneX(i), g.topY, COLORS[i % COLORS.length]);
            drawOutcome(ctx, g.laneX(i), g.botY, OUTCOMES[i % OUTCOMES.length]);
        }

        // 신호(라우팅) 트레일
        const rv = revealRef.current;
        if (rv.paths) {
            const frac = rv.frac;
            rv.paths.forEach((p) => {
                const col = COLORS[p.start % COLORS.length];
                ctx.strokeStyle = col;
                ctx.lineWidth = 4;
                ctx.shadowColor = col;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(p.pts[0].x, p.pts[0].y);
                const litLen = frac * p.total;
                let d = 0;
                for (let i = 0; i < p.segs.length; i += 1) {
                    const seg = p.segs[i];
                    if (d + seg.len <= litLen) {
                        ctx.lineTo(seg.b.x, seg.b.y);
                        d += seg.len;
                    } else {
                        const t = seg.len ? (litLen - d) / seg.len : 1;
                        ctx.lineTo(seg.a.x + (seg.b.x - seg.a.x) * t, seg.a.y + (seg.b.y - seg.a.y) * t);
                        break;
                    }
                }
                ctx.stroke();
                ctx.shadowBlur = 0;

                const hp = pointAt(p, frac);
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(hp.x, hp.y, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(hp.x, hp.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // 커서(놓을 자리) — build 단계만
        if (phaseRef.current === 'build') {
            const y = g.rowY(b.cursor.row);
            const x1 = g.laneX(b.cursor.gap);
            const x2 = g.laneX(b.cursor.gap + 1);
            const pulse = 0.5 + 0.5 * Math.sin(ts / 240);
            const blocked = b.block > 0;
            if (b.block > 0) b.block -= 1;
            ctx.strokeStyle = blocked ? '#ff5a5a' : `rgba(233,217,176,${0.32 + 0.5 * pulse})`;
            ctx.lineWidth = blocked ? 4 : 3;
            ctx.setLineDash([6, 5]);
            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = ctx.strokeStyle;
            [x1, x2].forEach((xx) => {
                ctx.beginPath();
                ctx.arc(xx, y, 3.2, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }, []);

    // ── 동작 ───────────────────────────────────────────────
    const backToBuild = useCallback(() => {
        revealRef.current = { active: false, start: 0, frac: 0, done: false, paths: null };
        setResult(null);
        setPhaseBoth('build');
    }, [setPhaseBoth]);

    const run = useCallback(() => {
        const b = boardRef.current;
        const { w, h } = sizeRef.current;
        if (!w || !h) return;
        const g = geom(w, h, b.lanes);
        revealRef.current = { active: true, start: 0, frac: 0, done: false, paths: buildPaths(b.lanes, b.rungs, g) };
        setResult(null);
        setPhaseBoth('running');
    }, [setPhaseBoth]);

    const resetAll = useCallback(() => {
        const b = boardRef.current;
        b.rungs = seedRungs(b.lanes);
        b.cursor.row = clamp(b.cursor.row, 0, ROWS - 1);
        b.cursor.gap = clamp(b.cursor.gap, 0, b.lanes - 2);
        backToBuild();
    }, [backToBuild]);

    const toggleRung = useCallback(() => {
        const b = boardRef.current;
        const { row, gap } = b.cursor;
        const k = rk(row, gap);
        if (b.rungs.has(k)) {
            b.rungs.delete(k);
            return;
        }
        if (b.rungs.has(rk(row, gap - 1)) || b.rungs.has(rk(row, gap + 1))) {
            b.block = 7; // 인접 겹침 금지 — 빨간 깜빡임
            return;
        }
        b.rungs.add(k);
    }, []);

    const changeLanes = useCallback((d) => {
        const b = boardRef.current;
        const next = clamp(b.lanes + d, MIN_LANES, MAX_LANES);
        if (next === b.lanes) return;
        b.lanes = next;
        const nx = new Set();
        b.rungs.forEach((s) => {
            const [, g] = s.split(':').map(Number);
            if (g <= next - 2) nx.add(s);
        });
        b.rungs = nx;
        b.cursor.gap = clamp(b.cursor.gap, 0, next - 2);
        backToBuild();
    }, [backToBuild]);

    // ← → ↑ ↓ 로 커서 이동
    const moveCursor = useCallback((dgap, drow) => {
        const b = boardRef.current;
        b.cursor.gap = clamp(b.cursor.gap + dgap, 0, b.lanes - 2);
        b.cursor.row = clamp(b.cursor.row + drow, 0, ROWS - 1);
    }, []);

    // ── 캔버스 크기 + rAF 루프 ─────────────────────────────
    useEffect(() => {
        const cv = canvasRef.current;
        const wrap = wrapRef.current;
        if (!cv || !wrap) return undefined;

        const measure = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = wrap.clientWidth;
            const h = wrap.clientHeight;
            sizeRef.current = { w, h, dpr };
            cv.width = Math.round(w * dpr);
            cv.height = Math.round(h * dpr);
            cv.style.width = `${w}px`;
            cv.style.height = `${h}px`;
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(wrap);

        const frame = (ts) => {
            const rv = revealRef.current;
            if (rv.active) {
                if (!rv.start) rv.start = ts;
                rv.frac = clamp((ts - rv.start) / DURATION, 0, 1);
                if (rv.frac >= 1 && !rv.done) {
                    rv.done = true;
                    rv.active = false;
                    const res = rv.paths.map((p) => ({
                        color: COLORS[p.start % COLORS.length],
                        outcome: OUTCOMES[p.end % OUTCOMES.length],
                    }));
                    setResult(res);
                    setPhaseBoth('done');
                }
            }
            drawAll(ts);
            rafRef.current = requestAnimationFrame(frame);
        };
        rafRef.current = requestAnimationFrame(frame);

        return () => {
            ro.disconnect();
            cancelAnimationFrame(rafRef.current);
        };
    }, [drawAll, setPhaseBoth]);

    // ── 키보드 조작계 (마운트 시 1회 바인딩) ────────────────
    useEffect(() => {
        const onKey = (e) => {
            const k = e.key;
            const nav = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Spacebar'];
            if (nav.includes(k)) e.preventDefault();
            if (revealRef.current.active) return;

            // 결과 화면에서 편집 키를 누르면 다시 배치 모드로
            if (phaseRef.current === 'done' && (nav.includes(k) || k === '[' || k === ']')) {
                backToBuild();
            }

            switch (k) {
                case 'ArrowLeft': moveCursor(-1, 0); break;
                case 'ArrowRight': moveCursor(1, 0); break;
                case 'ArrowUp': moveCursor(0, -1); break;
                case 'ArrowDown': moveCursor(0, 1); break;
                case ' ':
                case 'Spacebar': toggleRung(); break;
                case 'Enter': run(); break;
                case 'r':
                case 'R': resetAll(); break;
                case '[': changeLanes(-1); break;
                case ']': changeLanes(1); break;
                default: break;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [moveCursor, toggleRung, run, resetAll, changeLanes, backToBuild]);

    // ── 마우스/터치 보조 — 슬롯 근처를 눌러 가로대 토글 ─────
    const onPointerDown = useCallback((e) => {
        if (phaseRef.current === 'running') return;
        if (phaseRef.current === 'done') backToBuild();
        const cv = canvasRef.current;
        const b = boardRef.current;
        const { w, h } = sizeRef.current;
        if (!cv || !w) return;
        const g = geom(w, h, b.lanes);
        const rect = cv.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        let row = 0;
        let best = Infinity;
        for (let r = 0; r < ROWS; r += 1) {
            const d = Math.abs(g.rowY(r) - y);
            if (d < best) { best = d; row = r; }
        }
        let gap = 0;
        best = Infinity;
        for (let gg = 0; gg <= b.lanes - 2; gg += 1) {
            const cx = (g.laneX(gg) + g.laneX(gg + 1)) / 2;
            const d = Math.abs(cx - x);
            if (d < best) { best = d; gap = gg; }
        }
        b.cursor.row = row;
        b.cursor.gap = gap;
        toggleRung();
    }, [backToBuild, toggleRung]);

    const statusText = phase === 'running'
        ? '신호가 내려가는 중…'
        : phase === 'done'
            ? '도착 — 색마다 서로 다른 칸에 닿았다'
            : '가로대를 놓고 신호를 흘려 보라';

    return (
        <LabShell
            title="CROSSBAR"
            eyebrow="a fair ladder, wired by keys"
            subtitle={'// 사다리타기를 키보드로 놓는다 — 가로대를 얹고 신호를 흘리면, 색 키캡마다 서로 다른 칸에 닿는다. 아무도 겹치지 않는다'}
            path="crossbar"
        >
            <section className="cb-wrap" aria-label="사다리타기 배정 도구">
                <div className="cb-board" ref={wrapRef}>
                    <canvas
                        ref={canvasRef}
                        className="cb-canvas"
                        role="img"
                        aria-label="회로기판 위 사다리타기 — 위쪽 색 키캡에서 아래쪽 그림 칸으로 신호가 이어진다"
                        onPointerDown={onPointerDown}
                    />
                    <span className={`cb-status${phase === 'running' ? ' is-run' : ''}`}>{statusText}</span>
                </div>

                <div className="cb-under">
                    {/* 조작계 — 키캡으로만 안내(숫자 없음) */}
                    <div className="cb-keys" aria-label="키보드 조작">
                        <span className="cb-kgroup">
                            <kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd>
                            <em>커서</em>
                        </span>
                        <span className="cb-kgroup">
                            <kbd className="wide">Space</kbd>
                            <em>가로대</em>
                        </span>
                        <span className="cb-kgroup">
                            <kbd className="wide accent">Enter</kbd>
                            <em>흘리기</em>
                        </span>
                        <span className="cb-kgroup">
                            <kbd>[</kbd><kbd>]</kbd>
                            <em>기둥</em>
                        </span>
                        <span className="cb-kgroup">
                            <kbd>R</kbd>
                            <em>새 판</em>
                        </span>
                    </div>

                    {/* 결과 — 색 키캡 → 그림 (숫자 없이 짝만) */}
                    {result ? (
                        <div className="cb-result" aria-label="배정 결과">
                            <div className="cb-pairs">
                                {result.map((r) => (
                                    <span className="cb-pair" key={`${r.color}-${r.outcome}`}>
                                        <span className="cb-cap" style={{ background: r.color }} />
                                        <span className="cb-arrow">→</span>
                                        <span className="cb-out">{r.outcome}</span>
                                    </span>
                                ))}
                            </div>
                            <p className="cb-note">
                                {'◆ 사다리타기는 어느 가로대를 놓아도 서로 다른 칸으로만 이어진다 — 두 신호가 절대 겹치지 않는 완전한 짝짓기(순열)다.'}
                            </p>
                        </div>
                    ) : (
                        <p className="cb-hint">{'◆ 위는 사람(색 키캡), 아래는 몫(그림). 가로대를 놓을수록 도착 칸이 뒤섞인다.'}</p>
                    )}
                </div>
            </section>
        </LabShell>
    );
};

export default Crossbar;
