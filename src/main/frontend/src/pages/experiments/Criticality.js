import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Criticality.css';

// CRITICALITY — 지연 중성자로 다스리는 원자로 연쇄반응 동역학 실험.
//   핵분열은 중성자를 낳고 그 중성자가 다음 분열을 부른다. 한 세대의 중성자가 다음 세대에서
//   몇 배가 되는지가 증배계수 k, 반응도는 ρ = (k−1)/k 다. ρ>0이면 출력이 지수로 커진다.
//   문제는 속도다 — 분열에서 곧바로 나오는 "즉발 중성자"의 세대 시간 Λ은 ~0.1ms라,
//   즉발만으로 임계를 넘으면 출력이 수십 ms 만에 폭주해 사람이 손쓸 수 없다.
//   원자로를 제어 가능하게 만드는 건 분열 조각이 몇 초 뒤 뒤늦게 내놓는 "지연 중성자"(약 β=0.65%)다.
//   지연 중성자 덕에 정상 운전의 반응 시간이 초 단위로 늘어난다. 반응도가 ρ=β(=$1.00)를 넘는
//   "즉발임계"가 되면 지연 중성자의 도움 없이도 연쇄가 유지돼 다시 폭주한다 — 그 경계가 이 실험의 주제.
//
//   점동역학(one-group point kinetics):
//     dn/dt = ((ρ−β)/Λ)·n + λ·C          (n: 중성자 개체수 ∝ 출력)
//     dC/dt = (β/Λ)·n − λ·C               (C: 지연 중성자 선행핵 농도)
//   반응도를 β 단위로 재면 "달러($)"다: ρ$ = ρ/β. ρ$=1 이 즉발임계 경계.

const BETA = 0.0065;      // 지연 중성자 비율 β (~0.65%)
const LAMBDA_GEN = 1e-4;  // 즉발 중성자 세대 시간 Λ (s)
const DECAY = 0.077;      // 선행핵 붕괴 상수 λ (1-group 평균, s^-1)

const N0 = 100;                                 // 기준 출력 (=100%)
const C0 = (BETA * N0) / (LAMBDA_GEN * DECAY);  // ρ=0 정상상태 선행핵 농도

const P_MIN = 1e-2;   // 출력 표시 하한 (%)
const P_MAX = 1e8;    // 출력 표시 상한 (%)
const LOG_LO = Math.log10(P_MIN);
const LOG_HI = Math.log10(P_MAX);

const RHO_MIN = -4;    // 제어봉 완전 삽입 시 반응도 ($)
const RHO_MAX = 1.3;   // 제어봉 완전 인출 시 반응도 ($) — 즉발임계 너머까지

const HISTORY = 200;
const DT_SUB = 0.002;  // 적분 하위 스텝 (s) — 깊은 음반응도에서도 안정
const TICK_MS = 40;

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// 한 하위 스텝 전진 (오일러). rho는 실제 반응도(달러 아님).
function step(s, rho, dt, delayed) {
    let dn;
    let dC;
    if (delayed) {
        dn = ((rho - BETA) / LAMBDA_GEN) * s.n + DECAY * s.C;
        dC = (BETA / LAMBDA_GEN) * s.n - DECAY * s.C;
    } else {
        // 지연 중성자를 끄면 모든 중성자가 즉발 — 세대 시간 Λ이 그대로 응답 시간이 된다.
        dn = (rho / LAMBDA_GEN) * s.n;
        dC = 0;
    }
    const n = clamp(s.n + dn * dt, 1e-6, 1e12);
    const C = Math.max(0, s.C + dC * dt);
    return { n, C };
}

// 현재 상태에서 순간 변화율 → 노심 주기 T = n / (dn/dt).
function instRate(s, rho, delayed) {
    if (delayed) return ((rho - BETA) / LAMBDA_GEN) * s.n + DECAY * s.C;
    return (rho / LAMBDA_GEN) * s.n;
}

const SPEEDS = [0.5, 1, 2, 4];

