import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/ContextWindow.css';

// 유한한 기억(컨텍스트 창)과 망각 — 특정 제품이 아니라 "한정된 기억 용량"이라는 보편 개념만 다룬다.
const LIMIT = 60; // 데모용 토큰 한계

// 토큰 비용 추정(데모): 글자 수 기반의 단순 근사.
const costOf = (text) => Math.max(6, Math.ceil(text.length / 1.5));

// 주입할 수 있는 "기억할 사실" 프리셋 — 누구에게도 해롭지 않은 일상적 정보.
const FACTS = [
    { key: 'pw', label: '비밀번호는 4892', q: '비밀번호가 뭐였지?', a: '4892' },
    { key: 'meet', label: '회의는 화요일 3시', q: '회의가 언제였지?', a: '화요일 3시' },
    { key: 'cat', label: '고양이 이름은 나비', q: '고양이 이름이 뭐였지?', a: '나비' },
    { key: 'gate', label: '도어록 번호 0317', q: '도어록 번호가 뭐였지?', a: '0317' },
    { key: 'allergy', label: '땅콩 알레르기 있음', q: '내 알레르기가 뭐였지?', a: '땅콩' },
    { key: 'flight', label: '비행기는 11일 9시', q: '비행기가 언제였지?', a: '11일 오전 9시' },
];

// 컨텍스트를 채우는 잡담(noise) — 사실을 밀어내는 역할.
const FILLERS = [
    '오늘 날씨 얘기를 한참 했다',
    '점심 메뉴를 골랐다',
    '주말 계획을 잡담했다',
    '재미있는 영상을 공유했다',
    '커피가 맛있다고 했다',
    '버스가 늦었다고 투덜댔다',
];

let uid = 100;

