import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/RubberBand.css';

// 게임 캔버스 / 타임라인 캔버스 논리 해상도 (CSS로 반응형 스케일)
const W = 720;
const H = 440;
const CW = 720;
const CH = 130;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;

const RubberBand = () => {
    const [ddaOn, setDdaOn] = useState(true); // 고무줄(동적 난이도) 작동 여부
    const [targetAcc, setTargetAcc] = useState(65); // 기계가 노리는 목표 승률(%)
    const [manualD, setManualD] = useState(40); // 수동 난이도(고무줄 OFF일 때)

    // 화면에 표시할 통계 (루프에서 주기적으로 동기화)
    const [stats, setStats] = useState({ d: 35, acc: 0, score: 0, streak: 0, best: 0, total: 0 });

    const gameRef = useRef(null);
    const chartRef = useRef(null);

    const targetsRef = useRef([]); // {x, y, r, born, ttl}
    const rollRef = useRef([]); // 최근 결과(hit/miss) 큐
    const accRef = useRef(0); // 최근 정확도(0~1)
    const dRef = useRef(0.35); // 숨은 난이도(0~1)
    const statRef = useRef({ hits: 0, total: 0, streak: 0, best: 0, score: 0 });
    const histRef = useRef([]); // 타임라인 표본 {d, acc}
    const lastSpawnRef = useRef(0);
    const lastHistRef = useRef(0);
    const burstRef = useRef([]); // 클릭 피드백 파편

    // 루프가 항상 최신 컨트롤 값을 읽도록 ref 미러링
    const paramsRef = useRef({});
    paramsRef.current = {
        ddaOn,
        targetAcc: targetAcc / 100,
        manualD: manualD / 100,
    };

    // 타깃 1개가 사라질 때(명중 or 만료) 호출 — 여기서 고무줄이 난이도를 당긴다
    const resolve = useCallback((hit) => {
        const roll = rollRef.current;
        roll.push(hit ? 1 : 0);
        if (roll.length > 14) roll.shift();
        const acc = roll.reduce((a, b) => a + b, 0) / roll.length;
        accRef.current = acc;

        const p = paramsRef.current;
        if (p.ddaOn) {
            // 목표 승률보다 잘 맞히면(+) 난이도를 올리고, 못 맞히면(-) 내린다
            const err = acc - p.targetAcc;
            dRef.current = clamp(dRef.current + err * 0.07, 0, 1);
        }

        const s = statRef.current;
        s.total += 1;
        if (hit) {
            s.hits += 1;
            s.streak += 1;
            if (s.streak > s.best) s.best = s.streak;
            s.score += Math.round(10 + dRef.current * 40);
        } else {
            s.streak = 0;
        }
    }, []);

    // 메인 루프 (마운트 시 1회)
    useEffect(() => {
        const gctx = gameRef.current.getContext('2d');
        const cctx = chartRef.current.getContext('2d');
        let raf;
        let frame = 0;

        const spawn = (now, D) => {
            const r = lerp(34, 15, D);
            targetsRef.current.push({
                x: lerp(r + 10, W - r - 10, Math.random()),
                y: lerp(r + 10, H - r - 10, Math.random()),
                r,
                born: now,
                ttl: lerp(1700, 640, D),
            });
        };

        const step = () => {
            const now = performance.now();
            const p = paramsRef.current;
            if (!p.ddaOn) dRef.current = p.manualD; // 고무줄 OFF → 슬라이더값 그대로
            const D = dRef.current;

            // 스폰
            const spawnGap = lerp(960, 380, D);
            if (now - lastSpawnRef.current > spawnGap && targetsRef.current.length < 6) {
                spawn(now, D);
                lastSpawnRef.current = now;
            }

            // 만료 처리(놓친 타깃 = miss)
            const alive = [];
            for (const t of targetsRef.current) {
                if (now - t.born >= t.ttl) resolve(false);
                else alive.push(t);
            }
            targetsRef.current = alive;

            // ── 게임 렌더 ──
            gctx.fillStyle = '#14161b';
            gctx.fillRect(0, 0, W, H);
            // 아케이드 그리드
            gctx.strokeStyle = 'rgba(198,241,53,0.06)';
            gctx.lineWidth = 1;
            for (let x = 0; x <= W; x += 36) {
                gctx.beginPath();
                gctx.moveTo(x, 0);
                gctx.lineTo(x, H);
                gctx.stroke();
            }
            for (let y = 0; y <= H; y += 36) {
                gctx.beginPath();
                gctx.moveTo(0, y);
                gctx.lineTo(W, y);
                gctx.stroke();
            }

            for (const t of targetsRef.current) {
                const life = 1 - (now - t.born) / t.ttl; // 1 → 0
                const urgent = life < 0.35;
                // 트랙(전체 히트박스)
                gctx.strokeStyle = 'rgba(232,230,223,0.18)';
                gctx.lineWidth = 2;
                gctx.beginPath();
                gctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
                gctx.stroke();
                // 수축하는 표적
                const rr = t.r * (0.45 + 0.55 * life);
                gctx.fillStyle = urgent ? '#ff5a5f' : '#c6f135';
                gctx.beginPath();
                gctx.arc(t.x, t.y, rr, 0, Math.PI * 2);
                gctx.fill();
                gctx.fillStyle = '#14161b';
                gctx.beginPath();
                gctx.arc(t.x, t.y, rr * 0.32, 0, Math.PI * 2);
                gctx.fill();
            }

            // 클릭 파편 피드백
            const bursts = [];
            for (const b of burstRef.current) {
                const age = (now - b.born) / 320;
                if (age >= 1) continue;
                gctx.strokeStyle = b.hit
                    ? `rgba(198,241,53,${1 - age})`
                    : `rgba(255,90,95,${1 - age})`;
                gctx.lineWidth = 3;
                gctx.beginPath();
                gctx.arc(b.x, b.y, 8 + age * 26, 0, Math.PI * 2);
                gctx.stroke();
                bursts.push(b);
            }
            burstRef.current = bursts;

            // ── 타임라인 표본 + 차트 ──
            if (now - lastHistRef.current > 250) {
                histRef.current.push({ d: D, acc: accRef.current });
                if (histRef.current.length > 150) histRef.current.shift();
                lastHistRef.current = now;
            }
            drawChart(cctx, p.targetAcc);

            // 통계 동기화(8프레임마다)
            frame += 1;
            if (frame % 8 === 0) {
                const s = statRef.current;
                setStats({
                    d: Math.round(D * 100),
                    acc: Math.round(accRef.current * 100),
                    score: s.score,
                    streak: s.streak,
                    best: s.best,
                    total: s.total,
                });
            }

            raf = requestAnimationFrame(step);
        };

        // 타임라인 차트: 숨은 난이도 vs 내 정확도 + 목표 승률대
        const drawChart = (ctx, tAcc) => {
            ctx.fillStyle = '#1c1f26';
            ctx.fillRect(0, 0, CW, CH);
            const pad = 6;
            const yOf = (v) => CH - pad - v * (CH - pad * 2);

            // 목표 승률대(±12%p)
            const band = 0.12;
            const yTop = yOf(clamp(tAcc + band, 0, 1));
            const yBot = yOf(clamp(tAcc - band, 0, 1));
            ctx.fillStyle = 'rgba(198,241,53,0.12)';
            ctx.fillRect(0, yTop, CW, yBot - yTop);
            ctx.strokeStyle = 'rgba(198,241,53,0.5)';
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, yOf(tAcc));
            ctx.lineTo(CW, yOf(tAcc));
            ctx.stroke();
            ctx.setLineDash([]);

            const hist = histRef.current;
            if (hist.length > 1) {
                const dx = CW / 149;
                // 난이도 라인(라임)
                ctx.strokeStyle = '#c6f135';
                ctx.lineWidth = 2;
                ctx.beginPath();
                hist.forEach((h, i) => {
                    const x = i * dx;
                    const y = yOf(h.d);
                    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                });
                ctx.stroke();
                // 정확도 라인(흰색)
                ctx.strokeStyle = '#e8e6df';
                ctx.lineWidth = 2;
                ctx.beginPath();
                hist.forEach((h, i) => {
                    const x = i * dx;
                    const y = yOf(h.acc);
                    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                });
                ctx.stroke();
            }
        };

        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [resolve]);

    // 캔버스 클릭 → 표적 명중 판정
    const onPoke = (e) => {
        const rect = gameRef.current.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        const px = ((cx - rect.left) / rect.width) * W;
        const py = ((cy - rect.top) / rect.height) * H;

        const targets = targetsRef.current;
        for (let i = 0; i < targets.length; i++) {
            const t = targets[i];
            if (Math.hypot(px - t.x, py - t.y) <= t.r) {
                targets.splice(i, 1);
                burstRef.current.push({ x: t.x, y: t.y, born: performance.now(), hit: true });
                resolve(true);
                return;
            }
        }
        // 빈 곳 클릭 — 점수에는 반영하지 않고 시각 피드백만
        burstRef.current.push({ x: px, y: py, born: performance.now(), hit: false });
    };

    const reset = () => {
        targetsRef.current = [];
        rollRef.current = [];
        histRef.current = [];
        accRef.current = 0;
        dRef.current = ddaOn ? 0.35 : manualD / 100;
        statRef.current = { hits: 0, total: 0, streak: 0, best: 0, score: 0 };
        burstRef.current = [];
    };

    let status;
    if (stats.total < 4) status = '워밍업';
    else if (Math.abs(stats.acc - targetAcc) <= 12) status = '몰입 구간 (flow)';
    else if (stats.acc > targetAcc) status = '너무 쉬움 — 곧 조여온다';
    else status = '너무 어려움 — 곧 풀어준다';

    return (
        <div className="rb-container">
            <div className="rb-inner">
                <Link to="/" className="rb-back">← 실험실로 돌아가기</Link>

                <header className="rb-header">
                    <h1 className="rb-title">RUBBER BAND</h1>
                    <p className="rb-sub">
                        {'// 게임은 당신이 이기길 바라지 않는다 — 보이지 않는 손이 난이도를 당긴다'}
                    </p>
                </header>

                <div className="rb-stage">
                    <div className="rb-left">
                        <div className="rb-canvas-wrap">
                            <canvas
                                ref={gameRef}
                                width={W}
                                height={H}
                                className="rb-canvas"
                                onMouseDown={onPoke}
                                onTouchStart={onPoke}
                            />
                            <p className="rb-hint">{'표적을 사라지기 전에 클릭(탭)하세요'}</p>
                        </div>

                        <div className="rb-chartbox">
                            <div className="rb-legend">
                                <span className="rb-key rb-key--d">숨은 난이도</span>
                                <span className="rb-key rb-key--a">내 정확도</span>
                                <span className="rb-key rb-key--band">목표 승률대</span>
                            </div>
                            <canvas ref={chartRef} width={CW} height={CH} className="rb-chart" />
                        </div>
                    </div>

                    <div className="rb-panel">
                        <div className="rb-readout">
                            <div className="rb-readbig">
                                <span className="rb-num">{stats.score}</span>
                                <span className="rb-lbl">SCORE</span>
                            </div>
                            <div className="rb-readgrid">
                                <div>
                                    <b>{stats.d}%</b>
                                    <span>난이도</span>
                                </div>
                                <div>
                                    <b>{stats.acc}%</b>
                                    <span>정확도</span>
                                </div>
                                <div>
                                    <b>{stats.streak}</b>
                                    <span>연속</span>
                                </div>
                                <div>
                                    <b>{stats.best}</b>
                                    <span>최고연속</span>
                                </div>
                            </div>
                            <div className="rb-status" data-flow={status.startsWith('몰입')}>
                                {status}
                            </div>
                        </div>

                        <button
                            type="button"
                            className={`rb-toggle ${ddaOn ? 'on' : ''}`}
                            onClick={() => setDdaOn((v) => !v)}
                        >
                            고무줄 난이도 {ddaOn ? 'ON' : 'OFF'}
                        </button>

                        <div className="rb-control">
                            <label htmlFor="rb-acc">
                                기계가 노리는 승률 <b>{targetAcc}%</b>
                            </label>
                            <input
                                id="rb-acc"
                                type="range"
                                min="40"
                                max="90"
                                value={targetAcc}
                                disabled={!ddaOn}
                                onChange={(e) => setTargetAcc(Number(e.target.value))}
                            />
                        </div>

                        <div className="rb-control">
                            <label htmlFor="rb-man">
                                수동 난이도 <b>{manualD}%</b>
                            </label>
                            <input
                                id="rb-man"
                                type="range"
                                min="0"
                                max="100"
                                value={manualD}
                                disabled={ddaOn}
                                onChange={(e) => setManualD(Number(e.target.value))}
                            />
                        </div>

                        <button type="button" className="rb-reset" onClick={reset}>
                            ↺ 초기화
                        </button>
                    </div>
                </div>

                <footer className="rb-foot">
                    <p>
                        {'고무줄을 켜면 게임은 당신의 최근 성적을 엿보며 '}
                        <b>난이도</b>
                        {'를 슬그머니 당겼다 놓는다. 너무 잘 맞히면 표적이 작아지고 빨라지고, '}
                        {'무너지기 시작하면 다시 느슨해진다. 목적은 당신을 이기게 하는 것도, 지게 하는 것도 아니라 '}
                        <b>아슬아슬한 승률</b>
                        {'에 영원히 붙잡아 두는 것 — 이른바 '}
                        <b>몰입 구간(flow channel)</b>
                        {'이다. 차트에서 흰 선(내 정확도)이 어떻게 목표 띠 안으로 끌려 들어가는지 보라. '}
                        {'고무줄을 꺼 보면 진짜 실력이 그대로 드러난다. 게임뿐 아니라 우리가 머무는 많은 화면이 '}
                        <b>동적 난이도 조절(DDA)</b>
                        {'이라는 같은 손길로 설계된다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default RubberBand;
