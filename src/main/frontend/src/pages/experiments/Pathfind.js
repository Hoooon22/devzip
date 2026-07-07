import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Pathfind.css';

// PATHFIND — 격자 최단 경로 탐색 실험 (A* / Dijkstra / Greedy).
// 핵심: 자율주행·로봇 내비게이션의 밑바탕은 결국 "장애물 사이에서 목표까지 가장 짧은
// 길 찾기"다. 같은 격자·같은 장애물을 두고 탐색 방식만 바꾸면, 무엇을 우선순위로 삼느냐에
// 따라 "얼마나 넓게 헤매는가"와 "정말 최단인가"가 갈린다.
//   · Dijkstra  f = g        — 지금까지의 실제 비용만 본다. 사방으로 고르게 퍼진다(최단 보장).
//   · Greedy    f = h        — 목표까지의 추정 거리만 본다. 곧장 달려가 빠르지만 최단은 아니다.
//   · A*        f = g + h     — 둘을 더한다. 목표 쪽으로 치우쳐 훨씬 적게 헤매면서도 최단을 지킨다.

const COLS = 25;
const ROWS = 15;
const KEY = (r, c) => r * COLS + c;
const RC = (k) => [Math.floor(k / COLS), k % COLS];

const MODES = [
    { id: 'astar', label: 'A*', formula: 'f = g + h' },
    { id: 'dijkstra', label: 'Dijkstra', formula: 'f = g' },
    { id: 'greedy', label: 'Greedy', formula: 'f = h' },
];

const START0 = { r: 7, c: 3 };
const GOAL0 = { r: 7, c: 21 };

