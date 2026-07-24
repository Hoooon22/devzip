import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Slime.css';

// 점균 배양판(캔버스)의 논리 해상도 = 화학물질(트레일) 격자 해상도
const GW = 600;
const GH = 380;
const CELLS = GW * GH;
const MAX_AGENTS = 5000;

// 슬라이더 프리셋: [감각거리, 감각각도, 회전각도, 개체수, 증발]
const PRESETS = {
    mesh: { senseDist: 9, senseAng: 30, turnAng: 32, count: 2400, evap: 6 },
    wander: { senseDist: 5, senseAng: 62, turnAng: 58, count: 1600, evap: 9 },
    artery: { senseDist: 18, senseAng: 22, turnAng: 18, count: 3200, evap: 4 },
};

const DEG = Math.PI / 180;

const Slime = () => {
    const [senseDist, setSenseDist] = useState(PRESETS.mesh.senseDist);
    const [senseAng, setSenseAng] = useState(PRESETS.mesh.senseAng);
    const [turnAng, setTurnAng] = useState(PRESETS.mesh.turnAng);
    const [count, setCount] = useState(PRESETS.mesh.count);
    const [evap, setEvap] = useState(PRESETS.mesh.evap);
    const [foodCount, setFoodCount] = useState(0);
    const [density, setDensity] = useState(0); // 배양판을 덮은 점균 비율(%)

    const canvasRef = useRef(null);
    // 화학물질 격자 (핑퐁 버퍼)
    const trailRef = useRef(new Float32Array(CELLS));
    const nextRef = useRef(new Float32Array(CELLS));
    // 개체(점균 입자): 위치 + 진행 방향
    const axRef = useRef(new Float32Array(MAX_AGENTS));
    const ayRef = useRef(new Float32Array(MAX_AGENTS));
    const ahRef = useRef(new Float32Array(MAX_AGENTS));
    const nRef = useRef(0); // 현재 활성 개체 수
    const foodRef = useRef([]); // 먹이(영양원) 좌표 [{x,y}]
    const imgRef = useRef(null);

    const paramsRef = useRef({});
    paramsRef.current = { senseDist, senseAng, turnAng, count, evap };

    // 개체를 배양판 전체에 무작위로 흩뿌린다 (요청 수만큼 늘리고 줄인다)
    const syncAgents = useCallback((target) => {
        const ax = axRef.current;
        const ay = ayRef.current;
        const ah = ahRef.current;
        let n = nRef.current;
        while (n < target && n < MAX_AGENTS) {
            ax[n] = Math.random() * GW;
            ay[n] = Math.random() * GH;
            ah[n] = Math.random() * Math.PI * 2;
            n++;
        }
        if (n > target) n = target;
        nRef.current = n;
    }, []);

    useEffect(() => {
        syncAgents(count);
    }, [count, syncAgents]);

    // 리셋: 화학물질을 지우고 개체를 다시 흩뿌린다
    const reset = useCallback(() => {
        trailRef.current.fill(0);
        nextRef.current.fill(0);
        nRef.current = 0;
        foodRef.current = [];
        setFoodCount(0);
        syncAgents(paramsRef.current.count);
    }, [syncAgents]);

    // 시뮬레이션 + 렌더 루프 (마운트 시 1회, 파라미터는 ref로 읽음)
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        imgRef.current = ctx.createImageData(GW, GH);
        const img = imgRef.current;
        const data = img.data;
        for (let i = 3; i < data.length; i += 4) data[i] = 255; // 알파 고정

        // 초기 먹이 2개 — 처음부터 연결할 목표가 보이도록
        foodRef.current = [
            { x: GW * 0.28, y: GH * 0.42 },
            { x: GW * 0.72, y: GH * 0.6 },
        ];
        setFoodCount(2);

        let raf;
        let frame = 0;
        const DEPOSIT = 5; // 개체가 지나가며 남기는 화학물질
        const FOOD_EMIT = 42; // 먹이가 매 프레임 뿜는 강한 유인물질
        const STEP = 1; // 한 프레임 이동 거리(px)

        // 화학물질 격자에서 (x,y) 지점의 값을 읽는다 (토러스 경계)
        const sample = (trail, x, y) => {
            let ix = x | 0;
            let iy = y | 0;
            if (ix < 0) ix += GW;
            else if (ix >= GW) ix -= GW;
            if (iy < 0) iy += GH;
            else if (iy >= GH) iy -= GH;
            return trail[iy * GW + ix];
        };

        const step = () => {
            const p = paramsRef.current;
            const trail = trailRef.current;
            const ax = axRef.current;
            const ay = ayRef.current;
            const ah = ahRef.current;
            const n = nRef.current;
            const sd = p.senseDist;
            const sa = p.senseAng * DEG;
            const ta = p.turnAng * DEG;

            // 먹이는 강한 유인물질을 계속 뿜는다
            const foods = foodRef.current;
            for (let f = 0; f < foods.length; f++) {
                const fx = foods[f].x | 0;
                const fy = foods[f].y | 0;
                for (let dy = -2; dy <= 2; dy++) {
                    const yy = fy + dy;
                    if (yy < 0 || yy >= GH) continue;
                    for (let dx = -2; dx <= 2; dx++) {
                        const xx = fx + dx;
                        if (xx < 0 || xx >= GW) continue;
                        trail[yy * GW + xx] += FOOD_EMIT;
                    }
                }
            }

            // 1) 감각 → 회전 → 이동 → 화학물질 침착
            for (let i = 0; i < n; i++) {
                const x = ax[i];
                const y = ay[i];
                const h = ah[i];
                // 앞·좌·우 세 지점의 화학물질 농도를 맡는다
                const fC = sample(trail, x + Math.cos(h) * sd, y + Math.sin(h) * sd);
                const fL = sample(trail, x + Math.cos(h - sa) * sd, y + Math.sin(h - sa) * sd);
                const fR = sample(trail, x + Math.cos(h + sa) * sd, y + Math.sin(h + sa) * sd);

                let nh = h;
                if (fC > fL && fC > fR) {
                    // 앞이 가장 진하면 직진
                } else if (fC < fL && fC < fR) {
                    // 앞이 가장 옅으면 좌/우 무작위로 튼다
                    nh += Math.random() < 0.5 ? ta : -ta;
                } else if (fL > fR) {
                    nh -= ta; // 왼쪽이 진하면 왼쪽으로
                } else if (fR > fL) {
                    nh += ta; // 오른쪽이 진하면 오른쪽으로
                }

                let nx = x + Math.cos(nh) * STEP;
                let ny = y + Math.sin(nh) * STEP;
                // 벽에 닿으면 감싸돈다(토러스)
                if (nx < 0) nx += GW;
                else if (nx >= GW) nx -= GW;
                if (ny < 0) ny += GH;
                else if (ny >= GH) ny -= GH;

                ax[i] = nx;
                ay[i] = ny;
                ah[i] = nh;
                trail[(ny | 0) * GW + (nx | 0)] += DEPOSIT;
            }

            // 2) 확산(3x3 평균) + 증발(감쇠)
            const next = nextRef.current;
            const decay = 1 - p.evap / 100; // 증발 슬라이더 1~15 → 0.99~0.85
            for (let yy = 1; yy < GH - 1; yy++) {
                const row = yy * GW;
                for (let xx = 1; xx < GW - 1; xx++) {
                    const idx = row + xx;
                    const s =
                        trail[idx - GW - 1] + trail[idx - GW] + trail[idx - GW + 1] +
                        trail[idx - 1] + trail[idx] + trail[idx + 1] +
                        trail[idx + GW - 1] + trail[idx + GW] + trail[idx + GW + 1];
                    next[idx] = (s * 0.1111111) * decay;
                }
            }
            // 버퍼 교체
            trailRef.current = next;
            nextRef.current = trail;

            // 3) 렌더 — 화학물질 농도를 점균 노랑으로 매핑
            const cur = trailRef.current;
            const dArr = imgRef.current.data;
            for (let i = 0; i < CELLS; i++) {
                let v = cur[i] * 0.09;
                if (v > 1) v = 1;
                const p4 = i << 2;
                // 어두운 배양판 → 호박색 → 밝은 점균 노랑
                dArr[p4] = 18 + v * 237;
                dArr[p4 + 1] = 14 + v * 211;
                dArr[p4 + 2] = 10 + v * 44;
            }
            ctx.putImageData(imgRef.current, 0, 0);

            // 먹이(영양원) 표시 — 노란 점균 위에서 튀는 주황빨강
            for (let f = 0; f < foods.length; f++) {
                ctx.beginPath();
                ctx.arc(foods[f].x, foods[f].y, 6, 0, Math.PI * 2);
                ctx.fillStyle = '#ff5a1f';
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#1a1206';
                ctx.stroke();
            }

            // 배양판을 덮은 점균 비율 — 30프레임마다 갱신
            frame++;
            if (frame % 30 === 0) {
                let covered = 0;
                for (let i = 0; i < CELLS; i += 7) {
                    if (cur[i] > 1) covered++;
                }
                setDensity(Math.round((covered / (CELLS / 7)) * 100));
            }

            raf = requestAnimationFrame(step);
        };

        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, []);

    // 캔버스 클릭 → 그 자리에 먹이를 놓고 점균 입자를 뿌려 넣는다
    const dropFood = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        const x = ((cx - rect.left) / rect.width) * GW;
        const y = ((cy - rect.top) / rect.height) * GH;
        foodRef.current.push({ x, y });
        setFoodCount(foodRef.current.length);

        // 먹이 주변에 개체를 조금 보태 근처에서 망이 자라나게 한다
        const ax = axRef.current;
        const ay = ayRef.current;
        const ah = ahRef.current;
        let nn = nRef.current;
        for (let k = 0; k < 120 && nn < MAX_AGENTS; k++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * 18;
            ax[nn] = x + Math.cos(a) * r;
            ay[nn] = y + Math.sin(a) * r;
            ah[nn] = Math.random() * Math.PI * 2;
            nn++;
        }
        nRef.current = nn;
    };

    const applyPreset = (key) => {
        const pr = PRESETS[key];
        setSenseDist(pr.senseDist);
        setSenseAng(pr.senseAng);
        setTurnAng(pr.turnAng);
        setCount(pr.count);
        setEvap(pr.evap);
    };

    const densityLabel =
        density >= 55 ? '과증식 · 배양판 포화' :
        density >= 25 ? '수송망 형성' :
        density >= 8 ? '탐색 확장 중' : '희박 · 흩어짐';

    const controls = [
        { id: 'sd', label: '감각 거리', value: senseDist, set: setSenseDist, min: 3, max: 28, unit: 'px' },
        { id: 'sa', label: '감각 각도', value: senseAng, set: setSenseAng, min: 8, max: 80, unit: '°' },
        { id: 'ta', label: '회전 각도', value: turnAng, set: setTurnAng, min: 8, max: 80, unit: '°' },
        { id: 'cnt', label: '개체 수', value: count, set: setCount, min: 400, max: MAX_AGENTS, unit: '' },
        { id: 'ev', label: '증발', value: evap, set: setEvap, min: 1, max: 15, unit: '' },
    ];

    return (
        <div className="slm-container">
            <div className="slm-inner">
                <Link to="/" className="slm-back">← 실험실로 돌아가기</Link>

                <header className="slm-header">
                    <h1 className="slm-title">SLIME</h1>
                    <p className="slm-sub">
                        {'// 뇌도 지도도 없는 점균이, 남긴 흔적만 따라 최적의 길을 스스로 그린다'}
                    </p>
                </header>

                <div className="slm-stage">
                    <div className="slm-canvas-wrap">
                        <canvas
                            ref={canvasRef}
                            width={GW}
                            height={GH}
                            className="slm-canvas"
                            onClick={dropFood}
                            onTouchStart={dropFood}
                        />
                        <p className="slm-hint">{'배양판을 누르면 그 자리에 먹이(영양원)가 놓이고, 점균이 그곳으로 길을 낸다'}</p>
                    </div>

                    <div className="slm-panel">
                        <div className="slm-readout">
                            <span className="slm-readout-num">{density}%</span>
                            <span className="slm-readout-label">점균 밀도 · {densityLabel}</span>
                            <div className="slm-readout-bar">
                                <span style={{ width: `${density}%` }} />
                            </div>
                            <span className="slm-readout-food">먹이 {foodCount}개</span>
                        </div>

                        <div className="slm-presets">
                            <button type="button" className="slm-preset" onClick={() => applyPreset('mesh')}>그물망</button>
                            <button type="button" className="slm-preset" onClick={() => applyPreset('wander')}>방랑</button>
                            <button type="button" className="slm-preset" onClick={() => applyPreset('artery')}>동맥</button>
                        </div>

                        {controls.map((c) => (
                            <div className="slm-control" key={c.id}>
                                <label htmlFor={`slm-${c.id}`}>
                                    {c.label} <b>{c.value}{c.unit}</b>
                                </label>
                                <input
                                    id={`slm-${c.id}`}
                                    type="range"
                                    min={c.min}
                                    max={c.max}
                                    value={c.value}
                                    onChange={(e) => c.set(Number(e.target.value))}
                                />
                            </div>
                        ))}

                        <button type="button" className="slm-reset" onClick={reset}>배양판 초기화</button>
                    </div>
                </div>

                <footer className="slm-foot">
                    <p>
                        {'점균('}<b>Physarum</b>{')은 단 하나의 세포로 이루어진 원생생물이라 뇌도 신경도 없다. '}
                        {'그런데도 각 조각은 '}<b>지나간 자리에 화학물질을 남기고</b>{', 앞·좌·우의 냄새 중 '}
                        {'가장 진한 쪽으로 방향을 틀 뿐인 단순한 규칙만 따른다. '}
                        {'흔적은 시간이 지나면 증발하므로, 자주 쓰는 길만 살아남고 나머지는 지워진다. '}
                        {'이렇게 개체가 환경에 남긴 흔적이 다른 개체의 행동을 이끄는 간접 협력을 '}
                        <b>스티그머지(stigmergy)</b>{'라 한다. 중앙 설계자 없이, 먹이 사이를 잇는 '}
                        {'효율적인 수송망이 저절로 떠오른다 — 실제 점균이 도쿄 철도망과 닮은 네트워크를 그려낸 그 원리다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default Slime;
