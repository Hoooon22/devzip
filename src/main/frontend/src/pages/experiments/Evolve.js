import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Evolve.css';

// EVOLVE — 유전 알고리즘(진화 알고리즘) 실험.
// 핵심: 무작위 잡음에서 시작한 개체 집단이 "변이 + 선택 + 유전"만 반복하며
// 목표 패턴으로 스스로 수렴한다. 각 개체는 256비트(16x16) 유전자를 갖고,
// 적합도는 목표와 일치하는 칸 수다. 매 세대 토너먼트로 부모를 뽑아(선택),
// 교차로 섞고(유전), 일부 비트를 뒤집는다(변이). 설계자가 답을 그리는 게 아니라
// 변이와 선택이라는 두 힘만으로 형태가 태어나는 과정을 눈으로 본다.

const GRID = 16;
const LEN = GRID * GRID;

// ---- 목표 패턴 생성 (수식으로 정의해 격자 크기와 무관하게 일관) ----
const makeTarget = (kind) => {
    const t = new Uint8Array(LEN);
    for (let i = 0; i < LEN; i++) {
        const r = Math.floor(i / GRID);
        const c = i % GRID;
        const x = ((c + 0.5) / GRID) * 2 - 1; // -1..1
        const y = ((r + 0.5) / GRID) * 2 - 1; // -1..1 (아래로 증가)
        let on = false;
        if (kind === 'heart') {
            const X = x * 1.1;
            const Y = -y * 1.15; // 위쪽이 볼록해지도록 뒤집기
            const v = X * X + Y * Y - 1;
            on = v * v * v - X * X * Y * Y * Y <= 0;
        } else if (kind === 'disc') {
            on = x * x + y * y <= 0.62;
        } else if (kind === 'diamond') {
            on = Math.abs(x) + Math.abs(y) <= 0.82;
        } else { // plus
            on = (Math.abs(x) <= 0.22 || Math.abs(y) <= 0.22) && Math.abs(x) <= 0.86 && Math.abs(y) <= 0.86;
        }
        t[i] = on ? 1 : 0;
    }
    return t;
};

const fitOf = (g, target) => {
    let m = 0;
    for (let i = 0; i < LEN; i++) if (g[i] === target[i]) m++;
    return m / LEN;
};

const randomGenome = () => {
    const g = new Uint8Array(LEN);
    for (let i = 0; i < LEN; i++) g[i] = Math.random() < 0.5 ? 1 : 0;
    return g;
};

// 유전자 풀 다양성: 각 비트가 0/1로 얼마나 갈려 있는지 평균 (0=완전 수렴 .. 0.5=최대)
const diversityOf = (pop) => {
    let sum = 0;
    for (let i = 0; i < LEN; i++) {
        let ones = 0;
        for (let k = 0; k < pop.length; k++) ones += pop[k][i];
        const p = ones / pop.length;
        sum += 2 * p * (1 - p);
    }
    return sum / LEN; // 0..0.5
};

const TARGETS = [
    { key: 'heart', label: '하트' },
    { key: 'disc', label: '원' },
    { key: 'diamond', label: '다이아' },
    { key: 'plus', label: '플러스' },
];

