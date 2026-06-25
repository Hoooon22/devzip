import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Speculative.css';

// 추측 디코딩(speculative decoding) 시뮬레이터.
// 핵심: 작고 빠른 "초안 모델"이 다음 토큰 여러 개를 미리 찍고,
// 크고 느린 "본 모델"이 그 추측들을 한 번의 검증 패스로 한꺼번에 확인한다.
// 앞에서부터 맞은 토큰은 그대로 통과(accept), 첫 틀린 지점에서 본 모델이
// 올바른 토큰 하나를 직접 채워 넣는다(correct). 모두 맞으면 보너스 토큰 하나가 덤.
// 비싼 자원은 "본 모델 패스 수" — 한 패스로 여러 토큰을 내보낼수록 빨라진다.

// 결정적 PRNG (재현 가능한 재생을 위해)
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

// 텍스트 → 토큰: 한글/한자/가나는 글자당, 영문·숫자는 덩어리, 기호는 단일.
function toTokens(text) {
    const out = [];
    const re = /[가-힣]|[぀-ヿ]|[一-鿿]|[A-Za-z]+|[0-9]+|[^\s]/gu;
    let m;
    while ((m = re.exec(text)) !== null) {
        out.push(m[0]);
        if (out.length >= 80) break; // 시각화 한도
    }
    return out;
}

const PRESETS = [
    { label: '한국어', text: '추측 디코딩은 작은 모델이 다음 토큰 여러 개를 미리 찍고 큰 모델이 한 번에 검증한다. 맞은 토큰은 그대로 통과하고 틀린 곳만 다시 채운다.' },
    { label: '영어', text: 'A small draft model guesses several next tokens and the large model verifies them all in a single pass. Correct guesses pass straight through.' },
    { label: '코드', text: 'for (let i = 0; i < draft.length; i++) { if (draft[i] !== target[i]) break; accepted++; }' },
];

const SAMPLE = PRESETS[0].text;

// (tokens, k, acc, seed)로 전체 디코딩 스케줄을 결정적으로 만든다.
function buildSchedule(tokens, k, acc, seed) {
    const rng = mulberry32(seed);
    const correct = tokens.map(() => rng() < acc); // 위치별 초안 정답 여부
    const vocab = Array.from(new Set(tokens));
    const wrongGuess = (pos) => {
        if (vocab.length <= 1) return '·';
        let g = vocab[Math.floor(rng() * vocab.length)];
        let tries = 0;
        while (g === tokens[pos] && tries < 6) {
            g = vocab[Math.floor(rng() * vocab.length)];
            tries++;
        }
        return g;
    };

    const steps = [];
    let p = 0;
    while (p < tokens.length) {
        const maxLook = Math.min(k, tokens.length - p);
        const drafts = [];
        let acceptedCount = 0;
        let mismatch = false;
        for (let i = 0; i < maxLook; i++) {
            const pos = p + i;
            if (!mismatch && correct[pos]) {
                drafts.push({ pos, token: tokens[pos], status: 'accept' });
                acceptedCount++;
            } else if (!mismatch) {
                drafts.push({ pos, token: wrongGuess(pos), status: 'reject', truth: tokens[pos] });
                mismatch = true;
            } else {
                // 첫 불일치 이후의 초안은 버려진다(검증조차 안 함)
                drafts.push({ pos, token: wrongGuess(pos), status: 'discard' });
            }
        }

        const emitted = [];
        for (let i = 0; i < acceptedCount; i++) {
            emitted.push({ pos: p + i, token: tokens[p + i], kind: 'draft' });
        }
        let nextP = p + acceptedCount;
        if (mismatch) {
            emitted.push({ pos: nextP, token: tokens[nextP], kind: 'correct' });
            nextP += 1;
        } else if (nextP < tokens.length) {
            emitted.push({ pos: nextP, token: tokens[nextP], kind: 'bonus' });
            nextP += 1;
        }

        steps.push({ start: p, drafts, acceptedCount, mismatch, emitted });
        p = nextP;
    }
    return { steps };
}

