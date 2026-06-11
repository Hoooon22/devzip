import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/QubitLab.css';

// 큐비트 상태를 회전각 θ(0~180°)로 표현한다.
//  θ=0   → |0⟩ (P0 100%)
//  θ=180 → |1⟩ (P1 100%)
//  θ=90  → 50/50 중첩
const p1FromTheta = (deg) => {
    const half = (deg * Math.PI) / 360; // (deg°/2) 를 라디안으로
    return Math.sin(half) ** 2;
};

const PRESETS = [
    { label: '|0⟩', deg: 0 },
    { label: '중첩', deg: 90 },
    { label: '|1⟩', deg: 180 },
];

const SHOTS = 1000;

const QubitLab = () => {
    const [theta, setTheta] = useState(90); // 준비된 상태의 회전각
    const [collapsed, setCollapsed] = useState(null); // null | 0 | 1 (단일 측정 후 붕괴값)
    const [stats, setStats] = useState(null); // { zeros, ones } 반복 측정 결과

    const p1 = useMemo(() => p1FromTheta(theta), [theta]);
    const p0 = 1 - p1;
    const locked = collapsed !== null;

    // 다이얼 바늘 각도: |0⟩(위쪽 -90°) → |1⟩(아래쪽 +90°)
    const needle = locked ? (collapsed === 0 ? -90 : 90) : theta - 90;

    // 측정 전 상태를 바꾸는 모든 조작은 붕괴 상태에서 차단된다.
    const prepare = (deg) => {
        if (locked) return;
        setTheta(deg);
        setStats(null);
    };

    const applyX = () => {
        if (locked) return;
        setTheta((t) => 180 - t); // X 게이트: P0 ↔ P1 스왑
        setStats(null);
    };

    const applyH = () => {
        if (locked) return;
        // 아다마르: 기저 상태는 중첩으로, 중첩은 기저로 되돌린다(측정 확률 기준 단순화)
        setTheta((t) => (t === 90 ? 0 : 90));
        setStats(null);
    };

    // 단일 측정: 이 큐비트는 붕괴해 0 또는 1로 고정된다.
    const measureOnce = () => {
        if (locked) return;
        const r = Math.random() < p1 ? 1 : 0;
        setCollapsed(r);
        setStats(null);
    };

    // 반복 측정: 동일하게 준비한 큐비트 1000개를 각각 측정해 분포를 본다.
    const measureMany = () => {
        if (locked) return;
        let ones = 0;
        for (let i = 0; i < SHOTS; i++) {
            if (Math.random() < p1) ones++;
        }
        setStats({ zeros: SHOTS - ones, ones });
    };

    const reset = () => {
        setCollapsed(null);
        setStats(null);
        setTheta(90);
    };

    const pct = (v) => Math.round(v * 100);

    return (
        <div className="ql-container">
            <div className="ql-inner">
                <Link to="/" className="ql-back">← 실험실로 돌아가기</Link>

                <header className="ql-header">
                    <h1 className="ql-title">QUBIT&nbsp;LAB</h1>
                    <p className="ql-sub">
                        {'// 관측하기 전까지, 답은 정해져 있지 않다 — 중첩과 측정 붕괴 실험실'}
                    </p>
                </header>

                <div className="ql-stage">
                    {/* 큐비트 다이얼 */}
                    <div className="ql-dial-wrap">
                        <div className={'ql-dial ' + (locked ? 'is-locked' : 'is-super')}>
                            <svg viewBox="0 0 200 200" className="ql-svg" aria-label="큐비트 상태 다이얼">
                                <circle cx="100" cy="100" r="86" className="ql-ring" />
                                <line x1="100" y1="14" x2="100" y2="34" className="ql-tick" />
                                <line x1="100" y1="166" x2="100" y2="186" className="ql-tick" />
                                <text x="100" y="10" className="ql-pole" textAnchor="middle">|0⟩</text>
                                <text x="100" y="198" className="ql-pole" textAnchor="middle">|1⟩</text>
                                {/* 바늘 */}
                                <g transform={`rotate(${needle} 100 100)`} className="ql-needle">
                                    <line x1="100" y1="100" x2="100" y2="24" />
                                    <circle cx="100" cy="100" r="9" />
                                </g>
                            </svg>
                            <div className="ql-readout">
                                {locked ? (
                                    <>
                                        <span className="ql-collapsed-num">{collapsed}</span>
                                        <span className="ql-collapsed-label">측정 후 붕괴됨</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="ql-state-tag">{theta === 90 ? '중첩 상태' : '준비됨'}</span>
                                        <span className="ql-state-hint">{'관측 시 둘 중 하나로 붕괴'}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 확률 막대 */}
                        <div className="ql-probs">
                            <div className="ql-prob">
                                <div className="ql-prob-head">
                                    <span>P(0)</span>
                                    <b>{pct(p0)}%</b>
                                </div>
                                <div className="ql-prob-track">
                                    <span className="ql-prob-fill zero" style={{ width: `${pct(p0)}%` }} />
                                </div>
                            </div>
                            <div className="ql-prob">
                                <div className="ql-prob-head">
                                    <span>P(1)</span>
                                    <b>{pct(p1)}%</b>
                                </div>
                                <div className="ql-prob-track">
                                    <span className="ql-prob-fill one" style={{ width: `${pct(p1)}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 컨트롤 패널 */}
                    <div className="ql-panel">
                        <div className="ql-block">
                            <span className="ql-block-label">상태 준비</span>
                            <div className="ql-presets">
                                {PRESETS.map((p) => (
                                    <button
                                        key={p.label}
                                        type="button"
                                        className={'ql-chip ' + (!locked && theta === p.deg ? 'on' : '')}
                                        onClick={() => prepare(p.deg)}
                                        disabled={locked}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="ql-block">
                            <label htmlFor="ql-theta" className="ql-block-label">
                                회전 게이트 θ <b>{theta}°</b>
                            </label>
                            <input
                                id="ql-theta"
                                type="range"
                                min="0"
                                max="180"
                                value={locked ? (collapsed === 0 ? 0 : 180) : theta}
                                onChange={(e) => prepare(Number(e.target.value))}
                                disabled={locked}
                            />
                        </div>

                        <div className="ql-block">
                            <span className="ql-block-label">게이트</span>
                            <div className="ql-gates">
                                <button type="button" className="ql-gate" onClick={applyX} disabled={locked}>
                                    X <small>비트 반전</small>
                                </button>
                                <button type="button" className="ql-gate" onClick={applyH} disabled={locked}>
                                    H <small>중첩 토글</small>
                                </button>
                            </div>
                        </div>

                        <div className="ql-actions">
                            <button type="button" className="ql-btn primary" onClick={measureOnce} disabled={locked}>
                                ▶ 한 번 측정
                            </button>
                            <button type="button" className="ql-btn" onClick={measureMany} disabled={locked}>
                                📊 1000번 반복
                            </button>
                            <button type="button" className="ql-btn" onClick={reset}>
                                ↺ 초기화
                            </button>
                        </div>

                        {/* 반복 측정 히스토그램 */}
                        {stats && (
                            <div className="ql-hist">
                                <p className="ql-hist-title">
                                    {`1000회 측정 결과 — 이론값 P0 ${pct(p0)}% / P1 ${pct(p1)}%`}
                                </p>
                                <div className="ql-hist-row">
                                    <span className="ql-hist-key">0</span>
                                    <div className="ql-hist-track">
                                        <span
                                            className="ql-hist-fill zero"
                                            style={{ width: `${(stats.zeros / SHOTS) * 100}%` }}
                                        />
                                    </div>
                                    <span className="ql-hist-val">{stats.zeros}</span>
                                </div>
                                <div className="ql-hist-row">
                                    <span className="ql-hist-key">1</span>
                                    <div className="ql-hist-track">
                                        <span
                                            className="ql-hist-fill one"
                                            style={{ width: `${(stats.ones / SHOTS) * 100}%` }}
                                        />
                                    </div>
                                    <span className="ql-hist-val">{stats.ones}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <footer className="ql-foot">
                    <p>
                        {'고전 비트는 0 '}
                        <b>또는</b>
                        {' 1, 둘 중 하나로 이미 정해져 있다. 큐비트는 측정되기 전까지 0 '}
                        <b>이면서</b>
                        {' 1인 '}
                        <b>중첩</b>
                        {' 상태다. 다이얼을 돌려 확률을 정해도, 막상 관측하는 순간 단 하나의 값으로 '}
                        <b>붕괴</b>
                        {'하고 중첩은 사라진다. 같은 상태를 1000번 측정하면 그 확률 분포만이 남는다 — '}
                        {'양자 컴퓨터가 고전 컴퓨터를 추월한다는 이야기의 출발점이 바로 이 중첩이다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default QubitLab;
