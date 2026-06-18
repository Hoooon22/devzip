import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Lossy.css';

// 원본 해상도 (CSS로 반응형 스케일)
const W = 480;
const H = 360;

// 4x4 정렬 디더링(Bayer) 행렬 — 0..15를 0..1로 정규화
const BAYER = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
].map((row) => row.map((v) => v / 16));

// 작고 빠른 시드 난수 (장면 색을 시드로 바꾸기 위함)
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

// 시드로 색이 달라지는 풍경 한 장을 그린다 — 그라데이션(밴딩용) + 형태(픽셀화용)가 풍부하게
function drawScene(ctx, seed) {
    const rnd = mulberry32((seed * 2654435761) >>> 0);
    const hue = Math.floor(rnd() * 360);

    // 하늘 그라데이션
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.72);
    sky.addColorStop(0, `hsl(${(hue + 220) % 360} 55% 16%)`);
    sky.addColorStop(0.6, `hsl(${(hue + 12) % 360} 72% 56%)`);
    sky.addColorStop(1, `hsl(${hue % 360} 88% 66%)`);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H * 0.72);

    // 별
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 40; i++) {
        const sx = rnd() * W;
        const sy = rnd() * H * 0.4;
        ctx.globalAlpha = 0.3 + rnd() * 0.5;
        ctx.fillRect(sx, sy, 1.4, 1.4);
    }
    ctx.globalAlpha = 1;

    // 태양 (부드러운 원형 그라데이션 — 양자화 시 밴딩이 또렷함)
    const sunX = W * (0.3 + rnd() * 0.4);
    const sunY = H * (0.26 + rnd() * 0.22);
    const R = H * 0.13;
    const sun = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, R);
    sun.addColorStop(0, '#fff7e6');
    sun.addColorStop(0.5, `hsl(${(hue + 42) % 360} 95% 72%)`);
    sun.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, R, 0, Math.PI * 2);
    ctx.fill();

    // 능선 3겹 (형태 디테일 — 픽셀화하면 뭉개짐)
    for (let layer = 0; layer < 3; layer++) {
        const baseY = H * (0.46 + layer * 0.08);
        ctx.fillStyle = `hsl(${(hue + 205 + layer * 14) % 360} ${36 - layer * 8}% ${20 + layer * 9}%)`;
        ctx.beginPath();
        ctx.moveTo(0, H * 0.72);
        ctx.lineTo(0, baseY);
        const peaks = 5 + layer * 2;
        for (let p = 0; p <= peaks; p++) {
            const px = (W / peaks) * p;
            const py = baseY - rnd() * H * 0.12 + Math.sin(p) * 6;
            ctx.lineTo(px, py);
        }
        ctx.lineTo(W, H * 0.72);
        ctx.closePath();
        ctx.fill();
    }

    // 수면 + 햇빛 반사
    const water = ctx.createLinearGradient(0, H * 0.72, 0, H);
    water.addColorStop(0, `hsl(${hue % 360} 62% 42%)`);
    water.addColorStop(1, `hsl(${(hue + 220) % 360} 52% 13%)`);
    ctx.fillStyle = water;
    ctx.fillRect(0, H * 0.72, W, H * 0.28);

    ctx.fillStyle = 'rgba(255,240,200,0.5)';
    for (let r = 0; r < 14; r++) {
        const ry = H * 0.74 + r * (H * 0.26 / 14);
        const rw = R * (1.6 - r * 0.08) * (0.6 + rnd() * 0.5);
        ctx.globalAlpha = 0.35 - r * 0.02;
        ctx.fillRect(sunX - rw / 2, ry, rw, 2);
    }
    ctx.globalAlpha = 1;
}

