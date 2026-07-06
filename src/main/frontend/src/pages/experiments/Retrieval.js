import React, { useMemo, useRef, useState, useCallback } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Retrieval.css';

// RETRIEVAL — 벡터 검색(의미 최근접 이웃) 실험.
// 핵심: 단어(문서)를 의미에 따라 2D 평면 위 벡터로 흩어 놓는다. 쿼리도 하나의 벡터다.
// 쿼리와 가장 "가까운" 문서 top-k를 골라오는 것이 검색(retrieval)이며, RAG가 모델에게
// 넣어 줄 context를 고르는 방식 그 자체다. 무엇을 "가깝다"고 볼지(유클리드 거리 vs
// 코사인 유사도)에 따라 골라오는 이웃이 달라진다 — 거리(위치) vs 방향(의미의 결)의 차이.

const VB = 400;      // viewBox 한 변
const C = 200;       // 중심(원점)
const S = 160;       // 벡터 [-1,1] → 화면 스케일

// 6개 의미 테마 — 각 테마는 원점에서 서로 다른 방향(60°씩)으로 뻗는 부채꼴을 차지한다.
// 색은 진부한 보라 그라데이션 대신 구분 잘 되는 카테고리 색만 데이터(점)에 쓴다.
const THEMES = [
    { key: 'animals', label: '동물', color: '#12894e', base: 90 },
    { key: 'nature', label: '자연', color: '#0e7c86', base: 150 },
    { key: 'emotion', label: '감정', color: '#8a1c5a', base: 210 },
    { key: 'space', label: '우주', color: '#5b6470', base: 270 },
    { key: 'tech', label: '기술', color: '#2d4fff', base: 330 },
    { key: 'food', label: '음식', color: '#c25e00', base: 30 },
];

const RAW = {
    animals: ['고양이', '강아지', '호랑이', '여우', '돌고래', '독수리'],
    nature: ['바다', '숲', '폭풍', '노을', '강물', '서리'],
    emotion: ['기쁨', '슬픔', '분노', '설렘', '그리움', '평온'],
    space: ['은하', '블랙홀', '혜성', '성운', '궤도', '위성'],
    tech: ['알고리즘', '서버', '브라우저', '컴파일러', '데이터베이스', '벡터'],
    food: ['피자', '초밥', '라면', '커피', '딸기', '치즈'],
};

// 단어를 방향(테마)·거리(테마 안 변주)를 가진 2D 벡터로 펼친다.
// 같은 테마라도 반지름이 달라 — 코사인(방향)은 같은 결을, 유클리드(위치)는 가까운 점을 고른다.
const WORDS = [];
THEMES.forEach((th, t) => {
    RAW[th.key].forEach((w, i) => {
        const ang = (th.base + (i - 2.5) * 7) * Math.PI / 180;
        const r = 0.44 + ((i * 37 + t * 13) % 5) * 0.11; // 0.44..0.88, 결정적 변주
        WORDS.push({
            id: `${th.key}-${i}`,
            word: w,
            theme: th.key,
            color: th.color,
            x: +(r * Math.cos(ang)).toFixed(3),
            y: +(r * Math.sin(ang)).toFixed(3),
        });
    });
});

const toScreen = (x, y) => [C + x * S, C - y * S];

