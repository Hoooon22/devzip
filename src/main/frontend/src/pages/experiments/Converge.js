import React, { useMemo, useRef, useState, useCallback } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Converge.css';

// CONVERGE — 충돌 없는 복제 데이터(CRDT) 실험.
// 핵심: 두 복제본이 연결이 끊긴 채 따로 편집해도, 다시 만났을 때 "다툼 없이" 같은 결과로 수렴한다.
// 순진한 병합(마지막 저장이 이김 = LWW)은 한쪽 편집을 통째로 날려버린다.
// CRDT는 글자 하나하나에 고유 위치(pos)와 출처(site)를 새겨두어, 순서를 어떤 방식으로 합치든
// 항상 같은 문서로 귀결시킨다 — 서버 없이도 협업이 깨지지 않는 로컬-우선(local-first)의 뼈대.

const SEED = 'sync note';

// 글자 모델: { id, pos, site, ch, del }
//  - id: 전역 고유 식별자 (site#seq)
//  - pos: 정렬용 실수 좌표. 이웃 사이에 끼워 넣을 때 그 중간값을 준다.
//  - site: 만든 복제본 (A / B / S=공유 시드) — pos가 같을 때의 타이브레이크
//  - del: 툼스톤. 지워도 흔적은 남겨야 병합이 단조(monotonic)해진다.
const makeSeed = (text) =>
    Array.from(text).map((ch, i) => ({ id: `S#${i}`, pos: i + 1, site: 'S', ch, del: false }));

const clone = (chars) => chars.map((c) => ({ ...c }));

// 지워지지 않은 글자를 (pos, id) 순으로 정렬 → 눈에 보이는 순서
const visible = (chars) =>
    chars.filter((c) => !c.del).sort((a, b) => a.pos - b.pos || (a.id < b.id ? -1 : 1));

const toText = (chars) => visible(chars).map((c) => c.ch).join('');

// 이전 문자열과 새 문자열의 공통 접두/접미를 잘라 "바뀐 한 구간"만 뽑아
// 삭제(툼스톤)와 삽입(새 글자)으로 옮긴다. 타이핑·삭제·붙여넣기 같은 단일 구간 편집을 처리.
const applyEdit = (chars, newStr, site, counters) => {
    const vis = visible(chars);
    const oldStr = vis.map((c) => c.ch).join('');
    if (oldStr === newStr) return chars;

    let p = 0;
    while (p < oldStr.length && p < newStr.length && oldStr[p] === newStr[p]) p++;
    let s = 0;
    while (
        s < oldStr.length - p &&
        s < newStr.length - p &&
        oldStr[oldStr.length - 1 - s] === newStr[newStr.length - 1 - s]
    ) s++;

    const delEnd = oldStr.length - s; // 삭제 구간 [p, delEnd)
    const deletedIds = new Set();
    for (let i = p; i < delEnd; i++) deletedIds.add(vis[i].id);

    const inserted = newStr.slice(p, newStr.length - s);

    // 삽입 지점의 좌우 이웃 pos로 경계를 잡는다 (앞/뒤 끝이면 ±1로 확장)
    let leftPos = vis[p - 1] ? vis[p - 1].pos : null;
    let rightPos = vis[delEnd] ? vis[delEnd].pos : null;
    if (leftPos === null && rightPos === null) { leftPos = 0; rightPos = 1; }
    else if (leftPos === null) leftPos = rightPos - 1;
    else if (rightPos === null) rightPos = leftPos + 1;

    const additions = Array.from(inserted).map((ch, i) => ({
        id: `${site}#${counters.current[site]++}`,
        pos: leftPos + ((rightPos - leftPos) * (i + 1)) / (inserted.length + 1),
        site,
        ch,
        del: false,
    }));

    const next = chars.map((c) => (deletedIds.has(c.id) ? { ...c, del: true } : { ...c }));
    return next.concat(additions);
};

// CRDT 병합: 두 집합을 id로 합집합. 같은 id는 삭제 플래그를 OR(툼스톤은 되살아나지 않음).
// pos/ch는 만든 시점에 고정되어 양쪽이 동일 → 정렬 결과도 동일 → 반드시 수렴.
const crdtMerge = (a, b) => {
    const map = new Map();
    for (const c of a.concat(b)) {
        const prev = map.get(c.id);
        if (prev) prev.del = prev.del || c.del;
        else map.set(c.id, { ...c });
    }
    return Array.from(map.values());
};

