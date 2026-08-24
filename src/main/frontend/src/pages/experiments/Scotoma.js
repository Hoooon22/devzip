import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Scotoma.css';

// SCOTOMA — 눈 속의 맹점 찾기 (몸 × 만질 수 있는 데이터 × 포인터 궤적 × 텍스트보다 도형).
//   소재: 몸 — 누구 눈에나 시신경 원판(optic disc) 자리엔 광수용체가 없어 "보이지 않는 구멍(맹점)"이
//         있다. 평소엔 뇌가 주변 무늬로 메워(fill-in) 존재조차 못 느낀다.
//   형식: 만질 수 있는 데이터 — 그 구멍을 포인터로 끌어 직접 찾고, 응시점 대비 각도를
//         손으로 굴려(가정 거리 스크럽) 값을 만져 본다.
//   기술: 포인터 궤적 — 점을 드래그해 사라지는 순간 손을 떼는 것이 유일한 조작계.
//   제약: 텍스트보다 도형이 많아야 — 십자·점·시야 지도(원·고리·타원)로 말한다. 문구는 최소.

// CSS 참조 픽셀: 1in = 96px, 1in = 2.54cm.
const PX_PER_CM = 96 / 2.54; // ≈ 37.795

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// 픽셀 편심 + 가정 거리 → 각도(도)
const pxToDeg = (px, distCm) => (Math.atan((px / PX_PER_CM) / distCm) * 180) / Math.PI;

