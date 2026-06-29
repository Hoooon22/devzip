import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Quantize.css';

// 양자화(quantization) 시뮬레이터.
// 핵심: 거대한 모델을 노트북·휴대폰에서 돌리려면 가중치를 저장하는 "정밀도"를 깎는다.
// 32비트 실수(FP32)로 들고 있던 수많은 가중치를, 4비트 같은 거친 격자(2^B 단계)로
// 반올림해 끼워 넣으면 용량은 8배 줄지만 값이 미세하게 어긋난다(양자화 오차).
// 이 페이지는 한 줄의 가중치 벡터를 신호로 보고, 비트 수를 깎을 때
// (1) 표현 가능한 단계 수 (2) 차지하는 메모리 (3) 원본과의 오차가
// 어떻게 함께 움직이는지 — 작게/정확하게의 거래(trade-off)를 직접 만지게 한다.

// 결정적 PRNG (재현 가능한 잡음용)
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

const SIGNALS = [
    {
        key: 'sine',
        label: '사인파',
        fn: (x) => 0.85 * Math.sin(x * Math.PI * 2.2),
    },
    {
        key: 'bumps',
        label: '두 봉우리',
        fn: (x) => {
            const g = (c, w) => Math.exp(-((x - c) ** 2) / (2 * w * w));
            return 0.95 * g(0.3, 0.12) - 0.8 * g(0.72, 0.1);
        },
    },
    {
        key: 'ramp',
        label: '계단 경사',
        fn: (x) => {
            const t = (x * 3) % 1;
            return (Math.floor(x * 3) / 2 - 0.5) * 1.4 + (t - 0.5) * 0.25;
        },
    },
    {
        key: 'noisy',
        label: '잡음 섞인 곡선',
        fn: (x, rng) => 0.6 * Math.sin(x * Math.PI * 1.6) + (rng() - 0.5) * 0.7,
    },
];

// 신호를 N개의 가중치로 샘플링 ([-1,1] 부근)
function sampleWeights(signalKey, n, seed) {
    const sig = SIGNALS.find((s) => s.key === signalKey) || SIGNALS[0];
    const rng = mulberry32(seed);
    const out = [];
    for (let i = 0; i < n; i++) {
        const x = n === 1 ? 0 : i / (n - 1);
        let v = sig.fn(x, rng);
        if (v > 1) v = 1;
        if (v < -1) v = -1;
        out.push(v);
    }
    return out;
}

// 비트 수 B로 균일 양자화: [lo,hi]를 2^B 단계로 나눠 가장 가까운 격자에 반올림
function quantize(weights, bits) {
    const lo = Math.min(...weights);
    const hi = Math.max(...weights);
    const levelCount = Math.pow(2, bits);
    const span = hi - lo || 1e-9;
    const step = span / (levelCount - 1 || 1);
    const q = weights.map((w) => lo + Math.round((w - lo) / step) * step);
    const levels = [];
    for (let i = 0; i < levelCount && levelCount <= 256; i++) {
        levels.push(lo + i * step);
    }
    let sq = 0;
    let maxErr = 0;
    for (let i = 0; i < weights.length; i++) {
        const e = q[i] - weights[i];
        sq += e * e;
        if (Math.abs(e) > maxErr) maxErr = Math.abs(e);
    }
    const rmse = Math.sqrt(sq / weights.length);
    return { q, lo, hi, step, levelCount, levels, rmse, maxErr };
}

