import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Biodegrade.css';

// BIODEGRADE — 효소 분해 캐스케이드(생분해성 플라스틱) 실험.
// 핵심: 플라스틱은 모노머(단위 분자)가 길게 사슬로 이어진 고분자(폴리머)다. 이걸 "완전히"
//   분해한다는 건 사슬을 그냥 잘게 부수는 게 아니라, 마지막에 모노머 하나하나까지 풀어내
//   미세플라스틱을 남기지 않는 것이다. 자연/공학적 분해는 보통 두 효소의 협업으로 일어난다.
//   ① 엔도(endo) 효소: 긴 사슬의 "내부" 결합을 아무 데나 끊어 여러 토막으로 쪼갠다(→ 미세플라스틱).
//   ② 엑소(exo) 효소: 토막의 "끝"에서부터 한 알씩 갉아 모노머로 떼어낸다(→ 완전 분해).
//   엔도만 있으면 사슬은 미세플라스틱 조각으로 산산조각 날 뿐 모노머까지 못 간다. 엑소만 있으면
//   끝이 적어 느리다. 둘이 함께여야 — 엔도가 끝을 무수히 만들고 엑소가 그 끝을 모노머로 마무리 —
//   비로소 미세플라스틱 없이 6일 만에 다 풀린다. 온도가 문턱을 넘어야 효소(포자)가 깨어난다.

const CANVAS_W = 420;      // 바이오리액터 뷰 가로(px)
const CANVAS_H = 300;      // 세로(px)
const N_CHAINS = 6;        // 초기 폴리머 사슬 수
const CHAIN_MIN = 34;      // 초기 사슬 길이(모노머 수) 하한
const CHAIN_MAX = 46;      // 상한
const BEAD_DX = 7.0;       // 사슬 내 모노머 간 간격(px)
const LONG_THRESH = 10;    // 이 길이 이상은 "긴 사슬(원형 플라스틱)", 미만은 "미세플라스틱 조각"
const ACT_TEMP = 40;       // 효소 활성 문턱(℃) — 아래면 포자 휴면(아무 일도 안 남)
const T_MIN = 20, T_MAX = 60;
const ENDO_K = 0.85;       // 엔도 절단 이벤트 게인
const EXO_K = 0.85;        // 엑소 말단분해 이벤트 게인
const MAX_EV = 34;         // 틱당 이벤트 상한(안전판)
const DAY_PER_TICK = 0.028;// 활성 틱당 경과 "일" 증가분(6일 스케일 근사)
const TICK_MS = 60;        // 시뮬 틱(≈16fps로 충분 — 사건 기반)
const HIST_N = 150;        // 시계열 길이

// 초기 폴리머 배치 — 각 사슬을 한 행에 왼쪽부터 흘리고 완만한 사인 웨이브를 준다.
function makeChains() {
    const chains = [];
    for (let ci = 0; ci < N_CHAINS; ci++) {
        const len = CHAIN_MIN + Math.floor(Math.random() * (CHAIN_MAX - CHAIN_MIN + 1));
        const y0 = 34 + ci * ((CANVAS_H - 56) / (N_CHAINS - 1));
        const x0 = 24 + Math.random() * 10;
        const amp = 6 + Math.random() * 5;
        const ph = Math.random() * Math.PI * 2;
        const beads = [];
        for (let i = 0; i < len; i++) {
            beads.push({ x: x0 + i * BEAD_DX, y: y0 + Math.sin(ph + i * 0.5) * amp });
        }
        chains.push(beads);
    }
    return chains;
}

// 엔도: 내부 결합 하나를 무작위로 끊어 한 사슬을 둘로 쪼갠다. 긴 사슬일수록 결합이 많아 더 잘 끊긴다.
function endoCut(chains) {
    let B = 0;
    for (const c of chains) if (c.length >= 2) B += c.length - 1;
    if (B === 0) return;
    let pick = Math.floor(Math.random() * B);
    for (let ci = 0; ci < chains.length; ci++) {
        const c = chains[ci];
        const bonds = c.length >= 2 ? c.length - 1 : 0;
        if (pick < bonds) {
            const idx = pick + 1; // beads[0..idx-1] | beads[idx..]
            chains.splice(ci, 1, c.slice(0, idx), c.slice(idx));
            return;
        }
        pick -= bonds;
    }
}

