import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/ReverseSprinkler.css';

// REVERSE SPRINKLER — 파인만 스프링클러 문제.
//   보통 스프링클러(물을 뿜는 쪽)는 반작용으로 노즐 반대편으로 돈다. 그럼 반대로
//   물을 "빨아들이면" 어느 쪽으로 돌까? 직관은 "빨려 들어가는 쪽으로 돌겠지"라고
//   말하지만, 실제로는 정방향의 반대로, 그리고 약 50배나 느리게 돈다는 것이 최근에야
//   실험·모형으로 정리됐다(빨려 들어온 두 물줄기가 중심 챔버에서 충돌하는 '뒤집힌 로켓').
//
// 모형(개념 데모): 각속도 ω 를 감쇠 있는 회전 운동으로 적분한다.
//   Iω̇ = τ − c·ω        (τ: 물줄기 운동량이 만드는 토크, c: 유체 감쇠)
//   분사 τ = +K·Q²        → 힘찬 정방향 회전 (반작용)
//   흡입 τ = −K·Q²·ρ      → 정방향의 반대, 크기는 ρ≈1/50 배 (거의 멈춘 듯)
//   흡입 ×50 증폭 시 ρ·50 = 1 이 되어, 정방향을 거울처럼 뒤집은 회전이 드러난다.
//   유량 Q 를 키우면 물줄기 속도 v∝Q, 운동량 플럭스 ∝Q² 이라 토크가 Q² 로 커진다.

const CV = 380;                 // 정사각 캔버스
const CX = CV / 2, CY = CV / 2;
const HUB_R = 24;               // 중심 챔버 반지름
const ARM_L = 150;              // 팔 길이(노즐 팁까지)
const NOZ = 26;                 // 노즐(접선 방향) 길이
const I_ROT = 0.5;              // 관성모멘트(연출)
const C_DAMP = 1.0;             // 유체 감쇠
const K_TQ = 1.35;              // 토크 계수
const REV_RATIO = 0.02;         // 흡입/분사 회전비 ≈ 1/50 (실측 근사)
const DT = 1 / 60;

// 팔 k(0,1)의 기하 — 현재 회전각 phi 기준. 노즐은 팔 끝에서 접선 방향으로 꺾인다.
function armGeom(phi, k) {
    const a = phi + k * Math.PI;
    const ca = Math.cos(a), sa = Math.sin(a);
    const tipx = CX + ARM_L * ca, tipy = CY + ARM_L * sa;
    // 분사 배출 방향(접선). 반작용은 그 반대(+접선)라서 phi 가 증가(정방향)한다.
    const ex = sa, ey = -ca;
    const mouthx = tipx + NOZ * ex, mouthy = tipy + NOZ * ey;
    return { a, ca, sa, tipx, tipy, ex, ey, mouthx, mouthy };
}

