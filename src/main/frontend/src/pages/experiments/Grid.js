import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Grid.css';

// GRID — 실시간 수급 균형 실험 (계통 주파수).
// 핵심: 전기는 대규모로 저장되지 않는다. 그래서 발전(공급)은 소비(수요)와 매 순간 정확히 맞아야 한다.
// 발전기들의 회전 관성이 만든 60Hz가 계통 전체의 "심장 박동"이다.
//   수요 > 공급  →  회전자가 운동에너지를 내주며 느려진다  →  주파수가 떨어진다
//   공급 > 수요  →  회전자가 빨라진다                        →  주파수가 올라간다
//   df/dt = (공급 − 수요 − D·Δf) / (2·H·S) · f0   (스윙 방정식 단순형)
// 관성 H가 클수록 주파수는 천천히 움직이고(둔하지만 안정), 작을수록 급하게 요동친다.
// 주파수가 보호 계전기 대역(±0.8Hz)을 벗어나면 발전기가 탈락하며 광역 정전이 번진다.

const DT = 0.05;            // 시뮬레이션 시간 간격(초)
const F0 = 60;              // 정격 주파수(Hz)
const SBASE = 120;          // 기준 용량(GW) — 스윙 방정식 분모
const D = 60;               // 부하 감쇠 + 1차 조속 응답(GW/Hz)
const CAP = 175;            // 발전 최대 용량(GW)
const RAMP = 6;             // 발전기 출력 변화율(GW/s) — 즉시 못 올린다
const RESERVE_BOOST = 14;   // 예비력(배터리) 순간 출력(GW)
const RESERVE_DUR = 6;      // 예비력 지속(초)
const RESERVE_CD = 10;      // 예비력 재충전(초)
const SHED_CUT = 22;        // 부하 차단(데이터센터) 감축량(GW)
const SHED_DUR = 8;         // 부하 차단 지속(초)
const SHED_USES = 3;        // 부하 차단 가능 횟수(비상 카드)
const HEAT_MAX = 46;        // 폭염 냉방 부하 최대 증가(GW) → 피크는 기록치(≈166GW)에 근접
const HEAT_RAMP = 3.2;      // 폭염 부하 상승률(GW/s)
const TRIP_DEFICIT = 25;    // 발전기 탈락 시 순간 공급 손실(GW)
const N = 260;              // 스트립 차트 표본 수(≈13초)

const Y_MIN = 78;
const Y_MAX = 182;

// 주파수 대역 판정 — 정격(green)/주의(amber)/정전(trip)
const F_GREEN = 0.1;   // 59.9 ~ 60.1
const F_WARN = 0.5;    // 59.5 ~ 60.5
const F_TRIP = 0.8;    // 59.2 / 60.8 이탈 → 정전

function bandOf(freq) {
    const d = Math.abs(freq - F0);
    if (d <= F_GREEN) return 'ok';
    if (d <= F_WARN) return 'warn';
    return 'trip';
}

