import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/ZeroClick.css';

// ZERO CLICK — 답만 받고 떠나는 웹.
//
// 검색창에 물으면 이제 링크 목록 대신 답이 먼저 나온다. 답이 충분하면 아무 데도 클릭하지 않고 창을 닫는다.
// 편해진 만큼 한 가지가 조용히 끊긴다 — 그 답의 재료를 쓴 쪽으로 흘러가던 방문이다.
//
// 여기서 다루는 것은 특정 검색 서비스나 특정 매체가 아니라, 그 아래 깔린 보편 구조다:
//   요약 계층은 원본을 재료로 삼고, 원본은 방문으로 먹고산다.
//   요약이 방문을 대신 흡수할수록 재료를 만드는 쪽이 줄고, 재료가 줄면 요약도 얕아진다.
// 즉 자기 먹이를 스스로 갉는 되먹임 고리다.
//
// 한 달(라운드)의 흐름:
//   질의 1,000건 → 요약이 답해 버리는 몫(커버리지) / 남는 몫은 원본으로 직행
//               → 요약이 답한 것 중 일부만 출처를 눌러 본다(인용 클릭률)
//               → 원본에 닿은 방문이 곧 매체의 수입, 운영비를 못 넘기면 적자가 쌓인다
//               → 적자가 바닥을 뚫으면 문을 닫고, 흑자면 빈자리로 새 매체가 들어온다
//               → 살아남은 매체의 합이 코퍼스 두께가 되고, 두께가 다음 달 요약의 깊이를 정한다
//
// 되먹임 스위치가 이 실험의 핵심 질문이다.
//   ON  = 원본이 마르면 요약도 얕아져 답을 다 못 하고, 그래서 방문이 원본으로 돌아온다(자기 제동).
//   OFF = 원본이 말라도 요약은 계속 답한 척한다. 이때 생태계는 축소가 아니라 붕괴로 간다.

const SLOTS = 40;              // 격자 = 매체 자리 (8 × 5)
const QUERIES = 1000;          // 한 달에 들어오는 질의
const DEATH_FLOOR = -14;       // 적자 한계 — 뚫으면 폐업
const RESERVE_CAP = 70;
const SEED_RESERVE = 12;
const HISTORY = 72;            // 시계열에 남기는 개월 수

const mulberry32 = (a) => () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const makeWorld = (seed) => {
    const rnd = mulberry32(seed);
    const pubs = Array.from({ length: SLOTS }, (_, i) => ({
        id: i,
        q: 0.35 + rnd() * 0.9,                  // 콘텐츠 매력도 — 방문이 갈리는 가중치
        alive: true,
        reserve: SEED_RESERVE + rnd() * 10,
        clicks: 0,
    }));
    return {
        pubs,
        qTotal: pubs.reduce((s, p) => s + p.q, 0),
        month: 0,
        rndState: seed * 977 + 13,
        log: [],
    };
};

// 한 달 진행 — world 를 제자리에서 갱신하고 스냅샷을 돌려준다.
const step = (w, cfg) => {
    const { coverage, cite, cost, feedback, entry } = cfg;
    const rnd = mulberry32(w.rndState);
    w.rndState = (w.rndState * 1103515245 + 12345) & 0x7fffffff;

    const alive = w.pubs.filter((p) => p.alive);
    const depth = alive.reduce((s, p) => s + p.q, 0) / w.qTotal;    // 코퍼스 두께 0..1
    const answer = feedback ? 0.2 + 0.8 * depth : 1;                // 요약이 실제로 답이 되는 비율
    const covEff = coverage * answer;
    const clicks = QUERIES * ((1 - covEff) + covEff * cite);

    const qSum = alive.reduce((s, p) => s + p.q, 0) || 1;
    alive.forEach((p) => {
        p.clicks = clicks * (p.q / qSum);
        p.reserve = Math.min(RESERVE_CAP, p.reserve + p.clicks - cost);
    });

    let died = 0;
    alive.forEach((p) => {
        if (p.reserve < DEATH_FLOOR) {
            p.alive = false;
            p.reserve = DEATH_FLOOR;
            p.clicks = 0;
            died += 1;
        }
    });

    const survivors = w.pubs.filter((p) => p.alive);
    const margin = survivors.length
        ? survivors.reduce((s, p) => s + (p.clicks - cost), 0) / survivors.length
        : -cost;

    let born = 0;
    if (margin > 0) {
        const chance = Math.min(0.9, (margin / cost) * entry);
        w.pubs.forEach((p) => {
            if (!p.alive && born < 3 && rnd() < chance) {
                p.alive = true;
                p.reserve = SEED_RESERVE;
                p.clicks = 0;
                born += 1;
            }
        });
    }

    w.month += 1;
    const snap = {
        month: w.month,
        n: w.pubs.filter((p) => p.alive).length,
        depth,
        answer,
        covEff,
        clicks,
        margin,
        died,
        born,
    };
    w.log.push(snap);
    if (w.log.length > HISTORY) w.log.shift();
    return snap;
};

