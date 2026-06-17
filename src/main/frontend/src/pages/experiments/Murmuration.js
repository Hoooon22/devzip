import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Murmuration.css';

// 캔버스 논리 해상도 (CSS로 반응형 스케일됨)
const W = 720;
const H = 480;

// 슬라이더 프리셋: [분리, 정렬, 응집, 시야, 개체수, 속도]
const PRESETS = {
    flock: { sep: 55, ali: 60, coh: 45, view: 60, count: 140, speed: 55 },
    murmur: { sep: 35, ali: 90, coh: 75, view: 80, count: 220, speed: 45 },
    chaos: { sep: 90, ali: 15, coh: 10, view: 40, count: 160, speed: 80 },
};

const Murmuration = () => {
    const [sep, setSep] = useState(PRESETS.flock.sep); // 분리
    const [ali, setAli] = useState(PRESETS.flock.ali); // 정렬
    const [coh, setCoh] = useState(PRESETS.flock.coh); // 응집
    const [view, setView] = useState(PRESETS.flock.view); // 시야 반경
    const [count, setCount] = useState(PRESETS.flock.count); // 개체 수
    const [speed, setSpeed] = useState(PRESETS.flock.speed); // 속도
    const [order, setOrder] = useState(0); // 정렬도(질서 매개변수 φ)

    const canvasRef = useRef(null);
    const boidsRef = useRef([]);
    const pointerRef = useRef({ active: false, x: 0, y: 0 });
    // 애니메이션 루프가 항상 최신 파라미터를 읽도록 ref에 미러링
    const paramsRef = useRef({});
    paramsRef.current = { sep, ali, coh, view, count, speed };

    // 개체 수에 맞춰 보이드 배열을 늘리거나 줄인다
    const syncBoids = useCallback((target) => {
        const arr = boidsRef.current;
        while (arr.length < target) {
            arr.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
            });
        }
        if (arr.length > target) arr.length = target;
    }, []);

    useEffect(() => {
        syncBoids(count);
    }, [count, syncBoids]);

    // 시뮬레이션 + 렌더 루프 (마운트 시 1회, 파라미터는 ref로 읽음)
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let raf;
        let frame = 0;

        const step = () => {
            const p = paramsRef.current;
            const boids = boidsRef.current;
            const R = 18 + (p.view / 100) * 70; // 시야 반경(px)
            const R2 = R * R;
            const sepR = R * 0.45;
            const sepR2 = sepR * sepR;
            const wSep = (p.sep / 50) * 0.06;
            const wAli = (p.ali / 50) * 0.05;
            const wCoh = (p.coh / 50) * 0.0009;
            const maxV = 1.4 + (p.speed / 100) * 4.2;
            const minV = maxV * 0.45;
            const ptr = pointerRef.current;

            let sumDx = 0;
            let sumDy = 0;

            for (let i = 0; i < boids.length; i++) {
                const b = boids[i];
                let cx = 0;
                let cy = 0; // 응집: 이웃 중심
                let avx = 0;
                let avy = 0; // 정렬: 이웃 평균 속도
                let spx = 0;
                let spy = 0; // 분리: 너무 가까운 이웃에서 밀려남
                let n = 0;

                for (let j = 0; j < boids.length; j++) {
                    if (i === j) continue;
                    const o = boids[j];
                    const dx = o.x - b.x;
                    const dy = o.y - b.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 > R2) continue;
                    n++;
                    cx += o.x;
                    cy += o.y;
                    avx += o.vx;
                    avy += o.vy;
                    if (d2 < sepR2 && d2 > 0) {
                        spx -= dx / d2;
                        spy -= dy / d2;
                    }
                }

                if (n > 0) {
                    b.vx += (cx / n - b.x) * wCoh;
                    b.vy += (cy / n - b.y) * wCoh;
                    b.vx += (avx / n - b.vx) * wAli;
                    b.vy += (avy / n - b.vy) * wAli;
                    b.vx += spx * wSep;
                    b.vy += spy * wSep;
                }

                // 포식자(커서) 회피 — 단순 규칙에서 군무가 갈라지는 순간
                if (ptr.active) {
                    const dx = b.x - ptr.x;
                    const dy = b.y - ptr.y;
                    const d2 = dx * dx + dy * dy;
                    const fleeR = 90;
                    if (d2 < fleeR * fleeR && d2 > 0) {
                        const d = Math.sqrt(d2);
                        const f = (1 - d / fleeR) * 0.9;
                        b.vx += (dx / d) * f;
                        b.vy += (dy / d) * f;
                    }
                }

                // 속도 제한 (최소·최대)
                const sp = Math.hypot(b.vx, b.vy) || 0.0001;
                if (sp > maxV) {
                    b.vx = (b.vx / sp) * maxV;
                    b.vy = (b.vy / sp) * maxV;
                } else if (sp < minV) {
                    b.vx = (b.vx / sp) * minV;
                    b.vy = (b.vy / sp) * minV;
                }

                b.x += b.vx;
                b.y += b.vy;

                // 가장자리 순환(토러스)
                if (b.x < 0) b.x += W;
                else if (b.x >= W) b.x -= W;
                if (b.y < 0) b.y += H;
                else if (b.y >= H) b.y -= H;

                const s2 = Math.hypot(b.vx, b.vy) || 1;
                sumDx += b.vx / s2;
                sumDy += b.vy / s2;
            }

            // 렌더
            ctx.fillStyle = '#10141a';
            ctx.fillRect(0, 0, W, H);

            for (let i = 0; i < boids.length; i++) {
                const b = boids[i];
                const ang = Math.atan2(b.vy, b.vx);
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(ang);
                ctx.fillStyle = '#f0a500';
                ctx.beginPath();
                ctx.moveTo(6, 0);
                ctx.lineTo(-4, 3);
                ctx.lineTo(-4, -3);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // 포식자 표시
            if (ptr.active) {
                ctx.strokeStyle = '#ff3b30';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(ptr.x, ptr.y, 14, 0, Math.PI * 2);
                ctx.stroke();
            }

            // 정렬도(질서 매개변수) — 10프레임마다 갱신
            frame++;
            if (frame % 10 === 0) {
                const phi = boids.length
                    ? Math.hypot(sumDx, sumDy) / boids.length
                    : 0;
                setOrder(Math.round(phi * 100));
            }

            raf = requestAnimationFrame(step);
        };

        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, []);

    // 포인터(포식자) 좌표를 캔버스 논리 좌표로 변환
    const updatePointer = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        pointerRef.current = {
            active: true,
            x: ((cx - rect.left) / rect.width) * W,
            y: ((cy - rect.top) / rect.height) * H,
        };
    };

    const clearPointer = () => {
        pointerRef.current = { active: false, x: 0, y: 0 };
    };

    const applyPreset = (key) => {
        const pr = PRESETS[key];
        setSep(pr.sep);
        setAli(pr.ali);
        setCoh(pr.coh);
        setView(pr.view);
        setCount(pr.count);
        setSpeed(pr.speed);
    };

    const orderLabel =
        order >= 80 ? '완벽한 군무' : order >= 50 ? '느슨한 무리' : order >= 25 ? '흩어짐' : '혼돈';

    const controls = [
        { id: 'sep', label: '분리', value: sep, set: setSep, min: 0, max: 100 },
        { id: 'ali', label: '정렬', value: ali, set: setAli, min: 0, max: 100 },
        { id: 'coh', label: '응집', value: coh, set: setCoh, min: 0, max: 100 },
        { id: 'view', label: '시야', value: view, set: setView, min: 10, max: 100 },
        { id: 'count', label: '개체 수', value: count, set: setCount, min: 20, max: 300 },
        { id: 'speed', label: '속도', value: speed, set: setSpeed, min: 10, max: 100 },
    ];

    return (
        <div className="mm-container">
            <div className="mm-inner">
                <Link to="/" className="mm-back">← 실험실로 돌아가기</Link>

                <header className="mm-header">
                    <h1 className="mm-title">MURMURATION</h1>
                    <p className="mm-sub">
                        {'// 우두머리도 설계도도 없다 — 세 줄의 규칙에서 피어나는 군집 지능'}
                    </p>
                </header>

                <div className="mm-stage">
                    <div className="mm-canvas-wrap">
                        <canvas
                            ref={canvasRef}
                            width={W}
                            height={H}
                            className="mm-canvas"
                            onMouseMove={updatePointer}
                            onMouseLeave={clearPointer}
                            onTouchStart={updatePointer}
                            onTouchMove={updatePointer}
                            onTouchEnd={clearPointer}
                        />
                        <p className="mm-hint">{'캔버스 위에 커서를 올리면 포식자가 되어 무리를 흩뜨립니다'}</p>
                    </div>

                    <div className="mm-panel">
                        <div className="mm-order">
                            <span className="mm-order-num">{order}%</span>
                            <span className="mm-order-label">정렬도 · {orderLabel}</span>
                            <div className="mm-order-bar">
                                <span style={{ width: `${order}%` }} />
                            </div>
                        </div>

                        <div className="mm-presets">
                            <button type="button" className="mm-preset" onClick={() => applyPreset('flock')}>새떼</button>
                            <button type="button" className="mm-preset" onClick={() => applyPreset('murmur')}>군무</button>
                            <button type="button" className="mm-preset" onClick={() => applyPreset('chaos')}>혼돈</button>
                        </div>

                        {controls.map((c) => (
                            <div className="mm-control" key={c.id}>
                                <label htmlFor={`mm-${c.id}`}>
                                    {c.label} <b>{c.value}</b>
                                </label>
                                <input
                                    id={`mm-${c.id}`}
                                    type="range"
                                    min={c.min}
                                    max={c.max}
                                    value={c.value}
                                    onChange={(e) => c.set(Number(e.target.value))}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <footer className="mm-foot">
                    <p>
                        {'각 개체는 오직 가까운 이웃만 본다 — '}
                        <b>분리</b>{'(부딪히지 않기) · '}
                        <b>정렬</b>{'(같은 방향으로) · '}
                        <b>응집</b>{'(무리에 머물기). '}
                        {'중앙의 지휘자는 없는데도 하늘을 뒤덮는 군무가 태어난다. '}
                        {'이렇게 단순한 국소 규칙에서 전체의 질서가 솟아나는 현상을 '}
                        <b>창발(emergence)</b>{'이라 부른다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default Murmuration;
