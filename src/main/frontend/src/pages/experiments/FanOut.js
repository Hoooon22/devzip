import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/FanOut.css';

const MAX_WORKERS = 8;

// 작고 빠른 시드 난수 — 같은 시드면 같은 작업 그래프
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// 하나의 목표를 여러 층(layer)의 하위 작업으로 분해한 의존성 그래프(DAG)를 만든다.
// 각 작업은 소요 시간(dur)과 선행 작업(deps)을 가진다.
function buildGraph(seed) {
    const rnd = mulberry32((seed * 2654435761) >>> 0);
    const layerCount = 4 + Math.floor(rnd() * 2); // 4~5층
    const layers = [];
    let id = 0;
    for (let l = 0; l < layerCount; l++) {
        // 첫 층과 끝 층은 가늘게(수렴), 가운데는 넓게(팬아웃)
        const isEdge = l === 0 || l === layerCount - 1;
        const n = isEdge ? 1 + Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 3);
        const ids = [];
        for (let k = 0; k < n; k++) ids.push(id++);
        layers.push(ids);
    }

    const tasks = [];
    layers.forEach((ids, l) => {
        ids.forEach((tid) => {
            const deps = [];
            if (l > 0) {
                const prev = layers[l - 1];
                // 직전 층에서 1~2개를 선행 작업으로 연결
                const want = 1 + (rnd() < 0.5 ? 1 : 0);
                const pool = [...prev];
                for (let w = 0; w < want && pool.length; w++) {
                    const idx = Math.floor(rnd() * pool.length);
                    deps.push(pool.splice(idx, 1)[0]);
                }
            }
            tasks.push({
                id: tid,
                layer: l,
                dur: 2 + Math.floor(rnd() * 7), // 2~8 틱
                deps,
            });
        });
    });
    return tasks;
}

// 임계 경로 분석: 각 작업의 가장 이른 시작(tlevel)과 바닥 레벨(blevel)을 계산.
// criticalPath = 의존성 사슬 중 가장 긴 누적 시간 = 일꾼이 무한해도 깰 수 없는 하한.
function analyze(tasks) {
    const byId = new Map(tasks.map((t) => [t.id, t]));
    const succ = new Map(tasks.map((t) => [t.id, []]));
    tasks.forEach((t) => t.deps.forEach((d) => succ.get(d).push(t.id)));

    // tlevel: 가장 이른 시작 시각 (위상 순서 = id 오름차순으로 충분, 층 구조라 보장)
    const tlevel = new Map();
    tasks.forEach((t) => {
        let est = 0;
        t.deps.forEach((d) => {
            const dt = byId.get(d);
            est = Math.max(est, tlevel.get(d) + dt.dur);
        });
        tlevel.set(t.id, est);
    });

    // blevel: 자신 포함 후속 사슬 중 최장 (역순 처리)
    const blevel = new Map();
    [...tasks].reverse().forEach((t) => {
        let b = 0;
        succ.get(t.id).forEach((s) => {
            b = Math.max(b, blevel.get(s));
        });
        blevel.set(t.id, b + t.dur);
    });

    let criticalPath = 0;
    tasks.forEach((t) => {
        criticalPath = Math.max(criticalPath, tlevel.get(t.id) + t.dur);
    });

    const totalWork = tasks.reduce((s, t) => s + t.dur, 0);
    const critical = new Set(
        tasks
            .filter((t) => tlevel.get(t.id) + blevel.get(t.id) === criticalPath)
            .map((t) => t.id)
    );
    return { blevel, criticalPath, totalWork, critical };
}

// 이벤트 기반 리스트 스케줄러: 비어있는 일꾼이 준비된 작업을
// 바닥 레벨(긴 사슬) 우선으로 집어든다. P명일 때의 타임라인을 만든다.
function schedule(tasks, blevel, P) {
    const byId = new Map(tasks.map((t) => [t.id, t]));
    const completed = new Set();
    const started = new Set();
    let running = [];
    const freeWorkers = [];
    for (let w = 0; w < P; w++) freeWorkers.push(w);
    let time = 0;
    const placed = [];

    let guard = 0;
    while (completed.size < tasks.length && guard++ < 10000) {
        const ready = tasks
            .filter((t) => !started.has(t.id) && t.deps.every((d) => completed.has(d)))
            .sort((a, b) => blevel.get(b.id) - blevel.get(a.id));

        for (const t of ready) {
            if (freeWorkers.length === 0) break;
            const w = freeWorkers.shift();
            started.add(t.id);
            const finish = time + t.dur;
            running.push({ id: t.id, finish, worker: w });
            placed.push({ id: t.id, start: time, finish, worker: w, dur: t.dur });
        }

        if (running.length === 0) break; // 안전장치(정상 그래프면 도달 안 함)
        const nextFinish = Math.min(...running.map((r) => r.finish));
        time = nextFinish;
        const done = running.filter((r) => r.finish === nextFinish);
        done.forEach((r) => {
            completed.add(r.id);
            freeWorkers.push(r.worker);
        });
        running = running.filter((r) => r.finish !== nextFinish);
    }

    const makespan = placed.reduce((m, p) => Math.max(m, p.finish), 0);
    return { placed, makespan, byId };
}

