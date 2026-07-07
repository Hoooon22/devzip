import React, { useMemo, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Attention.css';

// ATTENTION — self-attention 메커니즘 실험.
// 핵심: 문장의 각 토큰은 다른 모든 토큰을 얼마나 "쳐다볼지(attend)"를 스스로 정한다.
// 토큰마다 Query(무엇을 찾는가)·Key(무엇을 내놓는가) 벡터가 있고, 쿼리 i가 키 j를 보는 점수는
// 두 벡터의 내적 q_i·k_j 다. 이 점수들을 softmax(√d로 스케일)로 확률처럼 정규화한 것이
// 어텐션 가중치이며, 그 가중치로 Value를 섞은 것이 그 토큰의 새 표현이 된다.
// 트랜스포머(=요즘 거의 모든 LLM/에이전트)의 심장이 바로 이 한 장의 가중치 행렬이다.

const AXES = ['주어', '행위', '대상', '수식', '시간', '구A', '구B'];
const D = AXES.length;
const SCALE = Math.sqrt(D); // 어텐션 스케일링 1/√d — 내적이 커져도 softmax가 포화하지 않게 한다.

// 역할별 기본 q(무엇을 찾는가)·k(무엇을 내놓는가). 앞 5개 축([주어,행위,대상,수식,시간]) 위에서 손으로 지은 값.
// 서술어는 주어·목적어를 찾고, 수식어는 자기가 꾸미는 명사를 찾고, 명사는 서술어와 자기 수식어를 찾는다.
const ROLE = {
    modifier: { q: [0.55, 0, 0.55, 0, 0], k: [0, 0, 0, 1, 0], label: '수식어' },
    subject: { q: [0, 0.7, 0, 0.8, 0], k: [1, 0, 0, 0, 0], label: '주어' },
    object: { q: [0, 0.7, 0, 0.8, 0], k: [0, 0, 1, 0, 0], label: '목적어' },
    adverb: { q: [0, 0.9, 0, 0, 0], k: [0, 0, 0, 0, 1], label: '부사' },
    verb: { q: [0.9, 0, 0.9, 0, 0.3], k: [0, 1, 0, 0, 0.2], label: '서술어' },
};
const PW = 0.9; // 같은 구(phrase, 수식어+명사)끼리 묶어 주는 결합 가중치 — 어떤 명사를 꾸미는지 구분.

const build = (text, role, phrase) => {
    const r = ROLE[role];
    const q = [...r.q, 0, 0];
    const k = [...r.k, 0, 0];
    if (phrase === 'A') { q[5] = PW; k[5] = PW; }
    if (phrase === 'B') { q[6] = PW; k[6] = PW; }
    return { text, role, roleLabel: r.label, q, k };
};

const SENTENCES = [
    {
        id: 'fox',
        label: '굶주린 여우가 붉은 포도를 결국 삼켰다',
        tokens: [
            build('굶주린', 'modifier', 'A'),
            build('여우가', 'subject', 'A'),
            build('붉은', 'modifier', 'B'),
            build('포도를', 'object', 'B'),
            build('결국', 'adverb', null),
            build('삼켰다', 'verb', null),
        ],
    },
    {
        id: 'wind',
        label: '차가운 바람이 마른 잎을 멀리 날렸다',
        tokens: [
            build('차가운', 'modifier', 'A'),
            build('바람이', 'subject', 'A'),
            build('마른', 'modifier', 'B'),
            build('잎을', 'object', 'B'),
            build('멀리', 'adverb', null),
            build('날렸다', 'verb', null),
        ],
    },
];

const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

// 쿼리 i가 모든 키 j를 보는 어텐션 가중치 행 = softmax( q_i·k_j / (√d · temp) ).
const softmaxRow = (tokens, i, temp) => {
    const scores = tokens.map((t) => dot(tokens[i].q, t.k) / (SCALE * temp));
    const mx = Math.max(...scores);
    const exps = scores.map((s) => Math.exp(s - mx));
    const sum = exps.reduce((a, b) => a + b, 0) || 1e-9;
    return exps.map((e) => e / sum);
};

// SVG 좌표 상수
const VBW = 600;
const VBH = 250;
const M = 46;      // 좌우 여백
const TOP_Y = 58;  // 쿼리 노드 y
const BOT_Y = 196; // 키 노드 y

const Attention = () => {
    const [sentId, setSentId] = useState('fox');
    const [queryIdx, setQueryIdx] = useState(5); // 기본: 서술어
    const [temp, setTemp] = useState(1.0);

    const sentence = useMemo(() => SENTENCES.find((s) => s.id === sentId), [sentId]);
    const tokens = sentence.tokens;
    const n = tokens.length;

    // 전체 어텐션 행렬 (행=쿼리, 열=키)
    const matrix = useMemo(
        () => tokens.map((_, i) => softmaxRow(tokens, i, temp)),
        [tokens, temp]
    );

    const qi = Math.min(queryIdx, n - 1);
    const row = matrix[qi];

    const keyX = (j) => M + (j * (VBW - 2 * M)) / (n - 1);
    const qx = keyX(qi);

    // 선택된 쿼리가 가장 크게 주목한 토큰
    const topJ = row.reduce((best, w, j) => (w > row[best] ? j : best), 0);

    const pickSentence = (id) => {
        setSentId(id);
        setQueryIdx((prev) => Math.min(prev, SENTENCES.find((s) => s.id === id).tokens.length - 1));
    };

    return (
        <LabShell
            title="ATTENTION"
            eyebrow="self-attention"
            subtitle={'// 각 토큰이 다른 토큰을 얼마나 쳐다볼지 스스로 정하는 softmax 가중치 — 트랜스포머의 심장'}
            path="attention.exe"
        >
            <section className="k-win at-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/model/</span>attention-head</span>
                    <span className="meta k-mono">softmax(QKᵀ/√d)</span>
                </div>

                <div className="at-toolbar">
                    <div className="at-seg" role="group" aria-label="예문 선택">
                        {SENTENCES.map((s) => (
                            <button key={s.id} type="button"
                                className={`at-seg-btn ${sentId === s.id ? 'is-on' : ''}`}
                                onClick={() => pickSentence(s.id)}>{s.label}</button>
                        ))}
                    </div>
                    <div className="at-ctrl">
                        <label className="at-ctrl-label k-mono" htmlFor="at-temp">
                            temperature <b>{temp.toFixed(1)}</b>
                        </label>
                        <input id="at-temp" type="range" min="0.3" max="2.5" step="0.1"
                            value={temp} onChange={(e) => setTemp(Number(e.target.value))} />
                        <span className="at-ctrl-hint k-mono">낮을수록 한 곳에 집중 · 높을수록 골고루</span>
                    </div>
                </div>

                {/* 쿼리 선택 — 문장의 토큰 칩 */}
                <div className="at-chips" role="group" aria-label="쿼리 토큰 선택">
                    {tokens.map((t, j) => (
                        <button key={j} type="button"
                            className={`at-chip ${j === qi ? 'is-q' : ''}`}
                            onClick={() => setQueryIdx(j)}>
                            <span className="at-chip-w">{t.text}</span>
                            <span className="at-chip-role k-mono">{t.roleLabel}</span>
                        </button>
                    ))}
                </div>

                <div className="at-stage">
                    {/* 왼쪽: 선택한 쿼리 → 키 어텐션 아크 */}
                    <div className="at-arc-col">
                        <svg className="at-arc" viewBox={`0 0 ${VBW} ${VBH}`} role="img"
                            aria-label={`"${tokens[qi].text}" 쿼리가 각 토큰을 주목하는 정도`}>
                            {/* 아크: 쿼리(위) → 각 키(아래), 굵기·불투명도 = 가중치 */}
                            {row.map((w, j) => {
                                const x2 = keyX(j);
                                const midY = (TOP_Y + BOT_Y) / 2;
                                const d = `M ${qx} ${TOP_Y + 14} C ${qx} ${midY}, ${x2} ${midY}, ${x2} ${BOT_Y - 14}`;
                                return (
                                    <path key={j} className={`at-link ${j === topJ ? 'is-top' : ''}`} d={d}
                                        style={{ strokeWidth: 1 + w * 13, opacity: 0.15 + w * 0.6 }} />
                                );
                            })}

                            {/* 쿼리 노드 */}
                            <g transform={`translate(${qx} ${TOP_Y})`}>
                                <circle className="at-qnode" r="15" />
                                <text className="at-qtext" y="5" textAnchor="middle">{tokens[qi].text}</text>
                                <text className="at-cap k-mono" y="-22" textAnchor="middle">query</text>
                            </g>

                            {/* 키 노드 + 가중치 라벨 */}
                            {row.map((w, j) => {
                                const x = keyX(j);
                                return (
                                    <g key={j} transform={`translate(${x} ${BOT_Y})`}
                                        className={`at-knode ${j === topJ ? 'is-top' : ''}`}>
                                        <circle r="13" />
                                        <text className="at-ktext" y="4" textAnchor="middle">{tokens[j].text}</text>
                                        <text className="at-kw k-mono" y="30" textAnchor="middle">
                                            {(w * 100).toFixed(0)}%
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                        <p className="at-arc-foot k-mono">
                            굵은 선 = <b>{tokens[qi].text}</b> 이(가) 크게 주목하는 토큰 · 가장 높은 곳: <b>{tokens[topJ].text}</b>
                        </p>
                    </div>

                    {/* 오른쪽: 전체 어텐션 행렬 + 분해 */}
                    <div className="at-right">
                        <div className="at-panel">
                            <div className="at-panel-head k-mono">
                                <span>attention matrix</span>
                                <span className="at-meta">행=쿼리 · 열=키</span>
                            </div>
                            <div className="at-grid" style={{ '--n': n }}>
                                <span className="at-corner k-mono">q＼k</span>
                                {tokens.map((t, j) => (
                                    <span key={`c${j}`} className="at-colh k-mono">{t.text}</span>
                                ))}
                                {matrix.map((r, i) => (
                                    <React.Fragment key={`r${i}`}>
                                        <button type="button"
                                            className={`at-rowh k-mono ${i === qi ? 'is-on' : ''}`}
                                            onClick={() => setQueryIdx(i)}>{tokens[i].text}</button>
                                        {r.map((w, j) => (
                                            <button key={`${i}-${j}`} type="button"
                                                className={`at-cell ${i === qi ? 'is-row' : ''} ${i === qi && j === topJ ? 'is-top' : ''}`}
                                                style={{ '--w': w }}
                                                title={`${tokens[i].text} → ${tokens[j].text}: ${(w * 100).toFixed(1)}%`}
                                                onClick={() => setQueryIdx(i)}>
                                                {(w * 100).toFixed(0)}
                                            </button>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        <div className="at-panel">
                            <div className="at-panel-head k-mono">
                                <span>“{tokens[qi].text}” 의 어텐션 분포</span>
                                <span className="at-meta">Σ = 100%</span>
                            </div>
                            <ul className="at-bars">
                                {row.map((w, j) => (
                                    <li key={j} className={`at-bar-row ${j === topJ ? 'is-top' : ''}`}>
                                        <span className="at-bar-word">{tokens[j].text}</span>
                                        <span className="at-bar"><span className="at-bar-fill"
                                            style={{ width: `${w * 100}%` }} /></span>
                                        <span className="at-bar-val k-mono">{(w * 100).toFixed(0)}%</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="at-note k-mono">
                                이 분포로 각 토큰의 Value를 섞은 것이 <b>{tokens[qi].text}</b> 의 새 표현이 된다.
                            </p>
                        </div>
                    </div>
                </div>

                <p className="at-hint">
                    <b>temperature</b> 를 낮추면 softmax가 날카로워져 어텐션이 한 토큰에 쏠리고, 높이면 모든 토큰에
                    골고루 퍼집니다. 서술어(<b>삼켰다/날렸다</b>)를 쿼리로 골라 보세요 — 주어와 목적어를 함께
                    당겨오고, 수식어는 자기가 꾸미는 명사에 달라붙습니다. 문장 구조가 <b>가중치 행렬</b> 한 장에 드러납니다.
                </p>

                <div className="k-resize"></div>
            </section>

            <section className="k-win at-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="at-foot">
                    <p>
                        {'요즘 거의 모든 LLM과 AI 에이전트의 바탕인 '}<b>트랜스포머</b>{'의 핵심 연산이 바로 '}
                        <b>self-attention</b>{'이다. 문장을 한 줄로 읽어 내려가는 대신, 모든 토큰이 동시에 서로를 '}
                        {'바라보며 "나는 지금 누구를 참고해야 하나"를 스스로 정한다. 서술어는 주어·목적어를 찾고, '}
                        {'대명사는 자기가 가리키는 명사를 찾는 식이다.'}
                    </p>
                    <p>
                        {'토큰마다 세 벡터가 있다. '}<b>Query</b>{'(무엇을 찾는가), '}<b>Key</b>{'(무엇을 내놓는가), '}
                        <b>Value</b>{'(실제로 전달할 내용). 쿼리 i가 키 j를 주목하는 점수는 두 벡터의 내적 '}
                        <b>q·k</b>{'이고, 한 토큰이 만든 점수들을 '}<b>softmax</b>{'로 확률처럼 정규화하면 합이 1인 '}
                        {'어텐션 가중치가 된다. 이 가중치로 Value들을 섞은 가중합이 그 토큰의 새 표현이다.'}
                    </p>
                    <p>
                        {'점수를 '}<b>√d</b>{'로 나누는 스케일링은, 차원이 커질수록 내적 값이 커져 softmax가 한쪽으로 '}
                        {'포화(기울기 소실)되는 것을 막는 장치다. 이 실험의 temperature 슬라이더는 바로 그 스케일을 '}
                        {'손으로 돌려 보는 것이다 — 낮추면 날카롭게 한 곳에, 높이면 뭉툭하게 여러 곳에 주목한다. '}
                        {'실제 모델은 이런 어텐션 헤드를 여러 개(multi-head) 병렬로 두어 서로 다른 관계를 동시에 포착한다.'}
                    </p>
                    <p className="at-disclaimer">
                        {'* Q·K 벡터는 문장 구조(주어·서술어·수식 관계)가 드러나도록 손으로 지은 저차원 값입니다. '}
                        {'실제 트랜스포머의 학습된 고차원 임베딩·다중 헤드·위치 인코딩은 단순화했으며, 어텐션 '}
                        {'가중치 계산(내적→스케일→softmax)의 직관만 결정적으로 재현합니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Attention;
