import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Reach.css';

// 역기구학(Inverse Kinematics) 실험.
// 핵심: 로봇 팔에게 "여기를 짚어라"라고 목표점만 주면, 어깨·팔꿈치·손목의
// 각 관절 각도를 거꾸로 풀어야 한다. 순기구학(각도→끝점)은 쉽지만,
// 그 반대(끝점→각도)는 해가 여러 개거나 없을 수 있어 까다롭다.
// 여기서는 FABRIK(Forward And Backward Reaching IK)으로 매 프레임 근사한다 —
// 끝을 목표에 붙였다가(backward) 뿌리를 다시 고정(forward)하는 걸 반복하면
// 각 관절이 자연스레 제자리를 찾는다. 물리 AI가 목표를 움직임으로 바꾸는 방식의 축소판.

const VIEW_W = 600;
const VIEW_H = 440;
const BASE = { x: 300, y: 400 }; // 어깨(고정 뿌리)
const TOTAL_REACH = 280; // 관절 수와 무관하게 팔 전체 길이는 고정 → 관절만 잘게 나뉨
const MAX_ITER = 20;
const EPS = 0.5;

// FABRIK: 목표점을 향해 관절 위치를 거꾸로 푼다.
function solveIK(target, segCount) {
    const segLen = TOTAL_REACH / segCount;
    const dx = target.x - BASE.x;
    const dy = target.y - BASE.y;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const ux = dx / dist;
    const uy = dy / dist;
    const px = -uy; // 목표 방향에 수직 — 초기 자세를 살짝 굽혀 둘 방향
    const py = ux;

    // 초기 자세: 목표 방향으로 펴되 가운데 관절을 수직으로 살짝 굽힌다.
    // 곧게(collinear) 두면 FABRIK이 어느 쪽으로 접을지 못 정해 진동하는
    // 퇴화(degenerate) 케이스에 빠진다. 굽힘 방향은 목표 각도를 따라 연속적으로
    // 회전하므로 드래그해도 자세가 튀지 않고 매끄럽게 추종한다.
    const pts = [];
    for (let i = 0; i <= segCount; i++) {
        const bump = Math.sin((Math.PI * i) / segCount) * segLen * 0.6; // 양 끝은 0
        pts.push({
            x: BASE.x + ux * segLen * i + px * bump,
            y: BASE.y + uy * segLen * i + py * bump,
        });
    }

    const reachable = dist <= TOTAL_REACH;
    if (!reachable) {
        // 범위 밖 — 곧게 뻗은 채로 최대한 손을 내민다
        return { points: pts, iters: 0, error: dist - TOTAL_REACH, reachable };
    }

    let iters = 0;
    for (; iters < MAX_ITER; iters++) {
        const end = pts[segCount];
        if (Math.hypot(end.x - target.x, end.y - target.y) < EPS) break;

        // backward: 끝점을 목표에 붙이고 뿌리 쪽으로 거슬러 올라가며 길이 보정
        pts[segCount] = { x: target.x, y: target.y };
        for (let i = segCount - 1; i >= 0; i--) {
            const r = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y) || 1e-6;
            const l = segLen / r;
            pts[i] = {
                x: (1 - l) * pts[i + 1].x + l * pts[i].x,
                y: (1 - l) * pts[i + 1].y + l * pts[i].y,
            };
        }
        // forward: 뿌리를 어깨에 다시 고정하고 끝점 쪽으로 내려오며 길이 보정
        pts[0] = { x: BASE.x, y: BASE.y };
        for (let i = 0; i < segCount; i++) {
            const r = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y) || 1e-6;
            const l = segLen / r;
            pts[i + 1] = {
                x: (1 - l) * pts[i].x + l * pts[i + 1].x,
                y: (1 - l) * pts[i].y + l * pts[i + 1].y,
            };
        }
    }

    const end = pts[segCount];
    const error = Math.hypot(end.x - target.x, end.y - target.y);
    return { points: pts, iters, error, reachable };
}

const PRESETS = [
    { label: '위로', x: 300, y: 150 },
    { label: '옆으로', x: 540, y: 360 },
    { label: '범위 밖', x: 560, y: 70 },
];

