import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Cardinal.css';

// CARDINAL — 길찾기 성향 테스트 (지도파 vs 랜드마크파).
//   소재: "공간과 지도" — 사람은 같은 길을 두 방식으로 기억한다. 하나는 조감도(survey)로,
//   머릿속에 북쪽 고정 지도를 그려 방위와 거리로 위치를 잡는다(allocentric). 다른 하나는
//   경로(route)로, 눈에 익은 지형지물과 "여기서 우회전" 같은 턴 순서를 이어 붙인다(egocentric).
//   인지과학에서 place learning(해마) vs response learning(선조체)으로 나뉘는 실제 이분법이다.
//   여섯 갈림길에서 고른 답이 나침반 바늘을 지도 쪽/표식 쪽으로 기울여, 당신의 방식이 드러난다.
// 제약: 마우스 없이 키보드만으로 — ← 지도 · → 표식 · Enter 시작 · R 다시. (탭도 되게 두어 모바일 대응)
// 기술: 전부 손으로 그린 SVG. 나침반 바늘·진행 경로·결과 지도는 CSS transform/transition 으로 움직인다.

// ── 여섯 갈림길 (S = 지도파/survey, L = 랜드마크파/route) ──
const QUESTIONS = [
    {
        q: '낯선 동네에서 길을 물었다. 어떤 대답이 더 반갑나?',
        s: '“북쪽으로 두 블록, 그다음 동쪽으로.”',
        l: '“편의점에서 우회전, 빨간 건물 지나서.”',
    },
    {
        q: '머릿속에 떠올린 지도는 어느 쪽이 위인가?',
        s: '언제나 북쪽이 위 — 고정된 조감도.',
        l: '내가 보는 방향이 위 — 몸 기준으로 돈다.',
    },
    {
        q: '지하철 출구로 막 올라왔다. 먼저 하는 일은?',
        s: '지금 동서남북 어디를 보고 있는지 가늠한다.',
        l: '눈에 익은 간판·출구 번호부터 찾는다.',
    },
    {
        q: '친구에게 우리 집 위치를 알려준다면?',
        s: '좌표처럼 — 큰길에서 몇 미터, 어느 방향.',
        l: '따라오게 — 그 카페에서 골목으로 꺾어서.',
    },
    {
        q: '길을 잃었다. 당신의 반응은?',
        s: '전체 지형을 다시 그려 방향을 재설정한다.',
        l: '왔던 길의 표식을 거꾸로 되짚는다.',
    },
    {
        q: '새 도시에서 며칠 지나면 머릿속엔 무엇이 남나?',
        s: '도시의 뼈대(강·큰길)가 먼저 잡힌다.',
        l: '자주 다니는 몇 갈래 길만 또렷해진다.',
    },
];