const LANE_COLORS = ['#5a8a82', '#9c8a5f', '#6f7e93', '#8a6f7e', '#7d8a5f'];

const FanOut = () => {
    const [seed, setSeed] = useState(3);
    const [workers, setWorkers] = useState(3);
    const [t, setT] = useState(0); // 재생 커서(틱)
    const [playing, setPlaying] = useState(false);
    const rafRef = useRef(null);
    const lastRef = useRef(0);

    const tasks = useMemo(() => buildGraph(seed), [seed]);
    const info = useMemo(() => analyze(tasks), [tasks]);

    // 1명일 때(=순차)와 현재 인원의 스케줄
    const solo = useMemo(() => schedule(tasks, info.blevel, 1), [tasks, info]);
    const sched = useMemo(() => schedule(tasks, info.blevel, workers), [tasks, info, workers]);

    // 인원수별 makespan → 속도 향상 곡선
    const curve = useMemo(() => {
        const arr = [];
        for (let p = 1; p <= MAX_WORKERS; p++) {
            arr.push(schedule(tasks, info.blevel, p).makespan);
        }
        return arr;
    }, [tasks, info]);

    const makespan = sched.makespan;
    const speedup = makespan ? solo.makespan / makespan : 1;
    const utilization = makespan ? info.totalWork / (workers * makespan) : 0;
    const maxSpeedup = info.criticalPath ? info.totalWork / info.criticalPath : 1;

    // 그래프/인원이 바뀌면 재생 정지 후 처음으로
    useEffect(() => {
        setPlaying(false);
        setT(0);
    }, [seed, workers]);

    // 재생 루프 — makespan을 약 3.5초에 걸쳐 훑는다
    useEffect(() => {
        if (!playing) return undefined;
        lastRef.current = 0;
        const speed = makespan / 3.5; // 틱/초
        const step = (ts) => {
            if (!lastRef.current) lastRef.current = ts;
            const dt = (ts - lastRef.current) / 1000;
            lastRef.current = ts;
            setT((prev) => {
                const next = prev + dt * speed;
                if (next >= makespan) {
                    setPlaying(false);
                    return makespan;
                }
                return next;
            });
            rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafRef.current);
    }, [playing, makespan]);

    const togglePlay = useCallback(() => {
        if (playing) {
            setPlaying(false);
            return;
        }
        if (t >= makespan) setT(0);
        setPlaying(true);
    }, [playing, t, makespan]);

    const cursorPct = makespan ? Math.min(100, (t / makespan) * 100) : 0;

    return (
        <div className="fo-container">
            <div className="fo-inner">
                <Link to="/" className="fo-back">← 실험실로 돌아가기</Link>

                <header className="fo-header">
                    <h1 className="fo-title">FAN-OUT</h1>
                    <p className="fo-sub">{'// 일꾼을 늘려도 깰 수 없는 벽 — 임계 경로'}</p>
                </header>

                <div className="fo-stage">
                    <section className="fo-board">
                        <div className="fo-board-head">
                            <span className="fo-board-title">작업 타임라인</span>
                            <span className="fo-board-meta">
                                일꾼 {workers}명 · 총 {makespan}틱
                            </span>
                        </div>

                        <div className="fo-gantt" style={{ '--span': makespan || 1 }}>
                            {Array.from({ length: workers }).map((_, w) => {
                                const lane = sched.placed.filter((p) => p.worker === w);
                                return (
                                    <div className="fo-lane" key={w}>
                                        <div className="fo-lane-tag">A{w + 1}</div>
                                        <div className="fo-lane-track">
                                            {lane.map((p) => {
                                                const active = t >= p.start && t < p.finish;
                                                const done = t >= p.finish;
                                                const isCrit = info.critical.has(p.id);
                                                return (
                                                    <div
                                                        key={p.id}
                                                        className={
                                                            'fo-task' +
                                                            (isCrit ? ' fo-task-crit' : '') +
                                                            (active ? ' fo-task-active' : '') +
                                                            (done ? ' fo-task-done' : '')
                                                        }
                                                        style={{
                                                            left: `${(p.start / makespan) * 100}%`,
                                                            width: `${(p.dur / makespan) * 100}%`,
                                                            background: isCrit
                                                                ? undefined
                                                                : LANE_COLORS[p.id % LANE_COLORS.length],
                                                        }}
                                                        title={`작업 #${p.id + 1} · ${p.dur}틱`}
                                                    >
                                                        <span>#{p.id + 1}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="fo-cursor" style={{ left: `calc(2.6rem + (100% - 2.6rem) * ${cursorPct / 100})` }} />
                        </div>

                        <div className="fo-legend">
                            <span><i className="fo-dot fo-dot-crit" />임계 경로(병목 사슬)</span>
                            <span><i className="fo-dot fo-dot-norm" />일반 작업</span>
                        </div>

                        <div className="fo-controls">
                            <button type="button" className="fo-btn fo-btn-play" onClick={togglePlay}>
                                {playing ? '⏸ 일시정지' : t >= makespan ? '↻ 다시재생' : '▶ 실행'}
                            </button>
                            <button
                                type="button"
                                className="fo-btn"
                                onClick={() => setSeed((s) => s + 1)}
                            >
                                새 목표 분해
                            </button>
                        </div>
                    </section>

                    <aside className="fo-panel">
                        <div className="fo-control">
                            <label htmlFor="fo-workers">
                                투입 일꾼(에이전트) <b>{workers}명</b>
                            </label>
                            <input
                                id="fo-workers"
                                type="range"
                                min={1}
                                max={MAX_WORKERS}
                                value={workers}
                                onChange={(e) => setWorkers(Number(e.target.value))}
                            />
                        </div>

                        <div className="fo-stat fo-stat-main">
                            <span className="fo-stat-num">
                                {speedup.toFixed(2)}<small>×</small>
                            </span>
                            <span className="fo-stat-label">1명 대비 속도 향상</span>
                        </div>

                        <div className="fo-stat-row">
                            <div className="fo-stat">
                                <span className="fo-stat-num fo-mini">{makespan}<small>틱</small></span>
                                <span className="fo-stat-label">완료 시간</span>
                            </div>
                            <div className="fo-stat">
                                <span className="fo-stat-num fo-mini">
                                    {(utilization * 100).toFixed(0)}<small>%</small>
                                </span>
                                <span className="fo-stat-label">일꾼 가동률</span>
                            </div>
                        </div>

                        <div className="fo-floor">
                            <div className="fo-floor-row">
                                <span>임계 경로(하한)</span>
                                <b>{info.criticalPath}틱</b>
                            </div>
                            <div className="fo-floor-row">
                                <span>총 작업량</span>
                                <b>{info.totalWork}틱</b>
                            </div>
                            <div className="fo-floor-row">
                                <span>이론상 최대 향상</span>
                                <b>{maxSpeedup.toFixed(2)}×</b>
                            </div>
                        </div>

                        <div className="fo-curve">
                            <span className="fo-curve-title">인원 대비 속도 향상</span>
                            <div className="fo-bars">
                                {curve.map((ms, i) => {
                                    const sp = ms ? solo.makespan / ms : 1;
                                    const h = (sp / maxSpeedup) * 100;
                                    const cur = i + 1 === workers;
                                    return (
                                        <div className="fo-bar-col" key={i}>
                                            <div className="fo-bar-wrap">
                                                <div
                                                    className={'fo-bar' + (cur ? ' fo-bar-cur' : '')}
                                                    style={{ height: `${h}%` }}
                                                />
                                            </div>
                                            <span className="fo-bar-x">{i + 1}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <span className="fo-curve-note">막대가 평평해지는 지점 = 일꾼을 더 넣어도 소용없는 한계</span>
                        </div>
                    </aside>
                </div>

                <footer className="fo-foot">
                    <p>
                        {'하나의 목표를 잘게 쪼개 '}<b>여러 에이전트</b>{'에게 동시에 맡기면 빨라진다 — 하지만 '}
                        {'어디까지나 '}<b>의존성</b>{'이 허락하는 만큼만. 앞 작업이 끝나야 시작할 수 있는 가장 긴 사슬, '}
                        {'즉 '}<b>임계 경로</b>{'는 일꾼을 아무리 늘려도 줄지 않는 바닥이다. 그래서 속도 향상 막대는 '}
                        {'어느 순간 평평해지고, 남는 일꾼은 그저 '}<b>놀게(가동률 하락)</b>{' 된다. '}
                        {'팀에 사람을 더 붙여도, 모델에 코어를 더 꽂아도, 오케스트레이터가 서브에이전트를 더 띄워도 '}
                        {'결국 같은 질문으로 돌아온다 — '}<b>무엇이 정말 병목인가</b>{'.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default FanOut;
