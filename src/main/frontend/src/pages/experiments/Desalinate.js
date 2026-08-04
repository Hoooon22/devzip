import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Desalinate.css';

// DESALINATE — 반투막을 사이에 두고 압력으로 바닷물에서 식수를 짜내는 역삼투(RO) 실험.
//   물은 소금이 진한 쪽으로 저절로 흐른다(삼투). 이 흐름을 되돌리려면 삼투압 π보다 큰
//   압력 ΔP를 반대편에서 밀어야 한다. π를 넘기면 물 분자만 막을 통과하고 소금 이온은
//   튕겨 나가 — 왼쪽엔 짠 농축수(brine), 오른쪽엔 맑은 식수(permeate)가 쌓인다.
//
//   담수화가 어려운 진짜 이유: 식수를 뽑을수록 남은 물의 소금 농도가 올라가고(질량 보존),
//   그러면 삼투압 π가 같이 치솟아 순 구동압 ΔP−π가 줄어든다. 회수율 R이 1에 가까워지면
//   π가 벽처럼 솟아 아무리 눌러도 물이 안 나온다 — 담수화 에너지의 근본 한계.
//
//   모형(개념 데모):
//     π[bar] = k · S            (van 't Hoff 근사, S=염도 g/L, k≈0.8)
//     농축수 염도 S_b = S₀ /(1−R)   (소금은 남고 물만 빠져 R=회수율만큼 농축)
//     순 구동압 ΔP_net = P − π(S_b)
//     플럭스 J[LMH] = A · max(0, ΔP_net)   (A=막 투과계수)
//     비에너지 SEC[kWh/m³] = P·0.02778 / 펌프효율   (열역학 최소 = π₀·0.02778)

const K_OSM = 0.8;        // 삼투압 계수 (bar per g/L) — 해수 35g/L → ~28bar
const A_PERM = 2.0;       // 막 투과계수 (LMH per bar)
const REJECTION = 0.994;  // 소금 제거율 (RO 전형값)
const PUMP_EFF = 0.85;    // 펌프 효율
const BAR_TO_KWH = 0.02778; // 1 bar·m³ ≈ 0.02778 kWh

const P_MAX = 80;         // 최대 인가 압력 (bar)
const R_CAP = 0.92;       // 회수율 상한 (스케일링 한계 근사)
const FEED_UNITS = 100;   // 초기 원수 부피 (탱크 눈금)
const TICK_MS = 40;

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const osmotic = (s) => K_OSM * s;

const SPEEDS = [0.5, 1, 2, 4];

// ---- 입자 시뮬레이션 (막을 오가는 물/소금) ----
const WATER_N = 54;
const SALT_MAX = 40;

function makeParticles() {
    const water = [];
    for (let i = 0; i < WATER_N; i++) {
        water.push({
            x: Math.random() * 0.42 + 0.05,           // 0~1 정규화 (왼쪽에서 시작)
            y: Math.random() * 0.86 + 0.07,
            vx: (Math.random() - 0.5) * 0.010,
            vy: (Math.random() - 0.5) * 0.010,
            side: 0,                                   // 0=왼(feed), 1=오른(permeate)
        });
    }
    const salt = [];
    for (let i = 0; i < SALT_MAX; i++) {
        salt.push({
            x: Math.random() * 0.40 + 0.06,
            y: Math.random() * 0.86 + 0.07,
            vx: (Math.random() - 0.5) * 0.008,
            vy: (Math.random() - 0.5) * 0.008,
        });
    }
    return { water, salt };
}

