import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Coincide.css';

// COINCIDE — 생일이 겹치는 방 (우연과 확률 × 아트 토이 × CSS만으로 × 첫 화면은 흑백, 인터랙션 이후에만 색).
//   소재: 우연과 확률 — 생일 역설. 365칸의 방에 사람을 한 명씩 들이면, 겨우 스물 몇 명에서
//         벌써 "같은 날 태어난 두 사람"이 절반의 확률로 나온다. 직관은 366명은 돼야 할 것 같지만.
//   형식: 아트 토이 — 점수도 실패도 없다. 탭해서 한 명씩(혹은 눌러서 우르르) 들여보내며
//         우연이 만드는 겹침을 구경한다.
//   기술: CSS만으로 — JS는 "무작위 날 하나 뽑기 + 누가 들어왔는지" 상태만 쥔다. 등장 팝,
//         겹침 발화, 확률 호 채움, 흑백→형광 전환은 전부 CSS 키프레임/트랜지션이 굴린다.
//   제약: 첫 화면은 흑백 — 갱지·먹으로 그린 1년 눈금은 회색. 색(형광펜)은 오직 '겹치는 순간'
//         부터, 즉 인터랙션 이후에만 생긴다.

const DAYS = 365;
const C = 500;                 // viewBox 1000 중심
const R_DOT0 = 424;            // 첫 사람 반지름(눈금 안쪽)
const R_STEP = 16;             // 같은 날 겹치면 안쪽으로 한 칸씩 쌓임
const R_ARC = 488;             // 바깥 확률 호
const ARC_CIRC = 2 * Math.PI * R_ARC;
const MAX_PEOPLE = 200;

// 평년 각 달 1일이 시작되는 통산일(0-based) — 12개 굵은 눈금 자리.
const MONTH_STARTS = (() => {
    const len = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const out = [];
    let acc = 0;
    for (let i = 0; i < 12; i += 1) { out.push(acc); acc += len[i]; }
    return new Set(out);
})();

const angleFor = (day) => (day / DAYS) * Math.PI * 2 - Math.PI / 2;
const onRing = (day, r) => {
    const a = angleFor(day);
    return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
};

// N명일 때 "적어도 한 쌍이 겹칠" 확률 = 1 - Π(1 - k/365).
const matchProb = (n) => {
    let p = 1;
    for (let k = 0; k < n; k += 1) p *= (365 - k) / 365;
    return 1 - p;
};

