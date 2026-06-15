import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/UncannyValley.css';

// 불쾌한 골짜기(Uncanny Valley): 인간 유사도가 커질수록 호감도가 오르다가,
// '거의 사람' 구간에서 급격히 추락(골짜기)하고, 실제 사람에 이르러 다시 급반등한다.
// 특정 인물·제품이 아니라 '인간 유사도 ↔ 호감도'라는 보편 곡선만 다룬다.

// 인간 유사도 축 위에 찍는 예시들 (h: 0~1)
const EXAMPLES = [
    { h: 0.08, emoji: '🦾', label: '산업용 로봇' },
    { h: 0.30, emoji: '🤖', label: '장난감 로봇' },
    { h: 0.48, emoji: '🧸', label: '봉제 인형' },
    { h: 0.66, emoji: '🎮', label: 'CG 캐릭터' },
    { h: 0.82, emoji: '🦿', label: '의수 · 마네킹' },
    { h: 0.91, emoji: '🎭', label: '하이퍼리얼 합성물' },
    { h: 1.00, emoji: '🧑', label: '실제 사람' },
];

// 호감도 곡선. h ∈ [0,1] → 호감도 ∈ [-1,1].
// moving=true(움직임)면 골짜기가 더 깊고 넓어진다 — 정지보다 동작이 거부감을 키운다는 보편 관찰.
const affinityAt = (h, moving) => {
    const depth = moving ? 2.25 : 1.65;
    const sigma = moving ? 0.075 : 0.062;
    const center = 0.8;
    const rise = 0.5 * h + 0.5 * Math.pow(Math.max(0, h - 0.85) / 0.15, 1.5);
    const dip = depth * Math.exp(-((h - center) ** 2) / (2 * sigma * sigma));
    return Math.max(-1, Math.min(1, rise - dip));
};

const zoneOf = (a) => {
    if (a > 0.55) return { emoji: '😊', label: '친근함', note: '편하게 받아들여진다' };
    if (a > 0.15) return { emoji: '🙂', label: '호기심', note: '귀엽거나 흥미롭다' };
    if (a > -0.2) return { emoji: '😐', label: '어색함', note: '뭔가 미묘하게 어긋난다' };
    if (a > -0.6) return { emoji: '😟', label: '불편함', note: '본능적 경계가 켜진다' };
    return { emoji: '😨', label: '공포의 골짜기', note: '거의 사람인데 사람이 아니다' };
};

// 색 보간 유틸
const lerp = (a, b, t) => a + (b - a) * t;
const toHex = (c) => Math.round(c).toString(16).padStart(2, '0');
const mix = (c1, c2, t) => {
    const p = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const [r1, g1, b1] = p(c1);
    const [r2, g2, b2] = p(c2);
    return `#${toHex(lerp(r1, r2, t))}${toHex(lerp(g1, g2, t))}${toHex(lerp(b1, b2, t))}`;
};

// 곡선 좌표계
const VB_W = 600;
const X0 = 44;
const X1 = 560;
const YTOP = 26;
const YBOT = 214;
const xOf = (h) => X0 + h * (X1 - X0);
const yOf = (a) => YBOT - ((a + 1) / 2) * (YBOT - YTOP);

