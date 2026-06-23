import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Diffusion.css';

// 작고 빠른 시드 난수
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

// 고정 가우시안 노이즈 필드 (시드·해상도가 같으면 동일) — 스크럽 시 형태가 매끄럽게 떠오르게 한다
function makeNoise(n, seed) {
    const rng = mulberry32((seed * 2654435761) >>> 0);
    const arr = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) {
        const u1 = Math.max(1e-7, rng());
        const u2 = rng();
        arr[i] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); // Box-Muller
    }
    return arr;
}

const PRESETS = [
    { key: 'heart', label: '하트 ♥' },
    { key: 'star', label: '별 ✦' },
    { key: 'rings', label: '파문 ◎' },
    { key: 'glyph', label: '문양 ▦' },
];

// 목표 형태(깨끗한 그림 x0)를 NxN 값(0..1)으로 만든다
function buildTarget(preset, n) {
    const out = new Float32Array(n * n);
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
            const nx = (x / (n - 1)) * 2 - 1;
            const ny = (y / (n - 1)) * 2 - 1;
            let v;
            if (preset === 'rings') {
                v = 0.5 + 0.5 * Math.cos(Math.hypot(nx, ny) * Math.PI * 5);
            } else if (preset === 'star') {
                const ang = Math.atan2(ny, nx);
                const edge = 0.42 + 0.34 * Math.cos(ang * 5 - Math.PI / 2);
                v = Math.hypot(nx, ny) <= edge ? 1 : 0.05;
            } else if (preset === 'heart') {
                const X = nx * 1.3;
                const Y = -ny * 1.15 + 0.35;
                const f = Math.pow(X * X + Y * Y - 1, 3) - X * X * Y * Y * Y;
                v = f <= 0 ? 1 : 0.05;
            } else {
                // glyph: 좌우 대칭 해시 블록 — 생성된 문양/QR 느낌
                const k = 8;
                let bx = Math.floor((x / n) * k);
                const by = Math.floor((y / n) * k);
                if (bx >= k / 2) bx = k - 1 - bx;
                const h = Math.imul((bx + 1) * 374761393 + (by + 1) * 668265263, 1274126177) >>> 0;
                v = (h & 1) ? 1 : 0.05;
            }
            out[y * n + x] = v;
        }
    }
    return out;
}

const DUR = 2600; // 생성 애니메이션 길이(ms)