const Scotoma = () => {
    const stageRef = useRef(null);
    const knobRef = useRef(null);

    const [stageW, setStageW] = useState(0);
    const [eye, setEye] = useState('right');       // 지금 뜨고 있는(검사하는) 눈
    const [distCm, setDistCm] = useState(45);      // 화면까지 가정 거리
    const [dotX, setDotX] = useState(0);           // 스테이지 내 점의 x(px)
    const [markPx, setMarkPx] = useState({});      // {right: eccPx, left: eccPx}
    const [found, setFound] = useState(false);     // 이번 눈에서 방금 표시했는가

    const STAGE_H = 240;
    const dotY = STAGE_H / 2;
    // 십자는 검사 눈의 반대쪽 가장자리에 둔다(오른눈=왼쪽 십자, 점은 오른쪽).
    const crossFrac = eye === 'right' ? 0.14 : 0.86;
    const crossX = stageW * crossFrac;

    // 스테이지 폭 측정
    useEffect(() => {
        const el = stageRef.current;
        if (!el) return undefined;
        const measure = () => setStageW(el.clientWidth);
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // 눈/폭이 바뀌면 점을 시작 위치(먼 쪽)로 되돌린다.
    useEffect(() => {
        if (!stageW) return;
        setDotX(eye === 'right' ? stageW * 0.9 : stageW * 0.1);
        setFound(false);
    }, [eye, stageW]);

    // ── 점 드래그(포인터 궤적) ─────────────────────────────
    const dragDot = useCallback((clientX) => {
        const el = stageRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = clamp(clientX - r.left, 16, r.width - 16);
        setDotX(x);
    }, []);

    const onDotDown = (e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setFound(false);
        dragDot(e.clientX);
    };
    const onDotMove = (e) => {
        if (e.buttons === 0) return;
        dragDot(e.clientX);
    };
    const onDotUp = () => {
        // 손을 뗀 지점 = 점이 사라졌다고 표시한 지점.
        const ecc = Math.abs(dotX - crossX);
        setMarkPx((m) => ({ ...m, [eye]: ecc }));
        setFound(true);
    };
    const onDotKey = (e) => {
        const step = e.shiftKey ? 20 : 6;
        if (e.key === 'ArrowLeft') { e.preventDefault(); setDotX((x) => clamp(x - step, 16, stageW - 16)); setFound(false); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); setDotX((x) => clamp(x + step, 16, stageW - 16)); setFound(false); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDotUp(); }
    };

    // ── 거리 스크럽(만질 수 있는 데이터: 숫자를 손으로 굴린다) ─
    const dragKnob = useCallback((clientX) => {
        const el = knobRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const t = clamp((clientX - r.left) / r.width, 0, 1);
        setDistCm(Math.round(25 + t * (70 - 25)));
    }, []);
    const onKnobDown = (e) => { e.currentTarget.setPointerCapture?.(e.pointerId); dragKnob(e.clientX); };
    const onKnobMove = (e) => { if (e.buttons === 0) return; dragKnob(e.clientX); };

    const eccPx = markPx[eye];
    const eccDeg = eccPx != null ? pxToDeg(eccPx, distCm) : null;
    const inRange = eccDeg != null && eccDeg >= 11 && eccDeg <= 20;

    // ── 시야 지도 좌표(SVG viewBox 300×300) ─────────────────
    const VB = 300;
    const CENTER = VB / 2;
    const MAP_MAX_DEG = 35;
    const R = 128;
    const mapR = (deg) => (deg / MAP_MAX_DEG) * R;
    const spot = (whichEye, ecc) => {
        const deg = pxToDeg(ecc, distCm);
        const sign = whichEye === 'right' ? 1 : -1;         // 측두(temporal) 방향
        const cx = CENTER + sign * mapR(clamp(deg, 0, MAP_MAX_DEG));
        const cy = CENTER + mapR(1.5);                       // 실제 맹점은 응시점 약간 아래
        const rx = mapR(5.5 / 2);
        const ry = mapR(7.5 / 2);
        return { cx, cy, rx, ry, deg };
    };

    const knobFrac = (distCm - 25) / (70 - 25);
    const dotLabel = eye === 'right' ? '오른눈' : '왼눈';
    const coverLabel = eye === 'right' ? '왼눈' : '오른눈';

    return (
        <LabShell
            title="SCOTOMA"
            eyebrow="the hole you never see"
            subtitle={'// 한쪽 눈을 가리고 십자만 응시한 채 점을 끌어 보라 — 어느 지점에서 점이 통째로 사라진다. 당신 눈에 뚫린 구멍(맹점)이다'}
            path="scotoma"
        >
            <section className="sc-wrap" aria-label="맹점 찾기">
                {/* 안내 — 도형 위주. 가릴 눈 / 뜰 눈 / 끄는 방향 */}
                <div className="sc-guide" aria-hidden="true">
                    <span className="sc-eye sc-eye--cover" title={`${coverLabel} 가리기`}>
                        <svg viewBox="0 0 40 24" width="40" height="24">
                            <path d="M2 12 C8 4 32 4 38 12 C32 20 8 20 2 12 Z" fill="none" stroke="currentColor" strokeWidth="2" />
                            <circle cx="20" cy="12" r="4.5" fill="currentColor" />
                            <line x1="4" y1="21" x2="36" y2="3" stroke="var(--sc-red)" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        <em>{coverLabel} 가림</em>
                    </span>
                    <span className="sc-arrow">
                        {eye === 'right' ? '◀' : '▶'}
                        <em>천천히 끌기</em>
                    </span>
                    <span className="sc-eye sc-eye--open" title={`${dotLabel}으로 십자 응시`}>
                        <svg viewBox="0 0 40 24" width="40" height="24">
                            <path d="M2 12 C8 4 32 4 38 12 C32 20 8 20 2 12 Z" fill="none" stroke="currentColor" strokeWidth="2" />
                            <circle cx="20" cy="12" r="4.5" fill="currentColor" />
                            <circle cx="20" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                        </svg>
                        <em>{dotLabel}으로 ✛ 응시</em>
                    </span>
                </div>

                {/* 검사장 — 균일한 인화지 면 위 십자와 끌 수 있는 점 */}
                <div
                    className="sc-stage"
                    ref={stageRef}
                    style={{ height: STAGE_H }}
                >
                    {/* 점이 지나는 안내 트랙 */}
                    {stageW > 0 && (
                        <div className="sc-track" style={{ top: dotY }} />
                    )}
                    {/* 고정 십자 */}
                    {stageW > 0 && (
                        <div className="sc-cross" style={{ left: crossX, top: dotY }}>
                            <span className="sc-cross-h" />
                            <span className="sc-cross-v" />
                        </div>
                    )}
                    {/* 사라진 자리 표시 */}
                    {found && stageW > 0 && (
                        <div className="sc-mark" style={{ left: dotX, top: dotY }} />
                    )}
                    {/* 끌 수 있는 점 */}
                    {stageW > 0 && (
                        <div
                            className={`sc-dot${found ? ' is-found' : ''}`}
                            style={{ left: dotX, top: dotY }}
                            role="slider"
                            aria-label="시표 점 — 사라지는 지점에서 손 떼기"
                            aria-valuemin={0}
                            aria-valuemax={Math.round(stageW)}
                            aria-valuenow={Math.round(Math.abs(dotX - crossX))}
                            tabIndex={0}
                            onPointerDown={onDotDown}
                            onPointerMove={onDotMove}
                            onPointerUp={onDotUp}
                            onKeyDown={onDotKey}
                        />
                    )}
                    {!found && (
                        <p className="sc-stage-hint">{'✛ 만 응시 · 점을 끌다 사라지면 손 떼기'}</p>
                    )}
                </div>

                {/* 조작 — 눈 전환 / 다시 */}
                <div className="sc-panel">
                    <div className="sc-eyeswitch" role="group" aria-label="검사 눈 선택">
                        <button
                            type="button"
                            className={eye === 'right' ? 'on' : ''}
                            onClick={() => setEye('right')}
                        >
                            오른눈
                            {markPx.right != null && <i className="sc-done">●</i>}
                        </button>
                        <button
                            type="button"
                            className={eye === 'left' ? 'on' : ''}
                            onClick={() => setEye('left')}
                        >
                            왼눈
                            {markPx.left != null && <i className="sc-done">●</i>}
                        </button>
                    </div>
                    <button
                        type="button"
                        className="sc-retry"
                        onClick={() => { setDotX(eye === 'right' ? stageW * 0.9 : stageW * 0.1); setFound(false); }}
                    >
                        다시 끌기
                    </button>
                </div>

                {/* 결과 — 도형(원·고리·타원)으로 말하는 시야 지도 */}
                {(markPx.right != null || markPx.left != null) && (
                    <div className="sc-result">
                        <div className="sc-reveal">
                            {found ? (
                                <p>점은 <b>사라지지 않았다</b>. 이제 그 자리를 <b>직접 바라보라</b> — 다시 나타난다. 당신 눈엔 구멍이 있고, 뇌가 조용히 메우고 있었다.</p>
                            ) : (
                                <p>측정한 눈의 맹점을 시야 지도 위에 그렸다. 응시점(중앙)에서 <b>측두 방향</b> 약 15°에 놓이는 게 보통이다.</p>
                            )}
                        </div>

                        <div className="sc-mapwrap">
                            <svg className="sc-map" viewBox={`0 0 ${VB} ${VB}`} role="img" aria-label="시야 지도 위 맹점 위치">
                                {/* 각도 고리 */}
                                {[10, 20, 30].map((d) => (
                                    <circle key={d} cx={CENTER} cy={CENTER} r={mapR(d)} className="sc-ring" />
                                ))}
                                <circle cx={CENTER} cy={CENTER} r={R} className="sc-field" />
                                {/* 수평·수직 기준선 */}
                                <line x1={CENTER - R} y1={CENTER} x2={CENTER + R} y2={CENTER} className="sc-axis" />
                                <line x1={CENTER} y1={CENTER - R} x2={CENTER} y2={CENTER + R} className="sc-axis" />
                                {/* 응시점 */}
                                <line x1={CENTER - 9} y1={CENTER} x2={CENTER + 9} y2={CENTER} className="sc-fovea" />
                                <line x1={CENTER} y1={CENTER - 9} x2={CENTER} y2={CENTER + 9} className="sc-fovea" />
                                {/* 측정된 맹점(들) */}
                                {markPx.right != null && (() => { const s = spot('right', markPx.right); return (
                                    <g>
                                        <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} className="sc-hole" />
                                    </g>
                                ); })()}
                                {markPx.left != null && (() => { const s = spot('left', markPx.left); return (
                                    <g>
                                        <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} className="sc-hole" />
                                    </g>
                                ); })()}
                                {/* 각도 눈금 라벨(최소) */}
                                <text x={CENTER + mapR(10)} y={CENTER - 6} className="sc-deg">10°</text>
                                <text x={CENTER + mapR(20)} y={CENTER - 6} className="sc-deg">20°</text>
                                <text x={CENTER + mapR(30)} y={CENTER - 6} className="sc-deg">30°</text>
                            </svg>
                        </div>

                        {/* 만질 수 있는 데이터 — 가정 거리를 손으로 굴리면 각도가 바뀐다 */}
                        <div className="sc-readout">
                            <div className="sc-degbig">
                                <span className="sc-num">{eccDeg != null ? `≈${eccDeg.toFixed(1)}°` : '—'}</span>
                                <span className={`sc-verdict${inRange ? ' ok' : ''}`}>
                                    {eccDeg == null ? '' : inRange ? '정상 맹점대(약 12–18°)' : '거리 값을 굴려 맞춰 보라'}
                                </span>
                            </div>
                            <div
                                className="sc-scrub"
                                ref={knobRef}
                                onPointerDown={onKnobDown}
                                onPointerMove={onKnobMove}
                                role="slider"
                                aria-label="화면까지 가정 거리(cm)"
                                aria-valuemin={25}
                                aria-valuemax={70}
                                aria-valuenow={distCm}
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'ArrowLeft') { e.preventDefault(); setDistCm((d) => clamp(d - 1, 25, 70)); }
                                    if (e.key === 'ArrowRight') { e.preventDefault(); setDistCm((d) => clamp(d + 1, 25, 70)); }
                                }}
                            >
                                <span className="sc-scrub-fill" style={{ width: `${knobFrac * 100}%` }} />
                                <span className="sc-scrub-knob" style={{ left: `${knobFrac * 100}%` }} />
                                <span className="sc-scrub-cap sc-scrub-cap--l">가까이 25cm</span>
                                <span className="sc-scrub-cap sc-scrub-cap--r">70cm 멀리</span>
                            </div>
                            <p className="sc-scrub-now">화면까지 <b>{distCm}cm</b> 로 봤다고 가정</p>
                        </div>
                    </div>
                )}

                {/* 읽을거리 */}
                <section className="sc-read">
                    <h3>눈에 뚫린 구멍, 맹점</h3>
                    <p>
                        망막에서 시신경이 눈 밖으로 빠져나가는 자리(<b>시신경 원판, optic disc</b>)에는
                        빛을 받는 세포가 하나도 없다. 그래서 그 자리에 맺히는 상은 <b>애초에 감지되지 않는다</b> —
                        시야 한복판이 아니라 응시점에서 <b>측두(귀 쪽) 방향 약 15°</b>, 크기는 대략 <b>5°×7°</b>의
                        타원형 구멍이다. 한쪽 눈으로만 보면 늘 거기 있는데도 평소엔 전혀 못 느낀다.
                    </p>
                    <p>
                        이유는 뇌가 그 구멍을 <b>주변 무늬로 메워(fill-in)</b> 버리기 때문이다. 없는 정보를
                        만들어 채우는 게 아니라, 가장자리에서 이어질 법한 색·무늬로 <b>그럴듯하게 덮는다</b>.
                        두 눈을 같이 쓰면 한쪽의 맹점을 다른 눈이 채워 주니 더더욱 눈치채기 어렵다. 이 실험이
                        한쪽 눈을 가리게 하는 건 그래서다.
                    </p>
                    <p>
                        점을 끌다 <b>통째로 사라지는 순간</b>이 바로 상이 그 구멍에 떨어진 때다. 손을 떼면 응시점에서
                        점까지의 화면 거리를 <b>각도로 환산</b>해 시야 지도에 타원으로 얹는다 — 정확한 각도는 눈과
                        화면 사이 실제 거리에 따라 달라지므로, 아래 값을 <b>손으로 굴려</b> 당신의 거리에 맞춰 보라.
                        정밀 검사(하프리에 시야계)가 아니라 <b>구멍의 존재를 손끝으로 확인</b>하는 장난감이다.
                    </p>
                    <p className="sc-disc">
                        * 각도는 CSS 참조 픽셀(96dpi)과 가정 거리로 어림한 추정값이다. 브라우저 확대·기기 화면
                        크기에 따라 오차가 크므로 절대값보다 <b>“내 눈에도 구멍이 있다”</b>는 사실에 방점.
                    </p>
                </section>
            </section>
        </LabShell>
    );
};

export default Scotoma;
