import React, { useMemo, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Montyhall.css';

// MONTYHALL — 몬티 홀 딜레마 (Monty Hall problem).
//   문 3개 중 하나 뒤에 자동차, 나머지 둘 뒤에는 꽝(염소)이 있다. 참가자가 문 하나를
//   고르면, 정답을 아는 진행자가 남은 두 문 중 "꽝인 문"을 하나 열어 보여 준다. 이제
//   선택지는 둘 — 처음 문을 유지할까, 남은 문으로 바꿀까? 직관은 "이제 반반"이라 말하지만
//   실제로는 바꾸면 2/3, 유지하면 1/3로 이긴다.
// 밑바탕의 보편 개념: 새 정보(진행자가 연 문)가 "무작위로" 온 게 아니라 규칙에 묶여
//   들어오면, 확률은 그 조건에 맞춰 다시 나뉜다(조건부 확률). 처음 고른 문의 1/3은
//   그대로 남고, 나머지 2/3가 열리지 않은 단 하나의 문으로 몰린다.

const rint = (n) => Math.floor(Math.random() * n);

// ── 3문 손맛 게임의 초기 상태 ──
const freshRound = () => ({
    phase: 'pick',      // 'pick' → 'decide' → 'done'
    car: rint(3),       // 자동차가 있는 문
    pick: null,         // 참가자가 처음 고른 문
    opened: null,       // 진행자가 연 꽝 문
    finalPick: null,    // 최종 선택
    switched: false,
    won: false,
});

const Montyhall = () => {
    const [round, setRound] = useState(freshRound);
    // 손맛 게임 집계 — 유지/바꾸기를 각각 몇 번 했고 몇 번 이겼나
    const [tally, setTally] = useState({ stayN: 0, stayW: 0, swN: 0, swW: 0 });

    // ── 시뮬레이션 상태 ──
    const [doors, setDoors] = useState(3);
    const [sim, setSim] = useState({ trials: 0, stayW: 0, swW: 0 });

    // 문을 고르면 진행자가 꽝 문 하나를 연다
    const onPick = (i) => {
        if (round.phase !== 'pick') return;
        // 진행자는 참가자가 고른 문도, 자동차 문도 열지 않는다
        const candidates = [0, 1, 2].filter((d) => d !== i && d !== round.car);
        const opened = candidates[rint(candidates.length)];
        setRound((r) => ({ ...r, pick: i, opened, phase: 'decide' }));
    };

    // 유지(false) / 바꾸기(true)
    const onDecide = (doSwitch) => {
        if (round.phase !== 'decide') return;
        const other = [0, 1, 2].find((d) => d !== round.pick && d !== round.opened);
        const finalPick = doSwitch ? other : round.pick;
        const won = finalPick === round.car;
        setRound((r) => ({ ...r, finalPick, switched: doSwitch, won, phase: 'done' }));
        setTally((t) => doSwitch
            ? { ...t, swN: t.swN + 1, swW: t.swW + (won ? 1 : 0) }
            : { ...t, stayN: t.stayN + 1, stayW: t.stayW + (won ? 1 : 0) });
    };

    const resetTally = () => setTally({ stayN: 0, stayW: 0, swN: 0, swW: 0 });

    // 시뮬레이션: 매 판마다 유지·바꾸기 두 전략의 결과를 동시에 집계.
    //   D문에서 진행자가 꽝 D-2개를 열면, 바꾸기는 처음에 자동차를 안 골랐을 때만 이긴다.
    //   → 유지 승률 = 1/D, 바꾸기 승률 = (D-1)/D.
    const runSim = (n) => {
        let sW = 0, wW = 0;
        for (let k = 0; k < n; k += 1) {
            const car = rint(doors);
            const pick = rint(doors);
            if (pick === car) sW += 1;   // 유지가 이김
            else wW += 1;                // 바꾸기가 이김
        }
        setSim((s) => ({ trials: s.trials + n, stayW: s.stayW + sW, swW: s.swW + wW }));
    };
    const resetSim = () => setSim({ trials: 0, stayW: 0, swW: 0 });

    // 단계별 안내문
    const guide = round.phase === 'pick'
        ? '문 하나를 고르세요. 뒤에 자동차가 있으면 승리.'
        : round.phase === 'decide'
            ? '진행자가 꽝 문을 열었습니다 — 처음 문을 유지할까요, 바꿀까요?'
            : round.won ? '🎉 자동차! 당신이 이겼습니다.' : '🐐 꽝… 아쉽네요.';

    const stayPct = tally.stayN ? (tally.stayW / tally.stayN) * 100 : 0;
    const swPct = tally.swN ? (tally.swW / tally.swN) * 100 : 0;

    // 시뮬레이션 승률(경험/이론)
    const simStay = sim.trials ? (sim.stayW / sim.trials) * 100 : 0;
    const simSw = sim.trials ? (sim.swW / sim.trials) * 100 : 0;
    const thStay = (1 / doors) * 100;
    const thSw = ((doors - 1) / doors) * 100;

    const doorFace = (i) => {
        const shown = round.phase === 'done' || i === round.opened;
        if (!shown) return null;
        return i === round.car ? '🚗' : '🐐';
    };
    const doorState = (i) => {
        const cls = ['mh-door'];
        if (round.pick === i) cls.push('picked');
        if (round.opened === i) cls.push('opened');
        if (round.phase === 'done') {
            if (i === round.car) cls.push('car');
            if (i === round.finalPick) cls.push('final');
            if (i === round.finalPick && !round.won) cls.push('miss');
        }
        return cls.join(' ');
    };

    // 시뮬레이션에서 진행자가 여는 문 개수 안내
    const doorNote = useMemo(
        () => `문 ${doors}개 · 진행자가 꽝 ${doors - 2}개를 연다`,
        [doors],
    );

    return (
        <LabShell
            title="MONTY HALL"
            eyebrow="conditional probability · the three-door game"
            subtitle={'// 진행자가 꽝 문을 열어 준 뒤 — 바꾸는 게 이득일까?'}
            path="montyhall.exe"
        >
            {/* 손맛 게임 */}
            <section className="k-win mh-play-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/play/</span>three-doors</span>
                    <span className="meta k-mono">직접 골라 보기</span>
                </div>

                <div className="mh-stage">
                    <p className={`mh-guide${round.phase === 'done' ? (round.won ? ' win' : ' lose') : ''}`}>
                        {guide}
                    </p>

                    <div className="mh-doors">
                        {[0, 1, 2].map((i) => (
                            <button
                                key={i}
                                type="button"
                                className={doorState(i)}
                                onClick={() => onPick(i)}
                                disabled={round.phase !== 'pick'}
                                aria-label={`${i + 1}번 문`}
                            >
                                <span className="mh-door-no k-mono">{i + 1}</span>
                                <span className="mh-door-face" aria-hidden="true">{doorFace(i)}</span>
                                {round.pick === i && round.phase !== 'done' && (
                                    <span className="mh-door-tag k-mono">내 선택</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="mh-actions">
                        {round.phase === 'decide' && (
                            <>
                                <button type="button" className="mh-btn mh-btn-ghost" onClick={() => onDecide(false)}>
                                    유지한다
                                </button>
                                <button type="button" className="mh-btn mh-btn-hot" onClick={() => onDecide(true)}>
                                    바꾼다
                                </button>
                            </>
                        )}
                        {round.phase === 'done' && (
                            <button type="button" className="mh-btn mh-btn-hot" onClick={() => setRound(freshRound())}>
                                다음 판 ▶
                            </button>
                        )}
                        {round.phase === 'pick' && (
                            <span className="mh-hint k-mono">{'// 문 번호를 클릭하세요'}</span>
                        )}
                    </div>
                </div>

                {/* 손맛 집계 */}
                <div className="mh-tally">
                    <div className="mh-tally-row">
                        <span className="mh-tally-lab">유지했을 때</span>
                        <div className="mh-bar"><div className="mh-bar-fill steel" style={{ width: `${stayPct}%` }} /></div>
                        <span className="mh-tally-num k-mono">
                            {tally.stayW}/{tally.stayN}
                            <span className="mh-tally-pct"> · {tally.stayN ? `${stayPct.toFixed(0)}%` : '—'}</span>
                        </span>
                    </div>
                    <div className="mh-tally-row">
                        <span className="mh-tally-lab">바꿨을 때</span>
                        <div className="mh-bar"><div className="mh-bar-fill hot" style={{ width: `${swPct}%` }} /></div>
                        <span className="mh-tally-num k-mono">
                            {tally.swW}/{tally.swN}
                            <span className="mh-tally-pct"> · {tally.swN ? `${swPct.toFixed(0)}%` : '—'}</span>
                        </span>
                    </div>
                    <button type="button" className="mh-reset k-mono" onClick={resetTally}>기록 초기화</button>
                </div>
            </section>

            {/* 시뮬레이션 */}
            <section className="k-win mh-sim-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/sim/</span>law-of-large-numbers</span>
                    <span className="meta k-mono">{doorNote}</span>
                </div>

                <div className="mh-sim">
                    <div className="mh-sim-ctrl">
                        <span className="mh-lab k-mono">문 개수 <b>{doors}</b></span>
                        <input
                            type="range" min="3" max="100" step="1" value={doors}
                            onChange={(e) => { setDoors(parseInt(e.target.value, 10)); resetSim(); }}
                            className="mh-range"
                            aria-label="문 개수"
                        />
                        <div className="mh-sim-btns">
                            <button type="button" className="mh-btn mh-btn-hot" onClick={() => runSim(100)}>+100판</button>
                            <button type="button" className="mh-btn mh-btn-hot" onClick={() => runSim(1000)}>+1000판</button>
                            <button type="button" className="mh-btn mh-btn-ghost" onClick={resetSim}>초기화</button>
                        </div>
                        <span className="mh-sim-count k-mono">누적 {sim.trials.toLocaleString('en-US')}판</span>
                    </div>

                    <div className="mh-sim-bars">
                        <div className="mh-sbar">
                            <div className="mh-sbar-head">
                                <span className="mh-sbar-lab">유지 전략</span>
                                <span className="mh-sbar-num k-mono">{sim.trials ? `${simStay.toFixed(1)}%` : '—'}</span>
                            </div>
                            <div className="mh-track">
                                <div className="mh-track-fill steel" style={{ width: `${simStay}%` }} />
                                <div className="mh-track-th" style={{ left: `${thStay}%` }} title={`이론값 ${thStay.toFixed(1)}%`} />
                            </div>
                            <span className="mh-sbar-th k-mono">이론 1/{doors} = {thStay.toFixed(1)}%</span>
                        </div>

                        <div className="mh-sbar">
                            <div className="mh-sbar-head">
                                <span className="mh-sbar-lab">바꾸기 전략</span>
                                <span className="mh-sbar-num k-mono hot">{sim.trials ? `${simSw.toFixed(1)}%` : '—'}</span>
                            </div>
                            <div className="mh-track">
                                <div className="mh-track-fill hot" style={{ width: `${simSw}%` }} />
                                <div className="mh-track-th" style={{ left: `${thSw}%` }} title={`이론값 ${thSw.toFixed(1)}%`} />
                            </div>
                            <span className="mh-sbar-th k-mono">이론 {doors - 1}/{doors} = {thSw.toFixed(1)}%</span>
                        </div>
                    </div>

                    <p className="mh-sim-note k-mono">
                        {'// 문을 늘릴수록 바꾸기의 이득이 커진다 — 100문이면 바꾸면 99% 승리'}
                    </p>
                </div>
            </section>

            {/* 해설 */}
            <section className="k-win mh-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="mh-foot">
                    <p>
                        문이 셋, 하나 뒤에만 자동차가 있다. 처음 아무 문이나 고르면 그 문이 정답일 확률은
                        <b> 1/3</b>, 자동차가 <b>다른 두 문 쪽</b>에 있을 확률은 <b>2/3</b>다. 여기까진 직관과 같다.
                        핵심은 그다음이다 — 정답을 아는 진행자가 <b>남은 두 문 중 반드시 꽝인 문</b>을 골라 연다.
                        이 열림은 무작위가 아니라 규칙에 묶여 있어서, 처음 내 문에 있던 1/3은 그대로 두고
                        나머지 <b>2/3를 열리지 않은 단 하나의 문</b>으로 몰아준다. 그래서 바꾸면 2/3, 유지하면 1/3이다.
                    </p>
                    <p>
                        믿기지 않으면 위에서 직접 여러 판을 해 보라. 유지만 하면 승률이 1/3 언저리, 바꾸기만 하면
                        2/3 언저리로 갈린다. 더 확실한 건 <b>문 개수를 늘려 보는 것</b>이다. 문이 100개일 때 하나를
                        찍으면 맞을 확률은 1/100. 진행자가 <b>꽝 98개를 열어젖히고</b> 딱 한 문만 남겼다면, 그 남은
                        문에는 처음 놓친 99/100이 통째로 실려 있다. 바꾸지 않을 이유가 없어진다.
                    </p>
                    <p>
                        이 퍼즐이 그토록 반직관적인 이유는, 사람이 &quot;문이 둘 남았으니 반반&quot;이라며 <b>새 정보가
                        어떻게 들어왔는지</b>를 지워 버리기 때문이다. 진행자의 선택은 정답을 <b>피해서</b> 이뤄졌다 —
                        그 조건이 확률을 다시 나눈다. 이것이 <b>조건부 확률</b>이고, 의료 검사 해석·스팸 필터·베이즈
                        추론까지 &quot;증거가 우연이 아니라 규칙을 따라 왔을 때 믿음을 어떻게 갱신하나&quot;라는 같은 원형을 공유한다.
                    </p>
                    <p className="mh-disclaimer">
                        * 교육용 시뮬레이션입니다. 모든 판은 브라우저에서 난수로 생성되며 서버로 전송되는 데이터는
                        없습니다. 진행자는 늘 정답을 알고 꽝 문만 연다는 표준 규칙(진행자가 자동차 문을 열 수 없음)을 가정합니다.
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Montyhall;
