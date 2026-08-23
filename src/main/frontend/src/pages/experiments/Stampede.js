import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Stampede.css';

// STAMPEDE — 재시도 폭주(retry storm)와 준안정 실패(metastable failure) 실험.
//
// 장애는 대개 원인이 사라지면 끝난다. 그런데 가끔, 원인이 사라졌는데도 끝나지 않는 장애가 있다.
// 실패한 요청이 곧바로 재시도로 돌아오고, 그 재시도가 서버를 다시 실패하게 만들고,
// 그 실패가 또 재시도를 낳는다. 이때 장애를 붙잡고 있는 건 처음의 원인이 아니라 "재시도" 자신이다.
// 이렇게 스스로를 먹여 살리는 고장 상태를 준안정 실패(metastable failure)라 부른다.
//
// 모델(한 틱 = 1초, 요청 단위는 "요청/틱"):
//   도착 = 신규(고정 BASE) + 이번 틱에 만기된 재시도
//   장애가 시작되는 순간에는 진행 중이던 요청(IN_FLIGHT)이 한꺼번에 실패한다 —
//     이 "같은 순간에 실패한 무리"가 있어야 동기화된 재시도 파도가 생긴다.
//   실효 처리량 = 정격 처리량 ÷ (1 + 1.2 × 초과분)      (초과분 = 도착/정격 − 1)
//       → 과부하일수록 타임아웃·컨텍스트 스위칭으로 낭비가 늘어 실제로 처리되는 양이 깎인다.
//         이 "낭비" 항이 폭주를 스스로 지탱하게 만드는 되먹임이다.
//   실패한 요청은 정책이 정한 시간 뒤에 다시 도착한다(시도 한도까지).
//
// 정책의 차이는 "언제 돌아오는가"뿐인데, 그 하나로 회복이 갈린다.

const CAP = 100;          // 정격 처리량 (요청/틱)
const SHOCK_CAP = 25;     // 장애 중 처리량
const SHOCK_TICKS = 6;    // 장애 지속 틱
const BASE = 55;          // 신규 요청 (요청/틱)
const IN_FLIGHT = 165;    // 장애가 시작되는 순간 한꺼번에 실패하는 진행 중 요청 (= BASE × 3)
const BACKOFF_BASE = 8;   // 지수 백오프의 첫 대기
const BACKOFF_CAP = 48;   // 지수 백오프 상한
const FIXED_DELAY = 8;    // 고정 간격 대기
const WINDOW = 132;       // 그래프에 남기는 틱 수
const TICK_MS = 110;
const STUCK_LIMIT = 85;   // 이 틱을 넘겨도 못 돌아오면 "준안정 실패"로 본다

const POLICIES = [
    {
        key: 'none',
        name: '즉시 재시도',
        en: 'no backoff',
        desc: '실패하자마자 다음 틱에 다시 던진다. 가장 흔한 기본값이자 가장 위험한 값.',
    },
    {
        key: 'fixed',
        name: '고정 간격',
        en: 'fixed delay',
        desc: '항상 8틱 뒤에 다시 던진다. 총량은 줄지만, 같은 순간에 실패한 무리가 같은 순간에 통째로 돌아온다.',
    },
    {
        key: 'exp',
        name: '지수 백오프',
        en: 'exponential backoff',
        desc: '재시도마다 대기를 두 배로 늘린다(8·16·32·48). 한 명이 보내는 총량은 크게 줄지만, 무리는 여전히 한 덩어리로 뭉쳐 온다.',
    },
    {
        key: 'jitter',
        name: '지수 백오프 + 지터',
        en: 'full jitter',
        desc: '대기를 0~한도 사이에서 저마다 무작위로 뽑는다. 한 덩어리였던 무리가 시간축에 고르게 흩어진다.',
    },
];

const delayFor = (policy, attempt) => {
    if (policy === 'none') return 1;
    if (policy === 'fixed') return FIXED_DELAY;
    const limit = Math.min(BACKOFF_BASE * Math.pow(2, attempt), BACKOFF_CAP);
    if (policy === 'exp') return limit;
    return 1 + Math.floor(Math.random() * limit); // full jitter
};

