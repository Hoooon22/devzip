import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';
import '../styles/Chora.css';

/* ────────────────────────────────────────────────────────────────
   히어로의 보행 그래프 데모.
   실제 Chora 는 서버에서 OSM 보행 그래프 위로 시뮬레이션을 돌리고
   Unity 가 그것을 그린다. 여기 있는 건 같은 구조를 브라우저 크기로
   줄여 놓은 것 — 그래프, 최단경로, POI 선택, 환경 op 까지만 같다.
   ──────────────────────────────────────────────────────────────── */

const CATEGORIES = [
    { key: 'meal', label: '식사', color: '#FF7A45' },
    { key: 'cafe', label: '카페', color: '#F2B441' },
    { key: 'bar', label: '술', color: '#C77DFF' },
    { key: 'shop', label: '쇼핑', color: '#4DD8C0' },
    { key: 'culture', label: '문화', color: '#5AA9FF' },
];

// 환경별 카테고리 선호 가중치. 비가 오면 실내로, 밤이면 술집으로,
// 상업지역으로 바꾸면 쇼핑이 늘어난다.
const WEIGHTS = {
    base: { meal: 3, cafe: 3, bar: 1, shop: 2, culture: 2 },
    rain: { meal: 4, cafe: 5, bar: 1, shop: 2, culture: 1 },
    night: { meal: 3, cafe: 1, bar: 5, shop: 1, culture: 2 },
    commercial: { meal: 3, cafe: 3, bar: 2, shop: 6, culture: 1 },
};

const REASONS = {
    meal: ['한 끼 소박하게 해결하고 싶다', '아까 웨이팅이 길어 포기한 게 남았다', '계획대로 점심을 먼저 먹기로 했다'],
    cafe: ['비를 피할 겸 조용한 자리에 앉고 싶다', '클래식이 나오는 곳에서 아침을 시작하고 싶다', '앉아서 좀 쉬어야겠다'],
    bar: ['오늘은 한 잔 하고 들어가기로 했다', '동네 오래된 가게가 취향에 맞다', '이 시간엔 여기가 제일 편하다'],
    shop: ['새로 생긴 가게가 궁금하다', '지나는 길에 들러 보기로 했다', '필요한 걸 사 두려 한다'],
    culture: ['걷다가 눈에 들어와서 들어간다', '전에 와 본 곳이라 편하다', '한 번쯤 보고 싶었다'],
};

const mulberry32 = (seed) => () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// 지터를 준 격자 + 일부 끊어진 간선 = 실제 골목망에 가까운 그래프
const buildWorld = () => {
    const rnd = mulberry32(20260804);
    const cols = 12;
    const rows = 7;
    const nodes = [];
    for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
            nodes.push({
                x: (c + 0.5) / cols + (rnd() - 0.5) * 0.022,
                y: (r + 0.5) / rows + (rnd() - 0.5) * 0.038,
                edges: [],
            });
        }
    }
    const idx = (c, r) => r * cols + c;
    const link = (a, b) => {
        const dx = nodes[a].x - nodes[b].x;
        const dy = nodes[a].y - nodes[b].y;
        const w = Math.hypot(dx, dy);
        nodes[a].edges.push({ to: b, w });
        nodes[b].edges.push({ to: a, w });
    };
    const links = [];
    for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
            if (c < cols - 1 && rnd() > 0.08) { link(idx(c, r), idx(c + 1, r)); links.push([idx(c, r), idx(c + 1, r)]); }
            if (r < rows - 1 && rnd() > 0.16) { link(idx(c, r), idx(c, r + 1)); links.push([idx(c, r), idx(c, r + 1)]); }
        }
    }

    // POI — 기본 세트. 이름과 종류를 직접 짝지어야 결정 로그의 이유가 말이 된다.
    const pois = [
        [4, 'cafe', '브레드랩'],
        [12, 'meal', '연남짬뽕'],
        [17, 'cafe', 'Florte Flower Cafe'],
        [23, 'shop', '경의선 책방'],
        [26, 'bar', '동교동 포차'],
        [31, 'meal', '연남 방앗간'],
        [35, 'culture', '작은 영화관'],
        [41, 'meal', '홍대 국수'],
        [46, 'cafe', '골목 커피'],
        [52, 'shop', '레코드샵'],
        [55, 'meal', '연남 탕후루'],
        [8, 'culture', '서교 갤러리'],
        [60, 'bar', '연남 와인바'],
        [67, 'culture', '경의선숲길 야외무대'],
    ].map(([node, cat, name]) => ({ node, cat, name, added: false }));
    // rezone(commercial) op 로 생기는 POI. 평소에는 숨어 있다가 상업지역으로 바꾸면 나타난다.
    [[20, '신설 편집숍'], [38, '신설 리빙관'], [44, '신설 팝업'], [61, '신설 그로서리']]
        .forEach(([node, name]) => pois.push({ node, cat: 'shop', name, added: true }));

    return { nodes, links, pois };
};