// 순수 탐색 — 방문 순서(visitedOrder)와 최종 경로(path)를 한 번에 계산해 두고,
// 렌더에서 이 결과를 한 칸씩 되감아(replay) 애니메이션한다. 알고리즘 자체는 동기로 유지.
function planPath(walls, start, goal, mode, diag) {
    const inb = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
    const isWall = (r, c) => walls.has(KEY(r, c));
    // octile(대각 허용) / manhattan(직교) — 둘 다 admissible 하므로 A*·Dijkstra는 최단을 보장.
    const hOf = (r, c) => {
        const dr = Math.abs(r - goal.r), dc = Math.abs(c - goal.c);
        return diag ? Math.max(dr, dc) + (Math.SQRT2 - 1) * Math.min(dr, dc) : dr + dc;
    };
    const fOf = (g, h) => (mode === 'dijkstra' ? g : mode === 'greedy' ? h : g + h);

    const sk = KEY(start.r, start.c);
    const gk = KEY(goal.r, goal.c);
    const gScore = new Map([[sk, 0]]);
    const hScore = new Map([[sk, hOf(start.r, start.c)]]);
    const fScore = new Map([[sk, fOf(0, hOf(start.r, start.c))]]);
    const seqNo = new Map([[sk, 0]]);
    const came = new Map();
    let seq = 1;

    const open = new Set([sk]);
    const closed = new Set();
    const visitedOrder = [];

    const steps = diag
        ? [[-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1],
           [-1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [1, 1, Math.SQRT2]]
        : [[-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1]];

    while (open.size) {
        // open에서 f 최소 노드 추출 — 동점이면 h 작은 것, 그다음 나중에 들어온 것(LIFO) 우선.
        let best = null, bf = Infinity, bh = Infinity, bs = -1;
        for (const k of open) {
            const fv = fScore.get(k);
            const hv = hScore.get(k);
            if (fv < bf || (fv === bf && (hv < bh || (hv === bh && seqNo.get(k) > bs)))) {
                best = k; bf = fv; bh = hv; bs = seqNo.get(k);
            }
        }
        open.delete(best);
        closed.add(best);
        visitedOrder.push(best);
        if (best === gk) break;

        const [r, c] = RC(best);
        for (const [dr, dc, cost] of steps) {
            const nr = r + dr, nc = c + dc;
            if (!inb(nr, nc) || isWall(nr, nc)) continue;
            if (cost > 1 && (isWall(r, nc) || isWall(nr, c))) continue; // 대각선 모서리 관통 금지
            const nk = KEY(nr, nc);
            if (closed.has(nk)) continue;
            const tentative = gScore.get(best) + cost;
            if (!gScore.has(nk) || tentative < gScore.get(nk)) {
                came.set(nk, best);
                gScore.set(nk, tentative);
                if (!hScore.has(nk)) hScore.set(nk, hOf(nr, nc));
                fScore.set(nk, fOf(tentative, hScore.get(nk)));
                if (!seqNo.has(nk)) seqNo.set(nk, seq++);
                open.add(nk);
            }
        }
    }

    let path = [];
    if (closed.has(gk)) {
        let cur = gk;
        while (cur !== undefined) { path.push(cur); cur = came.get(cur); }
        path.reverse();
    }
    return { visitedOrder, path, found: closed.has(gk), cost: gScore.get(gk) };
}

const Pathfind = () => {
    const [walls, setWalls] = useState(() => new Set());
    const [start, setStart] = useState(START0);
    const [goal, setGoal] = useState(GOAL0);
    const [mode, setMode] = useState('astar');
    const [diag, setDiag] = useState(false);
    const [speed, setSpeed] = useState(5);

    const [result, setResult] = useState(null);
    const [reveal, setReveal] = useState(0);
    const [running, setRunning] = useState(false);
    const drag = useRef(null); // 'draw' | 'erase' | 'start' | 'goal'

    const startKey = useMemo(() => KEY(start.r, start.c), [start]);
    const goalKey = useMemo(() => KEY(goal.r, goal.c), [goal]);

    // 결과에서 칸→순번 조회표를 만들어, reveal 값에 따라 각 칸의 노출 여부를 O(1)로 판정.
    const maps = useMemo(() => {
        if (!result) return null;
        const vi = new Map();
        result.visitedOrder.forEach((k, i) => vi.set(k, i));
        const pi = new Map();
        result.path.forEach((k, i) => pi.set(k, i));
        return { vi, pi };
    }, [result]);

    const total = result ? result.visitedOrder.length + result.path.length : 0;
    const visitReveal = result ? Math.min(reveal, result.visitedOrder.length) : 0;
    const pathReveal = result ? Math.max(0, reveal - result.visitedOrder.length) : 0;

    // 편집(벽/시작/목표 변경)이 일어나면 이전 시각화를 지워 격자를 깨끗하게.
    const clearRun = useCallback(() => { setResult(null); setReveal(0); setRunning(false); }, []);

    // 재생 루프 — 매 틱 speed 칸씩 노출을 늘린다.
    useEffect(() => {
        if (!running || !result) return undefined;
        const id = setInterval(() => {
            setReveal((rv) => Math.min(rv + speed, total));
        }, 28);
        return () => clearInterval(id);
    }, [running, result, speed, total]);

    useEffect(() => {
        if (running && result && reveal >= total) setRunning(false);
    }, [reveal, running, result, total]);

    const run = useCallback(() => {
        const res = planPath(walls, start, goal, mode, diag);
        setResult(res);
        setReveal(0);
        setRunning(true);
    }, [walls, start, goal, mode, diag]);

    // ---- 격자 편집 ----
    const applyCell = useCallback((r, c) => {
        const k = KEY(r, c);
        const m = drag.current;
        if (!m) return;
        if (m === 'start') {
            if (k !== goalKey && !walls.has(k)) { setStart({ r, c }); clearRun(); }
            return;
        }
        if (m === 'goal') {
            if (k !== startKey && !walls.has(k)) { setGoal({ r, c }); clearRun(); }
            return;
        }
        if (k === startKey || k === goalKey) return;
        setWalls((prev) => {
            const has = prev.has(k);
            if ((m === 'draw' && has) || (m === 'erase' && !has)) return prev;
            const next = new Set(prev);
            if (m === 'draw') next.add(k); else next.delete(k);
            return next;
        });
        clearRun();
    }, [walls, startKey, goalKey, clearRun]);

    const onDown = useCallback((r, c) => (e) => {
        e.preventDefault();
        const k = KEY(r, c);
        if (k === startKey) drag.current = 'start';
        else if (k === goalKey) drag.current = 'goal';
        else drag.current = walls.has(k) ? 'erase' : 'draw';
        applyCell(r, c);
    }, [startKey, goalKey, walls, applyCell]);

    const onEnter = useCallback((r, c) => () => {
        if (drag.current) applyCell(r, c);
    }, [applyCell]);

    const endDrag = useCallback(() => { drag.current = null; }, []);

    const randomMaze = useCallback(() => {
        const next = new Set();
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const k = KEY(r, c);
                if (k === startKey || k === goalKey) continue;
                // 시작/목표 바로 옆은 비워 항상 나갈 길을 남긴다.
                if (Math.abs(r - start.r) + Math.abs(c - start.c) <= 1) continue;
                if (Math.abs(r - goal.r) + Math.abs(c - goal.c) <= 1) continue;
                if (Math.random() < 0.28) next.add(k);
            }
        }
        setWalls(next);
        clearRun();
    }, [startKey, goalKey, start, goal, clearRun]);

    const clearWalls = useCallback(() => { setWalls(new Set()); clearRun(); }, [clearRun]);

    const reset = useCallback(() => {
        setWalls(new Set());
        setStart(START0);
        setGoal(GOAL0);
        clearRun();
    }, [clearRun]);

    const cellClass = (r, c) => {
        const k = KEY(r, c);
        if (k === startKey) return 'pf-cell pf-start';
        if (k === goalKey) return 'pf-cell pf-goal';
        if (walls.has(k)) return 'pf-cell pf-wall';
        if (maps) {
            const pidx = maps.pi.get(k);
            if (pidx != null && pidx < pathReveal) return 'pf-cell pf-path';
            const vidx = maps.vi.get(k);
            if (vidx != null && vidx < visitReveal) return 'pf-cell pf-visited';
        }
        return 'pf-cell';
    };

    // 통계
    const explored = visitReveal;
    const walkable = ROWS * COLS - walls.size;
    const done = result && reveal >= total;
    const pathSteps = result && result.found ? result.path.length - 1 : null;
    const optimal = mode !== 'greedy';

    return (
        <LabShell
            title="PATHFIND"
            eyebrow="path planning"
            subtitle={'// 장애물 사이에서 목표까지 — 무엇을 우선하느냐로 헤매는 넓이가 갈린다'}
            path="pathfind.exe"
        >
            <section className="k-win pf-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/grid/</span>search</span>
                    <span className="meta k-mono">{MODES.find((m) => m.id === mode).formula}</span>
                </div>

                <div className="pf-toolbar">
                    <div className="pf-modes" role="group" aria-label="탐색 방식">
                        {MODES.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                className={`pf-mode ${mode === m.id ? 'is-on' : ''}`}
                                onClick={() => { setMode(m.id); clearRun(); }}
                            >
                                <b>{m.label}</b>
                                <span className="pf-mode-f k-mono">{m.formula}</span>
                            </button>
                        ))}
                    </div>
                    <label className="pf-check k-mono">
                        <input type="checkbox" checked={diag} onChange={(e) => { setDiag(e.target.checked); clearRun(); }} />
                        대각선 이동
                    </label>
                    <div className="pf-ctrl">
                        <label className="pf-ctrl-label k-mono" htmlFor="pf-speed">속도 <b>{speed}</b></label>
                        <input id="pf-speed" type="range" min="1" max="14" step="1"
                            value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
                    </div>
                    <div className="pf-actions">
                        <button type="button" className="pf-btn" onClick={run} disabled={running}>
                            {running ? '탐색 중…' : '▶ 탐색'}
                        </button>
                        <button type="button" className="pf-btn pf-btn-ghost" onClick={randomMaze}>미로 생성</button>
                        <button type="button" className="pf-btn pf-btn-ghost" onClick={clearWalls}>벽 지움</button>
                        <button type="button" className="pf-btn pf-btn-ghost" onClick={reset}>리셋</button>
                    </div>
                </div>

                <div className="pf-stage">
                    <div className="pf-grid-col">
                        <div
                            className="pf-grid"
                            style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
                            onPointerUp={endDrag}
                            onPointerLeave={endDrag}
                        >
                            {Array.from({ length: ROWS * COLS }, (_, k) => {
                                const [r, c] = RC(k);
                                return (
                                    <div
                                        key={k}
                                        className={cellClass(r, c)}
                                        onPointerDown={onDown(r, c)}
                                        onPointerEnter={onEnter(r, c)}
                                    />
                                );
                            })}
                        </div>
                        <p className="pf-grid-foot k-mono">
                            빈칸을 드래그해 <b>벽</b>을 그리고, <b>초록</b>(시작)·<b>빨강</b>(목표)을 끌어 옮기세요 · 미로를 만든 뒤 <b>▶ 탐색</b>
                        </p>
                    </div>

                    <div className="pf-right">
                        <div className="pf-stats">
                            <div className="pf-stat">
                                <span className="pf-stat-lab k-mono">헤맨 칸</span>
                                <span className="pf-stat-num k-mono">{explored}</span>
                                <span className="pf-stat-sub k-mono">/ {walkable} 이동 가능</span>
                            </div>
                            <div className="pf-stat">
                                <span className="pf-stat-lab k-mono">경로 길이</span>
                                <span className="pf-stat-num k-mono">
                                    {done ? (pathSteps != null ? pathSteps : '—') : '·'}
                                </span>
                                <span className="pf-stat-sub k-mono">
                                    {done ? (result.found ? '칸' : '도달 불가') : '탐색 대기'}
                                </span>
                            </div>
                        </div>

                        <div className="pf-legend">
                            <div className="pf-legend-head k-mono">범례</div>
                            <ul className="pf-legend-list">
                                <li><span className="pf-sw pf-sw-start" /> 시작</li>
                                <li><span className="pf-sw pf-sw-goal" /> 목표</li>
                                <li><span className="pf-sw pf-sw-wall" /> 벽 (장애물)</li>
                                <li><span className="pf-sw pf-sw-visited" /> 탐색이 열어본 칸</li>
                                <li><span className="pf-sw pf-sw-path" /> 찾아낸 최단 경로</li>
                            </ul>
                        </div>

                        <div className={`pf-verdict ${done ? 'is-on' : ''}`}>
                            {done ? (
                                <>
                                    <span className="pf-verdict-lab k-mono">{MODES.find((m) => m.id === mode).label} 결과</span>
                                    <p className="pf-verdict-txt">
                                        {result.found
                                            ? <>{explored}칸을 열어보고 {pathSteps}칸짜리 경로를 찾았습니다. </>
                                            : <>{explored}칸을 다 열었지만 목표에 닿지 못했습니다 — 벽으로 막혀 있습니다. </>}
                                        {result.found && (optimal
                                            ? <b>최단 경로가 보장됩니다.</b>
                                            : <b>다만 이 경로가 최단이라는 보장은 없습니다.</b>)}
                                    </p>
                                </>
                            ) : (
                                <p className="pf-verdict-hint k-mono">
                                    같은 미로에서 방식을 바꿔 <b>헤맨 칸</b> 수를 비교해 보세요.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win pf-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="pf-foot">
                    <p>
                        {'자율주행차·물류 로봇·게임 속 NPC가 목적지로 향할 때 밑바탕에서 도는 것은 결국 '}
                        <b>{'격자 위 최단 경로 탐색'}</b>{'이다. 지도를 칸으로 나누고, 벽(장애물)을 피해 시작에서 '}
                        {'목표까지 가장 짧은 길을 찾는다. 방법은 여럿이지만 뼈대는 하나 — 열어볼 후보 칸들을 '}
                        {'우선순위 큐에 담고, 가장 유망한 칸부터 하나씩 펼쳐 나간다. 무엇을 "유망하다"고 보느냐가 '}
                        {'전부를 가른다.'}
                    </p>
                    <p>
                        <b>Dijkstra</b>{'는 시작점에서 지금까지 실제로 걸린 비용 '}<b>g</b>{'만 본다. 목표가 어느 쪽인지 '}
                        {'모르는 채 사방으로 고르게 물결처럼 퍼져 나간다 — 반드시 최단을 찾지만 넓게 헤맨다. '}
                        <b>Greedy</b>{'는 반대로 목표까지의 추정 거리 '}<b>h</b>{'만 본다. 곧장 목표를 향해 달려가 '}
                        {'빠르지만, 벽에 부딪히면 엉뚱하게 돌아 최단이 아닌 길로 새기 쉽다.'}
                    </p>
                    <p>
                        <b>A*</b>{'는 둘을 더한다 — '}<b>f = g + h</b>{'. "여기까지 실제로 든 비용"에 "앞으로 남은 '}
                        {'거리 추정"을 합쳐, 목표 쪽으로 치우쳐 탐색하면서도 최단을 놓치지 않는다. h가 실제 거리를 '}
                        {'넘겨 부풀리지 않는 한(admissible) A*의 경로는 항상 최단이다. 같은 미로를 세 방식으로 돌려 '}
                        <b>헤맨 칸</b>{' 수를 비교해 보면, A*가 Dijkstra보다 훨씬 적게 열어보면서 같은 길이의 경로를 '}
                        {'찾아내는 것을 볼 수 있다 — 좋은 heuristic 하나가 탐색을 이렇게 좁힌다.'}
                    </p>
                    <p className="pf-disclaimer">
                        {'* 격자·4/8방향 이동·admissible heuristic의 핵심만 보여주는 데모입니다. 실제 내비게이션의 '}
                        {'연속 공간 계획, 가중치 지형, 경로 평활화(smoothing) 등은 단순화했습니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Pathfind;
