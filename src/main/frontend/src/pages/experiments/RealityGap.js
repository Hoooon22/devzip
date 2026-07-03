import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/RealityGap.css';

// REALITY GAP — 시뮬레이션에서 완벽하던 제어기가 현실로 나오면 왜 무너지는가.
// 특정 로봇/제품이 아니라 "sim-to-real 격차"라는 보편 개념을 다룬다.
// 1D 수직 착륙기: bang-bang 제어기를 튜닝해 부드럽게 착륙시키는 것이 목표.
// SIM에선 노이즈가 0이라 결정론적으로 완벽하지만, REAL에선 센서 노이즈·
// 액추에이터 지연·외란(바람)이 더해져 같은 제어기가 추락하기 시작한다.

const H0 = 120;            // 시작 고도 (m)
const DT = 0.08;           // 시간 스텝 (s)
const G = 9.8;             // 중력 가속도
const THRUST = 22;         // 엔진 감속 가속도 (엔진 ON일 때)
const SAFE_SPEED = 3.0;    // 이보다 느리게 닿아야 안전 착륙
const MAX_TICKS = 1500;

// 표준정규 난수 (Box-Muller)
const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const freshState = () => ({
    alt: H0,
    vel: 0,
    tick: 0,
    windAcc: 0,
    queue: [],
    engineOn: false,
    done: false,
    success: false,
    landingSpeed: 0,
});

// 물리 한 스텝 진행 — 라이브 애니메이션과 배치 실행이 공유한다.
const step = (s, ctrl, real) => {
    // 1) 센서 측정 (노이즈 주입)
    const measAlt = s.alt + gauss() * real.noise;
    const measVel = s.vel + gauss() * real.noise;

    // 2) 제어기 결정 — 고도가 낮을수록 허용 하강속도를 줄인다 (안전여유 만큼 일찍 제동)
    const effAlt = Math.max(0, measAlt - ctrl.margin);
    const desiredV = ctrl.target + ctrl.gain * effAlt;
    const cmd = measVel > desiredV; // true면 엔진 점화(감속)

    // 3) 액추에이터 지연 — 명령이 real.delay 틱 뒤에 반영된다
    s.queue.push(cmd);
    const applied = s.queue.length > real.delay ? s.queue.shift() : false;
    s.engineOn = applied;

    // 4) 외란(바람)은 천천히 변하는 가속도 교란
    s.windAcc += gauss() * real.wind * DT;
    s.windAcc = Math.max(-real.wind, Math.min(real.wind, s.windAcc));

    // 5) 동역학 적분 (아래 방향 vel 양수)
    const a = G - (applied ? THRUST : 0) + s.windAcc;
    s.vel += a * DT;
    s.alt -= s.vel * DT;
    s.tick += 1;

    if (s.alt <= 0) {
        s.alt = 0;
        s.done = true;
        s.landingSpeed = Math.max(0, s.vel);
        s.success = s.landingSpeed <= SAFE_SPEED;
    } else if (s.tick > MAX_TICKS) {
        s.done = true;
        s.landingSpeed = Math.max(0, s.vel);
        s.success = false;
    }
    return s;
};

// 한 번의 착륙을 끝까지 시뮬레이션
const runTrial = (ctrl, real) => {
    const s = freshState();
    while (!s.done) step(s, ctrl, real);
    return { success: s.success, speed: s.landingSpeed };
};

const ZERO_REAL = { noise: 0, delay: 0, wind: 0 };