const PRESETS = [
    { key: 'links', label: '링크의 시대', cfg: { coverage: 0.05, cite: 0.3, cost: 18, feedback: true } },
    { key: 'now', label: '요약이 절반', cfg: { coverage: 0.55, cite: 0.12, cost: 18, feedback: true } },
    { key: 'full', label: '요약이 전면에', cfg: { coverage: 0.9, cite: 0.02, cost: 18, feedback: true } },
    { key: 'blind', label: '마르는 줄 모르는 요약', cfg: { coverage: 0.9, cite: 0.02, cost: 18, feedback: false } },
    { key: 'fair', label: '출처를 눌러 주는 세계', cfg: { coverage: 0.9, cite: 0.35, cost: 18, feedback: true } },
];

const pct = (v) => `${Math.round(v * 100)}%`;

const ZeroClick = () => {
    const [coverage, setCoverage] = useState(0.55);
    const [cite, setCite] = useState(0.12);
    const [cost, setCost] = useState(18);
    const [feedback, setFeedback] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [seed, setSeed] = useState(7);

    const worldRef = useRef(makeWorld(7));
    const [snap, setSnap] = useState(() => ({
        month: 0, n: SLOTS, depth: 1, answer: 1, covEff: 0.55, clicks: QUERIES, margin: 0, died: 0, born: 0,
    }));
    const [, forceTiles] = useState(0);

    // 슬라이더는 매 스텝 읽히므로 ref 로 최신값을 넘긴다 (setInterval 재생성 방지)
    const cfgRef = useRef(null);
    cfgRef.current = { coverage, cite, cost, feedback, entry: 0.25 };

    const advance = useCallback(() => {
        const s = step(worldRef.current, cfgRef.current);
        setSnap(s);
        forceTiles((t) => t + 1);
    }, []);

    const reset = useCallback((nextSeed) => {
        const s = nextSeed ?? seed;
        worldRef.current = makeWorld(s);
        setSeed(s);
        setPlaying(false);
        setSnap({ month: 0, n: SLOTS, depth: 1, answer: 1, covEff: coverage, clicks: QUERIES, margin: 0, died: 0, born: 0 });
        forceTiles((t) => t + 1);
    }, [seed, coverage]);

    useEffect(() => {
        if (!playing) return undefined;
        const id = setInterval(advance, 420);
        return () => clearInterval(id);
    }, [playing, advance]);

    const applyPreset = (p) => {
        setCoverage(p.cfg.coverage);
        setCite(p.cfg.cite);
        setCost(p.cfg.cost);
        setFeedback(p.cfg.feedback);
        reset(seed);
    };

    const world = worldRef.current;
    const log = world.log;

    // 질의 1,000건의 행선지 — 요약이 삼킨 몫 / 인용 클릭 / 요약을 안 거친 직행
    const flow = useMemo(() => {
        const eff = snap.month === 0 ? coverage : snap.covEff;
        const direct = 1 - eff;
        const cited = eff * cite;
        return { direct, cited, absorbed: eff * (1 - cite) };
    }, [snap, coverage, cite]);

    const verdict = useMemo(() => {
        if (snap.month === 0) return { tone: 'idle', head: '대기', body: '한 달씩 돌리거나 재생을 눌러 보세요.' };
        if (snap.n === 0) {
            return {
                tone: 'dead',
                head: '붕괴 — 회복 불가',
                body: '요약할 원본이 하나도 남지 않았습니다. 방문이 돌아와도 받을 곳이 없어 스스로는 다시 채워지지 않습니다.',
            };
        }
        const recent = log.slice(-10);
        const drift = recent.length >= 4 ? recent[recent.length - 1].n - recent[0].n : 0;
        if (snap.n <= 8) return { tone: 'dead', head: '고사 직전', body: `${snap.n}곳만 남았습니다. 남은 방문이 소수에 몰려 겨우 버티는 상태입니다.` };
        if (drift <= -2) return { tone: 'warn', head: '축소 중', body: '원본이 계속 문을 닫는 중입니다. 코퍼스가 얇아지는 만큼 요약도 같이 얕아집니다.' };
        if (drift >= 2) return { tone: 'ok', head: '회복 중', body: '원본으로 돌아온 방문이 운영비를 넘겨 빈자리가 다시 채워지고 있습니다.' };
        return {
            tone: snap.n >= SLOTS * 0.7 ? 'ok' : 'warn',
            head: snap.n >= SLOTS * 0.7 ? '균형' : '축소 균형',
            body: `${snap.n}곳에서 멈췄습니다. 더 줄지도 늘지도 않는 자리를 찾은 상태입니다.`,
        };
    }, [snap, log]);

    // 시계열 — 생존 매체 수 / 원본에 닿은 방문
    const chart = useMemo(() => {
        if (log.length < 2) return null;
        const W = 100;
        const H = 100;
        const dx = W / Math.max(1, HISTORY - 1);
        const toPath = (pick, max) => log
            .map((s, i) => `${i === 0 ? 'M' : 'L'}${(i * dx).toFixed(2)},${(H - (pick(s) / max) * H).toFixed(2)}`)
            .join(' ');
        return {
            pubs: toPath((s) => s.n, SLOTS),
            clicks: toPath((s) => s.clicks, QUERIES),
        };
    }, [log]);

    const tileState = (p) => {
        if (!p.alive) return 'dead';
        if (p.reserve < 0) return 'red';
        if (p.reserve < SEED_RESERVE) return 'thin';
        return 'live';
    };

    return (
        <LabShell
            title="ZERO CLICK"
            eyebrow="answer layer / citation / corpus collapse"
            subtitle={'// 답만 받고 떠나는 웹 — 요약이 삼킨 방문은 그 답의 재료를 만든 곳으로 돌아가지 않는다'}
            path="zero-click"
        >
            <section className="k-win zc-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">/web/</span>attention</span>
                    <span className="meta k-mono">{snap.month}개월 · 질의 {QUERIES.toLocaleString()}건/월</span>
                </div>

                <div className="zc-toolbar">
                    <div className="zc-stat">
                        <span className="zc-stat-k k-mono">살아있는 원본</span>
                        <span className={`zc-stat-v ${snap.n <= 8 ? 'is-bad' : ''}`}>{snap.n}<i>/{SLOTS}</i></span>
                        <span className="zc-stat-s">문 닫지 않은 매체</span>
                    </div>
                    <div className="zc-stat">
                        <span className="zc-stat-k k-mono">코퍼스 두께</span>
                        <span className="zc-stat-v">{pct(snap.depth)}</span>
                        <span className="zc-stat-s">요약이 쓸 재료의 양</span>
                    </div>
                    <div className="zc-stat">
                        <span className="zc-stat-k k-mono">원본에 닿은 방문</span>
                        <span className={`zc-stat-v ${snap.clicks < QUERIES * 0.3 ? 'is-bad' : ''}`}>{Math.round(snap.clicks)}</span>
                        <span className="zc-stat-s">질의 1,000건 중</span>
                    </div>
                    <div className="zc-stat zc-stat-edge">
                        <span className="zc-stat-k k-mono">한 곳당 월 수지</span>
                        <span className={`zc-stat-v ${snap.margin < 0 ? 'is-bad' : 'is-ok'}`}>
                            {snap.month === 0 ? '—' : `${snap.margin > 0 ? '+' : ''}${snap.margin.toFixed(1)}`}
                        </span>
                        <span className="zc-stat-s">방문 − 운영비</span>
                    </div>

                    <div className="zc-actions">
                        <button type="button" className={`zc-btn ${playing ? 'zc-btn-hot' : ''}`} onClick={() => setPlaying((v) => !v)}>
                            {playing ? '‖ 정지' : '▶ 재생'}
                        </button>
                        <button type="button" className="zc-btn" onClick={advance} disabled={playing}>▷ 한 달</button>
                        <button type="button" className="zc-btn" onClick={() => reset(seed + 1)}>↺ 리셋</button>
                    </div>
                </div>

                <div className={`zc-verdict is-${verdict.tone}`}>
                    <strong>{verdict.head}</strong>
                    <span>{verdict.body}</span>
                </div>

                <div className="zc-body">
                    <div className="zc-left">
                        <div className="zc-sec-k k-mono">질의 1,000건은 어디로 가는가</div>
                        <div className="zc-flow" role="img" aria-label={`요약이 삼킨 몫 ${pct(flow.absorbed)}, 인용 클릭 ${pct(flow.cited)}, 직행 ${pct(flow.direct)}`}>
                            <div className="zc-flow-seg is-absorbed" style={{ flexGrow: Math.max(0.001, flow.absorbed) }}>
                                <span>{pct(flow.absorbed)}</span>
                            </div>
                            <div className="zc-flow-seg is-cited" style={{ flexGrow: Math.max(0.001, flow.cited) }}>
                                <span>{pct(flow.cited)}</span>
                            </div>
                            <div className="zc-flow-seg is-direct" style={{ flexGrow: Math.max(0.001, flow.direct) }}>
                                <span>{pct(flow.direct)}</span>
                            </div>
                        </div>
                        <ul className="zc-legend k-mono">
                            <li><i className="sw is-absorbed" />요약이 삼킴 — 원본에 방문이 없다</li>
                            <li><i className="sw is-cited" />출처를 눌러 봄</li>
                            <li><i className="sw is-direct" />요약을 안 거치고 직행</li>
                        </ul>

                        <div className="zc-sec-k k-mono">원본 40곳 — 적자가 쌓이면 문을 닫는다</div>
                        <div className="zc-grid">
                            {world.pubs.map((p) => {
                                const st = tileState(p);
                                const fill = p.alive
                                    ? Math.max(0.08, (p.reserve - DEATH_FLOOR) / (RESERVE_CAP - DEATH_FLOOR))
                                    : 0;
                                return (
                                    <div
                                        key={p.id}
                                        className={`zc-tile is-${st}`}
                                        title={p.alive ? `방문 ${p.clicks.toFixed(1)} · 잔고 ${p.reserve.toFixed(1)}` : '폐업'}
                                    >
                                        <span className="zc-tile-fill" style={{ height: `${fill * 100}%` }} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="zc-right">
                        <div className="zc-sec-k k-mono">{`지난 ${HISTORY}개월`}</div>
                        <div className="zc-chart">
                            {chart ? (
                                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="생존 매체와 원본 방문의 시계열">
                                    <line x1="0" y1="50" x2="100" y2="50" className="zc-ax" />
                                    <path d={chart.clicks} className="zc-line-clicks" />
                                    <path d={chart.pubs} className="zc-line-pubs" />
                                </svg>
                            ) : (
                                <p className="zc-chart-empty k-mono">{'// 두 달 이상 돌리면 그려집니다'}</p>
                            )}
                        </div>
                        <ul className="zc-legend k-mono">
                            <li><i className="sw is-pubs" />살아있는 원본 (0–40)</li>
                            <li><i className="sw is-clicks" />원본에 닿은 방문 (0–1,000)</li>
                        </ul>

                        <div className="zc-sec-k k-mono">요약 계층의 깊이</div>
                        <div className="zc-meter">
                            <div className="zc-meter-bar"><span style={{ width: pct(snap.answer) }} /></div>
                            <p className="zc-meter-cap">
                                {feedback
                                    ? `원본이 마른 만큼 요약도 얕아진다 — 지금 ${pct(snap.answer)}만 실제로 답이 된다.`
                                    : '되먹임을 껐다 — 재료가 말라도 요약은 답한 척한다.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="zc-controls">
                    <label className="zc-ctl">
                        <span className="zc-ctl-k k-mono">요약 커버리지 <b>{pct(coverage)}</b></span>
                        <input type="range" min="0" max="0.98" step="0.01" value={coverage} onChange={(e) => setCoverage(Number(e.target.value))} />
                        <span className="zc-ctl-s">요약만으로 끝나는 질의의 비율</span>
                    </label>
                    <label className="zc-ctl">
                        <span className="zc-ctl-k k-mono">인용 클릭률 <b>{pct(cite)}</b></span>
                        <input type="range" min="0" max="0.6" step="0.01" value={cite} onChange={(e) => setCite(Number(e.target.value))} />
                        <span className="zc-ctl-s">요약을 읽고도 출처를 눌러 보는 비율</span>
                    </label>
                    <label className="zc-ctl">
                        <span className="zc-ctl-k k-mono">운영비 <b>{cost}</b></span>
                        <input type="range" min="6" max="30" step="1" value={cost} onChange={(e) => setCost(Number(e.target.value))} />
                        <span className="zc-ctl-s">한 곳이 한 달을 버티는 데 필요한 방문</span>
                    </label>
                    <div className="zc-ctl zc-ctl-switch">
                        <span className="zc-ctl-k k-mono">되먹임</span>
                        <button
                            type="button"
                            className={`zc-toggle ${feedback ? 'is-on' : ''}`}
                            onClick={() => setFeedback((v) => !v)}
                            aria-pressed={feedback}
                        >
                            {feedback ? '원본이 마르면 요약도 얕아진다' : '재료가 말라도 요약은 답한다'}
                        </button>
                        <span className="zc-ctl-s">끄면 자기 제동이 사라진다</span>
                    </div>
                </div>

                <div className="zc-presets">
                    <span className="zc-sec-k k-mono">시나리오</span>
                    {PRESETS.map((p) => (
                        <button key={p.key} type="button" className="zc-chip" onClick={() => applyPreset(p)}>{p.label}</button>
                    ))}
                </div>
            </section>

            <section className="k-win zc-foot-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="zc-foot">
                    <p>
                        {'웹은 오랫동안 단순한 거래로 굴러갔다. 누군가 글을 쓰고, 검색이 그 글로 사람을 보내고, 방문이 글값을 치렀다. '}
                        {'요약 계층이 그 사이에 끼면서 거래의 한쪽이 조용히 빠졌다. 답은 여전히 그 글에서 나오는데, '}
                        {'방문은 더 이상 그 글까지 가지 않는다. 이것이 '}<b>제로 클릭</b>{'이다.'}
                    </p>
                    <p>
                        {'한 번의 질의만 놓고 보면 아무 문제가 없다. 묻는 쪽은 시간을 아꼈고, 요약하는 쪽은 답을 잘했다. '}
                        {'문제는 그 답의 재료가 '}<b>같은 흐름으로 먹고사는 곳</b>{'에서 나온다는 데 있다. '}
                        {'개별로는 합리적인 선택이 모이면 재료 자체가 줄어드는 구조 — 공유지의 비극과 같은 모양이다.'}
                    </p>
                    <p>
                        {'되먹임을 켜 두면 이 고리는 스스로 제동을 건다. 원본이 문을 닫을수록 요약이 쓸 재료가 얇아지고, '}
                        {'얇아진 요약은 답을 다 못 해서 방문을 원본으로 돌려보낸다. 그래서 생태계는 '}<b>붕괴가 아니라 축소 균형</b>{'에서 멈춘다. '}
                        {'커버리지를 90%까지 밀어도 절반쯤은 살아남는 것이 그 때문이다.'}
                    </p>
                    <p>
                        {'되먹임을 끄면 이야기가 달라진다. 재료가 말라도 요약이 계속 답하는 세계에서는 제동이 걸리지 않고, '}
                        {'인용 클릭률이 바닥이면 40곳이 전부 문을 닫는다. 그리고 이 상태는 되돌아오지 않는다 — '}
                        {'방문이 돌아와도 '}<b>받을 곳이 없기 때문</b>{'이다. 흡수는 서서히 일어나지만 복구는 자동으로 일어나지 않는다.'}
                    </p>
                    <p>
                        {'그래서 이 실험에서 가장 민감한 손잡이는 커버리지가 아니라 '}<b>인용 클릭률</b>{'이다. '}
                        {'커버리지를 85%로 고정한 채 인용 클릭률만 0%에서 올려 보면, 0%에서는 전멸하지만 5%만 되어도 열 곳 남짓이 살아남고 '}
                        {'그 뒤로는 거의 비례해서 생존 수가 늘어난다. 요약을 줄이지 않고도 생태계를 살리는 길이 있다는 뜻이고, '}
                        {'그 길은 "출처를 얼마나 눌러 보게 만드는가"에 걸려 있다.'}
                    </p>
                    <p className="zc-disclaimer">
                        {'* 질의 수·운영비·매체 수는 구조를 보기 위한 가상의 단위이며 실제 트래픽·수익 지표가 아닙니다. '}
                        {'특정 검색 서비스·AI 제품·언론사를 모델링한 것이 아니라, 요약 계층과 원본 사이의 일반적인 되먹임만 다룹니다. '}
                        {'매체별 매력도와 신규 진입은 seed 기반 결정론적 난수로 생성합니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default ZeroClick;