// 순진한 병합: 마지막에 편집한 쪽(논리 시계가 큰 쪽)이 문서 전체를 차지. 진 쪽 편집은 소멸.
const lwwWinner = (clockA, clockB) => (clockB > clockA ? 'B' : 'A');

const Converge = () => {
    const counters = useRef({ A: 0, B: 0 });
    const clocks = useRef({ A: 0, B: 0 });
    const tick = useRef(0);

    const [charsA, setCharsA] = useState(() => makeSeed(SEED));
    const [charsB, setCharsB] = useState(() => makeSeed(SEED));
    const [online, setOnline] = useState(true);
    const [strategy, setStrategy] = useState('crdt'); // 'crdt' | 'lww'
    const [note, setNote] = useState(null); // 마지막 동기화 결과 메시지

    const textA = useMemo(() => toText(charsA), [charsA]);
    const textB = useMemo(() => toText(charsB), [charsB]);
    const diverged = textA !== textB;

    // 아직 공유되지 않은(= 한쪽에만 보이는) 글자 수 — 두 복제본 가시 집합의 대칭차
    const divergence = useMemo(() => {
        const visA = new Set(visible(charsA).map((c) => c.id));
        const visB = new Set(visible(charsB).map((c) => c.id));
        let onlyA = 0, onlyB = 0;
        for (const id of visA) if (!visB.has(id)) onlyA++;
        for (const id of visB) if (!visA.has(id)) onlyB++;
        return { onlyA, onlyB };
    }, [charsA, charsB]);

    // 두 전략의 결과 미리보기 — 커밋 전에 차이를 눈으로 본다
    const previews = useMemo(() => {
        const crdt = toText(crdtMerge(charsA, charsB));
        const winner = lwwWinner(clocks.current.A, clocks.current.B);
        const lww = winner === 'A' ? textA : textB;
        // LWW로 잃는 편집: 진 쪽에만 있는 보이는 글자 수
        const winIds = new Set(
            visible(winner === 'A' ? charsA : charsB).map((c) => c.id)
        );
        const loserChars = visible(winner === 'A' ? charsB : charsA);
        const lost = loserChars.filter((c) => !winIds.has(c.id)).length;
        return { crdt, lww, winner, lost };
    }, [charsA, charsB, textA, textB]);

    // 한 복제본 편집 적용. 온라인이면 즉시 CRDT로 상대에 전파(실시간 협업).
    const edit = useCallback((side, newStr) => {
        clocks.current[side] = ++tick.current;
        if (side === 'A') {
            setCharsA((prev) => {
                const nextA = applyEdit(prev, newStr, 'A', counters);
                if (online) { const m = crdtMerge(nextA, charsBRef.current); charsBRef.current = m; setCharsB(clone(m)); return clone(m); }
                return nextA;
            });
        } else {
            setCharsB((prev) => {
                const nextB = applyEdit(prev, newStr, 'B', counters);
                if (online) { const m = crdtMerge(charsARef.current, nextB); charsARef.current = m; setCharsA(clone(m)); return clone(m); }
                return nextB;
            });
        }
        setNote(null);
    }, [online]);

    // setState 함수형 업데이트 안에서 상대 복제본의 최신값을 읽기 위한 미러 ref
    const charsARef = useRef(charsA);
    const charsBRef = useRef(charsB);
    charsARef.current = charsA;
    charsBRef.current = charsB;

    const sync = useCallback(() => {
        if (strategy === 'crdt') {
            const m = crdtMerge(charsA, charsB);
            setCharsA(clone(m));
            setCharsB(clone(m));
            setNote({ ok: true, text: 'CRDT 병합 — 양쪽 편집을 모두 보존한 채 두 복제본이 동일하게 수렴했습니다.' });
        } else {
            const winner = lwwWinner(clocks.current.A, clocks.current.B);
            const src = winner === 'A' ? charsA : charsB;
            setCharsA(clone(src));
            setCharsB(clone(src));
            setNote({
                ok: false,
                text: `순진한 병합(LWW) — 마지막에 저장한 ${winner} 복제본이 문서를 덮어썼습니다. ${winner === 'A' ? 'B' : 'A'}의 편집 ${previews.lost}자가 사라졌습니다.`,
            });
        }
    }, [strategy, charsA, charsB, previews.lost]);

    const goOffline = useCallback(() => { setOnline(false); setNote(null); }, []);
    const goOnline = useCallback(() => {
        // 다시 연결 = 실시간 협업 복귀. 되도록 손실 없이 CRDT로 화해시킨다.
        setOnline(true);
        const m = crdtMerge(charsARef.current, charsBRef.current);
        setCharsA(clone(m));
        setCharsB(clone(m));
        setNote(null);
    }, []);

    const reset = useCallback(() => {
        counters.current = { A: 0, B: 0 };
        clocks.current = { A: 0, B: 0 };
        tick.current = 0;
        setCharsA(makeSeed(SEED));
        setCharsB(makeSeed(SEED));
        setOnline(true);
        setNote(null);
    }, []);

    // 시나리오 자동 편집: 분리 상태에서 A는 앞에 ★, B는 뒤에 ✓ — 전형적 동시 편집 충돌을 재현
    const scenario = useCallback(() => {
        counters.current = { A: 0, B: 0 };
        clocks.current = { A: 0, B: 0 };
        tick.current = 0;
        const seedA = makeSeed(SEED);
        const seedB = makeSeed(SEED);
        clocks.current.A = ++tick.current;
        const a = applyEdit(seedA, '★ ' + SEED, 'A', counters);
        clocks.current.B = ++tick.current; // B가 더 나중 → LWW는 B가 이김
        const b = applyEdit(seedB, SEED + ' ✓', 'B', counters);
        setOnline(false);
        setCharsA(a);
        setCharsB(b);
        setNote(null);
    }, []);

    // 주의: 별도 컴포넌트로 빼면 매 렌더마다 리마운트되어 textarea 포커스가 풀린다.
    // 부모 트리에 인라인되는 렌더 함수로 두어 캐럿을 보존한다.
    const renderReplica = (side, text, chars) => {
        const localCount = side === 'A' ? divergence.onlyA : divergence.onlyB;
        return (
            <div className={`cv-replica cv-replica-${side.toLowerCase()}`}>
                <div className="cv-replica-head">
                    <span className="cv-tag">복제본 {side}</span>
                    <span className={`cv-conn k-mono ${online ? 'is-on' : 'is-off'}`}>
                        {online ? '◉ 연결됨' : '◌ 분리됨'}
                    </span>
                </div>
                <textarea
                    className="cv-editor k-mono"
                    value={text}
                    spellCheck={false}
                    rows={2}
                    onChange={(e) => edit(side, e.target.value)}
                    aria-label={`복제본 ${side} 편집기`}
                />
                <div className="cv-replica-foot k-mono">
                    <span>{visible(chars).length}자</span>
                    <span className={localCount > 0 ? 'cv-pending' : ''}>
                        {online ? '실시간 동기화 중' : localCount > 0 ? `미공유 편집 ${localCount}` : '변경 없음'}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <LabShell
            title="CONVERGE"
            eyebrow="conflict-free replication"
            subtitle={'// 따로 편집해도 다툼 없이 같은 결과로 — 충돌 없는 복제 데이터(CRDT)'}
            path="converge.exe"
        >
            <section className="k-win cv-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/proc/</span>replication</span>
                    <span className="meta k-mono">crdt playground</span>
                </div>

                <div className="cv-toolbar">
                    <div className="cv-conn-toggle" role="group" aria-label="연결 상태">
                        <button
                            type="button"
                            className={`cv-seg ${online ? 'is-active' : ''}`}
                            onClick={goOnline}
                        >◉ 연결</button>
                        <button
                            type="button"
                            className={`cv-seg ${!online ? 'is-active' : ''}`}
                            onClick={goOffline}
                        >◌ 분리</button>
                    </div>

                    <div className="cv-strategy" role="group" aria-label="병합 방식">
                        <span className="cv-strategy-label">병합 방식</span>
                        <label className={strategy === 'crdt' ? 'is-sel' : ''}>
                            <input type="radio" name="strategy" checked={strategy === 'crdt'} onChange={() => setStrategy('crdt')} />
                            CRDT
                        </label>
                        <label className={strategy === 'lww' ? 'is-sel' : ''}>
                            <input type="radio" name="strategy" checked={strategy === 'lww'} onChange={() => setStrategy('lww')} />
                            순진한 LWW
                        </label>
                    </div>

                    <div className="cv-actions">
                        <button type="button" className="cv-btn cv-btn-ghost" onClick={scenario}>시나리오 재현</button>
                        <button type="button" className="cv-btn cv-btn-ghost" onClick={reset}>리셋</button>
                        <button type="button" className="cv-btn" onClick={sync} disabled={online || !diverged}>
                            ⇄ 동기화 (병합)
                        </button>
                    </div>
                </div>

                <div className="cv-stage">
                    {renderReplica('A', textA, charsA)}

                    <div className={`cv-link ${diverged ? 'is-diverged' : 'is-converged'}`}>
                        <span className="cv-link-line" />
                        <span className="cv-link-badge k-mono">
                            {diverged ? '분기됨' : '동일'}
                        </span>
                        <span className="cv-link-line" />
                    </div>

                    {renderReplica('B', textB, charsB)}
                </div>

                <div className="cv-merge">
                    <div className="cv-merge-col">
                        <div className="cv-merge-head">
                            <span className="cv-merge-name">CRDT 병합</span>
                            <span className="cv-merge-flag cv-ok k-mono">수렴 보장</span>
                        </div>
                        <div className="cv-merge-out k-mono">{previews.crdt || '∅'}</div>
                        <p className="cv-merge-note">양쪽 편집이 모두 살아남고, 합치는 순서와 무관하게 결과가 같습니다.</p>
                    </div>
                    <div className="cv-merge-col">
                        <div className="cv-merge-head">
                            <span className="cv-merge-name">순진한 병합 (LWW)</span>
                            <span className="cv-merge-flag cv-warn k-mono">
                                {previews.lost > 0 ? `${previews.lost}자 유실` : '유실 없음'}
                            </span>
                        </div>
                        <div className="cv-merge-out k-mono">{previews.lww || '∅'}</div>
                        <p className="cv-merge-note">
                            마지막에 저장한 <b>{previews.winner}</b> 복제본이 전부를 덮어쓰고, 나머지 편집은 사라집니다.
                        </p>
                    </div>
                </div>

                {note && (
                    <div className={`cv-toast ${note.ok ? 'is-ok' : 'is-warn'}`}>
                        {note.ok ? '✓ ' : '⚠ '}{note.text}
                    </div>
                )}

                <p className="cv-hint">
                    두 편집기에 직접 타이핑해 보세요. <b>연결</b> 상태면 키를 누르는 즉시 양쪽이 같아집니다.
                    <b> 분리</b> 후 각각 다르게 고친 뒤 <b>동기화</b>하면, 병합 방식에 따라 결과가 갈립니다.
                </p>

                <div className="k-resize"></div>
            </section>

            <section className="k-win cv-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="cv-foot">
                    <p>
                        {'여러 사람이 같은 문서를 동시에 고치면, 네트워크가 끊긴 사이 각자의 복제본은 서로 다른 방향으로 갈라진다. '}
                        {'다시 연결됐을 때 이 갈라짐을 어떻게 합칠 것인가 — 이것이 '}<b>협업의 근본 문제</b>{'다.'}
                    </p>
                    <p>
                        {'가장 순진한 답은 '}<b>마지막에 저장한 쪽이 이긴다(LWW)</b>{'. 구현은 쉽지만, 진 쪽이 그 사이 한 편집은 '}
                        {'통째로 증발한다. 협업 도구에서 "내가 쓴 게 사라졌어요"의 정체가 대개 이것이다.'}
                    </p>
                    <p>
                        {'CRDT(충돌 없는 복제 데이터)는 글자 하나하나에 '}<b>고유한 위치와 출처</b>{'를 새긴다. 삭제도 지우지 않고 '}
                        {'툼스톤으로 표시만 한다. 그래서 두 복제본을 '}<b>어떤 순서로 합치든</b>{' 언제나 같은 문서로 귀결되고, '}
                        {'중앙 서버의 조정 없이도 편집이 서로를 덮어쓰지 않는다 — '}<b>로컬-우선 협업</b>{'의 수학적 뼈대다.'}
                    </p>
                    <p className="cv-disclaimer">
                        {'* 실제 프로덕션 CRDT(RGA·LSEQ·Yjs 등)의 위치 인코딩을 실수 좌표로 단순화한 결정적 데모입니다. 수렴·툼스톤·출처 태깅의 핵심 아이디어를 보여주는 데 초점을 둡니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Converge;
