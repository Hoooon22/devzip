import React, { useCallback, useMemo, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Confound.css';

// CONFOUND — 관찰 데이터의 기울기는 무엇을 뜻하는가.
//
// "A인 사람일수록 B가 높았다"는 문장은 하루에도 몇 번씩 헤드라인이 된다.
// 그 문장 자체는 대개 사실이다 — 데이터에 기울기가 실제로 있으니까.
// 문제는 그 기울기가 "A를 바꾸면 B가 바뀐다"는 뜻인지가 데이터만 봐서는 알 수 없다는 것이다.
// 같은 산점도가 숨은 변수 Z의 위치에 따라 전혀 다른 이야기가 된다.
//
// 세 가지 구조 (X = 원인 후보, Y = 결과, Z = 숨은 제3의 변수):
//   교란 Z→X, Z→Y   Z가 X와 Y를 동시에 밀어 올린다. X와 Y 사이엔 아무 일도 없는데 기울기가 생긴다.
//   매개 X→Z→Y      Z는 X가 Y에 이르는 통로다. 기울기는 진짜지만, Z를 막으면 진짜가 사라진다.
//   충돌 X→Z←Y      Z는 X와 Y가 함께 만든 결과다. 원래 기울기는 정직한데, Z를 건드리면 없던 게 생긴다.
//
// 진짜 인과효과(X를 한 단위 올렸을 때 Y의 변화)는 구조마다 다르게 정의된다:
//   교란·충돌 → beta (직접효과)
//   매개      → beta + w^2 (직접효과 + Z를 거쳐 가는 몫 = 총효과)
//
// 데이터 생성은 seed 기반 결정론적 PRNG를 쓴다. 슬라이더를 움직여도 같은 표본이 유지되어
// "구조/세기만 바뀌었을 때 그림이 어떻게 변하는가"를 볼 수 있다.

const STRUCTURES = [
    {
        key: 'fork',
        name: '교란',
        en: 'confounder  Z → X,  Z → Y',
        zName: '가정의 학습 환경',
        desc: 'Z가 X와 Y를 동시에 밀어 올린다. X는 Y에 아무 일도 하지 않는데 산점도에는 기울기가 남는다.',
        lesson: 'Z를 통제해야 진실에 닿는다 — 관찰된 기울기는 부풀려져 있다.',
    },
    {
        key: 'chain',
        name: '매개',
        en: 'mediator  X → Z → Y',
        zName: '정보 탐색 습관',
        desc: 'Z는 X가 Y에 이르는 통로다. X가 Z를 바꾸고 Z가 Y를 바꾼다.',
        lesson: 'Z를 통제하면 진짜 통로를 막아 버린다 — 총효과를 알고 싶다면 보정하면 안 된다.',
    },
    {
        key: 'collider',
        name: '충돌',
        en: 'collider  X → Z ← Y',
        zName: '관찰 대상 선정 지표',
        desc: 'Z는 X와 Y가 함께 만들어 낸 결과다. 표본을 고르는 기준이 흔히 여기에 해당한다.',
        lesson: '통제하는 순간 없던 상관이 생긴다 — 보정이 오히려 거짓을 만든다.',
    },
];

const SAMPLES = [120, 400, 900];
const BANDS = [0, 1, 2];   // Z 삼분위 — 낮음 / 중간 / 높음
const X_LABEL = '하루 화면 사용 시간';
const Y_LABEL = '인지 처리 점수';

// ---- 결정론적 난수 ----
const mulberry32 = (a) => () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const gauss = (r) => {
    const u = Math.max(1e-9, r());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
};

const build = (structure, beta, w, n, seed) => {
    const r = mulberry32(seed);
    const s = Math.sqrt(Math.max(0, 1 - w * w));
    const pts = [];
    for (let i = 0; i < n; i++) {
        let x;
        let y;
        let z;
        if (structure === 'fork') {
            z = gauss(r);
            x = w * z + s * gauss(r);
            y = beta * x + w * z + s * gauss(r);
        } else if (structure === 'chain') {
            x = gauss(r);
            z = w * x + s * gauss(r);
            y = w * z + beta * x + s * gauss(r);
        } else {
            x = gauss(r);
            y = beta * x + gauss(r);
            z = w * x + w * y + s * gauss(r);
        }
        pts.push({ x, y, z });
    }
    return pts;
};

// 단순 회귀 기울기 — 눈에 보이는 그대로의 기울기
const naiveSlope = (pts) => {
    const n = pts.length;
    let mx = 0;
    let my = 0;
    for (const p of pts) {
        mx += p.x;
        my += p.y;
    }
    mx /= n;
    my /= n;
    let sxy = 0;
    let sxx = 0;
    for (const p of pts) {
        sxy += (p.x - mx) * (p.y - my);
        sxx += (p.x - mx) ** 2;
    }
    return { slope: sxx < 1e-9 ? 0 : sxy / sxx, mx, my };
};

// Z를 통제한 부분회귀계수 — "Z가 같은 사람들끼리만 비교했을 때"의 기울기
const partialSlope = (pts) => {
    const n = pts.length;
    let mx = 0;
    let my = 0;
    let mz = 0;
    for (const p of pts) {
        mx += p.x;
        my += p.y;
        mz += p.z;
    }
    mx /= n;
    my /= n;
    mz /= n;
    let sxx = 0;
    let szz = 0;
    let sxy = 0;
    let szy = 0;
    let sxz = 0;
    for (const p of pts) {
        const a = p.x - mx;
        const b = p.y - my;
        const c = p.z - mz;
        sxx += a * a;
        szz += c * c;
        sxy += a * b;
        szy += c * b;
        sxz += a * c;
    }
    const den = sxx * szz - sxz * sxz;
    return Math.abs(den) < 1e-9 ? 0 : (sxy * szz - szy * sxz) / den;
};

const trueEffect = (structure, beta, w) => (structure === 'chain' ? beta + w * w : beta);

const headlineOf = (slope) => {
    const a = Math.abs(slope);
    if (a < 0.08) return `${X_LABEL}, ${Y_LABEL}과 무관한 것으로 나타나`;
    const grade = a > 0.55 ? '뚜렷하게 ' : a > 0.25 ? '' : '다소 ';
    return slope > 0
        ? `${X_LABEL}이 긴 집단, ${Y_LABEL} ${grade}높았다`
        : `${X_LABEL}이 긴 집단, ${Y_LABEL} ${grade}낮았다`;
};

const truthOf = (t) => {
    const a = Math.abs(t);
    if (a < 0.08) return `${X_LABEL}을 실제로 늘려도 ${Y_LABEL}은 사실상 그대로다.`;
    return t > 0
        ? `${X_LABEL}을 한 단위 늘리면 ${Y_LABEL}은 ${t.toFixed(2)}만큼 오른다.`
        : `${X_LABEL}을 한 단위 늘리면 ${Y_LABEL}은 ${Math.abs(t).toFixed(2)}만큼 떨어진다.`;
};

// ---- 산점도 좌표계 ----
const W = 620;
const H = 300;
const X_SPAN = 3.4;
const Y_SPAN = 4.2;
const sx = (v) => ((v + X_SPAN) / (2 * X_SPAN)) * W;
const sy = (v) => H - ((v + Y_SPAN) / (2 * Y_SPAN)) * H;

// 점 수백 개를 원소 하나하나로 그리면 슬라이더를 끌 때마다 그만큼의 노드를 다시 만든다.
// 같은 색으로 묶이는 점들을 path 하나에 몰아 넣는다 — 삼분위 색칠이 곧 세 개의 path다.
const dotsPath = (pts, r) => {
    let d = '';
    for (const p of pts) {
        const cx = sx(p.x);
        const cy = sy(p.y);
        d += `M${(cx - r).toFixed(1)},${cy.toFixed(1)}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
    }
    return d;
};

// 기울기 m 인 직선을 (mx,my)에 걸어 화면 양 끝까지 그린다
const lineOf = (m, mx, my) => {
    const y1 = my + m * (-X_SPAN - mx);
    const y2 = my + m * (X_SPAN - mx);
    return `M${sx(-X_SPAN).toFixed(1)},${sy(y1).toFixed(1)} L${sx(X_SPAN).toFixed(1)},${sy(y2).toFixed(1)}`;
};

const Confound = () => {
    const [structure, setStructure] = useState('fork');
    const [beta, setBeta] = useState(0);
    const [w, setW] = useState(0.75);
    const [n, setN] = useState(400);
    const [reveal, setReveal] = useState(false);
    const [seed, setSeed] = useState(20260824);

    const active = STRUCTURES.find((s) => s.key === structure);

    const model = useMemo(() => {
        const pts = build(structure, beta, w, n, seed);
        const { slope: naive, mx, my } = naiveSlope(pts);
        const adj = partialSlope(pts);
        const truth = trueEffect(structure, beta, w);

        // Z 삼분위 — 숨은 변수를 "드러낼" 때 점을 나누는 기준
        const zs = pts.map((p) => p.z).sort((a, b) => a - b);
        const q1 = zs[Math.floor(zs.length / 3)];
        const q2 = zs[Math.floor((2 * zs.length) / 3)];
        const r = n > 500 ? 1.9 : 2.6;
        const bandPaths = BANDS.map((b) =>
            dotsPath(pts.filter((p) => (p.z < q1 ? 0 : p.z < q2 ? 1 : 2) === b), r)
        );

        return { bandPaths, naive, adj, truth, mx, my };
    }, [structure, beta, w, n, seed]);

    const { bandPaths, naive, adj, truth, mx, my } = model;
    const gapNaive = Math.abs(naive - truth);
    const gapAdj = Math.abs(adj - truth);
    const winner = gapNaive <= gapAdj ? 'naive' : 'adj';
    const misleading = gapNaive > 0.15;

    const reroll = useCallback(() => setSeed((v) => (v * 1664525 + 1013904223) % 2147483647), []);

    return (
        <LabShell
            title="CONFOUND"
            eyebrow="correlation / causation / collider bias"
            subtitle={'// 같은 산점도, 다른 진실 — 숨은 변수 하나가 기울기의 의미를 바꾼다'}
            path="confound"
        >
            <section className="k-win cf-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">/study/</span>observational</span>
                    <span className="meta k-mono">n={n} · {active.key}</span>
                </div>

                <div className="cf-toolbar">
                    <div className="cf-stat">
                        <span className="cf-stat-k k-mono">관찰된 기울기</span>
                        <span className={`cf-stat-v ${misleading ? 'is-bad' : ''}`}>{naive.toFixed(2)}</span>
                        <span className="cf-stat-s">눈에 보이는 그대로</span>
                    </div>
                    <div className="cf-stat">
                        <span className="cf-stat-k k-mono">Z를 통제한 기울기</span>
                        <span className={`cf-stat-v ${winner === 'adj' ? 'is-ok' : 'is-bad'}`}>{adj.toFixed(2)}</span>
                        <span className="cf-stat-s">Z가 같은 사람끼리 비교</span>
                    </div>
                    <div className="cf-stat cf-stat-truth">
                        <span className="cf-stat-k k-mono">진짜 인과효과</span>
                        <span className="cf-stat-v is-truth">{truth.toFixed(2)}</span>
                        <span className="cf-stat-s">X를 직접 바꿨을 때</span>
                    </div>
                    <div className="cf-actions">
                        <button type="button" className="cf-btn" onClick={reroll}>↻ 새 표본</button>
                        <button
                            type="button"
                            className={`cf-btn ${reveal ? 'cf-btn-hot' : ''}`}
                            onClick={() => setReveal((v) => !v)}
                        >
                            {reveal ? '◉ Z 감추기' : '◎ Z 드러내기'}
                        </button>
                    </div>
                </div>

                <div className={`cf-verdict is-${winner}`}>
                    <span className="cf-verdict-k k-mono">verdict</span>
                    <span className="cf-verdict-v">
                        {winner === 'naive'
                            ? `이 구조에서는 보정이 함정이다 — 관찰선이 진실과 ${gapNaive.toFixed(2)} 차이인데, 보정선은 ${gapAdj.toFixed(2)}만큼 벌어진다.`
                            : `이 구조에서는 보정이 옳다 — 관찰선이 진실과 ${gapNaive.toFixed(2)} 어긋나 있고, 보정선은 ${gapAdj.toFixed(2)}까지 좁힌다.`}
                    </span>
                </div>

                <div className="cf-stage">
                    <div className="cf-plotwrap">
                        <svg className="cf-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${X_LABEL}과 ${Y_LABEL}의 산점도`}>
                            <line className="cf-axis" x1="0" y1={sy(0)} x2={W} y2={sy(0)} />
                            <line className="cf-axis" x1={sx(0)} y1="0" x2={sx(0)} y2={H} />
                            {BANDS.map((b) => (
                                <path key={b} className={`cf-dots ${reveal ? `is-b${b}` : ''}`} d={bandPaths[b]} />
                            ))}
                            <path className="cf-line-naive" d={lineOf(naive, mx, my)} />
                            {reveal && <path className="cf-line-adj" d={lineOf(adj, mx, my)} />}
                        </svg>
                        <div className="cf-axislabels k-mono">
                            <span>↑ {Y_LABEL}</span>
                            <span>{X_LABEL} →</span>
                        </div>
                        <ul className="cf-legend k-mono">
                            <li><i className="sw sw-naive" />관찰선 (단순 회귀)</li>
                            {reveal && <li><i className="sw sw-adj" />보정선 (Z 통제)</li>}
                            {reveal && <li><i className="sw sw-band" />점 색 = Z 삼분위</li>}
                        </ul>
                    </div>

                    <div className="cf-side">
                        <div className="cf-dag">
                            <span className="cf-dag-k k-mono">가정한 인과 구조</span>
                            <svg viewBox="0 0 200 120" role="img" aria-label={`인과 구조: ${active.en}`}>
                                <defs>
                                    <marker id="cfArrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                                        <path d="M0,0 L6,3 L0,6 z" className="cf-arrowhead" />
                                    </marker>
                                </defs>
                                <circle className="cf-node" cx="34" cy="92" r="17" />
                                <text className="cf-nodetext" x="34" y="97">X</text>
                                <circle className="cf-node" cx="166" cy="92" r="17" />
                                <text className="cf-nodetext" x="166" y="97">Y</text>
                                <circle className="cf-node is-z" cx="100" cy="26" r="17" />
                                <text className="cf-nodetext" x="100" y="31">Z</text>

                                <path className="cf-edge is-main" d="M53,92 L147,92" markerEnd="url(#cfArrow)" />
                                {structure === 'fork' && (
                                    <>
                                        <path className="cf-edge is-z" d="M87,38 L47,79" markerEnd="url(#cfArrow)" />
                                        <path className="cf-edge is-z" d="M113,38 L153,79" markerEnd="url(#cfArrow)" />
                                    </>
                                )}
                                {structure === 'chain' && (
                                    <>
                                        <path className="cf-edge is-z" d="M47,79 L87,38" markerEnd="url(#cfArrow)" />
                                        <path className="cf-edge is-z" d="M113,38 L153,79" markerEnd="url(#cfArrow)" />
                                    </>
                                )}
                                {structure === 'collider' && (
                                    <>
                                        <path className="cf-edge is-z" d="M47,79 L87,38" markerEnd="url(#cfArrow)" />
                                        <path className="cf-edge is-z" d="M153,79 L113,38" markerEnd="url(#cfArrow)" />
                                    </>
                                )}
                            </svg>
                            <p className="cf-dag-note">
                                <b>Z</b>{` = ${active.zName}`}
                            </p>
                        </div>

                        <div className="cf-headline">
                            <span className="cf-headline-k k-mono">이 데이터로 쓸 수 있는 기사</span>
                            <p className="cf-headline-t">{`“${headlineOf(naive)}”`}</p>
                            <p className="cf-headline-truth">
                                <span className="k-mono">실제로는 </span>
                                {truthOf(truth)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="cf-controls">
                    <div className="cf-structures">
                        <span className="cf-label k-mono">숨은 변수 Z의 자리</span>
                        <div className="cf-structure-row">
                            {STRUCTURES.map((s) => (
                                <button
                                    key={s.key}
                                    type="button"
                                    className={`cf-structure ${structure === s.key ? 'is-on' : ''}`}
                                    onClick={() => setStructure(s.key)}
                                >
                                    <span className="nm">{s.name}</span>
                                    <span className="en k-mono">{s.en}</span>
                                </button>
                            ))}
                        </div>
                        <p className="cf-structure-desc">{active.desc}</p>
                        <p className="cf-structure-lesson">{active.lesson}</p>
                    </div>

                    <div className="cf-knobs">
                        <span className="cf-label k-mono">손잡이</span>
                        <label className="cf-range">
                            <span className="nm">진짜 직접효과 X→Y <b>{beta.toFixed(2)}</b></span>
                            <input
                                type="range"
                                min="-0.6"
                                max="0.9"
                                step="0.05"
                                value={beta}
                                onChange={(e) => setBeta(Number(e.target.value))}
                            />
                            <span className="sub">0으로 두면 X는 Y에 아무 일도 하지 않는다</span>
                        </label>
                        <label className="cf-range">
                            <span className="nm">Z가 붙잡은 힘 <b>{w.toFixed(2)}</b></span>
                            <input
                                type="range"
                                min="0"
                                max="0.9"
                                step="0.05"
                                value={w}
                                onChange={(e) => setW(Number(e.target.value))}
                            />
                            <span className="sub">0이면 Z는 그림에서 빠지고 관찰선이 곧 진실이 된다</span>
                        </label>
                        <div className="cf-samples">
                            <span className="nm">표본 수</span>
                            <div className="cf-sample-row">
                                {SAMPLES.map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        className={`cf-sample ${n === v ? 'is-on' : ''}`}
                                        onClick={() => setN(v)}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                            <span className="sub">늘려 보면 점은 촘촘해지는데 어긋남은 그대로다</span>
                        </div>
                    </div>
                </div>

                <p className="cf-hint">
                    {'먼저 '}<b>교란</b>{'에서 진짜 직접효과를 '}<b>0</b>{'으로 두세요. X는 Y에 아무 일도 하지 않는데 산점도에는 '}
                    {'선명한 기울기가 남고, 기사 문구까지 그럴듯하게 완성됩니다. '}
                    <b>Z 드러내기</b>{'를 누르면 점이 세 덩어리로 갈라지고 — 덩어리 안에서는 기울기가 사라집니다. '}
                    {'다음은 '}<b>충돌</b>{'입니다. 여기서는 관찰선이 처음부터 정직한데, 같은 버튼을 눌러 Z를 통제하는 순간 '}
                    {'보정선이 반대 방향으로 꺾입니다 — 없던 상관을 손으로 만들어 낸 것입니다. '}
                    {'마지막으로 '}<b>표본 수</b>{'를 900까지 올려 보세요. 점은 촘촘해지지만 어긋남은 한 치도 줄지 않습니다.'}
                </p>

                <div className="k-resize"></div>
            </section>

            <section className="k-win cf-foot-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="cf-foot">
                    <p>
                        {'"상관관계는 인과관계가 아니다"는 문장은 너무 자주 인용된 나머지 오히려 힘을 잃었다. '}
                        {'모두가 외우고 있지만, 정작 직관과 어긋나는 헤드라인을 만나면 대부분 곧바로 인과로 읽는다. '}
                        {'그럴 만도 하다 — 데이터에 기울기가 '}<b>실제로</b>{' 있기 때문이다. 거짓말은 숫자에 있지 않고, '}
                        {'그 숫자를 문장으로 옮기는 순간에 슬쩍 끼어든다.'}
                    </p>
                    <p>
                        {'가장 익숙한 함정은 '}<b>교란</b>{'이다. 제3의 변수가 X와 Y를 동시에 밀어 올리면, 둘 사이에 아무 관계가 없어도 '}
                        {'산점도에는 또렷한 기울기가 생긴다. 그래서 통계학은 "보정한다(control for)"는 도구를 마련했다. '}
                        {'Z가 비슷한 사람들끼리만 묶어 비교하면 Z가 만들어 낸 몫이 걷히고 남은 것이 진짜에 가까워진다.'}
                    </p>
                    <p>
                        {'문제는 이 도구가 너무 잘 들어서, '}<b>많이 보정할수록 좋다</b>{'는 습관이 생긴다는 점이다. '}
                        {'그러나 보정이 옳은지는 데이터가 아니라 '}<b>Z가 인과 그림의 어디에 서 있는가</b>{'가 정한다. '}
                        {'Z가 X와 Y 사이의 통로라면(매개) 보정은 진짜 효과가 흘러가는 길을 막아 버린다. '}
                        {'Z가 X와 Y가 함께 만들어 낸 결과라면(충돌) 보정은 없던 상관을 만들어 낸다 — '}
                        {'X가 높은데도 Z가 정해진 값이라면 Y는 낮아야만 하기 때문이다. 표본을 고르는 기준이 바로 이 자리에 서기 쉽다. '}
                        {'"조건을 만족하는 사람만 모았다"는 흔한 문장이, 실은 충돌변수를 통제한 것과 같다.'}
                    </p>
                    <p>
                        {'그래서 관찰 데이터에서 인과를 읽으려면 데이터를 더 모으는 것으로는 부족하다. '}
                        {'표본을 120에서 900으로 늘리면 점은 촘촘해지고 신뢰구간은 좁아지지만, 편향은 그대로 남는다. '}
                        {'정밀해질 뿐 정확해지지 않는 것이다. 필요한 것은 더 많은 점이 아니라 '}
                        <b>점들이 어떻게 생겨났는지에 대한 가정</b>{' — 즉 인과 그림을 먼저 그리고, 그 그림이 시키는 대로 '}
                        {'무엇을 보정하고 무엇을 건드리지 말지 정하는 일이다. 그 가정은 데이터 안에 없다.'}
                    </p>
                    <p className="cf-disclaimer">
                        {'* 화면 사용 시간·인지 점수는 개념을 설명하기 위한 가상의 축이며, 이 페이지의 점은 모두 '}
                        {'위 규칙으로 즉석에서 생성한 합성 데이터입니다. 특정 연구·기관·인물의 결과가 아니고 실측치도 아닙니다. '}
                        {'모든 변수는 표준화된 값으로 다루며, 보정선은 Z를 공변량으로 넣은 최소제곱 부분회귀계수입니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Confound;