// sCount(0~6) → 결과 유형 다섯 밴드
const bandOf = (s) => {
    if (s >= 5) return {
        kr: '지도파', en: 'The Cartographer', map: 'survey',
        line: '머릿속 조감도로 방위를 잡는다. 북쪽이 늘 위에 고정된 사람.',
        body: '당신은 공간을 통째로 내려다본다. 처음 가는 길도 전체 뼈대 안에 좌표처럼 얹어 두기에, 지름길을 즉흥적으로 만들어내고 한 번도 안 가본 두 지점을 곧장 잇는 데 강하다. 대신 지형지물이 사라지거나 밤이 되어 풍경이 바뀌어도 방위 감각으로 버틴다.',
    };
    if (s === 4) return {
        kr: '측량가 기질', en: 'The Surveyor', map: 'survey',
        line: '기본은 지도. 급하면 표식도 쓰지만 방위가 먼저다.',
        body: '당신의 기본값은 조감도지만, 익숙한 길에선 표식의 편리함도 받아들인다. 큰 그림을 먼저 잡고 세부는 지형지물로 채우는, 균형 잡힌 지도파.',
    };
    if (s === 3) return {
        kr: '양손잡이 항해사', en: 'The Navigator', map: 'blend',
        line: '상황 따라 지도와 표식을 갈아 쓴다. 둘 다 손에 익었다.',
        body: '당신은 어느 한쪽에 매이지 않는다. 넓은 신도시에선 방위로, 골목 많은 구시가에선 표식으로 — 지형에 맞는 도구를 꺼내 쓴다. 가장 길 안 잃는 유형이지만, 그만큼 자기 방식을 한마디로 말하긴 어렵다.',
    };
    if (s === 2) return {
        kr: '표식 사용자 기질', en: 'The Wayfollower', map: 'route',
        line: '기본은 표식. 정 급할 때만 머릿속 지도를 편다.',
        body: '당신은 눈에 보이는 단서로 길을 엮는다. 자주 다니는 길에선 누구보다 빠르고 정확하지만, 처음 보는 두 지점을 잇거나 표식이 사라지면 잠깐 멈칫한다.',
    };
    return {
        kr: '랜드마크파', en: 'The Pathfollower', map: 'route',
        line: '지형지물과 턴 순서로 길을 엮는다. 발이 먼저 기억한다.',
        body: '당신은 “여기서 우회전, 그 나무 지나서”로 세계를 기억한다. 익숙한 경로에선 생각조차 필요 없을 만큼 빠르고, 세부를 놓치지 않는다. 대신 아는 길을 벗어나면 전체 그림을 새로 그려야 해 낯선 곳에서 헤맬 수 있다.',
    };
};