// 손실 압축 파이프라인: 블록 평균(샘플 수 축소) → 채널 양자화(색 단계 축소) → 선택적 디더링
function compress(src, blocks, bits, dither) {
    const out = new Uint8ClampedArray(src.length);
    const levels = Math.pow(2, bits);
    const bw = blocks;
    const bh = Math.max(1, Math.round(blocks * (H / W)));
    const cellW = W / bw;
    const cellH = H / bh;

    // 1) 블록별 평균색
    const avg = new Float32Array(bw * bh * 3);
    const cnt = new Float32Array(bw * bh);
    for (let y = 0; y < H; y++) {
        const by = Math.min(bh - 1, (y / cellH) | 0);
        for (let x = 0; x < W; x++) {
            const bx = Math.min(bw - 1, (x / cellW) | 0);
            const bi = by * bw + bx;
            const si = (y * W + x) * 4;
            avg[bi * 3] += src[si];
            avg[bi * 3 + 1] += src[si + 1];
            avg[bi * 3 + 2] += src[si + 2];
            cnt[bi]++;
        }
    }
    for (let i = 0; i < bw * bh; i++) {
        const c = cnt[i] || 1;
        avg[i * 3] /= c;
        avg[i * 3 + 1] /= c;
        avg[i * 3 + 2] /= c;
    }

    // 2) 양자화(+디더링) 후 출력 + 원본 대비 오차 누적
    const step = 255 / (levels - 1);
    let errSum = 0;
    for (let y = 0; y < H; y++) {
        const by = Math.min(bh - 1, (y / cellH) | 0);
        for (let x = 0; x < W; x++) {
            const bx = Math.min(bw - 1, (x / cellW) | 0);
            const bi = by * bw + bx;
            const si = (y * W + x) * 4;
            const d = dither ? (BAYER[y & 3][x & 3] - 0.5) * step : 0;
            for (let c = 0; c < 3; c++) {
                let v = avg[bi * 3 + c] + d;
                v = Math.round(v / step) * step;
                v = v < 0 ? 0 : v > 255 ? 255 : v;
                out[si + c] = v;
                errSum += Math.abs(v - src[si + c]);
            }
            out[si + 3] = 255;
        }
    }

    const err = errSum / (W * H * 3); // 0..255 평균 절대 오차
    const sizeBytes = (bw * bh * 3 * bits) / 8; // 샘플 수 × 채널 × 비트심도
    const origBytes = W * H * 3; // 무압축 RGB
    return { out, err, sizeBytes, origBytes };
}

