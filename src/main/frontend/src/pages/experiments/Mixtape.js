import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Mixtape.css';

// MIXTAPE — 카세트로 나오는 청취 성향 (낡은 것 × 성향 테스트 × SVG 애니메이션 × 버튼 3개 이하).
//   소재: 낡은 것 — 워크맨/카세트. 여섯 질문에 답하면 당신을 한 편의 테이프로 감아낸다.
//   형식: 성향 테스트 — 두 축(오래 vs 자주 · 혼자 vs 나눔)으로 네 유형이 갈린다.
//   기술: SVG 애니메이션 — 답할 때마다 두 릴이 감기고(왼쪽 얇아지고 오른쪽 두꺼워짐),
//         스풀이 돌고, 답한 순간 감기 버스트로 빨라진다. 캔버스도 rAF 물리도 아닌 SVG.
//   제약: 버튼 3개 이하 — 질문 화면의 조작계는 워크맨 트랜스포트 키 3개(◁ ● ▷)뿐.
//         시작/결과 화면은 버튼 1개. 어느 화면도 3개를 넘지 않는다.
//
//   도전: 카세트라는 물건을 SVG 하드웨어로만 세우고(셸·릴 창·스풀 이·노출 테이프·나사),
//         "테이프가 왼쪽에서 오른쪽으로 감겨 다 넘어가면 한 판이 끝난다"는 감각을
//         stroke-width 트랜지션과 회전 애니메이션만으로 납득시킬 수 있느냐.

const QUESTIONS = [
    // 축 1 — 오래(keep) vs 자주(swap)
    {
        q: '좋아하는 노래가 생기면',
        opts: [
            { t: '늘어질 때까지 그것만 되감는다', d: { keep: 2 }, g: '◀◀' },
            { t: '실컷 듣지만 곧 새 걸 찾는다', d: { keep: 1, swap: 1 }, g: '■' },
            { t: '며칠 듣다 다음 곡으로 넘어간다', d: { swap: 2 }, g: '▶▶' },
        ],
    },
    {
        q: '카세트 한 통은 나에게',
        opts: [
            { t: 'A면 B면 다 욀 만큼 오래 간다', d: { keep: 2 }, g: '◀◀' },
            { t: '그날 기분 따라 그때그때', d: { keep: 1, swap: 1 }, g: '■' },
            { t: '일주일이면 새 걸로 교체', d: { swap: 2 }, g: '▶▶' },
        ],
    },
    {
        q: '플레이보다 자주 누르는 버튼',
        opts: [
            { t: '되감기 — 방금 거 한 번 더', d: { keep: 2 }, g: '◀◀' },
            { t: '정지 — 잠깐 숨 고르기', d: { keep: 1, swap: 1 }, g: '■' },
            { t: '빨리감기 — 다음, 다음', d: { swap: 2 }, g: '▶▶' },
        ],
    },
    // 축 2 — 혼자(solo) vs 나눔(share)
    {
        q: '끝내주는 곡을 발견하면',
        opts: [
            { t: '혼자 이어폰으로 몇 번이고', d: { solo: 2 }, g: '◁' },
            { t: '아껴뒀다 언젠가 같이', d: { solo: 1, share: 1 }, g: '●' },
            { t: '"이거 들어봐" 바로 보낸다', d: { share: 2 }, g: '▷' },
        ],
    },
    {
        q: '빈 테이프에 녹음한다면',
        opts: [
            { t: '내가 들으려고, 내 순서로', d: { solo: 2 }, g: '◁' },
            { t: '라디오 나오는 대로 대충', d: { solo: 1, share: 1 }, g: '●' },
            { t: '건네주려고, 받을 사람 생각하며', d: { share: 2 }, g: '▷' },
        ],
    },
    {
        q: '테이프 라벨을 쓸 때',
        opts: [
            { t: '안 쓴다 — 나만 알면 됨', d: { solo: 2 }, g: '◁' },
            { t: '곡 목록만 적어둔다', d: { solo: 1, share: 1 }, g: '●' },
            { t: '받는 사람 이름과 한마디', d: { share: 2 }, g: '▷' },
        ],
    },
];

