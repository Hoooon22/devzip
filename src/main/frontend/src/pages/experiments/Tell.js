import React, { useEffect, useRef, useState, useCallback } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Tell.css';

// TELL — 읽히는 손버릇(독심 기계) (우연과 확률 × 시간 챌린지 × 키보드 입력 자체가 조작계 × 첫 화면 흑백, 인터랙션 이후에만 색).
//   소재: 사람은 무작위를 못 만든다. 아무렇게나 왼쪽/오른쪽을 눌러도, 손은 "방금과 다르게"
//         치려는 버릇(과도한 교대)에 걸린다. 그 버릇을 작은 빈도표 하나가 읽어 다음 수를 먼저 맞힌다.
//   형식: 시간 챌린지 — 20초. 그 안에 왼/오를 최대한 못 읽히게 눌러 기계를 속인 횟수를 센다.
//         빨리 누를수록 기회는 많지만 손버릇이 더 드러난다 — 속도와 무작위의 줄다리기.
//   기술: 키보드 입력 자체가 조작계 — ← → (또는 F/J, A/J). 마우스 없이 손가락 두 개가 전부.
//   제약: 첫 화면은 흑백, 인터랙션 이후에만 색이 생긴다 — 시작 전 화면엔 색이 없다.
//         기계가 내 수를 맞힌(읽은) 순간에만 붉은 신호가 번진다. 속이면 먹선 그대로. 화면의
//         붉은 밀도 = 기계가 나를 쥔 정도. 끝까지 무작위하면 띠지는 거의 먹빛으로 남는다.
//
//   도전("이게 될까"): 학습도 신경망도 없이, 최근 몇 수를 열쇠로 다음 수의 빈도만 세는
//         아론슨 오라클(Aaronson oracle) 한 장이 "무작위하게 치려 애쓰는 사람"을 정말 이기는가.
//         시간 압박이 걸리면 사람은 숙고 없이 손버릇대로 치게 되고, 빈도표는 그 교대 버릇을
//         50%보다 높게 읽어낸다 — 그 체감이 서느냐가 관건.

const DURATION = 20000;      // 20초 스프린트
const COLS = 46;             // 띠지에 한 번에 보이는 최근 수(스트립 차트처럼 흐른다)

// 로직 좌표계(캔버스는 DPR 스케일) — 폴리그래프 띠지 + 아래 두 표적.
const W = 680;
const H = 430;
const TRACE_X0 = 18;
const TRACE_X1 = 662;
const TRACE_MID = 150;
const TRACE_AMP = 92;
const TGT_TOP = 262;
const TGT_BOT = 414;

// 왼/오 입력 키. left=0, right=1. 손은 키보드에서 떠나지 않는다.
const LEFT_KEYS = new Set(['ArrowLeft', 'f', 'F', 'a', 'A']);
const RIGHT_KEYS = new Set(['ArrowRight', 'j', 'J', 'l', 'L', 'd', 'D']);

// 아론슨 오라클 — 최근 k수(k=3,2,1)를 열쇠로, 그 뒤에 무엇이 왔는지 빈도를 센다.
// 예측: 증거가 쌓인 가장 긴 맥락에서 더 자주 온 쪽. 증거가 없으면 "방금과 반대"(사람의 교대 버릇).
const makeOracle = () => {
    const hist = [];
    const tables = { 1: new Map(), 2: new Map(), 3: new Map() };
    const keyOf = (k) => hist.slice(-k).join('');
    const predict = () => {
        for (const k of [3, 2, 1]) {
            if (hist.length < k) continue;
            const c = tables[k].get(keyOf(k));
            if (c && c[0] !== c[1]) return c[0] > c[1] ? 0 : 1;
        }
        if (hist.length) return hist[hist.length - 1] ^ 1;  // 교대 버릇을 노린다
        return Math.random() < 0.5 ? 0 : 1;                 // 첫 수만 동전
    };
    const observe = (a) => {
        for (const k of [3, 2, 1]) {
            if (hist.length < k) continue;
            const key = keyOf(k);
            const c = tables[k].get(key) || [0, 0];
            c[a] += 1;
            tables[k].set(key, c);
        }
        hist.push(a);
    };
    return { predict, observe };
};