// 다익스트라 — 노드 60개 규모라 단순 구현으로 충분하다.
const shortestPath = (nodes, from, to) => {
    const dist = new Array(nodes.length).fill(Infinity);
    const prev = new Array(nodes.length).fill(-1);
    const seen = new Array(nodes.length).fill(false);
    dist[from] = 0;
    for (;;) {
        let u = -1;
        let best = Infinity;
        for (let i = 0; i < nodes.length; i += 1) if (!seen[i] && dist[i] < best) { best = dist[i]; u = i; }
        if (u === -1 || u === to) break;
        seen[u] = true;
        for (const e of nodes[u].edges) {
            const nd = dist[u] + e.w;
            if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = u; }
        }
    }
    const path = [];
    for (let at = to; at !== -1; at = prev[at]) path.push(at);
    return path.reverse();
};

const pad2 = (n) => String(n).padStart(2, '0');

const CityCanvas = ({ env, onArrive, onCounts, onClock }) => {
    const canvasRef = useRef(null);
    const envRef = useRef(env);
    envRef.current = env;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const ctx = canvas.getContext('2d');
        const world = buildWorld();
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const rnd = mulberry32(7);

        let w = 0;
        let h = 0;
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const rect = canvas.getBoundingClientRect();
            w = rect.width;
            h = rect.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(canvas);

        const px = (n) => ({ x: world.nodes[n].x * w, y: world.nodes[n].y * h });

        const activePois = () => world.pois.filter(p => !p.added || envRef.current.zone === 'commercial');

        const pickTarget = (agent) => {
            const e = envRef.current;
            const weights = { ...WEIGHTS.base };
            const blend = (src) => Object.keys(weights).forEach(k => { weights[k] = (weights[k] + src[k]) / 2; });
            if (e.weather === 'rain') blend(WEIGHTS.rain);
            if (e.time === 'night') blend(WEIGHTS.night);
            if (e.zone === 'commercial') blend(WEIGHTS.commercial);

            // 선호 가중치 × 거리 감쇠로 룰렛을 돌린다. 최고점만 고르면
            // 가중치가 가장 높은 한 종류로 모두 몰려 분포가 생기지 않는다.
            const here = world.nodes[agent.at];
            const pool = activePois().filter(p => p.node !== agent.at);
            const scored = pool.map((p) => {
                const n = world.nodes[p.node];
                const d = Math.hypot(n.x - here.x, n.y - here.y);
                return { p, w: weights[p.cat] / (0.25 + d * 2.2) };
            });
            const sum = scored.reduce((s, x) => s + x.w, 0);
            let r = rnd() * sum;
            for (const x of scored) {
                r -= x.w;
                if (r <= 0) return x.p;
            }
            return scored[scored.length - 1]?.p;
        };

        const agents = Array.from({ length: 26 }, () => {
            const at = Math.floor(rnd() * world.nodes.length);
            return { at, path: [], seg: 0, t: 0, dwell: rnd() * 3, target: null, x: 0, y: 0 };
        });
        agents.forEach((a) => { const p = px(a.at); a.x = p.x; a.y = p.y; });

        let counts = Object.fromEntries(CATEGORIES.map(c => [c.key, 0]));
        let minutes = 8 * 60;
        let arrivals = 0;
        let lastPush = 0;
        let raf = 0;
        let prev = performance.now();
        let visible = true;

        const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
        io.observe(canvas);

        const step = (now) => {
            raf = requestAnimationFrame(step);
            const dt = Math.min((now - prev) / 1000, 0.05);
            prev = now;
            if (!visible) return;

            const e = envRef.current;
            const speed = (e.weather === 'rain' ? 0.55 : 1) * (e.time === 'night' ? 0.8 : 1) * (reduceMotion ? 0 : 1);
            minutes += dt * 24 * (reduceMotion ? 0 : 1);

            for (const a of agents) {
                if (a.dwell > 0) { a.dwell -= dt; continue; }
                if (!a.path.length) {
                    const target = pickTarget(a);
                    if (!target) continue;
                    a.target = target;
                    a.path = shortestPath(world.nodes, a.at, target.node);
                    a.seg = 0;
                    a.t = 0;
                    // 그래프가 끊겨 닿을 수 없는 POI 라면 잠깐 쉬었다 다른 곳을 고른다.
                    if (a.path.length < 2) { a.path = []; a.dwell = 0.5; continue; }
                }
                const from = px(a.path[a.seg]);
                const to = px(a.path[a.seg + 1]);
                const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
                a.t += (speed * 78 * dt) / len;
                if (a.t >= 1) {
                    a.seg += 1;
                    a.t = 0;
                    if (a.seg >= a.path.length - 1) {
                        a.at = a.path[a.path.length - 1];
                        a.path = [];
                        a.dwell = 1.5 + rnd() * 3 + (e.weather === 'rain' ? 2 : 0);
                        const t = a.target;
                        if (t) {
                            counts = { ...counts, [t.cat]: counts[t.cat] + 1 };
                            arrivals += 1;
                            const bank = REASONS[t.cat];
                            onArrive({
                                id: `a${arrivals}`,
                                time: `${pad2(Math.floor(minutes / 60) % 24)}:${pad2(Math.floor(minutes) % 60)}`,
                                name: t.name,
                                cat: t.cat,
                                reason: bank[Math.floor(rnd() * bank.length)],
                            });
                        }
                    }
                }
                const f = px(a.path[a.seg] ?? a.at);
                const g = px(a.path[a.seg + 1] ?? a.at);
                a.x = f.x + (g.x - f.x) * a.t;
                a.y = f.y + (g.y - f.y) * a.t;
            }

            if (now - lastPush > 700) {
                lastPush = now;
                onCounts(counts);
                onClock(`${pad2(Math.floor(minutes / 60) % 24)}:${pad2(Math.floor(minutes) % 60)}`);
            }

            /* ── draw ── */
            const night = e.time === 'night';
            ctx.clearRect(0, 0, w, h);

            ctx.lineWidth = 1;
            ctx.strokeStyle = night ? 'rgba(110,140,178,0.26)' : 'rgba(132,166,200,0.36)';
            ctx.beginPath();
            for (const [a, b] of world.links) {
                const p = px(a);
                const q = px(b);
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(q.x, q.y);
            }
            ctx.stroke();

            if (e.weather === 'rain') {
                ctx.strokeStyle = 'rgba(150,190,220,0.16)';
                ctx.beginPath();
                for (let i = 0; i < 70; i += 1) {
                    const rx = ((i * 137.5 + now * 0.09) % w);
                    const ry = ((i * 91.7 + now * 0.42) % h);
                    ctx.moveTo(rx, ry);
                    ctx.lineTo(rx - 2, ry + 9);
                }
                ctx.stroke();
            }

            for (const p of activePois()) {
                const c = CATEGORIES.find(x => x.key === p.cat);
                const q = px(p.node);
                ctx.fillStyle = c.color;
                ctx.globalAlpha = night ? 1 : 0.9;
                ctx.fillRect(q.x - 3.5, q.y - 3.5, 7, 7);
                ctx.globalAlpha = 1;
                if (p.added) {
                    ctx.strokeStyle = c.color;
                    ctx.globalAlpha = 0.5;
                    ctx.strokeRect(q.x - 6.5, q.y - 6.5, 13, 13);
                    ctx.globalAlpha = 1;
                }
            }

            ctx.shadowColor = 'rgba(255,122,69,0.85)';
            ctx.shadowBlur = 9;
            for (const a of agents) {
                ctx.beginPath();
                ctx.arc(a.x, a.y, a.dwell > 0 ? 2 : 3.1, 0, Math.PI * 2);
                ctx.fillStyle = a.dwell > 0 ? 'rgba(255,122,69,0.5)' : '#FF8A5A';
                ctx.fill();
            }
            ctx.shadowBlur = 0;
        };
        raf = requestAnimationFrame(step);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            io.disconnect();
        };
    }, [onArrive, onCounts, onClock]);

    return <canvas ref={canvasRef} className="chora-canvas" aria-hidden="true" />;
};