const Coincide = () => {
    const [arrivals, setArrivals] = useState([]); // [{ id, day }]
    const idRef = useRef(0);
    const holdRef = useRef({ t: null, iv: null });

    const addOne = useCallback(() => {
        setArrivals((prev) => {
            if (prev.length >= MAX_PEOPLE) return prev;
            idRef.current += 1;
            return [...prev, { id: idRef.current, day: Math.floor(Math.random() * DAYS) }];
        });
    }, []);

    const addMany = useCallback((count) => {
        setArrivals((prev) => {
            const room = Math.max(0, MAX_PEOPLE - prev.length);
            const n = Math.min(count, room);
            const next = prev.slice();
            for (let i = 0; i < n; i += 1) {
                idRef.current += 1;
                next.push({ id: idRef.current, day: Math.floor(Math.random() * DAYS) });
            }
            return next;
        });
    }, []);

    // 누르고 있으면 우르르 — 물리 루프가 아니라 입력 타이밍(상태 최소).
    const startHold = useCallback(() => {
        addOne();
        holdRef.current.t = setTimeout(() => {
            holdRef.current.iv = setInterval(addOne, 120);
        }, 260);
    }, [addOne]);
    const endHold = useCallback(() => {
        clearTimeout(holdRef.current.t);
        clearInterval(holdRef.current.iv);
        holdRef.current = { t: null, iv: null };
    }, []);
    useEffect(() => endHold, [endHold]);

    // 등장 순서대로 같은 날 몇 번째인지(안쪽 쌓임) 계산 + 날짜별 총원.
    const { placed, dayCount, pairs } = useMemo(() => {
        const seen = {};
        const list = arrivals.map((a) => {
            const n = seen[a.day] || 0;
            seen[a.day] = n + 1;
            return { ...a, n };
        });
        let pr = 0;
        Object.values(seen).forEach((c) => { if (c >= 2) pr += c - 1; });
        return { placed: list, dayCount: seen, pairs: pr };
    }, [arrivals]);

    const people = arrivals.length;
    const prob = matchProb(people);
    const arcOffset = ARC_CIRC * (1 - prob);
    const awake = people > 0;
    const crossedHalf = prob >= 0.5;

    // 정적 눈금(1년)은 한 번만 계산.
    const ticks = useMemo(() => {
        const out = [];
        for (let d = 0; d < DAYS; d += 1) {
            const major = MONTH_STARTS.has(d);
            const a = angleFor(d);
            const rOut = 470;
            const rIn = major ? 440 : 456;
            out.push({
                d, major,
                x1: C + rOut * Math.cos(a), y1: C + rOut * Math.sin(a),
                x2: C + rIn * Math.cos(a), y2: C + rIn * Math.sin(a),
            });
        }
        return out;
    }, []);

    const lastId = people ? arrivals[people - 1].id : null;

    return (
        <LabShell
            title="COINCIDE"
            eyebrow="the birthday paradox"
            subtitle={'// 탭할 때마다 방에 한 명씩 — 같은 날 태어난 두 사람이 나오는 순간에만 색이 그어진다. 겨우 스물 몇 명이면 벌써 절반이 겹친다'}
            path="coincide"
        >
            <section className="coin-wrap" aria-label="생일 겹침 아트 토이">
                <div className={`coin-stage${awake ? ' is-awake' : ''}`}>
                    <button
                        type="button"
                        className="coin-wheelbtn"
                        aria-label="탭하면 방에 한 명 입장 · 누르고 있으면 계속 입장"
                        onPointerDown={(e) => { e.preventDefault(); startHold(); }}
                        onPointerUp={endHold}
                        onPointerLeave={endHold}
                        onPointerCancel={endHold}
                    >
                        <svg className="coin-wheel" viewBox="0 0 1000 1000" role="img" aria-hidden="true">
                            {/* 바깥 확률 호 — 채워질수록 "겹칠 확률"이 오른다 */}
                            <circle className="coin-arc-track" cx={C} cy={C} r={R_ARC} />
                            <circle
                                className={`coin-arc-fill${crossedHalf ? ' past-half' : ''}`}
                                cx={C} cy={C} r={R_ARC}
                                strokeDasharray={ARC_CIRC}
                                strokeDashoffset={arcOffset}
                                transform={`rotate(-90 ${C} ${C})`}
                            />

                            {/* 1년 눈금 (흑백) */}
                            <g className="coin-ticks">
                                {ticks.map((t) => (
                                    <line
                                        key={t.d}
                                        className={t.major ? 'coin-tick major' : 'coin-tick'}
                                        x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                                    />
                                ))}
                            </g>

                            {/* 사람들 — 같은 날 2명 이상이면 형광(색) */}
                            <g className="coin-people">
                                {placed.map((p) => {
                                    const r = R_DOT0 - p.n * R_STEP;
                                    const { x, y } = onRing(p.day, r);
                                    const matched = dayCount[p.day] >= 2;
                                    const cls = [
                                        'coin-dot',
                                        matched ? 'is-match' : '',
                                        p.id === lastId ? 'is-new' : '',
                                    ].filter(Boolean).join(' ');
                                    return <circle key={p.id} className={cls} cx={x} cy={y} r={matched ? 9 : 7} />;
                                })}
                            </g>

                            {/* 중심 표식 */}
                            <circle className="coin-hub" cx={C} cy={C} r={4} />
                        </svg>

                        {!awake && (
                            <span className="coin-cue">
                                <span className="coin-cue-ring" />
                                <em>탭 · 한 명 입장</em>
                            </span>
                        )}
                    </button>
                </div>

                {/* 최소 계기판 */}
                <div className="coin-hud" role="status" aria-live="polite">
                    <span className="coin-chip">
                        <b>{people}</b><i>명</i>
                    </span>
                    <span className={`coin-chip${pairs > 0 ? ' hot' : ''}`}>
                        <b>{pairs}</b><i>쌍 겹침</i>
                    </span>
                    <span className={`coin-chip${crossedHalf ? ' hot' : ''}`}>
                        <b>{Math.round(prob * 100)}</b><i>% 겹칠 확률</i>
                    </span>
                </div>

                {pairs > 0 && (
                    <p className="coin-flash">
                        벌써 겹쳤다 — 방 안엔 겨우 <b>{people}</b>명.
                    </p>
                )}
                {people >= MAX_PEOPLE && (
                    <p className="coin-flash mute">방이 가득 찼다. 비우고 다시 채워 보라.</p>
                )}

                <div className="coin-controls">
                    <button type="button" className="coin-btn" onClick={() => addMany(23)} disabled={people >= MAX_PEOPLE}>
                        + 23명 채우기
                    </button>
                    <button type="button" className="coin-btn ghost" onClick={() => { setArrivals([]); }} disabled={people === 0}>
                        비우기
                    </button>
                </div>

                <section className="coin-read">
                    <h3>스물세 명이면 이미 반반이다</h3>
                    <p>
                        “한 방에 몇 명이 있어야 생일이 겹칠까?” 하고 물으면 대개 366명(날 수의 절반쯤)을
                        떠올린다. 실제로는 <b>23명</b>에서 이미 겹칠 확률이 <b>약 50%</b>를 넘고,
                        <b> 70명</b>이면 <b>99.9%</b>다. 이 어긋남이 <b>생일 역설</b>이다.
                    </p>
                    <p>
                        착각의 원인은 “나와 같은 날”을 세기 때문이다. 방에서 겹침은 <b>나 하나</b>가 아니라
                        <b> 모든 두 사람 짝</b>에서 일어난다. 23명이면 짝은 23×22÷2 = <b>253쌍</b>. 한 쌍이
                        안 겹칠 확률은 364/365로 크지만, 253번을 곱하면 “한 번도 안 겹칠” 확률이 빠르게
                        무너진다. 위 바깥 호가 채워지는 속도가 바로 그 붕괴다.
                    </p>
                    <p>
                        이 방은 색을 아낀다. 눈금도 사람도 처음엔 <b>먹빛 회색</b>이고, 오직 <b>같은 날에 둘째가
                        내려앉는 순간</b>에만 그 자리가 형광펜으로 그어진다. 우연이 무늬를 만들기 전까지 화면은
                        흑백인 채다 — 색은 곧 <b>겹침의 증거</b>다.
                    </p>
                    <p className="coin-disc">
                        * 각 사람의 생일은 365일에서 고르게 뽑는 가정(윤년·계절 편중 무시)이다. 그래서 실제
                        인구보다 살짝 “안 겹치는” 쪽이지만, 역설의 크기는 거의 그대로다.
                    </p>
                </section>
            </section>
        </LabShell>
    );
};

export default Coincide;
