import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Timbre.css';

// TIMBRE — 소리를 만지는 감각 유형 (감각 × 성향 테스트 × Web Audio × 버튼 3개 이하).
//   소재: 화면에 담기 어려운 '소리의 질감'. 같은 소리를 누구는 둥글다·따뜻하다,
//         누구는 뾰족하다·차갑다로 만진다(공감각/bouba-kiki 계열 교차감각).
//   형식: 성향 테스트 — 여섯 개의 애매한 음색을 듣고 더 맞는 쪽을 고르면 유형이 나온다.
//   기술: Web Audio — 오실레이터·필터·트레몰로로 '중간쯤'인 음색을 즉석 합성해 들려주고,
//         AnalyserNode로 소리를 반응하는 덩어리로 그린다.
//   제약: 버튼 3개 이하 — 각 물음은 두 낱말 버튼뿐. 소리는 저절로 흐르고, 고르면 다음으로 넘어간다.

// 여섯 물음 — 축(form: 둥긂↔모남 / temp: 따뜻↔차가움)마다 셋씩. 낱말은 매번 다르되 극성은 같다.
// 음색은 일부러 '어느 쪽도 아닌' 값으로 잡아, 사람마다 다르게 만지게 한다.
const QUESTIONS = [
    {
        id: 'q1', axis: 'form', ask: '이 소리는',
        a: { label: '둥글다', v: 1 }, b: { label: '모나다', v: -1 },
        sound: { base: 190, cutoff: 1200, q: 0.7, trem: { rate: 5, depth: 0.18 }, parts: [['sine', 1, 0.6], ['triangle', 2, 0.24]] },
    },
    {
        id: 'q2', axis: 'temp', ask: '이 소리는',
        a: { label: '따뜻하다', v: 1 }, b: { label: '차갑다', v: -1 },
        sound: { base: 140, cutoff: 900, q: 0.9, trem: { rate: 4, depth: 0.12 }, parts: [['sawtooth', 1, 0.5], ['sine', 1, 0.3]] },
    },
    {
        id: 'q3', axis: 'form', ask: '이 소리의 표면은',
        a: { label: '매끈하다', v: 1 }, b: { label: '까끌하다', v: -1 },
        sound: { base: 250, cutoff: 1500, q: 1.0, trem: { rate: 8, depth: 0.32 }, parts: [['square', 1, 0.26], ['sine', 2, 0.3]] },
    },
    {
        id: 'q4', axis: 'temp', ask: '이 소리에 닿으면',
        a: { label: '포근하다', v: 1 }, b: { label: '서늘하다', v: -1 },
        sound: { base: 200, cutoff: 1000, q: 0.6, trem: { rate: 3, depth: 0.14 }, parts: [['sine', 1, 0.5], ['sine', 1.006, 0.46]] },
    },
    {
        id: 'q5', axis: 'form', ask: '이 소리의 끝은',
        a: { label: '부드럽다', v: 1 }, b: { label: '뾰족하다', v: -1 },
        sound: { base: 300, cutoff: 1750, q: 1.1, trem: { rate: 11, depth: 0.3 }, parts: [['triangle', 1, 0.4], ['sawtooth', 2, 0.2]] },
    },
    {
        id: 'q6', axis: 'temp', ask: '이 소리의 빛깔은',
        a: { label: '노곤하다', v: 1 }, b: { label: '쨍하다', v: -1 },
        sound: { base: 150, cutoff: 1300, q: 0.7, trem: { rate: 3, depth: 0.2 }, parts: [['sine', 1, 0.45], ['sine', 1.5, 0.4]] },
    },
];

const TYPES = {
    moss: {
        name: '이끼', tag: '둥글고 따뜻한 소리를 사는 사람',
        body: '소리를 먼저 온도로 만진다. 뾰족한 파형에서도 포근한 결을 먼저 찾아내는 귀 — 낮고 눅진한 것에 마음이 놓인다.',
    },
    glass: {
        name: '유리알', tag: '둥글지만 서늘한 소리를 사는 사람',
        body: '매끈함과 서늘함을 한꺼번에 듣는다. 흐릿한 음색에서 맑고 정갈한 쪽을 집어내는, 차분히 투명한 귀다.',
    },
    ember: {
        name: '잉걸', tag: '모난데 뜨거운 소리를 사는 사람',
        body: '거칠수록 살아 있다고 느낀다. 타닥이는 질감·날 선 배음에서 온기를 읽어내는, 뜨겁고 촉각적인 귀다.',
    },
    frost: {
        name: '서릿날', tag: '모나고 차가운 소리를 사는 사람',
        body: '또렷하고 날카로운 걸 신뢰한다. 애매한 음색에서 각과 냉기를 먼저 세우는, 명료함에 예민한 귀다.',
    },
};