const Quantize = () => {
    const [signalKey, setSignalKey] = useState('sine');
    const [bits, setBits] = useState(4);
    const [count, setCount] = useState(48);
    const [seed, setSeed] = useState(3);
    const canvasRef = useRef(null);

    const weights = useMemo(
        () => sampleWeights(signalKey, count, seed),
        [signalKey, count, seed]
    );
    const result = useMemo(() => quantize(weights, bits), [weights, bits]);

    // 메모리 계산: FP32 기준 대비 양자화 후
    const fp32Bits = count * 32;
    const qBits = count * bits;
    const compression = 32 / bits;
    const savedPct = Math.round((1 - bits / 32) * 100);
    const qKB = (qBits / 8 / 1024).toFixed(qBits / 8 < 1024 ? 3 : 2);
    const fp32Bytes = fp32Bits / 8;
    const qBytes = qBits / 8;

    // 캔버스 렌더 (정적 — rAF 루프 없음)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        const pad = 28;
        const innerW = W - pad * 2;
        const innerH = H - pad * 2;
        const range = 1.08;
        const xAt = (i) =>
            pad + (count === 1 ? innerW / 2 : (i / (count - 1)) * innerW);
        const yAt = (v) => pad + ((range - v) / (2 * range)) * innerH;

        // 배경
        ctx.fillStyle = '#16191f';
        ctx.fillRect(0, 0, W, H);

        // 양자화 격자 (표현 가능한 단계들) — 단계가 너무 많으면 생략
        if (result.levels.length && result.levels.length <= 64) {
            ctx.lineWidth = 1;
            result.levels.forEach((lv) => {
                const y = yAt(lv);
                ctx.strokeStyle = 'rgba(245,158,11,0.28)';
                ctx.beginPath();
                ctx.moveTo(pad, y);
                ctx.lineTo(W - pad, y);
                ctx.stroke();
            });
        }

        // 0 기준선
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad, yAt(0));
        ctx.lineTo(W - pad, yAt(0));
        ctx.stroke();

        // 오차 막대 (원본 → 양자화 값)
        ctx.strokeStyle = 'rgba(216,58,43,0.65)';
        ctx.lineWidth = 1.5;
        weights.forEach((w, i) => {
            const x = xAt(i);
            ctx.beginPath();
            ctx.moveTo(x, yAt(w));
            ctx.lineTo(x, yAt(result.q[i]));
            ctx.stroke();
        });

        // 원본 곡선 (부드러운 흰 선)
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        weights.forEach((w, i) => {
            const x = xAt(i);
            const y = yAt(w);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // 양자화된 값 (계단형 + 점)
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        result.q.forEach((v, i) => {
            const x = xAt(i);
            const y = yAt(v);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        const dotR = count > 80 ? 1.6 : 2.6;
        ctx.fillStyle = '#f59e0b';
        result.q.forEach((v, i) => {
            ctx.beginPath();
            ctx.arc(xAt(i), yAt(v), dotR, 0, Math.PI * 2);
            ctx.fill();
        });
    }, [weights, result, count]);

    return (
        <div className="qz-container">
            <div className="qz-inner">
                <Link to="/" className="qz-back">← 실험실로 돌아가기</Link>

                <header className="qz-header">
                    <h1 className="qz-title">QUANTIZE</h1>
                    <p className="qz-sub">{'// 정밀도를 깎아 거대한 모델을 손바닥 위로 — 가중치 양자화'}</p>
                </header>

                <div className="qz-stage">
                    {/* 좌측: 스코프 + 신호 선택 */}
                    <section className="qz-left">
                        <div className="qz-presets">
                            <span className="qz-presets-label">가중치 신호:</span>
                            {SIGNALS.map((s) => (
                                <button
                                    key={s.key}
                                    type="button"
                                    className={
                                        'qz-preset-btn' +
                                        (s.key === signalKey ? ' qz-preset-on' : '')
                                    }
                                    onClick={() => setSignalKey(s.key)}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>

                        <div className="qz-scope-wrap">
                            <canvas
                                ref={canvasRef}
                                width={760}
                                height={360}
                                className="qz-scope"
                            />
                        </div>

                        <div className="qz-legend">
                            <span className="qz-leg"><i className="qz-swatch qz-sw-orig" />원본 (FP32)</span>
                            <span className="qz-leg"><i className="qz-swatch qz-sw-quant" />양자화 ({bits}비트)</span>
                            <span className="qz-leg"><i className="qz-swatch qz-sw-err" />양자화 오차</span>
                            <span className="qz-leg"><i className="qz-swatch qz-sw-grid" />표현 가능한 단계</span>
                        </div>

                        <button
                            type="button"
                            className="qz-reshuffle"
                            onClick={() => setSeed((s) => s + 1)}
                        >
                            ↻ 가중치 다시 뽑기
                        </button>
                    </section>

                    {/* 우측: 컨트롤 + 지표 */}
                    <aside className="qz-panel">
                        <div className="qz-control">
                            <label htmlFor="qz-bits">
                                정밀도 <b>{bits}</b><small>비트/가중치</small>
                            </label>
                            <input
                                id="qz-bits"
                                type="range"
                                min={1}
                                max={8}
                                value={bits}
                                onChange={(e) => setBits(Number(e.target.value))}
                            />
                            <div className="qz-ticks">
                                <span>1</span><span>해상도</span><span>8</span>
                            </div>
                        </div>

                        <div className="qz-control">
                            <label htmlFor="qz-count">
                                모델 크기 <b>{count}</b><small>개 가중치</small>
                            </label>
                            <input
                                id="qz-count"
                                type="range"
                                min={8}
                                max={128}
                                step={4}
                                value={count}
                                onChange={(e) => setCount(Number(e.target.value))}
                            />
                        </div>

                        <div className="qz-stat qz-stat-main">
                            <span className="qz-stat-num">
                                {compression % 1 === 0 ? compression : compression.toFixed(1)}
                                <small>×</small>
                            </span>
                            <span className="qz-stat-label">압축률 (FP32 대비)</span>
                        </div>

                        <div className="qz-stat-row">
                            <div className="qz-stat">
                                <span className="qz-stat-num qz-mini">{result.levelCount}</span>
                                <span className="qz-stat-label">표현 단계 (2^{bits})</span>
                            </div>
                            <div className="qz-stat">
                                <span className="qz-stat-num qz-mini">
                                    {result.rmse.toFixed(3)}
                                </span>
                                <span className="qz-stat-label">평균 오차 (RMSE)</span>
                            </div>
                        </div>

                        <div className="qz-mem">
                            <div className="qz-mem-head">메모리 (작을수록 좋음)</div>
                            <div className="qz-mem-row">
                                <span className="qz-mem-tag">FP32</span>
                                <div className="qz-mem-track">
                                    <div className="qz-mem-fill qz-mem-base" style={{ width: '100%' }}>
                                        {fp32Bytes >= 1024
                                            ? (fp32Bytes / 1024).toFixed(1) + 'KB'
                                            : fp32Bytes + 'B'}
                                    </div>
                                </div>
                            </div>
                            <div className="qz-mem-row">
                                <span className="qz-mem-tag">{bits}비트</span>
                                <div className="qz-mem-track">
                                    <div
                                        className="qz-mem-fill qz-mem-q"
                                        style={{ width: `${Math.max((bits / 32) * 100, 4)}%` }}
                                    >
                                        {qBytes >= 1024 ? qKB + 'KB' : Math.ceil(qBytes) + 'B'}
                                    </div>
                                </div>
                            </div>
                            <div className="qz-mem-foot">
                                정밀도를 깎아 <b>{savedPct}%</b>의 용량을 덜어냈습니다.
                            </div>
                        </div>

                        <div className="qz-hint">
                            {bits >= 6
                                ? '고정밀: 곡선이 거의 그대로지만 용량 절감은 작다.'
                                : bits >= 3
                                ? '바로 이 부근(3~4비트)이 흔히 쓰는 절충점 — 작으면서 쓸 만하다.'
                                : '극단 압축: 단계가 너무 거칠어 형태가 무너진다.'}
                        </div>
                    </aside>
                </div>

                <footer className="qz-foot">
                    <p>
                        {'요즘 수십억 개의 가중치를 가진 모델이 노트북·휴대폰에서 돌아가는 비결은 '}
                        <b>양자화</b>{'다. 가중치를 '}<b>32비트 실수(FP32)</b>
                        {' 그대로 들고 있으면 정확하지만 무겁다. 그래서 값의 범위를 '}
                        <b>2의 비트 제곱만큼의 단계</b>{'로 쪼갠 거친 격자에 반올림해 끼워 넣는다.'}
                    </p>
                    <p>
                        {'4비트면 단계는 단 '}<b>16개</b>{'. 흰 곡선(원본)을 주황 곡선(양자화)이 '}
                        {'계단처럼 따라가고, 그 둘 사이의 빨간 틈이 '}<b>양자화 오차</b>{'다. '}
                        {'정밀도를 깎을수록 메모리는 비트 수에 비례해 줄지만(32→4비트면 '}<b>8배</b>
                        {' 압축), 격자가 거칠어져 오차가 커진다.'}
                    </p>
                    <p>
                        {'비트 슬라이더를 내려보면 '}<b>4비트 부근</b>{'에서 묘한 균형이 보인다 — '}
                        {'용량은 8배 줄었는데 형태는 아직 알아볼 만하다. 실제로 로컬 LLM이 '}
                        <b>4비트 양자화</b>{'를 즐겨 쓰는 이유이기도 하다. 더 내리면 형태가 무너지고, '}
                        {'올리면 절감 폭이 사라진다.'}
                    </p>
                    <p className="qz-disclaimer">
                        {'* 실제 신경망이 아니라 균일 양자화(uniform quantization)의 정밀도-용량-오차 거래를 '}
                        {'보여주는 결정적 시뮬레이터입니다. 가중치 한 줄을 신호로 단순화했습니다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default Quantize;
