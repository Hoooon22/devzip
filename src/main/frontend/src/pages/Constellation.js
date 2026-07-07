import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import projects from '../data/projects';
import labOrigins from '../data/labOrigins';
import viewService from '../services/viewService';
import { useGame } from '../contexts/GameContext';
import '../styles/Constellation.css';

/* 실험 별자리 맵 — 사이트의 모든 프로젝트/실험을 밤하늘의 별로 놓고,
   labOrigins의 공유 태그(같은 키워드에서 출발한 실험)와 같은 카테고리의
   시간순 계보를 선으로 이어 "별자리"로 보여주는 인터랙티브 지도.
   그래프 데이터와 좌표는 정적 데이터에서 유도되므로 모듈 로드 시 1회 계산한다. */

const W = 1280;
const H = 860;
const PAD = 95;

// 별빛 팔레트 — 카테고리 등장 순서대로 배정.
const CATEGORY_COLORS = [
    '#7EA8FF', '#FFD23F', '#7CE38B', '#FF8FA3', '#C9A7FF',
    '#5FD4D0', '#FFB86B', '#8FBCBB', '#F2A6FF', '#A3BE8C',
];

const cleanCategory = (raw) => {
    if (!raw) return '기타';
    const parts = raw.split('/').filter(Boolean);
    return parts[parts.length - 1];
};

const normalizeTag = (t) => t.trim().toLowerCase();

