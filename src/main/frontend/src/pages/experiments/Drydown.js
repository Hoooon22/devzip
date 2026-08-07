import React, { useEffect, useMemo, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Drydown.css';

// DRYDOWN — 향의 시간 전개(탑·미들·베이스 노트). 여러 향을 겹쳐 뿌리는 "스캔트 스태킹(scent stacking)"
//   유행의 밑바탕에 있는 보편 현상: 향 분자마다 휘발 속도(증기압)가 달라 시간이 지나며 다른 향이 드러난다.
// 핵심 모델(차등 휘발):
//   향료 i 를 a_i 방울 담으면 피부 위 잔량은 m_i(t)=a_i·e^(−k_i·t) 로 지수 감소한다(k_i ∝ 휘발성).
//   코가 느끼는 세기 ≈ 증발 플럭스 f_i(t) = −dm/dt = a_i·k_i·e^(−k_i·t)  (여기에 향의 세기 power 를 곱한다).
//   k 가 큰 향(탑)은 처음엔 강하지만 금세 사라지고, k 가 작은 향(베이스)은 약해도 오래 남는다.
//   → 탑→미들→베이스로 이어지는 "향의 피라미드"가 휘발 속도 차이만으로 저절로 나타난다.
//   전체 방출량 ∫f dt = a_i·power_i 로 보존(뿌린 만큼만 증발) — 물리적으로 자연스럽다.

const TMAX = 720;            // 전개 관측 구간(분) = 12시간
const SPEED = 36;            // 재생 속도: 실초당 진행하는 향-분(min) → 한 바퀴 ≈ 20초
const GAMMA = 2.3;           // x축 비선형 매핑(초반 몇 분을 넓게 펴서 탑 노트를 보이게)
const SW = 620, SH = 300;
const PADL = 8, PADR = 8, PADT = 12, PADB = 22;

// 향료 팔레트 — 휘발 반감기(hl, 분)로 탑/미들/베이스가 갈린다. power 는 단위량당 향의 세기.
const NOTES = [
    { id: 'lemon', ko: '레몬', cat: 'top', hl: 7, power: 0.95, hint: '날카로운 시트러스' },
    { id: 'bergamot', ko: '베르가못', cat: 'top', hl: 9, power: 0.95, hint: '상큼한 시트러스' },
    { id: 'grapefruit', ko: '자몽', cat: 'top', hl: 12, power: 0.9, hint: '쌉싸름한 시트러스' },
    { id: 'lavender', ko: '라벤더', cat: 'heart', hl: 40, power: 1.0, hint: '허브·아로마틱' },
    { id: 'jasmine', ko: '재스민', cat: 'heart', hl: 60, power: 1.05, hint: '화이트 플로럴' },
    { id: 'rose', ko: '장미', cat: 'heart', hl: 72, power: 1.0, hint: '플로럴' },
    { id: 'vanilla', ko: '바닐라', cat: 'base', hl: 260, power: 1.1, hint: '스위트·구르망' },
    { id: 'sandalwood', ko: '샌달우드', cat: 'base', hl: 320, power: 1.15, hint: '우디' },
    { id: 'amber', ko: '앰버', cat: 'base', hl: 420, power: 1.2, hint: '웜·레진' },
    { id: 'musk', ko: '머스크', cat: 'base', hl: 600, power: 1.5, hint: '고정제(픽서티브)' },
];

const CATS = {
    top: { ko: '탑', en: 'top', color: '195,224,74' },      // 라임(시트러스)
    heart: { ko: '미들', en: 'heart', color: '229,138,162' }, // 로즈(플로럴)
    base: { ko: '베이스', en: 'base', color: '224,165,63' },  // 앰버(웜)
};

const TICKS = [
    { t: 1, l: '1분' }, { t: 10, l: '10분' }, { t: 60, l: '1시간' },
    { t: 180, l: '3시간' }, { t: 360, l: '6시간' }, { t: 720, l: '12시간' },
];

const PRESETS = {
    citrus: { label: '시트러스 코롱', drops: { lemon: 4, bergamot: 3, grapefruit: 2, lavender: 1 } },
    floral: { label: '플로럴 부케', drops: { bergamot: 2, rose: 4, jasmine: 3, sandalwood: 2 } },
    amber: { label: '우디 앰버', drops: { bergamot: 1, sandalwood: 4, amber: 4, vanilla: 2, musk: 3 } },
    stack: { label: '레이어링(스택)', drops: { bergamot: 3, lemon: 1, rose: 2, jasmine: 2, vanilla: 2, amber: 2, musk: 2 } },
};

const fmtTime = (m) => {
    if (m < 1) return '0분';
    if (m < 60) return `${Math.round(m)}분`;
    const h = Math.floor(m / 60), mm = Math.round(m % 60);
    return mm ? `${h}시간 ${mm}분` : `${h}시간`;
};

const Drydown = () => {
    const canvasRef = useRef(null);
    const [drops, setDrops] = useState(() => ({ ...PRESETS.stack.drops }));
    const [tNow, setTNow] = useState(0);
    const [playing, setPlaying] = useState(true);

    // 담긴 향료만 추려 계수를 미리 계산: coef_i = a_i·power_i·k_i, k_i = ln2/hl
    const active = useMemo(() => NOTES
        .filter((n) => (drops[n.id] || 0) > 0)
        .map((n) => {
            const a = drops[n.id];
            const k = Math.LN2 / n.hl;
            return { ...n, a, k, coef: a * n.power * k };
        }), [drops]);

    // 시각 t 에서 카테고리별 증발 플럭스 합
    const fluxSums = (t) => {
        let top = 0, heart = 0, base = 0;
        for (let i = 0; i < active.length; i++) {
            const n = active[i];
            const f = n.coef * Math.exp(-n.k * t);
            if (n.cat === 'top') top += f;
            else if (n.cat === 'heart') heart += f;
            else base += f;
        }
        return { top, heart, base };
    };

    // 전 구간 최대 세기(잔향 세기 정규화용)
    const smax = useMemo(() => {
        let m = 0;
        for (let t = 0; t <= TMAX; t += 3) {
            const s = fluxSums(t);
            const tot = s.top + s.heart + s.base;
            if (tot > m) m = tot;
        }
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    // 현재 시각의 상태(오른쪽 계기판)
    const now = useMemo(() => {
        let top = 0, heart = 0, base = 0, domNote = null, domF = -1;
        active.forEach((n) => {
            const f = n.coef * Math.exp(-n.k * tNow);
            if (n.cat === 'top') top += f;
            else if (n.cat === 'heart') heart += f;
            else base += f;
            if (f > domF) { domF = f; domNote = n; }
        });
        const total = top + heart + base;
        const phase = total <= 0 ? null
            : (top >= heart && top >= base ? 'top' : (heart >= base ? 'heart' : 'base'));
        return { top, heart, base, total, phase, domNote };
    }, [active, tNow]);

    // 재생 루프 — 시간 스크러버를 자동 전진(끝에서 처음으로 순환)
    useEffect(() => {
        if (!playing) return undefined;
        let raf = 0, last = null;
        const tick = (ts) => {
            if (last == null) last = ts;
            const dt = ts - last; last = ts;
            setTNow((prev) => {
                let nx = prev + (dt / 1000) * SPEED;
                if (nx > TMAX) nx = 0;
                return nx;
            });
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [playing]);

    useEffect(() => {
        if (canvasRef.current) { canvasRef.current.width = SW; canvasRef.current.height = SH; }
    }, []);

    // 캔버스: 시간축(비선형)에 따라 탑·미들·베이스 구성비 리본을 쌓고, 전체 세기로 밝기를 준다
    useEffect(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#17120c';
        ctx.fillRect(0, 0, SW, SH);

        const x0 = PADL, x1 = SW - PADR, y0 = PADT, y1 = SH - PADB;
        const w = x1 - x0, h = y1 - y0;
        const cols = Math.max(2, Math.floor(w));

        // 1패스: 각 열의 t 별 구성비·전체 세기, 최대 세기 파악
        let maxTot = 0;
        const data = new Array(cols);
        for (let j = 0; j < cols; j++) {
            const frac = j / (cols - 1);
            const t = TMAX * Math.pow(frac, GAMMA);
            const s = fluxSums(t);
            const tot = s.top + s.heart + s.base;
            data[j] = { s, tot };
            if (tot > maxTot) maxTot = tot;
        }

        // 2패스: 리본(구성비) — 아래부터 베이스→미들→탑, 밝기는 (전체세기/최대)로
        if (maxTot > 0) {
            for (let j = 0; j < cols; j++) {
                const { s, tot } = data[j];
                if (tot <= 0) continue;
                const x = x0 + j;
                const alpha = 0.30 + 0.70 * Math.pow(tot / maxTot, 0.5);
                const baseH = (s.base / tot) * h;
                const heartH = (s.heart / tot) * h;
                const topH = (s.top / tot) * h;
                let yb = y1;
                ctx.fillStyle = `rgba(${CATS.base.color},${alpha})`;
                ctx.fillRect(x, yb - baseH, 1.02, baseH + 0.6); yb -= baseH;
                ctx.fillStyle = `rgba(${CATS.heart.color},${alpha})`;
                ctx.fillRect(x, yb - heartH, 1.02, heartH + 0.6); yb -= heartH;
                ctx.fillStyle = `rgba(${CATS.top.color},${alpha})`;
                ctx.fillRect(x, yb - topH, 1.02, topH + 0.6);
            }
        }

        // x축 눈금·라벨
        ctx.font = '500 9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        TICKS.forEach(({ t, l }) => {
            const frac = Math.pow(t / TMAX, 1 / GAMMA);
            const x = x0 + frac * w;
            ctx.strokeStyle = 'rgba(230,220,200,0.14)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
            ctx.fillStyle = 'rgba(230,220,200,0.5)';
            ctx.fillText(l, x, SH - 7);
        });

        // 재생 헤드
        const pf = Math.pow(Math.min(tNow, TMAX) / TMAX, 1 / GAMMA);
        const px = x0 + pf * w;
        ctx.strokeStyle = '#f4ede0';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(px, y0 - 2); ctx.lineTo(px, y1 + 2); ctx.stroke();
        ctx.fillStyle = '#f4ede0';
        ctx.beginPath(); ctx.arc(px, y0 - 2, 3, 0, Math.PI * 2); ctx.fill();

        if (active.length === 0) {
            ctx.fillStyle = 'rgba(230,220,200,0.42)';
            ctx.font = '500 12px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.fillText('아래 팔레트에서 향료를 담아 나만의 블렌드를 만들어 보세요', SW / 2, SH / 2);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, tNow]);

    const addDrop = (id, delta) => {
        setDrops((prev) => {
            const cur = prev[id] || 0;
            const next = Math.max(0, Math.min(8, cur + delta));
            const copy = { ...prev };
            if (next === 0) delete copy[id]; else copy[id] = next;
            return copy;
        });
    };

    const shares = now.total > 0
        ? { top: now.top / now.total, heart: now.heart / now.total, base: now.base / now.total }
        : { top: 0, heart: 0, base: 0 };
    const proj = smax > 0 ? Math.round(100 * now.total / smax) : 0;

    const PHASE_TXT = {
        top: '탑 노트 — 뿌린 직후의 화사하고 가벼운 첫인상',
        heart: '미들(하트) 노트 — 향의 성격을 결정하는 중심',
        base: '베이스 노트 — 은은하게 오래 남는 잔향(드라이다운)',
    };
    const totalDrops = Object.values(drops).reduce((a, b) => a + b, 0);

    return (
        <LabShell
            title="DRYDOWN"
            eyebrow="differential volatility · scent pyramid"
            subtitle={'// 향을 겹쳐 뿌리면 왜 시간이 지날수록 다른 향이 피어오르는가 — 휘발 속도의 차이'}
            path="drydown.exe"
        >
            <section className="k-win dd-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/scent/</span>drydown</span>
                    <span className="meta k-mono">f(t) = a·k·e^(−k·t) · 휘발이 향을 시간순으로 벗겨낸다</span>
                </div>

                <div className="dd-stage">
                    <div className="dd-view-col">
                        <div className="dd-screen">
                            <canvas ref={canvasRef} className="dd-canvas" />
                        </div>

                        <div className="dd-legend">
                            {Object.entries(CATS).map(([key, c]) => (
                                <span key={key} className="dd-leg">
                                    <i style={{ background: `rgb(${c.color})` }} />
                                    <b>{c.ko}</b> 노트
                                </span>
                            ))}
                            <span className="dd-leg-note k-mono">세로=구성비 · 밝기=전체 향 세기 · 가로=경과(비선형)</span>
                        </div>

                        <div className="dd-scrub">
                            <button
                                type="button"
                                className="dd-btn dd-btn-hot"
                                onClick={() => setPlaying((p) => !p)}
                            >
                                {playing ? '⏸ 정지' : '▶ 재생'}
                            </button>
                            <input
                                type="range" min="0" max={TMAX} step="1" value={tNow}
                                onChange={(e) => { setPlaying(false); setTNow(parseFloat(e.target.value)); }}
                                className="dd-time"
                                aria-label="경과 시간"
                            />
                            <span className="dd-clock k-mono">{fmtTime(tNow)}</span>
                        </div>

                        <p className="dd-view-foot k-mono">
                            재생 헤드를 밀어 <b>뿌린 직후 → 몇 시간 뒤</b>로 이동해 보라 · 리본 위쪽(탑)이 먼저
                            사라지고 아래쪽 <b>베이스</b>만 오래 남는 것이 향의 <b>드라이다운</b>이다
                        </p>
                    </div>

                    <div className="dd-right">
                        <div className={`dd-now dd-${now.phase || 'none'}`}>
                            <span className="dd-now-lab k-mono">지금 피어나는 향</span>
                            <span className="dd-now-phase">
                                {now.phase ? CATS[now.phase].ko : '—'}
                            </span>
                            <span className="dd-now-note k-mono">
                                {now.domNote ? `주도: ${now.domNote.ko}` : '향료를 담아 주세요'}
                            </span>
                        </div>

                        <div className="dd-shares">
                            {['top', 'heart', 'base'].map((k) => (
                                <div key={k} className="dd-share">
                                    <span className="dd-share-lab k-mono">
                                        <i style={{ background: `rgb(${CATS[k].color})` }} />{CATS[k].ko}
                                    </span>
                                    <div className="dd-share-track">
                                        <div
                                            className="dd-share-fill"
                                            style={{ width: `${shares[k] * 100}%`, background: `rgb(${CATS[k].color})` }}
                                        />
                                    </div>
                                    <span className="dd-share-num k-mono">{Math.round(shares[k] * 100)}%</span>
                                </div>
                            ))}
                        </div>

                        <div className="dd-proj">
                            <span className="dd-proj-lab k-mono">잔향 세기 (실라주)</span>
                            <div className="dd-proj-track">
                                <div className="dd-proj-fill" style={{ width: `${proj}%` }} />
                            </div>
                            <span className="dd-proj-num k-mono">{proj}%</span>
                        </div>

                        <div className={`dd-verdict dd-${now.phase || 'none'}`}>
                            <p>{now.phase ? PHASE_TXT[now.phase] : '향료를 담으면 시간에 따른 향의 전개가 나타납니다.'}</p>
                        </div>

                        <div className="dd-presets">
                            <span className="dd-presets-lab k-mono">프리셋</span>
                            <div className="dd-presets-row">
                                {Object.entries(PRESETS).map(([key, p]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        className="dd-btn dd-btn-ghost"
                                        onClick={() => { setDrops({ ...p.drops }); setTNow(0); setPlaying(true); }}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    className="dd-btn dd-btn-ghost"
                                    onClick={() => { setDrops({}); setTNow(0); }}
                                >
                                    비우기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win dd-pal-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/scent/</span>palette</span>
                    <span className="meta k-mono">담은 방울 {totalDrops} · 휘발 반감기가 노트를 가른다</span>
                </div>
                <div className="dd-palette">
                    {NOTES.map((n) => {
                        const d = drops[n.id] || 0;
                        const c = CATS[n.cat];
                        return (
                            <div key={n.id} className={`dd-card${d > 0 ? ' on' : ''}`} style={{ '--c': `rgb(${c.color})` }}>
                                <div className="dd-card-top">
                                    <span className="dd-card-name">{n.ko}</span>
                                    <span className="dd-card-tag k-mono" style={{ color: `rgb(${c.color})` }}>{c.ko}</span>
                                </div>
                                <span className="dd-card-hint k-mono">{n.hint}</span>
                                <span className="dd-card-hl k-mono">휘발 반감기 {fmtTime(n.hl)}</span>
                                <div className="dd-card-ctl">
                                    <button type="button" className="dd-step" onClick={() => addDrop(n.id, -1)} aria-label={`${n.ko} 빼기`}>−</button>
                                    <span className="dd-card-drops k-mono">{d}</span>
                                    <button type="button" className="dd-step" onClick={() => addDrop(n.id, 1)} aria-label={`${n.ko} 담기`}>+</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="k-win dd-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="dd-foot">
                    <p>
                        여러 향수를 겹쳐 뿌려 나만의 향을 만드는 <b>스캔트 스태킹(scent stacking)</b>이 화제가 됐다.
                        특정 브랜드·제품이 아니라 그 밑바탕의 보편 현상 — <b>향 분자마다 증발하는 속도가 다르다</b> —
                        을 이 실험에 담았다. 향이 시간에 따라 얼굴을 바꾸는 이유가 바로 여기에 있다.
                    </p>
                    <p>
                        피부 위 향료 한 방울은 그대로 머무르지 않고 계속 공기 중으로 증발한다. 잔량은
                        <b> m(t) = a·e^(−k·t)</b> 로 줄어들고, 코가 느끼는 세기는 그 증발 속도
                        <b> f(t) = a·k·e^(−k·t)</b> 에 비례한다. 여기서 <b>k</b>(휘발성)가 클수록 초반엔 강하지만
                        금세 바닥나고, 작을수록 약해도 오래 버틴다. 향료마다 다른 이 k 하나가 향의 운명을 가른다.
                    </p>
                    <p>
                        그래서 향은 세 층으로 갈린다. <b>탑 노트</b>(시트러스처럼 k 가 큰 것)는 뿌린 직후 화사하게
                        터졌다가 몇 분 만에 사라지고, <b>미들(하트) 노트</b>(꽃 향)가 향의 성격을 지탱하며,
                        k 가 아주 작은 <b>베이스 노트</b>(앰버·머스크 같은 고정제)는 약하지만 몇 시간을 남아
                        마지막 인상을 만든다. 위 리본에서 위쪽(탑)이 먼저 걷히고 아래쪽(베이스)만 남는 흐름이
                        바로 <b>드라이다운</b>이다.
                    </p>
                    <p>
                        직접 담아 보라. 시트러스만 잔뜩 넣으면 <b>첫인상은 강렬해도 금방 날아가고</b>, 머스크·앰버를
                        더하면 <b>잔향이 길게 붙잡힌다</b>(고정제의 역할). 서로 다른 층의 향을 겹치는 것이 스태킹의
                        핵심이며, 좋은 향수가 늘 기대는 <b>휘발 속도의 설계</b>가 바로 그 원형이다.
                    </p>
                    <p className="dd-disclaimer">
                        * 각 향료를 단일 휘발상수 k(=ln2/반감기)의 1차 증발로 단순화한 개념 데모입니다. 실제 향은
                        여러 분자의 혼합이고, 상호작용·확산·피부 흡수·후각 순응·역치 등은 생략했습니다. 세기는
                        상대값이며 특정 제품의 지속력을 나타내지 않습니다.
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Drydown;
