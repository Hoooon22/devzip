import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Bullwhip.css';

// BULLWHIP — 공급망 채찍 효과 실험.
// 핵심: 소비자의 작은 수요 변동이 공급망 상류(소매→도매→물류→공장)로 갈수록 눈덩이처럼 커진다.
// 각 단계는 바로 아래 단계가 "주문"한 양만 보고(진짜 소비자 수요는 못 본다) 자기 재고를 메우려 한다.
//   - 리드 타임(배송 지연) 때문에 주문한 물량이 늦게 도착 → 부족하다고 더 주문 → 나중에 한꺼번에 도착 → 과잉 → 주문 뚝
//   - 이미 운송 중인 물량(공급 파이프라인)을 감안하지 않을수록 이 과잉·과소 진동이 커진다
// 그래서 소비자 수요는 살짝 출렁였을 뿐인데, 공장의 주문은 미친 듯이 요동친다 — 이것이 채찍 효과.

const STAGES = ['소매', '도매', '물류', '공장']; // index 0=소비자에 가장 가까움, 3=가장 상류
const NS = STAGES.length;

const BASE = 8;         // 정상 소비자 수요(개/기간)
const SAFETY = 2.0;     // 목표 재고 = SAFETY × 수요예측
const LAMBDA = 0.7;     // 수요 예측 평활 계수(지수평활)
const SPIKE_AMP = 6;    // 유행 급증 시 추가 수요(지속 스텝)
const SPIKE_DUR = 16;   // 유행 지속 기간 — 오래 유지될수록 상류의 과잉·과소가 크게 번진다
const N = 96;           // 스트립 차트 기간 수
const ORDER_MAX = 120;  // 주문 상한(수치 안정) — θ=0 과잉 주문이 여기에 닿지 않을 만큼 여유
const PERIOD_MS = 430;  // 한 기간(틱) 길이

// 초기 정상상태 스냅샷 팩토리
function makeState(L) {
    const inv = new Array(NS).fill(SAFETY * BASE);
    const backlog = new Array(NS).fill(0);
    const expD = new Array(NS).fill(BASE);
    // arriving[i]: 단계 i로 오는 운송 중 물량 큐(길이 L). 매 기간 앞에서 하나 도착, 뒤로 하나 적재.
    const arriving = [];
    for (let i = 0; i < NS; i++) arriving.push(new Array(L).fill(BASE));
    return { inv, backlog, expD, arriving };
}

