import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/EdgeRun.css';

// 캔버스 논리 해상도 (CSS로 반응형 스케일됨)
const W = 720;
const H = 480;

// 오리진(중앙 데이터센터)은 좌하단 구석에 고정 — 멀리 있는 사용자일수록 손해
const ORIGIN = { x: 110, y: 400 };
const MAX_EDGES = 6;

// 지연(ms) 모델: 왕복 = 기본처리 + 2 × 거리 × 광속/네트워크 계수
const BASE_MS = 6;
const MS_PER_PX = 0.14;

const latencyFor = (ux, uy, node) => {
    const d = Math.hypot(ux - node.x, uy - node.y);
    return BASE_MS + 2 * d * MS_PER_PX;
};

// 지연(ms) → 색 (좋음=청록 / 나쁨=주황적). 보라 그라데이션 배제
const latencyColor = (ms) => {
    if (ms < 30) return '#2ee6c9';
    if (ms < 70) return '#7fe87a';
    if (ms < 120) return '#ffd23f';
    if (ms < 180) return '#ff8c42';
    return '#ff5470';
};

const EdgeRun = () => {
    const [userCount, setUserCount] = useState(120);
    const [showLines, setShowLines] = useState(true);
    const [edgeCount, setEdgeCount] = useState(0);
    const [stats, setStats] = useState({ avg: 0, p95: 0, edgeShare: 0 });

    const canvasRef = useRef(null);
    const usersRef = useRef([]);
    const edgesRef = useRef([]);
    const countRef = useRef(userCount);
    const showLinesRef = useRef(showLines);
    countRef.current = userCount;
    showLinesRef.current = showLines;

    // 사용자 수에 맞춰 배열을 늘리거나 줄인다 (위치·패킷 위상 보존)
    const syncUsers = useCallback((target) => {
        const arr = usersRef.current;
        while (arr.length < target) {
            arr.push({
                x: 30 + Math.random() * (W - 60),
                y: 30 + Math.random() * (H - 60),
                t: Math.random(), // 패킷 왕복 위상 [0,1)
            });
        }
        if (arr.length > target) arr.length = target;
    }, []);

    const shuffleUsers = useCallback(() => {
        usersRef.current = [];
        syncUsers(countRef.current);
    }, [syncUsers]);

    useEffect(() => {
        syncUsers(userCount);
    }, [userCount, syncUsers]);

    // 시뮬레이션 + 렌더 루프 (마운트 시 1회, 파라미터는 ref로 읽음)
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let raf;
        let frame = 0;

        const step = () => {
            const users = usersRef.current;
            const nodes = [{ ...ORIGIN, edge: false }, ...edgesRef.current.map((e) => ({ ...e, edge: true }))];
            const lines = showLinesRef.current;

            // 배경 + 격자
            ctx.fillStyle = '#0d1b2a';
            ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = 'rgba(120,160,190,0.08)';
            ctx.lineWidth = 1;
            for (let gx = 0; gx <= W; gx += 40) {
                ctx.beginPath();
                ctx.moveTo(gx, 0);
                ctx.lineTo(gx, H);
                ctx.stroke();
            }
            for (let gy = 0; gy <= H; gy += 40) {
                ctx.beginPath();
                ctx.moveTo(0, gy);
                ctx.lineTo(W, gy);
                ctx.stroke();
            }

            let sum = 0;
            let edgeServed = 0;
            const all = [];

            // 각 사용자를 가장 가까운 노드에 라우팅
            for (let i = 0; i < users.length; i++) {
                const u = users[i];
                let best = nodes[0];
                let bestD = Math.hypot(u.x - best.x, u.y - best.y);
                for (let k = 1; k < nodes.length; k++) {
                    const d = Math.hypot(u.x - nodes[k].x, u.y - nodes[k].y);
                    if (d < bestD) {
                        bestD = d;
                        best = nodes[k];
                    }
                }
                const ms = latencyFor(u.x, u.y, best);
                sum += ms;
                if (best.edge) edgeServed++;
                all.push(ms);

                const col = latencyColor(ms);

                // 라우팅 선
                if (lines) {
                    ctx.strokeStyle = best.edge ? 'rgba(46,230,201,0.22)' : 'rgba(255,140,66,0.18)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(u.x, u.y);
                    ctx.lineTo(best.x, best.y);
                    ctx.stroke();
                }

                // 패킷 왕복 위상 진행: 지연이 클수록 느리게 (거리감 강조)
                const dur = Math.max(20, Math.min(150, ms * 0.9));
                u.t += 1 / dur;
                if (u.t >= 1) u.t -= 1;
                let px;
                let py;
                if (u.t < 0.5) {
                    const f = u.t * 2; // 사용자 → 노드
                    px = u.x + (best.x - u.x) * f;
                    py = u.y + (best.y - u.y) * f;
                } else {
                    const f = (u.t - 0.5) * 2; // 노드 → 사용자
                    px = best.x + (u.x - best.x) * f;
                    py = best.y + (u.y - best.y) * f;
                }

                // 사용자 점
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(u.x, u.y, 2.6, 0, Math.PI * 2);
                ctx.fill();

                // 패킷
                ctx.fillStyle = col;
                ctx.globalAlpha = 0.9;
                ctx.beginPath();
                ctx.arc(px, py, 1.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            // 노드 렌더 (오리진 + 엣지)
            for (let k = 0; k < nodes.length; k++) {
                const node = nodes[k];
                if (node.edge) {
                    ctx.fillStyle = '#2ee6c9';
                    ctx.strokeStyle = '#0d1b2a';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, 7, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                } else {
                    // 오리진: 주황 다이아몬드
                    ctx.save();
                    ctx.translate(node.x, node.y);
                    ctx.rotate(Math.PI / 4);
                    ctx.fillStyle = '#ff8c42';
                    ctx.strokeStyle = '#0d1b2a';
                    ctx.lineWidth = 2;
                    ctx.fillRect(-8, -8, 16, 16);
                    ctx.strokeRect(-8, -8, 16, 16);
                    ctx.restore();
                    ctx.fillStyle = '#ff8c42';
                    ctx.font = '700 11px Consolas, monospace';
                    ctx.fillText('ORIGIN', node.x - 20, node.y + 24);
                }
            }

            // 통계 (10프레임마다 갱신)
            frame++;
            if (frame % 10 === 0 && all.length) {
                const avg = sum / all.length;
                const sorted = all.slice().sort((a, b) => a - b);
                const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
                setStats({
                    avg: Math.round(avg),
                    p95: Math.round(p95),
                    edgeShare: Math.round((edgeServed / all.length) * 100),
                });
            }

            raf = requestAnimationFrame(step);
        };

        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, []);

    // 클릭/터치 → 캔버스 논리 좌표 변환
    const toCanvas = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: ((cx - rect.left) / rect.width) * W,
            y: ((cy - rect.top) / rect.height) * H,
        };
    };

    // 캔버스 클릭: 기존 엣지 근처면 제거, 아니면 추가(최대치까지)
    const handleClick = (e) => {
        const p = toCanvas(e);
        const edges = edgesRef.current;
        const hit = edges.findIndex((n) => Math.hypot(n.x - p.x, n.y - p.y) < 16);
        if (hit >= 0) {
            edges.splice(hit, 1);
        } else if (edges.length < MAX_EDGES) {
            edges.push({ x: p.x, y: p.y });
        }
        setEdgeCount(edges.length);
    };

    const clearEdges = () => {
        edgesRef.current = [];
        setEdgeCount(0);
    };

    return (
        <div className="er-container">
            <div className="er-inner">
                <Link to="/" className="er-back">← 실험실로 돌아가기</Link>

                <header className="er-header">
                    <h1 className="er-title">EDGE RUN</h1>
                    <p className="er-sub">
                        {'// 거리가 곧 지연이다 — 연산을 사용자 가까이로 끌어오면 응답이 빨라진다'}
                    </p>
                </header>

                <div className="er-stage">
                    <div className="er-canvas-wrap">
                        <canvas
                            ref={canvasRef}
                            width={W}
                            height={H}
                            className="er-canvas"
                            onClick={handleClick}
                            onTouchStart={(e) => {
                                e.preventDefault();
                                handleClick(e);
                            }}
                        />
                        <p className="er-hint">
                            {'캔버스를 클릭해 엣지 노드를 배치하세요 — 점이 붉을수록 느린 응답, 청록일수록 빠른 응답'}
                        </p>
                    </div>

                    <div className="er-panel">
                        <div className="er-stat er-stat-main">
                            <span className="er-stat-num">{stats.avg}<small>ms</small></span>
                            <span className="er-stat-label">평균 왕복 지연</span>
                        </div>

                        <div className="er-stat-row">
                            <div className="er-stat">
                                <span className="er-stat-num er-mini">{stats.p95}<small>ms</small></span>
                                <span className="er-stat-label">p95 지연</span>
                            </div>
                            <div className="er-stat">
                                <span className="er-stat-num er-mini">{stats.edgeShare}<small>%</small></span>
                                <span className="er-stat-label">엣지 처리율</span>
                            </div>
                        </div>

                        <div className="er-edges">
                            <span>엣지 노드</span>
                            <b>{edgeCount} / {MAX_EDGES}</b>
                        </div>

                        <div className="er-control">
                            <label htmlFor="er-users">
                                사용자 수 <b>{userCount}</b>
                            </label>
                            <input
                                id="er-users"
                                type="range"
                                min={40}
                                max={220}
                                value={userCount}
                                onChange={(e) => setUserCount(Number(e.target.value))}
                            />
                        </div>

                        <label className="er-toggle">
                            <input
                                type="checkbox"
                                checked={showLines}
                                onChange={(e) => setShowLines(e.target.checked)}
                            />
                            <span>라우팅 경로 표시</span>
                        </label>

                        <div className="er-buttons">
                            <button type="button" className="er-btn" onClick={shuffleUsers}>사용자 재배치</button>
                            <button type="button" className="er-btn" onClick={clearEdges}>엣지 초기화</button>
                        </div>
                    </div>
                </div>

                <footer className="er-foot">
                    <p>
                        {'모든 요청이 멀리 떨어진 '}<b>오리진</b>{' 한 곳으로만 향하면, 거리가 먼 사용자는 '}
                        {'빛의 속도라는 물리적 한계 탓에 응답이 느려진다. '}
                        {'연산과 캐시를 사용자 가까이의 '}<b>엣지 노드</b>{'로 분산하면 왕복 거리가 짧아져 '}
                        {'지연이 떨어지고 꼬리 지연(p95)도 안정된다. '}
                        {'이것이 2026년 웹을 다시 서버 가까이로 끌어당기는 '}<b>엣지 컴퓨팅</b>{'의 핵심 직관이다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default EdgeRun;
