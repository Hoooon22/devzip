import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Quorum.css';

// QUORUM — 합의 알고리즘(리더 선출·정족수 투표) 실험.
// 핵심: 서로를 완전히 믿을 수 없는 노드들이, 중앙 조정자 없이도 "누가 대표(리더)인가"와
// "어떤 기록을 확정할 것인가"에 다수결(정족수, N/2+1)로 합의한다 — Raft의 뼈대.
//  · 팔로워는 리더의 하트비트가 끊기면 선거 타이머가 만료되어 후보가 된다.
//  · 후보는 임기(term)를 올리고 표를 모아, 과반을 얻으면 리더가 된다.
//  · 리더만 기록(엔트리)을 받고, 과반 노드에 복제된 기록만 '확정(commit)'된다.
// 리더를 클릭해 죽이면(장애) 남은 노드끼리 새 임기의 리더를 다시 뽑는 과정을 볼 수 있다.

const N = 5;
const MAJORITY = Math.floor(N / 2) + 1; // 3
const TICK_MS = 130;

// 선거 타임아웃을 노드마다 다르게 무작위화해야 표가 갈리지 않고 한 명이 먼저 나선다.
const randTimeout = () => 16 + Math.floor(Math.random() * 16); // 16~31 tick

const initSim = () => ({
    tick: 0,
    eid: 1, // 이벤트 고유 id 시퀀스 (리스트 key용)
    nodes: Array.from({ length: N }, (_, id) => {
        const t = randTimeout();
        return {
            id,
            state: 'follower', // follower | candidate | leader | down
            term: 0,
            votedFor: null,
            votes: 0,
            timer: t,
            timerMax: t,
            match: 0, // 이 노드가 보유한 엔트리 수
        };
    }),
    entries: [], // { seq, term, value, committed }
    events: [{ id: 0, tick: 0, text: '클러스터 부팅 — 모두 팔로워, 리더 없음. 곧 선거가 시작됩니다.' }],
});

const pushEvent = (sim, text) => {
    sim.events.unshift({ id: sim.eid++, tick: sim.tick, text });
    if (sim.events.length > 9) sim.events.pop();
};

const findLeader = (sim) =>
    sim.nodes.find((n) => n.state === 'leader' && n.state !== 'down');

// 한 틱 전진 — 순수 함수처럼 새 sim 객체를 만들어 반환한다.
const step = (prev) => {
    const sim = {
        tick: prev.tick + 1,
        eid: prev.eid,
        nodes: prev.nodes.map((n) => ({ ...n })),
        entries: prev.entries.map((e) => ({ ...e })),
        events: prev.events.slice(),
    };
    const nodes = sim.nodes;
    const up = (n) => n.state !== 'down';
    let leader = nodes.find((n) => n.state === 'leader');

    // 1) 리더 하트비트: 살아있는 리더는 팔로워의 선거 타이머를 재설정하고 기록을 복제한다.
    if (leader && up(leader)) {
        leader.match = sim.entries.length; // 리더는 항상 전체 로그를 보유
        for (const n of nodes) {
            if (n.id === leader.id || !up(n)) continue;
            // 하트비트를 받으면 팔로워로 복귀하고 리더의 임기를 따른다.
            if (n.term <= leader.term) {
                n.term = leader.term;
                n.state = 'follower';
                n.votedFor = leader.id;
                n.votes = 0;
                const t = randTimeout();
                n.timer = t;
                n.timerMax = t;
                // 뒤처진 팔로워에게 한 틱에 한 엔트리씩 복제(전파 과정을 눈으로 보게).
                if (n.match < sim.entries.length) n.match += 1;
            }
        }
        // 2) 커밋 판정: 리더 임기에 만든 엔트리가 과반 노드에 복제되면 확정된다.
        for (let i = 0; i < sim.entries.length; i++) {
            if (sim.entries[i].committed) continue;
            const replicated = nodes.filter((n) => up(n) && n.match > i).length;
            if (replicated >= MAJORITY && sim.entries[i].term === leader.term) {
                sim.entries[i].committed = true;
                pushEvent(
                    sim,
                    `기록 #${sim.entries[i].seq} "${sim.entries[i].value}" 가 과반(${replicated}/${N})에 복제되어 확정됨.`,
                );
            }
        }
    }

    // 3) 선거 타이머 진행 — 리더가 아니고 살아있는 노드만.
    for (const n of nodes) {
        if (!up(n) || n.state === 'leader') continue;
        n.timer -= 1;
        if (n.timer > 0) continue;

        // 타임아웃 → 후보 출마: 임기를 올리고 자신에게 투표한 뒤 표를 요청한다.
        n.state = 'candidate';
        n.term += 1;
        n.votedFor = n.id;
        n.votes = 1;
        pushEvent(sim, `Node ${n.id} 선거 타임아웃 → 후보 출마 (term ${n.term}).`);

        for (const other of nodes) {
            if (other.id === n.id || !up(other)) continue;
            const freshTerm = other.term < n.term;
            const notVoted = other.term === n.term && other.votedFor === null;
            // 로그 최신성: 후보의 로그가 유권자보다 뒤처지면 표를 주지 않는다(안전성).
            const logOk = n.match >= other.match;
            if ((freshTerm || notVoted) && logOk) {
                other.term = n.term;
                other.votedFor = n.id;
                other.state = 'follower';
                other.votes = 0;
                const t = randTimeout();
                other.timer = t;
                other.timerMax = t;
                n.votes += 1;
            }
        }

        if (n.votes >= MAJORITY) {
            n.state = 'leader';
            n.match = sim.entries.length;
            n.timer = n.timerMax; // 리더는 타이머를 쓰지 않음
            leader = n;
            for (const other of nodes) {
                if (other.id !== n.id && up(other)) other.state = 'follower';
            }
            pushEvent(sim, `Node ${n.id} 가 term ${n.term} 리더로 선출됨 (득표 ${n.votes}/${N}).`);
        } else {
            // 정족수 미달(표 분산) → 새 타이머로 재시도. 이때문에 선거가 한 번에 안 끝나기도.
            const t = randTimeout();
            n.timer = t;
            n.timerMax = t;
        }
    }

    return sim;
};

