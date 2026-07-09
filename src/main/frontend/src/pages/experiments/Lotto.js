import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Lotto.css';

// LOTTO — 로또 6/45 1등 확률(8,145,060분의 1)을 눈으로 체감하는 실험.
// 핵심: 5등(1/45)·4등(1/733) 같은 작은 당첨은 자주 나와 "될 것 같은" 착각을 주지만,
// 1등은 8,145,060분의 1 — 아무리 사도 오지 않는다. 자동 구매로 티켓을 대량으로 사면서
// 등수별 당첨이 실제로 몇 번 나오는지 세어 보면, 5등은 수북이 쌓이는데 1등 칸은 계속 0에 머문다.
//   · 당첨 6개 + 보너스 1개를 뽑아두고, 무작위 티켓을 계속 사서 맞춰 본다.
//   · 캔버스는 산 티켓들을 등수별 색 점으로 흩뿌린다 — 대부분(약 97.6%)은 꽝(흐린 점).
//   · 장기적으로 수익률은 환급률(≈50%)을 따라 −50% 부근으로 수렴한다.

const POOL = 45;
const PICK = 6;
const TOTAL = 8145060;   // C(45,6)
const TICKET_COST = 1000;

// 등수 정의 — odds는 1/odds 확률, prize는 대표 당첨금(1~3등은 회차마다 변동, 4·5등은 고정).
const TIERS = [
    { rank: 1, label: '1등', match: '6개 일치', odds: 8145060, prize: 2000000000 },
    { rank: 2, label: '2등', match: '5개 + 보너스', odds: 1357510, prize: 50000000 },
    { rank: 3, label: '3등', match: '5개 일치', odds: 35724, prize: 1500000 },
    { rank: 4, label: '4등', match: '4개 일치', odds: 733, prize: 50000 },
    { rank: 5, label: '5등', match: '3개 일치', odds: 45, prize: 5000 },
];
const PRIZE = { 1: 2000000000, 2: 50000000, 3: 1500000, 4: 50000, 5: 5000 };

// 자동 구매 속도 — 프레임당 구매 장수(≈ ×60 = 초당).
const SPEEDS = [
    { label: '느리게', batch: 5 },
    { label: '보통', batch: 120 },
    { label: '빠르게', batch: 1000 },
    { label: '최고속', batch: 5000 },
];

// 당첨 번호(6개) + 보너스(1개)를 서로 다른 7개로 뽑는다.
function drawWinning() {
    const s = new Set();
    while (s.size < 7) s.add(1 + ((Math.random() * POOL) | 0));
    const arr = [...s];
    return { main: arr.slice(0, 6).sort((a, b) => a - b), bonus: arr[6] };
}

// 티켓 한 장(1~45 중 6개)을 뽑아 당첨 등수를 반환한다(0 = 꽝). seen은 재사용 버퍼.
function simTier(winFlag, bonus, seen, used) {
    let matches = 0, hitBonus = false, n = 0;
    while (n < PICK) {
        const x = 1 + ((Math.random() * POOL) | 0);
        if (seen[x]) continue;
        seen[x] = 1; used[n] = x; n += 1;
        if (winFlag[x]) matches += 1;
        if (x === bonus) hitBonus = true;
    }
    for (let i = 0; i < PICK; i += 1) seen[used[i]] = 0;
    if (matches === 6) return 1;
    if (matches === 5) return hitBonus ? 2 : 3;
    if (matches === 4) return 4;
    if (matches === 3) return 5;
    return 0;
}

// 실제 로또 공 색(번호대별) — 1~10 노랑, 11~20 파랑, 21~30 빨강, 31~40 회색, 41~45 초록.
const ballHue = (n) => (n <= 10 ? 'y' : n <= 20 ? 'b' : n <= 30 ? 'r' : n <= 40 ? 'k' : 'g');