const Tell = () => {
    const canvasRef = useRef(null);
    const ctrlRef = useRef(null);                 // { start } — 버튼/키 공유
    const [phase, setPhase] = useState('idle');   // idle | play | done
    const [live, setLive] = useState({ rounds: 0, hits: 0 });
    const [final, setFinal] = useState(null);     // { rounds, hits, fooled, rate }

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const isDark = () => document.querySelector('.lab-os')?.getAttribute('data-theme') === 'dark';
        let dark = isDark();

        const G = {
            phase: 'idle',
            oracle: makeOracle(),
            trace: [],          // [{ dir, hit }]
            rounds: 0,
            hits: 0,
            startT: 0,
            flash: null,        // { side, hit, t0 }
            last: 0,
        };

        let audio = null;
        const beep = (hz, dur, type, vol) => {
            try {
                if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
                const o = audio.createOscillator();
                const gn = audio.createGain();
                o.type = type || 'square';
                o.frequency.value = hz;
                gn.gain.setValueAtTime(0.0001, audio.currentTime);
                gn.gain.exponentialRampToValueAtTime(vol || 0.05, audio.currentTime + 0.006);
                gn.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
                o.connect(gn); gn.connect(audio.destination);
                o.start(); o.stop(audio.currentTime + dur + 0.02);
            } catch { /* 소리는 있으면 좋고 없어도 그만 */ }
        };

        const begin = () => {
            G.oracle = makeOracle();
            G.trace = [];
            G.rounds = 0;
            G.hits = 0;
            G.startT = performance.now();
            G.flash = null;
            G.phase = 'play';
            setPhase('play');
            setLive({ rounds: 0, hits: 0 });
            setFinal(null);
        };

        const finish = () => {
            G.phase = 'done';
            const rate = G.rounds ? G.hits / G.rounds : 0;
            setPhase('done');
            setFinal({ rounds: G.rounds, hits: G.hits, fooled: G.rounds - G.hits, rate });
            if (rate >= 0.5) { beep(150, 0.4, 'sawtooth', 0.06); }
            else { beep(620, 0.1, 'triangle', 0.06); setTimeout(() => beep(880, 0.14, 'triangle', 0.06), 100); }
        };

        // 한 수(왼/오)를 등록한다. 기계는 누르기 전 예측을 품고 있다가, 누른 뒤 맞췄는지 드러낸다.
        const commit = (dir) => {
            const pred = G.oracle.predict();
            const hit = pred === dir;       // 기계가 내 수를 맞혔다 = 읽혔다
            G.oracle.observe(dir);
            G.trace.push({ dir, hit });
            G.rounds += 1;
            if (hit) G.hits += 1;
            G.flash = { side: dir, hit, t0: performance.now() };
            setLive({ rounds: G.rounds, hits: G.hits });
            if (hit) beep(200, 0.08, 'square', 0.06);
            else beep(70, 0.05, 'sine', 0.045);
        };

        // ── 색/먹 팔레트 ──────────────────────────
        // 흑백(먹/뼈빛)이 바탕. 붉은 신호는 오직 "기계가 읽은 순간"에만 쓴다.
        const col = () => (dark
            ? { paper: '#121212', ink: '#e9e9e9', soft: 'rgba(233,233,233,0.42)', faint: 'rgba(233,233,233,0.12)', red: '#ff5a4d', panel: '#1b1b1b' }
            : { paper: '#f6f4ef', ink: '#1a1a1a', soft: 'rgba(26,26,26,0.4)', faint: 'rgba(26,26,26,0.1)', red: '#df2b22', panel: '#efece4' });

        const drawTargets = (c, now) => {
            const cx = W / 2;
            const panels = [
                { x0: TRACE_X0, x1: cx - 6, label: '◀  L', side: 0 },
                { x0: cx + 6, x1: TRACE_X1, label: 'R  ▶', side: 1 },
            ];
            panels.forEach((p) => {
                ctx.strokeStyle = c.soft;
                ctx.lineWidth = 1.4;
                ctx.strokeRect(p.x0, TGT_TOP, p.x1 - p.x0, TGT_BOT - TGT_TOP);
                // 눌림 번짐 — 맞췄으면 붉게, 속였으면 먹빛.
                if (G.flash && G.flash.side === p.side) {
                    const age = now - G.flash.t0;
                    const k = Math.max(0, 1 - age / 240);
                    if (k > 0) {
                        ctx.fillStyle = G.flash.hit ? c.red : c.ink;
                        ctx.globalAlpha = (G.flash.hit ? 0.5 : 0.28) * k;
                        ctx.fillRect(p.x0 + 1.5, TGT_TOP + 1.5, p.x1 - p.x0 - 3, TGT_BOT - TGT_TOP - 3);
                        ctx.globalAlpha = 1;
                    }
                }
                ctx.fillStyle = c.soft;
                ctx.font = '700 22px ui-monospace, Menlo, Consolas, monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(p.label, (p.x0 + p.x1) / 2, (TGT_TOP + TGT_BOT) / 2);
            });
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
        };

        const drawTrace = (c) => {
            const traceW = TRACE_X1 - TRACE_X0;
            const colW = traceW / COLS;
            // 기준선(먹 점선) + 옅은 눈금
            ctx.strokeStyle = c.faint;
            ctx.lineWidth = 1;
            for (let i = 0; i <= COLS; i += 1) {
                const x = TRACE_X0 + i * colW;
                ctx.beginPath(); ctx.moveTo(x, TRACE_MID - TRACE_AMP); ctx.lineTo(x, TRACE_MID + TRACE_AMP); ctx.stroke();
            }
            ctx.strokeStyle = c.soft;
            ctx.setLineDash([3, 4]);
            ctx.beginPath(); ctx.moveTo(TRACE_X0, TRACE_MID); ctx.lineTo(TRACE_X1, TRACE_MID); ctx.stroke();
            ctx.setLineDash([]);

            const vis = G.trace.slice(-COLS);
            vis.forEach((s, i) => {
                const x = TRACE_X0 + (i + 0.5) * colW;
                const y2 = s.dir === 1 ? TRACE_MID - TRACE_AMP : TRACE_MID + TRACE_AMP;
                if (s.hit) {
                    ctx.strokeStyle = c.red;
                    ctx.lineWidth = 3;
                    ctx.beginPath(); ctx.moveTo(x, TRACE_MID); ctx.lineTo(x, y2); ctx.stroke();
                    ctx.save();
                    ctx.shadowColor = c.red;
                    ctx.shadowBlur = 10;
                    ctx.fillStyle = c.red;
                    ctx.beginPath(); ctx.arc(x, y2, 3.4, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                } else {
                    ctx.strokeStyle = c.ink;
                    ctx.globalAlpha = 0.4;
                    ctx.lineWidth = 2.4;
                    ctx.beginPath(); ctx.moveTo(x, TRACE_MID); ctx.lineTo(x, y2); ctx.stroke();
                    ctx.globalAlpha = 0.7;
                    ctx.beginPath(); ctx.arc(x, y2, 2, 0, Math.PI * 2); ctx.fillStyle = c.ink; ctx.fill();
                    ctx.globalAlpha = 1;
                }
            });
            // 바늘(오른쪽 끝) — 종이가 흘러나오는 폴리그래프 느낌.
            const nx = TRACE_X0 + Math.min(vis.length, COLS) * colW;
            ctx.strokeStyle = c.soft;
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(nx, TRACE_MID - TRACE_AMP - 4); ctx.lineTo(nx, TRACE_MID + TRACE_AMP + 4); ctx.stroke();
        };

        const drawTimer = (c, now) => {
            const el = Math.min(DURATION, now - G.startT);
            const frac = 1 - el / DURATION;
            ctx.fillStyle = c.faint;
            ctx.fillRect(TRACE_X0, 0, TRACE_X1 - TRACE_X0, 6);
            // 남은 시간 — 먹빛. 색은 "읽힘"에만 쓰므로 타이머는 끝까지 흑백, 막판엔 깜빡임만.
            const blink = el > DURATION - 3000 ? (Math.sin(now / 90) > 0 ? 1 : 0.35) : 1;
            ctx.globalAlpha = blink;
            ctx.fillStyle = c.ink;
            ctx.fillRect(TRACE_X0, 0, (TRACE_X1 - TRACE_X0) * frac, 6);
            ctx.globalAlpha = 1;
        };

        const drawIdle = (c) => {
            ctx.fillStyle = c.ink;
            ctx.textAlign = 'center';
            ctx.font = "800 30px 'Pretendard Variable', Pretendard, system-ui, sans-serif";
            ctx.fillText('무작위로 눌러라', W / 2, TRACE_MID - 14);
            ctx.fillStyle = c.soft;
            ctx.font = '500 14px ui-monospace, Menlo, Consolas, monospace';
            ctx.fillText('←  /  →   ·   F / J   ·   아무 키나 눌러 시작', W / 2, TRACE_MID + 20);
            ctx.font = '500 12.5px ui-monospace, Menlo, Consolas, monospace';
            ctx.fillText('기계가 당신의 다음 수를 먼저 맞힌다 — 20초', W / 2, TRACE_MID + 44);
            ctx.textAlign = 'left';
        };

        const draw = (now) => {
            const c = col();
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = c.paper;
            ctx.fillRect(0, 0, W, H);

            if (G.phase === 'idle') {
                drawIdle(c);
                // 시작 전엔 표적 윤곽만(흑백). 색 없음.
                drawTargets(c, now);
                return;
            }
            if (G.phase === 'play') drawTimer(c, now);
            drawTrace(c);
            drawTargets(c, now);
        };

        const step = (now) => {
            G.last = now;
            if (G.phase === 'play' && now - G.startT >= DURATION) finish();
            draw(now);
            raf = window.requestAnimationFrame(step);
        };
        let raf = window.requestAnimationFrame(step);

        // ── 키 입력(한 번만 바인딩) ───────────────
        const onKeyDown = (e) => {
            if (e.repeat) return;                         // 누름 유지 반복은 무시
            const left = LEFT_KEYS.has(e.key);
            const right = RIGHT_KEYS.has(e.key);
            if (left || right) {
                e.preventDefault();
                if (G.phase === 'idle') begin();
                if (G.phase === 'play' || G.phase === 'idle') commit(left ? 0 : 1);
                return;
            }
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                if (G.phase === 'idle' || G.phase === 'done') begin();
            }
        };
        window.addEventListener('keydown', onKeyDown);

        ctrlRef.current = { start: begin };

        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('keydown', onKeyDown);
            if (audio) { try { audio.close(); } catch { /* 무시 */ } }
            // dark 는 draw 안에서 매 프레임 재확인(아래 옵저버) — 정리만.
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 테마 전환은 draw 가 매 프레임 .lab-os[data-theme] 를 다시 읽으므로 추가 작업 불필요.

    const onStart = useCallback(() => { ctrlRef.current?.start(); }, []);

    const pct = live.rounds ? Math.round((live.hits / live.rounds) * 100) : 0;
    const verdict = final && (() => {
        if (final.rounds < 12) return { tag: '표본이 적다', head: '더 눌러봐', note: '열두 번은 넘겨야 읽혔는지 알 수 있다.' };
        const r = final.rate;
        if (r < 0.5) return { tag: 'unread', head: '기계보다 무작위했다', note: '흔치 않다 — 손이 버릇을 거의 안 남겼다.' };
        if (r < 0.56) return { tag: 'coin toss', head: '겨우 동전 던지기', note: '거의 반반 — 기계를 아슬아슬하게 따돌렸다.' };
        if (r < 0.66) return { tag: 'read', head: '읽혔다', note: '당신에겐 버릇이 있다 — 손이 패턴을 흘렸다.' };
        return { tag: 'fully read', head: '완전히 읽혔다', note: '빈도표 한 장이 당신의 다음 수를 거의 알았다.' };
    })();

    return (
        <LabShell
            title="TELL"
            eyebrow="you can't press at random"
            subtitle={'// 무작위로 누른다고 믿는 왼/오를, 최근 몇 수만 세는 작은 기계가 먼저 맞힌다 — 20초, 읽히지 않게 눌러라'}
            path="tell"
        >
            <section className="tell-wrap" aria-label="읽히는 손버릇 — 독심 기계">
                <div className="tell-hud k-mono" aria-hidden="true">
                    <span className="tell-stat">
                        {phase === 'idle' ? '대기' : phase === 'play' ? '진행' : '종료'}
                    </span>
                    <span className="tell-stat">
                        <b className="read">읽힘 {live.hits}</b>
                        <span className="mid"> · </span>
                        <b className="fool">속임 {live.rounds - live.hits}</b>
                        {live.rounds > 0 && <span className="rate"> · {pct}%</span>}
                    </span>
                </div>

                <div className="tell-stage">
                    <canvas ref={canvasRef} className="tell-canvas" aria-label="폴리그래프 띠지 — 왼/오 수와 기계의 읽음" />
                </div>

                {phase === 'done' && final && verdict && (
                    <div className={`tell-verdict tell-${final.rate >= 0.56 ? 'caught' : 'free'}`}>
                        <span className="tell-vtag k-mono">{verdict.tag}</span>
                        <h2 className="tell-vhead">{verdict.head}</h2>
                        <p className="tell-vbig">
                            기계가 <b>{Math.round(final.rate * 100)}%</b> 읽음
                        </p>
                        <div className="tell-vrow k-mono">
                            <span>눌린 수 {final.rounds}</span>
                            <span className="read">읽힘 {final.hits}</span>
                            <span className="fool">속임 {final.fooled}</span>
                        </div>
                        <p className="tell-vnote">{verdict.note}</p>
                        <button type="button" className="tell-btn" onClick={onStart}>다시 (Space)</button>
                    </div>
                )}

                <p className="tell-legend k-mono" aria-hidden="true">
                    ←/→ · F/J 로 왼·오 &nbsp;·&nbsp; 아무 키나 눌러 시작 · 20초 &nbsp;·&nbsp; 붉게 번지면 읽힌 것
                </p>

                <ReadBlock />
            </section>
        </LabShell>
    );
};