// 실패한 n개를 정책에 따라 미래 틱에 예약한다.
// 지터가 아닌 정책은 전부 같은 틱으로 뭉쳐 들어가고(파도), 지터는 낱개로 흩어진다.
const schedule = (cohorts, t, attempt, n, policy) => {
    if (n <= 0) return;
    if (policy !== 'jitter') {
        cohorts.push({ due: t + delayFor(policy, attempt), attempt: attempt + 1, n });
        return;
    }
    const buckets = new Map();
    for (let i = 0; i < n; i++) {
        const d = delayFor(policy, attempt);
        buckets.set(d, (buckets.get(d) || 0) + 1);
    }
    buckets.forEach((cnt, d) => cohorts.push({ due: t + d, attempt: attempt + 1, n: cnt }));
};

const initial = () => ({
    t: 0,
    shockLeft: 0,
    shockEndTick: null,
    cohorts: [],
    breaker: { state: 'closed', left: 0 },
    recentServed: [],
    goodStreak: 0,
    recoveredIn: null,
    gaveUp: 0,
    peakAmp: 1,
    backlog: 0,
    history: [],
});

const step = (s, p) => {
    const t = s.t + 1;
    const inShock = s.shockLeft > 0;
    const shockLeft = Math.max(0, s.shockLeft - 1);
    const shockEndTick = inShock && shockLeft === 0 ? t : s.shockEndTick;
    const cap = inShock ? SHOCK_CAP : CAP;

    // 1) 이번 틱에 만기된 재시도를 시도 횟수별로 모은다
    const pending = [];
    const due = new Map();
    let retryIn = 0;
    for (let i = 0; i < s.cohorts.length; i++) {
        const c = s.cohorts[i];
        if (c.due <= t) {
            due.set(c.attempt, (due.get(c.attempt) || 0) + c.n);
            retryIn += c.n;
        } else {
            pending.push(c);
        }
    }
    const arrivals = [{ attempt: 0, n: BASE }];
    due.forEach((n, attempt) => arrivals.push({ attempt, n }));
    const offered = BASE + retryIn;

    // 2) 서킷 브레이커 — 열려 있으면 아예 서버까지 가지 않고 즉시 실패(부하 차단)
    let breaker = p.breakerOn ? s.breaker : { state: 'closed', left: 0 };
    let admitFrac = 1;
    if (p.breakerOn) {
        if (breaker.state === 'open') {
            admitFrac = 0;
            breaker = breaker.left > 1 ? { state: 'open', left: breaker.left - 1 } : { state: 'half', left: 6 };
        } else if (breaker.state === 'half') {
            admitFrac = 0.25; // 반열림: 소량만 흘려 상태를 떠본다
        }
    }
    const admitted = offered * admitFrac;

    // 3) 처리 — 과부하일수록 실효 처리량이 깎인다(낭비되는 일)
    const effCap = cap / (1 + 1.2 * Math.max(0, admitted / cap - 1));
    const served = Math.min(admitted, effCap);
    const okFrac = admitted > 0 ? served / admitted : 0;
    const failRatio = admitted > 0 ? 1 - served / admitted : 0;

    // 4) 실패분을 정책에 따라 재예약. 재시도 예산이 켜져 있으면 최근 성공량의 25%까지만 허용.
    const avgServed = s.recentServed.length
        ? s.recentServed.reduce((a, b) => a + b, 0) / s.recentServed.length
        : BASE;
    let quota = p.budgetOn ? Math.max(8, 0.25 * avgServed) : Infinity;
    let gaveUp = s.gaveUp;
    for (let i = 0; i < arrivals.length; i++) {
        const a = arrivals[i];
        const blocked = Math.round(a.n * (1 - admitFrac));
        if (blocked > 0) gaveUp += blocked; // 차단된 요청은 재시도 없이 포기시킨다
        const failed = Math.round(a.n * admitFrac * (1 - okFrac));
        if (failed <= 0) continue;
        if (a.attempt >= p.maxAttempts) {
            gaveUp += failed;
            continue;
        }
        const allow = Math.min(failed, Math.max(0, Math.floor(quota)));
        quota -= allow;
        if (failed - allow > 0) gaveUp += failed - allow;
        schedule(pending, t, a.attempt, allow, p.policy);
    }

    // 5) 브레이커 상태 전이 (실제로 요청이 흐른 틱에서만 판단)
    if (p.breakerOn && admitFrac > 0) {
        if (breaker.state === 'closed' && failRatio > 0.45) {
            breaker = { state: 'open', left: 12 };
        } else if (breaker.state === 'half') {
            if (failRatio < 0.12) breaker = { state: 'closed', left: 0 };
            else breaker = breaker.left > 1 ? { state: 'half', left: breaker.left - 1 } : { state: 'open', left: 12 };
        }
    }

    let backlog = 0;
    for (let i = 0; i < pending.length; i++) backlog += pending[i].n;

    const recentServed = [...s.recentServed.slice(-9), served];
    const healthy = served >= BASE * 0.97 && backlog <= BASE * 0.25;
    const goodStreak = healthy ? s.goodStreak + 1 : 0;
    let recoveredIn = s.recoveredIn;
    if (recoveredIn === null && shockEndTick !== null && !inShock && goodStreak >= 3) {
        recoveredIn = Math.max(0, t - 2 - shockEndTick);
    }

    const rec = { t, fresh: BASE, retry: retryIn, served, cap, shock: inShock, shed: offered - admitted };
    const history = [...s.history.slice(-(WINDOW - 1)), rec];

    return {
        t,
        shockLeft,
        shockEndTick,
        cohorts: pending,
        breaker,
        recentServed,
        goodStreak,
        recoveredIn,
        gaveUp,
        peakAmp: Math.max(s.peakAmp, offered / BASE),
        backlog,
        history,
    };
};

