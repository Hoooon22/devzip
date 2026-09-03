import React, { useRef, useState, useEffect } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Malkkeut.css';

// 말끝 — 말투(말끝/어미)로 갈라지는 문자 대화
//   소재출처: 말과 글자 — 한국어는 말끝(어미) 하나로 관계의 온도가 갈린다
//             ("완전 반가워"↔"오랜만이네요"↔"무슨 일이야"는 같은 뜻, 다른 사이).
//   형식: 분기 서사 — 내가 고른 말투가 상대의 다음 말과 대화의 결말을 가른다.
//   기술: 포인터 궤적 — 답장 말풍선을 잡고 위/아래로 끄는 궤적이 곧 말투 선택.
//         끄는 동안 말끝이 실시간으로 다시 써지고, 놓으면 날아가 붙는다.
//   제약: 소리가 반드시 — 끄는 동안 말투 온도를 따라 도는 드론음, 보낼 때 튕김음,
//         상대 말풍선엔 도착음(Web Audio).

// 상대의 첫 마디(고정). 이후 상대의 말은 지금까지 쌓인 말투 온도에 따라 갈린다.
const OPENER = '잘 지내지…? 오랜만에 문득 네 생각이 나서.';

// 각 턴의 내 답장 — 말끝(어미)만 다른 세 말투. 위로 끌면 warm / 가운데 neutral / 아래 cold.
const REPLIES = [
    { warm: '어! 진짜 오랜만이다, 완전 반가워 :)', neutral: '네, 오랜만이네요.', cold: '어. 무슨 일이야.' },
    { warm: '그냥저냥 지내~ 너는? 얼굴 본 지 진짜 오래됐다', neutral: '그럭저럭 지냅니다. 그쪽은요?', cold: '바빠. 왜.' },
    { warm: '좋지!! 이번 주말 어때? 그때 그 카페 가자', neutral: '네, 기회 되면 언제 한번요.', cold: '됐어. 나 이만.' },
    { warm: '응 이따 봐! 연락 줘서 고마워', neutral: '그래요, 살펴 가세요.', cold: '어.' },
];

// 상대의 이어지는 말 — 내 n번째 답장 뒤의 반응. 지금까지의 말투 온도(warm/neutral/cold)로 고른다.
const THEM = [
    { warm: 'ㅋㅋ 말투 여전하네. 요즘 어떻게 지내?', neutral: '다행이에요. 바쁘게 지내나 봐요.', cold: '…그냥, 생각나서. 바쁜가 보네.' },
    { warm: '우리 조만간 볼래? 그때 그 카페 아직 있더라.', neutral: '언제 시간 되면 커피라도 한잔해요.', cold: '아니 별건 아니고. 그냥 안부였어.' },
    { warm: '콜! 토요일에 보자. 진짜 반갑다 :)', neutral: '그래요, 연락드릴게요. 들어가세요.', cold: '…어. 잘 지내라.' },
];

// 말투 온도의 합(warm +1 / neutral 0 / cold -1, 네 번)으로 결말이 갈린다.
const ENDINGS = [
    { min: 3, key: 'warm', title: '다시, 반말로', line: '끊겼던 사이가 말끝 하나로 도로 이어졌다. 토요일에 보기로 했다.' },
    { min: 1, key: 'ajar', title: '언젠가', line: '확답은 없었지만 문은 닫히지 않았다. "기회 되면"이라는 말끝에 여지가 남았다.' },
    { min: -1, key: 'polite', title: '존댓말인 채로', line: '정중했지만 딱 거기까지. 서로 말끝을 높인 채, 거리도 그대로였다.' },
    { min: -99, key: 'cold', title: '마침표', line: '말끝마다 찍힌 마침표가 대화를 닫았다. 연락은 여기서 끝났다.' },
];

const TONE_HZ = { warm: 392, neutral: 262, cold: 165 };
const TONE_KO = { warm: '다정', neutral: '보통', cold: '차갑게' };
const TH = 42; // 말투 전환 문턱(px)

