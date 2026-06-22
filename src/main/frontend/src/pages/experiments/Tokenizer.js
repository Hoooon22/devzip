import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Tokenizer.css';

// 컨텍스트 창 크기(예시)와 예시 단가 — 실제 모델 값이 아니라 체감용 상수
const CONTEXT_WINDOW = 4096;
const PRICE_PER_1K = 3; // 1,000 토큰당 ₩3 (예시)

// 토큰 칩 색 — 보라 그라데이션 배제, 구분만 되는 차분한 톤을 순환
const COLORS = ['#2f6f6a', '#7a5b3a', '#3a5a7a', '#6a6a3a', '#7a3a4a', '#3a6a4a'];

function isCJK(ch) {
    const c = ch.codePointAt(0);
    return (
        (c >= 0xac00 && c <= 0xd7a3) || // 한글 음절
        (c >= 0x3040 && c <= 0x30ff) || // 히라가나/가타카나
        (c >= 0x3400 && c <= 0x4dbf) || // CJK 확장 A
        (c >= 0x4e00 && c <= 0x9fff) // CJK 통합 한자
    );
}

// 긴 단어를 ~4글자 하위 단위(subword)로 쪼갠다. 짧은 단어는 통째로 1토큰.
function splitWord(w) {
    if (w.length <= 5) return [w];
    const parts = [];
    let rest = w;
    while (rest.length > 0) {
        const size = rest.length <= 7 ? rest.length : 4;
        parts.push(rest.slice(0, size));
        rest = rest.slice(size);
    }
    return parts;
}

// 실제 BPE 어휘가 아니라, 토큰화의 "원리"를 보여주는 근사 시뮬레이터.
// 규칙: 공백은 뒤따르는 토큰에 붙고(GPT식), 한글/한자는 글자당 1토큰,
// 숫자는 최대 3자리씩, 영어 단어는 ~4글자 하위 단위로 쪼갠다.
function tokenize(text) {
    const chars = Array.from(text); // 이모지(서로게이트 쌍)도 1글자로
    const tokens = [];
    let i = 0;
    const isSpace = (c) => /\s/.test(c);
    const isDigit = (c) => c >= '0' && c <= '9';
    const isLatin = (c) => /[a-zA-Z]/.test(c);

    while (i < chars.length) {
        let prefix = '';
        while (i < chars.length && isSpace(chars[i]) && chars[i] !== '\n') {
            prefix += chars[i];
            i++;
        }
        if (i < chars.length && chars[i] === '\n') {
            tokens.push({ text: prefix + '\n', type: 'nl' });
            i++;
            continue;
        }
        if (i >= chars.length) {
            if (prefix) tokens.push({ text: prefix, type: 'sym' });
            break;
        }
        const c = chars[i];
        if (isCJK(c)) {
            tokens.push({ text: prefix + c, type: 'cjk' });
            i++;
            continue;
        }
        if (isDigit(c)) {
            let num = '';
            while (i < chars.length && isDigit(chars[i]) && num.length < 3) {
                num += chars[i];
                i++;
            }
            tokens.push({ text: prefix + num, type: 'num' });
            continue;
        }
        if (isLatin(c)) {
            let word = '';
            while (i < chars.length && isLatin(chars[i])) {
                word += chars[i];
                i++;
            }
            splitWord(word).forEach((p, idx) =>
                tokens.push({ text: idx === 0 ? prefix + p : p, type: idx === 0 ? 'word' : 'sub' })
            );
            continue;
        }
        // 구두점·기호·이모지 — 단일 토큰
        tokens.push({ text: prefix + c, type: 'sym' });
        i++;
    }
    return tokens;
}

const SAMPLE =
    '안녕하세요! 토큰화는 텍스트를 작은 조각으로 나눕니다. Tokenization splits text into pieces. 비용은 1000 토큰 단위로 계산됩니다. 🚀';

const PRESETS = [
    {
        label: '영어',
        text:
            'The quick brown fox jumps over the lazy dog. Internationalization and pseudopseudohypoparathyroidism are very long words.',
    },
    {
        label: '한국어',
        text:
            '한국어는 영어보다 토큰을 더 많이 사용합니다. 같은 뜻이라도 글자마다 토큰이 붙기 때문입니다. 그래서 같은 분량이면 비용도 더 듭니다.',
    },
    {
        label: '코드',
        text: 'function add(a, b) {\n  return a + b;\n}\nconst result = add(40, 96);',
    },
    {
        label: '숫자·이모지',
        text: '2026년 6월 22일, 가격은 1234567원. 🚀🔥🎯 이모지 하나도 토큰을 차지한다 😀',
    },
];