const Speculative = () => {
    const [text, setText] = useState(SAMPLE);
    const [k, setK] = useState(4);
    const [accPct, setAccPct] = useState(75);
    const [seed, setSeed] = useState(7);
    const [revealed, setRevealed] = useState(0);
    const [playing, setPlaying] = useState(false);
    const timerRef = useRef(null);

    const tokens = useMemo(() => toTokens(text), [text]);
    const acc = accPct / 100;

    const schedule = useMemo(
        () => buildSchedule(tokens, k, acc, seed),
        [tokens, k, acc, seed]
    );
    const totalSteps = schedule.steps.length;

    // 파라미터가 바뀌면 처음으로 되감고 정지
    useEffect(() => {
        setRevealed(0);
        setPlaying(false);
    }, [tokens, k, acc, seed]);

    // 자동 재생 — 한 틱에 한 스텝(=본 모델 패스 한 번)씩 공개
    useEffect(() => {
        if (!playing) return undefined;
        if (revealed >= totalSteps) {
            setPlaying(false);
            return undefined;
        }
        timerRef.current = setInterval(() => {
            setRevealed((r) => {
                if (r >= totalSteps) return r;
                return r + 1;
            });
        }, 620);
        return () => clearInterval(timerRef.current);
    }, [playing, revealed, totalSteps]);

    const view = useMemo(() => {
        const shown = schedule.steps.slice(0, revealed);
        const stream = [];
        let tokensOut = 0;
        let draftVerified = 0;
        let accepted = 0;
        let draftPasses = 0;
        shown.forEach((s, si) => {
            s.emitted.forEach((e) => {
                stream.push({ ...e, step: si });
                tokensOut += 1;
            });
            draftVerified += s.acceptedCount + (s.mismatch ? 1 : 0);
            accepted += s.acceptedCount;
            draftPasses += s.drafts.length;
        });
        const targetPasses = shown.length;
        const speedup = targetPasses ? tokensOut / targetPasses : 0;
        const acceptRate = draftVerified ? accepted / draftVerified : 0;
        return {
            stream,
            tokensOut,
            targetPasses,
            draftPasses,
            speedup,
            acceptRate,
            lastStep: shown.length ? shown[shown.length - 1] : null,
        };
    }, [schedule, revealed]);

    const done = revealed >= totalSteps && totalSteps > 0;

    const onStep = useCallback(() => {
        setPlaying(false);
        setRevealed((r) => Math.min(r + 1, totalSteps));
    }, [totalSteps]);

    const onReset = useCallback(() => {
        setPlaying(false);
        setRevealed(0);
    }, []);

    const onPlay = useCallback(() => {
        if (done) {
            setRevealed(0);
            setPlaying(true);
        } else {
            setPlaying((p) => !p);
        }
    }, [done]);

    // 막대 폭: 본 모델 패스 vs 같은 토큰을 자기회귀로 뽑을 때(토큰당 1패스)
    const baselinePasses = view.tokensOut;
    const barPct = baselinePasses ? (view.targetPasses / baselinePasses) * 100 : 0;

    return (
        <div className="sd-container">
            <div className="sd-inner">
                <Link to="/" className="sd-back">← 실험실로 돌아가기</Link>

                <header className="sd-header">
                    <h1 className="sd-title">SPECULATIVE</h1>
                    <p className="sd-sub">{'// 작은 모델이 미리 찍고, 큰 모델이 한 번에 검증한다 — 추측 디코딩'}</p>
                </header>

                <div className="sd-stage">
                    {/* 좌측: 입력 + 출력 스트림 + 현재 검증 패스 */}
                    <section className="sd-left">
                        <div className="sd-presets">
                            <span className="sd-presets-label">예시:</span>
                            {PRESETS.map((p) => (
                                <button
                                    key={p.label}
                                    type="button"
                                    className="sd-preset-btn"
                                    onClick={() => setText(p.text)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <textarea
                            className="sd-input"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            spellCheck={false}
                            placeholder="생성할 목표 문장을 입력하세요…"
                        />

                        <div className="sd-viz-head">
                            <span>생성 출력 ({view.tokensOut}/{tokens.length} 토큰)</span>
                            <span className="sd-legend">
                                <i className="sd-dot sd-dot-draft" />초안 통과
                                <i className="sd-dot sd-dot-target" />본 모델 생성
                            </span>
                        </div>
                        <div className="sd-stream">
                            {view.stream.length === 0 && (
                                <span className="sd-empty">▶ 재생 또는 한 스텝을 눌러 디코딩을 시작하세요.</span>
                            )}
                            {view.stream.map((t, idx) => (
                                <span
                                    key={idx}
                                    className={
                                        'sd-tok ' +
                                        (t.kind === 'draft' ? 'sd-tok-draft' : 'sd-tok-target') +
                                        (t.step === revealed - 1 ? ' sd-tok-fresh' : '')
                                    }
                                    title={t.kind === 'draft' ? '초안이 맞춤 → 통과' : t.kind === 'correct' ? '초안 틀림 → 본 모델이 교정' : '전부 통과 → 보너스 토큰'}
                                >
                                    {t.token}
                                </span>
                            ))}
                        </div>

                        <div className="sd-pass">
                            <div className="sd-pass-head">
                                <span>
                                    {view.lastStep
                                        ? `검증 패스 #${revealed} — 초안 ${view.lastStep.drafts.length}개 제출`
                                        : '검증 패스 대기 중'}
                                </span>
                                <span className="sd-pass-note">
                                    {view.lastStep
                                        ? `${view.lastStep.acceptedCount}개 통과 · ${view.lastStep.emitted.length}토큰 산출`
                                        : `초안 길이 k=${k}`}
                                </span>
                            </div>
                            <div className="sd-draftrow">
                                {!view.lastStep && (
                                    <span className="sd-draft-empty">
                                        한 번의 본 모델 패스가 초안 {k}개를 한꺼번에 확인합니다.
                                    </span>
                                )}
                                {view.lastStep &&
                                    view.lastStep.drafts.map((d, i) => (
                                        <span key={i} className={'sd-draft sd-draft-' + d.status}>
                                            <span className="sd-draft-tok">{d.token}</span>
                                            <span className="sd-draft-mark">
                                                {d.status === 'accept'
                                                    ? '✓'
                                                    : d.status === 'reject'
                                                    ? '✗'
                                                    : '·'}
                                            </span>
                                            {d.status === 'reject' && (
                                                <span className="sd-draft-truth">→ {d.truth}</span>
                                            )}
                                        </span>
                                    ))}
                            </div>
                        </div>

                        <div className="sd-transport">
                            <button type="button" className="sd-btn sd-btn-play" onClick={onPlay}>
                                {playing ? '⏸ 멈춤' : done ? '↻ 다시 재생' : '▶ 재생'}
                            </button>
                            <button type="button" className="sd-btn" onClick={onStep} disabled={done}>
                                ⏭ 한 스텝
                            </button>
                            <button type="button" className="sd-btn" onClick={onReset}>
                                ⟲ 리셋
                            </button>
                        </div>
                    </section>

                    {/* 우측: 컨트롤 + 지표 + 속도 비교 */}
                    <aside className="sd-panel">
                        <div className="sd-control">
                            <label htmlFor="sd-k">초안 길이 k <b>{k}</b> <small>토큰/패스</small></label>
                            <input
                                id="sd-k"
                                type="range"
                                min={1}
                                max={8}
                                value={k}
                                onChange={(e) => setK(Number(e.target.value))}
                            />
                        </div>

                        <div className="sd-control">
                            <label htmlFor="sd-acc">초안 정답률 <b>{accPct}</b><small>%</small></label>
                            <input
                                id="sd-acc"
                                type="range"
                                min={20}
                                max={98}
                                value={accPct}
                                onChange={(e) => setAccPct(Number(e.target.value))}
                            />
                        </div>

                        <div className="sd-stat sd-stat-main">
                            <span className="sd-stat-num">
                                {view.speedup.toFixed(2)}<small>×</small>
                            </span>
                            <span className="sd-stat-label">속도 향상 (자기회귀 대비)</span>
                        </div>

                        <div className="sd-stat-row">
                            <div className="sd-stat">
                                <span className="sd-stat-num sd-mini">{view.targetPasses}</span>
                                <span className="sd-stat-label">본 모델 패스</span>
                            </div>
                            <div className="sd-stat">
                                <span className="sd-stat-num sd-mini">
                                    {(view.acceptRate * 100).toFixed(0)}<small>%</small>
                                </span>
                                <span className="sd-stat-label">초안 수락률</span>
                            </div>
                        </div>

                        <div className="sd-race">
                            <div className="sd-race-head">패스 비교 (적을수록 빠름)</div>
                            <div className="sd-race-row">
                                <span className="sd-race-tag">자기회귀</span>
                                <div className="sd-race-track">
                                    <div className="sd-race-fill sd-race-base" style={{ width: '100%' }}>
                                        {baselinePasses || 0}
                                    </div>
                                </div>
                            </div>
                            <div className="sd-race-row">
                                <span className="sd-race-tag">추측 디코딩</span>
                                <div className="sd-race-track">
                                    <div
                                        className="sd-race-fill sd-race-spec"
                                        style={{ width: `${Math.max(barPct, 6)}%` }}
                                    >
                                        {view.targetPasses}
                                    </div>
                                </div>
                            </div>
                            <div className="sd-race-foot">
                                {baselinePasses > 0
                                    ? `${baselinePasses - view.targetPasses}번의 비싼 패스를 아꼈습니다.`
                                    : '아직 생성된 토큰이 없습니다.'}
                            </div>
                        </div>

                        <button type="button" className="sd-reshuffle" onClick={() => setSeed((s) => s + 1)}>
                            ↻ 초안 결과 다시 뽑기
                        </button>
                    </aside>
                </div>

                <footer className="sd-foot">
                    <p>
                        {'큰 언어 모델은 토큰을 한 번에 하나씩 뽑는다 — 토큰마다 '}<b>비싼 본 모델 패스</b>
                        {'가 한 번씩 들어가니 길어질수록 느리다. '}<b>추측 디코딩</b>{'은 작고 빠른 '}
                        <b>초안 모델</b>{'에게 다음 토큰 여러 개를 미리 찍게 한 뒤, 본 모델이 그 추측들을 '}
                        <b>단 한 번의 패스</b>{'로 한꺼번에 검증한다.'}
                    </p>
                    <p>
                        {'앞에서부터 '}<b>맞은 토큰</b>{'은 그대로 통과하고(초록), 처음 '}<b>틀린 지점</b>
                        {'에서 본 모델이 올바른 토큰 하나를 직접 채운다(주황). 전부 맞으면 보너스 토큰까지 덤이다. '}
                        {'중요한 건 '}<b>한 패스로 여러 토큰</b>{'을 내보낸다는 것 — 결과(출력)는 본 모델 단독과 똑같지만 패스 수가 줄어든다.'}
                    </p>
                    <p>
                        {'초안 정답률을 올리거나 k를 조절하며 '}<b>속도 향상</b>{'과 '}<b>수락률</b>{'이 어떻게 변하는지 보라. '}
                        {'정답률이 낮으면 추측이 자주 버려져 본 모델 단독과 별 차이가 없고, k를 너무 키우면 뒤쪽 추측이 통째로 버려지기 쉽다.'}
                    </p>
                    <p className="sd-disclaimer">
                        {'* 실제 모델 추론이 아니라 추측 디코딩의 수락/검증 메커니즘을 보여주는 결정적 근사 시뮬레이터입니다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default Speculative;