const Criticality = () => {
    const [rho$, setRho$] = useState(0);        // 제어봉 반응도 (달러)
    const [delayed, setDelayed] = useState(true);
    const [running, setRunning] = useState(true);
    const [speed, setSpeed] = useState(1);

    // HUD (스로틀된 스칼라들)
    const [power, setPower] = useState(N0);
    const [rate, setRate] = useState(0);        // dn/dt (주기 계산용)
    const [hist, setHist] = useState([Math.log10(N0)]);

    // 루프가 최신 컨트롤을 읽도록 ref 미러
    const rhoRef = useRef(rho$);
    const delayedRef = useRef(delayed);
    const runningRef = useRef(running);
    const speedRef = useRef(speed);
    const stateRef = useRef({ n: N0, C: C0 });
    const histRef = useRef([Math.log10(N0)]);

    useEffect(() => { rhoRef.current = rho$; }, [rho$]);
    useEffect(() => { delayedRef.current = delayed; }, [delayed]);
    useEffect(() => { runningRef.current = running; }, [running]);
    useEffect(() => { speedRef.current = speed; }, [speed]);

    // 시뮬레이션 틱
    useEffect(() => {
        const id = setInterval(() => {
            if (!runningRef.current) return;
            const rho = rhoRef.current * BETA;
            const dOn = delayedRef.current;
            const total = TICK_MS / 1000 * speedRef.current; // 이번 틱의 원자로 시간(s)
            const subs = Math.max(1, Math.ceil(total / DT_SUB));
            const dt = total / subs;
            let s = stateRef.current;
            for (let i = 0; i < subs; i++) s = step(s, rho, dt, dOn);
            stateRef.current = s;

            const pctLog = clamp(Math.log10(clamp(s.n, P_MIN, P_MAX)), LOG_LO, LOG_HI);
            const nh = [...histRef.current, pctLog];
            if (nh.length > HISTORY) nh.splice(0, nh.length - HISTORY);
            histRef.current = nh;

            setPower(s.n);
            setRate(instRate(s, rho, dOn));
            setHist(nh);
        }, TICK_MS);
        return () => clearInterval(id);
    }, []);

    const reset = useCallback(() => {
        setRunning(false);
        stateRef.current = { n: N0, C: C0 };
        histRef.current = [Math.log10(N0)];
        setPower(N0);
        setRate(0);
        setHist([Math.log10(N0)]);
        setRho$(0);
        rhoRef.current = 0;
    }, []);

    const scram = useCallback(() => {
        setRho$(RHO_MIN);
        rhoRef.current = RHO_MIN;   // 즉시 반영 (다음 틱 전에 제어봉 투입)
        setRunning(true);
    }, []);

    const nudge = (d) => setRho$((v) => clamp(Math.round((v + d) * 100) / 100, RHO_MIN, RHO_MAX));

    // ---- 파생값 ----
    const rho = rho$ * BETA;
    const pcm = Math.round(rho * 1e5);
    const powerPct = power; // N0=100 기준이므로 곧 %
    const promptMargin = 1 - rho$;   // 즉발임계까지 남은 달러

    // 노심 주기 / 배가·감쇠 시간
    const T = Math.abs(rate) > 1e-6 ? power / rate : Infinity;
    const periodAbs = Math.abs(T);
    const doubling = Number.isFinite(T) ? Math.LN2 * periodAbs : Infinity;

    // 상태 판정
    let status;
    let scls;
    if (rho$ > 1.0 + 1e-9) { status = '즉발임계'; scls = 'prompt'; }
    else if (rho$ > 0.005) { status = '초임계'; scls = 'super'; }
    else if (rho$ < -0.005) { status = '미임계'; scls = 'sub'; }
    else { status = '임계'; scls = 'crit'; }

    // 제어봉 삽입 깊이 (%) — 인출↔삽입
    const rodInsert = clamp((RHO_MAX - rho$) / (RHO_MAX - RHO_MIN) * 100, 0, 100);

    // 노심 발광 강도 (로그 출력 정규화)
    const glow = clamp((Math.log10(clamp(power, P_MIN, P_MAX)) - LOG_LO) / (LOG_HI - LOG_LO), 0, 1);

    // 출력 폭주 여부
    const runaway = power >= P_MAX * 0.999;
    const scrammed = power <= P_MIN * 1.5;

    // 차트 폴리라인
    const chart = useMemo(() => {
        const n = hist.length;
        if (n === 0) return '';
        return hist.map((lp, i) => {
            const x = n === 1 ? 100 : (i / (HISTORY - 1)) * 100;
            const y = 100 - ((lp - LOG_LO) / (LOG_HI - LOG_LO)) * 100;
            return `${x.toFixed(2)},${y.toFixed(2)}`;
        }).join(' ');
    }, [hist]);

    const y100 = 100 - ((Math.log10(N0) - LOG_LO) / (LOG_HI - LOG_LO)) * 100; // 100% 기준선

    // 제어봉 채널 (시각용)
    const rods = [0, 1, 2, 3, 4, 5, 6];

    const fmtPower = (p) => {
        if (p >= 1e6) return `${(p / 1e6).toFixed(2)}M%`;
        if (p >= 1e3) return `${(p / 1e3).toFixed(1)}k%`;
        if (p >= 10) return `${p.toFixed(0)}%`;
        if (p >= 1) return `${p.toFixed(1)}%`;
        return `${p.toFixed(2)}%`;
    };
    const fmtTime = (t) => {
        if (!Number.isFinite(t)) return '∞';
        if (t >= 100) return `${t.toFixed(0)}s`;
        if (t >= 1) return `${t.toFixed(1)}s`;
        return `${(t * 1000).toFixed(0)}ms`;
    };

    return (
        <LabShell
            title="CRITICALITY"
            eyebrow="reactor kinetics · delayed neutrons"
            subtitle={'// 폭주하는 연쇄반응을 사람이 손쓸 수 있게 만드는 건 0.65%의 지연 중성자다'}
            path="criticality.exe"
        >
            <section className="k-win cr-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/core/</span>point-kinetics</span>
                    <span className="meta k-mono">Λ={LAMBDA_GEN.toExponential(0)}s · β={(BETA * 100).toFixed(2)}%</span>
                </div>

                <div className="cr-stage">
                    {/* ---- 왼쪽: 노심 ---- */}
                    <div className="cr-core-col">
                        <div className={`cr-vessel cr-${scls}`} style={{ '--glow': glow }}>
                            <div className="cr-vessel-head k-mono">노심 (CORE)</div>
                            <div className="cr-channels">
                                {rods.map((r) => (
                                    <div className="cr-channel" key={r}>
                                        <div
                                            className="cr-rod"
                                            style={{ height: `${rodInsert}%` }}
                                        />
                                    </div>
                                ))}
                                <div className="cr-flux" style={{ opacity: 0.15 + glow * 0.85 }} />
                                {runaway && <div className="cr-overheat k-mono">출력 폭주</div>}
                                {scrammed && <div className="cr-cold k-mono">정지 (SHUTDOWN)</div>}
                            </div>
                            <div className="cr-vessel-foot k-mono">
                                <span>제어봉 삽입 {rodInsert.toFixed(0)}%</span>
                                <span className={`cr-badge cr-badge-${scls}`}>{status}</span>
                            </div>
                        </div>

                        {/* 제어봉 반응도 */}
                        <div className="cr-controls">
                            <label className="cr-ctl">
                                <span className="cr-ctl-lab k-mono">
                                    제어봉 반응도 ρ <b>${rho$.toFixed(2)}</b>
                                    <span className="cr-ctl-hint">← 삽입(음) · 인출(양) →</span>
                                </span>
                                <input
                                    type="range" min={RHO_MIN} max={RHO_MAX} step="0.01"
                                    value={rho$}
                                    onChange={(e) => setRho$(parseFloat(e.target.value))}
                                    className="cr-range"
                                />
                                <div className="cr-scale k-mono">
                                    <span>${RHO_MIN.toFixed(0)}</span>
                                    <span className="cr-scale-crit">임계 $0</span>
                                    <span className="cr-scale-prompt">즉발임계 $1</span>
                                </div>
                            </label>

                            <div className="cr-nudge">
                                <button type="button" className="cr-btn cr-btn-ghost" onClick={() => nudge(-0.05)}>− $0.05</button>
                                <button type="button" className="cr-btn cr-btn-ghost" onClick={() => nudge(0.05)}>+ $0.05</button>
                                <button
                                    type="button"
                                    className={`cr-btn cr-btn-delay${delayed ? ' cr-on' : ''}`}
                                    onClick={() => setDelayed((d) => !d)}
                                    title="지연 중성자를 끄면 원자로가 제어 불가능해진다"
                                >
                                    지연 중성자 {delayed ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        </div>

                        <div className="cr-actions">
                            <button type="button" className="cr-btn cr-btn-warm" onClick={() => setRunning((r) => !r)}>
                                {running ? '⏸ 정지' : '▶ 재개'}
                            </button>
                            <button type="button" className="cr-btn cr-btn-scram" onClick={scram}>
                                ⏹ SCRAM
                            </button>
                            <button type="button" className="cr-btn cr-btn-ghost" onClick={reset}>
                                ↻ 초기화
                            </button>
                            <div className="cr-speed">
                                {SPEEDS.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        className={`cr-sbtn${speed === s ? ' cr-sbtn-on' : ''}`}
                                        onClick={() => setSpeed(s)}
                                    >
                                        {s}×
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ---- 오른쪽: 계기판 ---- */}
                    <div className="cr-right">
                        {/* 출력 그래프 */}
                        <div className="cr-chart-box">
                            <div className="cr-chart-head k-mono">
                                <span>출력 (로그 눈금 · 0.01%↔10⁸%)</span>
                                <span className={`cr-pow cr-pow-${scls}`}>{fmtPower(powerPct)}</span>
                            </div>
                            <svg className="cr-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
                                {[1e6, 1e4, 1e2, 1e0].map((mark) => {
                                    const yy = 100 - ((Math.log10(mark) - LOG_LO) / (LOG_HI - LOG_LO)) * 100;
                                    return <line key={mark} x1="0" x2="100" y1={yy} y2={yy} className="cr-grid" />;
                                })}
                                <line x1="0" x2="100" y1={y100} y2={y100} className="cr-base" />
                                <polyline points={chart} className={`cr-line cr-line-${scls}`} />
                            </svg>
                            <div className="cr-chart-foot k-mono">
                                <span>─ 100% 정상 운전선</span>
                                <span>{running ? '● 가동 중' : '‖ 정지'}</span>
                            </div>
                        </div>

                        {/* 게이지 */}
                        <div className="cr-gauges">
                            <div className={`cr-gauge cr-g-${scls}`}>
                                <span className="cr-g-lab k-mono">반응도 ρ</span>
                                <span className="cr-g-val">${rho$.toFixed(2)}</span>
                                <span className="cr-g-sub k-mono">{pcm >= 0 ? '+' : ''}{pcm} pcm</span>
                            </div>
                            <div className={`cr-gauge ${promptMargin <= 0 ? 'cr-g-prompt' : promptMargin < 0.3 ? 'cr-g-super' : ''}`}>
                                <span className="cr-g-lab k-mono">즉발임계 여유</span>
                                <span className="cr-g-val">${promptMargin.toFixed(2)}</span>
                                <span className="cr-g-sub k-mono">{promptMargin <= 0 ? '경계 초과!' : '$1까지 남음'}</span>
                            </div>
                            <div className="cr-gauge">
                                <span className="cr-g-lab k-mono">노심 주기 T</span>
                                <span className="cr-g-val">{T > 0 ? '+' : '−'}{fmtTime(periodAbs)}</span>
                                <span className="cr-g-sub k-mono">{T > 0 ? '상승' : T < 0 ? '하강' : '정상'}</span>
                            </div>
                            <div className="cr-gauge">
                                <span className="cr-g-lab k-mono">{T >= 0 ? '배가 시간' : '반감 시간'}</span>
                                <span className="cr-g-val">{fmtTime(doubling)}</span>
                                <span className="cr-g-sub k-mono">출력 ×2 / ÷2</span>
                            </div>
                        </div>

                        {/* 판정 */}
                        <div className={`cr-verdict cr-v-${scls}`}>
                            <p className="cr-verdict-txt">
                                {!delayed
                                    ? '지연 중성자를 껐다 — 이제 응답 시간은 즉발 세대 시간 Λ(~0.1ms)뿐. 조금만 인출해도 출력이 눈 깜짝할 새 폭주하거나 꺼진다. 실제 원자로가 이렇다면 아무도 제어할 수 없다.'
                                    : scls === 'prompt'
                                        ? '즉발임계 — 지연 중성자의 도움 없이 즉발 중성자만으로 연쇄가 유지된다. 주기가 ms로 줄어 출력이 통제 불능으로 치솟는다. 이 경계($1)를 넘지 않는 것이 원자로 안전의 핵심이다.'
                                        : scls === 'super'
                                            ? '초임계 — 출력이 지수로 상승한다. 하지만 지연 중성자 덕에 주기가 초 단위라, 제어봉으로 따라잡을 수 있는 속도다.'
                                            : scls === 'sub'
                                                ? '미임계 — 연쇄가 스스로 유지되지 못하고 출력이 서서히 잦아든다. 제어봉을 조금 뽑아 ρ를 0으로 올려보라.'
                                                : '임계 — ρ=0, 한 세대의 중성자가 다음 세대에서 정확히 같은 수를 만든다. 출력이 일정하게 유지되는 정상 운전 상태다.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win cr-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="cr-foot">
                    <p>
                        {'2026년, AI와 데이터센터의 폭증하는 전력 수요가 원자력을 다시 무대 위로 끌어올렸다는 이야기가 곳곳에서 오르내렸다. '}
                        {'특정 사업자·발전소·사건이 아니라 그 밑바탕의 보편적 물음 — '}
                        <b>{'지수로 스스로를 부풀리는 연쇄반응을, 어떻게 사람이 손쓸 수 있는 속도로 붙잡아 두는가'}</b>
                        {' — 를 이 실험에 담았다.'}
                    </p>
                    <p>
                        {'핵분열 하나는 중성자를 여럿 낳고, 그 중성자가 다음 분열을 부른다. 한 세대가 다음 세대에서 몇 배가 되는지가 '}
                        <b>{'증배계수 k'}</b>{'이고, 그 초과분을 잰 것이 '}<b>{'반응도 ρ = (k−1)/k'}</b>{'다. ρ가 0보다 크면 출력은 지수로 커진다. '}
                        {'문제는 속도다. 분열에서 곧바로 튀어나오는 '}<b>{'즉발 중성자'}</b>{'의 세대 시간 Λ은 약 0.1ms — 즉발 중성자만으로 임계를 넘으면 '}
                        {'출력이 수십 밀리초 만에 폭주해, 어떤 기계도 사람도 따라잡을 수 없다.'}
                    </p>
                    <p>
                        {'원자로를 제어 가능하게 만드는 건 놀랍게도 전체의 '}<b>{'0.65%'}</b>{'에 불과한 '}<b>{'지연 중성자(delayed neutrons)'}</b>{'다. '}
                        {'분열 조각 중 일부가 몇 초 뒤 뒤늦게 붕괴하며 중성자를 내놓는데, 이 지각생들이 전체 연쇄의 박자를 초 단위로 늘려 준다. '}
                        {'그래서 정상 운전에서는 제어봉을 조금씩 넣고 빼는 것만으로 출력을 따라잡을 수 있다. '}
                        {'반응도를 β 단위로 재면 "달러($)"가 되는데, '}<b>{'ρ = β (= $1.00)'}</b>{'를 넘는 순간이 '}<b>{'즉발임계'}</b>{' — '}
                        {'지연 중성자의 도움 없이 즉발 중성자만으로 연쇄가 유지돼, 다시 ms 단위 폭주로 돌아간다. 이 $1 경계를 넘지 않는 것이 안전의 핵심이다.'}
                    </p>
                    <p>
                        {'직접 밀고 당겨 보라. 제어봉을 살짝 뽑아 ρ를 '}<b>{'$0.2'}</b>{'쯤 두면 출력이 완만한 곡선으로 오르는 걸(초임계) — '}
                        {'주기 T가 초 단위라 따라잡을 만하다. ρ를 '}<b>{'$1'}</b>{' 너머로 밀면 곡선이 수직으로 꺾여 순식간에 상한에 부딪힌다(즉발임계). '}
                        <b>{'지연 중성자 OFF'}</b>{'를 눌러 보면, 같은 조작에도 원자로가 왜 통제 불능이 되는지 한눈에 드러난다 — 지각생들이 사라지면 응답 시간은 Λ뿐이다. '}
                        <b>{'SCRAM'}</b>{'은 제어봉을 한꺼번에 꽂아 반응도를 깊은 음수로 떨어뜨려 노심을 급정지시킨다.'}
                    </p>
                    <p className="cr-disclaimer">
                        {'* 1군(one-group) 점동역학의 핵심 구조(즉발 세대 시간 Λ, 지연 중성자 비율 β, 선행핵 붕괴 λ, 반응도의 달러 척도)만 남긴 개념 데모입니다. '}
                        {'6군 지연 중성자·온도/기포 되먹임·중성자 독물·공간 분포 등 실제 노심 물리는 크게 단순화했고, 파라미터도 교육용으로 조정했습니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Criticality;