// 극좌표 → 데카르트 (게이지 호 그리기용)
function polar(cx, cy, r, deg) {
    const a = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
// 주파수(59~61) → 게이지 각도(-120° ~ +120°)
const FG_MIN = 59, FG_MAX = 61, SWEEP = 240;
function freqToAngle(f) {
    const t = Math.max(0, Math.min(1, (f - FG_MIN) / (FG_MAX - FG_MIN)));
    return -120 + t * SWEEP;
}
function arcPath(cx, cy, r, f1, f2) {
    const a1 = freqToAngle(f1);
    const a2 = freqToAngle(f2);
    const [x1, y1] = polar(cx, cy, r, a1);
    const [x2, y2] = polar(cx, cy, r, a2);
    const large = a2 - a1 > 180 ? 1 : 0;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

const Grid = () => {
    const canvasRef = useRef(null);

    // 시뮬레이션 상태 — 루프에서 ref로 읽고 써서 슬라이더 조작이 루프를 재시작시키지 않게 한다.
    const freqRef = useRef(F0);
    const supplyRef = useRef(118);   // 실제 발전 출력(GW)
    const targetRef = useRef(118);   // 발전 지령(슬라이더)
    const noiseRef = useRef(0);      // 수요 잡음(랜덤워크)
    const heatRef = useRef(0);       // 폭염 냉방 부하(GW)
    const heatOnRef = useRef(false);
    const reserveRef = useRef(0);    // 예비력 남은 지속(초)
    const reserveCdRef = useRef(0);  // 예비력 재충전 남은(초)
    const shedRef = useRef(0);       // 부하 차단 남은 지속(초)
    const shedUsesRef = useRef(SHED_USES);
    const tripRef = useRef(0);       // 발전기 탈락으로 잃은 공급(GW, 서서히 회복)
    const nextTripRef = useRef(6);   // 다음 무작위 탈락까지 남은(초)
    const hRef = useRef(4);          // 계통 관성 H
    const autoRef = useRef(false);   // 자동 수급(AGC)
    const histRef = useRef([]);      // {s, d} 링버퍼
    const tRef = useRef(0);          // 경과 시간(초)
    const greenRef = useRef(0);      // 정격 유지 누적 시간(초)
    const aliveRef = useRef(true);

    const [target, setTarget] = useState(118);
    const [hInertia, setHInertia] = useState(4);
    const [running, setRunning] = useState(true);
    const [auto, setAuto] = useState(false);
    const [heatOn, setHeatOn] = useState(false);
    const [hud, setHud] = useState({
        freq: F0, supply: 118, demand: 118, rocof: 0, band: 'ok',
        t: 0, green: 0, reserveReady: true, shedUses: SHED_USES, alive: true,
    });

    const baseDemand = (t) => 118 + 3 * Math.sin(t * 0.15);

    const step = useCallback(() => {
        if (!aliveRef.current) return;
        const t = tRef.current + DT;
        tRef.current = t;

        // 1) 폭염 냉방 부하 — 켜지면 서서히 오르고, 꺼지면 서서히 식는다.
        if (heatOnRef.current) heatRef.current = Math.min(HEAT_MAX, heatRef.current + HEAT_RAMP * DT);
        else heatRef.current = Math.max(0, heatRef.current - HEAT_RAMP * 0.6 * DT);

        // 2) 수요 잡음 — 부드러운 랜덤워크
        noiseRef.current += (Math.random() - 0.5) * 0.7;
        noiseRef.current *= 0.96;
        if (noiseRef.current > 3) noiseRef.current = 3;
        if (noiseRef.current < -3) noiseRef.current = -3;

        const shedActive = shedRef.current > 0;
        const demand = baseDemand(t) + heatRef.current + noiseRef.current - (shedActive ? SHED_CUT : 0);

        // 3) 자동 수급(AGC) — 지령을 수요+주파수 오차 보정으로 끌고 간다(2차 제어).
        if (autoRef.current) {
            const want = demand + (F0 - freqRef.current) * 8;
            targetRef.current = Math.max(80, Math.min(CAP, want));
            setTarget(Math.round(targetRef.current));
        }

        // 4) 발전 출력은 지령을 향해 정해진 변화율로만 따라간다 — 즉시 점프 불가.
        const maxStep = RAMP * DT;
        const gap = targetRef.current - supplyRef.current;
        supplyRef.current += Math.max(-maxStep, Math.min(maxStep, gap));

        // 발전기 탈락 손실은 서서히 회복(예비 발전기가 램프업).
        tripRef.current = Math.max(0, tripRef.current - RAMP * DT);

        const reserveActive = reserveRef.current > 0;
        const effSupply = supplyRef.current + (reserveActive ? RESERVE_BOOST : 0) - tripRef.current;

        // 5) 스윙 방정식(단순형) — 순전력 불균형이 주파수를 움직인다.
        const net = effSupply - demand - D * (freqRef.current - F0);
        const rocof = net / (2 * hRef.current * SBASE) * F0; // Hz/s
        let freq = freqRef.current + rocof * DT;
        if (freq < 57) freq = 57;
        if (freq > 63) freq = 63;
        freqRef.current = freq;

        // 6) 타이머 감소
        if (reserveRef.current > 0) {
            reserveRef.current -= DT;
            if (reserveRef.current <= 0) reserveCdRef.current = RESERVE_CD;
        } else if (reserveCdRef.current > 0) {
            reserveCdRef.current = Math.max(0, reserveCdRef.current - DT);
        }
        if (shedRef.current > 0) shedRef.current -= DT;

        // 7) 무작위 발전기 탈락 — 폭염 중 계통이 쪼일 때 가끔 터진다.
        nextTripRef.current -= DT;
        if (heatRef.current > 12 && nextTripRef.current <= 0) {
            tripRef.current += TRIP_DEFICIT;
            nextTripRef.current = 12 + Math.random() * 10;
        }

        // 8) 대역/정전 판정 + 정격 유지 누적
        const band = bandOf(freq);
        if (band === 'ok') greenRef.current += DT;
        if (Math.abs(freq - F0) > F_TRIP) {
            aliveRef.current = false;
            setRunning(false);
        }

        // 9) 차트 히스토리
        const hist = histRef.current;
        hist.push({ s: effSupply, d: demand });
        if (hist.length > N) hist.shift();

        setHud({
            freq, supply: effSupply, demand, rocof, band,
            t, green: greenRef.current,
            reserveReady: reserveRef.current <= 0 && reserveCdRef.current <= 0,
            shedUses: shedUsesRef.current,
            alive: aliveRef.current,
        });
    }, []);

    const render = useCallback(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const W = cv.width, H = cv.height;
        const css = getComputedStyle(cv);
        const okC = css.getPropertyValue('--gr-ok').trim() || '#35b37e';
        const supC = css.getPropertyValue('--gr-supply').trim() || '#4a90d9';
        const demC = css.getPropertyValue('--gr-demand').trim() || '#e08a1a';
        const gridC = 'rgba(150,170,190,0.14)';

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#0c0f16';
        ctx.fillRect(0, 0, W, H);

        const yOf = (v) => H - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * H;

        // 가로 눈금 + 기록 피크 라인(≈166GW)
        ctx.strokeStyle = gridC;
        ctx.lineWidth = 1;
        ctx.font = '10px monospace';
        ctx.fillStyle = 'rgba(160,180,200,0.5)';
        for (let v = 90; v <= 180; v += 30) {
            const y = yOf(v);
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
            ctx.fillText(`${v}`, 4, y - 3);
        }
        const yPeak = yOf(166);
        ctx.strokeStyle = 'rgba(216,74,58,0.55)';
        ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(0, yPeak); ctx.lineTo(W, yPeak); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(216,74,58,0.8)';
        ctx.fillText('기록 피크 166', W - 88, yPeak - 4);

        const hist = histRef.current;
        if (hist.length < 2) return;
        const dx = W / (N - 1);

        // 공급/수요 사이 불균형 음영 — 부족(적)/과잉(청)
        ctx.beginPath();
        for (let i = 0; i < hist.length; i++) ctx.lineTo(i * dx, yOf(hist[i].d));
        for (let i = hist.length - 1; i >= 0; i--) ctx.lineTo(i * dx, yOf(hist[i].s));
        ctx.closePath();
        ctx.fillStyle = 'rgba(216,74,58,0.14)';
        ctx.fill();

        // 수요 라인
        ctx.strokeStyle = demC; ctx.lineWidth = 2;
        ctx.beginPath();
        hist.forEach((p, i) => { const x = i * dx, y = yOf(p.d); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();
        // 공급 라인
        ctx.strokeStyle = supC; ctx.lineWidth = 2;
        ctx.beginPath();
        hist.forEach((p, i) => { const x = i * dx, y = yOf(p.s); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();

        // 현재 시점 도트
        const last = hist[hist.length - 1];
        const lx = (hist.length - 1) * dx;
        ctx.fillStyle = demC; ctx.beginPath(); ctx.arc(lx, yOf(last.d), 3, 0, 7); ctx.fill();
        ctx.fillStyle = last.s < last.d ? '#d84a3a' : okC;
        ctx.beginPath(); ctx.arc(lx, yOf(last.s), 3.5, 0, 7); ctx.fill();
    }, []);

    // 재생 루프
    useEffect(() => {
        if (!running) return undefined;
        const id = setInterval(() => { step(); render(); }, DT * 1000);
        return () => clearInterval(id);
    }, [running, step, render]);

    // 마운트 — 캔버스 해상도 + 초기 히스토리 채우기
    useEffect(() => {
        const cv = canvasRef.current;
        cv.width = 640; cv.height = 240;
        const hist = histRef.current;
        for (let i = 0; i < N; i++) hist.push({ s: 118, d: 118 });
        render();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const reset = useCallback(() => {
        freqRef.current = F0;
        supplyRef.current = 118; targetRef.current = 118;
        noiseRef.current = 0; heatRef.current = 0; heatOnRef.current = false;
        reserveRef.current = 0; reserveCdRef.current = 0;
        shedRef.current = 0; shedUsesRef.current = SHED_USES;
        tripRef.current = 0; nextTripRef.current = 6;
        tRef.current = 0; greenRef.current = 0; aliveRef.current = true;
        histRef.current = [];
        for (let i = 0; i < N; i++) histRef.current.push({ s: 118, d: 118 });
        setTarget(118); setHeatOn(false); heatOnRef.current = false;
        setHud({
            freq: F0, supply: 118, demand: 118, rocof: 0, band: 'ok',
            t: 0, green: 0, reserveReady: true, shedUses: SHED_USES, alive: true,
        });
        render();
        setRunning(true);
    }, [render]);

    const changeTarget = (v) => { targetRef.current = v; setTarget(v); };
    const changeH = (v) => { hRef.current = v; setHInertia(v); };
    const toggleAuto = () => { autoRef.current = !autoRef.current; setAuto((a) => !a); };
    const toggleHeat = () => {
        heatOnRef.current = !heatOnRef.current;
        setHeatOn((v) => !v);
    };
    const fireReserve = () => {
        if (!aliveRef.current) return;
        if (reserveRef.current <= 0 && reserveCdRef.current <= 0) reserveRef.current = RESERVE_DUR;
    };
    const fireShed = () => {
        if (!aliveRef.current) return;
        if (shedRef.current <= 0 && shedUsesRef.current > 0) {
            shedRef.current = SHED_DUR;
            shedUsesRef.current -= 1;
        }
    };
    const fireTrip = () => { if (aliveRef.current) tripRef.current += TRIP_DEFICIT; };

    const imbalance = hud.supply - hud.demand;
    const bandLabel = { ok: '정격 안정', warn: '주의 — 대역 이탈', trip: '정전' }[hud.band];
    const needleAngle = freqToAngle(hud.freq);
    const GX = 100, GY = 100, GR = 78;

    return (
        <LabShell
            title="GRID"
            eyebrow="grid frequency balance"
            subtitle={'// 전기는 저장되지 않는다 — 발전을 수요에 맞춰 60Hz를 지켜라'}
            path="grid.exe"
        >
            <section className="k-win gr-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/dispatch/</span>control</span>
                    <span className="meta k-mono">df/dt = (P_gen − P_load − D·Δf) / 2HS</span>
                </div>

                <div className="gr-toolbar">
                    <div className="gr-ctrls">
                        <div className="gr-ctrl">
                            <label className="gr-ctrl-label k-mono" htmlFor="gr-target">발전 지령 <b>{target} GW</b></label>
                            <input id="gr-target" type="range" min="80" max={CAP} step="1"
                                value={target} disabled={auto}
                                onChange={(e) => changeTarget(Number(e.target.value))} />
                        </div>
                        <div className="gr-ctrl">
                            <label className="gr-ctrl-label k-mono" htmlFor="gr-h">계통 관성 H <b>{hInertia.toFixed(1)}s</b></label>
                            <input id="gr-h" type="range" min="2" max="8" step="0.5"
                                value={hInertia} onChange={(e) => changeH(Number(e.target.value))} />
                        </div>
                    </div>

                    <div className="gr-cards">
                        <button type="button" className="gr-card" onClick={fireReserve} disabled={!hud.reserveReady || !hud.alive}>
                            <b>⚡ 예비력 투입</b>
                            <span className="gr-card-h k-mono">{hud.reserveReady ? `+${RESERVE_BOOST}GW · ${RESERVE_DUR}s` : '재충전 중'}</span>
                        </button>
                        <button type="button" className="gr-card" onClick={fireShed} disabled={hud.shedUses <= 0 || !hud.alive}>
                            <b>✂ 부하 차단</b>
                            <span className="gr-card-h k-mono">데이터센터 −{SHED_CUT}GW · {hud.shedUses}회</span>
                        </button>
                    </div>

                    <div className="gr-actions">
                        <button type="button" className={`gr-btn ${heatOn ? 'is-hot' : ''}`} onClick={toggleHeat} disabled={!hud.alive}>
                            {heatOn ? '🔥 폭염 진행중' : '🔥 폭염 시작'}
                        </button>
                        <button type="button" className="gr-btn gr-btn-ghost" onClick={fireTrip} disabled={!hud.alive}>⚠ 발전기 탈락</button>
                        <button type="button" className={`gr-btn gr-btn-ghost ${auto ? 'is-on' : ''}`} onClick={toggleAuto}>
                            AGC {auto ? 'ON' : 'OFF'}
                        </button>
                        <button type="button" className="gr-btn gr-btn-ghost" onClick={() => setRunning((v) => !v)} disabled={!hud.alive}>
                            {running ? '⏸ 정지' : '▶ 재생'}
                        </button>
                        <button type="button" className="gr-btn gr-btn-ghost" onClick={reset}>↻ 리셋</button>
                    </div>
                </div>

                <div className="gr-stage">
                    <div className="gr-chart-col">
                        <div className="gr-screen">
                            <canvas ref={canvasRef} className="gr-canvas" />
                            {!hud.alive && (
                                <div className="gr-blackout">
                                    <span className="gr-blackout-t">정전 (BLACKOUT)</span>
                                    <span className="gr-blackout-s k-mono">주파수가 {hud.freq.toFixed(2)}Hz에서 보호 대역(±0.8Hz)을 벗어나 계전기가 동작했습니다.</span>
                                    <button type="button" className="gr-btn" onClick={reset}>↻ 계통 복구</button>
                                </div>
                            )}
                        </div>
                        <div className="gr-legend k-mono">
                            <span><i className="gr-key gr-key-dem" /> 수요(부하)</span>
                            <span><i className="gr-key gr-key-sup" /> 공급(발전)</span>
                            <span><i className="gr-key gr-key-peak" /> 기록 피크 166GW</span>
                        </div>
                        <p className="gr-chart-foot k-mono">
                            공급선이 수요선 <b>아래</b>로 내려가면 주파수가 떨어진다 · <b>폭염</b>으로 수요가 치솟으면 <b>발전 지령</b>을 올리되, 발전기는 천천히만 오른다
                        </p>
                    </div>

                    <div className="gr-right">
                        <div className={`gr-gauge gr-${hud.band}`}>
                            <svg viewBox="0 0 200 128" className="gr-gauge-svg" aria-hidden="true">
                                <path d={arcPath(GX, GY, GR, 59.0, 59.5)} className="gr-arc gr-arc-trip" />
                                <path d={arcPath(GX, GY, GR, 59.5, 59.9)} className="gr-arc gr-arc-warn" />
                                <path d={arcPath(GX, GY, GR, 59.9, 60.1)} className="gr-arc gr-arc-ok" />
                                <path d={arcPath(GX, GY, GR, 60.1, 60.5)} className="gr-arc gr-arc-warn" />
                                <path d={arcPath(GX, GY, GR, 60.5, 61.0)} className="gr-arc gr-arc-trip" />
                                <line
                                    x1={GX} y1={GY}
                                    x2={polar(GX, GY, GR - 10, needleAngle)[0]}
                                    y2={polar(GX, GY, GR - 10, needleAngle)[1]}
                                    className="gr-needle"
                                />
                                <circle cx={GX} cy={GY} r="5" className="gr-hub" />
                            </svg>
                            <div className="gr-freq-read">
                                <span className="gr-freq-num k-mono">{hud.freq.toFixed(2)}</span>
                                <span className="gr-freq-unit k-mono">Hz</span>
                            </div>
                            <span className={`gr-band k-mono gr-band-${hud.band}`}>{bandLabel}</span>
                        </div>

                        <div className="gr-stats">
                            <div className="gr-stat">
                                <span className="gr-stat-lab k-mono">수급 불균형</span>
                                <span className="gr-stat-num k-mono" style={{ color: Math.abs(imbalance) < 3 ? 'var(--gr-ok)' : imbalance < 0 ? 'var(--gr-trip)' : 'var(--gr-supply)' }}>
                                    {imbalance >= 0 ? '+' : ''}{imbalance.toFixed(1)}
                                </span>
                                <span className="gr-stat-sub k-mono">GW (공급−수요)</span>
                            </div>
                            <div className="gr-stat">
                                <span className="gr-stat-lab k-mono">RoCoF</span>
                                <span className="gr-stat-num k-mono">{hud.rocof >= 0 ? '+' : ''}{hud.rocof.toFixed(2)}</span>
                                <span className="gr-stat-sub k-mono">Hz/s</span>
                            </div>
                            <div className="gr-stat">
                                <span className="gr-stat-lab k-mono">수요</span>
                                <span className="gr-stat-num k-mono">{hud.demand.toFixed(0)}</span>
                                <span className="gr-stat-sub k-mono">GW</span>
                            </div>
                            <div className="gr-stat">
                                <span className="gr-stat-lab k-mono">공급</span>
                                <span className="gr-stat-num k-mono">{hud.supply.toFixed(0)}</span>
                                <span className="gr-stat-sub k-mono">GW</span>
                            </div>
                        </div>

                        <div className="gr-score">
                            <div className="gr-score-row">
                                <span className="k-mono">가동 시간</span>
                                <b className="k-mono">{hud.t.toFixed(1)}s</b>
                            </div>
                            <div className="gr-score-row">
                                <span className="k-mono">정격 유지율</span>
                                <b className="k-mono">{hud.t > 0 ? Math.round((hud.green / hud.t) * 100) : 100}%</b>
                            </div>
                        </div>

                        <div className={`gr-verdict gr-${hud.band}`}>
                            <p className="gr-verdict-txt">
                                {!hud.alive
                                    ? <>보호 계전기가 동작해 <b>정전</b>이 번졌습니다. 폭염 전에 발전 지령을 미리 올리고, 예비력·부하 차단을 아껴 두세요.</>
                                    : hud.band === 'ok'
                                        ? <>공급이 수요를 <b>정확히</b> 따라가 60Hz를 지키고 있습니다. 폭염을 켜서 부하 급증을 견뎌 보세요.</>
                                        : imbalance < 0
                                            ? <>공급이 <b>부족</b>합니다. 발전 지령을 올리거나 <b>예비력·부하 차단</b>으로 급한 불을 끄세요.</>
                                            : <>공급이 <b>과잉</b>입니다. 발전 지령을 낮춰 주파수를 60Hz로 되돌리세요.</>}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win gr-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="gr-foot">
                    <p>
                        {'전기에는 창고가 없다. 발전소에서 만든 전력은 그 순간 누군가 쓰지 않으면 갈 곳이 없고, '}
                        {'반대로 쓰려는 만큼 그 순간 만들어 내지 못하면 부족분을 메울 재고도 없다. 그래서 계통은 '}
                        <b>{'매초 공급과 수요를 정확히 맞춰야'}</b>{' 한다 — 이 실험의 전부는 그 한 문장이다.'}
                    </p>
                    <p>
                        {'맞춰졌는지 아닌지는 '}<b>{'주파수'}</b>{'가 알려 준다. 전국의 발전기들은 같은 60Hz로 함께 돌며 거대한 '}
                        {'회전 관성을 이룬다. 수요가 공급을 넘어서면 회전자가 운동에너지를 내주며 느려져 '}
                        <b>{'주파수가 떨어지고'}</b>{', 공급이 남으면 빨라져 올라간다. 60Hz는 계통 전체의 심장 박동인 셈이다. '}
                        {'관성 H를 낮춰 보면 같은 불균형에도 주파수가 훨씬 급하게 요동친다 — 회전 질량이 적은 '}
                        {'재생에너지 위주 계통이 왜 다루기 까다로운지가 여기서 드러난다.'}
                    </p>
                    <p>
                        {'문제는 발전이 '}<b>{'즉시 오르지 않는다'}</b>{'는 점이다. 폭염이 닥쳐 냉방 부하가 한꺼번에 치솟아도 '}
                        {'발전기는 정해진 변화율로만 출력을 올릴 수 있어, 그 사이 벌어진 틈만큼 주파수가 주저앉는다. '}
                        {'이때 순간적으로 쓰는 카드가 즉응 '}<b>{'예비력(배터리)'}</b>{'과, 최후의 수단인 '}<b>{'부하 차단'}</b>
                        {' — 데이터센터처럼 큰 부하를 잠시 떼어 내 수요 자체를 끌어내리는 것이다. 실제로 기록적 폭염 때 '}
                        {'계통 운영자가 대형 데이터센터 전력을 줄이라는 비상 명령을 내리는 이유가 이것이다.'}
                    </p>
                    <p>
                        {'주파수가 보호 대역(여기서는 ±0.8Hz)을 벗어나면 발전기가 스스로 계통에서 떨어져 나가고, '}
                        {'그 손실이 남은 발전기에 부담을 더해 다시 주파수를 끌어내리는 '}<b>{'연쇄 정전'}</b>{'이 시작된다. '}
                        {'폭염을 켜고 아무것도 하지 않으면 수요가 기록 피크(166GW)를 향해 오르며 주파수가 무너지는 걸 볼 수 있다. '}
                        {'AGC를 켜면 자동 수급 제어가 대신 균형을 잡아 준다.'}
                    </p>
                    <p className="gr-disclaimer">
                        {'* 스윙 방정식·1차 조속 응답·부하 감쇠의 핵심만 남긴 단순 데모입니다. 실제 계통의 지역 간 조류, '}
                        {'무효전력·전압, 발전기별 관성·조속 특성, 저주파 부하 차단(UFLS) 단계 등은 크게 간략화했습니다. 수치는 예시입니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Grid;