const bucketOf = (w) => (w > 0 ? 'warm' : w < 0 ? 'cold' : 'neutral');
const endingFor = (w) => ENDINGS.find((e) => w >= e.min);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const Malkkeut = () => {
    const [msgs, setMsgs] = useState([{ who: 'them', text: OPENER }]);
    const [step, setStep] = useState(0);
    const [warmth, setWarmth] = useState(0);
    const [previewTone, setPreviewTone] = useState('neutral');
    const [typing, setTyping] = useState(false);
    const [ended, setEnded] = useState(false);

    const audioRef = useRef({ ctx: null, drone: null });
    const dragRef = useRef({ active: false, startY: 0 });
    const toneRef = useRef('neutral');
    const bubbleRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => () => {
        clearTimeout(timerRef.current);
        const ac = audioRef.current.ctx;
        if (ac && ac.state !== 'closed') ac.close();
    }, []);

    // ── Web Audio ─────────────────────────────────
    const ensureAudio = () => {
        let ac = audioRef.current.ctx;
        if (!ac) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ac = new AC();
            audioRef.current.ctx = ac;
        }
        if (ac.state === 'suspended') ac.resume();
        return ac;
    };
    const startDrone = () => {
        const ac = ensureAudio();
        if (!ac || audioRef.current.drone) return;
        const t = ac.currentTime;
        const osc = ac.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(TONE_HZ[toneRef.current], t);
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.08);
        osc.connect(g);
        g.connect(ac.destination);
        osc.start();
        audioRef.current.drone = { osc, g };
    };
    const setDroneTone = (tone) => {
        const d = audioRef.current.drone;
        const ac = audioRef.current.ctx;
        if (!d || !ac) return;
        d.osc.frequency.exponentialRampToValueAtTime(TONE_HZ[tone], ac.currentTime + 0.12);
    };
    const stopDrone = () => {
        const d = audioRef.current.drone;
        const ac = audioRef.current.ctx;
        if (!d || !ac) return;
        const t = ac.currentTime;
        d.g.gain.cancelScheduledValues(t);
        d.g.gain.setValueAtTime(d.g.gain.value, t);
        d.g.gain.linearRampToValueAtTime(0.0001, t + 0.12);
        d.osc.stop(t + 0.14);
        audioRef.current.drone = null;
    };
    const sendBlip = (tone) => {
        const ac = audioRef.current.ctx;
        if (!ac) return;
        const t = ac.currentTime;
        const o = ac.createOscillator();
        o.type = 'triangle';
        const f = TONE_HZ[tone];
        o.frequency.setValueAtTime(f, t);
        o.frequency.exponentialRampToValueAtTime(f * (tone === 'cold' ? 0.6 : 1.45), t + 0.18);
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.connect(g);
        g.connect(ac.destination);
        o.start(t);
        o.stop(t + 0.32);
    };
    const recvTick = () => {
        const ac = audioRef.current.ctx;
        if (!ac) return;
        const t = ac.currentTime;
        const o = ac.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(196, t);
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
        o.connect(g);
        g.connect(ac.destination);
        o.start(t);
        o.stop(t + 0.19);
    };

    // ── 답장 전송(말투 확정) ─────────────────────────
    const commit = (tone) => {
        if (ended || typing) return;
        const val = tone === 'warm' ? 1 : tone === 'cold' ? -1 : 0;
        const nextWarmth = warmth + val;
        setMsgs((m) => [...m, { who: 'me', text: REPLIES[step][tone], tone }]);
        setWarmth(nextWarmth);
        sendBlip(tone);
        setPreviewTone('neutral');
        toneRef.current = 'neutral';

        if (step < 3) {
            setTyping(true);
            const reaction = THEM[step][bucketOf(nextWarmth)];
            const nextStep = step + 1;
            timerRef.current = setTimeout(() => {
                setTyping(false);
                recvTick();
                setMsgs((m) => [...m, { who: 'them', text: reaction }]);
                setStep(nextStep);
            }, 880);
        } else {
            setStep(4);
            timerRef.current = setTimeout(() => setEnded(true), 640);
        }
    };

    // ── 포인터 궤적 ──────────────────────────────────
    const onDown = (e) => {
        if (ended || typing || step > 3) return;
        startDrone();
        dragRef.current = { active: true, startY: e.clientY };
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
    };
    const onMove = (e) => {
        if (!dragRef.current.active) return;
        const dy = e.clientY - dragRef.current.startY;
        if (bubbleRef.current) {
            bubbleRef.current.style.transform = `translateY(${clamp(dy * 0.55, -70, 70)}px) rotate(${clamp(-dy * 0.02, -4, 4)}deg)`;
        }
        const tone = dy < -TH ? 'warm' : dy > TH ? 'cold' : 'neutral';
        if (tone !== toneRef.current) {
            toneRef.current = tone;
            setPreviewTone(tone);
            setDroneTone(tone);
        }
    };
    const onUp = () => {
        if (!dragRef.current.active) return;
        dragRef.current.active = false;
        stopDrone();
        if (bubbleRef.current) bubbleRef.current.style.transform = '';
        commit(toneRef.current);
    };
    const onKey = (e) => {
        if (ended || typing || step > 3) return;
        if (e.key === 'ArrowUp') {
            e.preventDefault(); ensureAudio(); toneRef.current = 'warm'; setPreviewTone('warm');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault(); ensureAudio(); toneRef.current = 'cold'; setPreviewTone('cold');
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault(); toneRef.current = 'neutral'; setPreviewTone('neutral');
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); ensureAudio(); commit(toneRef.current);
        }
    };

    const restart = () => {
        clearTimeout(timerRef.current);
        setMsgs([{ who: 'them', text: OPENER }]);
        setStep(0);
        setWarmth(0);
        setPreviewTone('neutral');
        toneRef.current = 'neutral';
        setTyping(false);
        setEnded(false);
    };

    const ending = endingFor(warmth);
    const showBubble = !ended && !typing && step <= 3;

    return (
        <LabShell
            title="말끝"
            subtitle="말투로 갈라지는 문자 대화 · 위로 끌면 다정, 아래로 차갑게"
            eyebrow="말과 글자 / 분기 서사"
            path="malkkeut"
        >
            <section className={`mk-wrap tone-${previewTone} amb-${bucketOf(warmth)}`} aria-label="말투로 갈라지는 문자 대화">
                <div className="mk-phone">
                    <div className="mk-head">
                        <span className="mk-dot" aria-hidden="true" />
                        <span className="mk-name">그 사람</span>
                        <span className="mk-sub k-mono">읽음 · 지금</span>
                    </div>

                    <div className="mk-thread" aria-live="polite">
                        {msgs.map((m, i) => (
                            <div
                                // eslint-disable-next-line react/no-array-index-key
                                key={i}
                                className={`mk-row ${m.who}`}
                            >
                                <div className={`mk-bubble ${m.who}${m.tone ? ` t-${m.tone}` : ''}`}>{m.text}</div>
                            </div>
                        ))}
                        {typing && (
                            <div className="mk-row them">
                                <div className="mk-bubble them mk-typing" aria-label="상대가 입력 중">
                                    <span /><span /><span />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 답장 도크 — 말풍선을 끄는 궤적이 말투가 된다 */}
                    <div className="mk-dock">
                        {showBubble ? (
                            <>
                                <div className="mk-dial" aria-hidden="true">
                                    <span className="dl warm">다정</span>
                                    <span className="dl mid">보통</span>
                                    <span className="dl cold">차갑게</span>
                                    <span className={`dl-mark m-${previewTone}`} />
                                </div>
                                <button
                                    type="button"
                                    ref={bubbleRef}
                                    className={`mk-draft t-${previewTone}`}
                                    onPointerDown={onDown}
                                    onPointerMove={onMove}
                                    onPointerUp={onUp}
                                    onPointerCancel={onUp}
                                    onKeyDown={onKey}
                                    aria-label={`답장을 끌어 보내기. 지금 말투 ${TONE_KO[previewTone]}. 위/아래 화살표로 말투, Enter로 전송`}
                                >
                                    <span className="mk-grip" aria-hidden="true">↕</span>
                                    <span className="mk-draft-text">{REPLIES[step] ? REPLIES[step][previewTone] : ''}</span>
                                    <span className={`mk-tonetag tt-${previewTone}`}>{TONE_KO[previewTone]}</span>
                                </button>
                            </>
                        ) : ended ? (
                            <div className={`mk-end e-${ending.key}`} role="status">
                                <span className="mk-end-k k-mono">{'// 대화 끝'}</span>
                                <strong className="mk-end-t">{ending.title}</strong>
                                <p className="mk-end-l">{ending.line}</p>
                                <button type="button" className="mk-again k-mono" onClick={restart}>다시 걸기 ↺</button>
                            </div>
                        ) : (
                            <div className="mk-wait k-mono">…</div>
                        )}
                    </div>
                </div>

                {showBubble && (
                    <p className="mk-hint k-mono">
                        {'말풍선을 위로 끌면 다정하게 · 아래로 끌면 차갑게 — 놓으면 전송'}
                    </p>
                )}
            </section>
        </LabShell>
    );
};

export default Malkkeut;
