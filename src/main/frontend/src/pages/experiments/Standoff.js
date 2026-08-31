import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Standoff.css';

// STANDOFF — 반응속도 서부 결투 (몸 × 대결 × 타이포그래피가 인터랙션 × 텍스트보다 도형).
//   소재: 반응속도 — 신호를 보고 먼저 반응하는 자가 이긴다. 몸의 가장 원초적인 대결.
//   형식: 대결 — 나 vs 기계. 두 반응시간의 정면 비교. 5판 3선승.
//   기술: 타이포그래피가 인터랙션 — 신호 낱말('쏴')이 곧 트리거이고,
//         내가 뽑는 순간 그 글자가 산산조각 난다. 텍스트가 입력에 반응해 부서진다.
//   제약: 텍스트보다 도형이 많아야 — 결투자·태양·총알·파편·승수 눈금은 전부 도형,
//         낱말은 신호와 판정 몇 개뿐.
//
//   도전: 물리 엔진도 이미지도 없이 도형만으로 하이눈 대치의 긴장을 세우고,
//         "먼저 뽑았다/부정출발"의 찰나를 손끝 반응시간(performance.now)으로 재는 것.
//         그리고 기계의 반응시간을 사람이 이길 만하되 방심하면 지도록 조율하는 것.

const TARGET = 3;          // 5판 3선승
const MIN_DELAY = 1200;    // 신호까지 최소 대기(ms) — 예측 방지
const MAX_DELAY = 3600;    // 신호까지 최대 대기(ms)
const CPU_MIN = 195;       // 기계 반응시간 하한(ms)
const CPU_MAX = 305;       // 기계 반응시간 상한(ms) — 평균 ~250ms, 이길 만하되 방심 금물

const rand = (a, b) => a + Math.random() * (b - a);

// 신호 낱말이 부서질 때 흩어지는 파편 조각들. 위치/회전은 인덱스로 고정(난수 아님).
const SHARDS = Array.from({ length: 16 }, (_, i) => {
    const ang = (i / 16) * Math.PI * 2 + (i % 3) * 0.5;
    const dist = 54 + (i % 5) * 30;
    return {
        id: `shard-${i}`,
        dx: Math.round(Math.cos(ang) * dist),
        dy: Math.round(Math.sin(ang) * dist - 14),
        rot: (i % 2 ? 1 : -1) * (140 + i * 22),
        size: 5 + (i % 4) * 5,
    };
});

// 결투자 — 폰초·모자·총으로 이뤄진 기하 실루엣. 오른쪽을 겨눈다(cpu는 CSS로 좌우 반전).
const slinger = (fallen, flash) => (
    <g className={`sf-fig${fallen ? ' fall' : ''}`}>
        <polygon className="sf-leg" points="40,128 48,128 46,96 42,96" />
        <polygon className="sf-leg" points="52,128 60,128 58,96 54,96" />
        <polygon className="sf-poncho" points="30,100 70,100 62,54 38,54" />
        <polygon className="sf-chest" points="50,52 66,86 34,86" />
        <rect className="sf-arm" x="60" y="66" width="26" height="8" rx="3" />
        <rect className="sf-barrel" x="82" y="67" width="14" height="6" rx="1" />
        <circle className="sf-head" cx="50" cy="42" r="11" />
        <ellipse className="sf-brim" cx="50" cy="34" rx="24" ry="5" />
        <rect className="sf-crown" x="40" y="18" width="20" height="17" rx="3" />
        {flash && (
            <polygon
                className="sf-flash"
                points="96,70 108,62 103,70 112,72 103,74 106,82 97,76 92,84 92,70"
            />
        )}
    </g>
);