const UncannyValley = () => {
    const [human, setHuman] = useState(50); // 0~100 (%)
    const [moving, setMoving] = useState(false);

    const h = human / 100;
    const affinity = useMemo(() => affinityAt(h, moving), [h, moving]);
    const zone = zoneOf(affinity);
    const creep = Math.max(0, Math.min(1, -affinity)); // 골짜기 깊이 0~1

    // 호감도 곡선 path
    const curvePath = useMemo(() => {
        const pts = [];
        for (let i = 0; i <= 100; i++) {
            const hh = i / 100;
            pts.push(`${i === 0 ? 'M' : 'L'} ${xOf(hh).toFixed(1)} ${yOf(affinityAt(hh, moving)).toFixed(1)}`);
        }
        return pts.join(' ');
    }, [moving]);

    const zeroY = yOf(0);

    // 현재 슬라이더에 가장 가까운 예시
    const nearest = EXAMPLES.reduce((best, e) =>
        Math.abs(e.h - h) < Math.abs(best.h - h) ? e : best
    );

    // 얼굴 파라미터
    const skin = mix('#c2c8c6', '#ecc9a6', h); // 로봇 그레이 → 사람 피부
    const faceFill = mix(skin, '#93a32a', creep * 0.8); // 골짜기일수록 칙칙한 올리브
    const cornerR = lerp(8, 40, h); // 각진 로봇 → 둥근 사람
    const eyeRy = lerp(4.5, 8, h);
    const eyeAsym = creep * 5; // 골짜기에서 눈높이가 어긋난다
    const pupilDx = creep * 2.2; // 골짜기에서 시선이 빗나간다
    const mouthCurve = affinity * 14; // 양수면 미소, 음수면 찡그림

    return (
        <div className="uv-container">
            <div className="uv-inner">
                <Link to="/" className="uv-back">← 실험실로 돌아가기</Link>

                <header className="uv-header">
                    <h1 className="uv-title">UNCANNY&nbsp;VALLEY</h1>
                    <p className="uv-sub">
                        {'// 거의 사람일수록 더 친근할까? — 인간 유사도와 호감도의 골짜기'}
                    </p>
                </header>

                <div className="uv-stage">
                    {/* 시각화: 호감도 곡선 + 모핑 얼굴 */}
                    <div className="uv-viz">
                        <svg viewBox={`0 0 ${VB_W} 260`} className="uv-curve" aria-label="불쾌한 골짜기 곡선">
                            {/* 골짜기 음영 (호감도 0 아래) */}
                            <rect x={X0} y={zeroY} width={X1 - X0} height={YBOT - zeroY} className="uv-valley-shade" />

                            {/* 0 기준선 */}
                            <line x1={X0} y1={zeroY} x2={X1} y2={zeroY} className="uv-axis-zero" />
                            <text x={X0 - 6} y={YTOP + 10} className="uv-axis-cap" textAnchor="end">+호감</text>
                            <text x={X0 - 6} y={YBOT} className="uv-axis-cap" textAnchor="end">−거부</text>

                            {/* 호감도 곡선 */}
                            <path d={curvePath} className="uv-line" />

                            {/* 예시 마커 */}
                            {EXAMPLES.map((e) => {
                                const ex = xOf(e.h);
                                const ey = yOf(affinityAt(e.h, moving));
                                return (
                                    <g key={e.label}>
                                        <circle cx={ex} cy={ey} r="4" className="uv-ex-dot" />
                                        <text x={ex} y={ey - 9} className="uv-ex-emoji" textAnchor="middle">{e.emoji}</text>
                                    </g>
                                );
                            })}

                            {/* 현재 위치 */}
                            <line x1={xOf(h)} y1={YTOP} x2={xOf(h)} y2={YBOT} className="uv-now-line" />
                            <circle cx={xOf(h)} cy={yOf(affinity)} r="7" className="uv-now-dot" />

                            {/* X축 라벨 */}
                            <text x={X0} y={252} className="uv-axis-x" textAnchor="start">기계</text>
                            <text x={(X0 + X1) / 2} y={252} className="uv-axis-x" textAnchor="middle">거의 사람</text>
                            <text x={X1} y={252} className="uv-axis-x" textAnchor="end">사람</text>
                        </svg>

                        {/* 모핑 얼굴 + 반응 */}
                        <div className="uv-react">
                            <svg
                                viewBox="0 0 120 130"
                                className={'uv-face' + (moving && creep > 0.45 ? ' is-jitter' : '')}
                                aria-label="현재 유사도에 대응하는 얼굴"
                            >
                                <rect
                                    x="22" y="14" width="76" height="100" rx={cornerR}
                                    fill={faceFill} stroke="#15171a" strokeWidth="3"
                                />
                                <ellipse cx="46" cy="56" rx="9" ry={eyeRy} fill="#fff" stroke="#15171a" strokeWidth="2.5" />
                                <ellipse cx="74" cy={56 + eyeAsym} rx="9" ry={eyeRy} fill="#fff" stroke="#15171a" strokeWidth="2.5" />
                                <circle cx={46 + pupilDx} cy="56" r="3.4" fill="#15171a" />
                                <circle cx={74 - pupilDx} cy={56 + eyeAsym} r="3.4" fill="#15171a" />
                                <path
                                    d={`M 42 88 Q 60 ${88 + mouthCurve} 78 88`}
                                    fill="none" stroke="#15171a" strokeWidth="3" strokeLinecap="round"
                                />
                            </svg>

                            <div className="uv-zone">
                                <span className="uv-zone-emoji">{zone.emoji}</span>
                                <span className="uv-zone-label">{zone.label}</span>
                                <span className="uv-zone-note">{zone.note}</span>
                            </div>
                        </div>
                    </div>

                    {/* 컨트롤 패널 */}
                    <div className="uv-panel">
                        <div className="uv-ctl">
                            <label htmlFor="uv-human" className="uv-ctl-label">
                                인간 유사도 <b>{human}%</b>
                            </label>
                            <input
                                id="uv-human"
                                type="range"
                                min="0"
                                max="100"
                                value={human}
                                onChange={(e) => setHuman(Number(e.target.value))}
                            />
                        </div>

                        <button
                            type="button"
                            className={'uv-toggle' + (moving ? ' on' : '')}
                            onClick={() => setMoving((v) => !v)}
                        >
                            {moving ? '🌀 움직이는 대상 (골짜기 ↑)' : '⏹ 정지한 대상'}
                        </button>

                        <div className="uv-readout">
                            <div className="uv-readout-row">
                                <span>호감도</span>
                                <b className={affinity < 0 ? 'neg' : 'pos'}>{affinity.toFixed(2)}</b>
                            </div>
                            <div className="uv-readout-row">
                                <span>이쯤이면</span>
                                <b>{nearest.emoji} {nearest.label}</b>
                            </div>
                        </div>

                        <div className="uv-jump">
                            <span className="uv-ctl-label">바로 가보기</span>
                            <div className="uv-jump-grid">
                                {EXAMPLES.map((e) => (
                                    <button
                                        key={e.label}
                                        type="button"
                                        className={'uv-chip' + (nearest.label === e.label ? ' on' : '')}
                                        onClick={() => setHuman(Math.round(e.h * 100))}
                                        title={e.label}
                                    >
                                        {e.emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="uv-foot">
                    <p>
                        {'더 사람을 닮을수록 더 호감이 갈 것 같지만, 곡선은 '}
                        <b>한 번 무너진다</b>
                        {'. "거의 사람"에 다다른 대상은 미세한 어긋남(죽은 눈빛·비대칭·부자연스러운 움직임)이 '}
                        {'경계 본능을 깨워 호감도를 골짜기로 끌어내린다. 그 좁은 구간만 넘기면 다시 급반등한다. '}
                        {'움직임을 켜면 골짜기는 더 깊어진다 — 같은 대상도 정지보다 동작할 때 거부감이 커지기 때문이다. '}
                        {'AI 합성 영상이 "어딘가 이상하다"고 느껴지는 지점이 바로 이 골짜기다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default UncannyValley;
