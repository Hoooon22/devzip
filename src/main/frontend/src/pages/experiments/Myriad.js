import React, { useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Myriad.css';

// MYRIAD — 십의 거듭제곱을 손으로 켜는 아트 토이.
//   소재: "감이 안 오는 수" — 천, 백만, 1조, 자(10^24). 숫자를 눈으로 봐도 실감이 안 온다.
//   그래서 여기서는 숫자를 "말"하지 않고, 손으로 위아래로 끌면 자릿수(order)가 오르내리며
//   (1) 그 수만큼의 알갱이가 화면을 채우고 — 대략 천을 넘어가면 더는 늘릴 수 없어 대신 미쳐 날뛰고,
//   (2) Web Audio 로 목소리가 층층이 쌓여 음정과 떨림이 커지며 — 끝에선 하나로 듣기엔 너무 많아진다.
//   보여줘도 안 와닿던 크기를, 세다 포기하는 그 순간과 귀를 덮는 벽으로 느끼게 한다.
// 무설명 제약: 놀이 영역에는 설명 문장이 없다. 만지면 소리와 무리가 즉시 반응해 스스로 알게 된다.

const MAXO = 24;        // 최대 자릿수 (10^24)
const REST = 2.2;       // 처음에 떠 있는 정지 상태(≈수백 알갱이가 살아 움직임)
const CAP = 1200;       // 눈으로 그릴 수 있는 알갱이 상한 — 이 위로는 더 못 늘린다
const AMBER = [255, 196, 92];
const CYAN = [120, 214, 255];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mix = (p, q, t) => Math.round(p + (q - p) * t);

// 자릿수 → "1000…" 문자열 (세 자리마다 얇은 공백). 배경에 유령처럼 깔리는 비언어적 힌트.
const numeral = (order) => {
    const z = Math.floor(order);
    let s = '1' + '0'.repeat(z);
    // 뒤에서 세 자리마다 U+2009(가는 공백)
    let out = '';
    for (let i = 0; i < s.length; i += 1) {
        if (i > 0 && (s.length - i) % 3 === 0) out += ' ';
        out += s[i];
    }
    return out;
};

const Myriad = () => {
    const stageRef = useRef(null);
    const canvasRef = useRef(null);
    const audioRef = useRef(null);       // { ctx, sum, lp, trem, env, pan, lfoGain, voices, noiseGain }
    const partsRef = useRef([]);         // 알갱이 풀
    const dimsRef = useRef({ w: 0, h: 0, dpr: 1 });
    const orderRef = useRef(REST);       // 현재 자릿수 (rAF 가 읽음)
    const pressedRef = useRef(false);
    const rafRef = useRef(0);

    const [orderDisp, setOrderDisp] = useState(REST); // 배경 숫자·레일 표시용
    const [pressed, setPressed] = useState(false);
    const [touched, setTouched] = useState(false);    // 첫 접촉 이후 안내 링 숨김

    // ── 알갱이 풀 초기화 / 캔버스 크기 ──
    const resize = () => {
        const cv = canvasRef.current;
        const st = stageRef.current;
        if (!cv || !st) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = st.clientWidth;
        const h = st.clientHeight;
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
        cv.style.width = `${w}px`;
        cv.style.height = `${h}px`;
        dimsRef.current = { w, h, dpr };
        if (partsRef.current.length === 0) {
            partsRef.current = Array.from({ length: CAP }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: 0,
                vy: 0,
            }));
        }
    };

    useEffect(() => {
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Web Audio 그래프 (첫 접촉 때 생성) ──
    const ensureAudio = () => {
        if (audioRef.current) return audioRef.current;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        const ctx = new AC();

        const sum = ctx.createGain(); sum.gain.value = 1;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800;
        const trem = ctx.createGain(); trem.gain.value = 1;   // LFO 로 흔들 대상
        const env = ctx.createGain(); env.gain.value = 0.0001; // 눌림 엔벨로프
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        const comp = ctx.createDynamicsCompressor();

        // 7개의 목소리(오실레이터) 풀
        const voices = Array.from({ length: 7 }, () => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            const g = ctx.createGain(); g.gain.value = 0;
            osc.connect(g); g.connect(sum);
            osc.start();
            return { osc, g };
        });

        // 트레몰로 LFO
        const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 4;
        const lfoGain = ctx.createGain(); lfoGain.gain.value = 0;
        lfo.connect(lfoGain); lfoGain.connect(trem.gain);
        lfo.start();

        // 극단적 자릿수에서 "너무 많아 못 세는" 잡음 층
        const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const nd = noiseBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i += 1) nd[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource(); noise.buffer = noiseBuf; noise.loop = true;
        const noiseBP = ctx.createBiquadFilter(); noiseBP.type = 'bandpass'; noiseBP.frequency.value = 1200; noiseBP.Q.value = 0.7;
        const noiseGain = ctx.createGain(); noiseGain.gain.value = 0;
        noise.connect(noiseBP); noiseBP.connect(noiseGain); noiseGain.connect(sum);
        noise.start();

        // 체인 연결
        sum.connect(lp); lp.connect(trem); trem.connect(env);
        if (pan) { env.connect(pan); pan.connect(comp); } else { env.connect(comp); }
        comp.connect(ctx.destination);

        audioRef.current = { ctx, sum, lp, trem, env, pan, lfoGain, voices, noiseGain };
        return audioRef.current;
    };

    // 자릿수에 맞춰 오디오 파라미터를 부드럽게 이동
    const applyAudio = (order) => {
        const a = audioRef.current;
        if (!a) return;
        const { ctx } = a;
        const t = ctx.currentTime;
        const f0 = 55 * Math.pow(2, order / 4);                 // 자릿수 4마다 한 옥타브
        const n = clamp(1 + Math.floor(order / 3.5), 1, 7);      // 쌓이는 목소리 수
        const spread = 3 + order * 2.2;                          // 디튠(센트) — 커질수록 군집
        a.voices.forEach((v, i) => {
            const on = i < n;
            const det = spread * (i - (n - 1) / 2);
            v.osc.frequency.setTargetAtTime(f0, t, 0.04);
            v.osc.detune.setTargetAtTime(det, t, 0.05);
            v.g.gain.setTargetAtTime(on ? 1 / n : 0, t, 0.05);
        });
        a.lp.frequency.setTargetAtTime(Math.min(9000, f0 * 4 + 400), t, 0.05);
        a.lfoGain.gain.setTargetAtTime(0.1 + order * 0.02, t, 0.08);       // 트레몰로 깊이
        // 트레몰로 속도
        // (lfo.frequency 는 그래프 밖에서 접근 못 하므로 여기선 lfoGain 로만 깊이 제어)
        a.noiseGain.gain.setTargetAtTime(order > 16 ? (order - 16) * 0.012 : 0, t, 0.1);
    };

    const startNote = () => {
        const a = ensureAudio();
        if (!a) return;
        if (a.ctx.state === 'suspended') a.ctx.resume();
        applyAudio(orderRef.current);
        a.env.gain.cancelScheduledValues(a.ctx.currentTime);
        a.env.gain.setTargetAtTime(0.16, a.ctx.currentTime, 0.03);
    };

    const stopNote = () => {
        const a = audioRef.current;
        if (!a) return;
        a.env.gain.cancelScheduledValues(a.ctx.currentTime);
        a.env.gain.setTargetAtTime(0.0001, a.ctx.currentTime, 0.12);
    };

    // ── 렌더 루프 ──
    useEffect(() => {
        const draw = () => {
            const cv = canvasRef.current;
            const ctx = cv && cv.getContext('2d');
            if (!ctx) { rafRef.current = requestAnimationFrame(draw); return; }
            const { w, h, dpr } = dimsRef.current;
            const order = orderRef.current;

            const ag = order <= 3 ? 0.2 : 0.2 + (order - 3) * 0.055;         // 요동
            const tremor = Math.max(0, order - 12) / 12 * 3;                  // 화면 미세 진동
            const shakeX = tremor ? (Math.random() - 0.5) * tremor : 0;
            const shakeY = tremor ? (Math.random() - 0.5) * tremor : 0;

            ctx.setTransform(dpr, 0, 0, dpr, shakeX * dpr, shakeY * dpr);
            // 잔상: 반투명 배경으로 덮어 꼬리 남기기
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(7, 9, 16, 0.30)';
            ctx.fillRect(-4, -4, w + 8, h + 8);

            const count = clamp(Math.round(Math.pow(10, order)), 1, CAP);
            const ct = clamp((order - 10) / 12, 0, 1);                        // 색: 호박 → 청록
            const cr = mix(AMBER[0], CYAN[0], ct);
            const cg = mix(AMBER[1], CYAN[1], ct);
            const cb = mix(AMBER[2], CYAN[2], ct);
            const rad = 1.5 + Math.min(2.2, ag * 0.7);

            ctx.globalCompositeOperation = 'lighter';
            const parts = partsRef.current;
            for (let i = 0; i < count; i += 1) {
                const p = parts[i];
                p.vx = p.vx * 0.95 + (Math.random() - 0.5) * ag * 0.9;
                p.vy = p.vy * 0.95 + (Math.random() - 0.5) * ag * 0.9;
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x += w; else if (p.x > w) p.x -= w;
                if (p.y < 0) p.y += h; else if (p.y > h) p.y -= h;
                ctx.fillStyle = `rgba(${cr},${cg},${cb},0.82)`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
                ctx.fill();
            }
            rafRef.current = requestAnimationFrame(draw);
        };
        rafRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    // ── 포인터 → 자릿수 ──
    const orderFromEvent = (e) => {
        const st = stageRef.current;
        if (!st) return orderRef.current;
        const r = st.getBoundingClientRect();
        const y = clamp((e.clientY - r.top) / r.height, 0, 1);
        return clamp((1 - y) * MAXO, 0, MAXO);
    };
    const panFromEvent = (e) => {
        const st = stageRef.current;
        if (!st) return 0;
        const r = st.getBoundingClientRect();
        return clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    };

    const onDown = (e) => {
        e.preventDefault();
        if (stageRef.current.setPointerCapture) {
            try { stageRef.current.setPointerCapture(e.pointerId); } catch { /* noop */ }
        }
        setTouched(true);
        pressedRef.current = true;
        setPressed(true);
        const o = orderFromEvent(e);
        orderRef.current = o;
        setOrderDisp(o);
        startNote();
        const a = audioRef.current;
        if (a && a.pan) a.pan.pan.setTargetAtTime(panFromEvent(e), a.ctx.currentTime, 0.05);
    };
    const onMove = (e) => {
        if (!pressedRef.current) return;
        const o = orderFromEvent(e);
        orderRef.current = o;
        setOrderDisp(o);
        applyAudio(o);
        const a = audioRef.current;
        if (a && a.pan) a.pan.pan.setTargetAtTime(panFromEvent(e), a.ctx.currentTime, 0.05);
    };
    const onUp = () => {
        if (!pressedRef.current) return;
        pressedRef.current = false;
        setPressed(false);
        stopNote();
    };

    useEffect(() => () => { if (audioRef.current) audioRef.current.ctx.close(); }, []);

    const ticks = Array.from({ length: 13 }, (_, i) => i); // 0,2,4,…,24 자리 눈금
    const knobTop = `${(1 - orderDisp / MAXO) * 100}%`;

    return (
        <LabShell
            title="MYRIAD"
            eyebrow="powers of ten, played by hand"
            subtitle={'// 위아래로 끌면 자릿수가 오르내린다 — 소리와 무리로 느끼는 큰 수'}
            path="myriad.exe"
        >
            <section className="my-wrap" aria-label="십의 거듭제곱 악기">
                <div className="my-rail" aria-hidden="true">
                    {ticks.map((i) => (
                        <span key={i} className="my-tick" style={{ height: `${1 + i * 0.9}px` }} />
                    ))}
                    <span className="my-knob" style={{ top: knobTop }} />
                </div>

                <div
                    ref={stageRef}
                    className={`my-stage${pressed ? ' is-live' : ''}`}
                    role="application"
                    aria-label="위로 끌수록 큰 수. 손을 대면 소리와 알갱이 무리가 그 크기를 나타낸다."
                    onPointerDown={onDown}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerCancel={onUp}
                    onPointerLeave={onUp}
                >
                    <canvas ref={canvasRef} className="my-canvas" />
                    <div className="my-numeral" aria-hidden="true">{numeral(orderDisp)}</div>
                    {!touched && (
                        <div className="my-invite" aria-hidden="true">
                            <span className="my-ring" />
                            <span className="my-ring d2" />
                        </div>
                    )}
                </div>
            </section>

            {/* 해설 (놀이 영역 밖 — 만진 뒤 읽는 회고) */}
            <section className="my-read">
                <h2>왜 숫자는 커질수록 실감이 안 날까</h2>
                <p>
                    사람의 직관은 대략 <b>천</b> 근처에서 한계에 부딪힌다. 하나·둘·열·백까진 눈으로 세지지만,
                    그 위로는 &quot;많다&quot;로 뭉뚱그려질 뿐 백만과 십억의 차이가 몸으로 오지 않는다. 위 악기는
                    바로 그 지점을 만지게 만든다 — 자릿수가 <b>3</b>을 넘는 순간(≈천) 알갱이는 더 늘어나지 못하고
                    <b> 대신 미쳐 날뛰기 시작한다</b>. 화면이 &quot;세기&quot;를 포기하고 &quot;요동&quot;으로 바꿔 버리는 그 전환이,
                    우리 머릿속에서 벌어지는 일과 똑같다.
                </p>
                <p>
                    소리도 같은 이야기를 한다. 낮은 자릿수에선 맑은 한 음이지만, 위로 끌수록 <b>목소리가 층층이 쌓이고</b>
                    (자릿수 4마다 한 옥타브씩 올라가며) 떨림이 빨라지다가, 끝에 가면 하나로 듣기엔 너무 많아져
                    <b> 벽처럼 뭉쳐 버린다</b>. 각 목소리를 따로 들을 수 없게 되는 그 순간이, 큰 수를 하나하나
                    셀 수 없게 되는 순간의 소리판 번역이다.
                </p>
                <p>
                    배경에 깔린 &quot;1000…&quot;은 자릿수를 <b>숫자로도</b> 보여 준다 — 그러나 0이 아무리 늘어나도 크기는
                    와닿지 않는다는 게 핵심이다. 광년, 국가 예산, 분자의 개수, 나노초처럼 우리가 매일 스치는 큰 수들은
                    이렇게 &quot;자릿수만 다른 것&quot;인데, 우리 감각은 그 자릿수 사이를 선형으로만 상상한다. 그래서 십억을
                    백만의 &quot;조금 큰 것&quot;쯤으로 착각한다(실제론 <b>천 배</b>다). 손으로 끌어 소리와 무리가 폭발하는 걸
                    직접 겪고 나면, 그 &quot;천 배&quot;가 조금은 몸에 남는다.
                </p>
                <p className="my-disc">
                    * 소리는 브라우저에서 실시간 합성됩니다(Web Audio). 서버로 전송되는 데이터는 없고, 알갱이 수·음정·
                    잡음 층은 자릿수를 로그로 매핑한 교육용 표현이지 실제 물리량이 아닙니다.
                </p>
            </section>
        </LabShell>
    );
};

export default Myriad;