const ReverseSprinkler = () => {
    const canvasRef = useRef(null);
    const rafRef = useRef(0);

    const simRef = useRef({ phi: 0, omega: 0, spawn: 0 });
    const partsRef = useRef([]);   // 물방울 파티클
    const sparkRef = useRef([]);   // 중심 충돌 스파크(흡입)

    const [mode, setMode] = useState('spray');   // 'spray' | 'suck'
    const [q, setQ] = useState(1.0);
    const [amplify, setAmplify] = useState(false);
    const [playing, setPlaying] = useState(true);
    const [omegaDisp, setOmegaDisp] = useState(0);

    // 루프가 최신 컨트롤을 읽도록 ref 미러
    const modeRef = useRef(mode), qRef = useRef(q), ampRef = useRef(amplify), playRef = useRef(playing);
    useEffect(() => { modeRef.current = mode; }, [mode]);
    useEffect(() => { qRef.current = q; }, [q]);
    useEffect(() => { ampRef.current = amplify; }, [amplify]);
    useEffect(() => { playRef.current = playing; }, [playing]);

    const reset = useCallback(() => {
        simRef.current = { phi: 0, omega: 0, spawn: 0 };
        partsRef.current = [];
        sparkRef.current = [];
        setOmegaDisp(0);
    }, []);

    const draw = useCallback(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const { phi, omega } = simRef.current;
        const m = modeRef.current;

        // ── 무대 ──
        ctx.fillStyle = '#06090d';
        ctx.fillRect(0, 0, CV, CV);

        // 물탱크/외곽 링(흡입 시 물이 들어오는 저수지 느낌)
        ctx.strokeStyle = 'rgba(90,104,120,0.22)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(CX, CY, ARM_L + NOZ + 8, 0, Math.PI * 2); ctx.stroke();

        // ── 물방울 파티클 (팔 아래에 먼저) ──
        const parts = partsRef.current;
        const water = m === 'spray' ? '#46c2ec' : '#5bb8d6';
        for (let i = 0; i < parts.length; i++) {
            const p = parts[i];
            const alpha = Math.max(0, Math.min(1, p.life));
            ctx.fillStyle = `rgba(${m === 'spray' ? '70,194,236' : '110,196,224'},${0.15 + alpha * 0.7})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }

        // ── 스프링클러 본체 ──
        for (let k = 0; k < 2; k++) {
            const g = armGeom(phi, k);
            // 팔
            ctx.strokeStyle = '#8794a4';
            ctx.lineWidth = 11;
            ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(g.tipx, g.tipy); ctx.stroke();
            // 팔 하이라이트
            ctx.strokeStyle = 'rgba(220,230,240,0.35)';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(g.tipx, g.tipy); ctx.stroke();
            // 노즐(접선으로 꺾인 관)
            ctx.strokeStyle = '#6f7b8a';
            ctx.lineWidth = 9;
            ctx.beginPath(); ctx.moveTo(g.tipx, g.tipy); ctx.lineTo(g.mouthx, g.mouthy); ctx.stroke();
            // 노즐 입구 표시(분사=밝은 물, 흡입=빨아들이는 링)
            ctx.fillStyle = m === 'spray' ? water : 'rgba(120,140,160,0.5)';
            ctx.beginPath(); ctx.arc(g.mouthx, g.mouthy, 4.5, 0, Math.PI * 2); ctx.fill();
        }

        // 중심 허브(챔버)
        ctx.fillStyle = '#5b6673';
        ctx.beginPath(); ctx.arc(CX, CY, HUB_R, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(220,230,240,0.3)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(CX, CY, HUB_R, 0, Math.PI * 2); ctx.stroke();
        // 중심 축
        ctx.fillStyle = '#0a0e12';
        ctx.beginPath(); ctx.arc(CX, CY, 5, 0, Math.PI * 2); ctx.fill();

        // ── 흡입 충돌 스파크(뒤집힌 로켓: 두 물줄기가 챔버에서 충돌) ──
        const sparks = sparkRef.current;
        for (let i = 0; i < sparks.length; i++) {
            const s = sparks[i];
            const a = Math.max(0, s.life);
            ctx.fillStyle = `rgba(230,165,58,${a * 0.8})`;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        }

        // ── 회전 방향 화살표(허브 둘레 원호) ──
        if (Math.abs(omega) > 0.03) {
            const sign = omega > 0 ? 1 : -1;
            const aR = HUB_R + 16;
            const start = phi;
            const sweep = sign * 1.5;
            ctx.strokeStyle = m === 'spray' ? '#46c2ec' : '#e6a53a';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(CX, CY, aR, start, start + sweep, sign < 0); ctx.stroke();
            // 화살촉
            const end = start + sweep;
            const hx = CX + aR * Math.cos(end), hy = CY + aR * Math.sin(end);
            const th = end + sign * Math.PI / 2;
            ctx.fillStyle = m === 'spray' ? '#46c2ec' : '#e6a53a';
            ctx.beginPath();
            ctx.moveTo(hx, hy);
            ctx.lineTo(hx - 8 * Math.cos(th - 0.4), hy - 8 * Math.sin(th - 0.4));
            ctx.lineTo(hx - 8 * Math.cos(th + 0.4), hy - 8 * Math.sin(th + 0.4));
            ctx.closePath(); ctx.fill();
        }
    }, []);

    // 시뮬레이션 루프
    useEffect(() => {
        let mounted = true;
        const loop = () => {
            if (!mounted) return;
            const sim = simRef.current;
            const m = modeRef.current, Q = qRef.current, amp = ampRef.current;

            if (playRef.current) {
                // 토크 → 각속도 적분
                const dir = m === 'spray' ? 1 : -1;                       // 흡입은 반대
                const ratio = m === 'spray' ? 1 : REV_RATIO * (amp ? 50 : 1);
                const tau = dir * K_TQ * Q * Q * ratio;
                sim.omega += ((tau - C_DAMP * sim.omega) / I_ROT) * DT;
                sim.phi += sim.omega * DT;
                if (sim.phi > Math.PI * 2) sim.phi -= Math.PI * 2;
                if (sim.phi < 0) sim.phi += Math.PI * 2;

                // 파티클 생성
                sim.spawn += Q * 0.9;
                const parts = partsRef.current;
                while (sim.spawn >= 1) {
                    sim.spawn -= 1;
                    const k = Math.random() < 0.5 ? 0 : 1;
                    const g = armGeom(sim.phi, k);
                    if (m === 'spray') {
                        // 노즐 입구에서 배출 방향으로 분출 + 팔 끝 속도 캐리
                        const jet = 150 * Q;
                        const carry = sim.omega * ARM_L;
                        parts.push({
                            x: g.mouthx, y: g.mouthy,
                            vx: g.ex * jet + (-g.sa) * carry,
                            vy: g.ey * jet + (g.ca) * carry,
                            r: 2 + Math.random() * 1.6, life: 1, phase: 'out',
                        });
                    } else if (parts.length < 240) {
                        // 저수지 바깥에서 노즐 입구를 향해 빨려 들어옴
                        const spread = (Math.random() - 0.5) * 0.5;
                        const dx = g.ex * Math.cos(spread) - g.ey * Math.sin(spread);
                        const dy = g.ex * Math.sin(spread) + g.ey * Math.cos(spread);
                        const dist = ARM_L * 0.55 + Math.random() * 40;
                        parts.push({
                            x: g.mouthx + dx * dist, y: g.mouthy + dy * dist,
                            vx: 0, vy: 0, r: 2 + Math.random() * 1.6, life: 1,
                            phase: 'seek', arm: k,
                        });
                    }
                }

                // 파티클 갱신
                const sparks = sparkRef.current;
                for (let i = parts.length - 1; i >= 0; i--) {
                    const p = parts[i];
                    if (p.phase === 'out') {
                        p.x += p.vx * DT; p.y += p.vy * DT;
                        p.life -= DT * 0.9;
                        const d = Math.hypot(p.x - CX, p.y - CY);
                        if (p.life <= 0 || d > ARM_L + NOZ + 30) parts.splice(i, 1);
                    } else {
                        // 흡입: 노즐 입구 → 중심 챔버로 seek
                        const g = armGeom(sim.phi, p.arm);
                        const tx = p.phase === 'seek' ? g.mouthx : CX;
                        const ty = p.phase === 'seek' ? g.mouthy : CY;
                        const dx = tx - p.x, dy = ty - p.y;
                        const dd = Math.hypot(dx, dy) || 1;
                        const spd = (120 + 60 * Q);
                        p.x += (dx / dd) * spd * DT;
                        p.y += (dy / dd) * spd * DT;
                        if (p.phase === 'seek' && dd < 10) p.phase = 'core';
                        if (p.phase === 'core' && dd < HUB_R * 0.7) {
                            // 챔버에서 충돌 → 스파크
                            if (sparks.length < 60) {
                                sparks.push({ x: CX + (Math.random() - 0.5) * 12, y: CY + (Math.random() - 0.5) * 12, r: 2 + Math.random() * 2, life: 0.8 });
                            }
                            parts.splice(i, 1);
                        }
                    }
                }
                for (let i = sparks.length - 1; i >= 0; i--) {
                    sparks[i].life -= DT * 1.6;
                    sparks[i].r += DT * 6;
                    if (sparks[i].life <= 0) sparks.splice(i, 1);
                }

                sim.frame = (sim.frame || 0) + 1;
                if (sim.frame % 4 === 0) setOmegaDisp(sim.omega);
            }

            draw();
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => { mounted = false; cancelAnimationFrame(rafRef.current); };
    }, [draw]);

    useEffect(() => {
        if (canvasRef.current) { canvasRef.current.width = CV; canvasRef.current.height = CV; }
    }, []);

    // 모드 전환 시 파티클/스파크 정리(잔상 방지)
    const switchMode = (next) => {
        if (next === mode) return;
        partsRef.current = [];
        sparkRef.current = [];
        setMode(next);
    };

    const degPerSec = omegaDisp * 180 / Math.PI;
    const spinning = Math.abs(degPerSec) > 1.2;
    const spinWord = !spinning ? '거의 정지' : (omegaDisp > 0 ? '시계 반대 방향' : '시계 방향');
    const ratioPct = mode === 'spray' ? 100 : (amplify ? 100 : 2);

    const state = mode === 'spray' ? 'spray' : (amplify ? 'amp' : 'suck');
    const VERDICT = {
        spray: '분사 — 뿜어낸 물의 반작용으로 스프링클러가 힘차게 정방향으로 돈다.',
        suck: '흡입 — 정방향의 "반대"로, 그러나 약 50배 느려 거의 멈춘 듯 보인다. (×50 증폭을 켜 보라)',
        amp: '흡입 ×50 증폭 — 숨어 있던 미세 회전을 50배로 키우니, 정방향을 거울처럼 뒤집은 회전이 드러난다.',
    };

    return (
        <LabShell
            title="REVERSE SPRINKLER"
            eyebrow="feynman's sprinkler · which way does it spin when it sucks?"
            subtitle={'// 물을 뿜으면 뒤로 돈다. 그럼 빨아들이면? — 직관을 배신하는 파인만의 스프링클러'}
            path="reverse-sprinkler.exe"
        >
            <section className="k-win rs-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">/feynman/</span>sprinkler</span>
                    <span className="meta k-mono">Iω̇ = τ − c·ω · 흡입은 정방향의 반대, ≈1/50 배</span>
                </div>

                <div className="rs-stage">
                    <div className="rs-view-col">
                        <div className={`rs-screen rs-${mode}`}>
                            <canvas ref={canvasRef} className="rs-canvas" />
                        </div>

                        <div className="rs-seg" role="group" aria-label="동작 모드">
                            <button type="button"
                                className={`rs-seg-btn ${mode === 'spray' ? 'on' : ''}`}
                                onClick={() => switchMode('spray')}>
                                💧 분사 (밀어내기)
                            </button>
                            <button type="button"
                                className={`rs-seg-btn ${mode === 'suck' ? 'on' : ''}`}
                                onClick={() => switchMode('suck')}>
                                🌀 흡입 (빨아들이기)
                            </button>
                        </div>

                        <div className="rs-sliders">
                            <label className="rs-slider">
                                <span className="rs-slider-lab k-mono">유량 Q <b>{q.toFixed(2)}</b></span>
                                <input type="range" min="0.2" max="1.5" step="0.01" value={q}
                                    onChange={(e) => setQ(parseFloat(e.target.value))} />
                                <span className="rs-slider-foot k-mono">물이 드나드는 세기 (토크 ∝ Q²)</span>
                            </label>
                            <label className={`rs-check ${mode !== 'suck' ? 'off' : ''}`}>
                                <input type="checkbox" checked={amplify} disabled={mode !== 'suck'}
                                    onChange={(e) => setAmplify(e.target.checked)} />
                                <span className="k-mono">흡입 회전 ×50 증폭 <b>{mode === 'suck' ? (amplify ? 'ON' : 'off') : '—'}</b></span>
                            </label>
                        </div>

                        <p className="rs-view-foot k-mono">
                            <b>분사</b>는 반작용으로 힘차게 돌지만, <b>흡입</b>은 방향이 <b>반대</b>이면서
                            약 <b>50배</b> 느리다 · 그 미세 회전을 보려면 <b>×50 증폭</b>을 켜라
                        </p>
                    </div>

                    <div className="rs-right">
                        <div className={`rs-amp rs-${mode}`}>
                            <span className="rs-amp-lab k-mono">회전 속도 (°/s)</span>
                            <span className="rs-amp-num">{degPerSec >= 0 ? '+' : ''}{degPerSec.toFixed(1)}</span>
                            <span className="rs-amp-sub k-mono">{spinWord}</span>
                        </div>

                        <div className="rs-stats">
                            <div className="rs-stat">
                                <span className="rs-stat-lab k-mono">동작</span>
                                <span className="rs-stat-num k-mono">{mode === 'spray' ? '분사' : '흡입'}</span>
                                <span className="rs-stat-foot k-mono">{mode === 'spray' ? 'push out' : 'suck in'}</span>
                            </div>
                            <div className="rs-stat">
                                <span className="rs-stat-lab k-mono">정방향 대비</span>
                                <span className="rs-stat-num k-mono">{ratioPct}%</span>
                                <span className="rs-stat-foot k-mono">{mode === 'suck' && !amplify ? '≈ 1/50 배' : mode === 'suck' ? '×50 증폭' : '기준'}</span>
                            </div>
                        </div>

                        <div className="rs-meter">
                            <div className="rs-meter-track">
                                <div className="rs-meter-mid" />
                                <div className={`rs-meter-fill rs-${mode}`}
                                    style={{
                                        width: `${Math.min(50, Math.abs(degPerSec) / 2)}%`,
                                        left: omegaDisp >= 0 ? '50%' : undefined,
                                        right: omegaDisp < 0 ? '50%' : undefined,
                                    }} />
                            </div>
                            <span className="rs-meter-foot k-mono">← 시계 방향 · 시계 반대 →</span>
                        </div>

                        <div className={`rs-verdict rs-${state}`}>
                            <p className="rs-verdict-txt">{VERDICT[state]}</p>
                        </div>

                        <div className="rs-actions">
                            <button type="button" className="rs-btn rs-btn-hot" onClick={() => setPlaying((p) => !p)}>
                                {playing ? '⏸ 정지' : '▶ 재생'}
                            </button>
                            <button type="button" className="rs-btn rs-btn-ghost" onClick={reset}>↻ 리셋</button>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win rs-foot-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="rs-foot">
                    <p>
                        {'잔디 스프링클러는 물을 '}<b>{'뿜으면'}</b>{' 노즐 반대편으로 빙글빙글 돈다 — 뿜어낸 물의 '}
                        <b>{'반작용'}</b>{'이다. 여기서 물리학자 리처드 파인만이 던진 짓궂은 질문: 그렇다면 스프링클러를 '}
                        {'물속에 넣고 반대로 '}<b>{'빨아들이면'}</b>{' 어느 쪽으로 돌까? "빨려 들어가는 쪽으로 돌 것"이라는 '}
                        {'직관과, "반대로 돌 것", "아예 안 돌 것"이라는 주장이 수십 년간 맞섰다. 정작 파인만 본인의 실험은 '}
                        {'실패로 끝났다.'}
                    </p>
                    <p>
                        {'최근에야 정밀 실험과 수학 모형으로 답이 정리됐다: 빨아들이는 스프링클러는 '}
                        <b>{'정방향의 반대로, 그러나 약 50배 느리게'}</b>{' 돈다. 뿜을 때와 빨 때가 대칭이 아닌 이유는 '}
                        {'물줄기가 흐르는 '}<b>{'안쪽'}</b>{'에 있다. 빨아들인 두 물줄기는 팔을 타고 들어와 '}
                        <b>{'중심 챔버'}</b>{'에서 서로 '}<b>{'충돌'}</b>{'한다 — 밖으로 밀어내는 로켓을 안팎으로 뒤집은 '}
                        {'"뒤집힌 로켓"인 셈이다. 그 충돌로 상쇄되고 남은 미세한 운동량 불균형만이 아주 약한 회전을 남긴다.'}
                    </p>
                    <p>
                        {'이 실험은 그 구조를 '}<b>{'Iω̇ = τ − c·ω'}</b>{' 한 줄로 압축했다. 분사는 '}
                        <b>{'τ = +K·Q²'}</b>{'(정방향), 흡입은 '}<b>{'τ = −K·Q²·(1/50)'}</b>{'(반대·미약). '}
                        {'유량 Q 를 키우면 물줄기 속도가 빨라져(v∝Q) 운동량 플럭스가 '}<b>{'Q²'}</b>{'로 커지므로 회전이 급격히 '}
                        {'세진다. 오른쪽 계기의 화살표(← 시계 · 시계 반대 →)를 보라 — 분사와 흡입에서 채워지는 쪽이 '}
                        <b>{'정반대'}</b>{'다.'}
                    </p>
                    <p>
                        {'직접 만져보라. '}<b>{'분사'}</b>{'로 힘차게 돌려 방향을 눈에 익힌 뒤 '}<b>{'흡입'}</b>{'으로 바꾸면 '}
                        {'바늘이 반대편으로 넘어가지만 거의 움직이지 않는다. 여기서 '}<b>{'×50 증폭'}</b>{'을 켜면 숨어 있던 '}
                        {'미세 회전이 정방향을 '}<b>{'거울처럼 뒤집은'}</b>{' 모습으로 또렷이 드러난다. 로켓 추진·펌프·터빈이 '}
                        {'모두 공유하는, "운동량은 뿜을 때와 빨아들일 때가 대칭이 아니다"라는 그 원형이 여기 있다.'}
                    </p>
                    <p className="rs-disclaimer">
                        {'* 감쇠 회전 운동으로 단순화한 개념 데모입니다. 흡입/분사 회전비(≈1/50)는 실측을 본뜬 고정값이며, '}
                        {'노즐 형상·점성·난류·챔버 내부 유동 등 실제 세부는 생략했습니다. 회전 방향의 절대 부호는 노즐이 '}
                        {'꺾인 방향에 따른 연출입니다 — 핵심은 "분사와 흡입이 서로 반대, 흡입이 훨씬 약하다"는 관계입니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default ReverseSprinkler;