// 노드 상태 → 한국어 라벨/축약
const LABEL = { follower: '팔로워', candidate: '후보', leader: '리더', down: '다운' };

const reducer = (sim, action) => {
    switch (action.type) {
        case 'tick':
            return step(sim);
        case 'toggle': {
            const nodes = sim.nodes.map((n) => ({ ...n }));
            const n = nodes[action.id];
            if (n.state === 'down') {
                // 복구 — 팔로워로 재시작.
                n.state = 'follower';
                n.votedFor = null;
                n.votes = 0;
                const t = randTimeout();
                n.timer = t;
                n.timerMax = t;
                n.match = 0; // 죽은 동안 놓친 로그는 리더 하트비트로 다시 채워진다
            } else {
                const wasLeader = n.state === 'leader';
                n.state = 'down';
                n.votes = 0;
                const next = { ...sim, nodes, events: sim.events.slice() };
                pushEvent(
                    next,
                    wasLeader
                        ? `Node ${n.id}(리더) 장애 발생 — 하트비트 중단. 남은 노드가 새 리더를 선출합니다.`
                        : `Node ${n.id} 장애 발생.`,
                );
                return next;
            }
            const next = { ...sim, nodes, events: sim.events.slice() };
            pushEvent(next, `Node ${n.id} 복구 — 팔로워로 재합류.`);
            return next;
        }
        case 'propose': {
            const leader = findLeader(sim);
            if (!leader) return sim; // 리더 없으면 기록 불가 — 합의의 전제
            const entries = sim.entries.map((e) => ({ ...e }));
            const seq = entries.length + 1;
            entries.push({ seq, term: leader.term, value: action.value, committed: false });
            const nodes = sim.nodes.map((n) => ({ ...n }));
            nodes[leader.id].match = entries.length;
            const next = { ...sim, nodes, entries, events: sim.events.slice() };
            pushEvent(next, `클라이언트가 "${action.value}" 를 리더 Node ${leader.id}에 기록 요청.`);
            return next;
        }
        case 'reset':
            return initSim();
        default:
            return sim;
    }
};

const PROPOSE_WORDS = ['SET x=1', 'DEL y', 'PUT cfg', 'ADD job', 'INC n', 'SET z=9'];

