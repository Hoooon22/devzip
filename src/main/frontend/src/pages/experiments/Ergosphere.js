import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Ergosphere.css';

// ERGOSPHERE — 회전 블랙홀 에너지 추출(펜로즈 과정) 실험.
// 핵심: 회전하는 블랙홀 둘레에는 사건의 지평선 바깥에 "에르고권(ergosphere)"이라는 껍질이 있다.
//   그 안에서는 시공간 자체가 블랙홀의 회전 방향으로 끌려 돌기 때문에(관성계 끌림, frame dragging)
//   어떤 것도 정지해 있을 수 없다. 이 성질을 이용하면, 입자 하나를 에르고권 안에서 둘로 쪼개
//   한 조각을 회전 반대 방향으로 던져 "무한원에서 잰 에너지가 음수"가 되게 만들 수 있다.
//   그 음(-)의 조각이 지평선으로 빨려 들어가면 블랙홀의 질량·각운동량이 줄고,
//   남은 조각은 들어올 때보다 더 큰 에너지를 안고 탈출한다 — 블랙홀의 "회전 에너지"를 뽑아낸 것.
//   다만 공짜는 아니다: 뽑을수록 스핀 a가 줄어 에르고권이 닫히고, 이론상 최대 추출량은
//   회전 에너지 E_rot = M − M_irr(불가역 질량)로 한정된다(극한 스핀에서 ~29%).
//
// 모델(적도면 2D, 기하 단위 G=c=1, 초기 질량 M0=1):
//   - 사건의 지평선: r_h = M + √(M² − a²)
//   - 정적 한계(에르고권 바깥 경계, 적도면): r_static = 2M  (스핀과 무관하게 2M)
//   - 에르고권 = r_h < r < 2M 인 껍질. a가 클수록 두껍다.
//   - 불가역 질량: M_irr = √(M·r_h / 2). 회전 에너지 저수지 E_rot = M − M_irr.
//   - 추출 1회: 분할 깊이 g·역행 던지기 retro·현재 스핀에 비례해 이득 gain을 뽑되,
//     남은 저수지를 넘지 못한다. 가역(이상) 과정으로 근사해 M_irr을 보존 →
//     M ↓, a ↓ 하며 저수지가 정확히 gain 만큼 줄어든다(누적 이득 → 초기 E_rot에 수렴).

const CX = 195, CY = 195;      // 캔버스 중심(px)
const CANVAS = 390;            // 캔버스 한 변(정사각)
const SCALE = 75;              // 단위→px (정적 한계 2M0=2.0 → 150px)
const R_EDGE = 186;            // 입자가 들어오기 시작하는 반경(px)
const TICK_MS = 33;            // ≈30fps
const K_GAIN = 0.42;           // 추출 강도 계수
const PER_EVENT_CAP = 0.14;    // 1회 추출 상한(연출용 페이싱)
const toPx = (rUnit) => rUnit * SCALE;

// 현재 상태에서 추출 1회의 결과를 계산한다(가역 근사, M_irr 보존).
function computeEvent(M, a, depth, retro) {
    const rh = M + Math.sqrt(Math.max(0, M * M - a * a));
    const Mirr = Math.sqrt(M * rh / 2);
    const reservoir = Math.max(0, M - Mirr);
    if (a <= 1e-3 || reservoir <= 1e-4) {
        return { gain: 0, newM: M, newA: a, rh, Mirr, reservoir };
    }
    const aNorm = a / M;                        // 0..1
    let gain = K_GAIN * aNorm * depth * retro;  // 깊이·역행·스핀 모두 있어야 이득
    gain = Math.min(gain, PER_EVENT_CAP, reservoir);
    const newM = M - gain;
    // M_irr 보존 → 새 지평선 반경, 새 스핀
    const rhNew = 2 * Mirr * Mirr / newM;
    const inside = newM * newM - (rhNew - newM) * (rhNew - newM);
    const newA = Math.sqrt(Math.max(0, inside));
    return { gain, newM, newA, rh, Mirr, reservoir };
}

