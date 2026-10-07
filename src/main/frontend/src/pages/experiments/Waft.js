import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Waft.css';

// WAFT — 연기를 저어 빚는 향 (감각 × 생성기 × 포인터 궤적 × 60초 안에 끝나는 경험).
//   소재: 냄새 — 화면에 담기 가장 어려운 감각. 그걸 "연기를 손으로 젓는" 제스처로 바꿔 향(香) 하나를 빚는다.
//   형식: 생성기 — 어떻게 저었는가(궤적)가 입력, 향 카드(이름·노트·느낌)가 결과물로 튀어나온다.
//   기술: 포인터 궤적 — 피어오르는 연기를 손이 지나간 자리로 끌고, 궤적의 빠르기·높이·누적이 향을 결정한다.
//   제약: 60초 안에 끝나는 경험 — 향 한 대가 타는 동안(약 30초)만 저을 수 있다. 숫자 타이머 대신 줄어드는 향대가 시간을 말한다.
//
//   도전: 손짓을 "그럴듯한 냄새"로 번역하기. 빠르고 흔들리게 저으면 알싸·청신, 느리고 낮게 저으면 묵직·따뜻,
//         높이 저으면 꽃·시트러스처럼 — 궤적의 통계를 향 계열에 사상(寫像)해, 같은 손짓이면 같은 향이 나오게 결정론으로 묶었다.
//         연기가 손을 따라오는 느낌과, 그렇게 모인 손짓이 "우연이 아니라 내가 빚은 향"으로 읽히느냐가 관건.

const BURN_MS = 30000;   // 향 한 대가 타는 시간(≈30초) — 전체 경험은 60초 안에 끝난다
const N = 56;            // 연기 입자 수(DOM)
const TOP_F = 0.13;      // 향대 머리(불붙는 끝) 높이 비율
const BOT_F = 0.82;      // 향대 밑동(향로) 높이 비율
const PUSH_R = 150;      // 손이 연기를 끄는 반경(px)

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hh = (x) => Math.abs(Math.round(x * 997.3));

// 향 계열 — 궤적 두 축(airy=얼마나 높이 저었나, sharp=얼마나 빠르고 날카롭게 저었나)으로 넷 중 하나.
const FAM = {
    fresh: {
        label: '청신(淸新)', hue: 47, scene: '비 갠 아침 마당',
        names: ['새벽 유자', '비 갠 마당', '풋귤 바람', '선선한 숲길'],
        top: ['유자 껍질', '베르가못', '풋 라임', '청귤'],
        heart: ['제라늄', '여린 바질', '백리향', '물빛 민트'],
        base: ['젖은 돌', '삼나무 결', '흰 머스크', '비 온 흙'],
    },
    floral: {
        label: '화(華)', hue: 27, scene: '꽃이 핀 창가',
        names: ['창가의 꽃', '분 바른 저녁', '목련 그늘', '연한 살구'],
        top: ['배꽃', '프리지아', '은목서', '복숭아 솜털'],
        heart: ['장미 한 겹', '자스민', '수련', '모란'],
        base: ['고운 분', '흰 머스크', '아이리스 뿌리', '살구씨'],
    },
    smoky: {
        label: '훈(熏)', hue: 14, scene: '향불 사른 방',
        names: ['묵은 향불', '알싸한 저녁', '마른 장작', '검은 계피'],
        top: ['후추 알', '정향', '말린 귤피', '생강'],
        heart: ['계피', '유향', '마른 장작', '낡은 가죽'],
        base: ['자작 타르', '침향', '탄 설탕', '담뱃잎'],
    },
    woody: {
        label: '온(溫)', hue: 35, scene: '오래된 나무 서랍',
        names: ['오래된 서랍', '해 질 녘 나무', '따뜻한 재', '묵은 책'],
        top: ['마른 건초', '바랜 종이', '볕 쬔 나무', '마른 이끼'],
        heart: ['백단', '시더', '통카 콩', '마른 풀'],
        base: ['머스크', '앰버', '바닐라 꼬투리', '낡은 책장'],
    },
};

