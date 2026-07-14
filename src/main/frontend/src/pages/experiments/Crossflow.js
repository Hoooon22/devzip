import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Crossflow.css';

// CROSSFLOW — 무신호 교차로 예약 통행 실험 (자율주행 협조 / AIM).
// 핵심: 교차로는 "한 번에 한 흐름만 지나갈 수 있는 공유 자원"이다.
//   신호등  → 시간을 통째로 나눠 준다. NS 초록인 동안 EW는 무조건 정지 —
//              그 축에 차가 없어도 초록은 흘러가 버린다(고정 위상의 낭비).
//   예약(AIM) → 차가 교차로에 들어오기 전, 자기가 점유할 "시공간 슬롯"을 미리 예약한다.
//              충돌축이 비는 틈이 보이면 그 즉시 슬며시 끼어든다 — 수요에 반응한다.
// 여기서는 교차로 중앙 박스를 하나의 자원으로 보고, 같은 축(평행/맞은편 직진)은 함께,
// 교차하는 축은 서로 배타적으로만 점유하도록 예약을 관리한다.

const W = 520;              // 캔버스 논리 크기(정사각)
const BOX0 = 230, BOX1 = 290; // 교차로 중앙 박스(충돌 구역)
const STOP = BOX0;          // 정지선 = 박스 근접 모서리
const CARLEN = 22, CARW = 13;
const GAP = 12;
const HEADWAY = CARLEN + GAP;
const V = 96;               // 차량 속도(px/s)
const OFF = W + CARLEN + 12; // 완전 이탈 거리

const G_GREEN = 4.2;        // 신호 초록 지속(초)
const G_RED = 1.1;          // 전 적색(clearance) 지속(초)
const RES_BUF = 0.22;       // 예약 안전 여유(초)

const DIRS = ['N', 'S', 'E', 'W'];
const axisOf = (d) => (d === 'N' || d === 'S') ? 'NS' : 'EW';
const opp = (a) => (a === 'NS' ? 'EW' : 'NS');
const ov = (a0, a1, b0, b1) => a0 < b1 && b0 < a1;

// (dir, 진행거리 u) → 차량 앞머리 화면좌표. 네 방향 모두 u=[BOX0,BOX1]에서 중앙 박스를 지난다.
function frontXY(dir, u) {
    switch (dir) {
        case 'N': return [275, u];        // 위→아래
        case 'S': return [245, W - u];    // 아래→위
        case 'W': return [u, 245];        // 왼→오
        default:  return [W - u, 275];    // E: 오→왼
    }
}

let CAR_SEQ = 0;