const Reach = () => {
    const [segCount, setSegCount] = useState(4);
    const [target, setTarget] = useState({ x: 440, y: 180 });
    const [showReach, setShowReach] = useState(true);
    const svgRef = useRef(null);
    const dragRef = useRef(false);

    const sol = useMemo(() => solveIK(target, segCount), [target, segCount]);

    const toLocal = useCallback((clientX, clientY) => {
        const svg = svgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * VIEW_W;
        const y = ((clientY - rect.top) / rect.height) * VIEW_H;
        return {
            x: Math.max(8, Math.min(VIEW_W - 8, x)),
            y: Math.max(8, Math.min(VIEW_H - 8, y)),
        };
    }, []);

    const onPointerDown = useCallback((e) => {
        dragRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        const p = toLocal(e.clientX, e.clientY);
        if (p) setTarget(p);
    }, [toLocal]);

    const onPointerMove = useCallback((e) => {
        if (!dragRef.current) return;
        const p = toLocal(e.clientX, e.clientY);
        if (p) setTarget(p);
    }, [toLocal]);

    const onPointerUp = useCallback((e) => {
        dragRef.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    }, []);

    const pts = sol.points;
    const end = pts[pts.length - 1];

    // 끝 그리퍼(집게)의 방향 — 마지막 관절 각도
    const prev = pts[pts.length - 2];
    const ang = (Math.atan2(end.y - prev.y, end.x - prev.x) * 180) / Math.PI;

    return (
        <div className="rk-container">
            <div className="rk-inner">
                <Link to="/" className="rk-back">← 실험실로 돌아가기</Link>

                <header className="rk-header">
                    <h1 className="rk-title">REACH</h1>
                    <p className="rk-sub">{'// 목표점만 주면 관절 각도를 거꾸로 푼다 — 로봇 팔 역기구학(IK)'}</p>
                </header>

                <div className="rk-stage">
                    {/* 좌측: 작업 공간 */}
                    <section className="rk-left">
                        <div className="rk-canvas-head">
                            <span>작업 공간</span>
                            <span className="rk-hint">손 끝(또는 아무 곳)을 드래그해 목표를 옮겨보세요</span>
                        </div>

                        <svg
                            ref={svgRef}
                            className="rk-svg"
                            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                        >
                            {/* 도달 가능 반경 */}
                            {showReach && (
                                <circle
                                    className="rk-reach"
                                    cx={BASE.x}
                                    cy={BASE.y}
                                    r={TOTAL_REACH}
                                />
                            )}

                            {/* 바닥 + 받침대 */}
                            <line className="rk-floor" x1={40} y1={BASE.y} x2={VIEW_W - 40} y2={BASE.y} />
                            <rect className="rk-mount" x={BASE.x - 26} y={BASE.y} width={52} height={22} />

                            {/* 링크(팔 마디) */}
                            {pts.slice(0, -1).map((p, i) => (
                                // eslint-disable-next-line react/no-array-index-key
                                <line key={`seg-${i}`}
                                    className="rk-link"
                                    x1={p.x}
                                    y1={p.y}
                                    x2={pts[i + 1].x}
                                    y2={pts[i + 1].y}
                                />
                            ))}

                            {/* 관절 */}
                            {pts.slice(0, -1).map((p, i) => (
                                // eslint-disable-next-line react/no-array-index-key
                                <circle key={`joint-${i}`}
                                    className={i === 0 ? 'rk-joint rk-joint-base' : 'rk-joint'}
                                    cx={p.x}
                                    cy={p.y}
                                    r={i === 0 ? 9 : 6}
                                />
                            ))}

                            {/* 끝 그리퍼 */}
                            <g transform={`translate(${end.x} ${end.y}) rotate(${ang})`}>
                                <rect className="rk-grip" x={-3} y={-12} width={6} height={24} rx={1} />
                                <rect className="rk-grip" x={2} y={-12} width={9} height={5} rx={1} />
                                <rect className="rk-grip" x={2} y={7} width={9} height={5} rx={1} />
                            </g>

                            {/* 목표점 */}
                            <g className={'rk-target' + (sol.reachable ? '' : ' rk-target-out')}>
                                <circle cx={target.x} cy={target.y} r={12} className="rk-target-ring" />
                                <line x1={target.x - 16} y1={target.y} x2={target.x + 16} y2={target.y} />
                                <line x1={target.x} y1={target.y - 16} x2={target.x} y2={target.y + 16} />
                            </g>
                        </svg>

                        <div className="rk-presets">
                            <span className="rk-presets-l">빠른 목표</span>
                            {PRESETS.map((p) => (
                                <button
                                    key={p.label}
                                    type="button"
                                    className="rk-chip"
                                    onClick={() => setTarget({ x: p.x, y: p.y })}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* 우측: 컨트롤 + 상태 */}
                    <aside className="rk-panel">
                        <div className="rk-control">
                            <label htmlFor="rk-seg">관절 수 <b>{segCount}</b></label>
                            <input
                                id="rk-seg"
                                type="range"
                                min={2}
                                max={8}
                                value={segCount}
                                onChange={(e) => setSegCount(Number(e.target.value))}
                            />
                            <span className="rk-note">팔 전체 길이는 고정 — 관절만 잘게 나뉜다</span>
                        </div>

                        <button
                            type="button"
                            className={'rk-toggle' + (showReach ? ' rk-toggle-on' : '')}
                            onClick={() => setShowReach((v) => !v)}
                        >
                            {showReach ? '● 도달 반경 표시' : '○ 도달 반경 숨김'}
                        </button>

                        <div className={'rk-verdict ' + (sol.reachable ? 'rk-verdict-ok' : 'rk-verdict-out')}>
                            <span className="rk-verdict-icon">{sol.reachable ? '🦾' : '🚫'}</span>
                            <span className="rk-verdict-text">
                                {sol.reachable ? '도달 가능 — 손을 뻗는 중' : '범위 밖 — 닿지 못함'}
                            </span>
                        </div>

                        <div className="rk-stat-main">
                            <span className="rk-stat-num">
                                {sol.reachable ? sol.iters : '—'}
                            </span>
                            <span className="rk-stat-label">수렴까지 반복 횟수 (FABRIK 패스)</span>
                        </div>

                        <div className="rk-stat-row">
                            <div className="rk-stat">
                                <span className="rk-stat-mini">
                                    {sol.reachable ? sol.error.toFixed(1) : `+${sol.error.toFixed(0)}`}
                                </span>
                                <span className="rk-stat-label">{sol.reachable ? '끝점 오차(px)' : '모자란 거리(px)'}</span>
                            </div>
                            <div className="rk-stat">
                                <span className="rk-stat-mini">{segCount}</span>
                                <span className="rk-stat-label">자유도(관절)</span>
                            </div>
                        </div>
                    </aside>
                </div>

                <footer className="rk-foot">
                    <p>
                        {'각도를 정하면 손 끝이 어디 가는지 구하는 건 쉽다('}<b>순기구학</b>{'). 어려운 건 그 반대 — '}
                        {'"여기를 짚어라"라는 '}<b>목표점</b>{'만 주고 어깨·팔꿈치·손목 '}<b>각 관절 각도</b>
                        {'를 거꾸로 푸는 '}<b>역기구학(IK)</b>{'이다. 해가 여러 개거나(팔꿈치를 위로/아래로) 아예 없을 수도 있다.'}
                    </p>
                    <p>
                        {'여기서는 '}<b>FABRIK</b>{' 방식으로 푼다. 끝점을 목표에 '}<b>붙였다가</b>{'(backward) 뿌리를 어깨에 '}
                        <b>다시 고정</b>{'(forward)하는 왕복을 반복하면, 각 마디 길이를 지키면서 관절들이 스스로 제자리를 찾는다. '}
                        {'대개 몇 번의 패스 만에 수렴한다 — 우측 반복 횟수가 그 수치다.'}
                    </p>
                    <p>
                        {'목표가 '}<b>도달 반경</b>{'(점선 원) 밖이면 팔은 곧게 뻗은 채 손만 내밀 뿐 닿지 못한다. '}
                        {'관절 수를 늘리면 같은 길이를 더 잘게 접어 같은 목표라도 더 부드러운 자세가 나온다 — '}
                        {'로봇 팔과 휴머노이드가 목표를 실제 움직임으로 바꾸는 방식의 축소판이다.'}
                    </p>
                    <p className="rk-disclaimer">
                        {'* 실제 모터·토크가 아니라 IK 솔버(FABRIK)의 기하학적 수렴 과정을 보여주는 2D 근사 시뮬레이터입니다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default Reach;