const typeOf = (form, temp) => {
    if (form > 0 && temp > 0) return TYPES.moss;
    if (form > 0 && temp <= 0) return TYPES.glass;
    if (form <= 0 && temp > 0) return TYPES.ember;
    return TYPES.frost;
};

// 온도 점수(−3..+3)를 앰버↔틸 색으로. 0 근처는 회색.
const tempColor = (t) => {
    const n = Math.max(-1, Math.min(1, t / 3));
    const neutral = [138, 131, 120];
    const warm = [232, 137, 74];
    const cool = [63, 169, 160];
    const to = n >= 0 ? warm : cool;
    const k = Math.abs(n);
    const c = neutral.map((v, i) => Math.round(v + (to[i] - v) * k));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
};

// 한 음색을 소리내는 그래프를 만들어 master 에 물린다. plain function — 훅 아님.
const buildVoice = (ctx, master, cfg) => {
    const now = ctx.currentTime;
    const sum = ctx.createGain();
    const oscs = [];
    cfg.parts.forEach(([type, ratio, gain]) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = cfg.base * ratio;
        const g = ctx.createGain();
        g.gain.value = gain;
        o.connect(g); g.connect(sum);
        oscs.push(o);
    });
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cfg.cutoff;
    filter.Q.value = cfg.q;

    // 트레몰로 — 진폭을 (1-depth)..1 사이에서 흔들어 질감을 준다.
    const trem = ctx.createGain();
    const base = 1 - cfg.trem.depth / 2;
    trem.gain.value = base;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = cfg.trem.rate;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = cfg.trem.depth / 2;
    lfo.connect(lfoDepth); lfoDepth.connect(trem.gain);

    const voice = ctx.createGain();          // attack/release 봉투
    voice.gain.setValueAtTime(0.0001, now);
    voice.gain.exponentialRampToValueAtTime(1, now + 0.09);

    sum.connect(filter); filter.connect(trem); trem.connect(voice); voice.connect(master);
    oscs.forEach((o) => o.start(now));
    lfo.start(now);

    return {
        stop() {
            const t = ctx.currentTime;
            try {
                voice.gain.cancelScheduledValues(t);
                voice.gain.setValueAtTime(Math.max(voice.gain.value, 0.0001), t);
                voice.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
                oscs.forEach((o) => o.stop(t + 0.12));
                lfo.stop(t + 0.12);
            } catch { /* 이미 멈춘 노드 */ }
        },
    };
};

const DOTS = QUESTIONS.map((q) => q.id); // 진행 점 — 값으로 키

