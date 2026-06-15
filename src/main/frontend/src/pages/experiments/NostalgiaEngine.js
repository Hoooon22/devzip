import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/NostalgiaEngine.css';

// 시대별 미감(generic aesthetic) — 특정 인물/사건이 아니라 10년 단위 보편 미감만 다룬다.
const ERAS = [
    { decade: 1970, emoji: '📻', tag: '아날로그 온기', vibe: '필름 그레인 · 우드톤 · 손글씨 간판' },
    { decade: 1980, emoji: '🕹️', tag: '네온 신스', vibe: '각진 로고 · 형광 컬러 · 와이어프레임 그리드' },
    { decade: 1990, emoji: '📼', tag: '로우파이 그런지', vibe: '반투명 플라스틱 · 픽셀 폰트 · 거친 질감' },
    { decade: 2000, emoji: '💿', tag: 'Y2K 크롬', vibe: '글로시 버튼 · 메탈릭 · 플립형 기기' },
    { decade: 2010, emoji: '📱', tag: '플랫 & 필터', vibe: '미니멀 플랫 · 사진 필터 · 무한 피드' },
    { decade: 2020, emoji: '🤖', tag: '숏폼 & 합성물', vibe: '세로 영상 · 알고리즘 추천 · 생성형 콘텐츠' },
];

const eraOf = (year) => {
    const d = Math.floor(year / 10) * 10;
    return ERAS.find((e) => e.decade === d) || null;
};

const Y_MIN = 1995;
const Y_MAX = 2035;

// 향수 주기 프리셋: 과거엔 30년이었던 사이클이 점점 짧아진다는 보편 관찰.
const GAP_PRESETS = [
    { gap: 30, label: '30년 주기', note: '한 세대 만의 회귀' },
    { gap: 20, label: '20년 주기', note: '청소년기 → 성인기' },
    { gap: 10, label: '10년 주기', note: '리셋이 가속된다' },
];