const BREAKER_LABEL = { closed: '닫힘 (통과)', open: '열림 (차단)', half: '반열림 (탐색)' };

const Stampede = () => {
    const [running, setRunning] = useState(true);
    const [policy, setPolicy] = useState('none');
    const [maxAttempts, setMaxAttempts] = useState(6);
    const [breakerOn, setBreakerOn] = useState(false);
    const [budgetOn, setBudgetOn] = useState(false);
    const [view, setView] = useState(initial);

    const simRef = useRef(view);
    const paramsRef = useRef({ policy, maxAttempts, breakerOn, budgetOn });

    useEffect(() => {
        paramsRef.current = { policy, maxAttempts, breakerOn, budgetOn };
    });

    useEffect(() => {
        if (!running) return undefined;
        const id = setInterval(() => {
            simRef.current = step(simRef.current, paramsRef.current);
            setView(simRef.current);
        }, TICK_MS);
        return () => clearInterval(id);
    }, [running]);

    const inject = useCallback(() => {
        const s = simRef.current;
        // 장애가 시작되는 순간, 이미 날아가 있던 요청이 동시에 실패한다.
        // 이 "한 순간에 실패한 무리"가 곧 동기화된 재시도 파도의 씨앗이다.
        const cohorts = [...s.cohorts];
        schedule(cohorts, s.t, 0, IN_FLIGHT, paramsRef.current.policy);
        simRef.current = {
            ...s,
            cohorts,
            shockLeft: SHOCK_TICKS,
            shockEndTick: null,
            recoveredIn: null,
            goodStreak: 0,
            peakAmp: 1,
        };
        setView(simRef.current);
        setRunning(true);
    }, []);

    const reset = useCallback(() => {
        simRef.current = initial();
        setView(simRef.current);
    }, []);

    const last = view.history[view.history.length - 1];
    const offered = last ? last.fresh + last.retry : BASE;
    const amp = offered / BASE;
    const inShock = view.shockLeft > 0;
    const sinceShock = view.shockEndTick === null ? null : view.t - view.shockEndTick;

    let phase = 'idle';
    let verdict = '평시 — 장애를 주입해 보세요';
    if (inShock) {
        phase = 'shock';
        verdict = `장애 중 — 처리량이 ${SHOCK_CAP}/틱으로 떨어졌습니다 (${view.shockLeft}틱 남음)`;
    } else if (view.recoveredIn !== null) {
        phase = 'ok';
        verdict = `회복 완료 — 원인이 사라진 뒤 ${view.recoveredIn}틱 만에 정상 굿풋 복귀`;
    } else if (sinceShock !== null && sinceShock > STUCK_LIMIT) {
        phase = 'stuck';
        verdict = '준안정 실패 — 처리량은 이미 복구됐는데 재시도가 스스로를 먹여 살리며 장애를 붙잡고 있습니다';
    } else if (sinceShock !== null) {
        phase = 'recover';
        verdict = `회복 시도 중 — 원인이 사라진 지 ${sinceShock}틱, 아직 굿풋이 돌아오지 않았습니다`;
    }

    // ---- 그래프 ----
    const W = 660;
    const H = 200;
    const colW = W / WINDOW;
    let peak = 0;
    for (let i = 0; i < view.history.length; i++) {
        const h = view.history[i];
        if (h.fresh + h.retry > peak) peak = h.fresh + h.retry;
    }
    const yMax = Math.max(260, Math.ceil(peak / 60) * 60);
    const yOf = (v) => H - (v / yMax) * H;
    const capPath = view.history
        .map((h, i) => `${i === 0 ? 'M' : 'L'}${(i * colW).toFixed(1)},${yOf(h.cap).toFixed(1)} L${((i + 1) * colW).toFixed(1)},${yOf(h.cap).toFixed(1)}`)
        .join(' ');
    const servedPath = view.history
        .map((h, i) => `${i === 0 ? 'M' : 'L'}${(i * colW + colW / 2).toFixed(1)},${yOf(h.served).toFixed(1)}`)
        .join(' ');
    const active = POLICIES.find((x) => x.key === policy);

    return (
        <LabShell
            title="STAMPEDE"
            eyebrow="retry storm / metastable failure"
            subtitle={'// 원인이 사라져도 끝나지 않는 장애 — 재시도가 장애를 먹여 살릴 때'}
            path="stampede"
        >
            <section className="k-win sp-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">/service/</span>retry-policy</span>
                    <span className="meta k-mono">t={view.t} · {active.en}</span>
                </div>

                <div className="sp-toolbar">
                    <div className="sp-stat">
                        <span className="sp-stat-k k-mono">증폭 배수</span>
                        <span className={`sp-stat-v ${amp > 1.4 ? 'is-hot' : ''}`}>{amp.toFixed(2)}×</span>
                    </div>
                    <div className="sp-stat">
                        <span className="sp-stat-k k-mono">굿풋 (성공/틱)</span>
                        <span className={`sp-stat-v ${last && last.served >= BASE * 0.97 ? 'is-ok' : ''}`}>
                            {last ? Math.round(last.served) : 0}
                            <em> / {BASE}</em>
                        </span>
                    </div>
                    <div className="sp-stat">
                        <span className="sp-stat-k k-mono">최고 증폭</span>
                        <span className={`sp-stat-v ${view.peakAmp > 4 ? 'is-hot' : ''}`}>{view.peakAmp.toFixed(1)}×</span>
                    </div>
                    <div className="sp-stat">
                        <span className="sp-stat-k k-mono">대기 중 재시도</span>
                        <span className="sp-stat-v">{Math.round(view.backlog)}</span>
                    </div>
                    <div className="sp-stat">
                        <span className="sp-stat-k k-mono">누적 포기</span>
                        <span className="sp-stat-v">{Math.round(view.gaveUp).toLocaleString()}</span>
                    </div>
                    <div className="sp-actions">
                        <button type="button" className="sp-btn sp-btn-hot" onClick={inject}>⚡ 장애 주입</button>
                        <button type="button" className="sp-btn" onClick={() => setRunning((v) => !v)}>
                            {running ? '⏸ 일시정지' : '▶ 재생'}
                        </button>
                        <button type="button" className="sp-btn sp-btn-ghost" onClick={reset}>↺ 리셋</button>
                    </div>
                </div>

                <div className={`sp-verdict is-${phase}`}>
                    <span className="sp-verdict-k k-mono">state</span>
                    <span className="sp-verdict-v">{verdict}</span>
                </div>

                <div className="sp-chartwrap">
                    <svg className="sp-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="틱별 도착 요청과 처리량">
                        {view.history.map((h, i) => (
                            h.shock ? (
                                <rect
                                    key={`s${h.t}`}
                                    className="sp-shockband"
                                    x={i * colW}
                                    y="0"
                                    width={colW + 0.6}
                                    height={H}
                                />
                            ) : null
                        ))}
                        {view.history.map((h, i) => {
                            const x = i * colW + 0.4;
                            const w = Math.max(1, colW - 0.9);
                            const freshH = (h.fresh / yMax) * H;
                            const retryH = (h.retry / yMax) * H;
                            return (
                                <g key={`b${h.t}`}>
                                    <rect className="sp-bar-fresh" x={x} y={H - freshH} width={w} height={freshH} />
                                    {retryH > 0.4 && (
                                        <rect className="sp-bar-retry" x={x} y={H - freshH - retryH} width={w} height={retryH} />
                                    )}
                                </g>
                            );
                        })}
                        {capPath && <path className="sp-cap" d={capPath} />}
                        {servedPath && <path className="sp-served" d={servedPath} />}
                    </svg>
                    <ul className="sp-legend k-mono">
                        <li><i className="sw sw-fresh" />신규 요청 {BASE}/틱</li>
                        <li><i className="sw sw-retry" />재시도</li>
                        <li><i className="sw sw-cap" />처리 용량</li>
                        <li><i className="sw sw-served" />실제 성공(굿풋)</li>
                    </ul>
                </div>

                <div className="sp-controls">
                    <div className="sp-policies">
                        <span className="sp-label k-mono">재시도 정책</span>
                        <div className="sp-policy-row">
                            {POLICIES.map((pol) => (
                                <button
                                    key={pol.key}
                                    type="button"
                                    className={`sp-policy ${policy === pol.key ? 'is-on' : ''}`}
                                    onClick={() => setPolicy(pol.key)}
                                >
                                    <span className="nm">{pol.name}</span>
                                    <span className="en k-mono">{pol.en}</span>
                                </button>
                            ))}
                        </div>
                        <p className="sp-policy-desc">{active.desc}</p>
                    </div>

                    <div className="sp-guards">
                        <span className="sp-label k-mono">완충 장치</span>
                        <label className={`sp-switch ${breakerOn ? 'is-on' : ''}`}>
                            <input type="checkbox" checked={breakerOn} onChange={(e) => setBreakerOn(e.target.checked)} />
                            <span className="nm">서킷 브레이커</span>
                            <span className="sub">실패율이 높으면 아예 통로를 닫아 부하를 끊는다 · 현재 {BREAKER_LABEL[view.breaker.state]}</span>
                        </label>
                        <label className={`sp-switch ${budgetOn ? 'is-on' : ''}`}>
                            <input type="checkbox" checked={budgetOn} onChange={(e) => setBudgetOn(e.target.checked)} />
                            <span className="nm">재시도 예산</span>
                            <span className="sub">재시도를 최근 성공량의 25%까지만 허용한다 · 초과분은 그냥 포기</span>
                        </label>
                        <label className="sp-range">
                            <span className="nm">최대 재시도 횟수 <b>{maxAttempts}</b></span>
                            <input
                                type="range"
                                min="0"
                                max="8"
                                value={maxAttempts}
                                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                            />
                        </label>
                    </div>
                </div>

                <p className="sp-hint">
                    {'먼저 '}<b>즉시 재시도</b>{'로 ⚡ 장애를 주입해 보세요. 6틱 뒤 처리 용량은 원래대로 돌아오지만 '}
                    {'막대는 용량선 위에 얹힌 채 내려오지 않습니다 — 장애를 붙잡고 있는 건 이제 처음의 원인이 아니라 재시도입니다. '}
                    {'다음은 '}<b>지수 백오프</b>{': 회복은 하지만 도착 막대가 평평한 계단처럼 뭉쳐 오는 것이 보입니다. '}
                    {'같은 순간에 실패한 무리가 같은 계산식을 써서 같은 순간에 돌아오기 때문입니다. '}
                    {'마지막으로 '}<b>지터</b>{'를 더해 보세요 — 계단이 사라지고 최고 증폭이 크게 낮아집니다. '}
                    {'그다음엔 '}<b>최대 재시도 횟수</b>{'를 4와 6 사이에서 오가며 붕괴와 회복이 갈리는 경계를 찾아보세요.'}
                </p>

                <div className="k-resize"></div>
            </section>

            <section className="k-win sp-foot-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="sp-foot">
                    <p>
                        {'재시도는 거의 모든 클라이언트의 기본 예의다. 한 번 실패했다고 사용자에게 오류를 던지는 대신 '}
                        {'조용히 다시 시도한다. 문제는 이 예의가 '}<b>모두가 동시에 실패했을 때</b>{'도 똑같이 작동한다는 점이다. '}
                        {'서버가 잠깐 흔들려 1,000개의 요청이 한꺼번에 실패하면, 다음 순간 1,000개의 재시도가 '}
                        {'원래 트래픽 위에 그대로 얹혀 돌아온다.'}
                    </p>
                    <p>
                        {'여기에 한 가지 되먹임이 더해지면 장애가 스스로를 지탱하기 시작한다. 과부하 상태의 서버는 '}
                        {'이미 클라이언트가 포기한 요청을 붙들고 일하거나, 큐에서 썩은 작업을 꺼내 처리하느라 '}
                        {'용량의 상당 부분을 '}<b>낭비</b>{'한다. 그래서 부하가 늘수록 실제로 처리되는 양은 오히려 줄고, '}
                        {'더 많은 실패가 더 많은 재시도를 낳는다. 원인(처리 용량 급감)이 사라져도 이 순환은 남는다 — '}
                        {'이것이 '}<b>준안정 실패</b>{'다. 사람이 개입해 트래픽을 끊어 주기 전까지 끝나지 않는다.'}
                    </p>
                    <p>
                        {'백오프는 "한 클라이언트가 얼마나 자주 보내는가"를 줄이지만, "여럿이 같은 순간에 보내는가"는 '}
                        {'고치지 못한다. 같은 틱에 실패한 무리는 같은 계산식을 써서 같은 틱에 되돌아온다. '}
                        {'그 뭉침을 푸는 것이 '}<b>지터</b>{' — 대기 시간을 정해진 값이 아니라 0부터 한도 사이의 난수로 뽑아 '}
                        {'파도를 시간축에 흩뿌린다. 백오프가 총량을 줄이고, 지터가 동기화를 깬다. 둘은 한 쌍이다.'}
                    </p>
                    <p>
                        {'그래도 부족할 때를 위한 것이 '}<b>서킷 브레이커</b>{'(실패가 임계를 넘으면 통로를 닫아 서버에게 숨 쉴 틈을 준다)와 '}
                        <b>재시도 예산</b>{'(재시도 트래픽을 성공 트래픽의 일정 비율로 묶어 증폭 자체에 상한을 건다)이다. '}
                        {'재시도 횟수를 0으로 내려 보면 알 수 있다 — 폭주는 사라지지만 실패한 요청은 그대로 사용자의 오류가 된다. '}
                        {'재시도는 없애야 할 것이 아니라 '}<b>예산을 정해 관리해야 할 자원</b>{'에 가깝다.'}
                    </p>
                    <p className="sp-disclaimer">
                        {'* 특정 서비스의 장애 사례가 아니라 재시도 동역학의 일반 구조를 다룬 단순화 모형입니다. '}
                        {'신규 요청은 일정한 속도로 들어오고, 장애 순간에 진행 중이던 요청이 한꺼번에 실패한다고 가정합니다. '}
                        {'처리 용량·과부하 낭비 계수·브레이커 임계값은 개념 전달을 위해 정한 값이며 실제 측정치가 아닙니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Stampede;
