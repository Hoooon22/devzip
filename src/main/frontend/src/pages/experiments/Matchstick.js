import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Matchstick.css';

// MATCHSTICK — 심지뽑기 (규칙과 게임 × 진짜 쓰는 도구 × 키보드 입력 자체가 조작계 × 화면에 숫자가 하나도 안 보인다).
//   소재: 짧은 심지 뽑기 — 여럿 중 하나만 짧다. 짧은 쪽을 뽑은 사람이 "걸린다".
//         커피 살 사람·당번·벌칙을 정할 때 실제로 쓰는 공정한 1/N 뽑기.
//   형식: 진짜 쓰는 도구 — 인원을 정하고 차례로 뽑으면 딱 한 명이 정해진다. 매번 공정.
//   기술: 키보드 입력 자체가 조작계 — ↑↓로 인원, ← →로 심지 고르기, Enter로 뽑기. 마우스는 거들 뿐.
//   제약: 화면에 숫자가 하나도 안 보인다 — 인원은 점, 차례는 불빛, 결과는 불붙은 성냥. 숫자 없음.
//
//   도전: 성냥이 통에 꽂혀 있을 땐 머리만 보여 길이를 알 수 없고(전부 똑같아 보임),
//         뽑아 올리는 순간 감춰졌던 몸통이 드러나며 길이가 갈린다 — 짧은 하나는 머리에 불이 붙는다.
//         "감춰진 길이를 손으로 뽑아 드러내는" 감각을, 애니메이션 루프 없이 CSS 트랜지션 + 통 가림막만으로 세우기.

const MIN_P = 2;
const MAX_P = 8;
const DEFAULT_P = 4;
const LEN_SAFE = 150;   // 성한 성냥 몸통 길이(px) — 뽑으면 길게 솟는다
const LEN_SHORT = 52;   // 걸린 성냥(짧은 심지) — 뽑으면 뭉툭하고 불이 붙는다

const rack = (n) => {
    const shortIdx = Math.floor(Math.random() * n);
    return Array.from({ length: n }, (_, i) => ({
        id: `st-${i}`,
        short: i === shortIdx,
        pulled: false,
        turn: -1,
    }));
};

// 성냥 한 개비 — 머리(인화점)+몸통(나무). 뽑히면 .pulled 로 솟아오르며 몸통이 드러난다.
const Stick = ({ st, left, hot, onPick }) => {
    const len = st.short ? LEN_SHORT : LEN_SAFE;
    const cls = [
        'mx-stick',
        st.pulled ? 'pulled' : '',
        st.pulled && st.short ? 'burned' : '',
        st.pulled && !st.short ? 'safe' : '',
        hot ? 'hot' : '',
    ].join(' ').trim();
    return (
        <button
            type="button"
            className={cls}
            style={{ left: `${left}%`, '--len': `${len}px` }}
            onPointerDown={(e) => { e.preventDefault(); onPick(); }}
            aria-label={st.pulled ? (st.short ? '걸린 심지' : '성한 성냥') : '통에 꽂힌 성냥'}
            tabIndex={-1}
        >
            <span className="mx-flame" aria-hidden="true">
                <span className="mx-flame-core" />
            </span>
            <span className="mx-head" />
            <span className="mx-body" />
        </button>
    );
};

Stick.propTypes = {
    st: PropTypes.shape({
        short: PropTypes.bool,
        pulled: PropTypes.bool,
    }).isRequired,
    left: PropTypes.number.isRequired,
    hot: PropTypes.bool.isRequired,
    onPick: PropTypes.func.isRequired,
};

