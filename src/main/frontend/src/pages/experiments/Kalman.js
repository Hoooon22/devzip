import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Kalman.css';

// KALMAN — 센서 융합 상태 추정(칼만 필터) 실험.
// 핵심: 물리 세계를 인식하는 기계(자율주행·로봇·드론)는 진짜 상태를 직접 볼 수 없다.
//   가진 것은 (1) "다음엔 대략 여기 있겠지"라는 운동 모델의 예측과 (2) 제각기 흔들리는
//   여러 센서의 잡음 섞인 측정뿐이다. 칼만 필터는 이 둘을 각자의 불확실성에 반비례하는
//   가중치로 섞어(융합) 어느 하나보다 정확한 추정을 만든다. 센서가 여럿이면 더 좁혀지고,
//   센서가 가려지면 예측만으로 잠시 버티며(코스팅) 불확실성이 커진다.
// 모델: 축마다 독립인 등속(constant-velocity) 칼만 필터 2개. 상태 [위치 p, 속도 v].
//   예측 P = F P Fᵀ + Q, 측정 갱신은 활성 센서를 순차로 적용(다중 센서 융합).
//   불확실성 타원은 두 축 위치 분산 √Pxx, √Pyy 로 그린다.

const CANVAS = 360;
const CX = 180, CY = 180;
const TICK_MS = 34;         // ≈29fps
const HIST_N = 130;         // 오차 시계열 길이
const RMS_W = 36;           // 이동 RMS 창
const TRAIL_N = 70;         // 참값 자취 길이
const MEAS_LIFE = 16;       // 측정점 잔상 수명(틱)

// 표준정규 난수 (Box–Muller)
function gauss() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// 참값 궤적 — 캔버스 안을 부드럽게 배회하는 리사주풍 경로(직접 볼 수 없는 "진짜 상태")
function truePath(t) {
    return [
        CX + 118 * Math.sin(t * 0.017) + 34 * Math.sin(t * 0.045 + 1),
        CY + 96 * Math.cos(t * 0.021) + 30 * Math.cos(t * 0.033 + 2),
    ];
}

// 새 축 필터 상태 — 큰 초기 공분산(아직 잘 모름)
function newAxis(p0) {
    return { p: p0, v: 0, P: [[400, 0], [0, 100]] };
}

// 예측: p += v, P = F P Fᵀ + Q   (F=[[1,1],[0,1]], dt=1)
function predict(s, q) {
    s.p += s.v;
    const [[a, b], [, c]] = s.P; // 대칭
    // F P Fᵀ = [[a+2b+c, b+c],[b+c, c]]
    const na = a + 2 * b + c + q * 0.25;
    const nb = b + c + q * 0.5;
    const nc = c + q;
    s.P = [[na, nb], [nb, nc]];
}

// 갱신: 위치 측정 z(분산 R) 하나로 상태·공분산을 조인다
function update(s, z, R) {
    const P00 = s.P[0][0], P01 = s.P[0][1], P10 = s.P[1][0], P11 = s.P[1][1];
    const S = P00 + R;
    const K0 = P00 / S, K1 = P10 / S;
    const y = z - s.p;
    s.p += K0 * y;
    s.v += K1 * y;
    s.P = [
        [(1 - K0) * P00, (1 - K0) * P01],
        [P10 - K1 * P00, P11 - K1 * P01],
    ];
}