const RealityGap = () => {
    const [ctrl, setCtrl] = useState({ gain: 0.35, target: 2.0, margin: 2 });
    const [real, setReal] = useState({ noise: 3, delay: 3, wind: 4 });
    const [mode, setMode] = useState('real');       // 라이브 실행에 쓸 모드
    const [status, setStatus] = useState('idle');    // idle | flying | safe | crash
    const [liveSpeed, setLiveSpeed] = useState(0);
    const [batch, setBatch] = useState(null);        // { sim:{rate,avg}, real:{rate,avg} }

    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const stateRef = useRef(freshState());

    const draw = useCallback((s, runMode, phase) => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const W = cv.width, Hc = cv.height;
        const top = 34, groundY = Hc - 46;

        ctx.clearRect(0, 0, W, Hc);
        // 배경
        ctx.fillStyle = '#0e1416';
        ctx.fillRect(0, 0, W, Hc);
        // 고도 눈금
        ctx.strokeStyle = 'rgba(205,211,209,0.10)';
        ctx.lineWidth = 1;
        for (let h = 0; h <= H0; h += 30) {
            const y = top + (1 - h / H0) * (groundY - top);
            ctx.beginPath();
            ctx.moveTo(30, y);
            ctx.lineTo(W - 12, y);
            ctx.stroke();
            ctx.fillStyle = 'rgba(205,211,209,0.35)';
            ctx.font = '10px "DM Mono", monospace';
            ctx.fillText(String(h), 6, y + 3);
        }
        // 착륙 패드
        ctx.fillStyle = phase === 'safe' ? '#37d67a' : phase === 'crash' ? '#ff5240' : '#ffb020';
        ctx.fillRect(W / 2 - 46, groundY, 92, 8);
        ctx.fillStyle = 'rgba(205,211,209,0.20)';
        ctx.fillRect(0, groundY + 8, W, Hc - groundY);

        // 착륙기
        const y = top + (1 - Math.max(0, s.alt) / H0) * (groundY - top);
        const cx = W / 2;
        if (s.engineOn && !s.done) {
            ctx.fillStyle = '#ffb020';
            ctx.beginPath();
            ctx.moveTo(cx - 7, y + 16);
            ctx.lineTo(cx + 7, y + 16);
            ctx.lineTo(cx, y + 16 + 14 + Math.random() * 8);
            ctx.closePath();
            ctx.fill();
        }
        ctx.fillStyle = phase === 'crash' ? '#ff5240' : '#e7ede9';
        ctx.fillRect(cx - 9, y, 18, 16);
        ctx.fillStyle = '#0e1416';
        ctx.fillRect(cx - 5, y + 4, 10, 5);
    }, []);

    // 라이브 착륙 실행
    const launch = useCallback((runMode) => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        const activeReal = runMode === 'sim' ? ZERO_REAL : real;
        stateRef.current = freshState();
        setMode(runMode);
        setStatus('flying');
        setBatch(null);

        const loop = () => {
            const s = stateRef.current;
            // 프레임당 3스텝 진행 (체감 속도)
            for (let i = 0; i < 3 && !s.done; i++) step(s, ctrl, activeReal);
            setLiveSpeed(s.vel);
            const phase = s.done ? (s.success ? 'safe' : 'crash') : 'flying';
            draw(s, runMode, phase);
            if (s.done) {
                setStatus(s.success ? 'safe' : 'crash');
                setLiveSpeed(s.landingSpeed);
                rafRef.current = null;
                return;
            }
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
    }, [ctrl, real, draw]);

    // SIM vs REAL 25회 배치 비교 — 실험의 핵심 결과
    const compare = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        setStatus('idle');
        const N = 25;
        const collect = (r) => {
            let ok = 0, sum = 0;
            for (let i = 0; i < N; i++) {
                const t = runTrial(ctrl, r);
                if (t.success) ok++;
                sum += t.speed;
            }
            return { rate: Math.round((ok / N) * 100), avg: (sum / N).toFixed(1) };
        };
        setBatch({ sim: collect(ZERO_REAL), real: collect(real) });
    }, [ctrl, real]);

    // 초기 화면 & 언마운트 정리
    useEffect(() => {
        draw(stateRef.current, 'sim', 'idle');
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [draw]);

    const statusText = {
        idle: '대기 중',
        flying: '하강 중…',
        safe: '안전 착륙',
        crash: '착륙 실패 — 추락',
    }[status];

    const slider = (id, label, val, min, max, stepv, unit, onChange) => (
        <div className="rg-slider">
            <label htmlFor={id} className="rg-slider-top">
                <span>{label}</span>
                <b>{val}{unit}</b>
            </label>
            <input
                id={id} type="range" min={min} max={max} step={stepv} value={val}
                onChange={(e) => onChange(parseFloat(e.target.value))}
            />
        </div>
    );

    return (
        <div className="rg-container">
            <div className="rg-inner">
                <Link to="/api-experiment" className="rg-back">← 실험실로</Link>

                <header className="rg-header">
                    <p className="rg-kicker">{'// SIM-TO-REAL TRANSFER'}</p>
                    <h1 className="rg-title">REALITY GAP</h1>
                    <p className="rg-sub">
                        시뮬레이션에선 완벽하던 제어기가 현실로 나오면 왜 무너질까.
                        착륙 제어기를 튜닝해 <b>SIM</b>에서 100% 성공시킨 뒤, <b>REAL</b>의
                        센서 노이즈·지연·외란 속에서도 버티게 만들어 보라.
                    </p>
                </header>

                <div className="rg-grid">
                    <section className="rg-stage">
                        <div className="rg-canvas-wrap" data-status={status}>
                            <canvas ref={canvasRef} width={340} height={440} className="rg-canvas" />
                            <div className="rg-hud">
                                <span className={`rg-badge rg-${mode}`}>{mode === 'sim' ? 'SIM' : 'REAL'}</span>
                                <span className={`rg-status rg-st-${status}`}>{statusText}</span>
                                <span className="rg-speed">
                                    {status === 'safe' || status === 'crash' ? '착륙속도' : '속도'} {Math.abs(liveSpeed).toFixed(1)} m/s
                                </span>
                                <span className="rg-thr">안전기준 ≤ {SAFE_SPEED} m/s</span>
                            </div>
                        </div>
                        <div className="rg-run-btns">
                            <button type="button" className="rg-btn rg-btn-sim" onClick={() => launch('sim')}>▶ SIM 착륙</button>
                            <button type="button" className="rg-btn rg-btn-real" onClick={() => launch('real')}>▶ REAL 착륙</button>
                        </div>
                    </section>

                    <section className="rg-panel">
                        <h2 className="rg-panel-title">제어기 튜닝</h2>
                        {slider('rg-gain', '제동 강도 (gain)', ctrl.gain, 0.05, 0.6, 0.01, '', (v) => setCtrl({ ...ctrl, gain: v }))}
                        {slider('rg-target', '목표 접지 속도', ctrl.target, 1.0, 4.0, 0.1, ' m/s', (v) => setCtrl({ ...ctrl, target: v }))}
                        {slider('rg-margin', '안전 여유 고도', ctrl.margin, 0, 20, 1, ' m', (v) => setCtrl({ ...ctrl, margin: v }))}

                        <h2 className="rg-panel-title rg-real-title">현실의 노이즈</h2>
                        {slider('rg-noise', '센서 노이즈 σ', real.noise, 0, 6, 0.5, '', (v) => setReal({ ...real, noise: v }))}
                        {slider('rg-delay', '액추에이터 지연', real.delay, 0, 6, 1, ' tick', (v) => setReal({ ...real, delay: v }))}
                        {slider('rg-wind', '외란(바람)', real.wind, 0, 8, 0.5, '', (v) => setReal({ ...real, wind: v }))}

                        <button type="button" className="rg-btn rg-btn-cmp" onClick={compare}>
                            SIM vs REAL 25회 비교 실행
                        </button>

                        {batch && (
                            <div className="rg-result">
                                <div className="rg-res-row">
                                    <span className="rg-res-label rg-sim">SIM</span>
                                    <div className="rg-bar"><i style={{ width: `${batch.sim.rate}%` }} className="rg-bar-sim" /></div>
                                    <b>{batch.sim.rate}%</b>
                                </div>
                                <div className="rg-res-row">
                                    <span className="rg-res-label rg-real">REAL</span>
                                    <div className="rg-bar"><i style={{ width: `${batch.real.rate}%` }} className="rg-bar-real" /></div>
                                    <b>{batch.real.rate}%</b>
                                </div>
                                <p className="rg-gap">
                                    리얼리티 갭 <strong>{batch.sim.rate - batch.real.rate}%p</strong>
                                    <span> · 평균 접지속도 SIM {batch.sim.avg} / REAL {batch.real.avg} m/s</span>
                                </p>
                            </div>
                        )}
                    </section>
                </div>

                <footer className="rg-note">
                    <p>
                        <b>왜 무너지나:</b> SIM은 노이즈가 0이라 제어기가 매 순간 정확한 고도·속도를 읽고 즉시 반응한다.
                        REAL에선 측정이 흔들리고(노이즈), 명령이 늦게 먹히고(지연), 예상 밖 힘(외란)이 더해져
                        같은 파라미터가 과속 접지로 이어진다. <b>안전 여유 고도</b>를 키우면 더 일찍 제동해
                        격차를 좁힐 수 있지만 — 그만큼 보수적(느린)이 된다. 이것이 로봇을 현실에 내보낼 때의 근본 트레이드오프다.
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default RealityGap;
