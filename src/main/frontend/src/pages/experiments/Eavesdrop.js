import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Eavesdrop.css';

// 양자 키 분배(BB84) 시뮬레이터.
// 핵심: 두 사람(Alice·Bob)이 무작위 기저로 광자를 주고받아 비밀 키를 나눈다.
// 도청자(Eve)는 광자를 가로채 측정하는 순간 양자 상태를 망가뜨릴 수밖에 없어서,
// 키의 일부만 공개로 맞춰봐도 오류율(QBER)이 튀어 도청이 들통난다.
// 측정이 곧 흔적을 남긴다 — 그게 고전 통신엔 없는 양자 키 분배의 안전장치다.

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

// 기저(+: 직선, ×: 대각) × 비트(0/1) → 편광 글리프
function glyph(basis, bit) {
    if (basis === '+') return bit === 0 ? '│' : '─';
    return bit === 0 ? '╱' : '╲';
}

// 도청 임계치 — 실제 BB84 보안 한계와 비슷한 11%
const QBER_THRESHOLD = 0.11;

// (n, eveRate, seed)로 한 번의 키 분배 시도를 결정적으로 만든다.
function buildRun(n, eveRate, seed) {
    const rng = mulberry32(seed);
    const coin = () => (rng() < 0.5 ? 0 : 1);
    const pickBasis = () => (rng() < 0.5 ? '+' : '×');

    const photons = [];
    for (let i = 0; i < n; i++) {
        const aBit = coin();
        const aBasis = pickBasis();

        // 채널을 떠난 광자의 실제 상태 (도청이 없으면 Alice 그대로)
        let recvBasis = aBasis;
        let recvBit = aBit;

        // Eve: 일정 비율의 광자를 가로채 자기 기저로 측정하고 그대로 다시 쏜다
        const evePresent = rng() < eveRate;
        let eBasis = null;
        let eBit = null;
        if (evePresent) {
            eBasis = pickBasis();
            eBit = eBasis === aBasis ? aBit : coin(); // 기저 틀리면 결과는 무작위
            recvBasis = eBasis; // Eve가 측정한 상태로 재전송 → 상태가 바뀐다
            recvBit = eBit;
        }

        // Bob: 자기 기저로 측정. 받은 상태와 기저가 같으면 그대로, 다르면 무작위
        const bBasis = pickBasis();
        const bBit = bBasis === recvBasis ? recvBit : coin();

        const sifted = aBasis === bBasis; // 공개로 기저만 비교 → 같을 때만 살림
        const error = sifted && bBit !== aBit; // 살린 비트인데 값이 어긋남

        photons.push({ i, aBit, aBasis, evePresent, eBasis, eBit, bBasis, bBit, sifted, error });
    }
    return photons;
}