const Kalman = () => {
    const canvasRef = useRef(null);
    const sparkRef = useRef(null);

    // 파라미터 — 루프 재시작 없이 읽도록 ref
    const aOnRef = useRef(true);
    const bOnRef = useRef(true);
    const sigARef = useRef(14);   // 라이다 잡음 σ(px)
    const sigBRef = useRef(28);   // 레이더 잡음 σ(px)
    const qRef = useRef(1.2);     // 기동성 가정(프로세스 잡음)
    const occRef = useRef(false); // 센서 가림
    const runningRef = useRef(true);

    // 상태
    const tRef = useRef(0);
    const fxRef = useRef(newAxis(CX));
    const fyRef = useRef(newAxis(CY));
    const trueTrailRef = useRef([]);
    const measRef = useRef([]);            // {x,y,life,sensor}
    const histFRef = useRef([]);           // 필터 오차
    const histRRef = useRef([]);           // 단일 센서 원시 오차(가림 중엔 NaN)
    const sqFRef = useRef([]);             // RMS 창(필터)
    const sqRRef = useRef([]);             // RMS 창(원시)

    const [aOn, setAOn] = useState(true);
    const [bOn, setBOn] = useState(true);
    const [sigA, setSigA] = useState(14);
    const [sigB, setSigB] = useState(28);
    const [q, setQ] = useState(1.2);
    const [occ, setOcc] = useState(false);
    const [running, setRunning] = useState(true);
    const [hud, setHud] = useState({ filt: 0, raw: 0, gain: 1, unc: 0, occ: false, t: 0 });

    const rms = (arr) => {
        if (!arr.length) return 0;
        return Math.sqrt(arr.reduce((s, x) => s + x, 0) / arr.length);
    };

    const step = useCallback(() => {
        const t = tRef.current + 1;
        tRef.current = t;
        const fx = fxRef.current, fy = fyRef.current;
        const qv = qRef.current;
        const occluded = occRef.current;

        // 1) 참값(직접 관측 불가)
        const [tx, ty] = truePath(t);
        const trail = trueTrailRef.current;
        trail.push([tx, ty]);
        if (trail.length > TRAIL_N) trail.shift();

        // 2) 예측 — 운동 모델로 한 발 내다본다(불확실성은 커진다)
        predict(fx, qv);
        predict(fy, qv);

        // 3) 측정 갱신 — 활성 센서를 순차 융합. 가려지면 측정 없이 예측만으로 코스팅.
        let rawErr = NaN;      // 단일 센서만 썼을 때의 원시 오차(비교 기준)
        let rawSig = Infinity; // 비교 기준으로 삼은 센서의 σ(가장 정확한 센서)
        if (!occluded) {
            const sensors = [];
            if (aOnRef.current) sensors.push({ s: 'a', sig: sigARef.current });
            if (bOnRef.current) sensors.push({ s: 'b', sig: sigBRef.current });
            for (const sen of sensors) {
                const R = sen.sig * sen.sig;
                const zx = tx + gauss() * sen.sig;
                const zy = ty + gauss() * sen.sig;
                update(fx, zx, R);
                update(fy, zy, R);
                measRef.current.push({ x: zx, y: zy, life: MEAS_LIFE, sensor: sen.s });
                // 비교 기준: 가장 정확한(σ 작은) 단일 센서의 원시 측정 오차
                if (sen.sig <= rawSig) {
                    rawErr = Math.hypot(zx - tx, zy - ty);
                    rawSig = sen.sig;
                }
            }
        }

        // 측정 잔상 감쇠
        measRef.current = measRef.current.filter((m) => { m.life -= 1; return m.life > 0; });

        // 4) 추정·오차
        const ex = fx.p, ey = fy.p;
        const filtErr = Math.hypot(ex - tx, ey - ty);
        const unc = Math.sqrt(Math.max(0, fx.P[0][0]) + Math.max(0, fy.P[0][0])); // 위치 불확실성 척도

        const histF = histFRef.current, histR = histRRef.current;
        histF.push(filtErr);
        histR.push(Number.isNaN(rawErr) ? NaN : rawErr);
        if (histF.length > HIST_N) { histF.shift(); histR.shift(); }

        const sqF = sqFRef.current, sqR = sqRRef.current;
        sqF.push(filtErr * filtErr);
        if (sqF.length > RMS_W) sqF.shift();
        if (!Number.isNaN(rawErr)) {
            sqR.push(rawErr * rawErr);
            if (sqR.length > RMS_W) sqR.shift();
        }

        const rmsF = rms(sqF), rmsR = rms(sqR);
        const gain = rmsF > 0.01 && rmsR > 0 ? rmsR / rmsF : 1;

        setHud({ filt: rmsF, raw: rmsR, gain, unc, occ: occluded, t });
    }, []);

    const render = useCallback(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const W = cv.width, H = cv.height;
        const css = getComputedStyle(cv);
        const cTruth = css.getPropertyValue('--kf-truth').trim() || '#dbe7ef';
        const cEst = css.getPropertyValue('--kf-est').trim() || '#3fc389';
        const cA = css.getPropertyValue('--kf-sa').trim() || '#efb23c';
        const cB = css.getPropertyValue('--kf-sb').trim() || '#e0713c';

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#0a0e14';
        ctx.fillRect(0, 0, W, H);

        // 격자(레이더 판)
        ctx.strokeStyle = 'rgba(120,150,180,0.10)';
        ctx.lineWidth = 1;
        for (let g = 40; g < W; g += 40) {
            ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, H); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(W, g); ctx.stroke();
        }

        // 참값 자취
        const trail = trueTrailRef.current;
        ctx.lineWidth = 1.4;
        for (let i = 1; i < trail.length; i++) {
            const a = i / trail.length;
            ctx.strokeStyle = `rgba(219,231,239,${a * 0.5})`;
            ctx.beginPath();
            ctx.moveTo(trail[i - 1][0], trail[i - 1][1]);
            ctx.lineTo(trail[i][0], trail[i][1]);
            ctx.stroke();
        }

        // 센서 측정점(잔상)
        for (const m of measRef.current) {
            const a = (m.life / MEAS_LIFE) * 0.85;
            ctx.strokeStyle = m.sensor === 'a' ? cA : cB;
            ctx.globalAlpha = a;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(m.x - 3, m.y); ctx.lineTo(m.x + 3, m.y);
            ctx.moveTo(m.x, m.y - 3); ctx.lineTo(m.x, m.y + 3);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // 참값 위치
        const [tx, ty] = truePath(tRef.current);
        ctx.fillStyle = cTruth;
        ctx.beginPath(); ctx.arc(tx, ty, 4.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(tx, ty, 7, 0, Math.PI * 2); ctx.stroke();

        // 추정 — 불확실성 타원(2σ) + 추정 위치 + 속도 벡터
        const fx = fxRef.current, fy = fyRef.current;
        const ex = fx.p, ey = fy.p;
        const rx = Math.max(3, 2 * Math.sqrt(Math.max(0, fx.P[0][0])));
        const ry = Math.max(3, 2 * Math.sqrt(Math.max(0, fy.P[0][0])));
        ctx.save();
        ctx.translate(ex, ey);
        ctx.strokeStyle = cEst;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = cEst;
        ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // 속도 벡터
        ctx.strokeStyle = cEst; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + fx.v * 6, ey + fy.v * 6); ctx.stroke();
        ctx.globalAlpha = 1;

        // 추정 위치
        ctx.fillStyle = cEst;
        ctx.beginPath(); ctx.arc(ex, ey, 3.4, 0, Math.PI * 2); ctx.fill();

        // 오차선(추정→참값)
        ctx.strokeStyle = 'rgba(232,90,72,0.7)';
        ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.setLineDash([]);
    }, []);

    // 오차 비교 스파크라인 — 필터(초록) vs 단일 센서 원시(앰버)
    const renderSpark = useCallback(() => {
        const cv = sparkRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const W = cv.width, H = cv.height;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#0a0e14';
        ctx.fillRect(0, 0, W, H);
        const histF = histFRef.current, histR = histRRef.current;
        if (histF.length < 2) return;
        let ymax = 8;
        for (const v of histF) if (v > ymax) ymax = v;
        for (const v of histR) if (!Number.isNaN(v) && v > ymax) ymax = v;
        ymax *= 1.1;
        const dx = W / (HIST_N - 1);
        const css = getComputedStyle(cv);
        const cEst = css.getPropertyValue('--kf-est').trim() || '#3fc389';
        const cA = css.getPropertyValue('--kf-sa').trim() || '#efb23c';

        // 원시(앰버) — NaN 구간은 끊는다
        ctx.strokeStyle = cA; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.85;
        ctx.beginPath();
        let pen = false;
        histR.forEach((v, i) => {
            if (Number.isNaN(v)) { pen = false; return; }
            const x = i * dx, y = H - (Math.min(v, ymax) / ymax) * H;
            if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y);
            pen = true;
        });
        ctx.stroke();
        ctx.globalAlpha = 1;

        // 필터(초록)
        ctx.strokeStyle = cEst; ctx.lineWidth = 1.8;
        ctx.beginPath();
        histF.forEach((v, i) => {
            const x = i * dx, y = H - (Math.min(v, ymax) / ymax) * H;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
    }, []);

    // 재생 루프
    useEffect(() => {
        if (!running) return undefined;
        const id = setInterval(() => { step(); render(); renderSpark(); }, TICK_MS);
        return () => clearInterval(id);
    }, [running, step, render, renderSpark]);

    // 마운트
    useEffect(() => {
        const cv = canvasRef.current;
        cv.width = CANVAS; cv.height = CANVAS;
        const sp = sparkRef.current;
        sp.width = 250; sp.height = 60;
        render(); renderSpark();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const reset = () => {
        tRef.current = 0;
        fxRef.current = newAxis(CX);
        fyRef.current = newAxis(CY);
        trueTrailRef.current = [];
        measRef.current = [];
        histFRef.current = []; histRRef.current = [];
        sqFRef.current = []; sqRRef.current = [];
        setHud({ filt: 0, raw: 0, gain: 1, unc: 0, occ: occRef.current, t: 0 });
        render(); renderSpark();
        setRunning(true); runningRef.current = true;
    };
    const togglePlay = () => setRunning((r) => { runningRef.current = !r; return !r; });
    const toggleA = () => { aOnRef.current = !aOnRef.current; setAOn((v) => !v); };
    const toggleB = () => { bOnRef.current = !bOnRef.current; setBOn((v) => !v); };
    const toggleOcc = () => { occRef.current = !occRef.current; setOcc((v) => !v); };
    const changeSigA = (v) => { sigARef.current = v; setSigA(v); };
    const changeSigB = (v) => { sigBRef.current = v; setSigB(v); };
    const changeQ = (v) => { qRef.current = v; setQ(v); };

    const noSensor = !aOn && !bOn;
    // 추정 상태 — 가림/불확실성/오차로 밴드
    const band = hud.occ || noSensor ? 'drift'
        : hud.filt > 18 ? 'drift'
            : hud.filt > 8 ? 'track' : 'lock';
    const bandLabel = { lock: '동기화됨', track: '추적 중', drift: '표류' }[band];

    return (
        <LabShell
            title="KALMAN"
            eyebrow="sensor fusion · state estimation"
            subtitle={'// 진짜 상태는 볼 수 없다 — 예측과 여러 잡음 센서를 불확실성으로 저울질해 융합한다'}
            path="kalman.exe"
        >
            <section className="k-win kf-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/percept/</span>estimator</span>
                    <span className="meta k-mono">예측 + 측정 → 가중 융합(칼만 이득)</span>
                </div>

                <div className="kf-toolbar">
                    <div className="kf-ctrls">
                        <div className="kf-ctrl">
                            <label className="kf-ctrl-label k-mono" htmlFor="kf-sa">
                                <span className="kf-dot kf-dot-a" /> 라이다 잡음 σ <b>{sigA}px</b>
                            </label>
                            <input id="kf-sa" type="range" min="4" max="60" step="1"
                                value={sigA} onChange={(e) => changeSigA(Number(e.target.value))} />
                        </div>
                        <div className="kf-ctrl">
                            <label className="kf-ctrl-label k-mono" htmlFor="kf-sb">
                                <span className="kf-dot kf-dot-b" /> 레이더 잡음 σ <b>{sigB}px</b>
                            </label>
                            <input id="kf-sb" type="range" min="4" max="60" step="1"
                                value={sigB} onChange={(e) => changeSigB(Number(e.target.value))} />
                        </div>
                        <div className="kf-ctrl">
                            <label className="kf-ctrl-label k-mono" htmlFor="kf-q">기동성 가정 q <b>{q.toFixed(1)}</b></label>
                            <input id="kf-q" type="range" min="0.2" max="8" step="0.1"
                                value={q} onChange={(e) => changeQ(Number(e.target.value))} />
                        </div>
                    </div>
                    <div className="kf-actions">
                        <button type="button" className={`kf-btn kf-btn-a ${aOn ? 'is-on' : ''}`} onClick={toggleA}>
                            라이다 {aOn ? 'ON' : 'OFF'}
                        </button>
                        <button type="button" className={`kf-btn kf-btn-b ${bOn ? 'is-on' : ''}`} onClick={toggleB}>
                            레이더 {bOn ? 'ON' : 'OFF'}
                        </button>
                        <button type="button" className={`kf-btn kf-btn-hot ${occ ? 'is-on' : ''}`} onClick={toggleOcc}>
                            🚧 센서 가림 {occ ? 'ON' : 'OFF'}
                        </button>
                        <button type="button" className="kf-btn kf-btn-ghost" onClick={togglePlay}>
                            {running ? '⏸ 정지' : '▶ 재생'}
                        </button>
                        <button type="button" className="kf-btn kf-btn-ghost" onClick={reset}>↻ 리셋</button>
                    </div>
                </div>

                <div className="kf-stage">
                    <div className="kf-view-col">
                        <div className="kf-screen">
                            <canvas ref={canvasRef} className="kf-canvas" />
                        </div>
                        <div className="kf-legend k-mono">
                            <span><i className="kf-key kf-key-truth" /> 참값</span>
                            <span><i className="kf-key kf-key-est" /> 융합 추정(±불확실성)</span>
                            <span><i className="kf-key kf-key-a" /> 라이다</span>
                            <span><i className="kf-key kf-key-b" /> 레이더</span>
                        </div>
                        <p className="kf-view-foot k-mono">
                            <b>센서 두 개</b>를 켜면 추정 타원이 어떻게 <b>좁아지는지</b> · 잡음 σ를 키우면 왜 그 센서를
                            <b> 덜 믿는지</b> · <b>센서 가림</b>을 켜면 측정 없이 예측만으로 <b>코스팅</b>하며 타원이 부푸는지 보라
                        </p>
                    </div>

                    <div className="kf-right">
                        <div className={`kf-amp kf-${band}`}>
                            <span className="kf-amp-lab k-mono">추정 상태</span>
                            <span className="kf-amp-num">{bandLabel}</span>
                            <span className="kf-amp-sub k-mono">위치 불확실성 ±{hud.unc.toFixed(1)}px</span>
                        </div>

                        <div className="kf-gain">
                            <span className="kf-gain-lab k-mono">정확도 향상 (원시÷필터)</span>
                            <span className="kf-gain-num k-mono">×{hud.gain.toFixed(2)}</span>
                        </div>

                        <div className="kf-spark-wrap">
                            <span className="kf-spark-lab k-mono">오차 추이 · <i className="kf-sw kf-sw-est" />필터 <i className="kf-sw kf-sw-a" />단일 센서</span>
                            <canvas ref={sparkRef} className="kf-spark" />
                        </div>

                        <div className="kf-stats">
                            <div className="kf-stat">
                                <span className="kf-stat-lab k-mono">필터 오차 RMS</span>
                                <span className="kf-stat-num k-mono">{hud.filt.toFixed(1)}px</span>
                            </div>
                            <div className="kf-stat">
                                <span className="kf-stat-lab k-mono">단일 센서 RMS</span>
                                <span className="kf-stat-num k-mono">{hud.occ ? '—' : hud.raw.toFixed(1) + 'px'}</span>
                            </div>
                        </div>

                        <div className={`kf-verdict kf-${band}`}>
                            <p className="kf-verdict-txt">
                                {noSensor
                                    ? <>센서를 모두 껐다 — 필터는 <b>운동 모델의 예측만</b>으로 굴러간다. 타원이 계속 부풀며 곧 표류한다.</>
                                    : hud.occ
                                        ? <>센서가 가려졌다. 측정이 없으니 <b>예측으로 코스팅</b> — 추정은 관성으로 나아가지만 불확실성(타원)이 커진다.</>
                                        : band === 'lock'
                                            ? <>예측과 측정이 <b>불확실성 가중</b>으로 잘 융합돼, 어떤 단일 센서보다 <b>참값에 밀착</b>해 있다.</>
                                            : band === 'track'
                                                ? <>잡음이 커도 필터가 <b>흔들림을 눌러</b> 따라간다. σ를 더 키우면 그 센서를 덜 믿어 반응이 느려진다.</>
                                                : <>잡음·기동성이 커 추정이 <b>표류</b>한다. 더 정확한 센서를 켜거나 σ를 낮추면 다시 <b>조여진다</b>.</>}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win kf-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="kf-foot">
                    <p>
                        {'자율주행차·로봇·드론처럼 '}<b>{'물리 세계를 인식하는 기계'}</b>{'는 자기 상태(어디에 얼마나 빠르게 있는지)를 '}
                        {'직접 볼 수 없다. 가진 것은 두 가지뿐이다 — '}<b>{'운동 모델의 예측'}</b>{'("방금 이 속도였으니 다음엔 대략 여기") 과 '}
                        {'제각기 흔들리는 '}<b>{'여러 센서의 잡음 섞인 측정'}</b>{'(카메라·라이다·레이더)이다. 어느 하나도 진실이 아니다. '}
                        {'예측은 시간이 지날수록 어긋나고, 측정은 매 순간 튄다.'}
                    </p>
                    <p>
                        {'칼만 필터는 이 둘을 '}<b>{'각자의 불확실성에 반비례하는 가중치'}</b>{'로 섞는다. 이 가중치가 '}
                        <b>{'칼만 이득(Kalman gain)'}</b>{'이다 — 측정이 예측보다 미덥지 않으면(잡음 σ가 크면) 측정을 덜 반영하고, '}
                        {'반대면 측정 쪽으로 크게 당긴다. 그래서 '}<b>{'σ를 키우면'}</b>{' 그 센서를 덜 믿어 추정이 부드럽지만 반응이 느려지고, '}
                        {'σ를 낮추면 민첩하지만 잡음에 흔들린다. 핵심은 "믿을 만큼만 믿는다"는 저울질이다.'}
                    </p>
                    <p>
                        {'센서가 '}<b>{'여러 개'}</b>{'면 이득은 더 커진다. 각 센서를 순차로 융합할 때마다 추정의 불확실성(초록 타원)이 '}
                        {'한 겹씩 조여져, '}<b>{'어떤 단일 센서보다 정확'}</b>{'해진다 — 오른쪽 "정확도 향상"이 1보다 커지는 이유다. '}
                        {'반대로 '}<b>{'센서 가림'}</b>{'을 켜면 측정이 끊긴다. 이때 필터는 예측만으로 '}<b>{'코스팅(coasting)'}</b>{'하며 '}
                        {'관성으로 나아가지만, 새 정보가 없으니 타원이 매 틱 부풀어 오른다. 가림이 길어질수록 표류가 커지는 게 눈에 보인다.'}
                    </p>
                    <p>
                        {'이것이 이른바 '}<b>{'피지컬 AI'}</b>{'의 밑바닥 '}<b>{'인식(perception)'}</b>{' 계층이다. 판단·제어에 앞서, '}
                        {'흔들리는 세계에서 "지금 진짜 어디에 있는가"를 추정하는 문제를 먼저 풀어야 한다. 칼만 필터는 GPS·관성항법·로봇 위치추정· '}
                        {'금융 시계열까지 반세기 넘게 쓰이는, '}<b>{'예측과 관측을 불확실성으로 융합'}</b>{'하는 가장 단정한 방법이다.'}
                    </p>
                    <p className="kf-disclaimer">
                        {'* 두 축(x·y)이 독립이라 가정한 등속 모델 칼만 필터입니다. 실제로는 상태에 속도·가속도를 함께 담은 결합 공분산, '}
                        {'비선형 운동(EKF/UKF), 센서별 좌표계·지연·상관 잡음 등을 다룹니다. 수치·잡음은 시연용 예시입니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Kalman;
