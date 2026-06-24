import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Interpolate.css';

// GIS 공간 보간(Spatial Interpolation) 실험.
// 흩어진 관측점(표고·기온·오염도…) 사이의 빈 공간을 추정해 연속 표면을 만든다.
// IDW(역거리가중)와 최근접 이웃(보로노이)을 같은 데이터로 비교해 본다.

const GRID = 140;       // 보간 표면 해상도 (오프스크린 그리드)
const CANVAS = 460;     // 화면 표시 픽셀

// 표고 느낌의 색 램프 — 심해 → 저지 초록 → 황토 → 설산.
const RAMP = [
    [0.0, [38, 78, 120]],
    [0.22, [54, 134, 140]],
    [0.45, [150, 188, 120]],
    [0.62, [214, 198, 120]],
    [0.78, [196, 142, 86]],
    [0.9, [150, 104, 72]],
    [1.0, [238, 234, 224]],
];

function ramp(t) {
    const v = Math.max(0, Math.min(1, t));
    for (let i = 1; i < RAMP.length; i++) {
        if (v <= RAMP[i][0]) {
            const [a, ca] = RAMP[i - 1];
            const [b, cb] = RAMP[i];
            const f = (v - a) / (b - a || 1);
            return [
                Math.round(ca[0] + (cb[0] - ca[0]) * f),
                Math.round(ca[1] + (cb[1] - ca[1]) * f),
                Math.round(ca[2] + (cb[2] - ca[2]) * f),
            ];
        }
    }
    return RAMP[RAMP.length - 1][1];
}

// 한 지점(qx,qy)의 추정값을 계산. 0..1 좌표, points: {x,y,v}.
// method=idw → 역거리가중, method=nearest → 최근접(보로노이).
function estimate(qx, qy, points, method, power, neighbors) {
    if (points.length === 0) return null;
    // 거리 제곱 목록
    const d = points.map((p) => {
        const dx = p.x - qx;
        const dy = p.y - qy;
        return { v: p.v, d2: dx * dx + dy * dy };
    });

    if (method === 'nearest') {
        let best = d[0];
        for (let i = 1; i < d.length; i++) if (d[i].d2 < best.d2) best = d[i];
        return best.v;
    }

    // IDW — 가까운 이웃만 쓸 수 있음(neighbors=0 → 전체)
    let use = d;
    if (neighbors > 0 && neighbors < d.length) {
        use = d.slice().sort((a, b) => a.d2 - b.d2).slice(0, neighbors);
    }
    let num = 0;
    let den = 0;
    for (const it of use) {
        if (it.d2 < 1e-9) return it.v; // 관측점과 일치 → 그 값 그대로
        const w = 1 / Math.pow(it.d2, power / 2); // 1/d^power
        num += w * it.v;
        den += w;
    }
    return den ? num / den : null;
}

// 두 언덕과 한 골짜기를 가진 기본 지형.
const DEFAULT_POINTS = [
    { x: 0.24, y: 0.30, v: 0.85 },
    { x: 0.30, y: 0.38, v: 0.70 },
    { x: 0.72, y: 0.66, v: 0.78 },
    { x: 0.78, y: 0.58, v: 0.62 },
    { x: 0.52, y: 0.50, v: 0.18 },
    { x: 0.18, y: 0.78, v: 0.30 },
    { x: 0.82, y: 0.22, v: 0.40 },
];

// 결정적 의사난수 — 시드로 같은 지형 재현.
function rand(seed) {
    let s = (seed * 2654435761) >>> 0;
    return () => {
        s ^= s << 13; s >>>= 0;
        s ^= s >> 17;
        s ^= s << 5; s >>>= 0;
        return s / 4294967296;
    };
}

function randomTerrain(seed) {
    const r = rand(seed);
    const n = 6 + Math.floor(r() * 5);
    const pts = [];
    for (let i = 0; i < n; i++) {
        pts.push({
            x: 0.1 + r() * 0.8,
            y: 0.1 + r() * 0.8,
            v: Math.round(r() * 100) / 100,
        });
    }
    return pts;
}