const Crossflow = () => {
    const canvasRef = useRef(null);
    const rafRef = useRef(0);
    const lastTsRef = useRef(0);

    // 시뮬 상태는 ref로 — 슬라이더 조작이 루프를 재시작시키지 않게.
    const carsRef = useRef([]);        // {id, dir, axis, u, granted, arriveStop, moving}
    const resRef = useRef([]);         // {axis, start, end}
    const spawnAccRef = useRef({ N: 0, S: 0, E: 0, W: 0 });
    const simTRef = useRef(0);
    const passedRef = useRef(0);
    const waitSamplesRef = useRef([]);
    const phaseTRef = useRef(0);       // 신호 위상 타이머
    const phaseRef = useRef('NS');     // 'NS' | 'RED1' | 'EW' | 'RED2'

    const rateRef = useRef(1.3);
    const modeRef = useRef('aim');     // 'aim' | 'signal'
    const unbalRef = useRef(false);
    const runningRef = useRef(true);
    const hudAccRef = useRef(0);

    const [rate, setRate] = useState(1.3);
    const [mode, setMode] = useState('aim');
    const [unbal, setUnbal] = useState(false);
    const [running, setRunning] = useState(true);
    const [hud, setHud] = useState({
        throughput: 0, avgWait: 0, queue: 0, passed: 0, t: 0, signalAxis: null,
    });

    // 신호 위상 축(초록인 축) — 신호 모드에서만 의미.
    const greenAxis = () => (phaseRef.current === 'NS' ? 'NS' : phaseRef.current === 'EW' ? 'EW' : null);

    const step = useCallback((dt) => {
        const t = simTRef.current + dt;
        simTRef.current = t;

        // 1) 신호 위상 진행(신호 모드)
        if (modeRef.current === 'signal') {
            phaseTRef.current += dt;
            const dur = (phaseRef.current === 'NS' || phaseRef.current === 'EW') ? G_GREEN : G_RED;
            if (phaseTRef.current >= dur) {
                phaseTRef.current = 0;
                const order = { NS: 'RED1', RED1: 'EW', EW: 'RED2', RED2: 'NS' };
                phaseRef.current = order[phaseRef.current];
            }
        }

        // 2) 유입(방향별 포아송 근사) — 균형 or NS 편중
        const wN = unbalRef.current ? 2.6 : 1, wE = unbalRef.current ? 0.4 : 1;
        const weights = { N: wN, S: wN, E: wE, W: wE };
        const sumW = wN * 2 + wE * 2;
        const cars = carsRef.current;
        DIRS.forEach((dir) => {
            const share = rateRef.current * weights[dir] / sumW; // cars/s
            if (Math.random() < share * dt) {
                // 스폰 지점에 여유가 있을 때만 — 없으면 유입이 막힌다(정체).
                let minU = Infinity;
                for (const c of cars) if (c.dir === dir && c.u < minU) minU = c.u;
                if (minU > HEADWAY) {
                    cars.push({ id: ++CAR_SEQ, dir, axis: axisOf(dir), u: -CARLEN, granted: false, arriveStop: null, moving: true });
                }
            }
        });

        // 3) 이동 — 차선별 앞차 간격 유지, 미허가 선두차는 정지선에서 정지
        const byDir = { N: [], S: [], E: [], W: [] };
        for (const c of cars) byDir[c.dir].push(c);
        DIRS.forEach((dir) => {
            const lane = byDir[dir].sort((a, b) => b.u - a.u); // 앞차 먼저
            let prevU = Infinity;
            for (const c of lane) {
                let target = c.u + V * dt;
                if (!c.granted) target = Math.min(target, STOP);
                target = Math.min(target, prevU - HEADWAY);
                c.moving = (target - c.u) > V * dt * 0.4;
                c.u = target;
                if (!c.granted && c.arriveStop == null && c.u >= STOP - 0.6) c.arriveStop = t;
                prevU = c.u;
            }
        });

        // 4) 예약 만료 정리
        const res = resRef.current.filter((r) => r.end > t);
        resRef.current = res;

        // 미허가 상태로 정지선에 선 선두차(차선당 최대 1대)만 예약을 요청한다.
        const conflictFree = (win, axis) => {
            for (const r of res) if (r.axis !== axis && ov(win[0], win[1], r.start, r.end)) return false;
            return true;
        };
        const windowOf = (c) => {
            const dt1 = Math.max(0, (BOX0 - c.u) / V);
            const dt2 = (BOX1 + CARLEN - c.u) / V;
            return [t + dt1 - 0.05, t + dt2 + RES_BUF];
        };

        const eligible = [];
        DIRS.forEach((dir) => {
            const lane = byDir[dir];
            let head = null;
            for (const c of lane) if (!c.granted && c.u >= STOP - 0.8) { if (!head || c.u > head.u) head = c; }
            if (head) eligible.push(head);
        });
        eligible.sort((a, b) => (a.arriveStop ?? t) - (b.arriveStop ?? t)); // 오래 기다린 순

        // 공정성(예약 모드): 가장 오래 기다린 선두차가 반대축 점유로 막혀 있으면
        // 그 반대축(현재 흐르는 축)에는 이번 프레임 허가를 멈춰 박스를 비운다 → 틈이 생긴다.
        let blockAxis = null;
        if (modeRef.current === 'aim' && eligible.length) {
            const top = eligible[0];
            if (!conflictFree(windowOf(top), top.axis)) blockAxis = opp(top.axis);
        }

        for (const c of eligible) {
            if (modeRef.current === 'signal') {
                if (greenAxis() !== c.axis) continue; // 초록 축만 진입
            } else if (blockAxis && c.axis === blockAxis) {
                continue;
            }
            const win = windowOf(c);
            if (!conflictFree(win, c.axis)) continue;
            c.granted = true;
            const w = c.arriveStop != null ? t - c.arriveStop : 0;
            waitSamplesRef.current.push(w);
            if (waitSamplesRef.current.length > 40) waitSamplesRef.current.shift();
            res.push({ axis: c.axis, start: win[0], end: win[1] });
        }

        // 5) 이탈 차량 제거 + 통과 집계
        const kept = [];
        for (const c of cars) {
            if (c.u - CARLEN > OFF) passedRef.current += 1;
            else kept.push(c);
        }
        carsRef.current = kept;

        // 6) HUD(0.1s 간격)
        hudAccRef.current += dt;
        if (hudAccRef.current >= 0.1) {
            hudAccRef.current = 0;
            const queue = kept.filter((c) => !c.granted && !c.moving).length;
            const ws = waitSamplesRef.current;
            const avgWait = ws.length ? ws.reduce((s, v) => s + v, 0) / ws.length : 0;
            const throughput = t > 0.5 ? (passedRef.current / t) * 60 : 0;
            setHud({
                throughput, avgWait, queue, passed: passedRef.current, t,
                signalAxis: modeRef.current === 'signal' ? greenAxis() : null,
            });
        }
    }, []);

    const render = useCallback(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, W, W);

        // 배경(60%): 어두운 아스팔트
        ctx.fillStyle = '#151820';
        ctx.fillRect(0, 0, W, W);

        // 도로(30%): 강철 회색 대역 + 차선 마킹
        const road = '#232833';
        ctx.fillStyle = road;
        ctx.fillRect(BOX0 - 30, 0, 90, W);     // 세로 도로(대략)
        ctx.fillRect(0, BOX0 - 30, W, 90);     // 가로 도로
        ctx.fillStyle = '#151820';
        ctx.fillRect(BOX0 - 30, BOX0 - 30, 90, 90); // 교차 구역은 살짝 어둡게 재도포
        ctx.fillStyle = road;
        ctx.fillRect(BOX0 - 30, BOX0 - 30, 90, 90);

        // 중앙 분리선(점선)
        ctx.strokeStyle = 'rgba(214,206,180,0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([9, 9]);
        ctx.beginPath();
        ctx.moveTo(260, 0); ctx.lineTo(260, BOX0 - 30);
        ctx.moveTo(260, BOX1 + 30); ctx.lineTo(260, W);
        ctx.moveTo(0, 260); ctx.lineTo(BOX0 - 30, 260);
        ctx.moveTo(BOX1 + 30, 260); ctx.lineTo(W, 260);
        ctx.stroke();
        ctx.setLineDash([]);

        // 정지선
        ctx.fillStyle = 'rgba(214,206,180,0.5)';
        ctx.fillRect(260, BOX0 - 3, 30, 3);       // N 접근(위쪽)
        ctx.fillRect(230, BOX1, 30, 3);           // S 접근(아래쪽)
        ctx.fillRect(BOX0 - 3, 260, 3, 30);       // W 접근(왼쪽)
        ctx.fillRect(BOX1, 230, 3, 30);           // E 접근(오른쪽)

        // 중앙 박스 — 현재 점유 축 색으로 발광(10% 강조)
        const NS_C = '#f0a53a', EW_C = '#3fb6c9';
        let holder = null;
        for (const c of carsRef.current) {
            if (c.granted && c.u > BOX0 && c.u - CARLEN < BOX1) { holder = c.axis; break; }
        }
        ctx.strokeStyle = holder ? (holder === 'NS' ? NS_C : EW_C) : 'rgba(214,206,180,0.28)';
        ctx.lineWidth = 2;
        ctx.strokeRect(BOX0 - 30, BOX0 - 30, 90, 90);
        if (holder) {
            ctx.fillStyle = holder === 'NS' ? 'rgba(240,165,58,0.10)' : 'rgba(63,182,201,0.10)';
            ctx.fillRect(BOX0 - 30, BOX0 - 30, 90, 90);
        }

        // 차량
        for (const c of carsRef.current) {
            const [fx, fy] = frontXY(c.dir, c.u);
            const [rx, ry] = frontXY(c.dir, c.u - CARLEN);
            const x = Math.min(fx, rx) - (c.axis === 'NS' ? CARW / 2 : 0);
            const y = Math.min(fy, ry) - (c.axis === 'EW' ? CARW / 2 : 0);
            const w = c.axis === 'NS' ? CARW : Math.abs(fx - rx);
            const h = c.axis === 'NS' ? Math.abs(fy - ry) : CARW;
            const base = c.axis === 'NS' ? NS_C : EW_C;
            ctx.fillStyle = c.granted ? base : (c.axis === 'NS' ? 'rgba(240,165,58,0.5)' : 'rgba(63,182,201,0.5)');
            ctx.fillRect(x, y, w, h);
            if (!c.granted && !c.moving) { // 정지 중 표시
                ctx.strokeStyle = '#e0503a';
                ctx.lineWidth = 1.4;
                ctx.strokeRect(x + 0.7, y + 0.7, w - 1.4, h - 1.4);
            }
        }

        // 신호등 표시(신호 모드) — 각 접근에 램프
        if (modeRef.current === 'signal') {
            const g = greenAxis();
            const lamp = (cx, cy, on) => {
                ctx.beginPath();
                ctx.arc(cx, cy, 5.5, 0, 7);
                ctx.fillStyle = on ? '#43c47a' : '#c0392b';
                ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke();
            };
            lamp(298, 214, g === 'NS'); // N측
            lamp(222, 306, g === 'NS'); // S측
            lamp(214, 222, g === 'EW'); // W측
            lamp(306, 298, g === 'EW'); // E측
        }
    }, []);

    // rAF 루프 — dt는 타임스탬프 차이로 계산(탭 비활성 시 큰 점프 방지 클램프).
    useEffect(() => {
        const loop = (ts) => {
            const last = lastTsRef.current || ts;
            let dt = (ts - last) / 1000;
            lastTsRef.current = ts;
            if (dt > 0.05) dt = 0.05;
            if (runningRef.current && dt > 0) step(dt);
            render();
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, [step, render]);

    useEffect(() => {
        const cv = canvasRef.current;
        cv.width = W; cv.height = W;
        render();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const reset = useCallback(() => {
        carsRef.current = [];
        resRef.current = [];
        spawnAccRef.current = { N: 0, S: 0, E: 0, W: 0 };
        simTRef.current = 0;
        passedRef.current = 0;
        waitSamplesRef.current = [];
        phaseTRef.current = 0;
        phaseRef.current = 'NS';
        hudAccRef.current = 0;
        setHud({ throughput: 0, avgWait: 0, queue: 0, passed: 0, t: 0, signalAxis: null });
    }, []);

    const changeRate = (v) => { rateRef.current = v; setRate(v); };
    const setModeTo = (m) => { modeRef.current = m; setMode(m); phaseRef.current = 'NS'; phaseTRef.current = 0; };
    const toggleUnbal = () => { const v = !unbal; unbalRef.current = v; setUnbal(v); };
    const toggleRun = () => { const v = !running; runningRef.current = v; setRunning(v); };

    const modeLabel = mode === 'aim' ? '예약(AIM)' : '신호등';

    return (
        <LabShell
            title="CROSSFLOW"
            eyebrow="autonomous intersection · reservation"
            subtitle={'// 교차로는 공유 자원 — 신호등은 위상을, 자율주행은 슬롯을 나눈다'}
            path="crossflow.exe"
        >
            <section className="k-win cf-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/junction/</span>manager</span>
                    <span className="meta k-mono">reserve(cell, [t0, t1]) → grant | deny</span>
                </div>

                <div className="cf-toolbar">
                    <div className="cf-modes">
                        <button type="button" className={`cf-seg ${mode === 'aim' ? 'is-on' : ''}`} onClick={() => setModeTo('aim')}>
                            예약 (AIM)
                        </button>
                        <button type="button" className={`cf-seg ${mode === 'signal' ? 'is-on' : ''}`} onClick={() => setModeTo('signal')}>
                            신호등
                        </button>
                    </div>

                    <div className="cf-ctrl">
                        <label className="cf-ctrl-label k-mono" htmlFor="cf-rate">유입량 <b>{rate.toFixed(1)} 대/s</b></label>
                        <input id="cf-rate" type="range" min="0.4" max="2.6" step="0.1"
                            value={rate} onChange={(e) => changeRate(Number(e.target.value))} />
                    </div>

                    <div className="cf-actions">
                        <button type="button" className={`cf-btn cf-btn-ghost ${unbal ? 'is-on' : ''}`} onClick={toggleUnbal}>
                            {unbal ? '⇅ 남북 편중 ON' : '⇅ 남북 편중'}
                        </button>
                        <button type="button" className="cf-btn cf-btn-ghost" onClick={toggleRun}>
                            {running ? '⏸ 정지' : '▶ 재생'}
                        </button>
                        <button type="button" className="cf-btn cf-btn-ghost" onClick={reset}>↻ 리셋</button>
                    </div>
                </div>

                <div className="cf-stage">
                    <div className="cf-screen-col">
                        <div className="cf-screen">
                            <canvas ref={canvasRef} className="cf-canvas" />
                            <span className={`cf-modechip k-mono ${mode === 'aim' ? 'is-aim' : 'is-sig'}`}>{modeLabel}</span>
                        </div>
                        <div className="cf-legend k-mono">
                            <span><i className="cf-key cf-key-ns" /> 남북(NS) 축</span>
                            <span><i className="cf-key cf-key-ew" /> 동서(EW) 축</span>
                            <span><i className="cf-key cf-key-stop" /> 정지 대기</span>
                        </div>
                    </div>

                    <div className="cf-right">
                        <div className="cf-stats">
                            <div className="cf-stat cf-stat-hero">
                                <span className="cf-stat-lab k-mono">처리량</span>
                                <span className="cf-stat-num k-mono">{Math.round(hud.throughput)}</span>
                                <span className="cf-stat-sub k-mono">대/분 (통과)</span>
                            </div>
                            <div className="cf-stat">
                                <span className="cf-stat-lab k-mono">평균 대기</span>
                                <span className="cf-stat-num k-mono">{hud.avgWait.toFixed(1)}</span>
                                <span className="cf-stat-sub k-mono">초</span>
                            </div>
                            <div className="cf-stat">
                                <span className="cf-stat-lab k-mono">정지 대기</span>
                                <span className="cf-stat-num k-mono">{hud.queue}</span>
                                <span className="cf-stat-sub k-mono">대</span>
                            </div>
                            <div className="cf-stat">
                                <span className="cf-stat-lab k-mono">누적 통과</span>
                                <span className="cf-stat-num k-mono">{hud.passed}</span>
                                <span className="cf-stat-sub k-mono">대 · {hud.t.toFixed(0)}s</span>
                            </div>
                        </div>

                        <div className={`cf-verdict cf-${mode}`}>
                            <p className="cf-verdict-txt">
                                {mode === 'aim'
                                    ? <>차들이 교차로 진입 전 <b>슬롯을 예약</b>합니다. 충돌축이 비는 틈마다 즉시 끼어들어, 유입량을 올려도 처리량이 잘 버팁니다. <b>남북 편중</b>을 켜 보면 한쪽으로 몰린 수요를 곧바로 따라갑니다.</>
                                    : <>고정 위상 신호등입니다. 초록 축에 차가 없어도 초록은 흘러가고, 빨간 축은 무조건 정지합니다. <b>남북 편중</b>을 켜면 텅 빈 동서 초록이 낭비되며 대기가 쌓입니다 — 같은 유입량에서 예약과 비교해 보세요.</>}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win cf-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="cf-foot">
                    <p>
                        {'교차로는 결국 '}<b>{'한 번에 한 흐름만 지나갈 수 있는 공유 자원'}</b>{'이다. '}
                        {'서로 가로지르는 차들이 같은 중앙 공간을 동시에 쓰면 충돌하니, 누가 언제 그 공간을 쓸지 '}
                        {'정하는 규칙이 필요하다. 그 규칙을 무엇으로 두느냐가 이 실험의 전부다.'}
                    </p>
                    <p>
                        {'신호등은 '}<b>{'시간을 통째로 잘라'}</b>{' 나눠 준다. 남북이 초록인 동안 동서는 무조건 정지다. '}
                        {'문제는 이 분할이 수요를 보지 않는다는 것 — 초록 축에 차가 한 대도 없어도 초록은 정해진 시간만큼 '}
                        {'흘러가고, 반대편 줄은 그동안 계속 쌓인다. 남북 편중을 켜면 텅 빈 동서 초록이 얼마나 낭비되는지가 드러난다.'}
                    </p>
                    <p>
                        {'자율주행 협조(AIM)는 발상을 뒤집는다. 차가 교차로에 '}<b>{'들어오기 전'}</b>{', 자기가 지나갈 '}
                        {'"시공간 슬롯"을 관리자에게 미리 예약한다. 예약이 겹치지 않으면 통과 허가가 떨어지고, 겹치면 정지선에서 '}
                        {'기다린다. 같은 축(평행·맞은편 직진)은 서로 막지 않으니 줄지어 함께 흐르고, 교차하는 축은 '}
                        <b>{'비는 틈이 생기는 즉시'}</b>{' 슬며시 끼어든다. 위상이라는 고정 낭비가 사라진다.'}
                    </p>
                    <p>
                        {'유입량을 올리며 두 방식의 '}<b>{'처리량(대/분)'}</b>{'과 '}<b>{'평균 대기'}</b>{'를 비교해 보라. '}
                        {'교통이 한산할 때 차이는 작지만, 수요가 한쪽으로 쏠리거나 혼잡해질수록 예약이 앞선다 — '}
                        {'"고정된 규칙" 대신 "수요에 반응하는 예약"이 자원을 더 촘촘히 쓰기 때문이다. '}
                        {'무한정 한쪽만 흐르지 않도록, 오래 기다린 쪽이 막혀 있으면 반대축 허가를 잠시 멈춰 틈을 내주는 공정성 규칙도 넣었다.'}
                    </p>
                    <p className="cf-disclaimer">
                        {'* 실제 Autonomous Intersection Management는 교차로를 더 잘게 나눈 격자 셀 단위로 예약하고, '}
                        {'좌·우회전과 감가속까지 다룬다. 이 데모는 직진만, 중앙 박스를 축 단위 자원 하나로 본 단순화 모델이다. 수치는 예시다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Crossflow;
