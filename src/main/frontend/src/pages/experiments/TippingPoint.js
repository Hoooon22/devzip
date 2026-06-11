import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/TippingPoint.css';

// 격자 한 변의 셀 개수
const N = 20;
const TOTAL = N * N;

// 셀 상태: 0 = 잠재(아직 모름), 1 = 확산중(퍼뜨리는 중), 2 = 식음(흥미 떨어짐)
const makeDormant = () =>
    Array.from({ length: TOTAL }, () => ({ s: 0, life: 0 }));

// 무작위로 씨앗 몇 개를 잠재 셀에 심는다
const sprinkle = (cells, count, duration) => {
    const next = cells.map((c) => ({ ...c }));
    const dormant = [];
    for (let i = 0; i < next.length; i++) {
        if (next[i].s === 0) dormant.push(i);
    }
    for (let k = 0; k < count && dormant.length > 0; k++) {
        const pick = Math.floor(Math.random() * dormant.length);
        const idx = dormant.splice(pick, 1)[0];
        next[idx] = { s: 1, life: duration };
    }
    return next;
};

const TippingPoint = () => {
    // 시뮬레이션 파라미터
    const [transmission, setTransmission] = useState(28); // 전염력(%)
    const [duration, setDuration] = useState(3); // 한 셀이 확산중으로 머무는 틱 수
    const [eightWay, setEightWay] = useState(true); // 이웃 범위(4/8방향)
    const [speed, setSpeed] = useState(180); // 틱 간격(ms)

    // 격자 상태(렌더용 state + 최신값 추적용 ref)
    const cellsRef = useRef(sprinkle(makeDormant(), 3, 3));
    const [cells, setCells] = useState(cellsRef.current);

    // 통계
    const [tick, setTick] = useState(0);
    const [peak, setPeak] = useState(3);
    const [history, setHistory] = useState([3]);
    const [playing, setPlaying] = useState(false);

    const writeCells = (next) => {
        cellsRef.current = next;
        setCells(next);
    };

    // 한 스텝 진행: 확산중 셀이 이웃을 감염시키고, 수명이 다하면 식는다
    const doStep = useCallback(() => {
        const prev = cellsRef.current;
        const next = prev.map((c) => ({ ...c }));
        const p = transmission / 100;

        for (let i = 0; i < TOTAL; i++) {
            if (prev[i].s !== 1) continue;
            const row = Math.floor(i / N);
            const col = i % N;

            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    if (!eightWay && dr !== 0 && dc !== 0) continue; // 4방향 모드
                    const nr = row + dr;
                    const nc = col + dc;
                    if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
                    const j = nr * N + nc;
                    if (prev[j].s === 0 && Math.random() < p) {
                        next[j] = { s: 1, life: duration };
                    }
                }
            }

            // 확산중 셀의 수명 차감
            const remaining = prev[i].life - 1;
            next[i] = remaining <= 0 ? { s: 2, life: 0 } : { s: 1, life: remaining };
        }

        writeCells(next);

        let active = 0;
        for (let i = 0; i < TOTAL; i++) if (next[i].s === 1) active++;
        setTick((t) => t + 1);
        setPeak((pk) => Math.max(pk, active));
        setHistory((h) => [...h.slice(-59), active]);
        if (active === 0) setPlaying(false); // 캐스케이드 종료 → 자동 정지
    }, [transmission, duration, eightWay]);

    // 재생 중이면 일정 간격으로 스텝 진행
    useEffect(() => {
        if (!playing) return undefined;
        const id = setInterval(doStep, speed);
        return () => clearInterval(id);
    }, [playing, speed, doStep]);

    // 셀 클릭: 직접 씨앗을 켜고 끈다
    const toggleCell = (i) => {
        const next = cellsRef.current.map((c) => ({ ...c }));
        next[i] = next[i].s === 1 ? { s: 0, life: 0 } : { s: 1, life: duration };
        writeCells(next);
    };

    const handleReset = () => {
        setPlaying(false);
        writeCells(makeDormant());
        setTick(0);
        setPeak(0);
        setHistory([0]);
    };

    const handleSprinkle = () => {
        const next = sprinkle(cellsRef.current, 4, duration);
        writeCells(next);
        let active = 0;
        for (let i = 0; i < TOTAL; i++) if (next[i].s === 1) active++;
        setPeak((pk) => Math.max(pk, active));
    };

    // 파생 통계
    let active = 0;
    let reached = 0;
    for (let i = 0; i < TOTAL; i++) {
        if (cells[i].s === 1) active++;
        if (cells[i].s !== 0) reached++;
    }
    const rate = Math.round((reached / TOTAL) * 100);
    const maxHist = Math.max(...history, 1);

    return (
        <div className="tp-container">
            <div className="tp-inner">
                <Link to="/" className="tp-back">← 실험실로 돌아가기</Link>

                <header className="tp-header">
                    <h1 className="tp-title">TIPPING&nbsp;POINT</h1>
                    <p className="tp-sub">
                        {'// 하나의 신호가 어떻게 모두의 입에 오르내리게 되는가 — 확산 메커니즘 실험실'}
                    </p>
                </header>

                <div className="tp-stage">
                    {/* 격자 */}
                    <div className="tp-grid-wrap">
                        <div
                            className="tp-grid"
                            style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}
                        >
                            {cells.map((c, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    aria-label={`cell-${i}`}
                                    className={
                                        'tp-cell ' +
                                        (c.s === 1 ? 'is-active' : c.s === 2 ? 'is-faded' : 'is-dormant')
                                    }
                                    onClick={() => toggleCell(i)}
                                />
                            ))}
                        </div>
                        <p className="tp-hint">{'격자를 클릭해 씨앗을 직접 심을 수 있어요'}</p>
                    </div>

                    {/* 사이드 패널 */}
                    <div className="tp-panel">
                        <div className="tp-stats">
                            <div className="tp-stat">
                                <span className="tp-stat-num">{tick}</span>
                                <span className="tp-stat-label">TICK</span>
                            </div>
                            <div className="tp-stat accent">
                                <span className="tp-stat-num">{active}</span>
                                <span className="tp-stat-label">확산중</span>
                            </div>
                            <div className="tp-stat">
                                <span className="tp-stat-num">{rate}%</span>
                                <span className="tp-stat-label">도달률</span>
                            </div>
                            <div className="tp-stat">
                                <span className="tp-stat-num">{peak}</span>
                                <span className="tp-stat-label">최대 동시</span>
                            </div>
                        </div>

                        {/* 확산 곡선 */}
                        <div className="tp-chart">
                            {history.map((v, i) => (
                                <span
                                    key={i}
                                    className="tp-bar"
                                    style={{ height: `${(v / maxHist) * 100}%` }}
                                />
                            ))}
                        </div>
                        <p className="tp-chart-label">{'동시 확산 셀 수 (시간 흐름)'}</p>

                        {/* 슬라이더 */}
                        <div className="tp-control">
                            <label htmlFor="tp-trans">
                                전염력 <b>{transmission}%</b>
                            </label>
                            <input
                                id="tp-trans"
                                type="range"
                                min="1"
                                max="100"
                                value={transmission}
                                onChange={(e) => setTransmission(Number(e.target.value))}
                            />
                        </div>
                        <div className="tp-control">
                            <label htmlFor="tp-dur">
                                지속력 <b>{duration} tick</b>
                            </label>
                            <input
                                id="tp-dur"
                                type="range"
                                min="1"
                                max="6"
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                            />
                        </div>
                        <div className="tp-control">
                            <label htmlFor="tp-speed">
                                속도 <b>{speed}ms</b>
                            </label>
                            <input
                                id="tp-speed"
                                type="range"
                                min="60"
                                max="400"
                                step="20"
                                value={speed}
                                onChange={(e) => setSpeed(Number(e.target.value))}
                            />
                        </div>

                        <button
                            type="button"
                            className={'tp-toggle ' + (eightWay ? 'on' : '')}
                            onClick={() => setEightWay((v) => !v)}
                        >
                            이웃 범위: {eightWay ? '8방향' : '4방향'}
                        </button>

                        {/* 액션 */}
                        <div className="tp-actions">
                            <button
                                type="button"
                                className="tp-btn primary"
                                onClick={() => setPlaying((v) => !v)}
                            >
                                {playing ? '⏸ 정지' : '▶ 재생'}
                            </button>
                            <button type="button" className="tp-btn" onClick={doStep}>
                                ⏭ 스텝
                            </button>
                            <button type="button" className="tp-btn" onClick={handleSprinkle}>
                                🎲 씨앗
                            </button>
                            <button type="button" className="tp-btn" onClick={handleReset}>
                                ↺ 초기화
                            </button>
                        </div>
                    </div>
                </div>

                <footer className="tp-foot">
                    <p>
                        {'전염력을 낮추면 불씨는 금세 꺼지지만, 어느 임계점을 넘는 순간 격자 전체로 번진다. '}
                        {'그 경계가 바로 '}
                        <b>티핑 포인트</b>
                        {'. 트렌드도, 소문도, 평판도 같은 곡선을 그린다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default TippingPoint;