const Interpolate = () => {
    const [points, setPoints] = useState(DEFAULT_POINTS);
    const [method, setMethod] = useState('idw');
    const [power, setPower] = useState(2);
    const [neighbors, setNeighbors] = useState(0); // 0 = 전체
    const [bands, setBands] = useState(false);
    const [showPts, setShowPts] = useState(true);
    const [brush, setBrush] = useState(0.7);
    const [seed, setSeed] = useState(3);
    const [hover, setHover] = useState(null); // {x,y,v}

    const canvasRef = useRef(null);
    const offRef = useRef(null);

    // 표면 렌더 — 파라미터/관측점이 바뀔 때만 다시 그린다(연속 애니메이션 없음).
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (!offRef.current) {
            const off = document.createElement('canvas');
            off.width = GRID;
            off.height = GRID;
            offRef.current = off;
        }
        const off = offRef.current;
        const octx = off.getContext('2d');
        const img = octx.createImageData(GRID, GRID);

        for (let gy = 0; gy < GRID; gy++) {
            for (let gx = 0; gx < GRID; gx++) {
                const qx = (gx + 0.5) / GRID;
                const qy = (gy + 0.5) / GRID;
                let val = estimate(qx, qy, points, method, power, neighbors);
                const idx = (gy * GRID + gx) * 4;
                if (val === null) {
                    img.data[idx] = 20; img.data[idx + 1] = 24; img.data[idx + 2] = 30; img.data[idx + 3] = 255;
                    continue;
                }
                if (bands) val = Math.floor(val * 10) / 10 + 0.05;
                const [r, g, b] = ramp(val);
                img.data[idx] = r; img.data[idx + 1] = g; img.data[idx + 2] = b; img.data[idx + 3] = 255;
            }
        }
        octx.putImageData(img, 0, 0);

        ctx.imageSmoothingEnabled = !bands; // 밴드 모드는 또렷하게
        ctx.clearRect(0, 0, CANVAS, CANVAS);
        ctx.drawImage(off, 0, 0, CANVAS, CANVAS);

        // 관측점 마커
        if (showPts) {
            for (const p of points) {
                const cx = p.x * CANVAS;
                const cy = p.y * CANVAS;
                ctx.beginPath();
                ctx.arc(cx, cy, 7, 0, Math.PI * 2);
                ctx.fillStyle = '#0c0e12';
                ctx.fill();
                ctx.lineWidth = 2.5;
                ctx.strokeStyle = '#f5f1e6';
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(cx, cy, 3, 0, Math.PI * 2);
                const [r, g, b] = ramp(p.v);
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fill();
            }
        }
    }, [points, method, power, neighbors, bands, showPts]);

    const stats = useMemo(() => {
        if (points.length === 0) return { n: 0, min: 0, max: 0, mean: 0 };
        let min = 1, max = 0, sum = 0;
        for (const p of points) { min = Math.min(min, p.v); max = Math.max(max, p.v); sum += p.v; }
        return { n: points.length, min, max, mean: sum / points.length };
    }, [points]);

    const toField = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
    }, []);

    // 빈 곳 클릭 → 관측점 추가 / 점 근처 클릭 → 제거
    const onClick = useCallback((e) => {
        const { x, y } = toField(e);
        const hitIdx = points.findIndex((p) => {
            const dx = (p.x - x) * CANVAS;
            const dy = (p.y - y) * CANVAS;
            return dx * dx + dy * dy < 12 * 12;
        });
        if (hitIdx >= 0) {
            setPoints(points.filter((_, i) => i !== hitIdx));
        } else {
            setPoints([...points, { x, y, v: brush }]);
        }
    }, [points, brush, toField]);

    const onMove = useCallback((e) => {
        const { x, y } = toField(e);
        const v = estimate(x, y, points, method, power, neighbors);
        setHover(v === null ? null : { x, y, v });
    }, [points, method, power, neighbors, toField]);

    return (
        <div className="ip-container">
            <div className="ip-inner">
                <Link to="/" className="ip-back">← 실험실로 돌아가기</Link>

                <header className="ip-header">
                    <h1 className="ip-title">INTERPOLATE</h1>
                    <p className="ip-sub">{'// 관측점 사이의 빈 공간을 추정한다 — GIS 공간 보간'}</p>
                </header>

                <div className="ip-stage">
                    {/* 좌측: 보간 표면 */}
                    <section className="ip-left">
                        <div className="ip-canvas-wrap">
                            <canvas
                                ref={canvasRef}
                                width={CANVAS}
                                height={CANVAS}
                                className="ip-canvas"
                                onClick={onClick}
                                onMouseMove={onMove}
                                onMouseLeave={() => setHover(null)}
                            />
                            {hover && (
                                <div
                                    className="ip-cursor-read"
                                    style={{ left: `${hover.x * 100}%`, top: `${hover.y * 100}%` }}
                                >
                                    {(hover.v * 100).toFixed(0)}
                                </div>
                            )}
                        </div>
                        <div className="ip-canvas-foot">
                            <span>{'빈 곳을 클릭 → 관측점 추가 · 점을 클릭 → 삭제'}</span>
                            <span className="ip-legend">
                                <i className="ip-legend-bar" /> 낮음 → 높음
                            </span>
                        </div>
                    </section>

                    {/* 우측: 컨트롤 + 지표 */}
                    <aside className="ip-panel">
                        <div className="ip-control">
                            <span className="ip-control-label">보간 방법</span>
                            <div className="ip-seg">
                                <button
                                    type="button"
                                    className={'ip-seg-btn' + (method === 'idw' ? ' ip-seg-on' : '')}
                                    onClick={() => setMethod('idw')}
                                >
                                    IDW 역거리가중
                                </button>
                                <button
                                    type="button"
                                    className={'ip-seg-btn' + (method === 'nearest' ? ' ip-seg-on' : '')}
                                    onClick={() => setMethod('nearest')}
                                >
                                    최근접 이웃
                                </button>
                            </div>
                        </div>

                        <div className={'ip-control' + (method !== 'idw' ? ' ip-disabled' : '')}>
                            <label htmlFor="ip-power">거듭제곱 p <b>{power.toFixed(1)}</b></label>
                            <input
                                id="ip-power"
                                type="range"
                                min={0.5}
                                max={6}
                                step={0.5}
                                value={power}
                                disabled={method !== 'idw'}
                                onChange={(e) => setPower(Number(e.target.value))}
                            />
                            <span className="ip-hint">{"p가 클수록 가까운 점이 표면을 지배 → 황소눈(bull's-eye)"}</span>
                        </div>

                        <div className={'ip-control' + (method !== 'idw' ? ' ip-disabled' : '')}>
                            <label htmlFor="ip-nb">
                                이웃 수 k <b>{neighbors === 0 ? '전체' : neighbors}</b>
                            </label>
                            <input
                                id="ip-nb"
                                type="range"
                                min={0}
                                max={12}
                                step={1}
                                value={neighbors}
                                disabled={method !== 'idw'}
                                onChange={(e) => setNeighbors(Number(e.target.value))}
                            />
                            <span className="ip-hint">가까운 k개만 사용 (0=전체) — 멀리 있는 점의 영향 차단</span>
                        </div>

                        <div className="ip-control">
                            <label htmlFor="ip-brush">새 관측점 값 <b>{(brush * 100).toFixed(0)}</b></label>
                            <input
                                id="ip-brush"
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                value={brush}
                                onChange={(e) => setBrush(Number(e.target.value))}
                            />
                            <span className="ip-brush-swatch" style={{ background: `rgb(${ramp(brush).join(',')})` }} />
                        </div>

                        <div className="ip-toggles">
                            <button
                                type="button"
                                className={'ip-toggle' + (bands ? ' ip-toggle-on' : '')}
                                onClick={() => setBands((b) => !b)}
                            >
                                <span className="ip-toggle-dot" /> 등치 밴드
                            </button>
                            <button
                                type="button"
                                className={'ip-toggle' + (showPts ? ' ip-toggle-on' : '')}
                                onClick={() => setShowPts((s) => !s)}
                            >
                                <span className="ip-toggle-dot" /> 관측점 표시
                            </button>
                        </div>

                        <div className="ip-stat-row">
                            <div className="ip-stat">
                                <span className="ip-stat-num">{stats.n}</span>
                                <span className="ip-stat-label">관측점</span>
                            </div>
                            <div className="ip-stat">
                                <span className="ip-stat-num">
                                    {hover ? (hover.v * 100).toFixed(0) : '—'}
                                </span>
                                <span className="ip-stat-label">커서 추정값</span>
                            </div>
                        </div>

                        <div className="ip-actions">
                            <button type="button" className="ip-act" onClick={() => { setSeed((s) => s + 1); setPoints(randomTerrain(seed + 1)); }}>
                                ↻ 랜덤 지형
                            </button>
                            <button type="button" className="ip-act" onClick={() => setPoints(DEFAULT_POINTS)}>
                                기본값
                            </button>
                            <button type="button" className="ip-act" onClick={() => setPoints([])}>
                                전체 비우기
                            </button>
                        </div>
                    </aside>
                </div>

                <footer className="ip-foot">
                    <p>
                        {'온도계는 몇 곳에만 꽂혀 있는데 지도는 빈틈없이 색칠해야 한다. '}
                        <b>공간 보간</b>{'은 흩어진 관측점 사이의 빈 공간을, "가까운 곳은 서로 닮는다"는 '}
                        {'지리학 제1법칙에 기대 메우는 일이다. 표고·기온·강수·미세먼지 지도가 모두 이렇게 만들어진다.'}
                    </p>
                    <p>
                        <b>IDW</b>{'(역거리가중)는 가까운 관측점일수록 큰 가중치를 줘 평균낸다 — '}
                        {'거듭제곱 '}<b>p</b>{'를 키우면 가까운 점이 표면을 더 강하게 지배해 점 주변에 '}
                        <b>황소눈</b>{' 무늬가 도드라진다. '}<b>최근접 이웃</b>{'은 아예 가장 가까운 한 점의 값을 '}
                        {'그대로 복사해 '}<b>보로노이</b>{' 모자이크가 된다 — 부드러움은 없지만 거짓 중간값도 없다.'}
                    </p>
                    <p className="ip-disclaimer">
                        {'* 교육용 결정적 보간기입니다. 실제 GIS에서 통계적으로 최적인 크리깅(Kriging)은 '}
                        {'반베리오그램으로 공간 상관을 추정해 가중치를 정하지만, 여기서는 단순 결정론적 방법만 다룹니다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default Interpolate;