const Timbre = () => {
    const [phase, setPhase] = useState('intro');   // intro | quiz | result
    const [qi, setQi] = useState(0);
    const [score, setScore] = useState({ form: 0, temp: 0 });

    const ctxRef = useRef(null);
    const masterRef = useRef(null);
    const analyserRef = useRef(null);
    const voiceRef = useRef(null);
    const scoreRef = useRef({ form: 0, temp: 0 });
    const tempRef = useRef(0);                       // draw 루프가 읽는 온도 lean
    const canvasRef = useRef(null);

    const stopVoice = useCallback(() => {
        if (voiceRef.current) { voiceRef.current.stop(); voiceRef.current = null; }
    }, []);

    const playCurrent = useCallback((index) => {
        const ctx = ctxRef.current;
        if (!ctx || !masterRef.current) return;
        stopVoice();
        try { voiceRef.current = buildVoice(ctx, masterRef.current, QUESTIONS[index].sound); }
        catch { /* 오디오 실패해도 테스트는 진행 */ }
    }, [stopVoice]);

    // 소리 켜기 + 시작 — 사용자 제스처에서 AudioContext 를 깨운다.
    const start = useCallback(() => {
        try {
            if (!ctxRef.current) {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const master = ctx.createGain();
                master.gain.value = 0.14;
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 1024;
                master.connect(analyser); analyser.connect(ctx.destination);
                ctxRef.current = ctx; masterRef.current = master; analyserRef.current = analyser;
            }
            if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
        } catch { /* 오디오 미지원 — 무음으로 진행 */ }
        scoreRef.current = { form: 0, temp: 0 };
        tempRef.current = 0;
        setScore({ form: 0, temp: 0 });
        setQi(0);
        setPhase('quiz');
    }, []);

    const answer = useCallback((axis, v) => {
        scoreRef.current = { ...scoreRef.current, [axis]: scoreRef.current[axis] + v };
        if (axis === 'temp') tempRef.current = scoreRef.current.temp;
        setScore({ ...scoreRef.current });
        if (qi + 1 >= QUESTIONS.length) {
            stopVoice();
            setPhase('result');
        } else {
            setQi((i) => i + 1);
        }
    }, [qi, stopVoice]);

    const restart = useCallback(() => { start(); }, [start]);

    // 현재 물음이 바뀌면 그 음색을 재생.
    useEffect(() => {
        if (phase === 'quiz') playCurrent(qi);
        return () => { if (phase !== 'quiz') stopVoice(); };
    }, [phase, qi, playCurrent, stopVoice]);

    // 언마운트 시 오디오 정리.
    useEffect(() => () => {
        stopVoice();
        if (ctxRef.current) { try { ctxRef.current.close(); } catch { /* noop */ } }
    }, [stopVoice]);

    // 반응하는 덩어리 — 소리가 있으면 파형으로, 없으면 숨쉬듯 일렁이게 그린다.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const cctx = canvas.getContext('2d');
        let raf = 0;
        const buf = new Uint8Array(512);
        const draw = () => {
            const dpr = window.devicePixelRatio || 1;
            const size = canvas.clientWidth;
            if (canvas.width !== size * dpr) { canvas.width = size * dpr; canvas.height = size * dpr; }
            const W = canvas.width; const cx = W / 2; const cy = W / 2;
            cctx.clearRect(0, 0, W, W);

            const an = analyserRef.current;
            let amp = 0;
            if (an) { an.getByteTimeDomainData(buf); }
            const t = performance.now() / 1000;
            const col = tempColor(tempRef.current);
            const R = W * 0.3;

            cctx.beginPath();
            const N = 120;
            for (let i = 0; i <= N; i += 1) {
                const ang = (i / N) * Math.PI * 2;
                const idx = Math.floor((i / N) * (buf.length - 1));
                const wave = an ? (buf[idx] - 128) / 128 : 0;
                amp += Math.abs(wave);
                const breathe = Math.sin(t * 1.3 + ang * 3) * 0.06 + Math.sin(t * 0.7) * 0.03;
                const r = R * (1 + breathe) + wave * R * 0.5;
                const x = cx + Math.cos(ang) * r;
                const y = cy + Math.sin(ang) * r;
                if (i === 0) cctx.moveTo(x, y); else cctx.lineTo(x, y);
            }
            cctx.closePath();
            cctx.fillStyle = col;
            cctx.globalAlpha = 0.16;
            cctx.fill();
            cctx.globalAlpha = 1;
            cctx.lineWidth = dpr * 2;
            cctx.strokeStyle = col;
            cctx.stroke();

            // 중심 점 — 소리의 세기에 따라 커진다.
            const pulse = an ? Math.min(1, amp / 40) : 0.2 + Math.sin(t * 2) * 0.08;
            cctx.beginPath();
            cctx.arc(cx, cy, R * 0.12 * (0.6 + pulse), 0, Math.PI * 2);
            cctx.fillStyle = col;
            cctx.fill();

            raf = window.requestAnimationFrame(draw);
        };
        raf = window.requestAnimationFrame(draw);
        return () => window.cancelAnimationFrame(raf);
    }, []);

    const q = QUESTIONS[qi];
    const result = phase === 'result' ? typeOf(scoreRef.current.form, scoreRef.current.temp) : null;
    const accent = tempColor(score.temp);

    return (
        <LabShell
            title="TIMBRE"
            eyebrow="how you touch a sound"
            subtitle={'// 화면에 담기 어려운 소리의 질감 — 여섯 음색을 듣고 더 맞는 쪽을 고르면, 소리를 만지는 감각 유형이 나온다'}
            path="timbre"
        >
            <section className="tb-wrap" style={{ '--accent': accent }} aria-label="소리를 만지는 감각 유형">
                <div className="tb-stage">
                    <canvas ref={canvasRef} className="tb-canvas" aria-hidden="true" />
                    {phase === 'quiz' && <span className="tb-ask k-mono">{q.ask}</span>}
                </div>

                {phase === 'intro' && (
                    <div className="tb-intro">
                        <p className="tb-lead">여섯 소리를 듣는다.<br />맞다·틀리다는 없다. <b>더 맞는 쪽</b>을 고르면 된다.</p>
                        <button type="button" className="tb-start" onClick={start}>소리를 켜고 시작</button>
                        <span className="tb-note k-mono">소리가 납니다 · 이어폰 권장</span>
                    </div>
                )}

                {phase === 'quiz' && (
                    <>
                        <div className="tb-dots" aria-label={`${qi + 1} / ${QUESTIONS.length}`}>
                            {DOTS.map((id, i) => (
                                <span key={id} className={`tb-dot${i < qi ? ' past' : ''}${i === qi ? ' now' : ''}`} />
                            ))}
                        </div>
                        <div className="tb-choices">
                            <button type="button" className="tb-choice" onClick={() => answer(q.axis, q.a.v)}>{q.a.label}</button>
                            <button type="button" className="tb-choice" onClick={() => answer(q.axis, q.b.v)}>{q.b.label}</button>
                        </div>
                    </>
                )}

                {phase === 'result' && result && (
                    <div className="tb-result">
                        <span className="tb-rk k-mono">당신이 사는 소리</span>
                        <h2 className="tb-name">{result.name}</h2>
                        <p className="tb-tag">{result.tag}</p>
                        <p className="tb-body">{result.body}</p>
                        <div className="tb-bars" aria-hidden="true">
                            <Bar label="모남" right="둥긂" value={score.form} />
                            <Bar label="차가움" right="따뜻함" value={score.temp} />
                        </div>
                        <button type="button" className="tb-start ghost" onClick={restart}>다시 듣기</button>
                    </div>
                )}

                <ReadBlock />
            </section>
        </LabShell>
    );
};

