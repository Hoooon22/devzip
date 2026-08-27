import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Slowlane.css';

// SLOWLANE — 계산대 줄 고르기 (일상의 사소한 현상 × 미니게임 × 시드 난수 × 색은 3개까지만).
//   소재: 마트 계산대에서 늘 "내가 고른 줄만 안 줄어든다"는 그 현상.
//   형식: 미니게임 — 세 줄 중 먼저 끝날 줄을 고르고, 카트가 빠지는 걸 지켜본 뒤 맞았는지 본다.
//         점수(맞힌 줄)와 실패(옆줄이 더 빨랐다)가 있다.
//   기술: 시드 기반 난수 — 오늘 날짜가 씨앗이라 같은 날이면 누구나 같은 판을 받는다(공유 가능).
//         mulberry32 결정론 난수로 다섯 라운드를 미리 굴려 둔다.
//   제약: 색은 3개까지만 — 갱지(주조)·먹(보조)·코발트(강조) 셋. 이긴 줄·내 선택만 코발트.

const LANES = 3;
const ROUNDS = 5;
const HAZARD_P = 0.16;     // 카트가 '가격 확인/카드 오류' 지연을 품을 확률
const HAZARD_COST = 9;     // 그 지연의 크기(아이템 환산)

// 결정론 난수 — 같은 씨앗이면 같은 수열.
const mulberry32 = (seed) => {
    let a = seed >>> 0;
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

// 씨앗 하나로 다섯 라운드를 통째로 만든다. 각 라운드는 세 줄, 각 줄은 2~4개의 카트.
// 카트 높이(=보이는 짐)는 드러나지만, hazard 지연과 계산원 편차(bias)는 숨어 있다.
const buildGame = (seed) => {
    const rand = mulberry32(seed);
    const rounds = [];
    let cid = 0;                                            // 카트마다 고정 키(배열 인덱스 대신)
    for (let r = 0; r < ROUNDS; r += 1) {
        const lanes = [];
        for (let L = 0; L < LANES; L += 1) {
            const count = 2 + Math.floor(rand() * 3);       // 2..4 카트
            const carts = [];
            let time = 0;
            for (let c = 0; c < count; c += 1) {
                const items = 2 + Math.floor(rand() * 9);   // 2..10 짐
                const hazard = rand() < HAZARD_P;
                carts.push({ id: cid, items, hazard });
                cid += 1;
                time += items + (hazard ? HAZARD_COST : 0);
            }
            const bias = Math.floor(rand() * 4);            // 계산원 손 빠르기 편차(숨김)
            time += bias;
            lanes.push({ id: L, carts, time });
        }
        // 먼저 끝나는 줄 = 총 시간이 가장 짧은 줄(동점이면 앞 인덱스).
        let winner = 0;
        for (let L = 1; L < LANES; L += 1) if (lanes[L].time < lanes[winner].time) winner = L;

        // 배수 애니메이션 — 카트를 순서대로 비우고, 가장 오래 걸리는 줄에 맞춰 ~1.5s로 스케일.
        const maxTime = Math.max(...lanes.map((l) => l.time));
        const scale = 1400 / maxTime;
        lanes.forEach((lane) => {
            let acc = 0;
            lane.carts.forEach((cart) => {
                const raw = cart.items + (cart.hazard ? HAZARD_COST : 0);
                cart.delayMs = Math.round(acc * scale);
                cart.durMs = Math.round(raw * scale);
                acc += raw;
            });
            lane.finishMs = Math.round(lane.time * scale);
        });
        rounds.push({ lanes, winner });
    }
    return rounds;
};

const cartHeight = (items) => 16 + items * 7; // 30..86px

const todaySeedNow = () => {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

const seedTag = (s) => `#${(s >>> 0).toString(36).toUpperCase()}`;

const SLOTS = Array.from({ length: ROUNDS }, (_, i) => i); // 라운드 점 — 값으로 키를 만든다

const VERDICTS_WIN = ['이번엔 맞췄다', '오늘은 운이 좋다', '드물게 잘 골랐다'];
const VERDICTS_LOSE = ['역시 옆줄이 빨랐다', '또 이 줄이다', '가격 확인에 걸렸다', '한 발 늦었다'];

const Slowlane = () => {
    const [seed, setSeed] = useState(() => todaySeedNow());
    const isToday = seed === todaySeedNow();
    const rounds = useMemo(() => buildGame(seed), [seed]);

    const [ri, setRi] = useState(0);                 // 현재 라운드
    const [phase, setPhase] = useState('ready');     // ready | running | done
    const [pick, setPick] = useState(null);          // 내가 고른 줄
    const [wins, setWins] = useState(0);
    const [history, setHistory] = useState([]);      // 각 라운드 hit 여부
    const timerRef = useRef(null);
    const audioRef = useRef(null);

    const round = rounds[ri];
    const finished = ri >= ROUNDS;

    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

    // 계산대 '삑' — 작은 사각파. 실패 없이 조용히 넘어가도 무방(제약이 소리는 아님).
    const beep = useCallback((ok) => {
        try {
            let ctx = audioRef.current;
            if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); audioRef.current = ctx; }
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'square';
            o.frequency.value = ok ? 1180 : 320;
            g.gain.setValueAtTime(0.0001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
            o.connect(g); g.connect(ctx.destination);
            o.start(); o.stop(ctx.currentTime + 0.15);
        } catch { /* 소리는 있으면 좋고 없어도 그만 */ }
    }, []);

    const choose = useCallback((laneIdx) => {
        if (phase !== 'ready' || finished) return;
        setPick(laneIdx);
        setPhase('running');
        const hit = laneIdx === round.winner;
        const maxFinish = Math.max(...round.lanes.map((l) => l.finishMs));
        timerRef.current = setTimeout(() => {
            setPhase('done');
            beep(hit);
            if (hit) setWins((w) => w + 1);
            setHistory((h) => [...h, { round: ri, hit }]);
        }, maxFinish + 260);
    }, [phase, finished, round, ri, beep]);

    const next = useCallback(() => {
        setRi((i) => i + 1);
        setPick(null);
        setPhase('ready');
    }, []);

    const restart = useCallback((newSeed) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setSeed(newSeed);
        setRi(0); setPick(null); setPhase('ready'); setWins(0); setHistory([]);
    }, []);

    // ── 종료 화면 ─────────────────────────────
    if (finished) {
        const grade = wins >= 4 ? '줄 보는 눈이 있다' : wins >= 2 ? '반타작, 딱 평균이다' : '늘 그렇듯, 남의 줄이 빨랐다';
        return (
            <LabShell
                title="SLOWLANE"
                eyebrow="the other line always moves faster"
                subtitle={'// 세 계산대 줄 중 먼저 끝날 줄을 고른다 — 카트 크기는 보이지만, 가격 확인·카드 오류 같은 숨은 지연은 안 보인다'}
                path="slowlane"
            >
                <section className="sl-wrap" aria-label="계산대 줄 고르기 결과">
                    <div className="sl-end">
                        <div className="sl-tally" aria-hidden="true">
                            {history.map((h) => (
                                <span key={h.round} className={`sl-pip${h.hit ? ' hit' : ''}`}>{h.hit ? '✓' : '✕'}</span>
                            ))}
                        </div>
                        <h2 className="sl-score"><b>{wins}</b> / {ROUNDS}</h2>
                        <p className="sl-grade">{grade}</p>
                        <div className="sl-controls">
                            <button type="button" className="sl-btn" onClick={() => restart(seed)}>같은 판 다시</button>
                            <button type="button" className="sl-btn ghost" onClick={() => restart((seed * 1103515245 + 12345) >>> 0)}>새 판</button>
                            {!isToday && (
                                <button type="button" className="sl-btn ghost" onClick={() => restart(todaySeedNow())}>오늘의 줄</button>
                            )}
                        </div>
                        <span className="sl-seed k-mono">{seedTag(seed)}{isToday ? ' · 오늘' : ''}</span>
                    </div>

                    <ReadBlock />
                </section>
            </LabShell>
        );
    }

    // ── 플레이 화면 ───────────────────────────
    const showTrue = phase === 'running' || phase === 'done';
    const hit = phase === 'done' && pick === round.winner;
    const verdictPool = hit ? VERDICTS_WIN : VERDICTS_LOSE;
    const verdict = verdictPool[(seed + ri) % verdictPool.length];

    return (
        <LabShell
            title="SLOWLANE"
            eyebrow="the other line always moves faster"
            subtitle={'// 세 계산대 줄 중 먼저 끝날 줄을 고른다 — 카트 크기는 보이지만, 가격 확인·카드 오류 같은 숨은 지연은 안 보인다'}
            path="slowlane"
        >
            <section className="sl-wrap" aria-label="계산대 줄 고르기">
                <div className="sl-top">
                    <div className="sl-dots" aria-label={`라운드 ${ri + 1} / ${ROUNDS}`}>
                        {SLOTS.map((n) => (
                            <span key={`d${n}`} className={`sl-dot${n < ri ? ' past' : ''}${n === ri ? ' now' : ''}`} />
                        ))}
                    </div>
                    <span className="sl-hint k-mono">
                        {phase === 'ready' ? '먼저 끝날 줄을 골라라' : phase === 'running' ? '…' : verdict}
                    </span>
                </div>

                <div className={`sl-floor phase-${phase}`}>
                    {round.lanes.map((lane, L) => {
                        const isPick = pick === L;
                        const isWin = phase === 'done' && L === round.winner;
                        const cls = [
                            'sl-lane',
                            isPick ? 'is-pick' : '',
                            isWin ? 'is-win' : '',
                            phase === 'ready' ? 'is-live' : '',
                        ].filter(Boolean).join(' ');
                        return (
                            <button
                                key={lane.id}
                                type="button"
                                className={cls}
                                onClick={() => choose(L)}
                                disabled={phase !== 'ready'}
                                aria-label={`${L + 1}번 줄 고르기`}
                            >
                                <span className="sl-rail" />
                                <span className="sl-carts">
                                    {lane.carts.map((cart) => (
                                        <span
                                            key={cart.id}
                                            className={`sl-cart${cart.hazard && showTrue ? ' hz' : ''}${showTrue ? ' drain' : ''}`}
                                            style={{
                                                '--h': cartHeight(cart.items) + 'px',
                                                '--dly': cart.delayMs + 'ms',
                                                '--dur': cart.durMs + 'ms',
                                            }}
                                        >
                                            {cart.hazard && showTrue && <i className="sl-flag" aria-hidden="true">!</i>}
                                        </span>
                                    ))}
                                </span>
                                <span className="sl-head" aria-hidden="true">
                                    {isWin ? '✓' : (isPick && phase === 'done' ? '✕' : '')}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {phase === 'done' && (
                    <div className="sl-controls">
                        <button type="button" className="sl-btn" onClick={next}>
                            {ri + 1 >= ROUNDS ? '결과 보기' : '다음 줄'}
                        </button>
                    </div>
                )}

                <ReadBlock />
            </section>
        </LabShell>
    );
};

// 본문 — 왜 늘 옆줄이 빨라 보이는가.
const ReadBlock = () => (
    <section className="sl-read">
        <h3>내 줄만 안 줄어드는 건 착각이 아니다</h3>
        <p>
            계산대가 세 줄이면, 내가 <b>가장 빠른 줄</b>에 설 확률은 셋 중 하나뿐이다. 나머지
            둘 중 하나는 십중팔구 내 줄보다 먼저 빠진다. 즉 “옆줄이 더 빠르다”는 건 대개
            <b> 사실</b>이다 — 빠른 줄은 하나인데 내가 아닌 줄은 여럿이니까.
        </p>
        <p>
            게다가 우리는 <b>내 줄이 멈춘 순간</b>만 또렷이 기억한다. 앞사람이 가격 확인을
            부르거나 카드가 안 긁히는 그 몇 초가, 옆줄이 매끄럽게 빠진 장면보다 훨씬 오래
            남는다. 이 화면에서 카트 크기(보이는 짐)는 다 드러나지만, <b>숨은 지연(⚑)</b>은
            고른 뒤에야 튀어나온다 — 실제 계산대처럼, 짐이 적어 보이는 줄이 꼭 빠른 건 아니다.
        </p>
        <p>
            그래서 은행·공항은 줄을 <b>하나로 합친다</b>. 대기열이 하나면 “남보다 느린 줄”이라는
            게 아예 생기지 않고, 한 창구가 막혀도 전체가 골고루 나눠 받는다. 세 줄을 한 줄로
            바꾸는 것만으로 평균 대기는 거의 그대로여도, <b>운 나쁜 꼴찌</b>는 사라진다.
        </p>
        <p className="sl-disc">
            * 이 판은 오늘 날짜를 씨앗으로 만든다. 같은 날이면 누구나 같은 다섯 판을 받는다
            (씨앗 코드로 확인). ‘새 판’은 다른 씨앗을 뽑고, ‘같은 판 다시’는 방금 판을 되돌린다.
        </p>
    </section>
);

export default Slowlane;