// 본문 — 왜 사람은 무작위를 못 만드는가, 그리고 빈도표 한 장이 어떻게 읽는가.
const ReadBlock = () => (
    <section className="tell-read">
        <h3>사람은 무작위를 못 만든다 — 그걸 빈도표 한 장이 읽는다</h3>
        <p>
            왼쪽·오른쪽을 <b>아무렇게나</b> 눌러보라고 하면, 거의 모두가 비슷한 함정에 빠진다.
            방금 오른쪽을 눌렀으면 이번엔 왼쪽으로, 같은 쪽이 두세 번 이어지면 괜히 불안해서
            바꿔버린다. 진짜 동전은 앞앞앞앞도 태연히 내놓지만, 사람 손은 그걸 <b>“무작위답지
            않다”</b>고 느껴 피한다. 이 <b>과도한 교대</b> 버릇이 당신의 수를 예측 가능하게 만든다.
        </p>
        <p>
            이 화면의 기계에는 학습도, 신경망도, 당신에 대한 사전 정보도 없다. 가진 것은
            <b> 최근 몇 수를 열쇠 삼아 “그 다음에 당신이 무엇을 눌렀는지” 세어 둔 빈도표</b> 하나뿐이다
            (아론슨 오라클). 지금까지의 수열에서 “오·왼 다음엔 주로 오른쪽을 쳤다”가 보이면,
            같은 맥락이 또 오는 순간 <b>오른쪽</b>에 건다. 맞으면 읽힌 것이다.
        </p>
        <p>
            형식은 <b>20초 시간 챌린지</b>다. 빨리 누를수록 기회(수)는 많아지지만, 숙고할 틈이
            없어져 손은 더 버릇대로 움직인다 — <b>속도와 무작위가 서로를 잡아먹는다</b>. 그래서
            화면엔 숫자뿐 아니라 <b>붉은 번짐</b>으로 결과가 쌓인다. 기계가 맞힌 수만 띠지에 붉게
            찍히고, 속인 수는 먹선으로 남는다. 시작 전 화면은 <b>온통 흑백</b>이다. 붉은색은 오직
            “읽힌 순간”에만 생긴다. 끝났을 때 띠지가 얼마나 붉은지가 곧 당신이 읽힌 정도다.
        </p>
        <p className="tell-disc">
            * 대부분의 사람은 55~65% 읽힌다 — 진짜 무작위(50%)보다 분명히 높다. 50% 밑으로
            내려가기는 의외로 어렵다. 기록은 남기지 않으며, 매 판 기계의 빈도표는 비워진 채
            당신의 이번 손버릇만으로 다시 채워진다.
        </p>
    </section>
);

export default Tell;