const Desalinate = () => {
    const [pressure, setPressure] = useState(0);      // 인가 압력 (bar)
    const [feedS, setFeedS] = useState(35);           // 원수 염도 (g/L)
    const [running, setRunning] = useState(true);
    const [speed, setSpeed] = useState(1);

    // 공정 상태 (HUD)
    const [permeate, setPermeate] = useState(0);      // 생산한 식수 부피 (탱크 눈금)

    // 컨트롤 미러
    const pRef = useRef(pressure);
    const feedRef = useRef(feedS);
    const runRef = useRef(running);
    const spdRef = useRef(speed);
    const permRef = useRef(0);

    useEffect(() => { pRef.current = pressure; }, [pressure]);
    useEffect(() => { feedRef.current = feedS; }, [feedS]);
    useEffect(() => { runRef.current = running; }, [running]);
    useEffect(() => { spdRef.current = speed; }, [speed]);

    // 입자 캔버스
    const canvasRef = useRef(null);
    const partsRef = useRef(makeParticles());
    // 막 통과 흐름 방향 지표: >0 정방향(RO, 좌→우), <0 삼투(우→좌). 루프가 읽는다.
    const netRef = useRef(0);

    // ---- 공정 틱 (회수율·에너지 적분) ----
    useEffect(() => {
        const id = setInterval(() => {
            if (!runRef.current) return;
            const P = pRef.current;
            const S0 = feedRef.current;
            const dt = (TICK_MS / 1000) * spdRef.current;

            const perm = permRef.current;
            const R = perm / FEED_UNITS;
            const Sb = S0 / Math.max(1e-3, 1 - R);      // 농축수 염도
            const pi = osmotic(Sb);
            const netP = P - pi;                         // 순 구동압
            netRef.current = netP;

            // 플럭스 → 부피 변화 (양수=식수 생산, 음수=삼투로 되돌아감)
            let dPerm;
            if (netP >= 0) {
                dPerm = A_PERM * netP * dt * 0.9;         // LMH·시간 → 눈금
            } else {
                dPerm = A_PERM * netP * dt * 0.9;         // 음수: 회수율 감소
            }
            let nextPerm = clamp(perm + dPerm, 0, R_CAP * FEED_UNITS);
            permRef.current = nextPerm;

            setPermeate(nextPerm);
        }, TICK_MS);
        return () => clearInterval(id);
    }, []);

    // ---- 입자 애니메이션 (requestAnimationFrame) ----
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let raf;
        const MEMB = 0.5;         // 막 위치 (정규화 x)
        const PORE = [0.22, 0.4, 0.58, 0.76]; // 막 구멍 y 위치
        const PORE_H = 0.07;

        const inPore = (y) => PORE.some((py) => Math.abs(y - py) < PORE_H);

        const draw = () => {
            const w = canvas.width;
            const h = canvas.height;
            const dark = canvas.closest('.lab-os')?.getAttribute('data-theme') === 'dark';
            const netP = netRef.current;
            const flow = clamp(netP / 30, -1, 1);   // 흐름 세기 -1~1
            const active = runRef.current;

            // 배경 (좌: 바닷물 / 우: 식수)
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = dark ? '#0c1a24' : '#dfeef2';
            ctx.fillRect(0, 0, w * MEMB, h);
            ctx.fillStyle = dark ? '#0a1418' : '#eef6f2';
            ctx.fillRect(w * MEMB, 0, w * (1 - MEMB), h);

            const parts = partsRef.current;
            // 소금 개수는 농축수 염도에 비례해 보이도록 조절
            const R = permRef.current / FEED_UNITS;
            const Sb = feedRef.current / Math.max(1e-3, 1 - R);
            const saltShown = clamp(Math.round((Sb / 60) * SALT_MAX), 4, SALT_MAX);

            const stepP = (p, isSalt) => {
                if (active) {
                    p.x += p.vx * spdRef.current;
                    p.y += p.vy * spdRef.current;
                    // 흐름에 의한 드리프트 (막 쪽으로 편향)
                    if (!isSalt) p.x += flow * 0.0016 * spdRef.current;
                }
                // 벽 반사
                if (p.y < 0.04) { p.y = 0.04; p.vy = Math.abs(p.vy); }
                if (p.y > 0.96) { p.y = 0.96; p.vy = -Math.abs(p.vy); }

                if (isSalt) {
                    // 소금: 막을 절대 못 넘음(제거). 왼쪽 벽/막에서 반사.
                    if (p.x < 0.04) { p.x = 0.04; p.vx = Math.abs(p.vx); }
                    if (p.x > MEMB - 0.02) { p.x = MEMB - 0.02; p.vx = -Math.abs(p.vx); }
                } else {
                    // 물: 구멍이면서 흐름 방향과 맞으면 통과
                    const nearMemb = Math.abs(p.x - MEMB) < 0.02;
                    if (nearMemb && inPore(p.y)) {
                        if (netP > 0 && p.x < MEMB) { p.x = MEMB + 0.02; p.side = 1; }
                        else if (netP < 0 && p.x > MEMB) { p.x = MEMB - 0.02; p.side = 0; }
                        else { p.vx = -p.vx; p.x += p.vx; }
                    } else if (nearMemb) {
                        p.vx = -p.vx; p.x = p.x < MEMB ? MEMB - 0.02 : MEMB + 0.02;
                    }
                    if (p.x < 0.03) { p.x = 0.03; p.vx = Math.abs(p.vx); }
                    if (p.x > 0.97) { p.x = 0.97; p.vx = -Math.abs(p.vx); }
                }
            };

            // 물 입자
            for (const p of parts.water) stepP(p, false);
            for (let i = 0; i < parts.salt.length; i++) stepP(parts.salt[i], true);

            // 그리기: 물
            for (const p of parts.water) {
                ctx.beginPath();
                ctx.arc(p.x * w, p.y * h, 3.1, 0, Math.PI * 2);
                ctx.fillStyle = p.side === 1
                    ? (dark ? '#57c8e6' : '#2a93b8')     // 식수 쪽
                    : (dark ? '#3f8fb0' : '#3f7f9c');    // 바닷물 쪽
                ctx.fill();
            }
            // 소금 이온 (농도만큼만 표시)
            for (let i = 0; i < saltShown; i++) {
                const p = parts.salt[i];
                ctx.beginPath();
                ctx.rect(p.x * w - 2.4, p.y * h - 2.4, 4.8, 4.8);
                ctx.fillStyle = dark ? '#e8863a' : '#d1691f';
                ctx.fill();
            }

            // 막 (구멍 뚫린 세로 벽)
            ctx.fillStyle = dark ? '#2a3540' : '#8b96a2';
            for (let y = 0; y < 1; y += 0.005) {
                if (inPore(y)) continue;
                ctx.fillRect(w * MEMB - 2.5, y * h, 5, h * 0.006 + 1);
            }
            // 흐름 방향 화살표
            if (Math.abs(flow) > 0.03 && active) {
                const dir = netP > 0 ? 1 : -1;
                ctx.strokeStyle = netP > 0
                    ? (dark ? '#57c8e6' : '#2a93b8')
                    : (dark ? '#e8863a' : '#d1691f');
                ctx.lineWidth = 2;
                for (const py of PORE) {
                    const cx = w * MEMB;
                    const yy = py * h;
                    ctx.beginPath();
                    ctx.moveTo(cx - 10 * dir, yy);
                    ctx.lineTo(cx + 10 * dir, yy);
                    ctx.lineTo(cx + 4 * dir, yy - 4);
                    ctx.moveTo(cx + 10 * dir, yy);
                    ctx.lineTo(cx + 4 * dir, yy + 4);
                    ctx.stroke();
                }
            }

            raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    }, []);

    const reset = useCallback(() => {
        permRef.current = 0;
        partsRef.current = makeParticles();
        setPermeate(0);
        setPressure(0);
    }, []);

    // ---- 파생값 ----
    const R = permeate / FEED_UNITS;
    const brineS = feedS / Math.max(1e-3, 1 - R);
    const piFeed = osmotic(feedS);
    const piBrine = osmotic(brineS);
    const netP = pressure - piBrine;
    const flux = Math.max(0, A_PERM * netP);          // LMH
    const permS = feedS * (1 - REJECTION);            // 식수 염도 (g/L)
    const secNow = (pressure * BAR_TO_KWH) / PUMP_EFF;
    const secMin = piFeed * BAR_TO_KWH;               // 열역학 최소 (원수 삼투압 일)

    // 상태 판정
    let mode; let mcls;
    if (netP > 0.5) { mode = '역삼투 (담수 생산)'; mcls = 'ro'; }
    else if (netP < -0.5) { mode = '삼투 (물이 역류)'; mcls = 'osmo'; }
    else { mode = '평형 (흐름 정지)'; mcls = 'eq'; }
    if (R >= R_CAP - 1e-3) { mode = '삼투압 벽 (회수 한계)'; mcls = 'wall'; }

    const goalHit = R >= 0.5;

    const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '∞');

    return (
        <LabShell
            title="DESALINATE"
            eyebrow="reverse osmosis · seawater → drinking water"
            subtitle={'// 삼투압보다 세게 밀어야 물만 막을 넘고 소금은 튕겨 나간다'}
            path="desalinate.exe"
        >
            <section className="k-win de-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/ro/</span>membrane</span>
                    <span className="meta k-mono">π=k·S · J=A·ΔP<sub>net</sub></span>
                </div>

                <div className="de-stage">
                    {/* ---- 왼쪽: 셀 시각화 ---- */}
                    <div className="de-cell-col">
                        <div className={`de-cell de-${mcls}`}>
                            <div className="de-cell-head k-mono">
                                <span className="de-tag de-tag-feed">바닷물 (FEED)</span>
                                <span className="de-tag de-tag-perm">식수 (PERMEATE)</span>
                            </div>
                            <canvas ref={canvasRef} width={640} height={300} className="de-canvas" />
                            <div className="de-cell-foot k-mono">
                                <span>◀ 피스톤 압력 {pressure.toFixed(0)} bar</span>
                                <span className={`de-badge de-badge-${mcls}`}>{mode}</span>
                            </div>
                        </div>

                        {/* 컨트롤 */}
                        <div className="de-controls">
                            <label className="de-ctl">
                                <span className="de-ctl-lab k-mono">
                                    인가 압력 P <b>{pressure.toFixed(0)} bar</b>
                                    <span className="de-ctl-hint">삼투압 π={fmt(piBrine, 0)} bar 를 넘겨야 담수 생산</span>
                                </span>
                                <input
                                    type="range" min={0} max={P_MAX} step={1}
                                    value={pressure}
                                    onChange={(e) => setPressure(parseFloat(e.target.value))}
                                    className="de-range de-range-p"
                                />
                                <div className="de-scale k-mono">
                                    <span>0</span>
                                    <span className="de-scale-pi">π≈{fmt(piBrine, 0)}</span>
                                    <span>{P_MAX}</span>
                                </div>
                            </label>

                            <label className="de-ctl">
                                <span className="de-ctl-lab k-mono">
                                    원수 염도 S₀ <b>{feedS} g/L</b>
                                    <span className="de-ctl-hint">기수 5 · 해수 35 · 농축 60</span>
                                </span>
                                <input
                                    type="range" min={5} max={60} step={1}
                                    value={feedS}
                                    onChange={(e) => setFeedS(parseFloat(e.target.value))}
                                    className="de-range de-range-s"
                                />
                            </label>
                        </div>

                        <div className="de-actions">
                            <button type="button" className="de-btn de-btn-warm" onClick={() => setRunning((r) => !r)}>
                                {running ? '⏸ 정지' : '▶ 재개'}
                            </button>
                            <button type="button" className="de-btn de-btn-ghost" onClick={reset}>
                                ↻ 초기화
                            </button>
                            <div className="de-speed">
                                {SPEEDS.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        className={`de-sbtn${speed === s ? ' de-sbtn-on' : ''}`}
                                        onClick={() => setSpeed(s)}
                                    >
                                        {s}×
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ---- 오른쪽: 계기판 ---- */}
                    <div className="de-right">
                        {/* 식수 탱크 */}
                        <div className="de-tank-box">
                            <div className="de-tank-head k-mono">
                                <span>식수 회수율 R</span>
                                <span className={`de-rval${goalHit ? ' de-rval-hit' : ''}`}>{(R * 100).toFixed(1)}%</span>
                            </div>
                            <div className="de-tank">
                                <div className="de-tank-fill" style={{ width: `${clamp(R / R_CAP * 100, 0, 100)}%` }} />
                                <div className="de-tank-goal" style={{ left: '50%' }} title="목표 50%">
                                    <span className="k-mono">목표 50%</span>
                                </div>
                            </div>
                            <div className="de-tank-foot k-mono">
                                <span>농축수 염도 {fmt(brineS, 0)} g/L</span>
                                <span>식수 염도 {fmt(permS, 2)} g/L</span>
                            </div>
                        </div>

                        {/* 게이지 */}
                        <div className="de-gauges">
                            <div className={`de-gauge de-g-${mcls}`}>
                                <span className="de-g-lab k-mono">순 구동압 ΔP−π</span>
                                <span className="de-g-val">{netP >= 0 ? '+' : ''}{fmt(netP, 1)}</span>
                                <span className="de-g-sub k-mono">bar</span>
                            </div>
                            <div className="de-gauge">
                                <span className="de-g-lab k-mono">막 플럭스 J</span>
                                <span className="de-g-val">{fmt(flux, 0)}</span>
                                <span className="de-g-sub k-mono">LMH</span>
                            </div>
                            <div className="de-gauge">
                                <span className="de-g-lab k-mono">소금 제거율</span>
                                <span className="de-g-val">{(REJECTION * 100).toFixed(1)}%</span>
                                <span className="de-g-sub k-mono">이온 차단</span>
                            </div>
                            <div className="de-gauge">
                                <span className="de-g-lab k-mono">비에너지 SEC</span>
                                <span className="de-g-val">{fmt(secNow, 2)}</span>
                                <span className="de-g-sub k-mono">kWh/m³ (최소 {fmt(secMin, 2)})</span>
                            </div>
                        </div>

                        {/* 판정 */}
                        <div className={`de-verdict de-v-${mcls}`}>
                            <p className="de-verdict-txt">
                                {mcls === 'wall'
                                    ? '삼투압 벽 — 식수를 뽑아낼수록 남은 물이 짜져 삼투압이 압력을 따라잡았다. 회수율을 무한정 올릴 수 없는 이유이자, 담수화 에너지의 근본 한계다. 초기화하고 더 낮은 회수율에서 멈춰 보라.'
                                    : mcls === 'ro'
                                        ? '역삼투 — 압력이 삼투압을 이겨 물 분자만 막을 넘고 소금 이온은 튕겨 나간다. 오른쪽에 맑은 식수가 쌓인다. 회수율이 오를수록 π가 올라가니, 압력을 조금씩 더 밀어야 흐름이 유지된다.'
                                        : mcls === 'osmo'
                                            ? '삼투 — 압력이 삼투압보다 낮다. 자연은 반대로, 맑은 물이 짠 쪽으로 빨려 들어간다. 담수화는 이 자연스러운 흐름을 힘으로 되돌리는 일이다. 압력을 π 위로 올려 보라.'
                                            : '평형 — 인가 압력이 삼투압과 거의 같아 막을 넘는 순 흐름이 없다. 여기서 조금만 더 밀면 역삼투가, 낮추면 삼투가 시작된다.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win de-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="de-foot">
                    <p>
                        {'2026년, "바닷물을 식수로 바꾸는 기술이 더 싸고 강해진다"는 이야기가 곳곳에서 오르내렸다. '}
                        {'특정 기업·설비·사건이 아니라 그 밑바탕의 보편적 물음 — '}
                        <b>{'소금물에서 어떻게 소금만 남기고 물만 뽑아내는가, 그리고 왜 그 일에는 반드시 에너지가 드는가'}</b>
                        {' — 를 이 실험에 담았다.'}
                    </p>
                    <p>
                        {'물은 소금이 진한 쪽으로 저절로 흐른다 — 반투막을 사이에 두면 맑은 물이 짠 물 쪽으로 빨려 든다. 이것이 '}
                        <b>{'삼투(osmosis)'}</b>{'이고, 그 흐름을 멈추는 데 필요한 압력이 '}<b>{'삼투압 π'}</b>{'다. 해수(약 35 g/L)의 삼투압은 약 28 bar. '}
                        {'담수화는 이 자연스러운 방향을 '}<b>{'거꾸로'}</b>{' 돌리는 일이다. 반대편에서 π보다 큰 압력 P를 밀면 물 분자만 막을 통과하고, '}
                        {'소금 이온은 막에 튕겨 나간다 — '}<b>{'역삼투(reverse osmosis)'}</b>{'. 왼쪽엔 짠 농축수, 오른쪽엔 맑은 식수가 남는다.'}
                    </p>
                    <p>
                        {'진짜 어려움은 여기서 시작된다. 식수를 뽑아낼수록 남은 물의 소금은 그대로라 농도가 올라가고(질량 보존, '}
                        <b>{'S_b = S₀/(1−R)'}</b>{'), 그러면 삼투압 π가 같이 치솟아 순 구동압 '}<b>{'ΔP−π'}</b>{'가 줄어든다. '}
                        {'회수율 R이 커질수록 밀어야 할 압력은 계속 늘고, 어느 지점에선 π가 벽처럼 솟아 아무리 눌러도 물이 안 나온다. '}
                        {'그래서 담수화에는 '}<b>{'열역학적 최소 에너지'}</b>{'가 존재하고(원수 삼투압에 해당하는 일), 회수율을 욕심낼수록 물 1 m³당 드는 에너지가 급격히 치솟는다.'}
                    </p>
                    <p>
                        {'직접 밀고 당겨 보라. 압력을 '}<b>{'π 아래'}</b>{'에 두면 물이 오히려 짠 쪽으로 역류하는 삼투가 보이고, '}
                        <b>{'π 위'}</b>{'로 올리면 식수가 쌓이기 시작한다(역삼투). 계속 뽑아 회수율을 올리면 농축수 염도와 π가 함께 오르며 '}
                        {'흐름이 점점 느려지다 '}<b>{'삼투압 벽'}</b>{'에 부딪힌다. 원수 염도 S₀를 기수(5)에서 해수(35), 농축(60)으로 바꿔 보면 '}
                        {'왜 짠 물일수록 더 센 압력과 더 많은 에너지가 필요한지 한눈에 드러난다.'}
                    </p>
                    <p className="de-disclaimer">
                        {'* van \'t Hoff 삼투압 근사(π=k·S)와 단순 배치 물질수지·선형 플럭스(J=A·ΔP_net)만 남긴 개념 데모입니다. '}
                        {'농도 분극·막 파울링/스케일링·온도 의존성·에너지 회수 장치(ERD)·다단 구성 등 실제 RO 공정은 크게 단순화했고, 파라미터도 교육용으로 조정했습니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Desalinate;