const Ergosphere = () => {
    const canvasRef = useRef(null);

    // 파라미터 — 루프 재시작 없이 읽도록 ref로도 보관.
    const depthRef = useRef(0.78);   // 분할 깊이(0=정적 한계, 1=지평선 바로 위)
    const retroRef = useRef(0.85);   // 역행 던지기 강도(0=순행, 1=최대 역행)
    const a0Ref = useRef(0.98);      // 초기 스핀

    // 물리 상태
    const MRef = useRef(1);
    const aRef = useRef(0.98);
    const harvestRef = useRef(0);
    const maxHarvestRef = useRef(0);
    const shotsRef = useRef([]);     // 진행 중인 입자 애니메이션
    const dragPhaseRef = useRef(0);  // 관성계 끌림 소용돌이 위상

    const [depth, setDepthState] = useState(0.78);
    const [retro, setRetroState] = useState(0.85);
    const [a0, setA0State] = useState(0.98);
    const [hud, setHud] = useState({ a: 0.98, M: 1, Mirr: 0, rot: 0, harvest: 0, lastGain: 0, eOut: 1, pct: 0, shots: 0 });

    const refreshHud = useCallback((lastGain = 0) => {
        const M = MRef.current, a = aRef.current;
        const rh = M + Math.sqrt(Math.max(0, M * M - a * a));
        const Mirr = Math.sqrt(M * rh / 2);
        const rot = Math.max(0, M - Mirr);
        const maxH = maxHarvestRef.current;
        setHud({
            a, M, Mirr, rot,
            harvest: harvestRef.current,
            lastGain,
            eOut: 1 + lastGain,
            pct: maxH > 1e-6 ? (harvestRef.current / maxH) * 100 : 0,
            shots: shotsRef.current.length,
        });
    }, []);

    // 초기화 — 주어진 초기 스핀으로 상태 리셋.
    const resetTo = useCallback((spin) => {
        MRef.current = 1;
        aRef.current = spin;
        harvestRef.current = 0;
        const rh0 = 1 + Math.sqrt(Math.max(0, 1 - spin * spin));
        const Mirr0 = Math.sqrt(1 * rh0 / 2);
        maxHarvestRef.current = 1 - Mirr0; // 이 스핀에서 뽑을 수 있는 이론 상한
        shotsRef.current = [];
        refreshHud(0);
    }, [refreshHud]);

    // 입자 투입 — 물리를 즉시 적용하고, 연출용 애니메이션 샷을 하나 띄운다.
    const drop = useCallback(() => {
        const M = MRef.current, a = aRef.current;
        const ev = computeEvent(M, a, depthRef.current, retroRef.current);
        MRef.current = ev.newM;
        aRef.current = ev.newA;
        harvestRef.current += ev.gain;

        // 분할 반경(px): 깊이 100%는 지평선 바로 위, 0%는 정적 한계(2M).
        const rhU = ev.rh, staticU = 2 * M;
        const rSplitU = staticU - depthRef.current * (staticU - rhU);
        const twist = 1.1 + (a / M) * 2.6;         // 스핀 클수록 더 감긴다
        if (shotsRef.current.length < 6) {
            shotsRef.current.push({
                p: 0,
                ang0: Math.random() * Math.PI * 2,
                rSplitPx: toPx(rSplitU),
                rhPx: toPx(rhU),
                twist,
                gain: ev.gain,
                trailIn: [],
                trailEsc: [],
            });
        }
        refreshHud(ev.gain);
    }, [refreshHud]);

    // ---- 렌더 루프 ----
    const render = useCallback(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const W = cv.width, H = cv.height;
        const css = getComputedStyle(cv);
        const cErgo = css.getPropertyValue('--ergo-ergo').trim() || '#1f6f74';
        const cDrag = css.getPropertyValue('--ergo-drag').trim() || '#3f6f9c';
        const cIn = css.getPropertyValue('--ergo-in').trim() || '#4fd0e0';
        const cCap = css.getPropertyValue('--ergo-cap').trim() || '#e0483f';
        const cOut = css.getPropertyValue('--ergo-out').trim() || '#f2b134';

        const M = MRef.current, a = aRef.current;
        const rhU = M + Math.sqrt(Math.max(0, M * M - a * a));
        const staticU = 2 * M;
        const rhPx = toPx(rhU);
        const staticPx = toPx(staticU);

        // 배경(딥 스페이스)
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#07090f';
        ctx.fillRect(0, 0, W, H);

        // 별 몇 개(정적 한계 밖)
        ctx.fillStyle = 'rgba(200,210,230,0.5)';
        for (let i = 0; i < STARS.length; i++) {
            const s = STARS[i];
            ctx.globalAlpha = s.a;
            ctx.fillRect(s.x, s.y, s.s, s.s);
        }
        ctx.globalAlpha = 1;

        // 정적 한계(에르고권 바깥 경계)
        ctx.strokeStyle = 'rgba(150,170,190,0.35)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(CX, CY, staticPx, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);

        // 에르고권 껍질(지평선~정적 한계) 채우기
        ctx.save();
        ctx.beginPath();
        ctx.arc(CX, CY, staticPx, 0, Math.PI * 2);
        ctx.arc(CX, CY, rhPx, 0, Math.PI * 2, true);
        ctx.fillStyle = hexA(cErgo, 0.16);
        ctx.fill('evenodd');
        ctx.restore();

        // 관성계 끌림 소용돌이 — 에르고권 안에서 회전 방향으로 감긴 호들
        const ph = dragPhaseRef.current;
        const arcs = 5;
        for (let k = 0; k < arcs; k++) {
            const frac = (k + 0.5) / arcs;
            const rr = rhPx + frac * (staticPx - rhPx);
            // 지평선에 가까울수록 더 빠르고 진하게 끌린다
            const near = 1 - frac;
            const speed = 0.6 + near * 1.8;
            const start = ph * speed + k * 1.3;
            const span = 0.7 + near * 1.4;
            ctx.strokeStyle = hexA(cDrag, 0.22 + near * 0.4);
            ctx.lineWidth = 1 + near * 1.4;
            ctx.beginPath();
            ctx.arc(CX, CY, rr, start, start + span);
            ctx.stroke();
            // 화살촉
            const ex = CX + rr * Math.cos(start + span);
            const ey = CY + rr * Math.sin(start + span);
            const tang = start + span + Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - 5 * Math.cos(tang - 0.4), ey - 5 * Math.sin(tang - 0.4));
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - 5 * Math.cos(tang + 0.4), ey - 5 * Math.sin(tang + 0.4));
            ctx.stroke();
        }

        // 사건의 지평선(칠흑 원 + 얇은 광환)
        const glow = ctx.createRadialGradient(CX, CY, rhPx * 0.7, CX, CY, rhPx + 8);
        glow.addColorStop(0, '#000000');
        glow.addColorStop(0.82, '#000000');
        glow.addColorStop(1, hexA(cOut, 0.28));
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(CX, CY, rhPx + 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath(); ctx.arc(CX, CY, rhPx, 0, Math.PI * 2); ctx.fill();

        // ---- 진행 중인 샷 ----
        const shots = shotsRef.current;
        for (const sh of shots) {
            if (sh.p < 0.5) {
                // 낙하: 가장자리 → 분할 반경, 각도는 끌림으로 감긴다
                const t = sh.p / 0.5;
                const r = R_EDGE + (sh.rSplitPx - R_EDGE) * t;
                const ang = sh.ang0 + sh.twist * t * t; // 안쪽일수록 빨리 감김
                const x = CX + r * Math.cos(ang), y = CY + r * Math.sin(ang);
                pushTrail(sh.trailIn, x, y);
                drawTrail(ctx, sh.trailIn, cIn, 0.5);
                drawDot(ctx, x, y, 3.2, cIn, 0.9);
            } else {
                // 분할 후: 음(-)에너지 조각은 지평선으로, 탈출 조각은 밖으로
                const t = (sh.p - 0.5) / 0.5;
                const angSplit = sh.ang0 + sh.twist;
                // 포획 조각(역행) — 안쪽으로 감기며 사라짐
                const rc = sh.rSplitPx + (sh.rhPx * 0.9 - sh.rSplitPx) * t;
                const ac = angSplit - sh.twist * 0.6 * t;
                const xc = CX + rc * Math.cos(ac), yc = CY + rc * Math.sin(ac);
                drawDot(ctx, xc, yc, 3 * (1 - t) + 1, cCap, 0.85 * (1 - t) + 0.1);
                // 탈출 조각 — 밖으로, 이득만큼 더 밝고 크게
                const re = sh.rSplitPx + (R_EDGE + 22 - sh.rSplitPx) * t;
                const ae = angSplit + sh.twist * 0.35 * (1 - t);
                const xe = CX + re * Math.cos(ae), ye = CY + re * Math.sin(ae);
                pushTrail(sh.trailEsc, xe, ye);
                drawTrail(ctx, sh.trailEsc, cOut, 0.7);
                const boost = 1 + sh.gain * 4;
                drawDot(ctx, xe, ye, 3.2 * boost, cOut, 0.95);
            }
        }
    }, []);

    const step = useCallback(() => {
        dragPhaseRef.current += 0.05;
        const shots = shotsRef.current;
        let changed = false;
        for (const sh of shots) sh.p += 0.014;
        const next = shots.filter((sh) => sh.p < 1);
        if (next.length !== shots.length) { shotsRef.current = next; changed = true; }
        render();
        if (changed) setHud((h) => ({ ...h, shots: next.length }));
    }, [render]);

    // 재생 루프 — 항상 돈다(소용돌이 연출). 무거운 상태 갱신은 없음.
    useEffect(() => {
        const id = setInterval(step, TICK_MS);
        return () => clearInterval(id);
    }, [step]);

    // 마운트 — 캔버스 해상도 + 초기 상태
    useEffect(() => {
        const cv = canvasRef.current;
        cv.width = CANVAS; cv.height = CANVAS;
        resetTo(a0Ref.current);
        render();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onDepth = (v) => { depthRef.current = v; setDepthState(v); };
    const onRetro = (v) => { retroRef.current = v; setRetroState(v); };
    const onA0 = (v) => { a0Ref.current = v; setA0State(v); resetTo(v); };
    const onReset = () => { resetTo(a0Ref.current); };

    // 저수지 잔량 밴드
    const rotFrac = hud.rot / (maxHarvestRef.current || 1);
    const band = hud.a <= 0.02 ? 'spent' : rotFrac > 0.66 ? 'full' : rotFrac > 0.25 ? 'half' : 'low';
    const bandLabel = { full: '회전 에너지 충만', half: '스핀 감속 중', low: '거의 소진', spent: '회전 정지' }[band];

    return (
        <LabShell
            title="ERGOSPHERE"
            eyebrow="rotational energy extraction"
            subtitle={'// 회전하는 블랙홀의 에르고권에서, 입자를 쪼개 회전 에너지를 뽑아낸다'}
            path="ergosphere.exe"
        >
            <section className="k-win ergo-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">/kerr/</span>equatorial</span>
                    <span className="meta k-mono">입자 분할 → 음에너지 조각 포획 → 나머지 조각이 더 큰 에너지로 탈출</span>
                </div>

                <div className="ergo-toolbar">
                    <div className="ergo-ctrls">
                        <div className="ergo-ctrl">
                            <label className="ergo-ctrl-label k-mono" htmlFor="ergo-depth">분할 깊이 <b>{Math.round(depth * 100)}%</b></label>
                            <input id="ergo-depth" type="range" min="0" max="1" step="0.01"
                                value={depth} onChange={(e) => onDepth(Number(e.target.value))} />
                        </div>
                        <div className="ergo-ctrl">
                            <label className="ergo-ctrl-label k-mono" htmlFor="ergo-retro">역행 던지기 <b>{Math.round(retro * 100)}%</b></label>
                            <input id="ergo-retro" type="range" min="0" max="1" step="0.01"
                                value={retro} onChange={(e) => onRetro(Number(e.target.value))} />
                        </div>
                        <div className="ergo-ctrl">
                            <label className="ergo-ctrl-label k-mono" htmlFor="ergo-a0">초기 스핀 a₀ <b>{a0.toFixed(2)}</b></label>
                            <input id="ergo-a0" type="range" min="0.2" max="1" step="0.01"
                                value={a0} onChange={(e) => onA0(Number(e.target.value))} />
                        </div>
                    </div>
                    <div className="ergo-actions">
                        <button type="button" className="ergo-btn ergo-btn-hot" onClick={drop} disabled={hud.a <= 0.02}>
                            ⚡ 입자 투입
                        </button>
                        <button type="button" className="ergo-btn ergo-btn-ghost" onClick={onReset}>↻ 리셋</button>
                    </div>
                </div>

                <div className="ergo-stage">
                    <div className="ergo-view-col">
                        <div className="ergo-screen">
                            <canvas ref={canvasRef} className="ergo-canvas" />
                        </div>
                        <div className="ergo-legend k-mono">
                            <span><i className="ergo-key ergo-key-in" /> 투입 입자</span>
                            <span><i className="ergo-key ergo-key-cap" /> 음에너지 조각(포획)</span>
                            <span><i className="ergo-key ergo-key-out" /> 탈출 조각(에너지↑)</span>
                        </div>
                        <p className="ergo-view-foot k-mono">
                            점선이 <b>정적 한계</b>(에르고권 바깥 경계), 칠흑 원이 <b>사건의 지평선</b>. 그 사이 껍질 안에서는
                            시공간이 <b>회전 방향으로 끌린다</b> · <b>역행 던지기</b>를 키우고 <b>깊이</b>를 지평선 쪽으로 밀수록 더 많이 뽑힌다
                        </p>
                    </div>

                    <div className="ergo-right">
                        <div className={`ergo-amp ergo-${band}`}>
                            <span className="ergo-amp-lab k-mono">회전 에너지 저수지</span>
                            <span className="ergo-amp-num">{bandLabel}</span>
                            <span className="ergo-amp-sub k-mono">스핀 a = {hud.a.toFixed(3)} · 질량 M = {hud.M.toFixed(3)}</span>
                        </div>

                        <div className="ergo-battery-wrap">
                            <span className="ergo-battery-lab k-mono">추출 진행 (이론 상한 대비)</span>
                            <div className="ergo-battery">
                                <div className="ergo-battery-fill" style={{ width: `${Math.min(100, hud.pct)}%` }} />
                            </div>
                            <span className="ergo-battery-sub k-mono">
                                뽑아낸 에너지 {(hud.harvest * 100).toFixed(1)}% · 상한 {(maxHarvestRef.current * 100).toFixed(1)}%
                            </span>
                        </div>

                        <div className="ergo-stats">
                            <div className="ergo-stat">
                                <span className="ergo-stat-lab k-mono">마지막 탈출 에너지</span>
                                <span className="ergo-stat-num k-mono">{hud.eOut.toFixed(3)}</span>
                                <span className="ergo-stat-foot k-mono">투입 1.000 기준</span>
                            </div>
                            <div className="ergo-stat">
                                <span className="ergo-stat-lab k-mono">이번 이득</span>
                                <span className="ergo-stat-num k-mono" style={{ color: hud.lastGain > 1e-4 ? 'var(--ergo-out)' : 'var(--ink-mute)' }}>
                                    {hud.lastGain > 1e-4 ? '+' : ''}{(hud.lastGain * 100).toFixed(1)}%
                                </span>
                                <span className="ergo-stat-foot k-mono">불가역 질량 {hud.Mirr.toFixed(3)}</span>
                            </div>
                        </div>

                        <div className={`ergo-verdict ergo-${band}`}>
                            <p className="ergo-verdict-txt">
                                {hud.lastGain <= 1e-4 && hud.harvest <= 1e-4
                                    ? <><b>입자 투입</b>을 눌러 보라. 에르고권 안에서 입자가 쪼개지고, 한 조각이 지평선으로 빨려 들어가면 나머지가 더 큰 에너지로 튀어나온다.</>
                                    : band === 'spent'
                                        ? <>스핀이 <b>0에 수렴</b>했다 — 에르고권이 닫혀 더는 뽑을 게 없다. 슈바르츠실트(비회전) 블랙홀이 된 것.</>
                                        : band === 'low'
                                            ? <>저수지가 <b>거의 비었다</b>. 뽑을수록 스핀이 줄어 이득도 작아진다 — 추출엔 <b>이론 상한</b>이 있다.</>
                                            : <>회전 에너지를 뽑는 중이다. 블랙홀의 <b>질량과 스핀이 함께 줄고</b> 에르고권이 얇아지는 걸 보라.</>}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win ergo-foot-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="ergo-foot">
                    <p>
                        {'회전하지 않는 블랙홀은 사건의 지평선 하나뿐이지만, '}<b>{'회전하는 블랙홀'}</b>{'(커 블랙홀)에는 지평선 '}
                        {'바깥에 '}<b>{'에르고권'}</b>{'이라는 껍질이 하나 더 있다. 이 껍질 안에서는 블랙홀의 회전이 시공간 자체를 '}
                        {'끌고 돌기 때문에('}<b>{'관성계 끌림, frame dragging'}</b>{') 아무리 강한 로켓도 제자리에 멈춰 있을 수 없고, '}
                        {'무엇이든 블랙홀과 같은 방향으로 돌 수밖에 없다.'}
                    </p>
                    <p>
                        {'바로 이 성질이 문을 연다. 입자 하나를 에르고권 안으로 떨어뜨린 뒤 둘로 쪼개, 한 조각을 회전 '}
                        {'반대 방향('}<b>{'역행'}</b>{')으로 세게 던지면 그 조각은 "무한히 먼 곳에서 잰 에너지가 '}<b>{'음수'}</b>{'"가 되는 '}
                        {'궤도에 올라탈 수 있다. 이 음(-)에너지 조각이 지평선으로 빨려 들어가면 블랙홀의 질량과 각운동량이 '}
                        {'오히려 '}<b>{'줄어든다'}</b>{'. 에너지 보존에 따라, 밖으로 탈출한 나머지 조각은 처음 넣은 것보다 '}
                        <b>{'더 큰 에너지'}</b>{'를 안고 나온다 — 이것이 '}<b>{'펜로즈 과정(Penrose process)'}</b>{'이다. '}
                        {'뽑아낸 에너지는 다름 아닌 블랙홀의 '}<b>{'회전 에너지'}</b>{'다.'}
                    </p>
                    <p>
                        {'그러나 공짜 에너지는 아니다. 뽑을수록 블랙홀의 스핀 '}<b>{'a'}</b>{'가 줄고, 스핀이 줄면 에르고권이 '}
                        {'얇아지다 결국 닫힌다. 블랙홀에는 아무리 애써도 줄일 수 없는 '}<b>{'불가역 질량 M_irr'}</b>{'이 있어, '}
                        {'추출할 수 있는 회전 에너지는 '}<b>{'E_rot = M − M_irr'}</b>{'로 한정된다. 극한까지 회전하는 블랙홀에서도 '}
                        {'그 상한은 전체 질량-에너지의 약 '}<b>{'29%'}</b>{'다. 슬라이더로 '}<b>{'분할 깊이'}</b>{'(지평선에 가까울수록 끌림이 '}
                        {'강함)와 '}<b>{'역행 던지기'}</b>{'를 키워 이득을 늘려 보고, 계속 투입하며 오른쪽 '}<b>{'저수지'}</b>{'가 바닥나 '}
                        {'스핀이 0으로 수렴하는(=비회전 블랙홀이 되는) 과정을 지켜보라.'}
                    </p>
                    <p>
                        {'왜 흥미로운가. 블랙홀을 "모든 것을 삼키기만 하는 구멍"이 아니라, 조건만 맞으면 '}<b>{'에너지를 되돌려주는 '}
                        {'거대한 회전 배터리'}</b>{'로 볼 수 있다는 점이다. 같은 구조는 회전하는 블랙홀 주변의 자기장이 에너지를 '}
                        {'뽑아내 강력한 제트를 쏘아 올리는 천체물리 현상(블랜드퍼드-즈나옉 과정)과도 맞닿아 있다.'}
                    </p>
                    <p className="ergo-disclaimer">
                        {'* 적도면 2D·가역(이상) 과정 근사로 펜로즈 과정의 핵심(에르고권·관성계 끌림·회전 에너지 추출과 그 상한)만 '}
                        {'남긴 개념 데모입니다. 실제 커 측지선, 음에너지 궤도의 정확한 조건, 조석·복사 손실 등은 생략했으며 수치는 예시입니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

// ---- 작은 그리기 헬퍼 ----
function drawDot(ctx, x, y, r, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = r * 2.2;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}
function pushTrail(trail, x, y) {
    trail.push([x, y]);
    if (trail.length > 16) trail.shift();
}
function drawTrail(ctx, trail, color, maxAlpha) {
    if (trail.length < 2) return;
    for (let i = 1; i < trail.length; i++) {
        const a = (i / trail.length) * maxAlpha;
        ctx.strokeStyle = hexA(color, a);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1][0], trail[i - 1][1]);
        ctx.lineTo(trail[i][0], trail[i][1]);
        ctx.stroke();
    }
}
// hex(#rrggbb) → rgba 문자열
function hexA(hex, alpha) {
    const h = hex.replace('#', '');
    if (h.length < 6) return hex;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

// 고정 별밭(매 프레임 재생성 방지)
const STARS = (() => {
    const arr = [];
    let seed = 20260727;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 60; i++) {
        arr.push({ x: rnd() * CANVAS, y: rnd() * CANVAS, s: rnd() < 0.2 ? 2 : 1, a: 0.25 + rnd() * 0.5 });
    }
    return arr;
})();

export default Ergosphere;