const Evolve = () => {
    // 컨트롤
    const [targetKind, setTargetKind] = useState('heart');
    const [popSize, setPopSize] = useState(120);
    const [mutPct, setMutPct] = useState(2.0);   // 비트당 변이 확률(%)
    const [tournK, setTournK] = useState(4);     // 토너먼트 크기(선택 압력)
    const [crossover, setCrossover] = useState(true);
    const [elitism, setElitism] = useState(true);
    const [speed, setSpeed] = useState(8);       // 세대/초
    const [playing, setPlaying] = useState(true);

    // 렌더 스냅샷
    const [view, setView] = useState({
        gen: 0, best: [], bestFit: 0, avgFit: 0, diversity: 0.5, history: [], fits: [],
    });

    // GA 상태 (rAF 루프가 만지는 값은 ref로)
    const popRef = useRef([]);
    const fitsRef = useRef([]);
    const targetRef = useRef(makeTarget('heart'));
    const genRef = useRef(0);
    const historyRef = useRef([]);
    const rafRef = useRef(0);
    const lastRef = useRef(0);
    const accRef = useRef(0);

    // 루프가 최신 설정을 읽도록 미러링 (initPop 이펙트보다 먼저 선언 → 순서 보장)
    const cfgRef = useRef({ targetKind, popSize, mutPct, tournK, crossover, elitism, speed, playing });
    useEffect(() => {
        cfgRef.current = { targetKind, popSize, mutPct, tournK, crossover, elitism, speed, playing };
    }, [targetKind, popSize, mutPct, tournK, crossover, elitism, speed, playing]);

    const snapshot = useCallback(() => {
        const pop = popRef.current;
        const fits = fitsRef.current;
        if (!pop.length) return;
        let bi = 0;
        let sum = 0;
        for (let i = 0; i < pop.length; i++) {
            sum += fits[i];
            if (fits[i] > fits[bi]) bi = i;
        }
        setView({
            gen: genRef.current,
            best: Array.from(pop[bi]),
            bestFit: fits[bi],
            avgFit: sum / pop.length,
            diversity: diversityOf(pop),
            history: historyRef.current.slice(-140),
            fits: [...fits].sort((a, b) => b - a),
        });
    }, []);

    const initPop = useCallback(() => {
        const cfg = cfgRef.current;
        const target = makeTarget(cfg.targetKind);
        targetRef.current = target;
        const pop = [];
        const fits = [];
        for (let i = 0; i < cfg.popSize; i++) {
            const g = randomGenome();
            pop.push(g);
            fits.push(fitOf(g, target));
        }
        popRef.current = pop;
        fitsRef.current = fits;
        genRef.current = 0;
        historyRef.current = [];
        snapshot();
    }, [snapshot]);

    // 한 세대 진화 (순수: 렌더는 호출자가 담당)
    const runGeneration = useCallback(() => {
        const cfg = cfgRef.current;
        const target = targetRef.current;
        const pop = popRef.current;
        const fits = fitsRef.current;
        const n = pop.length;
        if (!n) return;

        const idx = [...pop.keys()].sort((a, b) => fits[b] - fits[a]);
        const eliteN = cfg.elitism ? 1 : 0;
        const next = [];
        const nextFits = [];
        for (let e = 0; e < eliteN && e < n; e++) {
            next.push(pop[idx[e]].slice());
            nextFits.push(fits[idx[e]]);
        }

        const tournament = () => {
            let best = (Math.random() * n) | 0;
            for (let t = 1; t < cfg.tournK; t++) {
                const j = (Math.random() * n) | 0;
                if (fits[j] > fits[best]) best = j;
            }
            return pop[best];
        };

        const mp = cfg.mutPct / 100;
        while (next.length < n) {
            const p1 = tournament();
            let child;
            if (cfg.crossover) {
                const p2 = tournament();
                child = new Uint8Array(LEN);
                for (let i = 0; i < LEN; i++) child[i] = Math.random() < 0.5 ? p1[i] : p2[i]; // 균등 교차
            } else {
                child = p1.slice();
            }
            for (let i = 0; i < LEN; i++) if (Math.random() < mp) child[i] ^= 1; // 변이
            next.push(child);
            nextFits.push(fitOf(child, target));
        }

        popRef.current = next;
        fitsRef.current = nextFits;
        genRef.current += 1;

        let bi = 0;
        let sum = 0;
        for (let i = 0; i < n; i++) {
            sum += nextFits[i];
            if (nextFits[i] > nextFits[bi]) bi = i;
        }
        historyRef.current.push({ best: nextFits[bi], avg: sum / n });
        if (historyRef.current.length > 400) historyRef.current = historyRef.current.slice(-400);
    }, []);

    // 목표/개체수가 바뀌면 집단을 새로 뿌린다
    useEffect(() => { initPop(); }, [targetKind, popSize, initPop]);

    // rAF 루프: speed(세대/초)에 맞춰 세대를 돌리고, 세대가 진행될 때만 스냅샷
    useEffect(() => {
        const step = (now) => {
            const cfg = cfgRef.current;
            if (!lastRef.current) lastRef.current = now;
            let dt = (now - lastRef.current) / 1000;
            lastRef.current = now;
            if (dt > 0.25) dt = 0.25;

            if (cfg.playing) {
                accRef.current += dt * cfg.speed;
                let ran = 0;
                let guard = 0;
                while (accRef.current >= 1 && guard < 40) {
                    accRef.current -= 1;
                    runGeneration();
                    ran++;
                    guard++;
                }
                if (ran > 0) snapshot();
            } else {
                accRef.current = 0;
            }
            rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafRef.current);
    }, [runGeneration, snapshot]);

    const stepOnce = useCallback(() => { runGeneration(); snapshot(); }, [runGeneration, snapshot]);
    const reset = useCallback(() => { initPop(); }, [initPop]);

    const target = targetRef.current;
    const solved = view.bestFit >= 1;
    const bestPct = Math.round(view.bestFit * 100);
    const avgPct = Math.round(view.avgFit * 100);
    const divPct = Math.round(view.diversity * 200); // 0..0.5 → 0..100

    // 스파크라인 폴리라인 좌표 (best / avg)
    const H = view.history;
    const W = 240;
    const toLine = (sel) => {
        if (H.length < 2) return '';
        return H.map((h, i) => {
            const x = (i / (H.length - 1)) * W;
            const yv = 100 - sel(h) * 100;
            return `${x.toFixed(1)},${yv.toFixed(1)}`;
        }).join(' ');
    };

    return (
        <LabShell
            title="EVOLVE"
            eyebrow="genetic algorithm"
            subtitle={'// 변이와 선택만 반복해 잡음에서 목표 패턴을 길러내는 유전 알고리즘'}
            path="evolve.exe"
        >
            <section className="k-win ev-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/proc/</span>evolution</span>
                    <span className="meta k-mono">gen {view.gen}</span>
                </div>

                <div className="ev-toolbar">
                    <div className="ev-ctrl ev-ctrl-wide">
                        <span className="ev-ctrl-label k-mono">목표 패턴</span>
                        <div className="ev-seg-row">
                            {TARGETS.map((t) => (
                                <button
                                    key={t.key}
                                    type="button"
                                    className={`ev-seg ${targetKind === t.key ? 'is-active' : ''}`}
                                    onClick={() => setTargetKind(t.key)}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="ev-ctrl">
                        <label className="ev-ctrl-label k-mono" htmlFor="ev-pop">개체 수 <b>{popSize}</b></label>
                        <input id="ev-pop" type="range" min="20" max="200" step="10"
                            value={popSize} onChange={(e) => setPopSize(Number(e.target.value))} />
                    </div>
                    <div className="ev-ctrl">
                        <label className="ev-ctrl-label k-mono" htmlFor="ev-mut">변이율 <b>{mutPct.toFixed(1)}</b>%</label>
                        <input id="ev-mut" type="range" min="0" max="12" step="0.5"
                            value={mutPct} onChange={(e) => setMutPct(Number(e.target.value))} />
                    </div>
                    <div className="ev-ctrl">
                        <label className="ev-ctrl-label k-mono" htmlFor="ev-tk">선택 압력 <b>{tournK}</b></label>
                        <input id="ev-tk" type="range" min="1" max="8" step="1"
                            value={tournK} onChange={(e) => setTournK(Number(e.target.value))} />
                    </div>
                    <div className="ev-ctrl">
                        <label className="ev-ctrl-label k-mono" htmlFor="ev-spd">속도 <b>{speed}</b>세대/s</label>
                        <input id="ev-spd" type="range" min="1" max="20" step="1"
                            value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
                    </div>

                    <div className="ev-actions">
                        <button type="button" className={`ev-seg ${crossover ? 'is-active' : ''}`}
                            onClick={() => setCrossover((v) => !v)}>교차 {crossover ? 'on' : 'off'}</button>
                        <button type="button" className={`ev-seg ${elitism ? 'is-active' : ''}`}
                            onClick={() => setElitism((v) => !v)}>엘리트 {elitism ? 'on' : 'off'}</button>
                        <button type="button" className={`ev-seg ${playing ? 'is-active' : ''}`}
                            onClick={() => setPlaying((p) => !p)}>{playing ? '❚❚ 멈춤' : '▶ 재생'}</button>
                        <button type="button" className="ev-btn ev-btn-ghost" onClick={stepOnce}>+1 세대</button>
                        <button type="button" className="ev-btn ev-btn-ghost" onClick={reset}>리셋</button>
                    </div>
                </div>

                <div className="ev-stage">
                    <div className="ev-grid-col">
                        <div className="ev-grid-head k-mono">
                            <span>최우수 개체</span>
                            {solved
                                ? <span className="ev-badge is-solved">SOLVED</span>
                                : <span className="ev-badge">{bestPct}% 일치</span>}
                        </div>
                        <div className="ev-grid ev-grid-main" role="img"
                            aria-label={`최우수 개체, 목표와 ${bestPct}% 일치`}>
                            {view.best.map((bit, i) => {
                                const match = bit === target[i];
                                const cls = !match ? 'is-miss' : bit === 1 ? 'is-on' : 'is-off';
                                return <span key={i} className={`ev-cell ${cls}`} />;
                            })}
                        </div>
                        <div className="ev-legend k-mono">
                            <span><i className="ev-key is-on" /> 일치·채움</span>
                            <span><i className="ev-key is-miss" /> 불일치</span>
                        </div>
                    </div>

                    <div className="ev-side">
                        <div className="ev-stats">
                            <div className="ev-stat">
                                <span className="ev-stat-num k-mono">{view.gen}</span>
                                <span className="ev-stat-lab">세대</span>
                            </div>
                            <div className="ev-stat">
                                <span className="ev-stat-num k-mono ev-accent">{bestPct}%</span>
                                <span className="ev-stat-lab">최고 적합도</span>
                            </div>
                            <div className="ev-stat">
                                <span className="ev-stat-num k-mono">{avgPct}%</span>
                                <span className="ev-stat-lab">평균 적합도</span>
                            </div>
                            <div className="ev-stat">
                                <span className="ev-stat-num k-mono">{divPct}%</span>
                                <span className="ev-stat-lab">유전자 다양성</span>
                            </div>
                        </div>

                        <div className="ev-chart-head k-mono">
                            <span>적합도 곡선</span>
                            <span className="ev-chart-leg">
                                <i className="ev-line ev-line-best" /> 최고
                                <i className="ev-line ev-line-avg" /> 평균
                            </span>
                        </div>
                        <svg className="ev-chart" viewBox={`0 0 ${W} 100`} preserveAspectRatio="none" aria-hidden="true">
                            <line x1="0" y1="50" x2={W} y2="50" className="ev-chart-mid" />
                            {H.length >= 2 && <polyline className="ev-poly ev-poly-avg" points={toLine((h) => h.avg)} />}
                            {H.length >= 2 && <polyline className="ev-poly ev-poly-best" points={toLine((h) => h.best)} />}
                        </svg>

                        <div className="ev-pop-head k-mono">
                            <span>집단 적합도 분포</span>
                            <span>{view.fits.length}개체</span>
                        </div>
                        <div className="ev-pop-bars" aria-hidden="true">
                            {view.fits.map((f, i) => (
                                <span key={i} className="ev-pop-bar" style={{ height: `${f * 100}%` }} />
                            ))}
                        </div>
                    </div>
                </div>

                <p className="ev-hint">
                    <b>변이율</b>을 0으로 두면 새로움이 사라져 <b>다양성</b>이 말라붙고 어중간한 답에 갇힙니다(조기 수렴).
                    반대로 너무 높이면 애써 찾은 좋은 유전자마저 매번 망가집니다 —
                    <b> 선택 압력</b>과의 균형점을 슬라이더로 찾아보세요.
                </p>

                <div className="k-resize"></div>
            </section>

            <section className="k-win ev-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="ev-foot">
                    <p>
                        {'인터넷 밈이 퍼지는 과정을 두고 "복제되고, 조금씩 변형되며, 살아남는 것만 남는다"고들 말한다. '}
                        {'이 문장에서 대상(밈)을 지우면 훨씬 오래된 보편 원리가 드러난다 — '}
                        <b>변이(variation) · 선택(selection) · 유전(inheritance)</b>{'. 이 세 힘만 갖추면 '}
                        {'설계자가 답을 미리 그려주지 않아도 집단은 스스로 목표를 향해 조직화된다.'}
                    </p>
                    <p>
                        {'유전 알고리즘은 그 원리를 코드로 옮긴 것이다. 각 개체는 256비트짜리 유전자를 갖고, '}
                        <b>적합도</b>{'는 목표 패턴과 일치하는 칸 수다. 매 세대 '}<b>토너먼트 선택</b>{'으로 '}
                        {'적합한 개체를 부모로 뽑아, '}<b>교차</b>{'로 유전자를 섞고, 낮은 확률로 비트를 뒤집어 '}
                        <b>변이</b>{'를 넣는다. 처음의 순수한 잡음이 몇십 세대 만에 하트·원 같은 형태로 굳어간다.'}
                    </p>
                    <p>
                        {'재미있는 긴장은 '}<b>탐색과 활용의 거래</b>{'에 있다. 변이는 새 가능성을 여는 탐색이고, '}
                        {'선택은 지금 좋은 것을 밀어주는 활용이다. 한쪽으로 치우치면 — 다양성이 마르거나(조기 수렴), '}
                        {'좋은 답이 계속 흩어지거나 — 진화가 멎는다. 자연이든 문화든 알고리즘이든, '}
                        {'끝없는 창발은 이 둘 사이의 아슬아슬한 균형 위에서만 일어난다.'}
                    </p>
                    <p className="ev-disclaimer">
                        {'* 유전 알고리즘의 뼈대(선택·교차·변이·엘리트·다양성)를 실시간으로 보여주는 결정적 데모입니다. '}
                        {'적합도 함수가 명시적인 최적화 문제로 단순화했으며, 실제 진화의 공진화·유전자형-표현형 사상 등은 생략했습니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Evolve;