const Matchstick = () => {
    const [phase, setPhase] = useState('setup');   // setup | pull | burned
    const [count, setCount] = useState(DEFAULT_P);
    const [sticks, setSticks] = useState([]);
    const [cursor, setCursor] = useState(0);
    const [turn, setTurn] = useState(0);
    const [round, setRound] = useState(0);

    const phaseRef = useRef(phase); useEffect(() => { phaseRef.current = phase; }, [phase]);
    const countRef = useRef(count); useEffect(() => { countRef.current = count; }, [count]);
    const sticksRef = useRef(sticks); useEffect(() => { sticksRef.current = sticks; }, [sticks]);
    const cursorRef = useRef(cursor); useEffect(() => { cursorRef.current = cursor; }, [cursor]);
    const turnRef = useRef(turn); useEffect(() => { turnRef.current = turn; }, [turn]);

    const deal = useCallback(() => {
        setSticks(rack(countRef.current));
        setCursor(0);
        setTurn(0);
        setRound((r) => r + 1);
        setPhase('pull');
    }, []);

    const move = useCallback((dir) => {
        const arr = sticksRef.current;
        const n = arr.length;
        if (!n) return;
        let i = cursorRef.current;
        for (let k = 0; k < n; k += 1) {
            i = (i + dir + n) % n;
            if (!arr[i].pulled) { setCursor(i); return; }
        }
    }, []);

    const pull = useCallback((idx) => {
        const arr = sticksRef.current.slice();
        const i = idx == null ? cursorRef.current : idx;
        const st = arr[i];
        if (!st || st.pulled) return;
        const t = turnRef.current;
        arr[i] = { ...st, pulled: true, turn: t };
        setSticks(arr);
        if (st.short) {
            setPhase('burned');
            return;
        }
        setTurn(t + 1);
        const nextI = arr.findIndex((s) => !s.pulled);
        setCursor(nextI >= 0 ? nextI : i);
    }, []);

    // keydown 은 1회만 바인딩하고, 최신 상태는 ref 로 참조한다.
    useEffect(() => {
        const onKey = (e) => {
            const p = phaseRef.current;
            switch (e.key) {
                case 'ArrowUp':
                    if (p === 'setup') { e.preventDefault(); setCount((c) => Math.min(MAX_P, c + 1)); }
                    break;
                case 'ArrowDown':
                    if (p === 'setup') { e.preventDefault(); setCount((c) => Math.max(MIN_P, c - 1)); }
                    break;
                case 'ArrowLeft':
                    if (p === 'pull') { e.preventDefault(); move(-1); }
                    break;
                case 'ArrowRight':
                    if (p === 'pull') { e.preventDefault(); move(1); }
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (p === 'setup') deal();
                    else if (p === 'pull') pull();
                    else if (p === 'burned') deal();
                    break;
                case 'Backspace':
                    if (p !== 'setup') { e.preventDefault(); setPhase('setup'); }
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [deal, move, pull]);

    // 인원 점 상태 파생 — 차례순으로 뽑은 성냥에 매핑.
    const stickByTurn = (t) => sticks.find((s) => s.pulled && s.turn === t);
    const dotState = (p) => {
        const st = stickByTurn(p);
        if (st) return st.short ? 'burned' : 'safe';
        if (phase === 'pull' && p === turn) return 'active';
        return 'waiting';
    };

    // 심지가 통에 꽂혀 있을 땐 머리만 보인다 — 뽑기 전엔 전부 똑같은 길이로 위장.
    const rackLeft = (i, n) => {
        const span = Math.min(64, 12 * n);           // 전체 폭(%) — 인원 많으면 촘촘
        const step = n > 1 ? span / (n - 1) : 0;
        return 50 - span / 2 + i * step;
    };

    const caption =
        phase === 'setup' ? '몇 명?'
            : phase === 'pull' ? '누구 차례'
                : '걸린 사람';

    const hint =
        phase === 'setup' ? '↑ ↓ 로 인원을 정하고 · Enter 로 심지를 쥔다'
            : phase === 'pull' ? '← → 로 고르고 · Enter 로 뽑는다'
                : 'Enter 로 다시 뽑기 · Backspace 로 인원 바꾸기';

    return (
        <LabShell
            title="Matchstick"
            subtitle="심지뽑기 — 짧은 성냥을 뽑는 사람이 걸린다"
            eyebrow="rules · fair draw · keyboard"
            path="matchstick"
        >
            <div className={`mx-wrap ph-${phase}`} data-round={round}>
                <span className="mx-cap k-mono">{caption}</span>

                {/* 인원 — 점으로만. 차례는 불빛, 걸린 사람은 불꽃. 숫자 없음. */}
                <div className="mx-people" aria-label="참가 인원">
                    {Array.from({ length: count }, (_, p) => (
                        <span key={`dot-${p}`} className={`mx-dot ${dotState(p)}`}>
                            <span className="mx-dot-spark" aria-hidden="true" />
                        </span>
                    ))}
                </div>

                {/* 무대 — 성냥통에 꽂힌 성냥들. 뽑으면 길이가 갈린다. */}
                <div className="mx-stage" data-phase={phase}>
                    <div className="mx-rack" key={`rack-${round}`}>
                        {sticks.map((st, i) => (
                            <Stick
                                key={st.id}
                                st={st}
                                left={rackLeft(i, sticks.length)}
                                hot={phase === 'pull' && i === cursor && !st.pulled}
                                onPick={() => { if (phase === 'pull' && !st.pulled) { setCursor(i); pull(i); } }}
                            />
                        ))}
                    </div>

                    {/* 성냥통 앞판 — 꽂힌 몸통을 가려 길이를 숨긴다. */}
                    <div className="mx-drawer" aria-hidden="true">
                        <span className="mx-strike" />
                        <span className="mx-label">◆</span>
                    </div>

                    {/* 고르개 — 지금 겨눈 성냥 아래 불씨. */}
                    {phase === 'pull' && sticks[cursor] && !sticks[cursor].pulled && (
                        <span className="mx-cursor" style={{ left: `${rackLeft(cursor, sticks.length)}%` }} />
                    )}

                    {/* 판정 — 낱말 하나. */}
                    {phase === 'burned' && (
                        <div key={`v-${round}`} className="mx-verdict">걸렸다</div>
                    )}
                </div>

                <p className="mx-hint">{hint}</p>
            </div>
        </LabShell>
    );
};

export default Matchstick;
