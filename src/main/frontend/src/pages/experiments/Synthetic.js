import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Synthetic.css';

// 합성 데이터(synthetic data) 생성 실험.
// 핵심: 진짜 데이터 몇 점을 본떠서, 원본을 그대로 베끼지 않고 "분포만 닮은" 가짜 점을 찍어낸다.
// 노이즈(σ)를 거의 안 주면 합성점이 원본 위에 그대로 앉아 분포는 완벽히 닮지만 사실상 복제 —
// 프라이버시가 샌다(memorization). 노이즈를 키우면 원본에서 멀어져 안전해지지만 분포가 뭉개진다.
// 그 사이 어딘가에 "쓸만하면서 안전한" 줄다리기의 균형점이 있다.

// 결정적 PRNG (재현 가능한 샘플링)
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

// Box-Muller — 표준정규 난수
function gaussian(rng) {
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const clamp01 = (x) => Math.max(0, Math.min(1, x));

const G = 12;          // 분포 비교용 격자 해상도
const LEAK_R = 0.025;  // 이 반경 안에 원본이 있으면 "복제"로 간주

// 프리셋 — 결정적으로 생성한 원본 분포
function makePreset(kind) {
    if (kind === 'clear') return [];
    const seed = kind === 'clusters' ? 11 : kind === 'ring' ? 23 : 37;
    const rng = mulberry32(seed);
    const pts = [];
    if (kind === 'clusters') {
        [[0.32, 0.36], [0.7, 0.66]].forEach((c) => {
            for (let i = 0; i < 22; i++) {
                pts.push({ x: clamp01(c[0] + gaussian(rng) * 0.06), y: clamp01(c[1] + gaussian(rng) * 0.06) });
            }
        });
    } else if (kind === 'ring') {
        for (let i = 0; i < 46; i++) {
            const a = rng() * Math.PI * 2;
            const r = 0.3 + gaussian(rng) * 0.022;
            pts.push({ x: clamp01(0.5 + Math.cos(a) * r), y: clamp01(0.5 + Math.sin(a) * r) });
        }
    } else {
        for (let i = 0; i < 44; i++) {
            const t = rng();
            pts.push({ x: clamp01(0.15 + t * 0.7 + gaussian(rng) * 0.03), y: clamp01(0.18 + t * 0.66 + gaussian(rng) * 0.03) });
        }
    }
    return pts;
}

const Synthetic = () => {
    const [real, setReal] = useState(() => makePreset('clusters'));
    const [sigmaPct, setSigmaPct] = useState(6); // 0..25 → σ = /100
    const [count, setCount] = useState(120);
    const [seed, setSeed] = useState(7);
    const svgRef = useRef(null);

    const sigma = sigmaPct / 100;

    // 합성 점 생성: 원본 하나를 무작위로 골라 가우시안 노이즈를 더한다
    const synth = useMemo(() => {
        if (real.length === 0) return [];
        const rng = mulberry32(seed * 7919 + 1);
        const out = [];
        for (let i = 0; i < count; i++) {
            const src = real[Math.floor(rng() * real.length)];
            const x = clamp01(src.x + gaussian(rng) * sigma);
            const y = clamp01(src.y + gaussian(rng) * sigma);
            let nd = Infinity;
            for (let k = 0; k < real.length; k++) {
                const dx = x - real[k].x;
                const dy = y - real[k].y;
                const d = dx * dx + dy * dy;
                if (d < nd) nd = d;
            }
            out.push({ x, y, leak: Math.sqrt(nd) < LEAK_R });
        }
        return out;
    }, [real, sigma, count, seed]);

    // 지표: 프라이버시(복제 비율의 반대) + 충실도(격자 분포 겹침)
    const metrics = useMemo(() => {
        if (real.length === 0 || synth.length === 0) {
            return { leakFrac: 0, privacy: 1, fidelity: 0, leaks: 0 };
        }
        const leaks = synth.filter((s) => s.leak).length;
        const leakFrac = leaks / synth.length;

        const gr = new Array(G * G).fill(0);
        const gs = new Array(G * G).fill(0);
        const bin = (p, arr) => {
            const gx = Math.min(G - 1, Math.floor(p.x * G));
            const gy = Math.min(G - 1, Math.floor(p.y * G));
            arr[gy * G + gx] += 1;
        };
        real.forEach((p) => bin(p, gr));
        synth.forEach((p) => bin(p, gs));
        let overlap = 0;
        for (let i = 0; i < G * G; i++) {
            overlap += Math.min(gr[i] / real.length, gs[i] / synth.length);
        }
        return { leakFrac, privacy: 1 - leakFrac, fidelity: overlap, leaks };
    }, [real, synth]);

    let verdict = 'sweet';
    if (real.length === 0) verdict = 'empty';
    else if (metrics.leakFrac > 0.5) verdict = 'memorize';
    else if (metrics.fidelity < 0.5) verdict = 'collapse';

    const onCanvasClick = useCallback((e) => {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const x = clamp01((e.clientX - rect.left) / rect.width);
        const y = clamp01((e.clientY - rect.top) / rect.height);
        setReal((r) => [...r, { x, y }]);
    }, []);

    const verdictText =
        verdict === 'memorize'
            ? '복제 위험 — 원본을 베끼고 있음'
            : verdict === 'collapse'
            ? '분포 붕괴 — 너무 뭉개짐'
            : verdict === 'empty'
            ? '원본을 찍어 보세요'
            : '균형 — 쓸만하고 안전함';
    const verdictIcon =
        verdict === 'memorize' ? '⚠' : verdict === 'collapse' ? '🌫' : verdict === 'empty' ? '∅' : '✓';

    return (
        <div className="sy-container">
            <div className="sy-inner">
                <Link to="/" className="sy-back">← 실험실로 돌아가기</Link>

                <header className="sy-header">
                    <h1 className="sy-title">SYNTHETIC</h1>
                    <p className="sy-sub">{'// 원본을 베끼지 않고 분포만 닮은 가짜 데이터를 찍어낸다 — 합성 데이터 생성'}</p>
                </header>

                <div className="sy-stage">
                    {/* 좌측: 캔버스 */}
                    <section className="sy-left">
                        <div className="sy-canvas-head">
                            <span>원본 {real.length} · 합성 {synth.length} · 복제 {metrics.leaks}</span>
                            <span className="sy-legend">
                                <i className="sy-chip sy-chip-real" />원본
                                <i className="sy-chip sy-chip-synth" />합성
                                <i className="sy-chip sy-chip-leak" />복제
                            </span>
                        </div>

                        <svg
                            ref={svgRef}
                            className="sy-canvas"
                            viewBox="0 0 400 400"
                            onClick={onCanvasClick}
                            role="presentation"
                        >
                            {[1, 2, 3, 4, 5].map((i) => (
                                <g key={i}>
                                    <line className="sy-grid" x1={(i * 400) / 6} y1="0" x2={(i * 400) / 6} y2="400" />
                                    <line className="sy-grid" x1="0" y1={(i * 400) / 6} x2="400" y2={(i * 400) / 6} />
                                </g>
                            ))}

                            {synth.map((p, idx) => (
                                <circle
                                    key={'s' + idx}
                                    className={p.leak ? 'sy-pt-leak' : 'sy-pt-synth'}
                                    cx={p.x * 400}
                                    cy={p.y * 400}
                                    r={p.leak ? 4.2 : 3}
                                />
                            ))}

                            {real.map((p, idx) => (
                                <circle key={'r' + idx} className="sy-pt-real" cx={p.x * 400} cy={p.y * 400} r={4.4} />
                            ))}

                            {real.length === 0 && (
                                <text className="sy-hint" x="200" y="200" textAnchor="middle">
                                    캔버스를 클릭해 원본 데이터를 찍으세요
                                </text>
                            )}
                        </svg>

                        <div className="sy-presets">
                            <span className="sy-presets-label">원본 분포</span>
                            <button type="button" className="sy-btn" onClick={() => setReal(makePreset('clusters'))}>두 군집</button>
                            <button type="button" className="sy-btn" onClick={() => setReal(makePreset('ring'))}>고리</button>
                            <button type="button" className="sy-btn" onClick={() => setReal(makePreset('diagonal'))}>대각선</button>
                            <button type="button" className="sy-btn sy-btn-ghost" onClick={() => setReal([])}>비우기</button>
                        </div>
                        <p className="sy-tip">캔버스를 직접 클릭해 원본 점을 추가할 수도 있어요.</p>
                    </section>

                    {/* 우측: 컨트롤 + 지표 + 판정 */}
                    <aside className="sy-panel">
                        <div className="sy-control">
                            <label htmlFor="sy-sigma">노이즈 σ <b>{sigma.toFixed(2)}</b></label>
                            <input
                                id="sy-sigma"
                                type="range"
                                min={0}
                                max={25}
                                value={sigmaPct}
                                onChange={(e) => setSigmaPct(Number(e.target.value))}
                            />
                        </div>

                        <div className="sy-control">
                            <label htmlFor="sy-count">합성 개수 <b>{count}</b></label>
                            <input
                                id="sy-count"
                                type="range"
                                min={20}
                                max={300}
                                step={10}
                                value={count}
                                onChange={(e) => setCount(Number(e.target.value))}
                            />
                        </div>

                        <div className={'sy-verdict sy-verdict-' + verdict}>
                            <span className="sy-verdict-icon">{verdictIcon}</span>
                            <span className="sy-verdict-text">{verdictText}</span>
                        </div>

                        <div className="sy-meter">
                            <div className="sy-meter-head">
                                <span>프라이버시</span>
                                <b>{Math.round(metrics.privacy * 100)}<small>%</small></b>
                            </div>
                            <div className="sy-bar">
                                <div className="sy-bar-fill sy-bar-priv" style={{ width: `${metrics.privacy * 100}%` }} />
                            </div>
                            <span className="sy-meter-note">합성점이 원본을 그대로 베끼지 않은 비율</span>
                        </div>

                        <div className="sy-meter">
                            <div className="sy-meter-head">
                                <span>충실도</span>
                                <b>{Math.round(metrics.fidelity * 100)}<small>%</small></b>
                            </div>
                            <div className="sy-bar">
                                <div className="sy-bar-fill sy-bar-fid" style={{ width: `${metrics.fidelity * 100}%` }} />
                            </div>
                            <span className="sy-meter-note">합성 분포가 원본 분포를 닮은 정도(격자 겹침)</span>
                        </div>

                        <button type="button" className="sy-reshuffle" onClick={() => setSeed((s) => s + 1)}>
                            ↻ 노이즈 다시 샘플링
                        </button>
                    </aside>
                </div>

                <footer className="sy-foot">
                    <p>
                        {'합성 데이터는 진짜 데이터를 직접 공유하기 어려울 때, 그 '}<b>통계적 패턴만 본떠</b>
                        {' 만든 가짜 데이터다. 여기선 원본 점 하나를 무작위로 골라 '}<b>가우시안 노이즈 σ</b>
                        {'를 더해 새 점을 찍는 가장 단순한 방식(커널 샘플링)을 쓴다.'}
                    </p>
                    <p>
                        {'σ를 거의 0으로 두면 합성점이 원본 위에 그대로 앉는다 — 분포는 완벽히 닮지만 사실상 '}
                        <b>복제</b>{'라서, 원본이 누구 데이터였는지 그대로 새어 나간다(memorization). 반대로 σ를 키우면 '}
                        {'원본에서 멀어져 안전해지지만 군집·고리 같은 '}<b>구조가 뭉개진다</b>{'.'}
                    </p>
                    <p>
                        {'그래서 합성 데이터엔 항상 '}<b>프라이버시 ↔ 충실도</b>{'의 줄다리기가 있다. 두 막대가 동시에 '}
                        {'높게 유지되는 σ 구간 — 그 '}<b>균형점</b>{'을 찾는 게 이 실험의 전부다.'}
                    </p>
                    <p className="sy-disclaimer">
                        {'* 실제 생성 모델이 아니라 합성 데이터의 프라이버시–유용성 트레이드오프를 보여주는 결정적 근사 시뮬레이터입니다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default Synthetic;