CityCanvas.propTypes = {
    env: PropTypes.shape({
        weather: PropTypes.string,
        time: PropTypes.string,
        zone: PropTypes.string,
    }).isRequired,
    onArrive: PropTypes.func.isRequired,
    onCounts: PropTypes.func.isRequired,
    onClock: PropTypes.func.isRequired,
};

/* ── A/B 히트맵: 스케일을 공유하지 않으면 총량 감소가 사라진다 ── */
const HEAT_BEFORE = [
    [2, 5, 9, 14, 11, 6, 3, 1],
    [4, 11, 22, 31, 26, 13, 6, 2],
    [7, 19, 41, 58, 47, 24, 10, 4],
    [9, 24, 52, 74, 61, 30, 13, 5],
    [6, 17, 36, 51, 42, 21, 9, 3],
    [3, 8, 17, 24, 20, 10, 4, 2],
];
const HEAT_AFTER = HEAT_BEFORE.map((row, r) => row.map((v, c) => Math.round(v * 0.61 * (1 + (c > 4 ? 0.22 : -0.06) + (r < 2 ? 0.12 : 0)))));

const heatColor = (t) => {
    const stops = [[16, 24, 33], [58, 46, 70], [179, 64, 42], [255, 178, 107]];
    const s = Math.max(0, Math.min(0.999, t)) * (stops.length - 1);
    const i = Math.floor(s);
    const f = s - i;
    const [a, b] = [stops[i], stops[i + 1]];
    return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`;
};

// 격자는 크기·순서가 고정이므로 셀 좌표를 그대로 식별자로 굳혀 둔다.
const toCells = (grid) => grid.flatMap((row, r) => row.map((v, c) => ({ id: `r${r}c${c}`, v })));

const HeatGrid = ({ cells, max, label, total }) => (
    <figure className="heat">
        <figcaption>
            <span className="heat-name">{label}</span>
            <span className="heat-total">방문 {total.toLocaleString()}건</span>
        </figcaption>
        <div className="heat-grid">
            {cells.map(cell => (
                <i key={cell.id} style={{ background: heatColor(cell.v / max) }} title={`${cell.v}건`} />
            ))}
        </div>
    </figure>
);

HeatGrid.propTypes = {
    cells: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        v: PropTypes.number.isRequired,
    })).isRequired,
    max: PropTypes.number.isRequired,
    label: PropTypes.string.isRequired,
    total: PropTypes.number.isRequired,
};

const BEFORE_CELLS = toCells(HEAT_BEFORE);
const AFTER_CELLS = toCells(HEAT_AFTER);

const LAYERS = [
    {
        tag: 'world',
        title: '실제 지도 위를 걷는다',
        body: '가상의 격자가 아니라 서울 서교동·연남동입니다. 에이전트는 건물을 관통하지 않고 OSM 보행 그래프 위에서만 움직입니다. 렌더는 Cesium 3D Tiles, 시뮬레이션은 OSMnx 보행 그래프 — 소스가 다르므로 좌표계는 서버가 WGS84로 통일하고 로컬 좌표 변환은 클라이언트 몫입니다.',
        facts: ['OSMnx 보행 그래프 + A* 경로탐색', 'Cesium 3D Tiles(항공영상 + OSM Buildings)', '시뮬레이션의 유일한 소유자는 서버'],
    },
    {
        tag: 'agents',
        title: '왜 그렇게 움직였는지 남는다',
        body: '확률 규칙이 아니라 성격과 취향으로 움직입니다. 에이전트는 하루 계획을 세우고, 인지 루프를 돌고, 결정할 때마다 이유를 자기 언어로 남깁니다. 그 이유가 곧 분석의 근거가 됩니다.',
        facts: ['계획 → 인지 → 결정(go_to / stay / wander / leave)', '기억 검색 점수 = 최근성 × 중요도 × 관련성', '반경 400m·카테고리별 후보만 인지'],
    },
    {
        tag: 'environment',
        title: '말로 바꾸고, 검증을 통과해야 적용된다',
        body: '“이 구역을 상업지역으로 바꾸고, 비 오는 주말 오후로 설정해 줘.” 자연어는 반드시 구조화된 op로 번역되고, 검증을 통과해야 월드에 반영됩니다. LLM이 월드 상태를 직접 만지는 경로는 없습니다.',
        facts: ['set_weather · rezone · add_poi · close_road', '검증 실패한 op는 적용하지 않음', '모호한 명령은 되물음'],
    },
    {
        tag: 'analysis',
        title: '바뀐 만큼만 말한다',
        body: '같은 시드로 변경 전/후를 돌려 나란히 놓습니다. 두 실행이 색 스케일을 공유하는 것이 핵심입니다 — 각자 정규화하면 총량이 줄어도 같은 그림이 나오기 때문입니다.',
        facts: ['방문 히트맵 · POI 종류별 방문 변화', '가격 가정 없는 방문 수를 따로 노출', '절대값이 아니라 A/B 간 상대 변화'],
    },
];

const RULES = [
    {
        head: 'LLM은 의사결정 순간에만 부른다',
        body: '매 틱 호출은 금지입니다. 이동과 경로탐색은 규칙 기반이고, LLM은 트리거(하루 시작, 배고픔, 체류 종료, 도착, 환경 변화)가 걸렸을 때만 개입합니다. 일상 결정은 Haiku, 계획과 회고는 Sonnet으로 나눕니다.',
    },
    {
        head: '거리순으로 후보를 뽑지 않는다',
        body: '가까운 순으로만 뽑으면 밀도 높은 종류가 목록을 잠식합니다. 대상 구역은 미용실이 이름 있는 POI의 26%라 특히 심했습니다. 그래서 카테고리별로 나눠 제시합니다.',
    },
    {
        head: '모르는 값을 기본값으로 메우지 않는다',
        body: '예상 매출은 방문 수 × 종류별 객단가 가정입니다. 표에 없는 종류는 0으로 두고, 가격 가정이 없는 방문 수를 함께 보여 줍니다. 빈칸을 채우면 총액이 조용히 부풀기 때문입니다.',
    },
    {
        head: '돈이 드는 실행은 먼저 견적을 낸다',
        body: '실제 LLM을 쓰는 실행은 --yes 없이는 예상 비용만 출력하고 멈춥니다. 전체 흐름은 모의 게이트웨이로 무비용 실행할 수 있고, API 키는 환경변수로만 전달합니다.',
    },
];

const PHASES = [
    { id: '0', body: 'GIS 임포트, 시뮬레이션 코어, Unity·Cesium 렌더, WebSocket 스트림', done: true },
    { id: '1', body: 'LLM 게이트웨이, 페르소나, 인지 루프, 기억·계획·회고', done: true },
    { id: '2', body: '환경 op, 자연어 번역, 지각 전파, A/B 실행', done: true },
    { id: '3', body: '위치 샘플링, 지표, 분석 API, 대시보드·A/B 비교 뷰', done: true },
    { id: '4', body: '대규모 스케일, 대중교통·차량, 캘리브레이션, PostGIS', done: false },
];

const STACK = [
    ['클라이언트', 'Unity 6 (LTS) · Cesium for Unity · URP'],
    ['시뮬레이션 서버', 'Python 3.12+ · FastAPI · uv · ruff · pytest 158종'],
    ['GIS', 'OSMnx · NetworkX 보행 그래프 / Cesium 3D Tiles 렌더'],
    ['에이전트', 'LLM 의사결정 + 규칙 기반 이동 하이브리드'],
    ['LLM', 'Claude API — 결정 유형별 모델 티어 분리'],
    ['통신', 'REST(제어) + WebSocket(WGS84 상태 델타)'],
];

const Chora = () => {
    const [env, setEnv] = useState({ weather: 'clear', time: 'day', zone: 'mixed' });
    const [log, setLog] = useState([]);
    const [counts, setCounts] = useState(Object.fromEntries(CATEGORIES.map(c => [c.key, 0])));
    const [ghost, setGhost] = useState(null);
    const [clock, setClock] = useState('08:00');
    const [sharedScale, setSharedScale] = useState(true);

    // 사이트 기본 body 배경이 밝은 회색이라, 이 페이지가 떠 있는 동안만 어둡게 맞춘다.
    useEffect(() => {
        document.body.classList.add('chora-body');
        return () => document.body.classList.remove('chora-body');
    }, []);

    const handleArrive = useCallback((entry) => {
        setLog(prev => [entry, ...prev].slice(0, 4));
    }, []);
    const handleCounts = useCallback((c) => setCounts(c), []);
    const handleClock = useCallback((c) => setClock(c), []);

    // 환경을 바꾸면 직전 분포를 스냅샷으로 남겨 두고 새로 센다.
    const changeEnv = (patch) => {
        setGhost(counts);
        setCounts(Object.fromEntries(CATEGORIES.map(c => [c.key, 0])));
        setLog([]);
        setEnv(prev => ({ ...prev, ...patch }));
    };

    const total = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);
    const ghostTotal = useMemo(() => (ghost ? Object.values(ghost).reduce((a, b) => a + b, 0) : 0), [ghost]);

    const beforeTotal = HEAT_BEFORE.flat().reduce((a, b) => a + b, 0);
    const afterTotal = HEAT_AFTER.flat().reduce((a, b) => a + b, 0);
    const beforeMax = Math.max(...HEAT_BEFORE.flat());
    const afterMax = Math.max(...HEAT_AFTER.flat());
    const sharedMax = Math.max(beforeMax, afterMax);

    return (
        <div className="chora">
            <Helmet>
                <title>Chora - LLM 페르소나 기반 GIS 시뮬레이션 플랫폼 | Persona-driven Urban Simulation</title>
                <meta name="description" content="Chora는 실제 지리정보로 만든 3D 도시 위에 LLM 페르소나 에이전트를 배치하고, 자연어로 환경을 바꿔 군중 행동 변화를 관찰·분석하는 B2B 시뮬레이션 도구입니다. Chora is a persona-driven GIS simulation platform for urban and commercial analysis." />
                <meta name="keywords" content="Chora, chora, GIS 시뮬레이션, urban simulation, LLM 에이전트, agent based modeling, ABM, 상권분석, 도시계획, Unity, Cesium, OSMnx, DevZip" />

                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://devzip.site/chora" />
                <meta property="og:title" content="Chora - Persona-driven GIS Simulation" />
                <meta property="og:description" content="Change the city in plain language, and watch the crowd change with it. LLM persona agents walking a real 3D city." />
                <meta property="og:locale" content="ko_KR" />
                <meta property="og:locale:alternate" content="en_US" />

                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:title" content="Chora - Persona-driven GIS Simulation" />
                <meta property="twitter:description" content="LLM persona agents on a real 3D city. Change the environment in plain language and compare the before/after." />

                <link rel="alternate" hrefLang="ko" href="https://devzip.site/chora" />
                <link rel="alternate" hrefLang="en" href="https://devzip.site/chora" />
                <link rel="alternate" hrefLang="x-default" href="https://devzip.site/chora" />
                <link rel="canonical" href="https://devzip.site/chora" />

                <script type="application/ld+json">
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'SoftwareApplication',
                        name: 'Chora',
                        alternateName: ['chora', '코라'],
                        applicationCategory: 'SimulationApplication',
                        operatingSystem: 'Windows, macOS',
                        description: 'LLM persona-driven GIS simulation platform. Place AI agents with distinct personas on a real 3D city, change the environment in natural language, and analyze how crowd behavior shifts.',
                        url: 'https://devzip.site/chora',
                        author: { '@type': 'Person', name: 'Hoooon22' },
                    })}
                </script>
            </Helmet>

            {/* ── 계기판 ── */}
            <header className="chora-bar">
                <a className="back" href="/">← devzip</a>
                <span className="mark">CHORA</span>
                <span className="coords">126.9200, 37.5540 — 126.9235, 37.5575 · WGS84</span>
                <span className="wip">개발 중</span>
            </header>

            {/* ── 히어로: 살아 있는 보행 그래프 ── */}
            <section className="chora-stage">
                <CityCanvas env={env} onArrive={handleArrive} onCounts={handleCounts} onClock={handleClock} />
                <div className="scrim" />

                <div className="stage-copy">
                    <h1>
                        도시를 바꾸면,
                        <em>사람들이 달라진다.</em>
                    </h1>
                    <p>
                        실제 지리정보로 만든 3D 도시 위에 고유한 페르소나를 가진 AI 에이전트를 배치하고,
                        자연어로 환경을 바꿔 군중의 행동이 어떻게 달라지는지 관찰·분석하는 B2B 시뮬레이션 도구입니다.
                    </p>
                    <div className="stage-cta">
                        <a className="btn" href="https://github.com/Hoooon22/Chora" target="_blank" rel="noopener noreferrer">GitHub 저장소 열기</a>
                        <a className="btn ghost" href="mailto:momo990305@gmail.com">도입 문의하기</a>
                    </div>
                </div>

                <div className="stage-panel">
                    <div className="panel ctrl">
                        <div className="panel-hd">
                            <span>환경 바꾸기</span>
                            <span className="clock">{clock}</span>
                        </div>
                        <div className="chips">
                            <button
                                type="button"
                                aria-pressed={env.weather === 'rain'}
                                className={env.weather === 'rain' ? 'on' : ''}
                                onClick={() => changeEnv({ weather: env.weather === 'rain' ? 'clear' : 'rain' })}
                            >
                                {env.weather === 'rain' ? '비 그치게 하기' : '비 오게 하기'}
                            </button>
                            <button
                                type="button"
                                aria-pressed={env.time === 'night'}
                                className={env.time === 'night' ? 'on' : ''}
                                onClick={() => changeEnv({ time: env.time === 'night' ? 'day' : 'night' })}
                            >
                                {env.time === 'night' ? '낮으로 되돌리기' : '밤으로 바꾸기'}
                            </button>
                            <button
                                type="button"
                                aria-pressed={env.zone === 'commercial'}
                                className={env.zone === 'commercial' ? 'on' : ''}
                                onClick={() => changeEnv({ zone: env.zone === 'commercial' ? 'mixed' : 'commercial' })}
                            >
                                {env.zone === 'commercial' ? '용도지역 되돌리기' : '상업지역으로 바꾸기'}
                            </button>
                        </div>
                        <p className="panel-note">
                            누르면 환경 op가 적용되고, 걷고 있던 에이전트들이 목적지를 다시 고릅니다.
                        </p>
                    </div>

                    <div className="panel dist">
                        <div className="panel-hd">
                            <span>이 환경에서의 방문</span>
                            <span className="clock">{total}건</span>
                        </div>
                        <ul className="bars">
                            {CATEGORIES.map((c) => {
                                const v = counts[c.key] || 0;
                                const g = ghost ? ghost[c.key] || 0 : 0;
                                const share = total ? (v / total) * 100 : 0;
                                const gShare = ghostTotal ? (g / ghostTotal) * 100 : 0;
                                return (
                                    <li key={c.key}>
                                        <span className="nm">{c.label}</span>
                                        <span className="track">
                                            <i style={{ width: `${share}%`, background: c.color }} />
                                            {ghost && <b style={{ left: `${gShare}%` }} title={`직전 환경 ${gShare.toFixed(0)}%`} />}
                                        </span>
                                        <span className="pc">{share.toFixed(0)}%</span>
                                    </li>
                                );
                            })}
                        </ul>
                        <p className="panel-note">
                            {ghost ? '얇은 선은 직전 환경에서의 비중입니다.' : '환경을 바꾸면 직전 비중이 선으로 남습니다.'}
                        </p>
                    </div>

                    <div className="panel feed">
                        <div className="panel-hd"><span>방금 내린 결정</span></div>
                        {log.length === 0 ? (
                            <p className="panel-note">아직 도착한 에이전트가 없습니다.</p>
                        ) : (
                            <ul className="log">
                                {log.map((l) => (
                                    <li key={l.id}>
                                        <span className="t">{l.time}</span>
                                        <span className="go">go_to → {l.name}</span>
                                        <span className="why">{l.reason}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <p className="stage-disclaimer">
                    화면의 그래프는 브라우저에서 도는 축소 데모입니다. 실제 Chora는 같은 구조를 서울 서교동·연남동의
                    OSM 보행 그래프 위에서 서버가 돌리고, Unity가 그 결과를 3D로 그립니다.
                </p>
            </section>

            {/* ── 문제 ── */}
            <section className="chora-sec why">
                <div className="wrap">
                    <span className="eyebrow">문제</span>
                    <h2>지난달 데이터로는 다음 달을 못 만든다</h2>
                    <div className="why-grid">
                        <p>
                            기존 상권 분석과 도시 계획은 과거의 정적 데이터에 기댑니다.
                            신규 건물, 날씨, 정책처럼 아직 일어나지 않은 변수가 만들어 낼 결과는
                            그 데이터 안에 없습니다.
                        </p>
                        <p>
                            전통적 행위자 기반 모델은 확률 규칙으로 움직여서,
                            사람이 실제로 하는 맥락적이고 비합리적인 선택을 담지 못합니다.
                            “왜 그렇게 했는지”가 모델 안에 남지 않습니다.
                        </p>
                    </div>
                    <p className="why-lede">
                        Chora는 그 간극을 LLM 페르소나로 메웁니다.
                    </p>
                </div>
            </section>

            {/* ── 레이어 ── */}
            <section className="chora-sec layers">
                <div className="wrap">
                    <span className="eyebrow">구성</span>
                    <h2>네 겹으로 쌓는다</h2>
                    <div className="layer-list">
                        {LAYERS.map((l) => (
                            <article key={l.tag} className="layer">
                                <div className="layer-tag">{l.tag}</div>
                                <div className="layer-bd">
                                    <h3>{l.title}</h3>
                                    <p>{l.body}</p>
                                    <ul>
                                        {l.facts.map(f => <li key={f}>{f}</li>)}
                                    </ul>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── A/B ── */}
            <section className="chora-sec ab">
                <div className="wrap">
                    <span className="eyebrow">분석</span>
                    <h2>색 스케일을 공유하지 않으면 감소가 사라진다</h2>
                    <p className="sec-lede">
                        아래 두 히트맵은 같은 구역의 환경 변경 전후입니다. 전체 방문은 실제로 줄었습니다.
                        각자 정규화하면 그 감소가 그림에서 지워집니다.
                    </p>

                    <div className="ab-toggle" role="group" aria-label="히트맵 색 스케일">
                        <button type="button" className={sharedScale ? 'on' : ''} aria-pressed={sharedScale} onClick={() => setSharedScale(true)}>
                            스케일 공유
                        </button>
                        <button type="button" className={!sharedScale ? 'on' : ''} aria-pressed={!sharedScale} onClick={() => setSharedScale(false)}>
                            각자 정규화
                        </button>
                    </div>

                    <div className="ab-grid">
                        <HeatGrid cells={BEFORE_CELLS} max={sharedScale ? sharedMax : beforeMax} label="변경 전" total={beforeTotal} />
                        <HeatGrid cells={AFTER_CELLS} max={sharedScale ? sharedMax : afterMax} label="변경 후" total={afterTotal} />
                    </div>

                    <p className={`ab-verdict ${sharedScale ? 'ok' : 'warn'}`}>
                        {sharedScale
                            ? `스케일을 공유하면 변경 후가 눈에 띄게 어둡습니다. 총 방문 ${beforeTotal} → ${afterTotal}건, 실제로 ${Math.round((1 - afterTotal / beforeTotal) * 100)}% 줄었습니다.`
                            : `각자 정규화하니 두 그림이 비슷해 보입니다. 하지만 총 방문은 ${beforeTotal} → ${afterTotal}건으로 ${Math.round((1 - afterTotal / beforeTotal) * 100)}% 줄었습니다.`}
                    </p>
                </div>
            </section>

            {/* ── 설계 규율 ── */}
            <section className="chora-sec rules">
                <div className="wrap">
                    <span className="eyebrow">설계</span>
                    <h2>안 하기로 정한 것들</h2>
                    <p className="sec-lede">LLM을 많이 부르는 게 아니라, 부를 자리를 정확히 고르는 설계입니다.</p>
                    <div className="rule-list">
                        {RULES.map(r => (
                            <article key={r.head} className="rule">
                                <h3>{r.head}</h3>
                                <p>{r.body}</p>
                            </article>
                        ))}
                    </div>
                    <div className="cost">
                        <div className="cost-val">$1.53</div>
                        <p>
                            20명 × 시뮬레이션 14시간 + 회고를 실제 LLM으로 돌린 실측입니다.
                            실행 9.3분, 결정 383건, 그중 90%에 기억이 포함됐습니다.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── 상태 ── */}
            <section className="chora-sec status">
                <div className="wrap">
                    <span className="eyebrow">현재</span>
                    <h2>구현은 끝났고, 검증이 남았다</h2>
                    <ol className="phases">
                        {PHASES.map(p => (
                            <li key={p.id} className={p.done ? 'done' : ''}>
                                <span className="ph">phase {p.id}</span>
                                <span className="bd">{p.body}</span>
                                <span className="st">{p.done ? '완료' : '백로그'}</span>
                            </li>
                        ))}
                    </ol>

                    <div className="status-cols">
                        <div className="unverified">
                            <h3>아직 검증되지 않은 것</h3>
                            <ul>
                                <li>Unity Play 모드 육안 확인 3건</li>
                                <li>에이전트 100명 스케일 성능</li>
                                <li>실측 유동인구 데이터와의 상관 검증</li>
                            </ul>
                            <p>각 항목의 근거는 저장소 docs/ROADMAP.md에 남겨 두었습니다.</p>
                        </div>
                        <dl className="stack">
                            {STACK.map(([k, v]) => (
                                <div key={k}>
                                    <dt>{k}</dt>
                                    <dd>{v}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            </section>

            {/* ── 맺음 ── */}
            <section className="chora-sec end">
                <div className="wrap">
                    <h2>아직 준비 중입니다</h2>
                    <p className="sec-lede">
                        데모와 도입 안내는 준비되는 대로 이 페이지에 올립니다.
                        그동안은 저장소에서 코드와 설계 문서를 먼저 보실 수 있습니다.
                    </p>
                    <div className="stage-cta">
                        <a className="btn" href="https://github.com/Hoooon22/Chora" target="_blank" rel="noopener noreferrer">GitHub 저장소 열기</a>
                        <a className="btn ghost" href="mailto:momo990305@gmail.com">momo990305@gmail.com</a>
                    </div>
                </div>
                <footer className="chora-foot">
                    <span>Chora · Hoooon22</span>
                    <a href="/">devzip.site</a>
                </footer>
            </section>
        </div>
    );
};

export default Chora;
