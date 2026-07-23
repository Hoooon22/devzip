import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Terraform.css';

// TERRAFORM — 행성 기후 되먹임과 임계(테라포밍) 실험.
// 핵심: 얼어붙은 행성을 데우는 것은 "온도를 조금 올리는" 문제가 아니라, 되먹임 고리를
//   넘길 것인가의 문제다. ① 거울·온실가스·극관 흑화로 표면을 데우면 ② 극관에 얼어 있던 CO₂가
//   대기로 승화해 대기가 두꺼워지고 ③ 두꺼운 대기가 온실효과로 표면을 더 데워 ④ 다시 CO₂가 더
//   풀린다. 이 양(+)의 되먹임 고리의 고리 이득이 1을 넘는 지점(임계 강제력 F_TIP)을 넘기면,
//   강제력을 더 안 줘도 스스로 굴러 "폭주"하며 따뜻한 상태로 전이한다. 반대로 이미 따뜻해진
//   행성은 강제력을 상당히 낮춰도 되먹임이 스스로를 지탱해 얼지 않는다(자기유지). 강제력을
//   더 내려 하한(F_LOW) 밑으로 떨어져야 비로소 대기가 다시 얼어붙어 동결로 되돌아간다 —
//   같은 강제력에서도 지금이 "데워지는 중"이었는지 "식는 중"이었는지에 따라 결과가 갈리는
//   히스테리시스(이중 안정)다. 온도 하나로 요약할 수 없는, 이력을 가진 기후.

// ---- 에너지수지 + CO₂ 되먹임 모델 (단순 개념 모델) ----
const T0 = -60;      // 대기·강제력 없을 때 표면 기준온도(℃)
const GMAX = 62;     // 대기 CO₂ 포화 시 최대 온실 승온(℃)
const AHALF = 0.32;  // 온실효과 반포화 대기압(bar)
const AMAX = 1.0;    // 극관에 얼어 있는 CO₂ 총량(대기압 환산, bar)
const TC = -15;      // CO₂ 승화가 급격해지는 문턱온도(℃)
const W = 6;         // 승화 곡선 폭(℃) — 작을수록 가팔라 되먹임이 강함
const KT = 0.06;     // 표면온도 완화 속도
const KA = 0.05;     // 대기(승화/재동결) 완화 속도
const TICK_MS = 60;  // 시뮬 틱
const HIST_N = 160;  // 온도 시계열 길이

const F_MAX = 65;    // 슬라이더 합 최대(거울25+가스25+흑화15)

const sig = (t) => 1 / (1 + Math.exp(-(t - TC) / W));   // CO₂ 승화 시그모이드
const green = (a) => (GMAX * a) / (a + AHALF);          // 대기압→온실 승온(포화)

// 주어진 강제력 F에서의 평형 표면온도. startT에서 감쇠 반복으로 수렴시킨다.
// cold(동결)·warm(따뜻함) 두 가지 시작점으로 각 가지의 평형을 얻는다.
function equilibrium(F, startT) {
    let T = startT;
    for (let i = 0; i < 600; i++) {
        const A = AMAX * sig(T);
        const Tn = T0 + green(A) + F;
        T += 0.5 * (Tn - T);
    }
    return T;
}

// 임계 강제력들을 모듈 로드 시 1회 수치 스캔으로 구한다.
// F_TIP: 이 이상이면 동결 평형이 사라져 폭주(따뜻함)로 전이하는 강제력.
// F_LOW: 이 미만이면 따뜻한 평형이 사라져 동결로 붕괴하는 강제력. [F_LOW, F_TIP]가 이중안정 구간.
function findThresholds() {
    let tip = F_MAX, low = 0;
    let tipFound = false, lowFound = false;
    for (let F = 0; F <= F_MAX; F += 0.1) {
        const cold = equilibrium(F, -95);
        const warm = equilibrium(F, 60);
        if (!lowFound && warm > -20) { low = F; lowFound = true; }
        if (!tipFound && cold > -20) { tip = F; tipFound = true; }
    }
    return { F_LOW: low, F_TIP: tip };
}
const { F_LOW, F_TIP } = findThresholds();

const CANVAS_W = 420, CANVAS_H = 300;   // 행성 뷰
const SPARK_W = 250, SPARK_H = 60;      // 온도 시계열

