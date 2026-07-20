import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Kessler.css';

// KESSLER — 궤도 파편 연쇄충돌(케슬러 증후군) 실험.
// 핵심: 저궤도는 한 번에 무한정 못 담는 "공유 자원"이다. 물체 밀도가 임계를 넘으면
//   충돌 하나가 수백 개의 파편을 흩뿌리고, 그 파편이 또 다른 물체를 때려 새 파편을 낳는다.
//   이 되먹임이 스스로 굴러가기 시작하면(자기지속 연쇄), 위성을 더 쏘지 않아도 파편이 스스로 불어나
//   결국 그 고도를 아무도 못 쓰는 상태로 만든다 — 이것이 케슬러 증후군.
// 모델: 원궤도 근사. 각 물체는 반경 r, 각도 θ, 각속도 ω∝r^-1.5(케플러). 반경이 살짝 다른 물체들은
//   ω가 달라 위상이 어긋나다 주기적으로 근접(합) → 2D 거리 임계 이하이면 충돌.
//   충돌 시 관여 물체는 파괴되고 충돌점 근방에 파편 F개를 흩뿌린다. 파편도 충돌원이 된다.

const EARTH_R = 38;        // 지구 반경(px)
const R_MIN = 54;          // 궤도대 안쪽
const R_MAX = 176;         // 궤도대 바깥 — 넓은 띠라 낮은 밀도에서 근접쌍이 드물다
const COLL_D = 2.0;        // 충돌 판정 2D 거리(px) — 작은 단면적
const P_HIT = 0.35;        // 근접 시 실제 충돌 확률(작은 충돌 단면) — 낮은 밀도가 스스로 잦아드는 여유
const MAX_OBJ = 1400;      // 물체 상한(성능·메모리 안전판) — 닿으면 "궤도 폐쇄"
const DECAY_PROB = 0.026;  // 파편 1개가 매 틱 대기로 떨어져 사라질 확률(감쇠) — 임계 아래면 생성보다 빨라 수가 준다
const FRAG_SPREAD = 11;    // 파편이 흩어지는 반경 범위(px)
const INIT_SATS = 40;      // 초기 위성 수 — 임계 아래(한산)에서 시작
const TICK_MS = 34;        // 시뮬 틱(≈29fps)
const HIST_N = 150;        // 물체 수 시계열 길이
const CX = 195, CY = 195;  // 캔버스 중심
const CANVAS = 390;        // 캔버스 한 변(정사각) — 지름 2·R_MAX 이 넉넉히 들어간다

let UID = 1;

// 케플러 각속도 — 안쪽일수록 빠르게. 모두 순행(같은 방향)이라 이웃끼리는 함께 돌고,
// 충돌은 반경이 살짝 다른 물체들이 서서히 위상이 어긋나다 근접(합)할 때만 드물게 난다 → 밀도 의존.
function omegaOf(r) {
    return 0.9 * Math.pow(R_MIN / r, 1.5);
}

function makeSat() {
    const r = R_MIN + Math.random() * (R_MAX - R_MIN);
    return { id: UID++, r, th: Math.random() * Math.PI * 2, w: omegaOf(r), kind: 0 };
}
function makeFrag(r, th) {
    const rr = Math.max(R_MIN, Math.min(R_MAX, r + (Math.random() - 0.5) * FRAG_SPREAD * 2));
    // 각도를 넓게 흩뿌려 갓 태어난 파편끼리 그 자리에서 다시 충돌하지 않게 한다.
    return { id: UID++, r: rr, th: th + (Math.random() - 0.5) * 0.5, w: omegaOf(rr), kind: 1 };
}