const Eavesdrop = () => {
    const [n, setN] = useState(24);
    const [evePct, setEvePct] = useState(0);
    const [seed, setSeed] = useState(3);
    const [revealed, setRevealed] = useState(0);
    const [playing, setPlaying] = useState(false);
    const timerRef = useRef(null);

    const eveRate = evePct / 100;
    const photons = useMemo(() => buildRun(n, eveRate, seed), [n, eveRate, seed]);

    // 파라미터가 바뀌면 처음으로 되감고 정지
    useEffect(() => {
        setRevealed(0);
        setPlaying(false);
    }, [n, eveRate, seed]);

    // 자동 재생 — 한 틱에 광자 하나씩 전송·측정
    useEffect(() => {
        if (!playing) return undefined;
        if (revealed >= n) {
            setPlaying(false);
            return undefined;
        }
        timerRef.current = setInterval(() => {
            setRevealed((r) => (r >= n ? r : r + 1));
        }, 280);
        return () => clearInterval(timerRef.current);
    }, [playing, revealed, n]);

    const stats = useMemo(() => {
        const shown = photons.slice(0, revealed);
        let sifted = 0;
        let errors = 0;
        let tapped = 0;
        const key = [];
        shown.forEach((p) => {
            if (p.evePresent) tapped += 1;
            if (p.sifted) {
                sifted += 1;
                key.push({ bit: p.aBit, error: p.error });
                if (p.error) errors += 1;
            }
        });
        const qber = sifted ? errors / sifted : 0;
        return { sifted, errors, tapped, key, qber };
    }, [photons, revealed]);

    const done = revealed >= n && n > 0;

    // 판정: 진행 중 / 키 없음 / 도청 감지(폐기) / 안전(키 확정)
    let verdict = 'run';
    if (done) {
        if (stats.sifted === 0) verdict = 'empty';
        else if (stats.qber > QBER_THRESHOLD) verdict = 'detected';
        else verdict = 'secure';
    }

    const onStep = useCallback(() => {
        setPlaying(false);
        setRevealed((r) => Math.min(r + 1, n));
    }, [n]);

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

    const qberBarPct = Math.min(stats.qber / 0.4, 1) * 100; // 40%를 막대 끝으로
    const thresholdPct = (QBER_THRESHOLD / 0.4) * 100;

    return (
        <div className="qk-container">
            <div className="qk-inner">
                <Link to="/" className="qk-back">← 실험실로 돌아가기</Link>

                <header className="qk-header">
                    <h1 className="qk-title">EAVESDROP</h1>
                    <p className="qk-sub">{'// 광자를 엿보는 순간 흔적이 남는다 — 양자 키 분배(BB84)'}</p>
                </header>

                <div className="qk-stage">
                    {/* 좌측: 채널 + 광자별 기록 */}
                    <section className="qk-left">
                        <div className="qk-channel">
                            <div className="qk-actor qk-actor-a">Alice ▸</div>
                            <div className="qk-wire">
                                <span className={'qk-eve' + (evePct > 0 ? ' qk-eve-on' : '')}>
                                    {evePct > 0 ? `Eve 가로챔 ${evePct}%` : 'Eve 없음'}
                                </span>
                            </div>
                            <div className="qk-actor qk-actor-b">▸ Bob</div>
                        </div>

                        <div className="qk-viz-head">
                            <span>광자 {revealed}/{n} 전송</span>
                            <span className="qk-legend">
                                <i className="qk-chip qk-chip-key" />키 채택
                                <i className="qk-chip qk-chip-err" />오류
                                <i className="qk-chip qk-chip-drop" />폐기
                            </span>
                        </div>

                        <div className="qk-grid">
                            {revealed === 0 && (
                                <span className="qk-empty">▶ 재생을 눌러 광자를 한 개씩 보내보세요.</span>
                            )}
                            {photons.slice(0, revealed).map((p) => {
                                const cls = !p.sifted
                                    ? 'qk-drop'
                                    : p.error
                                    ? 'qk-err'
                                    : 'qk-key';
                                return (
                                    <div
                                        key={p.i}
                                        className={'qk-cell ' + cls + (p.i === revealed - 1 ? ' qk-fresh' : '')}
                                        title={
                                            !p.sifted
                                                ? '기저 불일치 → 폐기'
                                                : p.error
                                                ? '기저 일치하나 비트 어긋남 → 도청 흔적'
                                                : '기저 일치 + 비트 일치 → 비밀 키'
                                        }
                                    >
                                        <span className="qk-cell-a">{glyph(p.aBasis, p.aBit)}</span>
                                        <span className="qk-cell-e">
                                            {p.evePresent ? glyph(p.eBasis, p.eBit) : '·'}
                                        </span>
                                        <span className="qk-cell-b">{glyph(p.bBasis, p.bBit)}</span>
                                        <span className="qk-cell-tag">
                                            {!p.sifted ? '✕' : p.error ? '!' : p.aBit}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="qk-rowkey">
                            <span className="qk-rowkey-l">Alice</span>
                            <span className="qk-rowkey-l">Eve</span>
                            <span className="qk-rowkey-l">Bob</span>
                            <span className="qk-rowkey-l">결과</span>
                        </div>

                        <div className="qk-keyout">
                            <div className="qk-keyout-head">
                                선별된 키 ({stats.sifted}비트){stats.errors > 0 ? ` · 오류 ${stats.errors}` : ''}
                            </div>
                            <div className="qk-keybits">
                                {stats.key.length === 0 && <span className="qk-empty">아직 채택된 비트 없음</span>}
                                {stats.key.map((b, idx) => (
                                    <span key={idx} className={'qk-bit' + (b.error ? ' qk-bit-err' : '')}>
                                        {b.bit}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="qk-transport">
                            <button type="button" className="qk-btn qk-btn-play" onClick={onPlay}>
                                {playing ? '⏸ 멈춤' : done ? '↻ 다시 전송' : '▶ 재생'}
                            </button>
                            <button type="button" className="qk-btn" onClick={onStep} disabled={done}>
                                ⏭ 광자 1개
                            </button>
                            <button type="button" className="qk-btn" onClick={onReset}>
                                ⟲ 리셋
                            </button>
                        </div>
                    </section>

                    {/* 우측: 컨트롤 + QBER + 판정 */}
                    <aside className="qk-panel">
                        <div className="qk-control">
                            <label htmlFor="qk-n">광자 수 <b>{n}</b></label>
                            <input
                                id="qk-n"
                                type="range"
                                min={8}
                                max={40}
                                value={n}
                                onChange={(e) => setN(Number(e.target.value))}
                            />
                        </div>

                        <div className="qk-control">
                            <label htmlFor="qk-eve">Eve 가로채기 <b>{evePct}</b><small>%</small></label>
                            <input
                                id="qk-eve"
                                type="range"
                                min={0}
                                max={100}
                                step={5}
                                value={evePct}
                                onChange={(e) => setEvePct(Number(e.target.value))}
                            />
                        </div>

                        <div className={'qk-verdict qk-verdict-' + verdict}>
                            <span className="qk-verdict-icon">
                                {verdict === 'secure'
                                    ? '🔒'
                                    : verdict === 'detected'
                                    ? '🚨'
                                    : verdict === 'empty'
                                    ? '∅'
                                    : '⏳'}
                            </span>
                            <span className="qk-verdict-text">
                                {verdict === 'secure'
                                    ? '안전 — 키 확정'
                                    : verdict === 'detected'
                                    ? '도청 감지 — 키 폐기'
                                    : verdict === 'empty'
                                    ? '선별된 비트 없음'
                                    : '전송 진행 중…'}
                            </span>
                        </div>

                        <div className="qk-stat-main">
                            <span className="qk-stat-num">
                                {(stats.qber * 100).toFixed(1)}<small>%</small>
                            </span>
                            <span className="qk-stat-label">오류율 QBER (선별 키 기준)</span>
                            <div className="qk-qbar">
                                <div
                                    className={'qk-qbar-fill' + (stats.qber > QBER_THRESHOLD ? ' qk-qbar-hot' : '')}
                                    style={{ width: `${qberBarPct}%` }}
                                />
                                <div className="qk-qbar-line" style={{ left: `${thresholdPct}%` }}>
                                    <span>임계 {(QBER_THRESHOLD * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="qk-stat-row">
                            <div className="qk-stat">
                                <span className="qk-stat-mini">{stats.sifted}</span>
                                <span className="qk-stat-label">선별 비트</span>
                            </div>
                            <div className="qk-stat">
                                <span className="qk-stat-mini">{stats.tapped}</span>
                                <span className="qk-stat-label">Eve 가로챔</span>
                            </div>
                        </div>

                        <button type="button" className="qk-reshuffle" onClick={() => setSeed((s) => s + 1)}>
                            ↻ 무작위 기저 다시 뽑기
                        </button>
                    </aside>
                </div>

                <footer className="qk-foot">
                    <p>
                        {'두 사람은 '}<b>무작위 기저</b>{'(+ 직선 · × 대각)로 광자를 주고받는다. 비트 값은 숨긴 채 '}
                        <b>기저만 공개</b>{'로 비교해, 둘이 같은 기저를 쓴 자리만 골라(sifting) 비밀 키로 삼는다.'}
                    </p>
                    <p>
                        {'도청자 '}<b>Eve</b>{'가 광자를 가로채 측정하면, 기저를 절반은 틀리게 고른다. 측정은 양자 상태를 '}
                        <b>되돌릴 수 없게</b>{' 바꾸므로, 그 자리에서 Bob의 결과가 어긋나기 시작한다 — 전체 가로채기 시 선별 키의 약 '}
                        <b>25%</b>{'가 오류로 나타난다.'}
                    </p>
                    <p>
                        {'그래서 두 사람은 키 일부를 공개로 맞춰 '}<b>오류율(QBER)</b>{'을 잰다. 임계 '}
                        <b>{(QBER_THRESHOLD * 100).toFixed(0)}%</b>{'를 넘으면 누군가 엿봤다고 보고 키를 '}<b>버린다</b>
                        {'. 엿듣는 행위 자체가 흔적을 남기는 것 — 고전 통신엔 없는 양자 키 분배의 안전장치다.'}
                    </p>
                    <p className="qk-disclaimer">
                        {'* 실제 광자 장비가 아니라 BB84 프로토콜의 측정·sifting·도청 검출 메커니즘을 보여주는 결정적 근사 시뮬레이터입니다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default Eavesdrop;