// 진행 경로(trail) 여섯 웨이포인트 좌표 — 지도 위 여정처럼
const NODES = [
    { x: 26, y: 40 }, { x: 84, y: 24 }, { x: 142, y: 44 },
    { x: 200, y: 22 }, { x: 256, y: 42 }, { x: 300, y: 26 },
];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// 결과별 "머릿속 지도" SVG — 유형에 따라 완전히 다른 그림
const MindMap = ({ kind }) => {
    if (kind === 'survey') {
        // 조감도: 북쪽 고정 격자 + 나침반 장미 + 직교 블록
        return (
            <svg viewBox="0 0 260 150" className="cd-mind" role="img" aria-label="북쪽이 위로 고정된 격자형 조감도">
                <rect x="0" y="0" width="260" height="150" className="cd-mind-bg" />
                {[30, 60, 90, 120, 150, 180, 210, 240].map((x) => (
                    <line key={`v${x}`} x1={x} y1="8" x2={x} y2="142" className="cd-grid" />
                ))}
                {[26, 56, 86, 116].map((y) => (
                    <line key={`h${y}`} x1="8" y1={y + 6} x2="252" y2={y + 6} className="cd-grid" />
                ))}
                <rect x="42" y="46" width="46" height="34" className="cd-block" />
                <rect x="126" y="72" width="58" height="40" className="cd-block" />
                <rect x="150" y="30" width="34" height="28" className="cd-block" />
                <path d="M20 120 L120 120 L120 60 L232 60" className="cd-route survey" />
                {/* 나침반 장미 */}
                <g transform="translate(216 34)">
                    <circle r="18" className="cd-rose-ring" />
                    <path d="M0 -18 L4 0 L0 6 L-4 0 Z" className="cd-rose-n" />
                    <path d="M0 18 L4 0 L0 -6 L-4 0 Z" className="cd-rose-s" />
                    <text x="0" y="-22" className="cd-rose-lbl">N</text>
                </g>
            </svg>
        );
    }
    if (kind === 'route') {
        // 경로도: 방위 없는 구불구불한 길 + 지형지물 표식 + 턴
        return (
            <svg viewBox="0 0 260 150" className="cd-mind" role="img" aria-label="지형지물을 이어 붙인 구불구불한 경로도">
                <rect x="0" y="0" width="260" height="150" className="cd-mind-bg" />
                <path d="M24 128 L24 92 L92 92 L92 44 L168 44 L168 96 L236 96" className="cd-route route" />
                {/* 표식들 */}
                <g className="cd-lm">
                    <circle cx="24" cy="128" r="5" className="cd-lm-start" />
                    <text x="24" y="146" className="cd-lm-lbl">출발</text>
                </g>
                <g className="cd-lm" transform="translate(92 92)">
                    <rect x="-6" y="-14" width="12" height="12" className="cd-lm-bldg" />
                    <text x="0" y="16" className="cd-lm-lbl">카페</text>
                </g>
                <g className="cd-lm" transform="translate(92 44)">
                    <path d="M0 -14 L7 0 L-7 0 Z" className="cd-lm-tree" />
                    <text x="0" y="16" className="cd-lm-lbl">나무</text>
                </g>
                <g className="cd-lm" transform="translate(168 44)">
                    <path d="M-1 -14 L-1 2 M-1 -14 L9 -10 L-1 -6" className="cd-lm-sign" />
                    <text x="4" y="18" className="cd-lm-lbl">간판</text>
                </g>
                <g className="cd-lm" transform="translate(236 96)">
                    <path d="M0 -8 L5 2 L-5 2 Z" className="cd-lm-goal" />
                    <text x="0" y="18" className="cd-lm-lbl">도착</text>
                </g>
            </svg>
        );
    }
    // blend: 흐린 격자 + 그 위 구불구불한 경로 + 작은 방위
    return (
        <svg viewBox="0 0 260 150" className="cd-mind" role="img" aria-label="흐린 격자 위에 경로가 겹쳐진 혼합 지도">
            <rect x="0" y="0" width="260" height="150" className="cd-mind-bg" />
            {[40, 80, 120, 160, 200, 240].map((x) => (
                <line key={`bv${x}`} x1={x} y1="10" x2={x} y2="140" className="cd-grid faint" />
            ))}
            {[40, 76, 112].map((y) => (
                <line key={`bh${y}`} x1="10" y1={y} x2="250" y2={y} className="cd-grid faint" />
            ))}
            <path d="M26 122 L26 80 L110 80 L110 42 L200 42 L200 100" className="cd-route route" />
            <path d="M20 60 L240 60" className="cd-route survey thin" />
            <g transform="translate(224 30)">
                <circle r="12" className="cd-rose-ring" />
                <path d="M0 -12 L3 0 L0 4 L-3 0 Z" className="cd-rose-n" />
                <text x="0" y="-15" className="cd-rose-lbl sm">N</text>
            </g>
        </svg>
    );
};

MindMap.propTypes = {
    kind: PropTypes.oneOf(['survey', 'route', 'blend']).isRequired,
};