const TYPES = {
    keep_solo: {
        name: '늘어진 A면',
        tag: 'WORN A-SIDE',
        line: '좋아하는 한 면을 늘어질 때까지 되감아 듣는 사람.',
        b: '한 번 꽂히면 오래 간다. 취향의 깊이는 반복에서 나온다.',
    },
    keep_share: {
        name: '돌려 듣는 명반',
        tag: 'HEAVY ROTATION',
        line: '아끼는 한 장을 오래 품고, 좋으면 통째로 권하는 사람.',
        b: '"속는 셈 치고 들어봐." 확신이 설 때 가장 강해진다.',
    },
    swap_solo: {
        name: '매일 갈아끼우는 데크',
        tag: 'DAILY DECK',
        line: '질리기 전에 새 테이프로 바꾸는, 늘 다음을 찾는 사람.',
        b: '어제의 명곡도 오늘은 지난 곡. 새로움이 곧 연료다.',
    },
    swap_share: {
        name: '믹스테이프 선물러',
        tag: 'MIXTAPE MAKER',
        line: '곡을 고르고 순서를 짜 남에게 건네는, 큐레이터형.',
        b: '트랙 순서에 마음을 숨긴다. 편집이 곧 언어다.',
    },
};

const TOTAL = QUESTIONS.length;
const ZERO = { keep: 0, swap: 0, solo: 0, share: 0 };

const classify = (s) => {
    const a1 = s.keep >= s.swap ? 'keep' : 'swap';
    const a2 = s.solo >= s.share ? 'solo' : 'share';
    return TYPES[`${a1}_${a2}`];
};