const ContextWindow = () => {
    // 초기 컨텍스트: 사실 하나 + 잡담 하나
    const [items, setItems] = useState(() => [
        { id: 1, text: '비밀번호는 4892', tokens: costOf('비밀번호는 4892'), factKey: 'pw' },
        { id: 2, text: '오늘 날씨 얘기를 한참 했다', tokens: costOf('오늘 날씨 얘기를 한참 했다') },
    ]);
    const [forgotten, setForgotten] = useState([]);
    const [draft, setDraft] = useState('');
    const [recall, setRecall] = useState(null); // { q, state, a }
    const [fillIdx, setFillIdx] = useState(0);

    const used = useMemo(() => items.reduce((s, it) => s + it.tokens, 0), [items]);
    const pct = Math.min(100, Math.round((used / LIMIT) * 100));
    const near = used >= LIMIT * 0.8;

    // 새 기억을 추가하고, 한계를 넘으면 오래된 것부터 밀어낸다(eviction).
    const push = (entry) => {
        setRecall(null);
        setItems((prev) => {
            let next = [...prev, entry];
            const evicted = [];
            let total = next.reduce((s, it) => s + it.tokens, 0);
            while (total > LIMIT && next.length > 1) {
                const out = next.shift();
                evicted.push(out);
                total -= out.tokens;
            }
            if (evicted.length) {
                setForgotten((f) => [...evicted, ...f].slice(0, 12));
            }
            return next;
        });
    };

    const addFact = (f) => {
        push({ id: ++uid, text: f.label, tokens: costOf(f.label), factKey: f.key });
    };

    const addFiller = () => {
        const text = FILLERS[fillIdx % FILLERS.length];
        setFillIdx((i) => i + 1);
        push({ id: ++uid, text, tokens: costOf(text) });
    };

    const addDraft = () => {
        const text = draft.trim();
        if (!text) return;
        push({ id: ++uid, text, tokens: costOf(text) });
        setDraft('');
    };

    // 압축(compaction): 가장 최근 1개를 제외한 나머지를 손실 요약 한 덩어리로 합친다.
    const compact = () => {
        setRecall(null);
        setItems((prev) => {
            if (prev.length <= 1) return prev;
            const keep = prev[prev.length - 1];
            const merged = prev.slice(0, -1);
            const facts = merged.filter((m) => m.factKey).map((m) => m.factKey);
            const carried = merged.flatMap((m) => (m.summary ? m.facts : m.factKey ? [m.factKey] : []));
            const summary = {
                id: ++uid,
                text: `이전 대화 ${merged.length}건을 압축한 요약`,
                tokens: 16,
                summary: true,
                facts: Array.from(new Set([...carried, ...facts])),
            };
            return [summary, keep];
        });
    };

    const reset = () => {
        setItems([
            { id: 1, text: '비밀번호는 4892', tokens: costOf('비밀번호는 4892'), factKey: 'pw' },
            { id: 2, text: '오늘 날씨 얘기를 한참 했다', tokens: costOf('오늘 날씨 얘기를 한참 했다') },
        ]);
        setForgotten([]);
        setRecall(null);
        setDraft('');
        setFillIdx(0);
    };

    // 회상 테스트: 사실이 (1) 또렷이 남았는지 (2) 요약 속에 흐릿하게만 남았는지 (3) 완전히 밀려났는지 판정.
    const doRecall = (f) => {
        const inWindow = items.some((it) => !it.summary && it.factKey === f.key);
        const inSummary = items.some((it) => it.summary && it.facts.includes(f.key));
        const state = inWindow ? 'clear' : inSummary ? 'fuzzy' : 'lost';
        setRecall({ q: f.q, a: f.a, state });
    };

    const recallText = (r) => {
        if (r.state === 'clear') return `"${r.a}" — 또렷이 기억합니다.`;
        if (r.state === 'fuzzy') return `요약본에만 흔적이 남았어요… 아마 "${r.a}"였던 것 같은데 확실하진 않습니다.`;
        return '그건 기억나지 않습니다. 컨텍스트에서 밀려났어요.';
    };

    return (
        <div className="cw-container">
            <div className="cw-inner">
                <Link to="/" className="cw-back">← 실험실로 돌아가기</Link>

                <header className="cw-header">
                    <h1 className="cw-title">CONTEXT&nbsp;WINDOW</h1>
                    <p className="cw-sub">
                        {'// 기억은 무한하지 않다 — 창이 차면 오래된 것부터 조용히 밀려난다'}
                    </p>
                </header>

                <div className="cw-stage">
                    {/* 왼쪽: 컨텍스트 창 시각화 */}
                    <div className="cw-viz">
                        <div className="cw-meter">
                            <div className="cw-meter-top">
                                <span className="cw-meter-label">컨텍스트 사용량</span>
                                <span className={'cw-meter-num' + (near ? ' hot' : '')}>
                                    {used} / {LIMIT} tok
                                </span>
                            </div>
                            <div className="cw-bar">
                                <div
                                    className={'cw-bar-fill' + (near ? ' hot' : '')}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>

                        <div className="cw-window">
                            <div className="cw-window-tag">{`ACTIVE MEMORY · ${items.length}`}</div>
                            {items.map((it) => (
                                <div
                                    key={it.id}
                                    className={
                                        'cw-mem' +
                                        (it.summary ? ' is-summary' : '') +
                                        (it.factKey ? ' is-fact' : '')
                                    }
                                >
                                    <span className="cw-mem-tok">{it.tokens}</span>
                                    <span className="cw-mem-text">{it.text}</span>
                                    {it.factKey && <span className="cw-mem-badge">FACT</span>}
                                    {it.summary && <span className="cw-mem-badge sum">요약</span>}
                                </div>
                            ))}
                        </div>

                        {forgotten.length > 0 && (
                            <div className="cw-forgotten">
                                <span className="cw-forgotten-label">밀려난 기억</span>
                                <div className="cw-forgotten-list">
                                    {forgotten.map((it) => (
                                        <span key={it.id} className="cw-ghost">
                                            {it.text}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 오른쪽: 조작 패널 */}
                    <div className="cw-panel">
                        <div className="cw-block">
                            <span className="cw-block-label">사실 주입</span>
                            <div className="cw-chips">
                                {FACTS.map((f) => (
                                    <button
                                        key={f.key}
                                        type="button"
                                        className="cw-chip"
                                        onClick={() => addFact(f)}
                                    >
                                        + {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="cw-block">
                            <span className="cw-block-label">직접 입력</span>
                            <div className="cw-input-row">
                                <input
                                    type="text"
                                    className="cw-input"
                                    placeholder="기억시킬 내용…"
                                    value={draft}
                                    maxLength={40}
                                    onChange={(e) => setDraft(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addDraft()}
                                />
                                <button type="button" className="cw-add" onClick={addDraft}>
                                    추가
                                </button>
                            </div>
                        </div>

                        <div className="cw-actions">
                            <button type="button" className="cw-act fill" onClick={addFiller}>
                                💬 잡담으로 채우기
                            </button>
                            <button type="button" className="cw-act compact" onClick={compact}>
                                🗜 압축(요약)
                            </button>
                            <button type="button" className="cw-act reset" onClick={reset}>
                                ↺ 초기화
                            </button>
                        </div>

                        <div className="cw-block cw-recall">
                            <span className="cw-block-label">회상 테스트 — 아직 기억할까?</span>
                            <div className="cw-chips">
                                {FACTS.map((f) => (
                                    <button
                                        key={f.key}
                                        type="button"
                                        className="cw-qchip"
                                        onClick={() => doRecall(f)}
                                    >
                                        {f.q}
                                    </button>
                                ))}
                            </div>
                            {recall && (
                                <div className={'cw-answer ' + recall.state}>
                                    <span className="cw-answer-q">Q. {recall.q}</span>
                                    <span className="cw-answer-a">A. {recallText(recall)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <footer className="cw-foot">
                    <p>
                        {'에이전트의 기억은 '}
                        <b>유한한 창</b>
                        {'이다. 창이 가득 차면 새 기억을 위해 가장 '}
                        <b>오래된 기억부터 밀려난다</b>
                        {'(eviction). 잡담으로 창을 채워 보면, 앞서 일러둔 사실조차 소리 없이 사라진다. '}
                        {'"압축(요약)"은 여러 기억을 한 덩어리로 줄여 공간을 벌지만, 그 과정에서 디테일은 '}
                        <b>손실</b>
                        {'된다 — 그래서 요약 후의 회상은 "또렷함"이 아니라 "흐릿함"이 된다. '}
                        {'무엇을 남기고 무엇을 버릴지가, 곧 기억하는 시스템의 설계다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default ContextWindow;
