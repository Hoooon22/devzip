import React, { useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Placebo.css';

// PLACEBO — 엘리베이터 "닫힘" 버튼 연타 vs 자동 닫힘 (일상의 사소한 현상 × 대결).
//   소재: 엘리베이터를 타면 누구나 한 번쯤 닫힘 버튼을 연타한다. 정말 빨라질까?
//   현실에선 많은 닫힘 버튼이 "플라시보 버튼" — 눌러도 소방/접근성 규정 탓에 실제로는
//   아무 동작도 하지 않게 배선돼 있고, 그래도 눌리는 느낌과 소리는 준다. 이 페이지는
//   매 판 버튼을 몰래 진짜(연타가 통함) 또는 플라시보(무의미)로 정하고, 당신 대 자동
//   닫힘의 대결로 그 감각을 재현한다. 이길 때도 있고, 아무리 눌러도 못 이길 때도 있다.
// 형식: 대결 — 나(연타) vs 자동(가만히 두면 3.6초). 먼저 문을 닫는 쪽이 이긴다.
// 기술: 타이포그래피가 조작계 — 두 문짝이 각각 "닫"·"힘" 글자를 실어 나른다.
//        가운데서 만나 "닫힘"이 완성되는 순간이 곧 문이 닫힌 순간이다.
// 제약: 소리가 반드시 — Web Audio 실시간 합성. 누를 때마다 버튼 비프(문이 닫힐수록
//        음이 오른다), 문 닫힘 텅, 승리 딩동, 플라시보 판엔 죽은 저음 버즈.

const AUTO_MS = 3600;      // 자동 닫힘: 가만히 두면 3.6초
const PRESS_STEP = 0.11;   // 진짜 버튼: 한 번 누르면 문 11%
const PLACEBO_P = 0.45;    // 플라시보로 나올 확률

const Placebo = () => {
    const [roundState, setRoundState] = useState('ready'); // ready | racing | done
    const [result, setResult] = useState(null);            // 'win' | 'lose'
    const [revealed, setRevealed] = useState(null);        // 'real' | 'placebo' (판이 끝나야 공개)
    const [score, setScore] = useState({ wins: 0, total: 0, real: 0, placebo: 0, placeboLoss: 0 });

    // 애니메이션 값은 ref로 굴리고 문짝은 DOM에 직접 그린다(매 프레임 리렌더 방지).
    const youProg = useRef(0);
    const autoProg = useRef(0);
    const isPlacebo = useRef(false);
    const startAt = useRef(0);
    const rafId = useRef(0);
    const stateRef = useRef('ready');

    const youL = useRef(null);
    const youR = useRef(null);
    const autoL = useRef(null);
    const autoR = useRef(null);
    const youUnit = useRef(null);

    const acRef = useRef(null);
    const pressRef = useRef(() => {});  // 최신 onPress 를 키보드 핸들러에 노출
    const resetRef = useRef(() => {});  // 최신 resetScore

    const getAc = () => {
        if (!acRef.current) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            acRef.current = new Ctx();
        }
        return acRef.current;
    };
    const blip = (freq, dur = 0.06, type = 'square', vol = 0.12, delay = 0) => {
        try {
            const c = getAc();
            if (c.state === 'suspended') c.resume();
            const t0 = c.currentTime + delay;
            const o = c.createOscillator();
            const g = c.createGain();
            o.type = type;
            o.frequency.setValueAtTime(freq, t0);
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.linearRampToValueAtTime(vol, t0 + 0.006);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            o.connect(g).connect(c.destination);
            o.start(t0);
            o.stop(t0 + dur + 0.02);
        } catch (err) { /* 오디오 미지원 브라우저는 조용히 넘어간다 */ }
    };

    const applyDoors = () => {
        const y = youProg.current;
        const a = autoProg.current;
        if (youL.current) youL.current.style.transform = `translateX(${-(1 - y) * 100}%)`;
        if (youR.current) youR.current.style.transform = `translateX(${(1 - y) * 100}%)`;
        if (autoL.current) autoL.current.style.transform = `translateX(${-(1 - a) * 100}%)`;
        if (autoR.current) autoR.current.style.transform = `translateX(${(1 - a) * 100}%)`;
    };

    const setShut = (which, shut) => {
        const nodes = which === 'you' ? [youL.current, youR.current] : [autoL.current, autoR.current];
        nodes.forEach((n) => { if (n) n.classList.toggle('is-shut', shut); });
    };

    const finishRound = (yp, ap) => {
        cancelAnimationFrame(rafId.current);
        const won = yp >= 1 && ap < 1;                 // 자동보다 먼저 닫아야 승
        const placebo = isPlacebo.current;
        setShut('you', yp >= 1);
        setShut('auto', ap >= 1);
        setResult(won ? 'win' : 'lose');
        setRevealed(placebo ? 'placebo' : 'real');
        stateRef.current = 'done';
        setRoundState('done');
        setScore((s) => ({
            wins: s.wins + (won ? 1 : 0),
            total: s.total + 1,
            real: s.real + (placebo ? 0 : 1),
            placebo: s.placebo + (placebo ? 1 : 0),
            placeboLoss: s.placeboLoss + (placebo && !won ? 1 : 0),
        }));
        // 소리: 문 닫힘 텅 → 결과음
        blip(150, 0.09, 'sine', 0.16);
        blip(96, 0.14, 'sine', 0.14, 0.05);
        if (won) {
            blip(660, 0.10, 'triangle', 0.14, 0.16);
            blip(988, 0.16, 'triangle', 0.14, 0.28);
        } else {
            blip(120, 0.30, 'sawtooth', 0.10, 0.16); // 죽은 저음 — 플라시보/패배
        }
    };

    const tick = (now) => {
        const ap = Math.min(1, (now - startAt.current) / AUTO_MS);
        autoProg.current = ap;
        if (isPlacebo.current) youProg.current = ap; // 플라시보: 연타 무시, 자동과 같은 속도로만 닫힌다
        applyDoors();
        const yp = youProg.current;
        if (yp >= 1 || ap >= 1) { finishRound(yp, ap); return; }
        rafId.current = requestAnimationFrame(tick);
    };

    const startRound = () => {
        isPlacebo.current = Math.random() < PLACEBO_P;
        youProg.current = 0;
        autoProg.current = 0;
        startAt.current = performance.now();
        stateRef.current = 'racing';
        setRoundState('racing');
        setResult(null);
        setRevealed(null);
        setShut('you', false);
        setShut('auto', false);
        rafId.current = requestAnimationFrame(tick);
    };

    const nextRound = () => {
        youProg.current = 0;
        autoProg.current = 0;
        applyDoors();
        setShut('you', false);
        setShut('auto', false);
        setResult(null);
        setRevealed(null);
        stateRef.current = 'ready';
        setRoundState('ready');
    };

    const mash = () => {
        if (!isPlacebo.current) {
            youProg.current = Math.min(1, youProg.current + PRESS_STEP);
            applyDoors();
        }
        // 문이 닫힐수록 비프 음이 오른다(진짜/플라시보 모두 눌리는 느낌·소리는 동일).
        blip(360 + youProg.current * 300, 0.05, 'square', 0.10);
        if (youUnit.current) {
            youUnit.current.classList.remove('pl-hit');
            void youUnit.current.offsetWidth; // reflow로 애니메이션 재시작
            youUnit.current.classList.add('pl-hit');
        }
    };

    const onPress = () => {
        const st = stateRef.current;
        if (st === 'ready') { startRound(); mash(); }
        else if (st === 'racing') { mash(); }
        else if (st === 'done') { nextRound(); }
    };

    const resetScore = () => {
        setScore({ wins: 0, total: 0, real: 0, placebo: 0, placeboLoss: 0 });
        nextRound();
    };

    // 최신 핸들러를 ref에 노출 → 키보드 리스너는 마운트 시 한 번만 붙인다.
    pressRef.current = onPress;
    resetRef.current = resetScore;

    useEffect(() => {
        const onKey = (e) => {
            if (e.repeat) return; // 눌림 유지는 무시 — 진짜 "연타"만 센다
            if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); pressRef.current(); }
            else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); resetRef.current(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => () => cancelAnimationFrame(rafId.current), []);

    let verdict = null;
    if (roundState === 'done') {
        const win = result === 'win';
        const real = revealed === 'real';
        verdict = {
            win,
            tag: real ? '진짜 버튼' : '플라시보',
            line: real
                ? (win ? '연타가 통했다 — 자동보다 먼저 닫혔다.' : '진짜 버튼인데 너무 느렸다. 자동이 먼저 닫혔다.')
                : '아무리 눌러도 소용없었다. 이 버튼은 배선돼 있지 않았다.',
        };
    }

    const promptTail = roundState === 'ready'
        ? '연타 — 닫힘 버튼을 눌러라'
        : roundState === 'racing'
            ? '계속 연타!'
            : '다음 판';

    return (
        <LabShell
            title="PLACEBO"
            eyebrow="does the close button even work?"
            subtitle={'// 엘리베이터 닫힘 버튼을 연타한다 — 자동 닫힘을 이길 수 있을까, 아니면 애초에 가짜 버튼일까'}
            path="placebo"
        >
            <section className="pl-wrap" aria-label="엘리베이터 닫힘 버튼 대결">
                <div className="pl-panel">
                    {/* 점수 LED 라인 */}
                    <div className="pl-score" aria-live="polite">
                        <span className="pl-led">승 <b>{score.wins}</b> / {score.total}판</span>
                        <span className="pl-led dim">진짜 {score.real} · 플라시보 {score.placebo}</span>
                    </div>

                    {/* 두 엘리베이터 정면 대결 */}
                    <div className="pl-stage">
                        <div className="pl-unit you" ref={youUnit}>
                            <span className="pl-tag">YOU · 연타</span>
                            <div
                                className="pl-door"
                                role="button"
                                tabIndex={0}
                                aria-label="닫힘 버튼 연타"
                                onPointerDown={(e) => { e.preventDefault(); onPress(); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onPress(); } }}
                            >
                                <div className="pl-shaft" />
                                <div className="pl-leaf left" ref={youL}><span className="pl-glyph">닫</span></div>
                                <div className="pl-leaf right" ref={youR}><span className="pl-glyph">힘</span></div>
                                <div className="pl-seam" />
                            </div>
                        </div>

                        <div className="pl-vs">VS</div>

                        <div className="pl-unit auto">
                            <span className="pl-tag">자동 · 3.6초</span>
                            <div className="pl-door" aria-hidden="true">
                                <div className="pl-shaft" />
                                <div className="pl-leaf left" ref={autoL}><span className="pl-glyph">닫</span></div>
                                <div className="pl-leaf right" ref={autoR}><span className="pl-glyph">힘</span></div>
                                <div className="pl-seam" />
                            </div>
                        </div>
                    </div>

                    {/* 판정 + 안내 */}
                    <div className={`pl-verdict${verdict ? (verdict.win ? ' win' : ' lose') : ''}`}>
                        {verdict ? (
                            <>
                                <p className="pl-vhead">
                                    <span className="pl-vres">{verdict.win ? '승리' : '패배'}</span>
                                    <span className={`pl-vtag ${revealed}`}>{verdict.tag}</span>
                                </p>
                                <p className="pl-vline">{verdict.line}</p>
                            </>
                        ) : (
                            <p className="pl-vidle">
                                {roundState === 'racing'
                                    ? '문이 닫히는 중 — 자동보다 먼저 닫아라'
                                    : '버튼이 진짜인지 가짜인지는 눌러 봐야 안다'}
                            </p>
                        )}
                    </div>

                    <button type="button" className="pl-cta" onClick={onPress}>
                        <span className="pl-key">SPACE</span>{promptTail}
                    </button>
                    <p className="pl-hint k-mono">SPACE 연타 · 화면 터치도 가능 · R 초기화</p>

                    {score.placeboLoss > 0 && (
                        <p className="pl-note">
                            플라시보 판은 {score.placeboLoss}번 모두 졌다 — 손끝이 아무리 빨라도 배선이 없으면 소용없다.
                        </p>
                    )}
                </div>

                {/* 만진 뒤 읽는 회고 */}
                <section className="pl-read">
                    <h3>닫힘 버튼은 정말 문을 빨리 닫을까</h3>
                    <p>
                        많은 엘리베이터의 <b>닫힘 버튼은 실제로는 아무 일도 하지 않는다</b>. 미국 장애인법(ADA, 1990)
                        같은 접근성·소방 규정은 문이 사람이 안전하게 타고 내릴 만큼 일정 시간 열려 있도록 요구하는데,
                        닫힘 버튼이 이 시간을 무시하고 문을 당겨 버리면 규정 위반이 된다. 그래서 관리자·소방·정비 모드가
                        아닌 <b>일반 승객 상태에서는 버튼을 눌러도 배선상 무시</b>하도록 만들어 둔 경우가 흔하다. 그런데도
                        버튼은 눌리는 촉감과 <b>비프음·불빛</b>을 준다 — 그게 사람을 속이는 게 아니라, 눌렀다는 사실 자체가
                        기다림의 초조함을 덜어 주기 때문이다.
                    </p>
                    <p>
                        이렇게 <b>결과에 영향을 주지 않지만 통제감을 주는 조작 장치</b>를 <b>플라시보 버튼(placebo button)</b>
                        이라 부른다. 횡단보도의 보행자 신호 요청 버튼(많은 도심 교차로에서 신호가 이미 자동 순환이라
                        눌러도 무의미), 사무실 온도조절기 중 냉난방 계통에 연결되지 않은 것, 일부 사무실 승강기가
                        대표적이다. 공통점은 하나다 — <b>기다림이나 무력감을 줄이려고, 실제 제어가 아니라 제어의 느낌을 판다.</b>
                    </p>
                    <p>
                        이 대결은 매 판 버튼을 몰래 진짜(연타할수록 빨라짐)나 플라시보(연타 무시, 자동과 같은 속도)로 정한다.
                        진짜 버튼 판에선 빠른 손이 자동 닫힘을 이기지만, 플라시보 판에선 <b>아무리 연타해도 문은 3.6초짜리
                        자동 속도로만 닫혀</b> 당신은 진다. 진짜와 플라시보가 <b>같은 비프음·같은 촉감</b>을 주기에, 눌러 보기
                        전에는 어느 쪽인지 알 수 없다는 것이 핵심이다.
                    </p>
                    <p className="pl-disc">
                        * 이 페이지는 실제 특정 건물·제조사의 동작을 재현한 것이 아니라, 플라시보 버튼이라는 널리 알려진
                        현상을 대결 형식으로 옮긴 놀이입니다. 승패와 진짜/가짜 판정은 브라우저 안에서만 계산되며 저장되지 않습니다.
                        조작은 SPACE 연타를 기본으로 하되 화면 터치도 같은 동작을 합니다.
                    </p>
                </section>
            </section>
        </LabShell>
    );
};

export default Placebo;