// 결정적 의사난수 — 새로고침해도 같은 밤하늘이 나오도록 시드를 고정한다.
const mulberry32 = (seed) => {
    let s = seed;
    return () => {
        s |= 0; s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const buildGraph = () => {
    // 내부 라우트를 가진 공개 프로젝트만 별로 올린다 (관리자 전용/외부 링크 제외).
    const nodes = projects
        .filter((p) => p.link && p.link.startsWith('/') && !p.requiresAdmin)
        .map((p) => ({ ...p, cat: cleanCategory(p.category), origin: null }));
    const byLink = new Map(nodes.map((n) => [n.link, n]));
    labOrigins.forEach((o) => {
        const n = byLink.get(o.link);
        if (n) n.origin = o;
    });

    const edgeMap = new Map();
    const addEdge = (a, b, type, label) => {
        if (a === b) return;
        const [lo, hi] = a < b ? [a, b] : [b, a];
        const key = `${lo}|${hi}`;
        const prev = edgeMap.get(key);
        if (prev) {
            // 태그 간선이 계보 간선보다 정보가 많으므로 승격한다.
            if (type === 'tag' && prev.type !== 'tag') { prev.type = 'tag'; prev.label = label; }
            return;
        }
        edgeMap.set(key, { a: lo, b: hi, type, label });
    };

    // 간선 1 — labOrigins 태그 공유: 같은 키워드에서 출발한 실험끼리 잇는다.
    const tagOwners = new Map();
    nodes.forEach((n) => {
        (n.origin?.tags || []).forEach((raw) => {
            const tag = normalizeTag(raw);
            if (!tagOwners.has(tag)) tagOwners.set(tag, []);
            tagOwners.get(tag).push(n.link);
        });
    });
    tagOwners.forEach((links, tag) => {
        for (let i = 0; i < links.length; i += 1) {
            for (let j = i + 1; j < links.length; j += 1) addEdge(links[i], links[j], 'tag', tag);
        }
    });

    // 간선 1b — 계기(origin) 본문이 다른 실험의 태그를 언급하면 잇는다.
    // "앞서 만든 RAG·MoE 실험에서 이어진…" 같은 실제 계보가 여기서 드러난다.
    nodes.forEach((a) => {
        const text = a.origin?.origin?.toLowerCase();
        if (!text) return;
        nodes.forEach((b) => {
            if (a.link === b.link) return;
            (b.origin?.tags || []).forEach((raw) => {
                const tag = raw.trim();
                if (tag.length >= 2 && text.includes(tag.toLowerCase())) {
                    addEdge(a.link, b.link, 'tag', tag.toLowerCase());
                }
            });
        });
    });

    // 간선 2 — 같은 카테고리의 시간순 이웃: 별자리의 "선"을 만든다.
    const byCat = new Map();
    nodes.forEach((n) => {
        if (!byCat.has(n.cat)) byCat.set(n.cat, []);
        byCat.get(n.cat).push(n);
    });
    byCat.forEach((list) => {
        const ordered = [...list].sort((x, y) => (x.startDate || '').localeCompare(y.startDate || ''));
        for (let i = 0; i + 1 < ordered.length; i += 1) addEdge(ordered[i].link, ordered[i + 1].link, 'cat', null);
    });

    const categories = [...byCat.keys()];
    const catColor = new Map(categories.map((c, i) => [c, CATEGORY_COLORS[i % CATEGORY_COLORS.length]]));
    return { nodes, edges: [...edgeMap.values()], categories, catColor };
};

// Fruchterman–Reingold 힘 기반 배치. 카테고리 중심 주변에서 출발시켜
// 같은 별자리끼리 자연스럽게 뭉치게 한다.
const layoutPositions = ({ nodes, edges, categories }) => {
    const rand = mulberry32(20260707);
    const idx = new Map(nodes.map((n, i) => [n.link, i]));
    const catCenter = new Map(categories.map((c, i) => {
        const ang = (i / categories.length) * Math.PI * 2 - Math.PI / 2;
        return [c, { x: W / 2 + Math.cos(ang) * W * 0.3, y: H / 2 + Math.sin(ang) * H * 0.3 }];
    }));
    const px = nodes.map((n) => catCenter.get(n.cat).x + (rand() - 0.5) * 180);
    const py = nodes.map((n) => catCenter.get(n.cat).y + (rand() - 0.5) * 180);

    const N = nodes.length;
    const k = Math.sqrt((W * H) / N) * 0.52;
    let temp = W / 10;
    for (let it = 0; it < 320; it += 1) {
        const dx = new Array(N).fill(0);
        const dy = new Array(N).fill(0);
        for (let i = 0; i < N; i += 1) {
            for (let j = i + 1; j < N; j += 1) {
                const vx = px[i] - px[j];
                const vy = py[i] - py[j];
                const d = Math.hypot(vx, vy) || 0.01;
                const f = (k * k) / (d * d); // 반발력을 단위벡터에 곱한 값
                dx[i] += vx * f; dy[i] += vy * f;
                dx[j] -= vx * f; dy[j] -= vy * f;
            }
        }
        edges.forEach((e) => {
            const i = idx.get(e.a);
            const j = idx.get(e.b);
            const vx = px[i] - px[j];
            const vy = py[i] - py[j];
            const d = Math.hypot(vx, vy) || 0.01;
            const f = d / k; // 인력
            dx[i] -= vx * f; dy[i] -= vy * f;
            dx[j] += vx * f; dy[j] += vy * f;
        });
        for (let i = 0; i < N; i += 1) {
            // 은은한 중심 인력으로 화면 밖 이탈을 막는다.
            dx[i] += (W / 2 - px[i]) * 0.05;
            dy[i] += (H / 2 - py[i]) * 0.05;
            const len = Math.hypot(dx[i], dy[i]) || 0.01;
            const step = Math.min(len, temp);
            px[i] = Math.min(W - PAD, Math.max(PAD, px[i] + (dx[i] / len) * step));
            py[i] = Math.min(H - PAD, Math.max(PAD, py[i] + (dy[i] / len) * step));
        }
        temp *= 0.975;
    }
    return new Map(nodes.map((n, i) => [n.link, { x: px[i], y: py[i] }]));
};

const GRAPH = buildGraph();
const POS = layoutPositions(GRAPH);
const NEIGHBORS = (() => {
    const m = new Map(GRAPH.nodes.map((n) => [n.link, []]));
    GRAPH.edges.forEach((e) => {
        m.get(e.a).push({ link: e.b, type: e.type, label: e.label });
        m.get(e.b).push({ link: e.a, type: e.type, label: e.label });
    });
    return m;
})();
const NODE_BY_LINK = new Map(GRAPH.nodes.map((n) => [n.link, n]));

// 배경 잔별 — 시드 고정으로 항상 같은 하늘.
const STARS = (() => {
    const rand = mulberry32(42);
    return Array.from({ length: 150 }, (_, i) => ({
        id: i, x: rand() * W, y: rand() * H, r: 0.5 + rand() * 1.2, tw: rand() > 0.72,
    }));
})();

const shortLabel = (name) => (name.length > 14 ? `${name.slice(0, 13)}…` : name);

const Constellation = () => {
    const navigate = useNavigate();
    const { award } = useGame();
    const [views, setViews] = useState({});
    const [hover, setHover] = useState(null);       // link | null
    const [selected, setSelected] = useState(null); // link | null
    const [activeCat, setActiveCat] = useState(null);

    useEffect(() => {
        award(20, '별자리 맵 발견!', { once: true, key: 'constellation', icon: '🌌' });
    }, [award]);

    useEffect(() => {
        let cancelled = false;
        viewService.getViewCounts().then((counts) => {
            if (!cancelled) setViews(counts);
        });
        return () => { cancelled = true; };
    }, []);

    // 조회수가 많은 별일수록 크게 빛난다.
    const radiusFor = (link) => 5 + Math.min(6, Math.log10((views[link] || 0) + 1) * 2.4);

    const focus = hover || selected;
    const focusSet = useMemo(() => {
        if (!focus) return null;
        const set = new Set([focus]);
        (NEIGHBORS.get(focus) || []).forEach((nb) => set.add(nb.link));
        return set;
    }, [focus]);

    const isNodeDim = (n) => {
        if (focusSet) return !focusSet.has(n.link);
        if (activeCat) return n.cat !== activeCat;
        return false;
    };
    const isEdgeDim = (e) => {
        if (focus) return e.a !== focus && e.b !== focus;
        if (activeCat) {
            const ca = NODE_BY_LINK.get(e.a).cat;
            const cb = NODE_BY_LINK.get(e.b).cat;
            return ca !== activeCat && cb !== activeCat;
        }
        return false;
    };

    const selectedNode = selected ? NODE_BY_LINK.get(selected) : null;
    const selectedNeighbors = selected ? (NEIGHBORS.get(selected) || []) : [];

    const openNode = (n) => {
        if (n.link.startsWith('http')) return;
        navigate(n.link);
    };

    return (
        <div className="const-page">
            <Helmet>
                <title>실험 별자리 맵 | DevZip</title>
                <meta name="description" content="DevZip의 모든 프로젝트와 실험을 태그·카테고리·계보로 이어 별자리처럼 그린 인터랙티브 지도." />
            </Helmet>

            <div className="const-wrap">
                <header className="const-head">
                    <div className="const-links">
                        <Link className="back-link" to="/">← 홈</Link>
                        <Link className="back-link" to="/lab-origins">실험 계기 연대기</Link>
                    </div>
                    <span className="eyebrow">✦ constellation</span>
                    <h1>실험 별자리 맵</h1>
                    <p>
                        {GRAPH.nodes.length}개의 프로젝트를 밤하늘에 올렸습니다. 같은 키워드에서 출발한
                        실험은 밝은 선으로, 같은 계열의 시간순 계보는 어두운 선으로 이어집니다.
                        별을 클릭하면 상세와 이웃 별로 이동할 수 있습니다. 조회수가 많은 별일수록 크게 빛납니다.
                    </p>
                    <div className="const-stats k-mono">
                        <span>{GRAPH.nodes.length} stars</span>
                        <span>{GRAPH.edges.length} links</span>
                        <span>{GRAPH.categories.length} constellations</span>
                    </div>
                </header>

                <div className="const-legend" role="group" aria-label="카테고리 필터">
                    {GRAPH.categories.map((c) => (
                        <button
                            key={c}
                            type="button"
                            className={activeCat === c ? 'on' : ''}
                            aria-pressed={activeCat === c}
                            style={{ '--c': GRAPH.catColor.get(c) }}
                            onClick={() => setActiveCat((prev) => (prev === c ? null : c))}
                        >
                            <span className="sw" />{c}
                        </button>
                    ))}
                </div>

                <div className="const-canvas">
                    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" aria-label="프로젝트 별자리 그래프">
                        {STARS.map((s) => (
                            <circle key={`bg-${s.id}`} className={`bg-star ${s.tw ? 'tw' : ''}`} cx={s.x} cy={s.y} r={s.r} />
                        ))}
                        {GRAPH.edges.map((e) => {
                            const pa = POS.get(e.a);
                            const pb = POS.get(e.b);
                            return (
                                <line
                                    key={`${e.a}|${e.b}`}
                                    className={`ce ${e.type} ${isEdgeDim(e) ? 'dim' : ''} ${focus && (e.a === focus || e.b === focus) ? 'hot' : ''}`}
                                    x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                                />
                            );
                        })}
                        {GRAPH.nodes.map((n) => {
                            const p = POS.get(n.link);
                            const r = radiusFor(n.link);
                            const color = GRAPH.catColor.get(n.cat);
                            return (
                                <g
                                    key={n.link}
                                    className={`cn ${isNodeDim(n) ? 'dim' : ''} ${selected === n.link ? 'sel' : ''}`}
                                    transform={`translate(${p.x}, ${p.y})`}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`${n.name} — ${n.description}`}
                                    onMouseEnter={() => setHover(n.link)}
                                    onMouseLeave={() => setHover(null)}
                                    onFocus={() => setHover(n.link)}
                                    onBlur={() => setHover(null)}
                                    onClick={() => setSelected(n.link)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(n.link); } }}
                                >
                                    <circle className="halo" r={r * 2.4} style={{ fill: color }} />
                                    <circle className="core" r={r} style={{ fill: color }} />
                                    <text className="glyph" y={-r - 8} textAnchor="middle">{n.thumbnail || '📦'}</text>
                                    <text className="lbl" y={r + 14} textAnchor="middle">{shortLabel(n.name)}</text>
                                </g>
                            );
                        })}
                    </svg>
                </div>

                {selectedNode && (
                    <section className="const-panel" aria-label="선택한 프로젝트 상세">
                        <div className="panel-top">
                            <span className="p-icon" aria-hidden="true">{selectedNode.thumbnail || '📦'}</span>
                            <div className="p-title">
                                <h2>{selectedNode.name}</h2>
                                {selectedNode.subtitle && <span className="p-sub">{selectedNode.subtitle}</span>}
                            </div>
                            <button type="button" className="p-close" onClick={() => setSelected(null)} aria-label="상세 닫기">✕</button>
                        </div>
                        <div className="p-meta k-mono">
                            <span className="chip" style={{ '--c': GRAPH.catColor.get(selectedNode.cat) }}>{selectedNode.cat}</span>
                            {selectedNode.startDate && <span className="date">{selectedNode.startDate}</span>}
                            <span className="views">👁 {(views[selectedNode.link] || 0).toLocaleString()}</span>
                        </div>
                        <p className="p-desc">{selectedNode.description}</p>
                        {selectedNode.origin && <p className="p-origin"><b>계기 — </b>{selectedNode.origin.origin}</p>}
                        {selectedNeighbors.length > 0 && (
                            <div className="p-neighbors">
                                <span className="nb-label k-mono">이어진 별</span>
                                {selectedNeighbors.map((nb) => {
                                    const node = NODE_BY_LINK.get(nb.link);
                                    return (
                                        <button key={nb.link} type="button" className="nb" onClick={() => setSelected(nb.link)}>
                                            {node.thumbnail} {node.name}
                                            <span className="via">{nb.type === 'tag' ? `#${nb.label}` : '같은 계열'}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        <button type="button" className="p-open" onClick={() => openNode(selectedNode)}>
                            {selectedNode.isProduction ? '서비스 열기 →' : '실험 열기 →'}
                        </button>
                    </section>
                )}

                <footer className="const-foot k-mono">
                    <span>{'// 밝은 선 = 공유 태그, 어두운 선 = 같은 계열의 시간순 계보'}</span>
                </footer>
            </div>
        </div>
    );
};

export default Constellation;