// 엑소: 토막의 양 끝 중 하나에서 모노머 한 알을 떼어 자유 모노머로 방출한다.
function exoNibble(chains, monomers) {
    let E = 0;
    for (const c of chains) E += c.length >= 2 ? 2 : (c.length === 1 ? 1 : 0);
    if (E === 0) return;
    let pick = Math.floor(Math.random() * E);
    for (let ci = 0; ci < chains.length; ci++) {
        const c = chains[ci];
        const ends = c.length >= 2 ? 2 : (c.length === 1 ? 1 : 0);
        if (pick < ends) {
            let bead;
            if (c.length === 1) { bead = c[0]; chains.splice(ci, 1); }
            else if (pick === 0) { bead = c.shift(); }
            else { bead = c.pop(); }
            monomers.push({
                x: bead.x, y: bead.y,
                vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
            });
            return;
        }
        pick -= ends;
    }
}

// 부동소수 기댓값 → 정수 이벤트 수 (내림 + 확률적 나머지)
function evCount(f) {
    let n = Math.floor(f);
    if (Math.random() < f - n) n += 1;
    return Math.min(n, MAX_EV);
}

const Biodegrade = () => {
    const canvasRef = useRef(null);
    const barRef = useRef(null);

    // 파라미터 — 루프 재시작 없이 읽도록 ref.
    const tempRef = useRef(30);   // 온도(℃) — 시작은 휴면대(문턱 아래)
    const endoRef = useRef(5);    // 엔도 효소량
    const exoRef = useRef(5);     // 엑소 효소량
    const runningRef = useRef(true);

    const chainsRef = useRef([]);
    const monoRef = useRef([]);
    const m0Ref = useRef(1);      // 초기 총 모노머 수
    const dayRef = useRef(0);
    const startedRef = useRef(false);
    const histRef = useRef([]);   // {micro, free} 비율 시계열

    const [temp, setTemp] = useState(30);
    const [endo, setEndo] = useState(5);
    const [exo, setExo] = useState(5);
    const [running, setRunning] = useState(true);
    const [hud, setHud] = useState({ longN: 0, micro: 0, free: 0, freePct: 0, microPct: 0, longPct: 1, day: 0, chains: 0 });

    const step = useCallback(() => {
        const temp = tempRef.current;
        const endo = endoRef.current;
        const exo = exoRef.current;
        const chains = chainsRef.current;
        const monomers = monoRef.current;

        const active = temp >= ACT_TEMP;
        const rateScale = active ? (temp - ACT_TEMP) / (T_MAX - ACT_TEMP) : 0;

        if (active && (endo > 0 || exo > 0)) {
            startedRef.current = true;
            const nEndo = evCount(endo * rateScale * ENDO_K);
            for (let i = 0; i < nEndo; i++) endoCut(chains);
            const nExo = evCount(exo * rateScale * EXO_K);
            for (let i = 0; i < nExo; i++) exoNibble(chains, monomers);
            dayRef.current = Math.min(9.9, dayRef.current + DAY_PER_TICK);
        }

        // 자유 모노머는 아주 살짝 브라운 운동으로 떠돈다(경계 반사).
        for (const m of monomers) {
            m.x += m.vx; m.y += m.vy;
            if (m.x < 6 || m.x > CANVAS_W - 6) m.vx *= -1;
            if (m.y < 6 || m.y > CANVAS_H - 6) m.vy *= -1;
        }

        // 조성 집계
        let longMono = 0, microMono = 0, chainCnt = chains.length;
        for (const c of chains) {
            if (c.length >= LONG_THRESH) longMono += c.length;
            else microMono += c.length;
        }
        const free = monomers.length;
        const M0 = m0Ref.current;
        const longPct = longMono / M0, microPct = microMono / M0, freePct = free / M0;

        const hist = histRef.current;
        hist.push({ micro: microPct, free: freePct });
        if (hist.length > HIST_N) hist.shift();

        setHud({
            longN: longMono, micro: microMono, free,
            freePct, microPct, longPct,
            day: dayRef.current, chains: chainCnt,
        });
    }, []);

    const render = useCallback(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const W = cv.width, H = cv.height;
        const css = getComputedStyle(cv);
        const cLong = css.getPropertyValue('--bd-long').trim() || '#3fb6a8';
        const cMicro = css.getPropertyValue('--bd-micro').trim() || '#e8913c';
        const cMono = css.getPropertyValue('--bd-mono').trim() || '#5bbf6a';

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#0a1310';
        ctx.fillRect(0, 0, W, H);

        // 사슬 — 긴 사슬(원형)은 청록, 짧은 조각(미세플라스틱)은 앰버.
        const chains = chainsRef.current;
        for (const c of chains) {
            if (c.length === 0) continue;
            const isLong = c.length >= LONG_THRESH;
            const col = isLong ? cLong : cMicro;
            if (c.length >= 2) {
                ctx.strokeStyle = col;
                ctx.lineWidth = isLong ? 2 : 1.8;
                ctx.beginPath();
                for (let i = 0; i < c.length; i++) {
                    i ? ctx.lineTo(c[i].x, c[i].y) : ctx.moveTo(c[i].x, c[i].y);
                }
                ctx.stroke();
            }
            ctx.fillStyle = col;
            const r = isLong ? 2.3 : 2.0;
            for (const b of c) {
                ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
            }
        }

        // 자유 모노머 — 분해 완료. 안전한 초록 점.
        ctx.fillStyle = cMono;
        for (const m of monoRef.current) {
            ctx.beginPath(); ctx.arc(m.x, m.y, 1.7, 0, Math.PI * 2); ctx.fill();
        }
    }, []);

    // 조성 스택 바(긴 사슬 / 미세플라스틱 / 모노머)
    const renderBar = useCallback(() => {
        const cv = barRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const W = cv.width, H = cv.height;
        const css = getComputedStyle(cv);
        const cLong = css.getPropertyValue('--bd-long').trim() || '#3fb6a8';
        const cMicro = css.getPropertyValue('--bd-micro').trim() || '#e8913c';
        const cMono = css.getPropertyValue('--bd-mono').trim() || '#5bbf6a';

        ctx.clearRect(0, 0, W, H);
        const M0 = m0Ref.current;
        let longMono = 0, microMono = 0;
        for (const c of chainsRef.current) {
            if (c.length >= LONG_THRESH) longMono += c.length; else microMono += c.length;
        }
        const free = monoRef.current.length;
        const segs = [[longMono / M0, cLong], [microMono / M0, cMicro], [free / M0, cMono]];
        let x = 0;
        for (const [frac, col] of segs) {
            const w = frac * W;
            ctx.fillStyle = col;
            ctx.fillRect(x, 0, w, H);
            x += w;
        }
    }, []);

    // 재생 루프
    useEffect(() => {
        if (!running) return undefined;
        const id = setInterval(() => { step(); render(); renderBar(); }, TICK_MS);
        return () => clearInterval(id);
    }, [running, step, render, renderBar]);

    // 마운트 — 캔버스 해상도 + 초기 폴리머 배치
    useEffect(() => {
        const cv = canvasRef.current;
        cv.width = CANVAS_W; cv.height = CANVAS_H;
        const bar = barRef.current;
        bar.width = 250; bar.height = 16;
        const chains = makeChains();
        let total = 0;
        for (const c of chains) total += c.length;
        chainsRef.current = chains;
        monoRef.current = [];
        m0Ref.current = total;
        dayRef.current = 0;
        startedRef.current = false;
        histRef.current = [];
        setHud({ longN: total, micro: 0, free: 0, freePct: 0, microPct: 0, longPct: 1, day: 0, chains: chains.length });
        render(); renderBar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const reset = () => {
        const chains = makeChains();
        let total = 0;
        for (const c of chains) total += c.length;
        chainsRef.current = chains;
        monoRef.current = [];
        m0Ref.current = total;
        dayRef.current = 0;
        startedRef.current = false;
        histRef.current = [];
        setHud({ longN: total, micro: 0, free: 0, freePct: 0, microPct: 0, longPct: 1, day: 0, chains: chains.length });
        render(); renderBar();
        setRunning(true); runningRef.current = true;
    };

    const trigger = () => { tempRef.current = 50; setTemp(50); };

    const changeTemp = (v) => { tempRef.current = v; setTemp(v); };
    const changeEndo = (v) => { endoRef.current = v; setEndo(v); };
    const changeExo = (v) => { exoRef.current = v; setExo(v); };
    const togglePlay = () => { setRunning((r) => { runningRef.current = !r; return !r; }); };

    // 상태 밴드
    const active = temp >= ACT_TEMP;
    const band = hud.freePct >= 0.99 ? 'complete'
        : hud.freePct >= 0.10 ? 'degrading'
            : hud.microPct >= 0.30 ? 'shredding'
                : startedRef.current ? 'working'
                    : 'dormant';
    const bandLabel = {
        dormant: '휴면', working: '가동', shredding: '미세플라스틱화', degrading: '분해 진행', complete: '완전 분해',
    }[band];

    return (
        <LabShell
            title="BIODEGRADE"
            eyebrow="enzymatic depolymerization cascade"
            subtitle={'// 사슬을 자르기만 하면 미세플라스틱, 끝을 갉아 모노머까지 풀어야 완전 분해'}
            path="biodegrade.exe"
        >
            <section className="k-win bd-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/reactor/</span>polymer</span>
                    <span className="meta k-mono">엔도(내부 절단) + 엑소(말단 분해) 협업</span>
                </div>

                <div className="bd-toolbar">
                    <div className="bd-ctrls">
                        <div className="bd-ctrl">
                            <label className="bd-ctrl-label k-mono" htmlFor="bd-temp">
                                온도 <b>{temp}℃</b> {active ? <span className="bd-on">활성</span> : <span className="bd-off">휴면</span>}
                            </label>
                            <input id="bd-temp" type="range" min={T_MIN} max={T_MAX} step="1"
                                value={temp} onChange={(e) => changeTemp(Number(e.target.value))} />
                        </div>
                        <div className="bd-ctrl">
                            <label className="bd-ctrl-label k-mono" htmlFor="bd-endo">엔도 효소 <b>{endo}</b> <span className="bd-dim">내부 절단</span></label>
                            <input id="bd-endo" type="range" min="0" max="10" step="1"
                                value={endo} onChange={(e) => changeEndo(Number(e.target.value))} />
                        </div>
                        <div className="bd-ctrl">
                            <label className="bd-ctrl-label k-mono" htmlFor="bd-exo">엑소 효소 <b>{exo}</b> <span className="bd-dim">말단 분해</span></label>
                            <input id="bd-exo" type="range" min="0" max="10" step="1"
                                value={exo} onChange={(e) => changeExo(Number(e.target.value))} />
                        </div>
                    </div>
                    <div className="bd-actions">
                        <button type="button" className="bd-btn bd-btn-hot" onClick={trigger}>🔥 활성화 트리거 (50℃)</button>
                        <button type="button" className="bd-btn bd-btn-ghost" onClick={togglePlay}>
                            {running ? '⏸ 정지' : '▶ 재생'}
                        </button>
                        <button type="button" className="bd-btn bd-btn-ghost" onClick={reset}>↻ 리셋</button>
                    </div>
                </div>

                <div className="bd-stage">
                    <div className="bd-view-col">
                        <div className="bd-screen">
                            <canvas ref={canvasRef} className="bd-canvas" />
                        </div>
                        <div className="bd-legend k-mono">
                            <span><i className="bd-key bd-key-long" /> 긴 사슬 {hud.longN}</span>
                            <span><i className="bd-key bd-key-micro" /> 미세플라스틱 {hud.micro}</span>
                            <span><i className="bd-key bd-key-mono" /> 모노머 {hud.free}</span>
                        </div>
                        <p className="bd-view-foot k-mono">
                            온도를 <b>40℃ 이상</b>으로 올려(또는 <b>활성화 트리거</b>) 효소를 깨워라 · <b>엑소 효소를 0으로</b> 두면
                            사슬이 <b>미세플라스틱 조각</b>으로만 부서지고 모노머까지 못 가는 것을 보라 · 둘 다 켜면 6일 스케일로 완전 분해된다
                        </p>
                    </div>

                    <div className="bd-right">
                        <div className={`bd-amp bd-${band}`}>
                            <span className="bd-amp-lab k-mono">분해 상태</span>
                            <span className="bd-amp-num">{bandLabel}</span>
                            <span className="bd-amp-sub k-mono">모노머 전환 {(hud.freePct * 100).toFixed(0)}% · 경과 {hud.day.toFixed(1)}일</span>
                        </div>

                        <div className="bd-bar-wrap">
                            <span className="bd-bar-lab k-mono">조성 (모노머 기준)</span>
                            <canvas ref={barRef} className="bd-bar" />
                            <div className="bd-bar-key k-mono">
                                <span><i className="bd-key bd-key-long" /> 긴 사슬</span>
                                <span><i className="bd-key bd-key-micro" /> 미세조각</span>
                                <span><i className="bd-key bd-key-mono" /> 모노머</span>
                            </div>
                        </div>

                        <div className="bd-stats">
                            <div className="bd-stat">
                                <span className="bd-stat-lab k-mono">남은 사슬 조각</span>
                                <span className="bd-stat-num k-mono">{hud.chains}</span>
                            </div>
                            <div className="bd-stat">
                                <span className="bd-stat-lab k-mono">미세플라스틱</span>
                                <span className="bd-stat-num k-mono">{(hud.microPct * 100).toFixed(0)}%</span>
                            </div>
                        </div>

                        <div className={`bd-verdict bd-${band}`}>
                            <p className="bd-verdict-txt">
                                {band === 'dormant'
                                    ? <>온도가 문턱(<b>40℃</b>) 아래라 포자·효소가 <b>휴면</b> 상태다. 온도를 올려 분해를 <b>트리거</b>하라.</>
                                    : band === 'shredding'
                                        ? <>엔도가 사슬을 <b>미세플라스틱 조각</b>으로 산산조각 낼 뿐 모노머까지 못 간다 — <b>엑소 효소</b>를 올려라.</>
                                        : band === 'working'
                                            ? <>효소가 <b>가동</b>됐다. 엔도가 끝을 만들고 엑소가 그 끝을 모노머로 떼어내기 시작한다.</>
                                            : band === 'degrading'
                                                ? <>엔도가 만든 무수한 끝을 엑소가 <b>모노머로 마무리</b>하는 중 — 미세플라스틱이 줄며 완전 분해로 향한다.</>
                                                : <>사슬이 <b>모노머까지</b> 전부 풀렸다 — <b>미세플라스틱을 남기지 않은</b> 완전 분해다.</>}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win bd-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="bd-foot">
                    <p>
                        {'플라스틱은 '}<b>{'모노머'}</b>{'(단위 분자)가 수천 개씩 사슬로 이어진 '}<b>{'고분자(폴리머)'}</b>{'다. '}
                        {'그래서 "분해"에는 두 단계가 있다. 사슬을 잘게 '}<b>{'토막 내는 것'}</b>{'과, 그 토막을 '}<b>{'모노머 하나하나까지'}</b>
                        {' 완전히 풀어내는 것. 이 둘은 전혀 다르다 — 앞만 하고 멈추면 눈에 안 보이는 '}<b>{'미세플라스틱'}</b>{'이 남는다.'}
                    </p>
                    <p>
                        {'생분해는 보통 두 효소의 '}<b>{'협업'}</b>{'으로 일어난다. '}<b>{'엔도(endo) 효소'}</b>{'는 긴 사슬의 '}
                        <b>{'내부 결합'}</b>{'을 아무 데나 끊어 하나를 여러 토막으로 쪼갠다. '}<b>{'엑소(exo) 효소'}</b>{'는 토막의 '}
                        <b>{'끝'}</b>{'에서부터 모노머를 한 알씩 갉아 떼어낸다. 엔도만 있으면 사슬은 미세플라스틱 조각으로 '}
                        {'부서질 뿐 모노머로는 못 간다(이 실험에서 '}<b>{'엑소를 0으로'}</b>{' 두면 바로 이 상태가 된다). 엑소만 있으면 '}
                        {'토막의 끝이 처음엔 2개뿐이라 갉는 속도가 느리다. '}<b>{'둘이 함께'}</b>{'여야 — 엔도가 끝을 무수히 만들고 '}
                        {'엑소가 그 끝을 모노머로 마무리 — 미세플라스틱을 남기지 않고 빠르게 완전 분해된다.'}
                    </p>
                    <p>
                        {'또 하나의 손잡이는 '}<b>{'온도'}</b>{'다. 실제 "명령형 자기분해" 플라스틱은 분해 미생물의 '}<b>{'포자'}</b>
                        {'를 재료 속에 잠재워 두었다가, 특정 온도의 자극이 오면 포자가 깨어나 효소를 뿜게 설계된다. 이 실험에서도 '}
                        {'온도가 '}<b>{'활성 문턱(40℃)'}</b>{' 아래면 효소는 휴면 상태로 아무 일도 하지 않는다 — 그래서 평소엔 멀쩡하다가 '}
                        {'"명령"이 떨어질 때만 스스로 분해된다. 문턱을 넘으면 온도가 높을수록 반응이 빨라진다.'}
                    </p>
                    <p>
                        {'왜 중요한가. 세상의 플라스틱 문제는 "썩느냐"보다 '}<b>{'"무엇을 남기고 썩느냐"'}</b>{'다. 그냥 부서지기만 하면 '}
                        {'토양·바다에 미세플라스틱이 쌓여 먹이사슬을 타고 돌아온다. 완전 분해의 핵심은 사슬을 '}<b>{'모노머'}</b>
                        {'라는 자연이 다시 쓸 수 있는 기본 단위까지 되돌리는 것 — '}<b>{'자르기(endo)'}</b>{'와 '}<b>{'마무리(exo)'}</b>
                        {'가 함께여야 완성되는 캐스케이드다.'}
                    </p>
                    <p className="bd-disclaimer">
                        {'* 폴리머를 1차원 사슬로, 효소 작용을 확률적 절단·말단분해 이벤트로 단순화한 개념 데모입니다. 실제 효소 반응 속도론'}
                        {'(Michaelis–Menten), 결정성·확산 제약, 포자 발아 동역학, 분해 중간산물의 독성 등은 생략했습니다. 수치는 예시입니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Biodegrade;