const Mixtape = () => {
    const [phase, setPhase] = useState('intro'); // intro | quiz | result
    const [qi, setQi] = useState(0);
    const [score, setScore] = useState(ZERO);
    const [winding, setWinding] = useState(false);

    const phaseRef = useRef(phase); useEffect(() => { phaseRef.current = phase; }, [phase]);
    const qiRef = useRef(qi); useEffect(() => { qiRef.current = qi; }, [qi]);
    const windRef = useRef(0);

    // 감긴 정도 0..1 — 답한 개수(결과에선 꽉 감김).
    const progress = phase === 'result' ? 1 : qi / TOTAL;
    const leftSW = 4 + 20 * (1 - progress);   // 왼쪽 릴에 남은 테이프(두께)
    const rightSW = 4 + 20 * progress;        // 오른쪽 릴로 넘어간 테이프
    const result = phase === 'result' ? classify(score) : null;

    const start = useCallback(() => {
        setScore(ZERO);
        setQi(0);
        setPhase('quiz');
    }, []);

    const pick = useCallback((idx) => {
        if (phaseRef.current !== 'quiz') return;
        const cur = qiRef.current;
        const opt = QUESTIONS[cur].opts[idx];
        if (!opt) return;
        // 감기 버스트 — 답하면 스풀이 잠깐 빨라진다.
        setWinding(true);
        clearTimeout(windRef.current);
        windRef.current = setTimeout(() => setWinding(false), 780);
        setScore((s) => {
            const n = { ...s };
            Object.entries(opt.d).forEach(([k, v]) => { n[k] += v; });
            return n;
        });
        const next = cur + 1;
        if (next >= TOTAL) setPhase('result');
        else setQi(next);
    }, []);

    // 키보드 보조 — 1·2·3 로 답, Enter 로 시작/되감기. 조작계 본체는 화면의 키 3개.
    useEffect(() => {
        const onKey = (e) => {
            const p = phaseRef.current;
            if (p === 'quiz' && (e.key === '1' || e.key === '2' || e.key === '3')) {
                e.preventDefault();
                pick(Number(e.key) - 1);
            } else if (e.key === 'Enter' || e.key === ' ') {
                if (p === 'intro') { e.preventDefault(); start(); }
                else if (p === 'result') { e.preventDefault(); start(); }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [pick, start]);

    useEffect(() => () => clearTimeout(windRef.current), []);

    // 한 쪽 릴(스풀) — 바깥 g는 SVG translate 로 위치, 안쪽 .mtx-reel 은 CSS 회전(충돌 방지).
    const reel = (cx, sw, key) => (
        <g key={key} transform={`translate(${cx} 148)`}>
            <circle className="mtx-window" r="47" />
            <circle className="mtx-ring" r="28" style={{ strokeWidth: sw }} />
            <g className="mtx-reel">
                <circle className="mtx-hub" r="14" />
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <rect
                        key={i}
                        className="mtx-spoke"
                        x="-2.4"
                        y="-14"
                        width="4.8"
                        height="9"
                        transform={`rotate(${i * 60})`}
                    />
                ))}
                <circle className="mtx-hole" r="5" />
            </g>
        </g>
    );

    const cur = QUESTIONS[qi] || QUESTIONS[0];

    return (
        <LabShell
            title="Mixtape"
            subtitle="카세트로 나오는 청취 성향 — 여섯 곡을 지나면 한 편의 테이프가 된다"
            eyebrow="old things · personality · svg"
            path="mixtape"
        >
            <div className={`mtx-wrap ph-${phase} ${winding ? 'is-wind' : ''}`}>
                {/* 카세트 하드웨어 — SVG. 위에 크림 라벨을 HTML로 얹는다. */}
                <div className="mtx-deck">
                    <svg className="mtx-svg" viewBox="0 0 360 230" role="img" aria-label="카세트 테이프">
                        <rect className="mtx-shell" x="8" y="8" width="344" height="214" rx="18" />
                        <rect className="mtx-shell-in" x="18" y="18" width="324" height="194" rx="12" />
                        <rect className="mtx-labelplate" x="40" y="26" width="280" height="70" rx="6" />

                        {/* 노출된 테이프 — 두 릴 사이 아래로 늘어진 갈색 띠 */}
                        <path className="mtx-tape" d="M113 194 Q180 216 247 194" />
                        <rect className="mtx-guard" x="120" y="196" width="120" height="18" rx="4" />
                        <circle className="mtx-capstan" cx="150" cy="205" r="5" />
                        <circle className="mtx-capstan" cx="210" cy="205" r="5" />

                        {reel(113, leftSW, 'L')}
                        {reel(247, rightSW, 'R')}

                        <circle className="mtx-screw" cx="28" cy="30" r="3.4" />
                        <circle className="mtx-screw" cx="332" cy="30" r="3.4" />
                        <circle className="mtx-screw" cx="28" cy="200" r="3.4" />
                        <circle className="mtx-screw" cx="332" cy="200" r="3.4" />
                    </svg>

                    <div className="mtx-label">
                        {phase === 'result' ? (
                            <div className="mtx-label-result" key={result.tag}>
                                <span className="mtx-hand">{result.name}</span>
                                <span className="mtx-tag k-mono">{result.tag}</span>
                            </div>
                        ) : (
                            <div className="mtx-label-head">
                                <span className="mtx-brand">MIX</span>
                                <span className="mtx-side k-mono">
                                    {phase === 'quiz' && qi >= TOTAL / 2 ? 'SIDE B' : 'SIDE A'}
                                </span>
                                <div className="mtx-pips" aria-hidden="true">
                                    {QUESTIONS.map((_, i) => (
                                        <span key={i} className={`mtx-pip ${phase === 'quiz' && i < qi ? 'on' : ''}`} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 조작·판독 영역 */}
                {phase === 'intro' && (
                    <div className="mtx-panel">
                        <p className="mtx-lede">여섯 곡을 지나면,<br />당신은 한 편의 카세트가 된다.</p>
                        <button type="button" className="mtx-play" onClick={start}>
                            <span className="g">▶</span> 재생
                        </button>
                        <p className="mtx-hint k-mono">{'키 3개로 답하세요 · 1 · 2 · 3'}</p>
                    </div>
                )}

                {phase === 'quiz' && (
                    <div className="mtx-panel" key={qi}>
                        <p className="mtx-q">{cur.q}</p>
                        <div className="mtx-keys" role="group" aria-label="답 고르기">
                            {cur.opts.map((o, i) => (
                                <button
                                    key={o.t}
                                    type="button"
                                    className="mtx-key"
                                    onClick={() => pick(i)}
                                >
                                    <span className="mtx-key-g" aria-hidden="true">{o.g}</span>
                                    <span className="mtx-key-t">{o.t}</span>
                                    <span className="mtx-key-n k-mono">{i + 1}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {phase === 'result' && (
                    <div className="mtx-panel">
                        <p className="mtx-r-line">{result.line}</p>
                        <p className="mtx-r-b"><span className="mtx-bside k-mono">B면</span> {result.b}</p>
                        <button type="button" className="mtx-play mtx-rewind" onClick={start}>
                            <span className="g">◀◀</span> 되감기
                        </button>
                    </div>
                )}
            </div>
        </LabShell>
    );
};

export default Mixtape;
