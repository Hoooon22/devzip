import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Mixture.css';

// 토큰을 N명의 "전문가" 중 소수(top-k)에게만 보내는 희소 라우팅(MoE) 시뮬레이터.
// 핵심: 전체 신경망을 매번 다 켜지 않고, 라우터가 각 토큰을 어울리는 전문가
// 몇 명에게만 보낸다 → 같은 용량으로도 훨씬 적은 연산.

// FNV 계열 해시 → 0..1. (토큰, 전문가, 시드)로 결정적 게이트 점수를 만든다.
function gate(str, salt) {
    let h = (2166136261 ^ salt) >>> 0;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
}

// 텍스트를 토큰으로 — 한글/한자/가나는 글자당, 영문·숫자는 덩어리, 기호는 단일.
function toTokens(text) {
    const out = [];
    const re = /[가-힣]|[぀-ヿ]|[一-鿿]|[A-Za-z]+|[0-9]+|[^\s]/gu;
    let m;
    while ((m = re.exec(text)) !== null) {
        out.push(m[0]);
        if (out.length >= 72) break; // 시각화 한도
    }
    return out;
}

function softmax(arr) {
    const mx = Math.max(...arr);
    const ex = arr.map((v) => Math.exp((v - mx) * 6));
    const s = ex.reduce((a, b) => a + b, 0) || 1;
    return ex.map((v) => v / s);
}

// 전체 코퍼스를 라우팅. balance=true면 부하가 큰 전문가에 페널티를 줘 토큰을 고르게 분산
// (실제 MoE의 load-balancing 보조 손실을 흉내낸다). false면 라우터가 쏠려 "죽은 전문가"가 생긴다.
function routeAll(tokens, N, k, seed, balance) {
    const load = new Array(N).fill(0);
    const routed = tokens.map((tok) => {
        const scored = [];
        for (let e = 0; e < N; e++) {
            let s = gate(tok + '#' + e, seed);
            if (balance) s -= load[e] * 0.045;
            scored.push({ e, s });
        }
        scored.sort((a, b) => b.s - a.s);
        const picks = scored.slice(0, k);
        const w = softmax(picks.map((p) => p.s));
        picks.forEach((p) => { load[p.e] += 1; });
        return { tok, experts: picks.map((p) => p.e), weights: w, top: picks[0].e };
    });
    return { routed, load };
}

// 전문가 구분용 차분한 색 — 보라 그라데이션 배제, 톤만 다른 무채/저채도 순환
const EXPERT_COLORS = [
    '#4a8c7f', '#9c8347', '#5f7e9c', '#8a6f7e', '#6f8a5f',
    '#a06a4a', '#5a6f8a', '#7e8a4a', '#8a5f6f', '#4a8a8a',
    '#7a7a55', '#6a5f8a',
];

const PRESETS = [
    { label: '한국어', text: '전문가 혼합 모델은 모든 뉴런을 켜지 않는다. 라우터가 토큰마다 어울리는 전문가 몇 명만 골라 보낸다. 그래서 용량은 크지만 실제 연산은 작다.' },
    { label: '영어', text: 'A mixture of experts routes each token to only a few specialists. The network is huge but the active compute stays small and cheap.' },
    { label: '코드', text: 'function route(token){ return router.topK(token, 2); }' },
    { label: '뒤섞인 입력', text: '안녕 hello 123 世界 routing 토큰 sparse 희소 model 모델 expert 전문가 9 9 9' },
];

const SAMPLE = PRESETS[0].text;