const Cardinal = () => {
    const [phase, setPhase] = useState('intro'); // intro | quiz | result
    const [answers, setAnswers] = useState([]);   // ('S'|'L')[]
    const [locked, setLocked] = useState(false);  // 전환 애니메이션 중 입력 잠금

    const idx = answers.length;
    const sCount = useMemo(() => answers.filter((a) => a === 'S').length, [answers]);
    const lCount = answers.length - sCount;
    // 나침반 바늘 각도: 지도(왼쪽/음수) ↔ 표식(오른쪽/양수)
    const needle = clamp((lCount - sCount) * 14, -74, 74);
    const band = useMemo(() => bandOf(sCount), [sCount]);

    const start = useCallback(() => {
        setAnswers([]);
        setPhase('quiz');
    }, []);

    const restart = useCallback(() => {
        setAnswers([]);
        setPhase('intro');
    }, []);

    const choose = useCallback((pole) => {
        setLocked((isLocked) => {
            if (isLocked || phase !== 'quiz') return isLocked;
            setAnswers((prev) => {
                const next = [...prev, pole];
                window.setTimeout(() => {
                    if (next.length >= QUESTIONS.length) setPhase('result');
                    setLocked(false);
                }, 440);
                return next;
            });
            return true;
        });
    }, [phase]);

    // 키보드 전용 조작 — 페이지 전역 keydown
    useEffect(() => {
        const onKey = (e) => {
            const k = e.key;
            if (phase === 'intro') {
                if (k === 'Enter' || k === ' ' || k === 'ArrowRight') { e.preventDefault(); start(); }
            } else if (phase === 'quiz') {
                if (k === 'ArrowLeft') { e.preventDefault(); choose('S'); }
                else if (k === 'ArrowRight') { e.preventDefault(); choose('L'); }
            } else if (phase === 'result') {
                if (k === 'r' || k === 'R' || k === 'Enter') { e.preventDefault(); restart(); }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [phase, choose, start, restart]);

    const cur = QUESTIONS[Math.min(idx, QUESTIONS.length - 1)];

    return (
        <LabShell
            title="CARDINAL"
            eyebrow="how you find your way"
            subtitle={'// 여섯 갈림길에서 방향을 고르면 — 당신이 길을 그리는 방식이 드러난다'}
            path="cardinal"
        >
            <section className="cd-wrap" aria-label="길찾기 성향 테스트">
                <div className="cd-panel">
                    {/* 나침반 게이지 — 지도 ↔ 표식 */}
                    <div className="cd-gauge" aria-hidden="true">
                        <svg viewBox="0 0 200 120" className="cd-compass">
                            <path d="M18 105 A82 82 0 0 1 182 105" className="cd-arc" />
                            {[-72, -48, -24, 0, 24, 48, 72].map((a) => {
                                const rad = (a - 90) * Math.PI / 180;
                                const x1 = 100 + Math.cos(rad) * 74;
                                const y1 = 105 + Math.sin(rad) * 74;
                                const x2 = 100 + Math.cos(rad) * 82;
                                const y2 = 105 + Math.sin(rad) * 82;
                                return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} className="cd-tick" />;
                            })}
                            <g
                                className="cd-needle-g"
                                style={{
                                    transformOrigin: '100px 105px',
                                    transformBox: 'view-box',
                                    transform: `rotate(${needle}deg)`,
                                }}
                            >
                                <line x1="100" y1="105" x2="100" y2="34" className="cd-needle" />
                                <circle cx="100" cy="34" r="4.5" className="cd-needle-tip" />
                            </g>
                            <circle cx="100" cy="105" r="6" className="cd-pivot" />
                            <text x="20" y="118" className="cd-pole left">지도</text>
                            <text x="180" y="118" className="cd-pole right">표식</text>
                        </svg>
                    </div>

                    {/* 본문: intro / quiz / result */}
                    <div className={`cd-body${locked ? ' is-locked' : ''}`}>
                        {phase === 'intro' && (
                            <div className="cd-intro">
                                <p className="cd-kicker">여섯 개의 갈림길</p>
                                <p className="cd-lead">
                                    같은 길도 사람마다 다르게 기억한다. 방위와 거리로 그리는 사람,
                                    지형지물과 턴 순서로 엮는 사람. 당신은 어느 쪽인가.
                                </p>
                                <button type="button" className="cd-start" onClick={start}>
                                    <span className="cd-key">Enter</span> 시작
                                </button>
                            </div>
                        )}

                        {phase === 'quiz' && (
                            <div className="cd-quiz" key={idx}>
                                <p className="cd-count">{idx + 1} / {QUESTIONS.length}</p>
                                <h2 className="cd-q">{cur.q}</h2>
                                <div className="cd-choices">
                                    <button type="button" className="cd-choice s" onClick={() => choose('S')} disabled={locked}>
                                        <span className="cd-arrow">←</span>
                                        <span className="cd-choice-tx">{cur.s}</span>
                                        <span className="cd-choice-tag">지도</span>
                                    </button>
                                    <button type="button" className="cd-choice l" onClick={() => choose('L')} disabled={locked}>
                                        <span className="cd-arrow">→</span>
                                        <span className="cd-choice-tx">{cur.l}</span>
                                        <span className="cd-choice-tag">표식</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {phase === 'result' && (
                            <div className="cd-result">
                                <p className="cd-kicker">당신의 길찾기 방식</p>
                                <h2 className="cd-type">{band.kr}</h2>
                                <p className="cd-type-en">{band.en}</p>
                                <p className="cd-tally">
                                    지도 <b>{sCount}</b> · 표식 <b>{lCount}</b>
                                </p>
                                <MindMap kind={band.map} />
                                <p className="cd-line">{band.line}</p>
                                <p className="cd-desc">{band.body}</p>
                                <button type="button" className="cd-start" onClick={restart}>
                                    <span className="cd-key">R</span> 다시
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 진행 경로 + 키 안내 */}
                    <div className="cd-foot">
                        <svg viewBox="0 0 320 60" className="cd-trail" aria-hidden="true">
                            {NODES.slice(0, -1).map((n, i) => {
                                const m = NODES[i + 1];
                                const done = i + 1 <= answers.length;
                                return (
                                    <line
                                        key={`seg${i}`}
                                        x1={n.x} y1={n.y} x2={m.x} y2={m.y}
                                        className={`cd-seg${done ? ' done' : ''}`}
                                    />
                                );
                            })}
                            {NODES.map((n, i) => {
                                const done = i < answers.length;
                                const here = i === answers.length && phase === 'quiz';
                                return (
                                    <circle
                                        key={`nd${i}`}
                                        cx={n.x} cy={n.y} r={here ? 6 : 4.5}
                                        className={`cd-node${done ? ' done' : ''}${here ? ' here' : ''}`}
                                    />
                                );
                            })}
                        </svg>
                        <p className="cd-hint k-mono">
                            {phase === 'quiz'
                                ? '← 지도   → 표식'
                                : phase === 'result'
                                    ? 'R 다시'
                                    : 'Enter 시작'}
                        </p>
                    </div>
                </div>

                {/* 해설 — 만진 뒤 읽는 회고 */}
                <section className="cd-read">
                    <h3>왜 사람마다 길을 다르게 기억할까</h3>
                    <p>
                        공간을 기억하는 방식은 크게 둘로 갈린다. 하나는 <b>조감도 전략(survey/allocentric)</b> —
                        머릿속에 북쪽이 고정된 지도를 그리고, 위치를 방위와 거리로 잡는다. 처음 가는 두 지점도
                        지도 위에서 곧장 이을 수 있어 지름길을 잘 만든다. 다른 하나는 <b>경로 전략(route/egocentric)</b> —
                        “여기서 우회전, 빨간 건물 지나서”처럼 지형지물과 턴 순서를 이어 붙인다. 익숙한 길에선
                        생각조차 필요 없이 빠르지만, 아는 경로를 벗어나면 그림을 새로 그려야 한다.
                    </p>
                    <p>
                        이건 성격 유형처럼 딱 나뉘는 게 아니라 <b>정도의 문제</b>이고, 상황에 따라 우리는 둘을
                        오간다. 실제로 뇌 연구에서도 이 둘은 다른 회로를 쓴다고 본다 — 조감도식 <b>장소 학습</b>은
                        해마(hippocampus)에, 익숙한 <b>반응 학습</b>은 선조체(caudate)에 더 기댄다. 어느 쪽이
                        우월한 게 아니라, 넓은 신도시냐 골목 많은 구시가냐처럼 <b>지형에 맞는 도구</b>가 다를 뿐이다.
                    </p>
                    <p className="cd-disc">
                        * 이 페이지는 검증된 심리 검사가 아니라, 자기 방식을 돌아보게 하는 가벼운 자기보고형 토이입니다.
                        여섯 문항의 응답은 브라우저 안에서만 계산되며 서버로 전송되지 않습니다.
                        조작은 키보드(← 지도 · → 표식 · Enter · R)를 기본으로 하되, 화면 탭도 같은 동작을 합니다.
                    </p>
                </section>
            </section>
        </LabShell>
    );
};

export default Cardinal;