const Standoff = () => {
    const [phase, setPhase] = useState('idle');   // idle · ready · fire · result · over
    const [outcome, setOutcome] = useState(null); // win · lose · false
    const [pRt, setPRt] = useState(null);
    const [cRt, setCRt] = useState(null);
    const [pScore, setPScore] = useState(0);
    const [cScore, setCScore] = useState(0);
    const [seq, setSeq] = useState(0);            // 파편 애니메이션 리셋 키

    const signalTimer = useRef(null);
    const cpuTimer = useRef(null);
    const sigTime = useRef(0);
    const cpuRtRef = useRef(0);
    const phaseRef = useRef('idle');
    const pScoreRef = useRef(0);
    const cScoreRef = useRef(0);

    useEffect(() => { phaseRef.current = phase; }, [phase]);

    const clearTimers = useCallback(() => {
        if (signalTimer.current) { clearTimeout(signalTimer.current); signalTimer.current = null; }
        if (cpuTimer.current) { clearTimeout(cpuTimer.current); cpuTimer.current = null; }
    }, []);

    // 한 판 종료 판정. res: win(내가 먼저) · lose(기계가 먼저/내가 느림) · false(부정출발).
    const finish = useCallback((res, playerMs, cpuMs) => {
        clearTimers();
        setPRt(playerMs);
        setCRt(cpuMs);
        setOutcome(res);
        if (res === 'win') { pScoreRef.current += 1; setPScore(pScoreRef.current); }
        else { cScoreRef.current += 1; setCScore(cScoreRef.current); }
        if (res !== 'false') setSeq((s) => s + 1);
        const done = pScoreRef.current >= TARGET || cScoreRef.current >= TARGET;
        setPhase(done ? 'over' : 'result');
    }, [clearTimers]);

    // 다음 판 시작 — 무작위 지연 뒤 신호를 띄운다.
    const startRound = useCallback(() => {
        clearTimers();
        setOutcome(null); setPRt(null); setCRt(null);
        setPhase('ready');
        signalTimer.current = setTimeout(() => {
            sigTime.current = performance.now();
            cpuRtRef.current = Math.round(rand(CPU_MIN, CPU_MAX));
            setPhase('fire');
            // 기계도 자기 반응시간이 지나면 뽑는다 — 내가 그 전에 못 뽑으면 진다.
            cpuTimer.current = setTimeout(() => {
                finish('lose', null, cpuRtRef.current);
            }, cpuRtRef.current);
        }, rand(MIN_DELAY, MAX_DELAY));
    }, [clearTimers, finish]);

    const restart = useCallback(() => {
        clearTimers();
        pScoreRef.current = 0; cScoreRef.current = 0;
        setPScore(0); setCScore(0);
        setPRt(null); setCRt(null); setOutcome(null);
        setPhase('idle');
    }, [clearTimers]);

    // Space / 탭 = 하나의 조작계. 국면에 따라 시작·뽑기·부정출발·재시작으로 갈린다.
    const act = useCallback(() => {
        const p = phaseRef.current;
        if (p === 'idle' || p === 'result') { startRound(); return; }
        if (p === 'over') { restart(); return; }
        if (p === 'ready') { finish('false', null, null); return; }   // 신호 전에 뽑음
        if (p === 'fire') {
            const ms = Math.round(performance.now() - sigTime.current);
            finish(ms < cpuRtRef.current ? 'win' : 'lose', ms, cpuRtRef.current);
        }
    }, [startRound, restart, finish]);

    // keydown 은 1회만 바인딩하고 최신 act 는 ref 로 참조한다.
    const actRef = useRef(act);
    useEffect(() => { actRef.current = act; }, [act]);
    useEffect(() => {
        const onKey = (e) => {
            if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); actRef.current(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    useEffect(() => () => clearTimers(), [clearTimers]);

    // 파생 표시 상태
    const pFell = outcome === 'lose' || outcome === 'false';
    const cFell = outcome === 'win';
    const pFlash = outcome === 'win';
    const cFlash = outcome === 'lose' && cRt != null;

    const headline = () => {
        if (outcome === 'win') return '먼저 뽑았다';
        if (outcome === 'false') return '부정출발';
        if (cRt != null) return '느렸다';
        return '먼저 뽑혔다';
    };

    // 승수 눈금 — 도형(점)으로만. TARGET 개의 슬롯을 채운다.
    const pips = (score, mine) => (
        <div className={`sf-pips${mine ? ' mine' : ''}`}>
            {Array.from({ length: TARGET }, (_, i) => (
                <span key={`${mine ? 'p' : 'c'}-pip-${i}`} className={`sf-pip${i < score ? ' on' : ''}`} />
            ))}
        </div>
    );

    return (
        <LabShell
            title="Standoff"
            subtitle="반응속도 서부 결투 — 신호가 뜨면 먼저 뽑아라"
            eyebrow="body · duel · kinetic type"
            path="standoff"
        >
            <div className="sf-wrap" data-phase={phase}>
                <div
                    className="sf-stage"
                    role="button"
                    tabIndex={0}
                    aria-label="결투 무대 — 탭하거나 Space 로 뽑는다"
                    onPointerDown={(e) => { e.preventDefault(); act(); }}
                    onKeyDown={() => { /* Space 는 전역 핸들러가 처리 */ }}
                >
                    {/* 승수 눈금 */}
                    <div className="sf-scorebar">
                        {pips(pScore, true)}
                        <span className="sf-vs">VS</span>
                        {pips(cScore, false)}
                    </div>

                    {/* 무대 — 태양·땅·두 결투자 (전부 도형) */}
                    <svg className="sf-scene" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
                        <circle className="sf-sun" cx="200" cy="66" r="40" />
                        <line className="sf-ground" x1="0" y1="168" x2="400" y2="168" />
                        <g transform="translate(28,40) scale(0.9)">{slinger(pFell, pFlash)}</g>
                        <g transform="translate(372,40) scale(-0.9,0.9)">{slinger(cFell, cFlash)}</g>
                    </svg>

                    {/* 중앙 신호/판정 존 — 타이포그래피가 인터랙션의 심장 */}
                    <div className="sf-center">
                        {phase === 'idle' && <div className="sf-cue idle" aria-hidden="true" />}
                        {phase === 'ready' && (
                            <div className="sf-cue wait">
                                <span className="sf-dot" /><span className="sf-dot" /><span className="sf-dot" />
                            </div>
                        )}
                        {phase === 'fire' && <div key={`sig-${seq}`} className="sf-signal">쏴</div>}
                        {(phase === 'result' || phase === 'over') && (
                            <div className="sf-verdict" data-res={outcome}>
                                {outcome !== 'false' && (
                                    <div key={`burst-${seq}`} className="sf-burst" aria-hidden="true">
                                        {SHARDS.map((s) => (
                                            <span
                                                key={s.id}
                                                className="sf-shard"
                                                style={{
                                                    '--dx': `${s.dx}px`,
                                                    '--dy': `${s.dy}px`,
                                                    '--rot': `${s.rot}deg`,
                                                    width: `${s.size}px`,
                                                    height: `${s.size}px`,
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                                <span className="sf-word">{headline()}</span>
                            </div>
                        )}
                    </div>

                    {/* 반응시간 판독 — 최소한의 숫자 */}
                    {(phase === 'result' || phase === 'over') && outcome !== 'false' && (
                        <div className="sf-read">
                            <span className="sf-rt mine">{pRt != null ? `${pRt}ms` : '—'}</span>
                            <span className="sf-rt cpu">{cRt != null ? `${cRt}ms` : '—'}</span>
                        </div>
                    )}
                </div>

                {/* 안내 — 국면별 한 줄 */}
                <p className="sf-hint">
                    {phase === 'idle' && '탭 · Space 로 대치를 시작한다'}
                    {phase === 'ready' && '신호를 기다려라 … 먼저 움직이면 부정출발'}
                    {phase === 'fire' && '지금이다'}
                    {phase === 'result' && (outcome === 'win' ? '탭 · Space 로 다음 판' : '탭 · Space 로 다음 판')}
                    {phase === 'over' && (pScore > cScore ? '당신의 승리 — 탭 · Space 로 다시' : '기계의 승리 — 탭 · Space 로 다시')}
                </p>
            </div>
        </LabShell>
    );
};

export default Standoff;
