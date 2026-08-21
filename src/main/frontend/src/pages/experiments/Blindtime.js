import React, { useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Blindtime.css';

// BLINDTIME — 눈금 없이 시간을 맞히는 감각 (감각 × 시간 챌린지).
//   소재: 체내 시계(chronoception). 시계를 안 보고도 "대충 몇 초 지났다"를 아는 감각은
//         화면에 담기 어렵다 — 화면은 늘 시계를 보여줘 그 감각을 대신 죽여 버리기 때문.
//         그래서 재현하는 동안 숫자·눈금·진행 막대를 전부 감춘다. 남는 건 당신의 몸뿐.
//   형식: 시간 챌린지 — 목표 노광 시간을 몸으로 재현한다. 오차가 곧 점수.
//   기술: 실제 경과시간 — 누른 순간과 뗀 순간의 performance.now() 차이만이 진실이다.
//   제약: 버튼 3개 이하 — 조작은 "누르고 있기(노광)" 패드 하나 + "다음/다시" 버튼 하나뿐.
//   톤: 암실(darkroom). 근흑 + 세이프라이트 레드 + 감광지 본. 60/30/10.
//   도전: 타이밍 오차를 "현상되는 인화"로 옮기기 — 짧으면 허옇게 뜬 유령,
//         길면 새카맣게 탄 인화, 정확하면 선명한 사진이 서서히 떠오른다.

const TARGETS = [2.0, 3.5, 5.0, 8.0, 12.0, 18.0]; // 초 — 라운드마다 길어진다(드리프트가 커진다)
const DEVELOP_MS = 1100; // 인화가 떠오르는 시간

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const easeOut = (p) => 1 - Math.pow(1 - p, 2.2);
const fmt = (s) => (s >= 0 ? '+' : '−') + Math.abs(s).toFixed(2);

// 경과/목표 비율 → 최종 인화의 밝기·대비 (적정 노광 r=1 에서 가장 선명)
const exposureLook = (ratio) => {
    let B;
    if (ratio <= 1) B = 1 + (1 - ratio) * 0.9;          // 부족 → 허옇게 뜸
    else B = clamp(1 - (ratio - 1) * 1.5, 0.05, 1);      // 과다 → 새카맣게 탐
    const C = clamp(1.25 - Math.min(Math.abs(ratio - 1), 1) * 0.72, 0.5, 1.25);
    return { B: clamp(B, 0.05, 1.9), C };
};

const Blindtime = () => {
    const [round, setRound] = useState(0);                 // 0..5
    const [phase, setPhase] = useState('ready');           // ready | holding | revealed | summary
    const [reveal, setReveal] = useState(null);            // { elapsed, err, ratio, tone }
    const [results, setResults] = useState([]);            // [{ T, elapsed, err }]

    const pressAt = useRef(0);
    const rafId = useRef(0);
    const printRef = useRef(null);   // 현상 필터를 매 프레임 직접 먹인다(리렌더 방지)
    const pressedRef = useRef(false); // keydown 반복 무시용
    const phaseRef = useRef('ready');
    const startRef = useRef(() => {});
    const stopRef = useRef(() => {});
    const advRef = useRef(() => {});

    const T = TARGETS[Math.min(round, TARGETS.length - 1)];

    const setPrint = (B, C, opacity) => {
        const n = printRef.current;
        if (!n) return;
        n.style.filter = `sepia(0.55) hue-rotate(-8deg) brightness(${B}) contrast(${C})`;
        n.style.opacity = String(opacity);
    };

    const runDevelop = (ratio) => {
        cancelAnimationFrame(rafId.current);
        const { B, C } = exposureLook(ratio);
        const t0 = performance.now();
        const step = (now) => {
            const p = clamp((now - t0) / DEVELOP_MS, 0, 1);
            const e = easeOut(p);
            // 감광지(허연 상태)에서 최종 밀도로 서서히 내려앉는다
            const b = 2.2 + (B - 2.2) * e;
            const c = 0.28 + (C - 0.28) * e;
            const o = 0.16 + 0.84 * e;
            setPrint(b, c, o);
            if (p < 1) rafId.current = requestAnimationFrame(step);
        };
        rafId.current = requestAnimationFrame(step);
    };

    const startHold = () => {
        if (phaseRef.current !== 'ready') return;
        pressAt.current = performance.now();
        phaseRef.current = 'holding';
        setPhase('holding');
        setReveal(null);
        setPrint(2.2, 0.28, 0.06); // 노광 중엔 백지 — 시간 단서 없음
    };

    const stopHold = () => {
        if (phaseRef.current !== 'holding') return;
        const elapsed = (performance.now() - pressAt.current) / 1000;
        const err = elapsed - T;
        const ratio = elapsed / T;
        const tol = Math.max(0.18, T * 0.07);
        const tone = Math.abs(err) <= tol ? 'ok' : err > 0 ? 'over' : 'under';
        phaseRef.current = 'revealed';
        setPhase('revealed');
        setReveal({ elapsed, err, ratio, tone });
        setResults((r) => [...r, { T, elapsed, err }]);
        runDevelop(ratio);
    };

    const advance = () => {
        if (phaseRef.current !== 'revealed') return;
        cancelAnimationFrame(rafId.current);
        if (round + 1 >= TARGETS.length) {
            phaseRef.current = 'summary';
            setPhase('summary');
        } else {
            setRound((n) => n + 1);
            phaseRef.current = 'ready';
            setPhase('ready');
            setReveal(null);
        }
    };

    const reset = () => {
        cancelAnimationFrame(rafId.current);
        setResults([]);
        setRound(0);
        setReveal(null);
        phaseRef.current = 'ready';
        setPhase('ready');
    };

    startRef.current = startHold;
    stopRef.current = stopHold;
    advRef.current = phase === 'summary' ? reset : advance;

    // 키보드: SPACE = 노광(누름/뗌), ENTER = 다음/다시. 리스너는 마운트 시 한 번만.
    useEffect(() => {
        const down = (e) => {
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                if (e.repeat || pressedRef.current) return;
                pressedRef.current = true;
                startRef.current();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                advRef.current();
            }
        };
        const up = (e) => {
            if (e.key === ' ' || e.code === 'Space') {
                pressedRef.current = false;
                stopRef.current();
            }
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
        };
    }, []);

    useEffect(() => () => cancelAnimationFrame(rafId.current), []);

    const onPadDown = (e) => {
        e.preventDefault();
        if (e.currentTarget.setPointerCapture && e.pointerId != null) {
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
        }
        startHold();
    };

    // 요약 통계
    const summary = (() => {
        if (results.length === 0) return null;
        const relAbs = results.reduce((a, r) => a + Math.abs(r.err) / r.T, 0) / results.length;
        const relSigned = results.reduce((a, r) => a + r.err / r.T, 0) / results.length;
        const totalErr = results.reduce((a, r) => a + Math.abs(r.err), 0);
        let grade;
        if (relAbs < 0.06) grade = '명작 인화';
        else if (relAbs < 0.12) grade = '선명한 인화';
        else if (relAbs < 0.22) grade = '흐릿한 인화';
        else grade = '재촬영 필요';
        let drift;
        if (relSigned < -0.05) drift = '당신의 속시계는 빠릅니다 — 대개 목표보다 일찍 손을 뗐습니다.';
        else if (relSigned > 0.05) drift = '당신의 속시계는 느립니다 — 대개 목표보다 오래 눌렀습니다.';
        else drift = '당신의 속시계는 꽤 정확한 편입니다.';
        return { relAbs, relSigned, totalErr, grade, drift };
    })();

    const toneLabel = reveal && (
        reveal.tone === 'ok' ? '적정 노광' : reveal.tone === 'over' ? '과노광 (너무 오래)' : '노광 부족 (너무 짧게)'
    );

    return (
        <LabShell
            title="BLINDTIME"
            eyebrow="expose without a clock"
            subtitle={'// 목표 노광 시간을 눈금 없이 몸으로 재현한다 — 짧으면 허옇게, 길면 새카맣게, 정확하면 선명하게 현상된다'}
            path="blindtime"
        >
            <section className="bt-wrap" aria-label="암실 노광 시간 감각 챌린지">
                <div className="bt-console">
                    {/* 상단: 라운드 · 목표 노광 (숫자는 목표 제시일 뿐, 재현 중엔 사라진다) */}
                    <div className="bt-head">
                        <span className="bt-roundno k-mono">
                            {phase === 'summary' ? '현상 완료' : `인화 ${round + 1} / ${TARGETS.length}`}
                        </span>
                        {phase !== 'summary' && (
                            <span className="bt-target k-mono">
                                목표 노광 <b>{T.toFixed(1)}</b><span className="u">초</span>
                            </span>
                        )}
                    </div>

                    {/* 현상 트레이 — 인화가 떠오르는 곳 */}
                    <div className={`bt-tray tone-${reveal ? reveal.tone : 'idle'} ph-${phase}`}>
                        <div className="bt-print" ref={printRef} aria-hidden="true">
                            <svg viewBox="0 0 320 220" className="bt-photo" preserveAspectRatio="xMidYMid slice">
                                <defs>
                                    <linearGradient id="bt-sky" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0" stopColor="#d8d8d8" />
                                        <stop offset="1" stopColor="#9a9a9a" />
                                    </linearGradient>
                                </defs>
                                <rect x="0" y="0" width="320" height="220" fill="url(#bt-sky)" />
                                <circle cx="236" cy="66" r="30" fill="#efefef" />
                                <path d="M0 158 L64 132 L128 150 L196 120 L260 142 L320 118 L320 220 L0 220 Z" fill="#6f6f6f" />
                                <path d="M0 182 L80 168 L150 180 L240 160 L320 176 L320 220 L0 220 Z" fill="#4a4a4a" />
                                <g fill="#2b2b2b">
                                    <rect x="70" y="150" width="7" height="44" />
                                    <path d="M73 120 C50 130 48 158 73 156 C98 158 96 130 73 120 Z" />
                                </g>
                                <g stroke="#3a3a3a" strokeWidth="2" fill="none" strokeLinecap="round">
                                    <path d="M150 78 q8 -7 16 0" />
                                    <path d="M176 90 q7 -6 14 0" />
                                </g>
                            </svg>
                        </div>

                        {/* 노광 중 안전등 표시 — 시간 단서는 없다 */}
                        {phase === 'holding' && <div className="bt-exposing k-mono">노광 중</div>}

                        {/* 오차 판정 오버레이 */}
                        {phase === 'revealed' && reveal && (
                            <div className={`bt-verdict tone-${reveal.tone}`}>
                                <span className="bt-vlabel">{toneLabel}</span>
                                <span className="bt-verr k-mono">{fmt(reveal.err)}초</span>
                            </div>
                        )}
                    </div>

                    {/* 노광 패드 (버튼 1) — 누르고 있는 동안이 곧 노광 시간 */}
                    {phase !== 'summary' && (
                        <button
                            type="button"
                            className={`bt-pad ${phase === 'holding' ? 'is-on' : ''}`}
                            disabled={phase === 'revealed'}
                            onPointerDown={onPadDown}
                            onPointerUp={(e) => { e.preventDefault(); stopHold(); }}
                            onPointerCancel={() => stopHold()}
                            aria-label="노광 — 목표 시간만큼 누르고 있다가 떼세요"
                        >
                            <span className="bt-lamp" />
                            <span className="bt-padtxt">
                                {phase === 'holding' ? '지금 떼세요' : phase === 'revealed' ? '현상 완료' : '누르고 있기'}
                            </span>
                        </button>
                    )}

                    {/* 진행 도트 */}
                    <div className="bt-dots" aria-hidden="true">
                        {TARGETS.map((_, i) => (
                            <span
                                key={i}
                                className={`bt-dot ${i < results.length ? `done tone-${
                                    Math.abs(results[i].err) <= Math.max(0.18, results[i].T * 0.07)
                                        ? 'ok' : results[i].err > 0 ? 'over' : 'under'
                                }` : ''} ${i === round && phase !== 'summary' ? 'cur' : ''}`}
                            />
                        ))}
                    </div>

                    {/* 안내 / 다음·다시 (버튼 2) */}
                    {phase === 'ready' && (
                        <p className="bt-hint k-mono">SPACE 또는 패드를 목표 시간만큼 누르고 있다가 떼세요 · 화면엔 시간이 안 보입니다</p>
                    )}
                    {phase === 'holding' && (
                        <p className="bt-hint k-mono">몸으로만 재세요 — {T.toFixed(1)}초라 느껴지면 떼세요</p>
                    )}
                    {phase === 'revealed' && (
                        <button type="button" className="bt-next" onClick={advance}>
                            {round + 1 >= TARGETS.length ? '결과 보기 →' : '다음 인화 →'}
                        </button>
                    )}

                    {phase === 'summary' && summary && (
                        <div className="bt-summary">
                            <p className="bt-grade">{summary.grade}</p>
                            <p className="bt-drift">{summary.drift}</p>
                            <p className="bt-stat k-mono">
                                평균 오차 {(summary.relAbs * 100).toFixed(1)}% · 누적 {summary.totalErr.toFixed(2)}초
                            </p>
                            <button type="button" className="bt-next" onClick={reset}>다시 촬영 →</button>
                        </div>
                    )}
                </div>

                {/* 만진 뒤 읽는 회고 */}
                <section className="bt-read">
                    <h3>시계를 안 보고도 아는 그 시간, 어디서 오나</h3>
                    <p>
                        눈·귀처럼 전용 기관은 없지만, 사람은 <b>시간의 흐름을 느끼는 감각(chronoception)</b>을 가지고 있다.
                        라면 3분, 신호 대기, 전자레인지 앞의 30초 — 우리는 늘 시계 없이도 “이만큼 지났다”를 어림한다.
                        문제는 이 감각이 <b>화면과 상극</b>이라는 점이다. 화면은 숫자든 진행 막대든 시간을 대신 보여 줘서,
                        정작 몸의 시계를 꺼 버린다. 그래서 이 페이지는 재현하는 동안 <b>숫자·눈금·막대를 전부 감춘다</b>.
                        누른 순간과 뗀 순간의 실제 경과만이 채점되고, 그 오차가 곧 인화의 밝기가 된다.
                    </p>
                    <p>
                        심리학에선 이런 과제를 <b>시간 생성(time production)</b>이라 부른다 — “N초를 만들어 보라”고 시키고
                        실제와 비교하는 것이다. 반대로 흘러간 구간의 길이를 나중에 맞히는 건 시간 추정(estimation)이다.
                        잘 알려진 경향이 몇 가지 있다. 첫째, <b>구간이 길수록 오차도 커진다</b>(스칼라 성질) — 2초는 잘 맞혀도
                        18초쯤 되면 사람마다 크게 갈린다. 둘째, 각성·집중·감정이 속시계를 흔든다. 무언가에 몰입하면
                        시간이 <b>짧게</b> 느껴져 대개 일찍 손을 떼고(“빠른 시계”), 지루하거나 초조하면 길게 느껴져 오래 누른다.
                        그래서 여섯 판의 <b>오차 방향</b>을 모아 보면 당신의 속시계가 빠른지 느린지가 드러난다.
                    </p>
                    <p>
                        암실을 무대로 삼은 건 그 감각을 그대로 옮기기 좋아서다. 인화는 인화지를 빛에 <b>정확한 초만큼</b> 노출해야
                        한다 — 짧으면 상이 안 올라와 허옇게 뜨고(부족 노광), 길면 통째로 새카맣게 탄다(과노광). 시계를 못 보는
                        어두운 암실에서 손끝의 초 감각으로 노광을 재던 그 일이, 여기선 <b>목표 시간을 몸으로 재현하는 놀이</b>가 됐다.
                        정확히 맞히면 사진이 서서히, 선명하게 떠오른다.
                    </p>
                    <p className="bt-disc">
                        * 오차·등급은 브라우저 안에서만 계산되며 저장되지 않습니다. 시간은 화면 주사율과 무관하게 실제 경과(performance.now)로
                        재며, 조작은 노광 패드(SPACE)와 다음/다시 버튼뿐입니다. 사람의 반응·판단 지연이 포함되므로 절대 오차보다 판 사이의
                        경향(빠름/느림)을 보는 쪽이 재미있습니다.
                    </p>
                </section>
            </section>
        </LabShell>
    );
};

export default Blindtime;
