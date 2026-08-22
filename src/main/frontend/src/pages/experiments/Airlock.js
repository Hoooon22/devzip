import React, { useCallback, useEffect, useMemo, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Airlock.css';

// AIRLOCK — 자율 에이전트의 신뢰 경계 실험.
// 언어모델은 "지시"와 "데이터"를 구조적으로 구분하지 못한다. 그래서 에이전트가
// 바깥에서 읽어온 문장이 그대로 명령처럼 실행될 수 있다. 다만 그것만으로는
// 사고가 나지 않는다. 사고는 세 가지가 한 실행 안에서 겹칠 때 성립한다.
//   ① 비신뢰 입력(외부에서 읽어온 텍스트)
//   ② 비밀 접근(자격증명·사내 문서를 읽을 수 있음)
//   ③ 외부 통신(바깥으로 무언가 내보낼 수 있음)
// 이 셋 중 하나만 끊어도 경로는 무너진다 — 방어는 결국 "무엇을 끊을 것인가"의 문제고,
// 무엇을 끊든 에이전트가 할 수 있는 일도 함께 줄어든다. 그 맞교환이 이 실험의 주제다.

const BATCH = 200;

const DEFENSES = [
    {
        key: 'taint',
        name: '출처 태깅',
        en: 'taint tracking',
        desc: '외부에서 읽어온 조각에 꼬리표를 달아, 그 안의 문장은 명령이 아니라 자료로만 취급한다.',
        cost: '비용: 거의 없음',
    },
    {
        key: 'bulkhead',
        name: '컨텍스트 격벽',
        en: 'context isolation',
        desc: '외부 원문을 통째로 넣지 않고 요약본만 넘긴다. 숨은 지시가 희석된다.',
        cost: '비용: 정보 손실로 작업 실패 증가',
    },
    {
        key: 'leastPriv',
        name: '비밀 격리',
        en: 'least privilege',
        desc: '자격증명을 컨텍스트에 올리지 않는다. 모델은 비밀을 읽지 못한 채 대리 호출만 한다.',
        cost: '비용: 비밀이 필요한 작업은 대부분 포기',
    },
    {
        key: 'allowlist',
        name: '전송 허용목록',
        en: 'egress allowlist',
        desc: '바깥으로 나가는 목적지를 미리 정한 곳으로만 제한한다.',
        cost: '비용: 목록 밖 목적지가 필요한 작업 실패',
    },
    {
        key: 'hitl',
        name: '사람 확인',
        en: 'human in the loop',
        desc: '외부 전송 직전에 사람에게 승인을 묻는다. 다만 사람도 반복되면 그냥 누른다.',
        cost: '비용: 매 실행이 느려지고 승인 피로로 일부 통과',
    },
];

const INITIAL_DEFENSES = { taint: false, bulkhead: false, leastPriv: false, allowlist: false, hitl: false };

const EXTERNAL_SOURCES = [
    '공개 이슈 트래커의 댓글',
    '검색 결과로 열린 웹페이지',
    '받은 편지함의 첨부 문서',
    '외부 협력사가 공유한 스프레드시트',
    '스크랩해 둔 기술 블로그 글',
];
const TASKS = [
    '이번 주 미결 이슈를 정리해 요약해줘',
    '이 문서 내용을 대시보드에 반영해줘',
    '메일함을 훑어 회신 초안을 만들어줘',
    '고객 목록을 내부 시트와 대조해줘',
    '보고서를 만들어 팀 채널에 올려줘',
];

// 한 번의 실행을 끝까지 굴린다. rnd 를 주입해 배치/단일 실행이 같은 규칙을 쓰게 한다.
const simulate = (d, attackRate, rnd) => {
    const log = [];
    const say = (stage, text, verdict) => log.push({ stage, text, verdict });

    const task = {
        title: TASKS[Math.floor(rnd() * TASKS.length)],
        source: EXTERNAL_SOURCES[Math.floor(rnd() * EXTERNAL_SOURCES.length)],
        external: rnd() < 0.8,
        secret: rnd() < 0.65,
        egress: rnd() < 0.7,
    };
    const poisoned = task.external && rnd() < attackRate;

    say('요청', `사용자: "${task.title}"`, 'info');

    // ① 비신뢰 입력
    if (task.external) {
        say('수집', `${task.source}을(를) 컨텍스트로 읽어들임`, poisoned ? 'bad' : 'info');
        if (poisoned) say('수집', '읽어온 본문 안에 사람 눈에는 안 보이는 지시문이 섞여 있음', 'bad');
    } else {
        say('수집', '외부 자료 없이 사용자 지시만으로 진행', 'ok');
    }

    let hijacked = poisoned;
    if (hijacked && d.taint) {
        if (rnd() < 0.7) { hijacked = false; say('해석', '출처 태깅 — 외부 조각의 문장을 명령이 아닌 자료로 처리', 'block'); }
        else say('해석', '출처 태깅을 우회 — 사용자 지시를 흉내 낸 문장이 명령으로 승격', 'bad');
    }
    if (hijacked && d.bulkhead) {
        if (rnd() < 0.5) { hijacked = false; say('해석', '컨텍스트 격벽 — 요약 과정에서 숨은 지시가 탈락', 'block'); }
        else say('해석', '요약본에도 지시문이 살아남음', 'bad');
    }
    if (hijacked) say('해석', '에이전트가 외부 문장을 사용자 명령으로 착각 — 계획이 바뀜', 'bad');
    else if (poisoned) say('해석', '주입된 지시가 무력화됨', 'block');

    // ② 비밀 접근
    let secretInContext = false;
    if (task.secret) {
        if (d.leastPriv) say('도구', '비밀 격리 — 자격증명은 컨텍스트에 오르지 않고 프록시가 대신 호출', 'block');
        else { secretInContext = true; say('도구', '사내 문서·자격증명을 컨텍스트로 로드', hijacked ? 'bad' : 'info'); }
    } else {
        say('도구', '이번 작업은 비밀 자료를 건드리지 않음', 'ok');
    }

    // ③ 외부 통신
    let exfil = hijacked && secretInContext && task.egress;
    if (hijacked && secretInContext && !task.egress) {
        say('에어록', '납치된 계획이 내보낼 통로를 찾지 못함 — 삼중 위험 미성립', 'block');
    }
    if (exfil) {
        say('에어록', '알 수 없는 주소로 비밀을 담은 요청을 시도', 'bad');
        if (d.allowlist) {
            if (rnd() < 0.95) { exfil = false; say('에어록', '전송 허용목록 — 목록에 없는 목적지라 차단', 'block'); }
            else say('에어록', '허용된 목적지를 경유해 우회', 'bad');
        }
        if (exfil && d.hitl) {
            if (rnd() < 0.85) { exfil = false; say('에어록', '사람 확인 — 사용자가 낯선 전송을 거절', 'block'); }
            else say('에어록', '승인 피로 — 사용자가 확인 없이 승인', 'bad');
        }
    } else if (task.egress && !hijacked) {
        say('에어록', '정상 작업 범위의 외부 요청', 'ok');
    }

    // 작업 성공 여부 — 방어를 켤수록 안전해지지만 할 수 있는 일이 줄어든다.
    let ok = true;
    if (hijacked) ok = rnd() < 0.35;
    if (ok && d.bulkhead) ok = rnd() < 0.85;
    if (ok && d.taint) ok = rnd() < 0.97;
    if (ok && d.leastPriv && task.secret) ok = rnd() < 0.5;
    if (ok && d.allowlist && task.egress) ok = rnd() < 0.8;
    if (ok && d.hitl) ok = rnd() < 0.9;

    if (exfil) say('결과', '비밀이 외부로 빠져나감 — 사용자는 아무것도 보지 못했다', 'bad');
    else if (ok) say('결과', '요청한 작업을 마쳤고 새어 나간 것은 없음', 'ok');
    else say('결과', '유출은 없었지만 요청한 작업은 끝내지 못함', 'info');

    return {
        task,
        poisoned,
        hijacked,
        secretInContext,
        egress: task.egress,
        exfil,
        ok: ok && !exfil,
        log,
    };
};

const runBatch = (d, attackRate) => {
    const cells = [];
    let leaks = 0;
    let done = 0;
    for (let i = 0; i < BATCH; i++) {
        const r = simulate(d, attackRate, Math.random);
        if (r.exfil) { leaks += 1; cells.push('leak'); }
        else if (r.ok) { done += 1; cells.push('done'); }
        else cells.push('miss');
    }
    return { cells, leaks, done };
};

const STAGES = ['요청', '수집', '해석', '도구', '에어록', '결과'];

const Airlock = () => {
    const [defenses, setDefenses] = useState(INITIAL_DEFENSES);
    const [attackRate, setAttackRate] = useState(0.35);
    const [run, setRun] = useState(() => simulate(INITIAL_DEFENSES, 0.35, Math.random));
    const [cursor, setCursor] = useState(0);
    const [playing, setPlaying] = useState(true);

    const batch = useMemo(() => runBatch(defenses, attackRate), [defenses, attackRate]);

    const newRun = useCallback(() => {
        setRun(simulate(defenses, attackRate, Math.random));
        setCursor(0);
    }, [defenses, attackRate]);

    // 방어 설정이나 공격 비율이 바뀌면 바로 새 실행을 굴려 변화를 눈으로 잇는다.
    useEffect(() => { newRun(); }, [newRun]);

    // 한 단계씩 전진하다가 끝에 닿으면 잠시 머문 뒤 다음 실행으로 넘어간다.
    useEffect(() => {
        if (!playing) return undefined;
        const last = cursor >= run.log.length - 1;
        const id = setTimeout(() => {
            if (last) newRun();
            else setCursor((c) => c + 1);
        }, last ? 1800 : 760);
        return () => clearTimeout(id);
    }, [playing, cursor, run, newRun]);

    const toggle = (key) => setDefenses((d) => ({ ...d, [key]: !d[key] }));

    const shown = run.log.slice(0, cursor + 1);
    const stage = shown.length ? shown[shown.length - 1].stage : '요청';
    const stageIdx = STAGES.indexOf(stage);
    const finished = cursor >= run.log.length - 1;

    // 삼중 위험 — 이번 실행에서 세 다리가 모두 놓였는가.
    const legs = [
        { k: '비신뢰 입력', on: run.poisoned, hint: '외부에서 읽어온 지시문' },
        { k: '비밀 접근', on: run.secretInContext, hint: '자격증명이 컨텍스트에' },
        { k: '외부 통신', on: run.egress, hint: '바깥으로 나가는 통로' },
    ];
    const trifecta = legs.every((l) => l.on);

    const onCount = Object.values(defenses).filter(Boolean).length;
    const leakPct = ((batch.leaks / BATCH) * 100).toFixed(1);
    const donePct = ((batch.done / BATCH) * 100).toFixed(1);

    return (
        <LabShell
            title="AIRLOCK"
            eyebrow="agent trust boundary"
            subtitle={'// 비신뢰 입력·비밀·외부 통신이 한 실행에서 겹칠 때 에이전트는 샌다 — 신뢰 경계 실험'}
            path="airlock"
        >
            <section className="k-win al-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">/agent/</span>boundary</span>
                    <span className="meta k-mono">defenses {onCount}/{DEFENSES.length}</span>
                </div>

                <div className="al-toolbar">
                    <div className="al-stat">
                        <span className="al-stat-k k-mono">유출률</span>
                        <span className={`al-stat-v ${batch.leaks ? 'is-leak' : 'is-safe'}`}>{leakPct}%</span>
                    </div>
                    <div className="al-stat">
                        <span className="al-stat-k k-mono">작업 완료율</span>
                        <span className="al-stat-v">{donePct}%</span>
                    </div>
                    <label className="al-slider">
                        <span className="al-stat-k k-mono">읽는 문서의 오염 비율 {Math.round(attackRate * 100)}%</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={Math.round(attackRate * 100)}
                            onChange={(e) => setAttackRate(Number(e.target.value) / 100)}
                            aria-label="오염된 외부 문서 비율"
                        />
                    </label>
                    <div className="al-actions">
                        <button type="button" className="al-btn al-btn-ghost" onClick={() => setPlaying((p) => !p)}>
                            {playing ? '⏸ 일시정지' : '▶ 재생'}
                        </button>
                        <button type="button" className="al-btn" onClick={newRun}>⟳ 새 실행</button>
                        <button
                            type="button"
                            className="al-btn al-btn-ghost"
                            onClick={() => { setDefenses(INITIAL_DEFENSES); setAttackRate(0.35); }}
                        >
                            리셋
                        </button>
                    </div>
                </div>

                <div className="al-stage">
                    {/* 왼쪽: 한 번의 실행을 단계별로 따라간다 */}
                    <div className="al-run">
                        <div className="al-task k-mono">
                            <span className="al-task-k">RUN</span>
                            <span className="al-task-v">{run.task.title}</span>
                        </div>

                        <ol className="al-rail">
                            {STAGES.map((s, i) => (
                                <li
                                    key={s}
                                    className={`al-rail-item ${i === stageIdx ? 'is-now' : ''} ${i < stageIdx ? 'is-past' : ''}`}
                                >
                                    <span className="al-rail-dot" />
                                    <span className="al-rail-k k-mono">{s}</span>
                                </li>
                            ))}
                        </ol>

                        <div className={`al-tri ${trifecta ? 'is-armed' : ''}`}>
                            <div className="al-tri-head k-mono">
                                <span>삼중 위험</span>
                                <span className={trifecta ? 'is-armed-tag' : ''}>
                                    {trifecta ? '성립 — 경로가 열렸다' : '미성립 — 한 다리가 비었다'}
                                </span>
                            </div>
                            <div className="al-tri-legs">
                                {legs.map((l) => (
                                    <div key={l.k} className={`al-leg ${l.on ? 'is-on' : ''}`}>
                                        <span className="al-leg-k">{l.k}</span>
                                        <span className="al-leg-h">{l.hint}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={`al-gate ${run.exfil && finished ? 'is-breach' : ''} ${!run.exfil && finished ? 'is-sealed' : ''}`}>
                            <span className="al-gate-k k-mono">에어록</span>
                            <span className="al-gate-v">
                                {!finished ? '판정 중…' : run.exfil ? '유출됨' : '봉인 유지'}
                            </span>
                        </div>

                        <ul className="al-log">
                            {shown.map((l, i) => (
                                <li
                                    key={`${l.stage}-${i}`}
                                    className={`is-${l.verdict} ${i === shown.length - 1 ? 'is-new' : ''}`}
                                >
                                    <span className="al-log-s k-mono">{l.stage}</span>
                                    <span className="al-log-t">{l.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* 오른쪽: 무엇을 끊을지 고르고, 그 대가를 배치로 확인한다 */}
                    <div className="al-panel">
                        <div className="al-panel-head k-mono">경계 설정 — 무엇을 끊을 것인가</div>
                        <div className="al-defs">
                            {DEFENSES.map((f) => (
                                <button
                                    type="button"
                                    key={f.key}
                                    className={`al-def ${defenses[f.key] ? 'is-on' : ''}`}
                                    onClick={() => toggle(f.key)}
                                    aria-pressed={defenses[f.key]}
                                >
                                    <span className="al-def-sw" aria-hidden="true" />
                                    <span className="al-def-bd">
                                        <span className="al-def-n">
                                            {f.name}
                                            <em className="k-mono">{f.en}</em>
                                        </span>
                                        <span className="al-def-d">{f.desc}</span>
                                        <span className="al-def-c k-mono">{f.cost}</span>
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="al-batch">
                            <div className="al-batch-head k-mono">
                                <span>{BATCH}회 실행 결과</span>
                                <span className="al-legend">
                                    <i className="dot is-done" /> 완료
                                    <i className="dot is-miss" /> 미완
                                    <i className="dot is-leak" /> 유출
                                </span>
                            </div>
                            <div className="al-grid" aria-hidden="true">
                                {batch.cells.map((c, i) => (
                                    <span key={i} className={`al-cell is-${c}`} />
                                ))}
                            </div>
                            <div className="al-bars">
                                <div className="al-bar">
                                    <span className="al-bar-k k-mono">유출</span>
                                    <span className="al-bar-t"><i className="is-leak" style={{ width: `${(batch.leaks / BATCH) * 100}%` }} /></span>
                                    <span className="al-bar-v k-mono">{batch.leaks}</span>
                                </div>
                                <div className="al-bar">
                                    <span className="al-bar-k k-mono">완료</span>
                                    <span className="al-bar-t"><i className="is-done" style={{ width: `${(batch.done / BATCH) * 100}%` }} /></span>
                                    <span className="al-bar-v k-mono">{batch.done}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="al-hint">
                    오른쪽 <b>경계 설정</b>을 켜고 끄면 즉시 {BATCH}회가 다시 돌아갑니다. 전부 끄면 유출이 쏟아지고,
                    전부 켜면 유출은 멎지만 <b>완료율</b>이 함께 주저앉습니다. 유출을 0에 붙이면서 완료율을 가장 높게
                    남기는 조합을 찾아보세요.
                </p>

                <div className="k-resize"></div>
            </section>

            <section className="k-win al-foot-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="al-foot">
                    <p>
                        {'언어모델에게 컨텍스트는 그냥 하나의 긴 글이다. 어디까지가 '}<b>주인의 지시</b>
                        {'이고 어디부터가 '}<b>바깥에서 주워 온 자료</b>{'인지 구조적으로 나뉘어 있지 않다. '}
                        {'그래서 웹페이지·메일·이슈 댓글 속 한 줄이 그대로 명령처럼 읽힐 수 있다.'}
                    </p>
                    <p>
                        {'하지만 그것만으로 사고가 나지는 않는다. 피해는 한 실행 안에서 '}<b>비신뢰 입력</b>{' · '}
                        <b>비밀 접근</b>{' · '}<b>외부 통신</b>{' 세 가지가 모두 겹칠 때 성립한다. 읽을 수 있어도 '}
                        {'내보낼 통로가 없으면, 내보낼 수 있어도 읽을 비밀이 없으면 경로는 끊긴다. '}
                        {'방어의 요령은 완벽한 탐지가 아니라 '}<b>세 다리 중 하나를 확실히 빼는 것</b>{'이다.'}
                    </p>
                    <p>
                        {'대신 다리를 뺄수록 에이전트가 할 수 있는 일도 줄어든다. 비밀을 안 주면 비밀이 필요한 일을 못 하고, '}
                        {'목적지를 묶으면 묶인 곳 밖으로는 못 나간다. 사람에게 매번 물으면 사람이 지쳐서 그냥 누른다. '}
                        {'그래서 이 문제는 "막았다/못 막았다"가 아니라 '}<b>어디까지 좁힐 것인가의 설계 문제</b>{'에 가깝다.'}
                    </p>
                    <p className="al-disclaimer">
                        {'* 특정 제품·사건이 아니라 에이전트 보안의 일반 구조를 다룬 단순화 모형입니다. 각 방어의 차단 확률과 '}
                        {'비용은 개념 전달을 위해 임의로 정한 값이며, 실제 시스템의 측정치가 아닙니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Airlock;