const Quorum = () => {
    const [sim, dispatch] = useReducer(reducer, undefined, initSim);
    const runningRef = useRef(true);
    const [, forceTick] = useReducer((x) => x + 1, 0); // 일시정지 토글 리렌더용
    const proposeIdx = useRef(0);

    useEffect(() => {
        const iv = setInterval(() => {
            if (runningRef.current) dispatch({ type: 'tick' });
        }, TICK_MS);
        return () => clearInterval(iv);
    }, []);

    const toggleRun = useCallback(() => {
        runningRef.current = !runningRef.current;
        forceTick();
    }, []);

    const propose = useCallback(() => {
        const value = PROPOSE_WORDS[proposeIdx.current % PROPOSE_WORDS.length];
        proposeIdx.current += 1;
        dispatch({ type: 'propose', value });
    }, []);

    const leader = sim.nodes.find((n) => n.state === 'leader');
    const committed = sim.entries.filter((e) => e.committed).length;
    const term = Math.max(...sim.nodes.map((n) => n.term));

    // 링 배치: 노드를 원형으로 좌표 계산(상단 12시부터 시계방향).
    const R = 38; // % 반지름
    const pos = sim.nodes.map((_, i) => {
        const a = (-Math.PI / 2) + (i * 2 * Math.PI) / N;
        return { x: 50 + R * Math.cos(a), y: 50 + R * Math.sin(a) };
    });

    return (
        <LabShell
            title="QUORUM"
            eyebrow="distributed consensus"
            subtitle={'// 중앙 조정자 없이 다수결로 리더를 뽑고 기록을 확정한다 — 합의 알고리즘(Raft)'}
            path="quorum.exe"
        >
            <section className="k-win qr-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/cluster/</span>raft</span>
                    <span className="meta k-mono">tick {sim.tick}</span>
                </div>

                <div className="qr-toolbar">
                    <div className="qr-stat">
                        <span className="qr-stat-k k-mono">TERM</span>
                        <span className="qr-stat-v">{term}</span>
                    </div>
                    <div className="qr-stat">
                        <span className="qr-stat-k k-mono">LEADER</span>
                        <span className={`qr-stat-v ${leader ? 'is-lead' : 'is-none'}`}>
                            {leader ? `Node ${leader.id}` : '없음'}
                        </span>
                    </div>
                    <div className="qr-stat">
                        <span className="qr-stat-k k-mono">COMMITTED</span>
                        <span className="qr-stat-v">{committed}/{sim.entries.length}</span>
                    </div>
                    <div className="qr-actions">
                        <button type="button" className="qr-btn qr-btn-ghost" onClick={toggleRun}>
                            {runningRef.current ? '⏸ 일시정지' : '▶ 재생'}
                        </button>
                        <button type="button" className="qr-btn" onClick={propose} disabled={!leader}>
                            + 기록 제안
                        </button>
                        <button type="button" className="qr-btn qr-btn-ghost" onClick={() => dispatch({ type: 'reset' })}>
                            리셋
                        </button>
                    </div>
                </div>

                <div className="qr-stage">
                    {/* 클러스터 링 */}
                    <div className="qr-ring">
                        <svg className="qr-wires" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                            {leader && sim.nodes.map((n) => {
                                if (n.id === leader.id || n.state === 'down') return null;
                                return (
                                    <line
                                        key={n.id}
                                        className="qr-wire is-beat"
                                        x1={pos[leader.id].x} y1={pos[leader.id].y}
                                        x2={pos[n.id].x} y2={pos[n.id].y}
                                    />
                                );
                            })}
                        </svg>

                        {sim.nodes.map((n) => (
                            <button
                                type="button"
                                key={n.id}
                                className={`qr-node is-${n.state}`}
                                style={{ left: `${pos[n.id].x}%`, top: `${pos[n.id].y}%` }}
                                onClick={() => dispatch({ type: 'toggle', id: n.id })}
                                title={n.state === 'down' ? '클릭해 복구' : '클릭해 장애 발생시키기'}
                            >
                                <span className="qr-node-crown">{n.state === 'leader' ? '♔' : ''}</span>
                                <span className="qr-node-id k-mono">N{n.id}</span>
                                <span className="qr-node-state">{LABEL[n.state]}</span>
                                <span className="qr-node-term k-mono">t{n.term}</span>
                                {n.state === 'candidate' && (
                                    <span className="qr-node-votes k-mono">{n.votes}/{N}표</span>
                                )}
                                {(n.state === 'follower') && (
                                    <span className="qr-timer" aria-hidden="true">
                                        <span
                                            className="qr-timer-fill"
                                            style={{ width: `${Math.max(0, (n.timer / n.timerMax) * 100)}%` }}
                                        />
                                    </span>
                                )}
                            </button>
                        ))}
                        <div className="qr-ring-hub k-mono">
                            <span>과반</span>
                            <strong>{MAJORITY}/{N}</strong>
                        </div>
                    </div>

                    {/* 로그 복제 매트릭스 */}
                    <div className="qr-log">
                        <div className="qr-log-head k-mono">
                            <span>복제 로그</span>
                            <span className="qr-log-legend">
                                <i className="dot is-c" /> 확정
                                <i className="dot is-u" /> 미확정
                            </span>
                        </div>
                        {sim.entries.length === 0 ? (
                            <p className="qr-log-empty">
                                아직 기록이 없습니다. 리더가 있으면 <b>+ 기록 제안</b>으로 엔트리를 넣어보세요.
                            </p>
                        ) : (
                            <div className="qr-matrix" role="table">
                                <div className="qr-matrix-row qr-matrix-labels" role="row">
                                    <span className="qr-matrix-corner k-mono" />
                                    {sim.entries.map((e) => (
                                        <span key={e.seq} className={`qr-cell-h k-mono ${e.committed ? 'is-c' : 'is-u'}`} role="columnheader">
                                            #{e.seq}
                                            <em>t{e.term}</em>
                                        </span>
                                    ))}
                                </div>
                                {sim.nodes.map((n) => (
                                    <div className="qr-matrix-row" role="row" key={n.id}>
                                        <span className={`qr-matrix-node k-mono is-${n.state}`} role="rowheader">
                                            N{n.id}
                                        </span>
                                        {sim.entries.map((e, i) => {
                                            const has = n.state !== 'down' && n.match > i;
                                            return (
                                                <span
                                                    key={e.seq}
                                                    role="cell"
                                                    className={`qr-cell ${has ? (e.committed ? 'is-c' : 'is-u') : 'is-empty'}`}
                                                    title={`Node ${n.id} · 기록 #${e.seq}`}
                                                />
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="qr-events">
                            <div className="qr-events-head k-mono">이벤트 로그</div>
                            <ul>
                                {sim.events.map((ev, i) => (
                                    <li key={ev.id} className={i === 0 ? 'is-new' : ''}>
                                        <span className="qr-ev-tick k-mono">t{ev.tick}</span>
                                        <span className="qr-ev-txt">{ev.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <p className="qr-hint">
                    노드를 <b>클릭</b>하면 장애(다운)와 복구를 오갑니다. <b>리더</b>를 죽이면 남은 노드가
                    새 임기(term)로 재선거를 시작합니다. <b>+ 기록 제안</b>은 리더에게만 쓰이고, 과반에 복제된 기록만 초록으로 확정됩니다.
                </p>

                <div className="k-resize"></div>
            </section>

            <section className="k-win qr-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="qr-foot">
                    <p>
                        {'여러 대의 서버가 하나의 서비스를 이루면, "지금 진짜 값은 무엇인가"를 두고 언제든 의견이 갈릴 수 있다. '}
                        {'네트워크는 끊기고 서버는 죽는다. 그럼에도 전체가 '}<b>하나의 일관된 상태</b>{'로 움직이게 하려면, '}
                        {'누가 대표로 기록을 받고 무엇을 확정할지에 대한 '}<b>합의(consensus)</b>{'가 필요하다.'}
                    </p>
                    <p>
                        {'Raft의 답은 단순하다. 한 '}<b>임기(term)</b>{'에 리더는 한 명뿐이고, 리더는 '}
                        {'과반(정족수, N/2+1)의 표를 받아야 뽑힌다. 리더는 하트비트로 자신이 살아있음을 알리고, '}
                        {'하트비트가 끊기면 팔로워의 선거 타이머가 만료되어 새 리더를 뽑는다. 타이머를 노드마다 '}
                        {'무작위로 두는 것만으로 대부분의 표 분산이 저절로 풀린다.'}
                    </p>
                    <p>
                        {'기록도 같은 원리다. 리더가 받은 엔트리는 '}<b>과반 노드에 복제된 순간에만 확정</b>{'된다. '}
                        {'그래서 리더가 갑자기 죽어도, 확정된 기록은 이미 다수가 갖고 있어 사라지지 않는다 — '}
                        {'소수만 아는 기록은 새 리더가 덮어쓸 수 있다. '}<b>다수결이 곧 진실</b>{'인 셈이다.'}
                    </p>
                    <p className="qr-disclaimer">
                        {'* 리더 선출·임기·하트비트·로그 복제/커밋의 핵심 흐름을 보여주는 단순화 데모입니다. '}
                        {'실제 Raft의 nextIndex/matchIndex 협상, 로그 불일치 되감기, 영속화, 스냅샷 등은 생략했습니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Quorum;