const Bullwhip = () => {
    const canvasRef = useRef(null);

    // 파라미터(슬라이더) — 루프를 재시작시키지 않도록 ref로 읽는다.
    const leadRef = useRef(2);      // 리드 타임 L
    const alphaRef = useRef(0.35);  // 재고 반응 계수 α
    const thetaRef = useRef(0.0);   // 공급 파이프라인 인지 θ (0=무시 → 채찍 폭발, 1=완전 반영 → 진정)
    const noiseRef = useRef(false); // 수요 잡음
    const spikeRef = useRef(0);     // 남은 유행 기간

    const stRef = useRef(makeState(2));
    const histRef = useRef([]);     // { c, o:[4] } 링버퍼 — c=소비자 수요, o=각 단계 주문
    const tRef = useRef(0);
    const costRef = useRef(0);      // 누적 비용(재고 보유 + 결품 페널티)
    const runningRef = useRef(true);

    const [lead, setLead] = useState(2);
    const [alpha, setAlpha] = useState(0.35);
    const [theta, setTheta] = useState(0.0);
    const [noise, setNoise] = useState(false);
    const [running, setRunning] = useState(true);
    const [hud, setHud] = useState({
        t: 0, consumer: BASE, orders: [BASE, BASE, BASE, BASE],
        inv: [SAFETY * BASE, SAFETY * BASE, SAFETY * BASE, SAFETY * BASE],
        backlog: [0, 0, 0, 0], amp: 1, cost: 0, spiking: false,
    });

    // 한 기간 진행
    const step = useCallback(() => {
        const L = leadRef.current;
        const alpha = alphaRef.current;
        const theta = thetaRef.current;
        const st = stRef.current;
        const { inv, backlog, expD, arriving } = st;

        const t = tRef.current + 1;
        tRef.current = t;

        // 1) 운송 중 물량 도착 — 각 단계 큐 앞에서 하나씩
        const arrived = new Array(NS);
        for (let i = 0; i < NS; i++) {
            arrived[i] = arriving[i].length ? arriving[i].shift() : 0;
            inv[i] += arrived[i];
        }

        // 2) 소비자 수요
        let consumer = BASE;
        if (spikeRef.current > 0) { consumer += SPIKE_AMP; spikeRef.current -= 1; }
        if (noiseRef.current) consumer += (Math.random() - 0.5) * 4;
        consumer = Math.max(0, consumer);

        // 3) 하류(소매) → 상류(공장) 순서로 주문·출하 전파
        const orders = new Array(NS);
        let incoming = consumer;         // 각 단계가 이번 기간에 받은 주문
        let periodCost = 0;
        for (let i = 0; i < NS; i++) {
            // 3-1) 수요 충족(현재 주문 + 밀린 백로그)
            const demandFaced = incoming + backlog[i];
            const ship = Math.min(inv[i], demandFaced);
            inv[i] -= ship;
            backlog[i] = demandFaced - ship;

            // 출하한 물량은 하류로 흐른다(리드 타임 뒤 도착). i=0은 소비자에게로 빠져나감.
            if (i > 0) arriving[i - 1].push(ship);

            // 3-2) 수요 예측(지수평활)
            expD[i] = LAMBDA * expD[i] + (1 - LAMBDA) * incoming;

            // 3-3) 주문 결정 — 목표 재고 갭 + 공급 파이프라인 갭 보정
            const invNet = inv[i] - backlog[i];
            const targetInv = SAFETY * expD[i];
            const sumPipe = arriving[i].reduce((a, b) => a + b, 0);
            const targetPipe = L * expD[i];
            let order = expD[i] + alpha * (targetInv - invNet) + alpha * theta * (targetPipe - sumPipe);
            order = Math.max(0, Math.min(ORDER_MAX, order));
            orders[i] = order;

            // 비용: 재고 보유 1 · 결품(백로그) 2
            periodCost += inv[i] * 1 + backlog[i] * 2;

            incoming = order; // 이 주문이 곧 상류 단계가 이번 기간에 받는 수요
        }
        // 4) 공장 주문 → 생산(원자재 무한). 리드 타임 뒤 공장 재고로 도착.
        arriving[NS - 1].push(orders[NS - 1]);

        costRef.current += periodCost;

        // 5) 히스토리 적재
        const hist = histRef.current;
        hist.push({ c: consumer, o: orders.slice() });
        if (hist.length > N) hist.shift();

        // 6) 증폭 배율 — 최근 창의 (공장 주문 표준편차 / 소비자 수요 표준편차)
        const std = (arr) => {
            if (arr.length < 2) return 0;
            const m = arr.reduce((a, b) => a + b, 0) / arr.length;
            return Math.sqrt(arr.reduce((a, b) => a + (b - m) * (b - m), 0) / arr.length);
        };
        const cStd = std(hist.map((h) => h.c));
        const fStd = std(hist.map((h) => h.o[NS - 1]));
        const amp = cStd > 0.15 ? fStd / cStd : (fStd > 0.15 ? 99 : 1);

        setHud({
            t, consumer, orders: orders.map((o) => o),
            inv: inv.map((v) => Math.max(0, v)),
            backlog: backlog.slice(), amp, cost: costRef.current,
            spiking: spikeRef.current > 0,
        });
    }, []);

    const render = useCallback(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const W = cv.width, H = cv.height;
        const css = getComputedStyle(cv);
        const colors = [
            css.getPropertyValue('--bw-s0').trim() || '#3f86c9',
            css.getPropertyValue('--bw-s1').trim() || '#2f9e6e',
            css.getPropertyValue('--bw-s2').trim() || '#d99413',
            css.getPropertyValue('--bw-s3').trim() || '#d0432f',
        ];
        const gridC = 'rgba(150,170,190,0.14)';

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#0c0f16';
        ctx.fillRect(0, 0, W, H);

        const hist = histRef.current;
        // 동적 y 스케일 — 창 최대 주문에 여유
        let ymax = BASE + SPIKE_AMP;
        for (const h of hist) { for (const o of h.o) if (o > ymax) ymax = o; }
        ymax = Math.ceil((ymax * 1.12) / 5) * 5;
        const yOf = (v) => H - (v / ymax) * H;

        // 가로 눈금
        ctx.strokeStyle = gridC; ctx.lineWidth = 1;
        ctx.font = '10px monospace'; ctx.fillStyle = 'rgba(160,180,200,0.5)';
        const stepG = ymax <= 30 ? 10 : ymax <= 60 ? 20 : 30;
        for (let v = 0; v <= ymax; v += stepG) {
            const y = yOf(v);
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
            ctx.fillText(`${v}`, 4, y - 3);
        }
        // 정상 수요선
        const yb = yOf(BASE);
        ctx.strokeStyle = 'rgba(120,140,160,0.5)'; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(0, yb); ctx.lineTo(W, yb); ctx.stroke();
        ctx.setLineDash([]);

        if (hist.length < 2) return;
        const dx = W / (N - 1);

        // 소비자 수요 — 얇은 회색 기준선
        ctx.strokeStyle = 'rgba(200,210,220,0.55)'; ctx.lineWidth = 1.4;
        ctx.beginPath();
        hist.forEach((h, i) => { const x = i * dx, y = yOf(h.c); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();

        // 각 단계 주문 라인 — 상류일수록 굵고 뜨거운 색
        for (let s = 0; s < NS; s++) {
            ctx.strokeStyle = colors[s];
            ctx.lineWidth = 1.6 + s * 0.7;
            ctx.beginPath();
            hist.forEach((h, i) => { const x = i * dx, y = yOf(h.o[s]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
            ctx.stroke();
        }
        // 현재 시점 도트
        const last = hist[hist.length - 1];
        const lx = (hist.length - 1) * dx;
        for (let s = 0; s < NS; s++) {
            ctx.fillStyle = colors[s];
            ctx.beginPath(); ctx.arc(lx, yOf(last.o[s]), 2.5 + s * 0.6, 0, 7); ctx.fill();
        }
    }, []);

    // 재생 루프
    useEffect(() => {
        if (!running) return undefined;
        const id = setInterval(() => { step(); render(); }, PERIOD_MS);
        return () => clearInterval(id);
    }, [running, step, render]);

    // 마운트 — 캔버스 해상도 + 초기 히스토리 채우기
    useEffect(() => {
        const cv = canvasRef.current;
        cv.width = 660; cv.height = 250;
        const hist = histRef.current;
        for (let i = 0; i < N; i++) hist.push({ c: BASE, o: [BASE, BASE, BASE, BASE] });
        render();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const reset = useCallback(() => {
        stRef.current = makeState(leadRef.current);
        histRef.current = [];
        for (let i = 0; i < N; i++) histRef.current.push({ c: BASE, o: [BASE, BASE, BASE, BASE] });
        tRef.current = 0; costRef.current = 0; spikeRef.current = 0;
        setHud({
            t: 0, consumer: BASE, orders: [BASE, BASE, BASE, BASE],
            inv: [SAFETY * BASE, SAFETY * BASE, SAFETY * BASE, SAFETY * BASE],
            backlog: [0, 0, 0, 0], amp: 1, cost: 0, spiking: false,
        });
        render();
        setRunning(true); runningRef.current = true;
    }, [render]);

    const changeLead = (v) => {
        leadRef.current = v; setLead(v);
        // 리드 타임이 바뀌면 큐 길이를 맞춰 준다(값은 유지·보정).
        const arr = stRef.current.arriving;
        for (let i = 0; i < NS; i++) {
            const q = arr[i];
            while (q.length < v) q.push(BASE);
            while (q.length > v) q.shift();
        }
    };
    const changeAlpha = (v) => { alphaRef.current = v; setAlpha(v); };
    const changeTheta = (v) => { thetaRef.current = v; setTheta(v); };
    const toggleNoise = () => { noiseRef.current = !noiseRef.current; setNoise((n) => !n); };
    const fireSpike = () => { spikeRef.current = SPIKE_DUR; };
    const togglePlay = () => { setRunning((r) => { runningRef.current = !r; return !r; }); };

    const ampLabel = hud.amp >= 90 ? '∞' : `${hud.amp.toFixed(1)}×`;
    const ampBand = hud.amp < 2.5 ? 'ok' : hud.amp < 5 ? 'warn' : 'trip';

    return (
        <LabShell
            title="BULLWHIP"
            eyebrow="supply chain amplification"
            subtitle={'// 소비자는 살짝 출렁였을 뿐인데, 공장의 주문은 미친 듯이 요동친다'}
            path="bullwhip.exe"
        >
            <section className="k-win bw-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/chain/</span>orders</span>
                    <span className="meta k-mono">order = 예측 + α·(재고갭) + α·θ·(파이프라인갭)</span>
                </div>

                <div className="bw-toolbar">
                    <div className="bw-ctrls">
                        <div className="bw-ctrl">
                            <label className="bw-ctrl-label k-mono" htmlFor="bw-lead">리드 타임 <b>{lead}기간</b></label>
                            <input id="bw-lead" type="range" min="1" max="5" step="1"
                                value={lead} onChange={(e) => changeLead(Number(e.target.value))} />
                        </div>
                        <div className="bw-ctrl">
                            <label className="bw-ctrl-label k-mono" htmlFor="bw-alpha">재고 반응 α <b>{alpha.toFixed(2)}</b></label>
                            <input id="bw-alpha" type="range" min="0.1" max="0.7" step="0.05"
                                value={alpha} onChange={(e) => changeAlpha(Number(e.target.value))} />
                        </div>
                        <div className="bw-ctrl">
                            <label className="bw-ctrl-label k-mono" htmlFor="bw-theta">파이프라인 인지 θ <b>{theta.toFixed(2)}</b></label>
                            <input id="bw-theta" type="range" min="0" max="1" step="0.05"
                                value={theta} onChange={(e) => changeTheta(Number(e.target.value))} />
                        </div>
                    </div>

                    <div className="bw-actions">
                        <button type="button" className={`bw-btn bw-btn-spike ${hud.spiking ? 'is-hot' : ''}`} onClick={fireSpike}>
                            📈 유행 주입 {hud.spiking ? '(확산 중)' : ''}
                        </button>
                        <button type="button" className={`bw-btn bw-btn-ghost ${noise ? 'is-on' : ''}`} onClick={toggleNoise}>
                            수요 잡음 {noise ? 'ON' : 'OFF'}
                        </button>
                        <button type="button" className="bw-btn bw-btn-ghost" onClick={togglePlay}>
                            {running ? '⏸ 정지' : '▶ 재생'}
                        </button>
                        <button type="button" className="bw-btn bw-btn-ghost" onClick={reset}>↻ 리셋</button>
                    </div>
                </div>

                <div className="bw-stage">
                    <div className="bw-chart-col">
                        <div className="bw-screen">
                            <canvas ref={canvasRef} className="bw-canvas" />
                        </div>
                        <div className="bw-legend k-mono">
                            <span><i className="bw-key bw-key-c" /> 소비자 수요</span>
                            {STAGES.map((nm, s) => (
                                <span key={nm}><i className={`bw-key bw-key-s${s}`} /> {nm} 주문</span>
                            ))}
                        </div>
                        <p className="bw-chart-foot k-mono">
                            <b>유행 주입</b>을 누르면 소비자 수요가 한동안 올랐다 잦아든다 · 그 파동이 상류로 갈수록 <b>더 크게, 더 늦게</b> 출렁이는지 보라 · <b>θ를 0</b>으로 두면 채찍이 폭발한다
                        </p>
                    </div>

                    <div className="bw-right">
                        <div className={`bw-amp bw-${ampBand}`}>
                            <span className="bw-amp-lab k-mono">채찍 증폭 배율</span>
                            <span className="bw-amp-num k-mono">{ampLabel}</span>
                            <span className="bw-amp-sub k-mono">공장 주문 진폭 ÷ 소비자 수요 진폭</span>
                        </div>

                        <div className="bw-chain">
                            {STAGES.map((nm, s) => {
                                const back = hud.backlog[s] > 0.5;
                                return (
                                    <div key={nm} className={`bw-node bw-node-s${s} ${back ? 'is-back' : ''}`}>
                                        <span className="bw-node-nm">{nm}</span>
                                        <span className="bw-node-order k-mono">주문 {hud.orders[s].toFixed(0)}</span>
                                        <span className="bw-node-meta k-mono">
                                            재고 {hud.inv[s].toFixed(0)}
                                            {back && <b className="bw-node-back"> · 결품 {hud.backlog[s].toFixed(0)}</b>}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bw-stats">
                            <div className="bw-stat">
                                <span className="bw-stat-lab k-mono">경과</span>
                                <span className="bw-stat-num k-mono">{hud.t}</span>
                                <span className="bw-stat-sub k-mono">기간</span>
                            </div>
                            <div className="bw-stat">
                                <span className="bw-stat-lab k-mono">누적 비용</span>
                                <span className="bw-stat-num k-mono">{Math.round(hud.cost)}</span>
                                <span className="bw-stat-sub k-mono">재고+결품</span>
                            </div>
                        </div>

                        <div className={`bw-verdict bw-${ampBand}`}>
                            <p className="bw-verdict-txt">
                                {ampBand === 'ok'
                                    ? <>공급망이 <b>차분</b>하다. θ를 <b>0</b>으로 내리거나 리드 타임을 늘려 채찍을 깨워 보라.</>
                                    : ampBand === 'warn'
                                        ? <>상류로 갈수록 주문이 <b>부풀고</b> 있다. 파이프라인 인지 <b>θ</b>를 올리면 진동이 잦아든다.</>
                                        : <>공장 주문이 소비자 수요보다 <b>몇 배로</b> 요동친다 — 전형적 채찍 효과. θ를 <b>1</b>로 올려 보라.</>}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win bw-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="bw-foot">
                    <p>
                        {'어느 날 소비자들이 어떤 상품을 평소보다 조금 더 찾기 시작한다. 소매점은 진열대가 비는 걸 보고 '}
                        {'평소보다 넉넉히 주문한다. 그 늘어난 주문을 받은 도매상은 "수요가 뛰었나" 싶어 더 크게 주문하고, '}
                        {'물류·공장으로 올라갈수록 주문은 눈덩이처럼 불어난다. 정작 '}<b>{'소비자 수요는 살짝 출렁였을 뿐인데'}</b>
                        {' 공장은 폭주 주문을 받는다 — 이것이 '}<b>{'채찍 효과(bullwhip effect)'}</b>{'다.'}
                    </p>
                    <p>
                        {'원인은 세 가지다. 첫째, 각 단계는 '}<b>{'진짜 소비자 수요가 아니라 바로 아래 단계의 주문'}</b>
                        {'만 본다. 그 주문은 이미 한 번 부풀려진 신호라, 위로 갈수록 왜곡이 겹겹이 쌓인다. 둘째, '}
                        <b>{'리드 타임'}</b>{'(주문이 물건으로 도착하기까지의 지연)이다. 주문해도 늦게 오니 "부족하다"며 더 주문하고, '}
                        {'뒤늦게 한꺼번에 도착하면 창고가 넘쳐 이번엔 주문을 뚝 끊는다 — 이 과잉·과소의 반복이 진동을 만든다. '}
                        {'셋째, '}<b>{'공급 파이프라인(운송 중 물량)을 잊는 것'}</b>{'이다. 이미 주문해 오고 있는 물량을 감안하지 않으면, '}
                        {'같은 부족분을 계속 다시 주문하게 되어 나중에 대량으로 밀려든다.'}
                    </p>
                    <p>
                        {'이 실험에서 '}<b>{'파이프라인 인지 θ'}</b>{'가 그 세 번째 원인을 다루는 손잡이다. θ가 '}<b>{'0'}</b>
                        {'이면 운송 중 물량을 완전히 무시해 채찍이 폭발하고, θ를 '}<b>{'1'}</b>{'로 올리면 "이미 오고 있으니 그만 주문하자"고 '}
                        {'판단해 진동이 눈에 띄게 잦아든다. '}<b>{'리드 타임'}</b>{'을 늘리면 지연이 커져 채찍이 세지고, '}
                        <b>{'재고 반응 α'}</b>{'를 높이면 부족분을 급하게 메우려다 과하게 출렁인다. 오른쪽 '}<b>{'증폭 배율'}</b>
                        {'은 공장 주문이 소비자 수요보다 몇 배나 심하게 요동치는지를 숫자로 보여 준다.'}
                    </p>
                    <p>
                        {'왜 중요한가. 어떤 상품이 갑자기 유행하면 그 파동이 공급망을 타고 증폭되어, 저 위 원재료 단계까지 '}
                        {'"대란"으로 번지고 품절과 과잉 재고가 번갈아 나타난다. 반대로 각 단계가 '}<b>{'진짜 수요 정보를 공유'}</b>
                        {'하고 파이프라인을 제대로 감안하면, 같은 유행에도 공급망은 훨씬 차분하게 반응한다. 채찍은 사람들의 나쁜 판단이 '}
                        {'아니라 '}<b>{'구조'}</b>{'가 만드는 현상이라는 게 핵심이다.'}
                    </p>
                    <p className="bw-disclaimer">
                        {'* 비어 게임(Beer Game)과 재고 관리 휴리스틱의 핵심만 남긴 단순 데모입니다. 주문 지연, 단계별 서로 다른 '}
                        {'리드 타임·비용, 가격 프로모션·수량 할인으로 인한 채찍 요인 등은 생략했습니다. 수치는 예시입니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Bullwhip;