// 축 막대 — 숫자 대신 −3..+3 을 좌우 치우침으로 보여준다.
const Bar = ({ label, right, value }) => {
    const pct = 50 + (Math.max(-3, Math.min(3, value)) / 3) * 50;
    return (
        <div className="tb-bar">
            <span className="tb-bl k-mono">{label}</span>
            <span className="tb-track"><i style={{ left: `${pct}%` }} /></span>
            <span className="tb-br k-mono">{right}</span>
        </div>
    );
};

Bar.propTypes = {
    label: PropTypes.string.isRequired,
    right: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
};

const ReadBlock = () => (
    <section className="tb-read">
        <h3>왜 어떤 소리는 &lsquo;뾰족하게&rsquo; 들릴까</h3>
        <p>
            처음 보는 두 도형에 &lsquo;부바&rsquo;와 &lsquo;키키&rsquo;라는 이름을 붙이라고 하면, 세계
            어디서든 열에 아홉은 둥근 쪽을 <b>부바</b>, 뾰족한 쪽을 <b>키키</b>라 부른다. 소리와
            모양 사이엔 언어를 넘는 <b>교차감각(cross-modal) 대응</b>이 있어서, 우리는 귀로 들은 걸
            은연중에 손끝의 촉감이나 눈의 형태로 옮겨 만진다.
        </p>
        <p>
            그래서 낮고 배음이 매끈한 소리는 <b>둥글고 따뜻</b>하게, 높고 거친 배음이 선 소리는
            <b> 모나고 차갑게</b> 느껴진다. 다만 그 경계는 사람마다 다르다. 이 여섯 음색은 일부러
            &lsquo;어느 쪽도 아닌&rsquo; 중간값으로 합성했다 — 그래서 같은 소리를 누구는 포근하다,
            누구는 서늘하다고 만진다. 당신의 대답이 곧 당신의 <b>감각 유형</b>이다.
        </p>
        <p className="tb-disc">
            * 모든 소리는 브라우저에서 실시간으로 만들어진다(Web Audio — 오실레이터·저역 필터·트레몰로).
            가운데 덩어리는 그 파형을 그대로 그린 것이고, 색은 당신이 고른 온도 쪽으로 물든다.
        </p>
    </section>
);

export default Timbre;
