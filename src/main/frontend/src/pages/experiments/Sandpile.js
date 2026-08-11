import React, { useEffect, useMemo, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Sandpile.css';

// SANDPILE — 자기조직화 임계 (Bak–Tang–Wiesenfeld 모래더미 모형 / Abelian Sandpile).
//   격자의 각 칸에 모래를 한 알씩 쌓는다. 어떤 칸이 4알에 이르면 "무너져(topple)" 4알을
//   네 이웃에 한 알씩 나눠 준다. 이 한 번의 무너짐이 이웃을 넘치게 해 연쇄(사태, avalanche)로
//   번진다. 가장자리로 넘친 알은 계 밖으로 사라진다.
// 밑바탕의 보편 개념: 계는 아무도 조율하지 않아도 스스로 "임계 밀도(~2.1)"까지 기어올라,
//   한 알이 계 전체를 휩쓸 수도 있고 아무 일도 없을 수도 있는 상태로 자리 잡는다. 사태 크기는
//   특정 척도가 없는 멱법칙(1/f 잡음)을 따른다 — 지진·산불·눈사태·정전 연쇄가 공유하는 원형.
//   (특정 사건·인물이 아니라 "작은 한 알이 언제 계 전체를 무너뜨리나"라는 추상 개념으로만 다룬다.)

const W = 81;                 // 격자 가로
const H = 81;                 // 격자 세로
const CELL = 6;               // 셀 픽셀
const N = W * H;
const HB = 18;                // 사태 크기 로그2 히스토그램 구간 수 (2^17 까지)
const RECENT = 72;            // 최근 사태 스트립 길이
const CRIT = 2.125;           // 열린 경계 BTW 정상상태 평균 높이(임계 밀도) 근사

const PAL_LIGHT = { 0: '#efe7d6', 1: '#e0c489', 2: '#cf9a3c', 3: '#a5641d', flash: '#ff3d1f' };
const PAL_DARK = { 0: '#15171d', 1: '#463a20', 2: '#8a6626', 3: '#c2882c', flash: '#ff5c3a' };

const freshStats = () => ({
    drops: 0, avalCount: 0, lastSize: 0, maxSize: 0,
    hist: new Array(HB).fill(0), recent: [],
});

const nf = (n) => n.toLocaleString('en-US');

const Sandpile = () => {
    const canvasRef = useRef(null);
    const gridRef = useRef(new Uint16Array(N));
    const statsRef = useRef(freshStats());
    const animRef = useRef(null);       // { size } — 진행 중인 애니메이션 사태
    const flashRef = useRef(null);      // 이번 프레임에 무너진 셀 인덱스 목록
    const rafRef = useRef(0);
    const frameCountRef = useRef(0);
    const runningRef = useRef(false);
    const speedRef = useRef(8);
    const posRef = useRef('random');    // 낙하 위치: random | center

    const [running, setRunning] = useState(false);
    const [speed, setSpeed] = useState(8);
    const [pos, setPos] = useState('random');
    const [ui, setUi] = useState(() => snapshot());

    // ── 스냅샷: refs → React 상태(통계 패널 갱신용) ──
    function snapshot() {
        const s = statsRef.current;
        const grid = gridRef.current;
        let sum = 0;
        for (let i = 0; i < grid.length; i += 1) sum += grid[i];
        const density = sum / grid.length;
        return {
            drops: s.drops, avalCount: s.avalCount, lastSize: s.lastSize, maxSize: s.maxSize,
            density, hist: s.hist.slice(), recent: s.recent.slice(),
        };
    }

    const palette = () => {
        const el = document.querySelector('.lab-os');
        return el && el.getAttribute('data-theme') === 'dark' ? PAL_DARK : PAL_LIGHT;
    };

    // ── 렌더: 격자 전체 + 사태 플래시 ──
    const render = () => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const grid = gridRef.current;
        const pal = palette();
        for (let i = 0; i < N; i += 1) {
            const v = grid[i] > 3 ? 3 : grid[i];
            ctx.fillStyle = pal[v];
            ctx.fillRect((i % W) * CELL, ((i / W) | 0) * CELL, CELL, CELL);
        }
        const flash = flashRef.current;
        if (flash) {
            ctx.fillStyle = pal.flash;
            for (let k = 0; k < flash.length; k += 1) {
                const i = flash[k];
                ctx.fillRect((i % W) * CELL, ((i / W) | 0) * CELL, CELL, CELL);
            }
        }
    };

    // ── 동기(병렬) 무너짐 한 파동 — 애니메이션용. 무너진 셀 목록 반환(없으면 null) ──
    const relaxStep = (grid) => {
        const cells = [];
        for (let i = 0; i < N; i += 1) if (grid[i] >= 4) cells.push(i);
        if (cells.length === 0) return null;
        for (let k = 0; k < cells.length; k += 1) grid[cells[k]] -= 4;
        for (let k = 0; k < cells.length; k += 1) {
            const i = cells[k];
            const x = i % W, y = (i / W) | 0;
            if (x > 0) grid[i - 1] += 1;
            if (x < W - 1) grid[i + 1] += 1;
            if (y > 0) grid[i - W] += 1;
            if (y < H - 1) grid[i + W] += 1;
        }
        return cells;
    };

    // ── 스택 기반 즉시 완전 이완 — 통계 수집용(효율적). 총 무너짐 수 반환 ──
    const relaxStack = (grid, start) => {
        const stack = [start];
        let size = 0;
        while (stack.length) {
            const i = stack.pop();
            while (grid[i] >= 4) {
                grid[i] -= 4;
                size += 1;
                const x = i % W, y = (i / W) | 0;
                if (x > 0) { grid[i - 1] += 1; if (grid[i - 1] === 4) stack.push(i - 1); }
                if (x < W - 1) { grid[i + 1] += 1; if (grid[i + 1] === 4) stack.push(i + 1); }
                if (y > 0) { grid[i - W] += 1; if (grid[i - W] === 4) stack.push(i - W); }
                if (y < H - 1) { grid[i + W] += 1; if (grid[i + W] === 4) stack.push(i + W); }
            }
        }
        return size;
    };

    const recordAvalanche = (size) => {
        const s = statsRef.current;
        s.lastSize = size;
        if (size > 0) {
            s.avalCount += 1;
            if (size > s.maxSize) s.maxSize = size;
            const b = Math.min(HB - 1, Math.floor(Math.log2(size)));
            s.hist[b] += 1;
            s.recent.push(size);
            if (s.recent.length > RECENT) s.recent.shift();
        }
    };

    const dropIdx = () => (posRef.current === 'center'
        ? ((H >> 1) * W + (W >> 1))
        : (Math.floor(Math.random() * N)));

    // 자동/대량 낙하: 즉시 이완, 통계만 수집
    const autoDrop = () => {
        const grid = gridRef.current;
        const idx = dropIdx();
        grid[idx] += 1;
        statsRef.current.drops += 1;
        recordAvalanche(grid[idx] >= 4 ? relaxStack(grid, idx) : 0);
    };

    const ensureLoop = () => {
        if (!rafRef.current) rafRef.current = requestAnimationFrame(frame);
    };

    function frame() {
        let dirty = false;
        if (animRef.current) {
            const cells = relaxStep(gridRef.current);
            if (!cells) {
                recordAvalanche(animRef.current.size);
                animRef.current = null;
                flashRef.current = null;
            } else {
                animRef.current.size += cells.length;
                flashRef.current = cells;
            }
            dirty = true;
        } else if (runningRef.current) {
            const n = speedRef.current;
            for (let k = 0; k < n; k += 1) autoDrop();
            flashRef.current = null;
            dirty = true;
        }

        if (dirty) {
            render();
            frameCountRef.current += 1;
            if (frameCountRef.current % 4 === 0) setUi(snapshot());
        }

        if (animRef.current || runningRef.current) {
            rafRef.current = requestAnimationFrame(frame);
        } else {
            rafRef.current = 0;
            setUi(snapshot());
        }
    }

    // 클릭 낙하: 한 알을 애니메이션으로 무너뜨림(자동 실행 중이면 즉시 처리)
    const placeAt = (idx) => {
        const grid = gridRef.current;
        if (runningRef.current) {
            grid[idx] += 1;
            statsRef.current.drops += 1;
            recordAvalanche(grid[idx] >= 4 ? relaxStack(grid, idx) : 0);
            return;
        }
        if (animRef.current) return;    // 애니메이션 중 클릭은 무시
        grid[idx] += 1;
        statsRef.current.drops += 1;
        animRef.current = { size: 0 };
        ensureLoop();
    };

    const onCanvasClick = (e) => {
        const cv = canvasRef.current;
        if (!cv) return;
        const rect = cv.getBoundingClientRect();
        const x = Math.floor(((e.clientX - rect.left) / rect.width) * W);
        const y = Math.floor(((e.clientY - rect.top) / rect.height) * H);
        if (x < 0 || x >= W || y < 0 || y >= H) return;
        placeAt(y * W + x);
    };

    const toggleRun = () => {
        runningRef.current = !runningRef.current;
        setRunning(runningRef.current);
        if (runningRef.current) ensureLoop();
    };

    const bulk = () => {
        for (let k = 0; k < 1000; k += 1) autoDrop();
        flashRef.current = null;
        render();
        setUi(snapshot());
    };

    const reset = () => {
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
        runningRef.current = false;
        setRunning(false);
        animRef.current = null;
        flashRef.current = null;
        gridRef.current = new Uint16Array(N);
        statsRef.current = freshStats();
        render();
        setUi(snapshot());
    };

    // 마운트: 캔버스 해상도 설정 후 최초 렌더
    useEffect(() => {
        const cv = canvasRef.current;
        if (cv) { cv.width = W * CELL; cv.height = H * CELL; }
        render();
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── 멱법칙 로그–로그 플롯 계산 ──
    const plot = useMemo(() => {
        const pts = [];
        for (let b = 0; b < ui.hist.length; b += 1) {
            if (ui.hist[b] > 0) pts.push({ b, y: Math.log10(ui.hist[b]) });
        }
        let tau = null;
        if (pts.length >= 4) {
            const n = pts.length;
            let sx = 0, sy = 0, sxx = 0, sxy = 0;
            pts.forEach((p) => { sx += p.b; sy += p.y; sxx += p.b * p.b; sxy += p.b * p.y; });
            const denom = n * sxx - sx * sx;
            if (denom !== 0) {
                const m = (n * sxy - sx * sy) / denom;      // d(log10 count)/d(log2 size)
                tau = 1 - m / Math.log10(2);                 // count∝size^(1-τ) → τ 근사
            }
        }
        const bmax = pts.length ? pts[pts.length - 1].b : 1;
        const ymax = pts.length ? Math.max(...pts.map((p) => p.y)) : 1;
        return { pts, tau, bmax: Math.max(bmax, 1), ymax: Math.max(ymax, 1) };
    }, [ui.hist]);

    // SVG 좌표 매핑
    const PW = 260, PH = 170, padL = 30, padB = 24, padT = 12, padR = 10;
    const px = (b) => padL + (b / plot.bmax) * (PW - padL - padR);
    const py = (y) => PH - padB - (y / plot.ymax) * (PH - padB - padT);
    const line = plot.tau != null
        ? (() => {
            const n = plot.pts.length;
            let sx = 0, sy = 0, sxx = 0, sxy = 0;
            plot.pts.forEach((p) => { sx += p.b; sy += p.y; sxx += p.b * p.b; sxy += p.b * p.y; });
            const m = (n * sxy - sx * sy) / (n * sxx - sx * sx);
            const c = (sy - m * sx) / n;
            return { x1: px(0), y1: py(c), x2: px(plot.bmax), y2: py(m * plot.bmax + c) };
        })()
        : null;

    const recentMax = ui.recent.length ? Math.max(...ui.recent) : 1;
    const bigCut = Math.max(60, ui.maxSize * 0.28);
    const isCrit = ui.density >= 2.0;
    const densPct = Math.min(100, (ui.density / 3) * 100);
    const critPct = (CRIT / 3) * 100;

    return (
        <LabShell
            title="SANDPILE"
            eyebrow="self-organized criticality · abelian sandpile"
            subtitle={'// 한 알이 언제 격자 전체를 무너뜨리나 — 스스로 임계로 기어오르는 모래더미'}
            path="sandpile.exe"
        >
            {/* 컨트롤 */}
            <section className="k-win sp-ctrl-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/pile/</span>controls</span>
                    <span className="meta k-mono">81×81 격자 · 무너짐 임계 4알</span>
                </div>
                <div className="sp-ctrl">
                    <div className="sp-ctrl-block">
                        <span className="sp-ctrl-lab k-mono">낙하 위치</span>
                        <div className="sp-seg">
                            <button
                                type="button"
                                className={`sp-seg-btn${pos === 'random' ? ' on' : ''}`}
                                onClick={() => { setPos('random'); posRef.current = 'random'; }}
                            >
                                무작위
                            </button>
                            <button
                                type="button"
                                className={`sp-seg-btn${pos === 'center' ? ' on' : ''}`}
                                onClick={() => { setPos('center'); posRef.current = 'center'; }}
                            >
                                중앙 고정
                            </button>
                        </div>
                    </div>

                    <div className="sp-ctrl-block sp-grow">
                        <span className="sp-ctrl-lab k-mono">
                            자동 낙하 속도 <b>{speed}</b> 알/프레임
                        </span>
                        <input
                            type="range" min="1" max="40" step="1" value={speed}
                            onChange={(e) => { const v = parseInt(e.target.value, 10); setSpeed(v); speedRef.current = v; }}
                            className="sp-range"
                            aria-label="자동 낙하 속도"
                        />
                    </div>

                    <div className="sp-actions">
                        <button type="button" className="sp-btn sp-btn-hot" onClick={toggleRun}>
                            {running ? '⏸ 정지' : '▶ 자동 쌓기'}
                        </button>
                        <button type="button" className="sp-btn sp-btn-ghost" onClick={bulk}>+1000 알갱이</button>
                        <button type="button" className="sp-btn sp-btn-ghost" onClick={reset}>초기화</button>
                    </div>
                </div>
            </section>

            {/* 스테이지 */}
            <section className="k-win sp-stage-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/pile/</span>lattice</span>
                    <span className="meta k-mono">격자를 클릭 → 그 자리에 모래 한 알</span>
                </div>
                <div className="sp-stage">
                    <div className="sp-canvas-wrap">
                        <canvas
                            ref={canvasRef}
                            className="sp-canvas"
                            onClick={onCanvasClick}
                            aria-label="모래더미 격자 — 클릭하면 모래 한 알을 떨어뜨립니다"
                        />
                        <span className="sp-canvas-hint k-mono">
                            {'// 4알이 되면 무너져 네 이웃에 한 알씩 — 붉게 번지는 것이 사태(avalanche)'}
                        </span>
                    </div>

                    <div className="sp-side">
                        <div className="sp-legend">
                            <span className="sp-ctrl-lab k-mono">칸의 모래 수</span>
                            <div className="sp-legend-row"><span className="sp-swatch" style={{ background: 'var(--sp-h0)' }} /> 0알 (빈 칸)</div>
                            <div className="sp-legend-row"><span className="sp-swatch" style={{ background: 'var(--sp-h1)' }} /> 1알</div>
                            <div className="sp-legend-row"><span className="sp-swatch" style={{ background: 'var(--sp-h2)' }} /> 2알</div>
                            <div className="sp-legend-row"><span className="sp-swatch" style={{ background: 'var(--sp-h3)' }} /> 3알 (임계 직전)</div>
                            <div className="sp-legend-row"><span className="sp-swatch" style={{ background: 'var(--sp-hot)' }} /> 무너지는 중</div>
                        </div>

                        <div className="sp-dens">
                            <span className="sp-ctrl-lab k-mono">평균 밀도 <b>{ui.density.toFixed(3)}</b> 알/칸</span>
                            <div className="sp-dens-track">
                                <div className="sp-dens-fill" style={{ width: `${densPct}%` }} />
                                <div className="sp-dens-mark" style={{ left: `${critPct}%` }} title="임계 밀도 ~2.13" />
                            </div>
                            <span className={`sp-badge ${isCrit ? 'crit' : 'sub'}`}>
                                {isCrit ? '임계 상태 (SOC)' : '충전 중 (subcritical)'}
                            </span>
                        </div>

                        <div className="sp-live">
                            <div className="sp-live-item">
                                <span className="sp-live-num k-mono">{nf(ui.lastSize)}</span>
                                <span className="sp-live-lab">마지막 사태 크기 (무너짐 수)</span>
                            </div>
                            <div className="sp-live-item">
                                <span className="sp-live-num k-mono" style={{ color: 'var(--sp-hot)' }}>{nf(ui.maxSize)}</span>
                                <span className="sp-live-lab">최대 사태 크기</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 통계 */}
            <section className="k-win sp-stat-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/stats/</span>avalanches</span>
                    <span className="meta k-mono">사태 크기 분포 · 멱법칙</span>
                </div>

                <div className="sp-metrics">
                    <div className="sp-metric">
                        <span className="sp-metric-num k-mono">{nf(ui.drops)}</span>
                        <span className="sp-metric-lab">떨어뜨린 모래</span>
                        <span className="sp-metric-sub k-mono">누적 낙하 수</span>
                    </div>
                    <div className="sp-metric">
                        <span className="sp-metric-num k-mono">{nf(ui.avalCount)}</span>
                        <span className="sp-metric-lab">일어난 사태</span>
                        <span className="sp-metric-sub k-mono">크기 ≥ 1 인 낙하</span>
                    </div>
                    <div className="sp-metric">
                        <span className="sp-metric-num k-mono">{ui.density.toFixed(2)}</span>
                        <span className="sp-metric-lab">평균 밀도</span>
                        <span className="sp-metric-sub k-mono">임계 ~{CRIT} 로 수렴</span>
                    </div>
                    <div className="sp-metric">
                        <span className="sp-metric-num k-mono" style={{ color: 'var(--sp-hot)' }}>
                            {plot.tau != null ? `τ≈${plot.tau.toFixed(2)}` : '—'}
                        </span>
                        <span className="sp-metric-lab">멱지수 근사</span>
                        <span className="sp-metric-sub k-mono">P(s) ∝ s⁻ᵗ</span>
                    </div>
                </div>

                <div className="sp-plot-wrap">
                    <div className="sp-plot">
                        <span className="sp-ctrl-lab k-mono">사태 크기 분포 (로그–로그)</span>
                        <svg viewBox={`0 0 ${PW} ${PH}`} role="img" aria-label="사태 크기 분포 로그-로그 플롯">
                            <line x1={padL} y1={padT} x2={padL} y2={PH - padB} stroke="var(--frame)" strokeWidth="1" />
                            <line x1={padL} y1={PH - padB} x2={PW - padR} y2={PH - padB} stroke="var(--frame)" strokeWidth="1" />
                            {line && (
                                <line
                                    x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                                    stroke="var(--sp-hot)" strokeWidth="1.5" strokeDasharray="4 3"
                                />
                            )}
                            {plot.pts.map((p) => (
                                <circle key={p.b} cx={px(p.b)} cy={py(p.y)} r="3" fill="var(--sp-sand)" stroke="var(--ink)" strokeWidth="0.6" />
                            ))}
                            <text x={padL} y={PH - 6} className="sp-axis" fontSize="8">작은 사태</text>
                            <text x={PW - padR} y={PH - 6} textAnchor="end" className="sp-axis" fontSize="8">큰 사태 →</text>
                        </svg>
                        <span className="sp-plot-cap">
                            가로=사태 크기(log₂), 세로=빈도(log₁₀). 점들이 <b>내리막 직선</b>에 가까울수록
                            특정 척도가 없는 <b>멱법칙</b>이다.
                        </span>
                    </div>

                    <div className="sp-recent">
                        <span className="sp-ctrl-lab k-mono">최근 사태 {ui.recent.length}건</span>
                        <div className="sp-recent-bars">
                            {ui.recent.map((s, i) => (
                                <span
                                    key={`${i}-${s}`}
                                    className={`sp-recent-bar${s >= bigCut ? ' big' : ''}`}
                                    style={{ height: `${(Math.log2(s + 1) / Math.log2(recentMax + 1)) * 100}%` }}
                                    title={`${nf(s)} 무너짐`}
                                />
                            ))}
                        </div>
                        <span className="sp-plot-cap">
                            대부분 작고 이따금 거대 — 이 &quot;조용하다 폭발&quot;하는 리듬이 자기조직화 임계의 지문이다.
                        </span>
                    </div>
                </div>
            </section>

            {/* 해설 */}
            <section className="k-win sp-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="sp-foot">
                    <p>
                        규칙은 단 하나다 — 어떤 칸에 모래가 <b>4알</b> 쌓이면 그 칸은 무너져(topple) 네 이웃에
                        한 알씩 나눠 준다. 이 한 번의 무너짐이 이웃을 또 넘치게 하면 연쇄가 일어난다. 이것이
                        <b> 사태(avalanche)</b>다. 가장자리로 넘친 알은 계 밖으로 흘러 사라진다. 자동 쌓기를 켜고
                        지켜보라 — 처음엔 밀도가 낮아 사태가 거의 없다가, 평균 밀도가 <b>임계값(~2.1)</b>에 다다르면
                        더는 올라가지 못하고 그 언저리를 맴돈다. 아무도 그 값을 정해 주지 않았는데도.
                    </p>
                    <p>
                        놀라운 점은 이 임계 상태에 <b>스스로</b> 도달한다는 것이다(자기조직화 임계, SOC).
                        온도나 압력 같은 매개변수를 사람이 미세하게 맞춰 줄 필요가 없다 — 그냥 한 알씩 계속
                        떨어뜨리면 계가 알아서 임계로 기어오른다. 그리고 임계에 이르면 사태 크기에 <b>특정 척도가
                        사라진다</b> — 작은 사태가 압도적으로 많고, 큰 사태는 드물지만, 그 관계가 멱법칙
                        P(s) ∝ s⁻ᵗ 을 따라 매끄럽게 이어진다. 로그–로그 그래프에서 점들이 내리막 직선을 그리는 이유다.
                        시간축으로 보면 이것이 그 유명한 <b>1/f 잡음</b>이다.
                    </p>
                    <p>
                        <b>중앙 고정</b>으로 바꿔 한 점에만 계속 떨어뜨리면, 무질서해 보이던 계가 사실은 매번
                        똑같은 <b>결정론적 프랙탈 무늬</b>를 그린다는 것도 보인다 — 무작위 낙하가 만드는 거친 표면과
                        전혀 다른 얼굴이다. <b>+1000 알갱이</b>로 단숨에 통계를 쌓아 분포가 직선으로 굳는 과정을,
                        속도를 올려 거대 사태가 붉게 격자를 휩쓰는 순간을 붙잡아 보라.
                    </p>
                    <p>
                        이 장난감 하나가 왜 그렇게 많이 인용될까. <b>지진</b>의 규모 분포(구텐베르크–릭터 법칙),
                        <b>산불</b>의 번짐, <b>눈사태</b>, <b>전력망 정전</b>의 연쇄, 심지어 시장의 급락까지 — 모두
                        평소엔 조용하다가 한 번씩 척도 없이 거대해지는 같은 리듬을 공유한다. &quot;낙타 등을 부러뜨리는
                        마지막 지푸라기&quot;가 언제 오는지 물으면, 답은 <b>어떤 특정 지푸라기가 아니라 계가 이미
                        임계에 얼마나 가까웠는가</b>이다 — 원인의 크기와 결과의 크기가 비례하지 않는 세계의 원형.
                    </p>
                    <p className="sp-disclaimer">
                        * Bak–Tang–Wiesenfeld(1987) 모래더미 모형의 단순화 구현입니다. 무너짐은 아벨성(abelian)에
                        따라 순서와 무관하게 같은 최종 상태로 수렴하며, 사태 크기는 총 무너짐 횟수로 셉니다.
                        특정 재난·사건과 무관한 추상 격자 모형이며, τ 값은 관측 히스토그램의 거친 최소제곱 근사입니다.
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Sandpile;