// 궤적 누적치 → 향 카드. 같은 손짓이면 같은 향(결정론).
const blend = (acc) => {
    const n = Math.max(acc.n, 1);
    const speed = acc.sSum / n;                 // 평균 빠르기(px/ms)
    const height = clamp(acc.hSum / n, 0, 1);    // 평균 높이(위=1)
    const lr = acc.lr / n;                       // 좌우 치우침(-0.5..0.5)
    const path = acc.path;                       // 총 저은 거리(px)

    const sharp = clamp(speed / 0.95, 0, 1);
    const airy = height;
    const activity = clamp(path / 3600, 0, 1);

    // 거의 젓지 않았다면 — 연기만 번진 '무위'의 향
    if (path < 140 || acc.n < 8) {
        return {
            fam: FAM.woody, name: '무위(無爲)',
            top: '그을음', heart: '마른 재', base: '식은 향로',
            feel: '손대지 않아 연기만 번진 냄새', level: 0, hue: 35,
        };
    }

    const key = airy >= 0.5
        ? (sharp >= 0.5 ? 'fresh' : 'floral')
        : (sharp >= 0.5 ? 'smoky' : 'woody');
    const fam = FAM[key];

    const ia = hh(speed * 131.1 + lr * 17);
    const ib = hh(height * 177.7 + 5);
    const ic = hh((lr + 0.5) * 151.3 + 9);
    const id = hh(activity * 113.9 + path * 0.013 + 3);

    const level = activity < 0.34 ? 1 : activity < 0.72 ? 2 : 3;
    const word = level === 1 ? '아스라이' : level === 2 ? '또렷하게' : '짙게';

    return {
        fam,
        name: fam.names[ia % fam.names.length],
        top: fam.top[ib % fam.top.length],
        heart: fam.heart[ic % fam.heart.length],
        base: fam.base[id % fam.base.length],
        feel: `${word} ${fam.scene}에 든 냄새`,
        level,
        hue: fam.hue,
    };
};