const Mixture = () => {
    const [text, setText] = useState(SAMPLE);
    const [experts, setExperts] = useState(8);
    const [topK, setTopK] = useState(2);
    const [balance, setBalance] = useState(false);
    const [seed, setSeed] = useState(7);
    const [focus, setFocus] = useState(0);
    const [playing, setPlaying] = useState(false);
    const timerRef = useRef(null);

    const tokens = useMemo(() => toTokens(text), [text]);
    const k = Math.min(topK, experts);

    const { routed, load } = useMemo(
        () => routeAll(tokens, experts, k, seed, balance),
        [tokens, experts, k, seed, balance]
    );

    const focusIdx = tokens.length ? Math.min(focus, tokens.length - 1) : 0;
    const focusRoute = routed[focusIdx];

    const stats = useMemo(() => {
        const total = tokens.length || 1;
        const savings = experts ? 1 - k / experts : 0;
        const dead = load.filter((l) => l === 0).length;
        const maxLoad = load.length ? Math.max(...load) : 0;
        const mean = (total * k) / experts;
        const imbalance = mean ? maxLoad / mean : 0;
        return { savings, dead, maxLoad, imbalance, mean };
    }, [load, tokens.length, k, experts]);

    // 그래프/입력이 바뀌면 포커스·재생 초기화
    useEffect(() => {
        setFocus(0);
    }, [text]);

    // 자동 라우팅 — 토큰을 하나씩 훑으며 포커스 이동
    useEffect(() => {
        if (!playing || tokens.length === 0) return undefined;
        timerRef.current = setInterval(() => {
            setFocus((f) => (f + 1) % tokens.length);
        }, 650);
        return () => clearInterval(timerRef.current);
    }, [playing, tokens.length]);

    const onChipHover = useCallback((idx) => {
        setPlaying(false);
        setFocus(idx);
    }, []);

    // ---- SVG 라우터 다이어그램 좌표 ----
    const svgW = 360;
    const rowGap = 30;
    const top = 26;
    const svgH = top * 2 + (experts - 1) * rowGap;
    const tokenX = 54;
    const expertX = 286;
    const tokenY = svgH / 2;
    const expertY = (e) => top + e * rowGap;

    const focusSet = new Set(focusRoute ? focusRoute.experts : []);
    const weightOf = (e) => {
        if (!focusRoute) return 0;
        const i = focusRoute.experts.indexOf(e);
        return i >= 0 ? focusRoute.weights[i] : 0;
    };

    return (
        <div className="mx-container">
            <div className="mx-inner">
                <Link to="/" className="mx-back">← 실험실로 돌아가기</Link>

                <header className="mx-header">
                    <h1 className="mx-title">MIXTURE</h1>
                    <p className="mx-sub">{'// 전부 켜지 않는다 — 토큰을 소수의 전문가에게만 보내는 희소 라우팅'}</p>
                </header>

                <div className="mx-stage">
                    {/* 좌측: 입력 + 토큰 스트립 + 라우터 다이어그램 */}
                    <section className="mx-left">
                        <div className="mx-presets">
                            <span className="mx-presets-label">예시:</span>
                            {PRESETS.map((p) => (
                                <button
                                    key={p.label}
                                    type="button"
                                    className="mx-preset-btn"
                                    onClick={() => setText(p.text)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <textarea
                            className="mx-input"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            spellCheck={false}
                            placeholder="문장을 입력하면 토큰마다 전문가에게 라우팅됩니다…"
                        />

                        <div className="mx-viz-head">
                            <span>토큰 → 전문가 (색 = top-1 전문가)</span>
                            <span className="mx-viz-meta">토큰에 올리면 라우팅 확인</span>
                        </div>
                        <div className="mx-strip">
                            {tokens.length === 0 && <span className="mx-empty">입력이 비어 있습니다.</span>}
                            {routed.map((r, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    className={'mx-tok' + (idx === focusIdx ? ' mx-tok-focus' : '')}
                                    style={{ borderBottomColor: EXPERT_COLORS[r.top % EXPERT_COLORS.length] }}
                                    onMouseEnter={() => onChipHover(idx)}
                                    onFocus={() => onChipHover(idx)}
                                    title={`E${r.top + 1} 외 ${r.experts.length - 1}명`}
                                >
                                    {r.tok}
                                </button>
                            ))}
                        </div>

                        <div className="mx-router">
                            <div className="mx-router-head">
                                <span className="mx-router-token">
                                    {focusRoute ? `"${focusRoute.tok}"` : '—'}
                                </span>
                                <span className="mx-router-route">
                                    {focusRoute
                                        ? '→ ' + focusRoute.experts.map((e) => 'E' + (e + 1)).join(' · ')
                                        : '토큰을 입력하세요'}
                                </span>
                            </div>
                            <svg
                                className="mx-svg"
                                viewBox={`0 0 ${svgW} ${svgH}`}
                                style={{ maxHeight: svgH }}
                                preserveAspectRatio="xMidYMid meet"
                            >
                                {/* 라우팅 선 */}
                                {Array.from({ length: experts }).map((_, e) => {
                                    const on = focusSet.has(e);
                                    const w = weightOf(e);
                                    return (
                                        <line
                                            key={e}
                                            x1={tokenX + 8}
                                            y1={tokenY}
                                            x2={expertX - 18}
                                            y2={expertY(e)}
                                            className={on ? 'mx-wire mx-wire-on' : 'mx-wire'}
                                            style={on ? { strokeWidth: 1.5 + w * 5 } : undefined}
                                        />
                                    );
                                })}
                                {/* 토큰 노드 */}
                                <circle cx={tokenX} cy={tokenY} r={9} className="mx-node-token" />
                                <text x={tokenX} y={tokenY - 16} className="mx-node-label" textAnchor="middle">router</text>
                                {/* 전문가 노드 */}
                                {Array.from({ length: experts }).map((_, e) => {
                                    const on = focusSet.has(e);
                                    return (
                                        <g key={e}>
                                            <rect
                                                x={expertX - 12}
                                                y={expertY(e) - 10}
                                                width={48}
                                                height={20}
                                                rx={3}
                                                className={on ? 'mx-exp mx-exp-on' : 'mx-exp'}
                                                style={on ? { fill: EXPERT_COLORS[e % EXPERT_COLORS.length] } : undefined}
                                            />
                                            <text
                                                x={expertX + 12}
                                                y={expertY(e) + 4}
                                                className={on ? 'mx-exp-label mx-exp-label-on' : 'mx-exp-label'}
                                                textAnchor="middle"
                                            >
                                                E{e + 1}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                            <div className="mx-router-foot">
                                <button
                                    type="button"
                                    className="mx-play"
                                    onClick={() => setPlaying((p) => !p)}
                                >
                                    {playing ? '⏸ 멈춤' : '▶ 자동 라우팅'}
                                </button>
                                <span className="mx-router-note">
                                    {experts}명 중 <b>{k}명</b>만 활성 — 나머지 {experts - k}명은 잠든다
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* 우측: 컨트롤 + 지표 + 전문가 부하 */}
                    <aside className="mx-panel">
                        <div className="mx-control">
                            <label htmlFor="mx-experts">전문가 수 <b>{experts}</b></label>
                            <input
                                id="mx-experts"
                                type="range"
                                min={4}
                                max={12}
                                value={experts}
                                onChange={(e) => setExperts(Number(e.target.value))}
                            />
                        </div>

                        <div className="mx-control">
                            <span className="mx-control-label">활성 전문가 top-k</span>
                            <div className="mx-krow">
                                {[1, 2, 3].map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        className={'mx-kbtn' + (topK === v ? ' mx-kbtn-on' : '')}
                                        onClick={() => setTopK(v)}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            className={'mx-toggle' + (balance ? ' mx-toggle-on' : '')}
                            onClick={() => setBalance((b) => !b)}
                        >
                            <span className="mx-toggle-dot" />
                            부하 분산 {balance ? 'ON' : 'OFF'}
                        </button>

                        <div className="mx-stat mx-stat-main">
                            <span className="mx-stat-num">{(stats.savings * 100).toFixed(0)}<small>%</small></span>
                            <span className="mx-stat-label">연산 절감 (밀집 대비)</span>
                        </div>

                        <div className="mx-stat-row">
                            <div className="mx-stat">
                                <span className="mx-stat-num mx-mini">{stats.dead}</span>
                                <span className="mx-stat-label">죽은 전문가</span>
                            </div>
                            <div className="mx-stat">
                                <span className="mx-stat-num mx-mini">{stats.imbalance.toFixed(2)}<small>×</small></span>
                                <span className="mx-stat-label">최대/평균 부하</span>
                            </div>
                        </div>

                        <div className="mx-loads">
                            <div className="mx-loads-head">
                                <span>전문가별 처리량</span>
                                <button type="button" className="mx-reshuffle" onClick={() => setSeed((s) => s + 1)}>
                                    ↻ 가중치 재설정
                                </button>
                            </div>
                            {load.map((l, e) => {
                                const pct = stats.maxLoad ? (l / stats.maxLoad) * 100 : 0;
                                const dead = l === 0;
                                return (
                                    <div className="mx-load-row" key={e}>
                                        <span className="mx-load-tag">E{e + 1}</span>
                                        <div className="mx-load-track">
                                            <div
                                                className={'mx-load-fill' + (dead ? ' mx-load-dead' : '')}
                                                style={{
                                                    width: `${pct}%`,
                                                    background: dead ? undefined : EXPERT_COLORS[e % EXPERT_COLORS.length],
                                                }}
                                            />
                                        </div>
                                        <span className="mx-load-val">{l}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </aside>
                </div>

                <footer className="mx-foot">
                    <p>
                        {'거대 모델이라고 매 토큰마다 그 모든 무게를 다 짊어지는 건 아니다. '}
                        <b>라우터</b>{'가 토큰마다 어울리는 '}<b>전문가 소수(top-k)</b>{'만 깨워 일을 시키고 '}
                        {'나머지는 잠재운다. 그래서 '}<b>용량(아는 것)</b>{'은 키우면서도 '}
                        <b>실제 연산(매번 쓰는 것)</b>{'은 작게 유지한다 — 이게 요즘 \'효율 모델\'들이 '}
                        {'같은 비용으로 더 큰 머리를 갖는 비결이다.'}
                    </p>
                    <p>
                        {'단, 라우터가 한쪽으로 쏠리면 몇몇은 과로하고 몇몇은 '}<b>한 번도 안 불려(죽은 전문가)</b>
                        {' 용량을 낭비한다. \'부하 분산\'을 켜고 끄며 처리량 막대가 어떻게 고르게/쏠리게 변하는지, '}
                        {'top-k를 늘릴수록 절감률이 어떻게 깎이는지 직접 비교해 보라.'}
                    </p>
                    <p className="mx-disclaimer">
                        {'* 실제 모델의 학습된 게이팅이 아니라 라우팅 원리를 보여주는 결정적 근사 시뮬레이터입니다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default Mixture;