const Tokenizer = () => {
    const [text, setText] = useState(SAMPLE);

    const tokens = useMemo(() => tokenize(text), [text]);

    const stats = useMemo(() => {
        const tokenCount = tokens.length;
        const charCount = Array.from(text).length;
        const ratio = tokenCount ? charCount / tokenCount : 0;
        const cost = (tokenCount / 1000) * PRICE_PER_1K;
        const fill = Math.min(100, (tokenCount / CONTEXT_WINDOW) * 100);
        return { tokenCount, charCount, ratio, cost, fill };
    }, [tokens, text]);

    let verdict;
    if (stats.tokenCount === 0) verdict = '무언가 입력해 보세요.';
    else if (stats.ratio < 1.6) verdict = '토큰을 많이 먹는 입력 — 글자마다 토큰이 붙는 편입니다.';
    else if (stats.ratio > 3.2) verdict = '토큰 효율이 좋은 입력 — 한 토큰이 여러 글자를 담습니다.';
    else verdict = '평범한 효율의 입력입니다.';

    return (
        <div className="tk-container">
            <div className="tk-inner">
                <Link to="/" className="tk-back">← 실험실로 돌아가기</Link>

                <header className="tk-header">
                    <h1 className="tk-title">TOKENIZER</h1>
                    <p className="tk-sub">{'// AI는 글을 글자가 아니라 토큰으로 읽는다 — 토큰 경제'}</p>
                </header>

                <div className="tk-stage">
                    <section className="tk-left">
                        <div className="tk-presets">
                            <span className="tk-presets-label">예시:</span>
                            {PRESETS.map((p) => (
                                <button
                                    key={p.label}
                                    type="button"
                                    className="tk-preset-btn"
                                    onClick={() => setText(p.text)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <textarea
                            className="tk-input"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            spellCheck={false}
                            placeholder="여기에 문장을 입력하면 토큰으로 쪼개집니다…"
                        />

                        <div className="tk-viz-head">
                            <span>토큰 분해</span>
                            <span className="tk-viz-meta">색이 바뀌는 지점이 토큰 경계 · {'·'}는 공백</span>
                        </div>
                        <div className="tk-viz">
                            {tokens.length === 0 && <span className="tk-empty">입력이 비어 있습니다.</span>}
                            {tokens.map((tok, idx) => {
                                if (tok.type === 'nl') {
                                    return (
                                        <React.Fragment key={idx}>
                                            <span className="tk-chip tk-chip-nl">⏎</span>
                                            <span className="tk-break" />
                                        </React.Fragment>
                                    );
                                }
                                const display = tok.text.replace(/ /g, '·');
                                return (
                                    <span
                                        key={idx}
                                        className="tk-chip"
                                        style={{ background: COLORS[idx % COLORS.length] }}
                                        title={`토큰 #${idx + 1}`}
                                    >
                                        {display}
                                    </span>
                                );
                            })}
                        </div>
                    </section>

                    <aside className="tk-panel">
                        <div className="tk-stat tk-stat-main">
                            <span className="tk-stat-num">{stats.tokenCount.toLocaleString()}</span>
                            <span className="tk-stat-label">토큰 수</span>
                        </div>

                        <div className="tk-stat-row">
                            <div className="tk-stat">
                                <span className="tk-stat-num tk-mini">{stats.charCount.toLocaleString()}</span>
                                <span className="tk-stat-label">문자 수</span>
                            </div>
                            <div className="tk-stat">
                                <span className="tk-stat-num tk-mini">{stats.ratio.toFixed(2)}</span>
                                <span className="tk-stat-label">문자 / 토큰</span>
                            </div>
                        </div>

                        <div className="tk-cost">
                            <div className="tk-cost-row">
                                <span>예시 비용</span>
                                <b>₩{stats.cost.toFixed(2)}</b>
                            </div>
                            <span className="tk-cost-note">예시 단가: 1K 토큰당 ₩{PRICE_PER_1K}</span>
                        </div>

                        <div className="tk-window">
                            <div className="tk-window-head">
                                <span>컨텍스트 창</span>
                                <b>
                                    {stats.tokenCount.toLocaleString()} / {CONTEXT_WINDOW.toLocaleString()}
                                </b>
                            </div>
                            <div className="tk-bar-track">
                                <div
                                    className={'tk-bar-fill' + (stats.fill >= 100 ? ' tk-bar-over' : '')}
                                    style={{ width: `${stats.fill}%` }}
                                />
                            </div>
                            <span className="tk-window-note">
                                {stats.fill >= 100 ? '창을 가득 채웠습니다 — 오래된 토큰은 밀려납니다.' : `${stats.fill.toFixed(1)}% 사용`}
                            </span>
                        </div>

                        <div className="tk-verdict">{verdict}</div>
                    </aside>
                </div>

                <footer className="tk-foot">
                    <p>
                        {'모델은 글을 글자 단위가 아니라 '}<b>토큰</b>{' 단위로 읽고, 값도 토큰으로 매겨진다. '}
                        {'영어는 보통 한 토큰이 '}<b>네 글자쯤</b>{'을 담지만, 한글은 '}<b>글자마다</b>{' 토큰이 붙어 '}
                        {'같은 뜻이라도 훨씬 많은 토큰을 먹는다. 위에서 한국어 예시와 영어 예시의 '}<b>문자/토큰 비율</b>
                        {'을 비교해 보면, 같은 분량의 텍스트가 언어에 따라 몇 배까지 비싸지는지 체감할 수 있다. '}
                        {'컨텍스트 창이라는 한정된 그릇에 무엇을 담을지, 그 자체가 곧 비용이 되는 시대다.'}
                    </p>
                    <p className="tk-disclaimer">
                        {'* 실제 모델의 BPE 어휘가 아니라 토큰화 원리를 보여주는 근사 시뮬레이터입니다. 정확한 토큰 수는 모델마다 다릅니다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default Tokenizer;