// 캔버스 점 색/크기 — 등수가 높을수록 밝고 크게, 꽝은 거의 안 보이게.
function tierDot(t, dark) {
    switch (t) {
        case 1: return { color: '#f5b301', r: 3.4 };
        case 2: return { color: '#e8863a', r: 2.7 };
        case 3: return { color: dark ? '#7d97ff' : '#2D4FFF', r: 2.2 };
        case 4: return { color: dark ? 'rgba(125,151,255,0.7)' : 'rgba(45,79,255,0.62)', r: 1.8 };
        case 5: return { color: dark ? 'rgba(233,232,226,0.5)' : 'rgba(21,22,26,0.42)', r: 1.5 };
        default: return { color: dark ? 'rgba(233,232,226,0.10)' : 'rgba(21,22,26,0.09)', r: 1.1 };
    }
}

// ₩ 표기 — 큰 값은 조/억/만 단위로 접어 체감을 살린다.
function formatWon(n) {
    if (n >= 1e12) return `${(n / 1e12).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}조원`;
    if (n >= 1e8) return `${(n / 1e8).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억원`;
    if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString('ko-KR')}만원`;
    return `${n.toLocaleString('ko-KR')}원`;
}

const emptyStats = () => ({ tickets: 0, spent: 0, reward: 0, best: 0, counts: [0, 0, 0, 0, 0, 0] });

const Lotto = () => {
    const [winning, setWinning] = useState(drawWinning);
    const [playing, setPlaying] = useState(false);
    const [speedIdx, setSpeedIdx] = useState(1);
    const [stats, setStats] = useState(emptyStats);

    // 렌더 없이 프레임마다 갱신되는 값들은 ref로 유지한다.
    const statsRef = useRef(emptyStats());
    const winFlagRef = useRef(new Uint8Array(POOL + 1));
    const bonusRef = useRef(winning.bonus);
    const batchRef = useRef(SPEEDS[speedIdx].batch);
    const seenRef = useRef(new Uint8Array(POOL + 1));
    const usedRef = useRef(new Uint8Array(PICK));
    const rafRef = useRef(0);
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const sizeRef = useRef({ w: 0, h: 0 });

    // 당첨 번호가 바뀌면 조회용 플래그를 다시 만든다.
    useEffect(() => {
        const flag = new Uint8Array(POOL + 1);
        winning.main.forEach((n) => { flag[n] = 1; });
        winFlagRef.current = flag;
        bonusRef.current = winning.bonus;
    }, [winning]);

    useEffect(() => { batchRef.current = SPEEDS[speedIdx].batch; }, [speedIdx]);

    const isDark = () => (canvasRef.current?.closest('[data-theme]')?.getAttribute('data-theme')) === 'dark';

    // 캔버스 초기화 + 크기 대응.
    useEffect(() => {
        const cv = canvasRef.current;
        if (!cv) return undefined;
        const ctx = cv.getContext('2d');
        ctxRef.current = ctx;
        const paintBg = () => {
            const dark = isDark();
            ctx.fillStyle = dark ? '#0D0F13' : '#FCFAF4';
            ctx.fillRect(0, 0, sizeRef.current.w, sizeRef.current.h);
        };
        const resize = () => {
            const rect = cv.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            cv.width = Math.max(1, Math.floor(rect.width * dpr));
            cv.height = Math.max(1, Math.floor(rect.height * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            sizeRef.current = { w: rect.width, h: rect.height };
            paintBg();
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    // 이번 프레임에 산 티켓들을 등수별 색 점으로 흩뿌린다(이전 프레임은 서서히 페이드).
    const drawField = useCallback((outcomes) => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        const { w, h } = sizeRef.current;
        const dark = isDark();
        ctx.fillStyle = dark ? 'rgba(13,15,19,0.16)' : 'rgba(252,250,244,0.18)';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < outcomes.length; i += 1) {
            const d = tierDot(outcomes[i], dark);
            ctx.fillStyle = d.color;
            ctx.beginPath();
            ctx.arc(Math.random() * w, Math.random() * h, d.r, 0, 6.2832);
            ctx.fill();
        }
    }, []);

    // batch 장을 사서 통계에 누적하고, 표시용으로 최대 DRAW_CAP개만 점으로 남긴다.
    const buy = useCallback((batch) => {
        const DRAW_CAP = 700;
        const st = statsRef.current;
        const winFlag = winFlagRef.current;
        const bonus = bonusRef.current;
        const seen = seenRef.current;
        const used = usedRef.current;
        const drawStep = Math.max(1, Math.floor(batch / DRAW_CAP));
        const outcomes = [];
        for (let i = 0; i < batch; i += 1) {
            const t = simTier(winFlag, bonus, seen, used);
            st.tickets += 1;
            st.spent += TICKET_COST;
            if (t > 0) {
                st.counts[t] += 1;
                st.reward += PRIZE[t];
                if (st.best === 0 || t < st.best) st.best = t;
            }
            if (i % drawStep === 0 && outcomes.length < DRAW_CAP) outcomes.push(t);
        }
        drawField(outcomes);
        setStats({ tickets: st.tickets, spent: st.spent, reward: st.reward, best: st.best, counts: st.counts.slice() });
    }, [drawField]);

    // 자동 구매 루프 — playing 동안에만 rAF를 돈다(정지 시 캔버스는 정적 → 캡처 가능).
    const step = useCallback(() => {
        buy(batchRef.current);
        rafRef.current = requestAnimationFrame(step);
    }, [buy]);

    useEffect(() => {
        if (!playing) return undefined;
        rafRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafRef.current);
    }, [playing, step]);

    const reset = useCallback(() => {
        setPlaying(false);
        statsRef.current = emptyStats();
        setStats(emptyStats());
        const ctx = ctxRef.current;
        if (ctx) {
            ctx.fillStyle = isDark() ? '#0D0F13' : '#FCFAF4';
            ctx.fillRect(0, 0, sizeRef.current.w, sizeRef.current.h);
        }
    }, []);

    const redraw = useCallback(() => { reset(); setWinning(drawWinning()); }, [reset]);

    const c = stats.counts;
    const roi = stats.spent > 0 ? ((stats.reward - stats.spent) / stats.spent) * 100 : 0;
    const expected1 = stats.tickets / TOTAL;   // 지금까지 구매의 1등 기대 횟수(대개 1보다 훨씬 작다)
    const maxCount = Math.max(1, c[1], c[2], c[3], c[4], c[5]);

    return (
        <LabShell
            title="LOTTO"
            eyebrow="1 in 8,145,060"
            subtitle={'// 5등은 수북이 쌓여도 1등은 오지 않는다 — 8,145,060분의 1을 눈으로 세어 보기'}
            path="lotto.exe"
        >
            {/* ── 자동 구매 시뮬레이터 ── */}
            <section className="k-win lo-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/lotto/</span>auto-buy</span>
                    <span className="meta k-mono">6 / 45 · 1등 1/{TOTAL.toLocaleString()}</span>
                </div>

                {/* 당첨 번호 */}
                <div className="lo-draw">
                    <span className="lo-draw-lab k-mono">이번 추첨</span>
                    <div className="lo-balls">
                        {winning.main.map((n) => (
                            <span key={n} className={`lo-ball lo-ball--${ballHue(n)}`}>{n}</span>
                        ))}
                        <span className="lo-plus" aria-hidden="true">+</span>
                        <span className={`lo-ball lo-ball--${ballHue(winning.bonus)} is-bonus`}>{winning.bonus}</span>
                    </div>
                    <button type="button" className="lo-btn lo-btn-ghost lo-draw-redraw" onClick={redraw}>🔀 새 추첨</button>
                </div>

                {/* 툴바 */}
                <div className="lo-toolbar">
                    <div className="lo-speeds" role="group" aria-label="자동 구매 속도">
                        {SPEEDS.map((s, i) => (
                            <button
                                key={s.label}
                                type="button"
                                className={`lo-speed ${speedIdx === i ? 'is-on' : ''}`}
                                onClick={() => setSpeedIdx(i)}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                    <div className="lo-actions">
                        <button type="button" className="lo-btn" onClick={() => buy(1)} disabled={playing}>🎟 한 장</button>
                        <button
                            type="button"
                            className={`lo-btn ${playing ? 'is-live' : ''}`}
                            onClick={() => setPlaying((p) => !p)}
                        >
                            {playing ? '⏸ 정지' : '▶ 자동 구매'}
                        </button>
                        <button type="button" className="lo-btn lo-btn-ghost" onClick={reset}>초기화</button>
                    </div>
                </div>

                <div className="lo-stage">
                    <div className="lo-field-col">
                        <canvas ref={canvasRef} className="lo-field" />
                        <p className="lo-field-foot k-mono">
                            점 하나 = 티켓 한 장 · <span className="lo-inline-dim">흐린 점</span>은 꽝(약 97.6%) ·
                            <span className="lo-inline-5"> 5등</span> · <span className="lo-inline-4">4등</span> ·
                            <span className="lo-inline-3"> 3등</span> · <span className="lo-inline-1"> 1등=금색(거의 안 뜸)</span>
                        </p>
                    </div>

                    <div className="lo-right">
                        <div className="lo-cards">
                            <div className="lo-card">
                                <span className="lo-card-lab k-mono">구매 장수</span>
                                <span className="lo-card-num k-mono">{stats.tickets.toLocaleString()}</span>
                                <span className="lo-card-sub k-mono">{formatWon(stats.spent)} 씀</span>
                            </div>
                            <div className={`lo-card lo-card-jackpot ${c[1] > 0 ? 'is-hit' : ''}`}>
                                <span className="lo-card-lab k-mono">1등 당첨</span>
                                <span className="lo-card-num k-mono">{c[1]}<b>회</b></span>
                                <span className="lo-card-sub k-mono">기대 {expected1 < 0.001 ? expected1.toExponential(1) : expected1.toFixed(3)}회</span>
                            </div>
                        </div>

                        <div className="lo-hist">
                            <div className="lo-hist-head k-mono">등수별 당첨 횟수</div>
                            <ul className="lo-hist-list">
                                {TIERS.map((t) => {
                                    const cnt = c[t.rank];
                                    const w = cnt > 0 ? Math.max(2, (cnt / maxCount) * 100) : 0;
                                    return (
                                        <li key={t.rank} className={`lo-hist-row lo-tier-${t.rank} ${cnt > 0 ? 'is-on' : ''}`}>
                                            <span className="lo-hist-rank k-mono">{t.label}</span>
                                            <span className="lo-hist-odds k-mono">1/{t.odds.toLocaleString()}</span>
                                            <span className="lo-hist-track"><span className="lo-hist-fill" style={{ width: `${w}%` }} /></span>
                                            <span className="lo-hist-cnt k-mono">{cnt.toLocaleString()}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        <div className={`lo-roi ${stats.tickets > 0 ? 'is-on' : ''}`}>
                            {stats.tickets > 0 ? (
                                <p className="lo-roi-txt">
                                    당첨금 <b>{formatWon(stats.reward)}</b> 회수 · 수익률
                                    <b className={roi < 0 ? ' lo-neg' : ' lo-pos'}> {roi > 0 ? '+' : ''}{roi.toFixed(1)}%</b>
                                    <span className="lo-roi-sub k-mono"> (많이 살수록 환급률 −50% 부근으로 수렴)</span>
                                </p>
                            ) : (
                                <p className="lo-roi-hint k-mono">자동 구매를 켜 보세요. 5등·4등은 곧 나오지만 1등은 계속 0에 머뭅니다.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            {/* ── 확률 사다리(체감 앵커) ── */}
            <section className="k-win lo-scale-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/lotto/</span>how-rare.md</span>
                    <span className="meta k-mono">1등 = 1/{TOTAL.toLocaleString()}</span>
                </div>
                <div className="lo-scale">
                    <p className="lo-scale-lead">
                        1등 확률 <b>8,145,060분의 1</b>은 이 정도로 희박합니다 —
                    </p>
                    <div className="lo-anchors">
                        <div className="lo-anchor">
                            <span className="lo-anchor-ico" aria-hidden="true">🪙</span>
                            <span className="lo-anchor-num k-mono">1 / 8,388,608</span>
                            <span className="lo-anchor-tt">동전을 <b>23번 연속</b> 던져 모두 앞면</span>
                            <span className="lo-anchor-sub">2²³ = 8,388,608 — 로또 1등과 거의 같은 확률</span>
                        </div>
                        <div className="lo-anchor">
                            <span className="lo-anchor-ico" aria-hidden="true">🏙️</span>
                            <span className="lo-anchor-num k-mono">1 / 9,400,000</span>
                            <span className="lo-anchor-tt">서울 시민 <b>한 명</b>을 무작위로 골라 그게 나</span>
                            <span className="lo-anchor-sub">인구 약 940만 중 정확히 한 명 — 로또 1등과 비슷</span>
                        </div>
                        <div className="lo-anchor">
                            <span className="lo-anchor-ico" aria-hidden="true">⏳</span>
                            <span className="lo-anchor-num k-mono">약 156,636년</span>
                            <span className="lo-anchor-tt">매주 <b>1장</b>씩 사서 1등까지 걸리는 평균 시간</span>
                            <span className="lo-anchor-sub">문명의 시작(약 1만 년 전)보다 15배 넘게 긴 기다림</span>
                        </div>
                        <div className="lo-anchor">
                            <span className="lo-anchor-ico" aria-hidden="true">💸</span>
                            <span className="lo-anchor-num k-mono">약 0.05%</span>
                            <span className="lo-anchor-tt"><b>평생(80년)</b> 매주 사도 1등 한 번 볼 확률</span>
                            <span className="lo-anchor-sub">4,160장을 사도 1등 기대값은 약 2,000번에 1</span>
                        </div>
                    </div>
                </div>
                <div className="k-resize"></div>
            </section>

            {/* ── README ── */}
            <section className="k-win lo-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="lo-foot">
                    <p>
                        {'로또 6/45는 1~45 중 서로 다른 6개를 고른다. 가능한 조합은 '}
                        <b>{'C(45,6) = 8,145,060'}</b>{'가지, 그중 당첨은 단 하나 — 그래서 1등 확률이 '}
                        <b>{'8,145,060분의 1'}</b>{'이다. 한 장을 더 산다고 이 값이 눈에 띄게 바뀌지 않는다. '}
                        {'8,145,060분의 8이 되어도 여전히 100만분의 1 수준이다.'}
                    </p>
                    <p>
                        {'그런데 왜 로또가 "될 것 같은" 느낌을 줄까. '}<b>{'작은 당첨은 자주 나오기 때문'}</b>{'이다. '}
                        {'5등(3개 일치)은 1/45, 4등(4개)은 1/733로 제법 잘 걸린다. 몇 장만 사도 5등 몇 번은 경험하니 '}
                        {'"조금만 더 하면"이라는 착각이 쌓인다. 하지만 5등과 1등 사이에는 '}<b>{'약 18만 배'}</b>{'의 확률 절벽이 있다. '}
                        {'위 시뮬레이터에서 5등 칸은 금세 수북해지지만 1등 칸이 계속 0에 머무는 이유다.'}
                    </p>
                    <p>
                        {'기댓값도 냉정하다. 대표 당첨금으로 계산하면 ₩1,000짜리 한 장의 기대 회수액은 약 '}<b>{'₩504'}</b>{' — '}
                        {'즉 살수록 평균적으로 절반을 잃는다(환급률 ≈ 50%). 많이 살수록 수익률은 우연에서 벗어나 '}
                        <b>{'−50% 부근으로 수렴'}</b>{'한다. 로또는 확률적으로 "많이 사서 이기는" 게임이 아니라, '}
                        {'적은 돈으로 8,145,060분의 1이라는 꿈을 잠깐 사는 오락에 가깝다.'}
                    </p>
                    <p className="lo-disclaimer">
                        {'* 당첨금은 체감용 대표값입니다. 1~3등은 판매액·당첨자 수에 따라 회차마다 달라지고(예: 1등 ~20억), '}
                        {'4등 5만원·5등 5천원만 고정입니다. 티켓은 자동(무작위) 선택으로 가정했습니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Lotto;