const Kessler = () => {
    const canvasRef = useRef(null);

    // 파라미터 — 루프 재시작 없이 읽도록 ref.
    const fragRef = useRef(8);        // 충돌당 생성 파편 수 F (연쇄 강도의 손잡이)
    const avoidRef = useRef(false);   // 반충돌 기동(완화책) — 위성끼리만, 파편은 못 피함
    const runningRef = useRef(true);
    const objsRef = useRef([]);
    const histRef = useRef([]);
    const tRef = useRef(0);
    const collRef = useRef(0);        // 누적 충돌
    const flashRef = useRef([]);      // 충돌 섬광 {x,y,life}

    const [frag, setFrag] = useState(8);
    const [avoid, setAvoid] = useState(false);
    const [running, setRunning] = useState(true);
    const [hud, setHud] = useState({ sats: 0, debris: 0, coll: 0, t: 0, rate: 0, closed: false });

    // 좌표 변환
    const xy = (o) => [CX + o.r * Math.cos(o.th), CY + o.r * Math.sin(o.th)];

    const step = useCallback(() => {
        const objs = objsRef.current;
        const F = fragRef.current;
        const avoid = avoidRef.current;
        const t = tRef.current + 1;
        tRef.current = t;

        // 1) 전진
        for (const o of objs) {
            o.th += o.w;
            if (o.th > Math.PI * 2) o.th -= Math.PI * 2;
            else if (o.th < 0) o.th += Math.PI * 2;
        }

        // 2) 브로드페이즈: 균일 격자 버킷(셀=COLL_D*2)
        const cell = COLL_D * 2;
        const cols = Math.ceil(CANVAS / cell);
        const grid = new Map();
        const pos = new Array(objs.length);
        for (let i = 0; i < objs.length; i++) {
            const [x, y] = xy(objs[i]);
            pos[i] = [x, y];
            const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
            const key = gx * cols + gy;
            let b = grid.get(key);
            if (!b) { b = []; grid.set(key, b); }
            b.push(i);
        }

        // 3) 근접쌍 검사 — 자기 셀 + 이웃 8셀
        const dead = new Set();
        const spawnAt = [];
        const d2 = COLL_D * COLL_D;
        for (let i = 0; i < objs.length; i++) {
            if (dead.has(i)) continue;
            const [xi, yi] = pos[i];
            const gx = Math.floor(xi / cell), gy = Math.floor(yi / cell);
            for (let ox = -1; ox <= 1; ox++) {
                for (let oy = -1; oy <= 1; oy++) {
                    const b = grid.get((gx + ox) * cols + (gy + oy));
                    if (!b) continue;
                    for (const j of b) {
                        if (j <= i || dead.has(j)) continue;
                        const [xj, yj] = pos[j];
                        const dx = xi - xj, dy = yi - yj;
                        const dist2 = dx * dx + dy * dy;
                        if (dist2 >= d2) continue;
                        if (Math.random() >= P_HIT) continue; // 근접해도 작은 단면적만큼만 실제 충돌
                        const a = objs[i], c = objs[j];
                        // 반충돌 기동: 위성-위성 근접은 회피(살짝 반경 틀기). 파편이 끼면 못 피한다.
                        if (avoid && a.kind === 0 && c.kind === 0) {
                            a.r = Math.min(R_MAX, a.r + 0.6);
                            c.r = Math.max(R_MIN, c.r - 0.6);
                            a.w = omegaOf(a.r);
                            c.w = omegaOf(c.r);
                            continue;
                        }
                        // 충돌: 둘 다 파괴 + 파편 F개
                        dead.add(i); dead.add(j);
                        collRef.current += 1;
                        const mr = (a.r + c.r) / 2, mth = a.th;
                        spawnAt.push([mr, mth]);
                        flashRef.current.push({ x: (xi + xj) / 2, y: (yi + yj) / 2, life: 8 });
                        break;
                    }
                    if (dead.has(i)) break;
                }
                if (dead.has(i)) break;
            }
        }

        // 4) 파괴·생성 반영 — 충돌 사망자 제거 + 파편은 확률적 감쇠(대기 재진입)로 골라낸다.
        //    위성은 스테이션키핑으로 유지(감쇠 없음), 파편만 사라진다.
        let next = [];
        for (let i = 0; i < objs.length; i++) {
            if (dead.has(i)) continue;
            const o = objs[i];
            if (o.kind === 1 && Math.random() < DECAY_PROB) continue; // 파편 de-orbit
            next.push(o);
        }
        for (const [r, th] of spawnAt) {
            for (let k = 0; k < F; k++) {
                if (next.length >= MAX_OBJ) break;
                next.push(makeFrag(r, th));
            }
        }
        objsRef.current = next;

        // 5) 섬광 감쇠
        flashRef.current = flashRef.current.filter((f) => { f.life -= 1; return f.life > 0; });

        // 6) 통계
        let sats = 0, debris = 0;
        for (const o of next) (o.kind === 0 ? sats++ : debris++);
        const total = next.length;
        const hist = histRef.current;
        hist.push(total);
        if (hist.length > HIST_N) hist.shift();
        // 증가율 — 최근 12틱 기울기
        let rate = 0;
        if (hist.length >= 12) rate = (hist[hist.length - 1] - hist[hist.length - 12]) / 12;

        setHud({ sats, debris, coll: collRef.current, t, rate, closed: total >= MAX_OBJ });
    }, []);

    const render = useCallback(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const W = cv.width, H = cv.height;
        const css = getComputedStyle(cv);
        const cSat = css.getPropertyValue('--ks-sat').trim() || '#4fd0e0';
        const cDeb = css.getPropertyValue('--ks-deb').trim() || '#ff7a3c';
        const cEarth = css.getPropertyValue('--ks-earth').trim() || '#2d5a86';

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#080b12';
        ctx.fillRect(0, 0, W, H);

        // 궤도대 링(안/밖 경계)
        ctx.strokeStyle = 'rgba(120,150,180,0.16)';
        ctx.lineWidth = 1;
        for (const r of [R_MIN, R_MAX]) {
            ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2); ctx.stroke();
        }

        // 지구
        const g = ctx.createRadialGradient(CX - 12, CY - 12, 6, CX, CY, EARTH_R);
        g.addColorStop(0, cEarth);
        g.addColorStop(1, '#14304a');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(CX, CY, EARTH_R, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(120,180,220,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(CX, CY, EARTH_R, 0, Math.PI * 2); ctx.stroke();

        // 물체
        const objs = objsRef.current;
        for (const o of objs) {
            const x = CX + o.r * Math.cos(o.th);
            const y = CY + o.r * Math.sin(o.th);
            if (o.kind === 0) {
                ctx.fillStyle = cSat;
                ctx.fillRect(x - 1.6, y - 1.6, 3.2, 3.2);
            } else {
                ctx.fillStyle = cDeb;
                ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill();
            }
        }

        // 충돌 섬광
        for (const f of flashRef.current) {
            const a = f.life / 8;
            ctx.strokeStyle = `rgba(255,220,90,${a})`;
            ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(f.x, f.y, (8 - f.life) * 1.6 + 2, 0, Math.PI * 2); ctx.stroke();
        }
    }, []);

    // 스파크라인(물체 수 추이)
    const sparkRef = useRef(null);
    const renderSpark = useCallback(() => {
        const cv = sparkRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const W = cv.width, H = cv.height;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#0a0e15';
        ctx.fillRect(0, 0, W, H);
        const hist = histRef.current;
        if (hist.length < 2) return;
        let ymax = MAX_OBJ;
        const dx = W / (HIST_N - 1);
        const css = getComputedStyle(cv);
        const line = css.getPropertyValue('--ks-deb').trim() || '#ff7a3c';
        // MAX 라인
        ctx.strokeStyle = 'rgba(230,90,60,0.35)'; ctx.setLineDash([3, 3]);
        const ymy = H - (MAX_OBJ / ymax) * H;
        ctx.beginPath(); ctx.moveTo(0, ymy + 0.5); ctx.lineTo(W, ymy + 0.5); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = line; ctx.lineWidth = 1.6;
        ctx.beginPath();
        hist.forEach((v, i) => {
            const x = i * dx, y = H - (Math.min(v, ymax) / ymax) * H;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
    }, []);

    // 재생 루프
    useEffect(() => {
        if (!running) return undefined;
        const id = setInterval(() => { step(); render(); renderSpark(); }, TICK_MS);
        return () => clearInterval(id);
    }, [running, step, render, renderSpark]);

    // 마운트 — 캔버스 해상도 + 초기 위성 배치
    useEffect(() => {
        const cv = canvasRef.current;
        cv.width = CANVAS; cv.height = CANVAS;
        const sp = sparkRef.current;
        sp.width = 250; sp.height = 60;
        objsRef.current = [];
        for (let i = 0; i < INIT_SATS; i++) objsRef.current.push(makeSat());
        render(); renderSpark();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const launch = (n) => {
        const objs = objsRef.current;
        for (let i = 0; i < n && objs.length < MAX_OBJ; i++) objs.push(makeSat());
    };
    const kick = () => {
        // 충돌 1회 강제 주입 — 궤도대 중앙에 파편 한 뭉치를 흩뿌려 연쇄를 점화한다.
        const objs = objsRef.current;
        const r = (R_MIN + R_MAX) / 2, th = Math.random() * Math.PI * 2;
        const F = fragRef.current;
        collRef.current += 1;
        flashRef.current.push({ x: CX + r * Math.cos(th), y: CY + r * Math.sin(th), life: 8 });
        for (let k = 0; k < F * 3 && objs.length < MAX_OBJ; k++) objs.push(makeFrag(r, th));
    };
    const reset = () => {
        objsRef.current = [];
        for (let i = 0; i < INIT_SATS; i++) objsRef.current.push(makeSat());
        histRef.current = []; tRef.current = 0; collRef.current = 0; flashRef.current = [];
        setHud({ sats: INIT_SATS, debris: 0, coll: 0, t: 0, rate: 0, closed: false });
        render(); renderSpark();
        setRunning(true); runningRef.current = true;
    };
    const changeFrag = (v) => { fragRef.current = v; setFrag(v); };
    const toggleAvoid = () => { avoidRef.current = !avoidRef.current; setAvoid((a) => !a); };
    const togglePlay = () => { setRunning((r) => { runningRef.current = !r; return !r; }); };

    // 임계 상태 — 증가율 기준
    const band = hud.closed ? 'closed'
        : hud.rate > 4 ? 'runaway'
            : hud.rate > 0.4 ? 'critical' : 'stable';
    const bandLabel = { stable: '안정', critical: '임계 접근', runaway: '연쇄 폭주', closed: '궤도 폐쇄' }[band];

    return (
        <LabShell
            title="KESSLER"
            eyebrow="orbital debris cascade"
            subtitle={'// 위성을 더 쏘지 않아도, 파편이 스스로 파편을 낳기 시작하면 그 고도는 닫힌다'}
            path="kessler.exe"
        >
            <section className="k-win ks-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/orbit/</span>LEO</span>
                    <span className="meta k-mono">충돌 → 파편 F개 → 새 충돌원 (자기지속 연쇄)</span>
                </div>

                <div className="ks-toolbar">
                    <div className="ks-ctrls">
                        <div className="ks-ctrl">
                            <label className="ks-ctrl-label k-mono" htmlFor="ks-frag">충돌당 파편 <b>{frag}개</b></label>
                            <input id="ks-frag" type="range" min="2" max="16" step="1"
                                value={frag} onChange={(e) => changeFrag(Number(e.target.value))} />
                        </div>
                    </div>
                    <div className="ks-actions">
                        <button type="button" className="ks-btn" onClick={() => launch(60)}>🛰 위성 60기 발사</button>
                        <button type="button" className="ks-btn ks-btn-hot" onClick={kick}>💥 충돌 점화</button>
                        <button type="button" className={`ks-btn ks-btn-ghost ${avoid ? 'is-on' : ''}`} onClick={toggleAvoid}>
                            반충돌 기동 {avoid ? 'ON' : 'OFF'}
                        </button>
                        <button type="button" className="ks-btn ks-btn-ghost" onClick={togglePlay}>
                            {running ? '⏸ 정지' : '▶ 재생'}
                        </button>
                        <button type="button" className="ks-btn ks-btn-ghost" onClick={reset}>↻ 리셋</button>
                    </div>
                </div>

                <div className="ks-stage">
                    <div className="ks-view-col">
                        <div className="ks-screen">
                            <canvas ref={canvasRef} className="ks-canvas" />
                        </div>
                        <div className="ks-legend k-mono">
                            <span><i className="ks-key ks-key-sat" /> 위성 {hud.sats}</span>
                            <span><i className="ks-key ks-key-deb" /> 파편 {hud.debris}</span>
                        </div>
                        <p className="ks-view-foot k-mono">
                            <b>위성 60기 발사</b>를 반복해 밀도를 올린 뒤 <b>충돌 점화</b>를 눌러 보라 · 파편이 스스로
                            불어나 <b>궤도가 닫히는지</b> · <b>반충돌 기동</b>이 위성끼리는 막아도 파편은 못 피하는지 보라
                        </p>
                    </div>

                    <div className="ks-right">
                        <div className={`ks-amp ks-${band}`}>
                            <span className="ks-amp-lab k-mono">궤도 상태</span>
                            <span className="ks-amp-num">{bandLabel}</span>
                            <span className="ks-amp-sub k-mono">파편 증가율 {hud.rate > 0 ? '+' : ''}{hud.rate.toFixed(1)}/틱</span>
                        </div>

                        <div className="ks-spark-wrap">
                            <span className="ks-spark-lab k-mono">궤도 물체 수 추이</span>
                            <canvas ref={sparkRef} className="ks-spark" />
                        </div>

                        <div className="ks-stats">
                            <div className="ks-stat">
                                <span className="ks-stat-lab k-mono">누적 충돌</span>
                                <span className="ks-stat-num k-mono">{hud.coll}</span>
                            </div>
                            <div className="ks-stat">
                                <span className="ks-stat-lab k-mono">궤도 물체</span>
                                <span className="ks-stat-num k-mono">{hud.sats + hud.debris}</span>
                            </div>
                        </div>

                        <div className={`ks-verdict ks-${band}`}>
                            <p className="ks-verdict-txt">
                                {band === 'stable'
                                    ? <>궤도대가 <b>한산</b>하다. 위성을 더 발사해 밀도를 올린 뒤 <b>충돌 점화</b>로 연쇄를 깨워 보라.</>
                                    : band === 'critical'
                                        ? <>파편이 <b>스스로 늘기</b> 시작했다 — 임계 근처다. 여기서 밀도가 더 오르면 폭주로 넘어간다.</>
                                        : band === 'runaway'
                                            ? <>새 발사가 없어도 파편이 <b>기하급수로</b> 불어난다 — 자기지속 연쇄(케슬러)다.</>
                                            : <>물체가 상한에 닿아 이 고도는 <b>사실상 폐쇄</b>됐다. 리셋해 처음부터 다시 보라.</>}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win ks-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="ks-foot">
                    <p>
                        {'지구 저궤도는 무한히 넓어 보이지만, 쓸 만한 고도대는 좁고 모두가 같은 공간을 나눠 쓰는 '}
                        <b>{'공유 자원'}</b>{'이다. 위성이 늘수록 물체 밀도가 오르고, 밀도가 어느 선을 넘으면 충돌 하나가 '}
                        {'수백 개의 파편을 흩뿌린다. 그 파편들은 시속 수만 km로 궤도를 돌며 다른 위성·파편을 때리고, '}
                        {'맞은 물체는 또 파편이 되어 흩어진다. 이 되먹임이 스스로 굴러가기 시작하면 '}<b>{'위성을 더 쏘지 않아도'}</b>
                        {' 파편이 스스로 파편을 낳으며 불어난다 — 이것이 '}<b>{'케슬러 증후군(Kessler syndrome)'}</b>{'이다.'}
                    </p>
                    <p>
                        {'핵심은 '}<b>{'임계 밀도'}</b>{'다. 밀도가 낮을 때는 어쩌다 충돌이 나도 파편이 서서히 대기로 떨어지며 '}
                        {'수가 줄어든다(감쇠). 하지만 밀도가 임계를 넘으면 "충돌 1회가 낳는 새 충돌"의 기댓값이 1을 넘어, '}
                        {'한 번의 사건이 둘, 넷, 여덟으로 번지는 '}<b>{'연쇄 반응'}</b>{'이 된다. 원자로의 임계, 전염병의 기초감염재생산수 '}
                        {'R₀와 같은 구조다 — 하나가 하나 이상을 낳느냐가 갈림길이다.'}
                    </p>
                    <p>
                        {'이 실험에서 '}<b>{'충돌당 파편 수 F'}</b>{'가 그 손잡이다. F를 키우면 충돌 한 번이 더 많은 충돌원을 뿌려 '}
                        {'같은 밀도에서도 연쇄가 쉽게 점화된다. '}<b>{'위성 발사'}</b>{'로 밀도를 올리고 '}<b>{'충돌 점화'}</b>
                        {'로 첫 사건을 일으킨 뒤, 오른쪽 '}<b>{'물체 수 추이'}</b>{'가 완만히 잦아드는지(안정) 아니면 위로 꺾여 '}
                        {'상한선까지 치솟는지(폭주)를 보라. '}<b>{'반충돌 기동'}</b>{'은 완화책이다 — 위성끼리의 근접은 살짝 궤도를 틀어 '}
                        {'피하지만, 이미 흩뿌려진 '}<b>{'파편은 조종되지 않아 피할 수 없다'}</b>{'. 그래서 연쇄가 시작된 뒤에는 회피 기동도 소용이 적다.'}
                    </p>
                    <p>
                        {'왜 중요한가. 한번 임계를 넘긴 고도대는 수십~수백 년 동안 새 위성을 올리기 위험한 '}<b>{'폐쇄 구역'}</b>
                        {'이 될 수 있다. 그래서 실제 우주 운용에서는 임무를 마친 위성을 '}<b>{'스스로 궤도에서 내리고(사후 처리)'}</b>
                        {', 애초에 파편을 만들 만한 충돌을 '}<b>{'사전에 회피'}</b>{'하는 것이 핵심 과제가 된다. 케슬러 증후군은 '}
                        {'누구의 잘못이라기보다 '}<b>{'공유 자원에 각자 조금씩 더 얹을 때 전체가 무너지는 구조'}</b>{'가 만드는 현상이다.'}
                    </p>
                    <p className="ks-disclaimer">
                        {'* 원궤도 2D 근사로 케슬러 증후군의 핵심(임계 밀도·연쇄 파편 생성)만 남긴 단순 데모입니다. 궤도 경사·이심률, '}
                        {'대기 저항에 의한 파편 감쇠, 실제 충돌 파편 분포(NASA 표준 붕괴 모델) 등은 생략했습니다. 수치는 예시입니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Kessler;