const Retrieval = () => {
    const svgRef = useRef(null);
    const [query, setQuery] = useState({ x: 0.18, y: 0.34 });
    const [metric, setMetric] = useState('cosine'); // 'cosine' | 'euclidean'
    const [k, setK] = useState(5);
    const [drag, setDrag] = useState(false);
    const [hover, setHover] = useState(null);

    const clientToVec = useCallback((e) => {
        const svg = svgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        const sx = ((e.clientX - rect.left) / rect.width) * VB;
        const sy = ((e.clientY - rect.top) / rect.height) * VB;
        let vx = (sx - C) / S;
        let vy = -(sy - C) / S;
        const m = Math.hypot(vx, vy);
        const cap = 1.15;
        if (m > cap) { vx = (vx / m) * cap; vy = (vy / m) * cap; }
        return { x: +vx.toFixed(3), y: +vy.toFixed(3) };
    }, []);

    const startDrag = useCallback((e) => {
        setDrag(true);
        try { svgRef.current?.setPointerCapture(e.pointerId); } catch { /* noop */ }
        const v = clientToVec(e);
        if (v) setQuery(v);
    }, [clientToVec]);

    const onMove = useCallback((e) => {
        if (!drag) return;
        const v = clientToVec(e);
        if (v) setQuery(v);
    }, [drag, clientToVec]);

    const endDrag = useCallback(() => setDrag(false), []);

    // 쿼리 대비 모든 단어의 두 점수 계산 → 활성 지표로 정렬 → top-k
    const { scored, sorted, topIds } = useMemo(() => {
        const qm = Math.hypot(query.x, query.y) || 1e-9;
        const sc = WORDS.map((w) => {
            const dx = query.x - w.x;
            const dy = query.y - w.y;
            const eucl = Math.hypot(dx, dy);
            const wm = Math.hypot(w.x, w.y) || 1e-9;
            const cos = (query.x * w.x + query.y * w.y) / (qm * wm);
            return { ...w, eucl, cos };
        });
        const s = metric === 'cosine'
            ? [...sc].sort((a, b) => b.cos - a.cos)
            : [...sc].sort((a, b) => a.eucl - b.eucl);
        const ids = new Set(s.slice(0, k).map((r) => r.id));
        return { scored: sc, sorted: s, topIds: ids };
    }, [query, metric, k]);

    const qm = Math.hypot(query.x, query.y);
    const qAngle = ((Math.atan2(query.y, query.x) * 180) / Math.PI + 360) % 360;
    const [qsx, qsy] = toScreen(query.x, query.y);

    // 검색 결과 리스트의 막대 정규화 기준
    const top = sorted.slice(0, k);
    const maxEucl = Math.max(...top.map((r) => r.eucl), 1e-9);

    const scoreOf = (r) => (metric === 'cosine'
        ? `${(r.cos * 100).toFixed(0)}%`
        : r.eucl.toFixed(2));
    const barOf = (r) => (metric === 'cosine'
        ? Math.max(0, (r.cos + 1) / 2) * 100
        : (1 - r.eucl / (maxEucl * 1.05)) * 100);

    const snapTo = (w) => setQuery({ x: w.x, y: w.y });
    const toCentroid = (th) => {
        const ang = (th.base * Math.PI) / 180;
        setQuery({ x: +(0.72 * Math.cos(ang)).toFixed(3), y: +(0.72 * Math.sin(ang)).toFixed(3) });
    };

    return (
        <LabShell
            title="RETRIEVAL"
            eyebrow="vector search"
            subtitle={'// 의미로 흩어 놓은 벡터에서 쿼리와 가장 가까운 이웃을 골라오는 검색 — RAG가 context를 고르는 방식'}
            path="retrieval.exe"
        >
            <section className="k-win rt-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/index/</span>embedding-space</span>
                    <span className="meta k-mono">k-nearest neighbors</span>
                </div>

                <div className="rt-toolbar">
                    <div className="rt-seg" role="group" aria-label="거리 지표">
                        <button type="button" className={`rt-seg-btn ${metric === 'cosine' ? 'is-on' : ''}`}
                            onClick={() => setMetric('cosine')}>코사인 유사도</button>
                        <button type="button" className={`rt-seg-btn ${metric === 'euclidean' ? 'is-on' : ''}`}
                            onClick={() => setMetric('euclidean')}>유클리드 거리</button>
                    </div>
                    <div className="rt-ctrl">
                        <label className="rt-ctrl-label k-mono" htmlFor="rt-k">top-k <b>{k}</b></label>
                        <input id="rt-k" type="range" min="1" max="8" step="1"
                            value={k} onChange={(e) => setK(Number(e.target.value))} />
                    </div>
                    <div className="rt-chips">
                        {THEMES.map((th) => (
                            <button key={th.key} type="button" className="rt-chip"
                                style={{ '--sw': th.color }} onClick={() => toCentroid(th)}>{th.label}</button>
                        ))}
                    </div>
                </div>

                <div className="rt-stage">
                    <div className="rt-map-col">
                        <svg
                            ref={svgRef}
                            className={`rt-map ${drag ? 'is-drag' : ''}`}
                            viewBox={`0 0 ${VB} ${VB}`}
                            role="img"
                            aria-label="의미 벡터 공간. 드래그해 쿼리를 옮기면 가장 가까운 단어들이 골라집니다."
                            onPointerDown={startDrag}
                            onPointerMove={onMove}
                            onPointerUp={endDrag}
                            onPointerLeave={endDrag}
                        >
                            {/* 방향(코사인) 직관을 위한 원점 십자 + 단위원 */}
                            <line className="rt-axis" x1={C} y1="26" x2={C} y2={VB - 26} />
                            <line className="rt-axis" x1="26" y1={C} x2={VB - 26} y2={C} />
                            <circle className="rt-unit" cx={C} cy={C} r={S} />

                            {/* 쿼리 → 검색된 이웃 연결선 */}
                            {top.map((r) => {
                                const [x, y] = toScreen(r.x, r.y);
                                return <line key={`ln-${r.id}`} className="rt-link" x1={qsx} y1={qsy} x2={x} y2={y} />;
                            })}

                            {/* 단어(문서) 점 */}
                            {scored.map((w) => {
                                const [x, y] = toScreen(w.x, w.y);
                                const on = topIds.has(w.id);
                                const isHover = hover === w.id;
                                return (
                                    <g key={w.id} className={`rt-node ${on ? 'is-on' : ''}`}
                                        onPointerDown={(e) => { e.stopPropagation(); snapTo(w); }}
                                        onPointerEnter={() => setHover(w.id)}
                                        onPointerLeave={() => setHover(null)}>
                                        <circle cx={x} cy={y} r={on ? 7 : 4.5} fill={w.color} />
                                        {(on || isHover) && (
                                            <text className="rt-label" x={x} y={y - 11} textAnchor="middle">{w.word}</text>
                                        )}
                                    </g>
                                );
                            })}

                            {/* 쿼리 벡터 화살 + 핸들 */}
                            <line className="rt-qvec" x1={C} y1={C} x2={qsx} y2={qsy} />
                            <g className="rt-query" transform={`translate(${qsx} ${qsy})`}>
                                <circle className="rt-query-halo" r="13" />
                                <path className="rt-query-mark" d="M0 -8 L8 0 L0 8 L-8 0 Z" />
                                <text className="rt-query-cap k-mono" y="-18" textAnchor="middle">query</text>
                            </g>
                        </svg>
                        <p className="rt-map-foot k-mono">
                            빈 공간을 <b>드래그</b>해 쿼리를 옮기거나, 단어를 눌러 그 자리로 쿼리를 보내 보세요 ·
                            굵은 점 = 골라온 top-{k}
                        </p>
                    </div>

                    <div className="rt-right">
                        <div className="rt-panel">
                            <div className="rt-panel-head k-mono">
                                <span>쿼리 벡터</span>
                                <span className="rt-qmeta">|v| {qm.toFixed(2)} · {qAngle.toFixed(0)}°</span>
                            </div>
                            <p className="rt-note k-mono">
                                {metric === 'cosine'
                                    ? '코사인: 원점에서 뻗는 방향(각도)만 본다 — 거리가 멀어도 결이 같으면 가깝다.'
                                    : '유클리드: 두 점 사이 직선 거리 — 방향이 달라도 물리적으로 붙어 있으면 가깝다.'}
                            </p>
                        </div>

                        <div className="rt-panel">
                            <div className="rt-panel-head k-mono">
                                <span>검색된 context</span>
                                <span className="rt-qmeta">top-{k} · {metric === 'cosine' ? 'similarity' : 'distance'}</span>
                            </div>
                            <ol className="rt-results">
                                {top.map((r, idx) => {
                                    const th = THEMES.find((t) => t.key === r.theme);
                                    return (
                                        <li key={r.id} className="rt-res"
                                            onPointerEnter={() => setHover(r.id)}
                                            onPointerLeave={() => setHover(null)}>
                                            <span className="rt-rank k-mono">{idx + 1}</span>
                                            <span className="rt-sw" style={{ background: r.color }} />
                                            <span className="rt-word">{r.word}</span>
                                            <span className="rt-theme k-mono">{th ? th.label : ''}</span>
                                            <span className="rt-bar"><span className="rt-bar-fill"
                                                style={{ width: `${barOf(r)}%`, background: r.color }} /></span>
                                            <span className="rt-score k-mono">{scoreOf(r)}</span>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    </div>
                </div>

                <p className="rt-hint">
                    지표를 <b>코사인 ↔ 유클리드</b>로 바꿔 보세요 — 쿼리를 한 방향으로 길게 밀면,
                    코사인은 그 <b>방향의 결</b>을 따라 멀리 있는 단어까지 끌어오지만,
                    유클리드는 쿼리 <b>주변에 물리적으로 붙은</b> 단어를 고릅니다. 같은 쿼리라도 골라오는 context가 달라집니다.
                </p>

                <div className="k-resize"></div>
            </section>

            <section className="k-win rt-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="rt-foot">
                    <p>
                        {'요즘 AI가 방대한 문서에서 필요한 조각만 찾아 답에 쓰는 '}<b>RAG(검색 증강 생성)</b>{'의 심장이 '}
                        {'바로 이 '}<b>벡터 검색</b>{'이다. 문장·이미지·코드를 임베딩 모델이 수백 차원의 '}<b>벡터</b>
                        {'로 바꿔 놓으면, 의미가 비슷한 것끼리 공간에서 가까이 모인다. 사용자의 질문도 같은 공간의 '}
                        {'한 점(쿼리 벡터)이 되고, 그 점과 가장 가까운 top-k 문서를 골라 모델에게 넣어 줄 '}
                        <b>context</b>{'로 삼는다.'}
                    </p>
                    <p>
                        {'무엇을 "가깝다"고 볼지가 검색 품질을 가른다. '}<b>유클리드 거리</b>{'는 두 점 사이 직선 거리로, '}
                        {'위치가 붙어 있는 것을 가깝게 본다. '}<b>코사인 유사도</b>{'는 원점에서 뻗은 두 벡터의 각도만 보므로, '}
                        {'크기(문서 길이·강도)를 무시하고 '}<b>의미의 방향</b>{'이 같은 것을 가깝게 본다. 그래서 실전 '}
                        {'임베딩 검색은 대개 코사인을 쓴다 — 긴 글과 짧은 글이라도 주제만 같으면 나란히 걸리게 하려는 것이다.'}
                    </p>
                    <p>
                        {'이 실험은 수백 차원을 2차원으로 줄여 그 직관만 남겼다. 쿼리를 드래그하면 이웃이 실시간으로 바뀌고, '}
                        {'지표를 바꾸면 같은 자리에서도 다른 단어가 딸려 온다. 벡터 DB(예: 유사도 인덱스)가 수백만 문서에서 '}
                        {'"관련 있는 것"을 순식간에 길어 올리는 원리가, 결국 이 한 장의 지도 위 최근접 이웃 고르기다.'}
                    </p>
                    <p className="rt-disclaimer">
                        {'* 임베딩 배치·거리 계산의 핵심 직관만 결정적으로 보여주는 데모입니다. 실제 고차원 임베딩, '}
                        {'근사 최근접 이웃(ANN) 인덱스, 재랭킹 등은 단순화했습니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Retrieval;