const NostalgiaEngine = () => {
    const [year, setYear] = useState(2026);
    const [gap, setGap] = useState(10);
    const [playing, setPlaying] = useState(false);

    const revived = Math.max(Y_MIN - 5, year - gap);
    const era = useMemo(() => eraOf(revived), [revived]);

    // 타임랩스: 현재 연도를 자동으로 전진시켜 소환 시대가 시대축을 훑고 지나가게 한다.
    useEffect(() => {
        if (!playing) return;
        const id = setInterval(() => {
            setYear((y) => (y >= Y_MAX ? Y_MIN : y + 1));
        }, 550);
        return () => clearInterval(id);
    }, [playing]);

    // 타임라인 좌표 매핑 — 현재를 기준으로 과거 50년을 보여준다.
    const startYear = year - 50;
    const endYear = year + 5;
    const x = (yr) => 40 + ((yr - startYear) / (endYear - startYear)) * 520;
    const AXIS_Y = 150;

    // 시대축 위에 그릴 10년 단위 블록
    const blocks = ERAS.filter((e) => e.decade + 10 >= startYear && e.decade <= endYear);

    const xNow = x(year);
    const xRev = x(revived);
    const midX = (xNow + xRev) / 2;

    return (
        <div className="ne-container">
            <div className="ne-inner">
                <Link to="/" className="ne-back">← 실험실로 돌아가기</Link>

                <header className="ne-header">
                    <h1 className="ne-title">NOSTALGIA&nbsp;ENGINE</h1>
                    <p className="ne-sub">
                        {'// 현재는 늘 과거의 한 시대를 다시 불러낸다 — 그리고 그 주기는 점점 짧아진다'}
                    </p>
                </header>

                <div className="ne-stage">
                    {/* 타임라인 시각화 */}
                    <div className="ne-viz">
                        <svg viewBox="0 0 600 200" className="ne-svg" aria-label="향수 사이클 타임라인">
                            {/* 시대 블록 */}
                            {blocks.map((b) => {
                                const bx = x(Math.max(b.decade, startYear));
                                const bw = x(Math.min(b.decade + 10, endYear)) - bx;
                                const hot = era && b.decade === era.decade;
                                return (
                                    <g key={b.decade}>
                                        <rect
                                            x={bx}
                                            y={AXIS_Y}
                                            width={Math.max(0, bw)}
                                            height="34"
                                            className={'ne-block' + (hot ? ' is-hot' : '')}
                                        />
                                        <text x={bx + 4} y={AXIS_Y + 22} className="ne-block-label">
                                            {`${String(b.decade).slice(2)}s`}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* 소환 화살: 현재 → 과거 시대 */}
                            <path
                                d={`M ${xNow} ${AXIS_Y - 6} Q ${midX} ${AXIS_Y - 78} ${xRev} ${AXIS_Y - 6}`}
                                className="ne-arc"
                            />
                            <polygon
                                points={`${xRev - 6},${AXIS_Y - 14} ${xRev + 6},${AXIS_Y - 14} ${xRev},${AXIS_Y - 2}`}
                                className="ne-arrowhead"
                            />

                            {/* 현재 마커 */}
                            <line x1={xNow} y1={AXIS_Y - 6} x2={xNow} y2={AXIS_Y + 38} className="ne-now-line" />
                            <circle cx={xNow} cy={AXIS_Y - 6} r="6" className="ne-now-dot" />
                            <text x={xNow} y={AXIS_Y - 18} className="ne-now-text" textAnchor="middle">
                                {`지금 ${year}`}
                            </text>

                            {/* 소환 마커 */}
                            <text x={xRev} y={AXIS_Y - 24} className="ne-rev-text" textAnchor="middle">
                                {`소환 ${revived}`}
                            </text>
                        </svg>

                        {/* 소환된 시대 카드 */}
                        {era ? (
                            <div className="ne-era-card">
                                <div className="ne-era-emoji">{era.emoji}</div>
                                <div className="ne-era-body">
                                    <span className="ne-era-decade">{`${era.decade}년대`}</span>
                                    <span className="ne-era-tag">{era.tag}</span>
                                    <span className="ne-era-vibe">{era.vibe}</span>
                                </div>
                                <div className="ne-era-gap">{`−${gap}년`}</div>
                            </div>
                        ) : (
                            <div className="ne-era-card ne-era-empty">
                                <span>{'기록된 시대 밖 — 갭을 줄여보세요'}</span>
                            </div>
                        )}
                    </div>

                    {/* 컨트롤 패널 */}
                    <div className="ne-panel">
                        <div className="ne-block-ctl">
                            <label htmlFor="ne-year" className="ne-ctl-label">
                                현재 연도 <b>{year}</b>
                            </label>
                            <input
                                id="ne-year"
                                type="range"
                                min={Y_MIN}
                                max={Y_MAX}
                                value={year}
                                onChange={(e) => {
                                    setPlaying(false);
                                    setYear(Number(e.target.value));
                                }}
                            />
                        </div>

                        <div className="ne-block-ctl">
                            <label htmlFor="ne-gap" className="ne-ctl-label">
                                향수 갭 <b>{gap}년</b>
                            </label>
                            <input
                                id="ne-gap"
                                type="range"
                                min="5"
                                max="40"
                                value={gap}
                                onChange={(e) => setGap(Number(e.target.value))}
                            />
                        </div>

                        <div className="ne-block-ctl">
                            <span className="ne-ctl-label">사이클 가속</span>
                            <div className="ne-presets">
                                {GAP_PRESETS.map((p) => (
                                    <button
                                        key={p.gap}
                                        type="button"
                                        className={'ne-chip' + (gap === p.gap ? ' on' : '')}
                                        onClick={() => setGap(p.gap)}
                                        title={p.note}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            className={'ne-play' + (playing ? ' on' : '')}
                            onClick={() => setPlaying((v) => !v)}
                        >
                            {playing ? '⏸ 타임랩스 정지' : '▶ 타임랩스 재생'}
                        </button>

                        <p className="ne-readout">
                            {`${year}년의 향수는 `}
                            <b>{revived}년</b>
                            {era ? `, 즉 ${era.decade}년대 '${era.tag}'를 소환한다.` : '를 가리킨다.'}
                        </p>
                    </div>
                </div>

                <footer className="ne-foot">
                    <p>
                        {'문화는 직선이 아니라 '}
                        <b>진자</b>
                        {'처럼 과거를 오간다. 한때 향수의 갭은 한 세대(약 30년)였지만, 기록·확산 속도가 빨라지며 그 주기는 '}
                        <b>점점 짧아지고</b>
                        {' 있다. 갭을 10년으로 줄여 보면, 바로 직전 시대조차 곧장 "다시 유행"으로 소환된다 — '}
                        {'리셋의 가속이다. 슬라이더로 현재를 옮길 때마다 소환되는 시대가 함께 미끄러진다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default NostalgiaEngine;