const Diffusion = () => {
    const [preset, setPreset] = useState('heart');
    const [n, setN] = useState(48);
    const [seed, setSeed] = useState(3);
    const [progress, setProgress] = useState(0); // 0 = 순수 노이즈, 1 = 깨끗한 그림
    const [playing, setPlaying] = useState(false);
    const canvasRef = useRef(null);

    const target = useMemo(() => buildTarget(preset, n), [preset, n]);
    const noise = useMemo(() => makeNoise(n, seed), [n, seed]);

    // 노이즈 스케줄(코사인): progress→누적 신호비율(alphaBar)
    const aBar = Math.pow(Math.cos((1 - progress) * Math.PI / 2), 2);
    const sig = Math.sqrt(aBar);
    const nz = Math.sqrt(1 - aBar);

    const draw = useCallback(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        if (cv.width !== n) {
            cv.width = n;
            cv.height = n;
        }
        const ctx = cv.getContext('2d');
        const img = ctx.createImageData(n, n);
        const data = img.data;
        for (let i = 0; i < n * n; i++) {
            const noise01 = Math.min(1, Math.max(0, 0.5 + noise[i] * 0.32));
            let b = sig * target[i] + nz * noise01; // x_t = √ᾱ·x0 + √(1-ᾱ)·ε
            b = b < 0 ? 0 : b > 1 ? 1 : b;
            let r = 22 + b * (228 - 22);
            let g = 20 + b * (224 - 20);
            let bl = 18 + b * (214 - 18);
            if (b > 0.68) {
                // 강한 신호는 형광 그린으로 점화 — 노이즈 속에서 형태가 빛난다(강조 10%)
                const t = Math.min(1, (b - 0.68) / 0.32) * 0.8;
                r = r + (174 - r) * t;
                g = g + (240 - g) * t;
                bl = bl + (0 - bl) * t;
            }
            const o = i * 4;
            data[o] = r;
            data[o + 1] = g;
            data[o + 2] = bl;
            data[o + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
    }, [n, target, noise, sig, nz]);

    useEffect(() => {
        draw();
    }, [draw]);

    // 생성 재생: progress 0→1
    useEffect(() => {
        if (!playing) return undefined;
        let raf;
        const t0 = performance.now();
        const tick = (now) => {
            const s = Math.min(1, (now - t0) / DUR);
            setProgress(s);
            if (s < 1) {
                raf = requestAnimationFrame(tick);
            } else {
                setPlaying(false);
            }
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [playing]);

    const startGen = () => {
        setProgress(0);
        setPlaying(true);
    };

    const onScrub = (e) => {
        setPlaying(false);
        setProgress(Number(e.target.value) / 1000);
    };

    const noiseRemain = nz * 100;
    const signalPct = sig * 100;
    const presetLabel = PRESETS.find((p) => p.key === preset)?.label ?? '';

    return (
        <div className="dfn-container">
            <div className="dfn-inner">
                <Link to="/" className="dfn-back">← 실험실로 돌아가기</Link>

                <header className="dfn-header">
                    <h1 className="dfn-title">DIFFUSION</h1>
                    <p className="dfn-sub">
                        {'// 노이즈에서 형태가 태어난다 — 생성 모델의 역확산을 직접 되감아보기'}
                    </p>
                </header>

                <div className="dfn-stage">
                    <figure className="dfn-view">
                        <canvas ref={canvasRef} width={n} height={n} className="dfn-canvas" />
                        <figcaption>
                            {presetLabel} · {n}×{n} · 신호 {signalPct.toFixed(0)}%
                        </figcaption>
                    </figure>

                    <div className="dfn-panel">
                        <div className="dfn-stat dfn-stat-main">
                            <span className="dfn-stat-num">
                                {noiseRemain.toFixed(1)}<small>%</small>
                            </span>
                            <span className="dfn-stat-label">남은 노이즈</span>
                        </div>

                        <div className="dfn-presets">
                            {PRESETS.map((p) => (
                                <button
                                    key={p.key}
                                    type="button"
                                    className={`dfn-preset${preset === p.key ? ' is-on' : ''}`}
                                    onClick={() => setPreset(p.key)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <div className="dfn-control">
                            <label htmlFor="dfn-prog">
                                디노이징 진행 <b>{(progress * 100).toFixed(0)}%</b>
                            </label>
                            <input
                                id="dfn-prog"
                                type="range"
                                min={0}
                                max={1000}
                                value={Math.round(progress * 1000)}
                                onChange={onScrub}
                            />
                        </div>

                        <div className="dfn-control">
                            <label htmlFor="dfn-res">
                                해상도 <b>{n}×{n}</b>
                            </label>
                            <input
                                id="dfn-res"
                                type="range"
                                min={16}
                                max={64}
                                step={8}
                                value={n}
                                onChange={(e) => setN(Number(e.target.value))}
                            />
                        </div>

                        <button type="button" className="dfn-btn dfn-btn-go" onClick={startGen}>
                            {playing ? '생성 중…' : '▶ 생성 재생'}
                        </button>
                        <button
                            type="button"
                            className="dfn-btn"
                            onClick={() => setSeed((s) => s + 1)}
                        >
                            🎲 다른 노이즈
                        </button>
                    </div>
                </div>

                <footer className="dfn-foot">
                    <p>
                        {'생성 AI가 그림을 만드는 방식은 '}<b>거꾸로 된 모래시계</b>{'다. '}
                        {'먼저 깨끗한 그림에 노이즈를 조금씩 부어 완전한 모래폭풍(순수 노이즈)으로 만든 뒤, '}
                        {'그 과정을 '}<b>역으로</b>{' 되감으며 한 스텝씩 노이즈를 걷어낸다. '}
                        {'슬라이더를 끝까지 당기기 전에 멈추면 형태가 채 영글지 못한 '}<b>거친 입자</b>{'가 남는데, '}
                        {'요즘 인터넷을 뒤덮은 어설픈 AI 이미지(슬롭)의 그 묘한 질감이 바로 이 '}
                        {'덜 걷힌 노이즈다. 해상도를 낮추면 더 적은 계산으로 더 빨리 그려지지만 디테일을 잃는다 — '}
                        {'생성이란 결국 '}<b>무질서에서 질서를 얼마나 끈기 있게 끌어내느냐</b>{'의 문제다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default Diffusion;