const Waft = () => {
    const [phase, setPhase] = useState('idle');   // idle | burn | card
    const [card, setCard] = useState(null);
    const [round, setRound] = useState(0);

    const wrapRef = useRef(null);
    const stageRef = useRef(null);
    const spans = useRef([]);

    // 런타임 — 프레임마다 바뀌므로 ref 로만 들고, 렌더는 phase/card 로만 한다.
    const g = useRef({
        phase: 'idle',
        start: 0,
        W: 0, H: 0,
        rect: null,
        parts: [],                                  // {x,y,age,max,sx,seed}
        ptr: { x: 0, y: 0, vx: 0, vy: 0, px: 0, py: 0, last: -9999, inside: false },
        acc: { sSum: 0, hSum: 0, lr: 0, path: 0, n: 0 },
    });
    useEffect(() => { g.current.phase = phase; }, [phase]);

    const emberXY = (p) => {
        const { W, H } = g.current;
        return { x: W * 0.5, y: H * TOP_F + p * (H * BOT_F - H * TOP_F) };
    };

    const resetParts = useCallback(() => {
        const gc = g.current;
        const e = emberXY(0);
        gc.parts = Array.from({ length: N }, (_, i) => ({
            x: e.x, y: e.y, age: Math.random() * 1.4, max: 1.1 + Math.random() * 1.6,
            sx: (Math.random() - 0.5) * 0.6, seed: Math.random() * 7,
        }));
    }, []);

    const light = useCallback(() => {
        const gc = g.current;
        gc.acc = { sSum: 0, hSum: 0, lr: 0, path: 0, n: 0 };
        gc.start = performance.now();
        resetParts();
        setCard(null);
        setRound((r) => r + 1);
        setPhase('burn');
    }, [resetParts]);

    // 포인터 — 연기를 끌고, 궤적을 누적한다.
    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return undefined;

        const measure = () => {
            const r = stage.getBoundingClientRect();
            g.current.rect = r;
            g.current.W = r.width;
            g.current.H = r.height;
        };
        measure();
        window.addEventListener('resize', measure);

        const move = (cx, cy) => {
            const gc = g.current;
            const r = gc.rect;
            if (!r) return;
            const x = cx - r.left;
            const y = cy - r.top;
            const now = performance.now();
            const p = gc.ptr;
            const dx = x - p.x;
            const dy = y - p.y;
            p.vx = p.vx * 0.5 + dx * 0.5;
            p.vy = p.vy * 0.5 + dy * 0.5;
            p.px = p.x; p.py = p.y;
            p.x = x; p.y = y;
            p.last = now;
            p.inside = true;

            if (gc.phase === 'burn') {
                const d = Math.hypot(dx, dy);
                if (d > 0.6) {
                    const dt = 16; // 이동 간격 근사(px/ms 스케일 고정)
                    gc.acc.sSum += d / dt;
                    gc.acc.hSum += clamp(1 - y / gc.H, 0, 1);
                    gc.acc.lr += clamp(x / gc.W - 0.5, -0.5, 0.5);
                    gc.acc.path += d;
                    gc.acc.n += 1;
                }
            }
        };
        const onPM = (e) => move(e.clientX, e.clientY);
        const onLeave = () => { g.current.ptr.inside = false; };

        stage.addEventListener('pointermove', onPM);
        stage.addEventListener('pointerleave', onLeave);
        return () => {
            window.removeEventListener('resize', measure);
            stage.removeEventListener('pointermove', onPM);
            stage.removeEventListener('pointerleave', onLeave);
        };
    }, []);

    // 렌더 루프 — 연기 입자를 DOM transform 으로 움직인다(물리 시뮬이 아니라 포인터 궤적에 반응하는 연무).
    useEffect(() => {
        let raf = 0;
        let prev = performance.now();
        const step = (now) => {
            const gc = g.current;
            const dt = Math.min(0.05, (now - prev) / 1000);
            prev = now;

            let p = 0;
            if (gc.phase === 'burn') {
                p = (now - gc.start) / BURN_MS;
                if (p >= 1) {
                    p = 1;
                    setCard(blend(gc.acc));
                    setPhase('card');
                }
            }
            if (wrapRef.current) wrapRef.current.style.setProperty('--p', p.toFixed(4));

            // 손 속도 감쇠(안 움직이면 연기를 끄는 힘도 사그라듦)
            const ptr = gc.ptr;
            const fresh = gc.phase === 'burn' && ptr.inside && (now - ptr.last) < 90;
            if (!fresh) { ptr.vx *= 0.86; ptr.vy *= 0.86; }

            const ember = emberXY(gc.phase === 'card' ? 1 : p);
            const burning = gc.phase === 'burn';

            for (let i = 0; i < gc.parts.length; i += 1) {
                const q = gc.parts[i];
                const el = spans.current[i];
                if (!el) continue;

                q.age += dt;
                // 부력(위로) + 나이들며 가속 + 좌우 흔들림
                q.y -= (34 + q.age * 26) * dt;
                q.x += Math.sin(now * 0.001 + q.seed) * 10 * dt + q.sx;

                // 손이 지나간 자리로 연기를 끈다(포인터 궤적)
                if (fresh) {
                    const ddx = q.x - ptr.x;
                    const ddy = q.y - ptr.y;
                    const dist = Math.hypot(ddx, ddy);
                    if (dist < PUSH_R) {
                        const k = (1 - dist / PUSH_R);
                        q.x += ptr.vx * k * 0.6;
                        q.y += ptr.vy * k * 0.6;
                    }
                }

                // 수명 끝 or 화면 위로 벗어나면 불씨에서 재생
                if (q.age > q.max || q.y < gc.H * 0.02) {
                    q.x = ember.x + (Math.random() - 0.5) * 6;
                    q.y = ember.y;
                    q.age = 0;
                    q.max = 1.1 + Math.random() * 1.6;
                    q.sx = (Math.random() - 0.5) * 0.6;
                }

                const lifeN = q.age / q.max;
                const fade = Math.sin(Math.min(lifeN, 1) * Math.PI);     // 피어올랐다 사그라듦
                const op = burning ? clamp(fade * 0.5, 0, 0.5) : clamp(fade * 0.22, 0, 0.22);
                const scale = 0.5 + lifeN * 2.3;
                el.style.opacity = op.toFixed(3);
                el.style.transform = `translate(${q.x.toFixed(1)}px, ${q.y.toFixed(1)}px) scale(${scale.toFixed(2)})`;
            }

            raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, []);

    const cap = phase === 'idle' ? '향 한 대' : phase === 'burn' ? '저어 보라' : '한 향';
    const hint = phase === 'idle'
        ? '불을 붙이고, 피어오르는 연기를 손으로 저어라'
        : phase === 'burn'
            ? '향대가 다 타기 전까지 — 빠르게·느리게, 높이·낮게 저어 향을 빚는다'
            : '다시 붙이면 손짓대로 다른 향이 맺힌다';

    const dots = card ? '•'.repeat(card.level) + '◦'.repeat(3 - card.level) : '';

    return (
        <LabShell
            title="Waft"
            subtitle="연기를 저어 빚는 향 — 손짓이 곧 냄새가 된다"
            eyebrow="scent · smoke trail · 30s"
            path="waft"
        >
            <div className={`waft-wrap ph-${phase}`} ref={wrapRef} data-round={round}>
                <span className="waft-cap k-mono">{cap}</span>

                <div className="waft-stage" ref={stageRef} aria-label="연기를 저어 향 빚기">
                    <div className="waft-stick" aria-hidden="true">
                        <i className="waft-ember" />
                    </div>

                    <div className="waft-smoke" aria-hidden="true">
                        {Array.from({ length: N }, (_, i) => (
                            <span
                                key={i}
                                className="waft-p"
                                ref={(el) => { spans.current[i] = el; }}
                            />
                        ))}
                    </div>

                    {phase === 'idle' && (
                        <button type="button" className="waft-light" onClick={light}>
                            불 붙이기
                        </button>
                    )}

                    {phase === 'card' && card && (
                        <div
                            key={`c-${round}`}
                            className="waft-card"
                            style={{ '--hue': card.hue }}
                        >
                            <span className="wc-label k-mono">{card.fam.label}</span>
                            <strong className="wc-name">{card.name}</strong>
                            <span className="wc-level k-mono" aria-label={`세기 ${card.level}단계`}>{dots}</span>
                            <ul className="wc-notes">
                                <li><span className="k-mono">탑</span>{card.top}</li>
                                <li><span className="k-mono">하트</span>{card.heart}</li>
                                <li><span className="k-mono">베이스</span>{card.base}</li>
                            </ul>
                            <p className="wc-feel">{card.feel}</p>
                            <button type="button" className="waft-again" onClick={light}>다시 붙이기</button>
                        </div>
                    )}
                </div>

                <p className="waft-hint">{hint}</p>
            </div>
        </LabShell>
    );
};

export default Waft;