// 색 보간 유틸 (hex → hex, t∈[0,1])
function lerpHex(h1, h2, t) {
    const p = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const [r1, g1, b1] = p(h1), [r2, g2, b2] = p(h2);
    const r = Math.round(r1 + (r2 - r1) * t), g = Math.round(g1 + (g2 - g1) * t), b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r},${g},${b})`;
}

const Terraform = () => {
    const canvasRef = useRef(null);
    const sparkRef = useRef(null);

    // 슬라이더(강제력) — 루프 재시작 없이 읽도록 ref 미러링.
    const mirrorRef = useRef(0);   // 궤도 반사경(직접 승온 ℃)
    const gasRef = useRef(0);      // 온실가스 공장(PFC)
    const sootRef = useRef(0);     // 극관 흑화(알베도↓)
    const runningRef = useRef(true);

    const Tref = useRef(T0);   // 현재 표면온도(동결 근처에서 시작)
    const Aref = useRef(AMAX * sig(T0)); // 현재 대기 CO₂(bar)
    const dTref = useRef(0);       // 직전 틱 온도 변화(폭주 감지용)
    const histRef = useRef([]);

    const [mirror, setMirror] = useState(0);
    const [gas, setGas] = useState(0);
    const [soot, setSoot] = useState(0);
    const [running, setRunning] = useState(true);
    const [hud, setHud] = useState({ T: T0, A: AMAX * sig(T0), F: 0, dT: 0, capPct: 0 });

    const step = useCallback(() => {
        const F = mirrorRef.current + gasRef.current + sootRef.current;
        let T = Tref.current;
        let A = Aref.current;

        const Aeq = AMAX * sig(T);
        A += KA * (Aeq - A);
        const Teq = T0 + green(A) + F;
        const dT = KT * (Teq - T);
        T += dT;

        Tref.current = T;
        Aref.current = A;
        dTref.current = dT;

        const capPct = Math.max(0, Math.min(1, (AMAX - A) / AMAX)); // 극관 잔량

        const hist = histRef.current;
        hist.push(T);
        if (hist.length > HIST_N) hist.shift();

        setHud({ T, A, F, dT, capPct });
    }, []);

    const render = useCallback(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const W2 = cv.width, H2 = cv.height;
        const css = getComputedStyle(cv);
        const cIce = (css.getPropertyValue('--tf-ice').trim() || '#6fd0e6');
        const cWarm = (css.getPropertyValue('--tf-warm').trim() || '#4bb36b');

        const T = Tref.current, A = Aref.current;

        ctx.clearRect(0, 0, W2, H2);
        ctx.fillStyle = '#07090d';
        ctx.fillRect(0, 0, W2, H2);

        // 별 배경(고정 시드 느낌 — 위치는 좌표 해시로 결정)
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 60; i++) {
            const x = (i * 71) % W2, y = (i * 137 + 23) % H2;
            const s = (i % 3 === 0) ? 1.3 : 0.7;
            ctx.globalAlpha = 0.25 + ((i * 53) % 40) / 100;
            ctx.fillRect(x, y, s, s);
        }
        ctx.globalAlpha = 1;

        const cx = W2 / 2, cy = H2 / 2, R = 92;

        // 대기 헤일로 — 대기압 A에 비례해 두께·불투명도 상승. 따뜻할수록 푸르게.
        const atmT = A / AMAX;
        const haloColBase = T >= 0 ? cWarm : cIce;
        const haloThick = 6 + atmT * 34;
        const grad = ctx.createRadialGradient(cx, cy, R, cx, cy, R + haloThick);
        grad.addColorStop(0, haloColBase);
        grad.addColorStop(1, 'rgba(7,9,13,0)');
        ctx.globalAlpha = 0.18 + atmT * 0.5;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, R + haloThick, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // 표면색 — 추운 어두운 녹슨 붉은색 → 데워지며 밝은 붉은색 → 물/생명대에서 초록 물듦.
        const warmT = Math.max(0, Math.min(1, (T + 60) / 60)); // -60..0 → 0..1
        let surf = lerpHex('#3a1c10', '#c65a2e', warmT);
        if (T >= -5) {
            const lifeT = Math.max(0, Math.min(1, (T + 5) / 20)); // -5..15 → 0..1 (물/식생)
            surf = lerpHex('#c65a2e', '#3f7d4a', lifeT * 0.8);
        }

        // 행성 원반
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = surf;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

        // 표면 얼룩(마리아/분지) — 살짝 어둡게
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#000';
        const blobs = [[-30, -18, 34], [26, 10, 40], [-8, 40, 26], [44, -34, 22]];
        for (const [bx, by, br] of blobs) {
            ctx.beginPath();
            ctx.arc(cx + bx, cy + by, br, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 물바다 — 온도가 0℃ 넘고 대기 충분하면 저지대에 액체 물이 고인다(푸른 웅덩이).
        if (T >= 0 && A > 0.02) {
            const seaT = Math.max(0, Math.min(1, T / 15));
            ctx.globalAlpha = 0.35 + seaT * 0.35;
            ctx.fillStyle = lerpHex('#2b6b8a', '#2f8fb0', seaT);
            for (const [bx, by, br] of blobs) {
                ctx.beginPath();
                ctx.arc(cx + bx, cy + by, br * 0.82, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // 극관 — 얼어 있는 CO₂/얼음. 대기로 승화할수록(A↑) 극관이 줄어든다.
        const capFrac = Math.max(0, Math.min(1, (AMAX - A) / AMAX)); // 1이면 극관 가득
        const capH = capFrac * 46;
        if (capH > 1) {
            ctx.fillStyle = '#eaf4f7';
            ctx.globalAlpha = 0.92;
            // 북극
            ctx.beginPath();
            ctx.moveTo(cx - R, cy - R + (46 - capH));
            ctx.quadraticCurveTo(cx, cy - R + (46 - capH) + capH * 1.4, cx + R, cy - R + (46 - capH));
            ctx.lineTo(cx + R, cy - R);
            ctx.lineTo(cx - R, cy - R);
            ctx.closePath();
            ctx.fill();
            // 남극
            ctx.beginPath();
            ctx.moveTo(cx - R, cy + R - (46 - capH));
            ctx.quadraticCurveTo(cx, cy + R - (46 - capH) - capH * 1.4, cx + R, cy + R - (46 - capH));
            ctx.lineTo(cx + R, cy + R);
            ctx.lineTo(cx - R, cy + R);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.restore();

        // 행성 테두리
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.stroke();

        // 명암(밤 방향) — 오른쪽 아래를 어둡게
        const sh = ctx.createRadialGradient(cx - 34, cy - 34, 20, cx, cy, R + 8);
        sh.addColorStop(0, 'rgba(0,0,0,0)');
        sh.addColorStop(1, 'rgba(0,0,0,0.45)');
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = sh;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
        ctx.restore();
    }, []);

    const renderSpark = useCallback(() => {
        const cv = sparkRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const W2 = cv.width, H2 = cv.height;
        const css = getComputedStyle(cv);
        const cWarm = css.getPropertyValue('--tf-warm').trim() || '#4bb36b';
        const cHot = css.getPropertyValue('--tf-hot').trim() || '#e8a13c';
        const cIce = css.getPropertyValue('--tf-ice').trim() || '#6fd0e6';
        const cLine = css.getPropertyValue('--line').trim() || '#333';

        ctx.clearRect(0, 0, W2, H2);
        const TMIN = -70, TMAX = 20;
        const yOf = (t) => H2 - ((t - TMIN) / (TMAX - TMIN)) * H2;

        // 0℃(물) 기준선
        ctx.strokeStyle = cWarm;
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, yOf(0)); ctx.lineTo(W2, yOf(0));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // 문턱온도(CO₂ 승화) 기준선
        ctx.strokeStyle = cLine;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(0, yOf(TC)); ctx.lineTo(W2, yOf(TC));
        ctx.stroke();
        ctx.globalAlpha = 1;

        // 온도 곡선
        const hist = histRef.current;
        if (hist.length > 1) {
            ctx.lineWidth = 2;
            const curT = Tref.current;
            ctx.strokeStyle = curT >= 0 ? cWarm : (Math.abs(dTref.current) > 0.18 ? cHot : cIce);
            ctx.beginPath();
            for (let i = 0; i < hist.length; i++) {
                const x = (i / (HIST_N - 1)) * W2;
                const y = yOf(hist[i]);
                i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.stroke();
        }
    }, []);

    useEffect(() => {
        if (!running) return undefined;
        const id = setInterval(() => { step(); render(); renderSpark(); }, TICK_MS);
        return () => clearInterval(id);
    }, [running, step, render, renderSpark]);

    useEffect(() => {
        const cv = canvasRef.current;
        cv.width = CANVAS_W; cv.height = CANVAS_H;
        const sp = sparkRef.current;
        sp.width = SPARK_W; sp.height = SPARK_H;
        render(); renderSpark();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const reset = () => {
        Tref.current = T0;
        Aref.current = AMAX * sig(T0);
        dTref.current = 0;
        histRef.current = [];
        mirrorRef.current = 0; gasRef.current = 0; sootRef.current = 0;
        setMirror(0); setGas(0); setSoot(0);
        setHud({ T: T0, A: AMAX * sig(T0), F: 0, dT: 0, capPct: 0 });
        render(); renderSpark();
        setRunning(true); runningRef.current = true;
    };

    const ignite = () => {
        // 임계를 확실히 넘기는 강제력 프리셋(거울+가스). 폭주 전이를 즉시 관찰.
        const m = 22, g = 14;
        mirrorRef.current = m; gasRef.current = g;
        setMirror(m); setGas(g);
        setRunning(true); runningRef.current = true;
    };

    const changeMirror = (v) => { mirrorRef.current = v; setMirror(v); };
    const changeGas = (v) => { gasRef.current = v; setGas(v); };
    const changeSoot = (v) => { sootRef.current = v; setSoot(v); };
    const togglePlay = () => { setRunning((r) => { runningRef.current = !r; return !r; }); };

    // ---- 상태 밴드 판정 ----
    // 두 안정 가지는 "대기 CO₂ 유지 여부"로 갈린다: 따뜻한 가지는 대기를 두껍게 붙들고(A 큼),
    // 동결 가지는 대기가 극관에 얼어 A가 거의 0이다. 그래서 온도·dT 부호가 아니라 A를 기준으로 판정한다.
    const { T, A, F, dT } = hud;
    const heating = dT > 0.02;
    const cooling = dT < -0.02;
    const warmBranch = A > 0.45;                          // 대기가 유지됨 = 따뜻한 가지에 있음
    const active = Math.abs(dT) > 0.16 && A > 0.1 && A < 0.92; // 되먹임이 스스로 굴러가는 전이 구간

    let band;
    if (T >= 0) band = 'temperate';
    else if (active && heating) band = 'runaway';        // 상승 폭주 우선
    else if (active && cooling) band = 'collapsing';     // 급락(재동결)
    else if (warmBranch) band = 'selfsustain';           // 영하지만 대기 유지 → 자기유지
    else if (heating) band = 'warming';
    else if (cooling) band = 'collapsing';
    else band = 'frozen';

    const bandLabel = {
        frozen: '동결', warming: '가열 중', runaway: '폭주 전이',
        collapsing: '붕괴·재동결', selfsustain: '자기유지', temperate: '온난·물',
    }[band];

    // 대기압 → 사람 기준 체감 (지구 1 bar 대비)
    const pressPct = (A * 100).toFixed(0);
    const water = T >= 0 && A > 0.02;

    return (
        <LabShell
            title="TERRAFORM"
            eyebrow="planetary climate feedback & tipping"
            subtitle={'// 얼어붙은 행성을 데우는 건 되먹임 고리를 넘길 것인가의 문제 — 이중 안정과 히스테리시스'}
            path="terraform.exe"
        >
            <section className="k-win tf-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/planet/</span>climate</span>
                    <span className="meta k-mono">거울·온실가스·극관 흑화 → CO₂ 되먹임</span>
                </div>

                <div className="tf-toolbar">
                    <div className="tf-ctrls">
                        <div className="tf-ctrl">
                            <label className="tf-ctrl-label k-mono" htmlFor="tf-mirror">
                                궤도 반사경 <b>+{mirror}℃</b> <span className="tf-dim">직접 승온</span>
                            </label>
                            <input id="tf-mirror" type="range" min="0" max="25" step="1"
                                value={mirror} onChange={(e) => changeMirror(Number(e.target.value))} />
                        </div>
                        <div className="tf-ctrl">
                            <label className="tf-ctrl-label k-mono" htmlFor="tf-gas">
                                온실가스 공장 <b>+{gas}℃</b> <span className="tf-dim">PFC 강제력</span>
                            </label>
                            <input id="tf-gas" type="range" min="0" max="25" step="1"
                                value={gas} onChange={(e) => changeGas(Number(e.target.value))} />
                        </div>
                        <div className="tf-ctrl">
                            <label className="tf-ctrl-label k-mono" htmlFor="tf-soot">
                                극관 흑화 <b>+{soot}℃</b> <span className="tf-dim">알베도↓</span>
                            </label>
                            <input id="tf-soot" type="range" min="0" max="15" step="1"
                                value={soot} onChange={(e) => changeSoot(Number(e.target.value))} />
                        </div>
                    </div>
                    <div className="tf-actions">
                        <button type="button" className="tf-btn tf-btn-hot" onClick={ignite}>🔥 임계 넘기기</button>
                        <button type="button" className="tf-btn tf-btn-ghost" onClick={togglePlay}>
                            {running ? '⏸ 정지' : '▶ 재생'}
                        </button>
                        <button type="button" className="tf-btn tf-btn-ghost" onClick={reset}>↻ 리셋</button>
                    </div>
                </div>

                <div className="tf-stage">
                    <div className="tf-view-col">
                        <div className="tf-screen">
                            <canvas ref={canvasRef} className="tf-canvas" />
                        </div>
                        <div className="tf-legend k-mono">
                            <span><i className="tf-key tf-key-ice" /> 극관·동결 대기</span>
                            <span><i className="tf-key tf-key-rust" /> 지표</span>
                            <span><i className="tf-key tf-key-warm" /> 물·생명대</span>
                        </div>
                        <div className="tf-spark-wrap">
                            <span className="tf-spark-lab k-mono">표면온도 시계열 (점선 0℃=물 · 실선 문턱)</span>
                            <canvas ref={sparkRef} className="tf-spark" />
                        </div>
                        <p className="tf-view-foot k-mono">
                            강제력을 올려 <b>임계(F_TIP≈{F_TIP.toFixed(0)}℃)</b>를 넘기면 CO₂ 되먹임이 스스로 굴러 <b>폭주 전이</b>한다 ·
                            따뜻해진 뒤 강제력을 <b>{F_LOW.toFixed(0)}℃ 위</b>로만 낮춰 보라 — 얼지 않고 <b>자기유지</b>된다(히스테리시스)
                        </p>
                    </div>

                    <div className="tf-right">
                        <div className={`tf-amp tf-${band}`}>
                            <span className="tf-amp-lab k-mono">표면 상태</span>
                            <span className="tf-amp-num">{bandLabel}</span>
                            <span className="tf-amp-sub k-mono">{T.toFixed(1)}℃ · 대기 {pressPct}% bar {water ? '· 💧물' : ''}</span>
                        </div>

                        <div className="tf-force">
                            <span className="tf-force-lab k-mono">총 온난화 강제력 F <b>{F}℃</b></span>
                            <div className="tf-force-track">
                                <div className="tf-force-window"
                                    style={{ left: `${(F_LOW / F_MAX) * 100}%`, width: `${((F_TIP - F_LOW) / F_MAX) * 100}%` }} />
                                <div className="tf-force-fill" style={{ width: `${(F / F_MAX) * 100}%` }} />
                                <div className="tf-force-mark tf-force-low" style={{ left: `${(F_LOW / F_MAX) * 100}%` }} />
                                <div className="tf-force-mark tf-force-tip" style={{ left: `${(F_TIP / F_MAX) * 100}%` }} />
                            </div>
                            <div className="tf-force-key k-mono">
                                <span>F_LOW {F_LOW.toFixed(0)}</span>
                                <span className="tf-force-bistable">◇ 이중안정 구간</span>
                                <span>F_TIP {F_TIP.toFixed(0)}</span>
                            </div>
                        </div>

                        <div className="tf-stats">
                            <div className="tf-stat">
                                <span className="tf-stat-lab k-mono">대기압</span>
                                <span className="tf-stat-num k-mono">{A.toFixed(2)}<span className="tf-unit">bar</span></span>
                            </div>
                            <div className="tf-stat">
                                <span className="tf-stat-lab k-mono">극관 잔량</span>
                                <span className="tf-stat-num k-mono">{(hud.capPct * 100).toFixed(0)}<span className="tf-unit">%</span></span>
                            </div>
                        </div>

                        <div className={`tf-verdict tf-${band}`}>
                            <p className="tf-verdict-txt">
                                {band === 'frozen'
                                    ? <>표면이 문턱 아래라 CO₂가 <b>극관에 얼어붙어</b> 있다. 강제력을 <b>F_TIP({F_TIP.toFixed(0)}℃)</b> 위로 올려 되먹임을 <b>점화</b>하라.</>
                                    : band === 'warming'
                                        ? <>표면이 데워지며 극관 CO₂가 <b>승화</b>하기 시작한다. 아직 되먹임이 자립하기 전 — 임계를 넘겨야 폭주한다.</>
                                        : band === 'runaway'
                                            ? <>양(+)의 되먹임이 <b>스스로 굴러간다</b> — CO₂가 대기를 두껍게, 두꺼운 대기가 표면을 더 데워 <b>폭주 전이</b> 중.</>
                                            : band === 'collapsing'
                                                ? <>강제력이 하한(<b>F_LOW {F_LOW.toFixed(0)}℃</b>) 밑으로 떨어져 대기가 <b>재동결</b>하는 중 — 동결로 붕괴한다.</>
                                                : band === 'selfsustain'
                                                    ? <>강제력이 임계(<b>F_TIP {F_TIP.toFixed(0)}℃</b>)보다 <b>낮은데도</b> 대기를 붙들고 있다 — 되먹임이 스스로를 지탱하는 <b>자기유지</b>. 이게 히스테리시스다.</>
                                                    : <>표면이 <b>0℃</b>를 넘어 <b>액체 물</b>이 가능한 온난대. 두꺼워진 대기가 온실효과로 온기를 붙든다.</>}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win tf-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="tf-foot">
                    <p>
                        {'얼어붙은 행성을 데우는 건 "온도를 조금 올리는" 문제처럼 보이지만, 실제로는 '}<b>{'되먹임 고리를 넘길 것인가'}</b>
                        {'의 문제다. 표면을 데우면 극관에 얼어 있던 '}<b>{'CO₂가 대기로 승화'}</b>{'하고, 두꺼워진 대기는 '}
                        <b>{'온실효과'}</b>{'로 표면을 더 데우며, 그럼 CO₂가 더 풀린다. 데움 → 대기 증가 → 더 데움의 '}<b>{'양(+)의 되먹임'}</b>{'이다.'}
                    </p>
                    <p>
                        {'이 고리의 '}<b>{'이득이 1을 넘는 지점'}</b>{'(임계 강제력 F_TIP)을 넘기면, 거울·온실가스 같은 외부 강제력을 '}
                        {'더 주지 않아도 되먹임이 '}<b>{'스스로 굴러'}</b>{' 따뜻한 상태로 '}<b>{'폭주 전이'}</b>{'한다. 임계 아래에서는 '}
                        {'아무리 데워도 극관이 다시 얼려 원상복귀시킨다 — 그래서 "조금씩 꾸준히"가 아니라 "한 번에 문턱 넘기기"가 관건이다.'}
                    </p>
                    <p>
                        {'더 흥미로운 건 '}<b>{'히스테리시스(이중 안정)'}</b>{'다. 이미 따뜻해진 행성은 강제력을 상당히 낮춰도 '}
                        {'되먹임이 스스로를 지탱해 얼지 않는다('}<b>{'자기유지'}</b>{'). 강제력을 하한 F_LOW 밑까지 더 내려야 비로소 '}
                        {'대기가 재동결해 동결로 붕괴한다. 즉 '}<b>{'같은 강제력'}</b>{'에서도 지금이 "데워지는 중"이었는지 "식는 중"이었는지 — '}
                        {'행성의 '}<b>{'이력'}</b>{'에 따라 결과가 갈린다. [F_LOW, F_TIP]가 두 상태가 공존하는 '}<b>{'이중안정 구간'}</b>{'이다.'}
                    </p>
                    <p>
                        {'이 구조는 행성에만 있는 게 아니다. 지구의 '}<b>{'빙하기–간빙기 전환'}</b>{', 급변하는 기후 티핑포인트, 심지어 '}
                        {'물이 끓거나 어는 상전이까지 — 문턱과 되먹임과 이력이 함께 만드는 '}<b>{'같은 수학'}</b>{'이다. 온도 하나로 '}
                        {'"지금 상태"를 요약할 수 없고, 어떻게 여기까지 왔는지를 알아야 하는 계(系)의 원형이다.'}
                    </p>
                    <p className="tf-disclaimer">
                        {'* 표면온도–대기 CO₂를 단순 에너지수지와 승화 시그모이드로 묶은 개념 모델입니다. 실제 테라포밍은 자전·먼지·'}
                        {'자기장 부재로 인한 대기 유실, 물·질소 예산, 방사선, 수백 년의 시간 규모 등 훨씬 많은 제약을 받습니다. '}
                        {'수치·임계값은 되먹임과 이중안정의 구조를 보이기 위한 예시입니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Terraform;