const Lossy = () => {
    const [blocks, setBlocks] = useState(140);
    const [bits, setBits] = useState(4);
    const [dither, setDither] = useState(false);
    const [seed, setSeed] = useState(7);
    const [stats, setStats] = useState({ dataPct: 0, ratio: 0, lossPct: 0 });

    const srcRef = useRef(null); // 원본 ImageData
    const outCanvasRef = useRef(null);
    const srcCanvasRef = useRef(null);

    // 장면 생성: 시드가 바뀌면 새 풍경을 그려 원본 ImageData를 보관
    useEffect(() => {
        const srcCanvas = srcCanvasRef.current;
        const sctx = srcCanvas.getContext('2d', { willReadFrequently: true });
        drawScene(sctx, seed);
        srcRef.current = sctx.getImageData(0, 0, W, H);
    }, [seed]);

    // 파라미터(또는 장면)가 바뀌면 압축 결과를 다시 계산해 그린다
    const recompute = useCallback(() => {
        const src = srcRef.current;
        if (!src) return;
        const { out, err, sizeBytes, origBytes } = compress(src.data, blocks, bits, dither);
        const octx = outCanvasRef.current.getContext('2d');
        octx.putImageData(new ImageData(out, W, H), 0, 0);
        setStats({
            dataPct: (sizeBytes / origBytes) * 100,
            ratio: origBytes / sizeBytes,
            lossPct: (err / 255) * 100,
        });
    }, [blocks, bits, dither]);

    useEffect(() => {
        recompute();
    }, [recompute, seed]);

    const levels = Math.pow(2, bits);

    return (
        <div className="lsy-container">
            <div className="lsy-inner">
                <Link to="/" className="lsy-back">← 실험실로 돌아가기</Link>

                <header className="lsy-header">
                    <h1 className="lsy-title">LOSSY</h1>
                    <p className="lsy-sub">
                        {'// 압축의 미학 — 얼마나 버려야 의미가 깨지는가'}
                    </p>
                </header>

                <div className="lsy-stage">
                    <div className="lsy-views">
                        <figure className="lsy-view">
                            <canvas ref={srcCanvasRef} width={W} height={H} className="lsy-canvas" />
                            <figcaption>원본 · 무압축</figcaption>
                        </figure>
                        <figure className="lsy-view">
                            <canvas ref={outCanvasRef} width={W} height={H} className="lsy-canvas" />
                            <figcaption>
                                압축본 · {blocks}px / {levels}색 단계{dither ? ' / 디더링' : ''}
                            </figcaption>
                        </figure>
                    </div>

                    <div className="lsy-panel">
                        <div className="lsy-stat lsy-stat-main">
                            <span className="lsy-stat-num">
                                {stats.dataPct.toFixed(1)}<small>%</small>
                            </span>
                            <span className="lsy-stat-label">원본 대비 데이터량</span>
                        </div>

                        <div className="lsy-stat-row">
                            <div className="lsy-stat">
                                <span className="lsy-stat-num lsy-mini">
                                    {stats.ratio.toFixed(1)}<small>:1</small>
                                </span>
                                <span className="lsy-stat-label">압축비</span>
                            </div>
                            <div className="lsy-stat">
                                <span className="lsy-stat-num lsy-mini">
                                    {stats.lossPct.toFixed(1)}<small>%</small>
                                </span>
                                <span className="lsy-stat-label">화질 손실</span>
                            </div>
                        </div>

                        <div className="lsy-control">
                            <label htmlFor="lsy-blocks">
                                해상도 <b>{blocks}px</b>
                            </label>
                            <input
                                id="lsy-blocks"
                                type="range"
                                min={6}
                                max={W}
                                value={blocks}
                                onChange={(e) => setBlocks(Number(e.target.value))}
                            />
                        </div>

                        <div className="lsy-control">
                            <label htmlFor="lsy-bits">
                                색 심도 <b>{bits}bit · {levels}단계</b>
                            </label>
                            <input
                                id="lsy-bits"
                                type="range"
                                min={1}
                                max={8}
                                value={bits}
                                onChange={(e) => setBits(Number(e.target.value))}
                            />
                        </div>

                        <label className="lsy-toggle">
                            <input
                                type="checkbox"
                                checked={dither}
                                onChange={(e) => setDither(e.target.checked)}
                            />
                            <span>디더링 (노이즈로 밴딩 감추기)</span>
                        </label>

                        <button
                            type="button"
                            className="lsy-btn"
                            onClick={() => setSeed((s) => s + 1)}
                        >
                            다른 장면 불러오기
                        </button>
                    </div>
                </div>

                <footer className="lsy-foot">
                    <p>
                        {'압축은 '}<b>버리는 기술</b>{'이다. 해상도를 낮추면 샘플 수가, 색 심도를 낮추면 '}
                        {'표현 가능한 색이 줄어 데이터량이 급감하지만 그만큼 원본과 멀어진다. '}
                        {'흥미로운 건 '}<b>디더링</b>{' — 데이터를 한 비트도 더 쓰지 않고 노이즈만 흩뿌려 '}
                        {'끊긴 색 띠(밴딩)를 눈속임으로 메운다. 같은 용량에서 더 그럴듯해 보이는 것이다. '}
                        {'밈이 거대한 사건을 짤 한 장으로 압축하고, 거대 모델이 세상의 지식을 가중치로 '}
                        {'욱여넣는 것도 결국 같은 거래다 — '}<b>무엇을 버리고 무엇을 남길 것인가</b>{'.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default Lossy;
