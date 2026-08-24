import React, { useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Swelter.css';

// SWELTER — 잠 못 드는 열대야 파친코 뽑기 (뉴스·트렌드 × 생성기 × rAF 물리 × 스크롤 없이 한 화면).
//   소재: 2026년 8월, 입추가 지났는데도 밤 최저기온이 25°C 아래로 안 내려가는 열대야가 이어졌다.
//         특정 사건·인물이 아니라 "잠 못 드는 밤더위"라는 보편 현상을 뽑기로 옮겼다.
//   형식: 생성기 — 스윙하는 손잡이를 놓아 토큰을 떨어뜨리면, 결과(오늘 밤 처방 카드)가 튀어나온다.
//   기술: requestAnimationFrame 물리 — 손잡이는 스프링(단조화 진동), 토큰은 중력으로 떨어지며
//         못(고정 원)과 원-원 충돌로 튕긴다. 물리 라이브러리 없이 손으로 적분·충돌 처리한다.
//   제약: 스크롤 없이 한 화면 — 기계·손잡이·결과가 전부 한 화면 안에 들어온다.

// 논리 좌표(고정) — 캔버스는 이 좌표계로 그리고 CSS로만 확대/축소한다.
const LW = 360;
const LH = 540;

const BINS = 7;
const PEG_ROWS = 8;
const PEG_R = 4;
const BALL_R = 7;
const G = 900;              // 중력 (논리단위/s^2)
const REST = 0.55;          // 반발계수
const FRICT = 0.86;         // 접선 마찰
const BIN_TOP = 452;        // 이 아래로 내려가면 칸 영역
const FLOOR = 524;

// 7칸의 처방 — 가운데일수록 흔한(상식적) 처방, 가장자리일수록 극단적.
const OUTCOMES = [
    { emoji: '🌏', title: '지구 반대편 겨울', line: '정 안 되면 남반구의 한겨울을 상상하며 눈을 감아 본다.' },
    { emoji: '🌬️', title: '선풍기 벽 반사', line: '벽을 향해 돌려 실내 공기를 통째로 휘젓는다.' },
    { emoji: '🪟', title: '맞바람 길 트기', line: '반대편 창을 함께 열어 바람이 지나갈 길을 낸다.' },
    { emoji: '🧊', title: '얼린 물병 목덜미', line: '냉동실 물병을 수건에 싸 목덜미·손목에 댄다.' },
    { emoji: '🚿', title: '미지근한 샤워', line: '찬물 대신 미지근하게 — 체온을 서서히 내린다.' },
    { emoji: '🌙', title: '새벽 5시 산책', line: '하루 중 가장 시원한 새벽, 잠깐 걷고 돌아온다.' },
    { emoji: '🍧', title: '새벽 빙수 항복', line: '도저히 안 되면, 심야 빙수 한 그릇으로 항복.' },
];

const Swelter = () => {
    const canvasRef = useRef(null);
    const rafRef = useRef(0);
    const lastRef = useRef(0);
    const worldRef = useRef(null);
    const dropRef = useRef(() => {});

    const [result, setResult] = useState(null);   // 마지막으로 튀어나온 처방
    const [count, setCount] = useState(0);         // 지금까지 떨어뜨린 토큰 수

    // 못 밭·칸막이 기하를 한 번 만든다.
    const buildWorld = () => {
        const pegs = [];
        const top = 168;
        const gapY = 34;
        const gapX = 40;
        for (let r = 0; r < PEG_ROWS; r += 1) {
            const y = top + r * gapY;
            const off = (r % 2) * (gapX / 2);
            const n = 7;
            const rowW = (n - 1) * gapX;
            const x0 = (LW - rowW) / 2 + off - gapX / 4;
            for (let i = 0; i < n; i += 1) {
                const x = x0 + i * gapX;
                if (x > 18 && x < LW - 18) pegs.push({ x, y });
            }
        }
        // 칸막이 벽 x좌표
        const walls = [];
        for (let i = 0; i <= BINS; i += 1) walls.push((LW / BINS) * i);
        return {
            pegs,
            walls,
            active: [],   // 낙하 중 토큰
            piles: Array.from({ length: BINS }, () => []), // 각 칸에 쌓인 토큰
            drops: 0,
            swing: { t: 0 },
        };
    };

    // 손잡이(스프링/단조화 진동) 현재 위치·속도
    const dropperState = (t) => {
        const cx = LW / 2;
        const amp = 118;
        const w = 2.2;                          // 각진동수
        const x = cx + amp * Math.sin(w * t);
        const vx = amp * w * Math.cos(w * t);   // dx/dt
        return { x, vx, y: 96 };
    };

    // 토큰 하나 떨어뜨리기
    const spawn = () => {
        const wd = worldRef.current;
        if (!wd) return;
        const total = wd.active.length + wd.piles.reduce((s, p) => s + p.length, 0);
        if (total > 90) return; // 안전 상한
        const d = dropperState(wd.swing.t);
        const hue = 12 + Math.random() * 40;    // 뜨거운 톤
        wd.active.push({
            x: d.x,
            y: d.y + 12,
            vx: d.vx * 0.35 + (Math.random() - 0.5) * 20,
            vy: 40,
            life: 0,
            hue,
        });
        wd.drops += 1;
        setCount(wd.drops);
    };

    const settle = (ball) => {
        const wd = worldRef.current;
        const bin = Math.max(0, Math.min(BINS - 1, Math.floor(ball.x / (LW / BINS))));
        const pile = wd.piles[bin];
        const binW = LW / BINS;
        const slot = pile.length;
        const perRow = 3;
        const col = slot % perRow;
        const row = Math.floor(slot / perRow);
        const bx = bin * binW + binW / 2 + (col - 1) * (BALL_R * 1.7);
        const by = FLOOR - BALL_R - row * (BALL_R * 1.7);
        pile.push({ x: bx, y: by, hue: ball.hue });
        setResult(OUTCOMES[bin]);
    };

    const step = (dt) => {
        const wd = worldRef.current;
        wd.swing.t += dt;
        const sub = 3;
        const h = dt / sub;
        for (let s = 0; s < sub; s += 1) {
            for (let bi = wd.active.length - 1; bi >= 0; bi -= 1) {
                const b = wd.active[bi];
                b.vy += G * h;
                b.x += b.vx * h;
                b.y += b.vy * h;
                b.life += h;

                // 좌우 벽
                if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx) * REST; }
                if (b.x > LW - BALL_R) { b.x = LW - BALL_R; b.vx = -Math.abs(b.vx) * REST; }

                // 못 충돌 (원-원)
                for (let pi = 0; pi < wd.pegs.length; pi += 1) {
                    const p = wd.pegs[pi];
                    const dx = b.x - p.x;
                    const dy = b.y - p.y;
                    const rr = PEG_R + BALL_R;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < rr * rr) {
                        const d = Math.sqrt(d2) || 0.0001;
                        const nx = dx / d;
                        const ny = dy / d;
                        b.x = p.x + nx * rr;
                        b.y = p.y + ny * rr;
                        const vn = b.vx * nx + b.vy * ny;      // 법선 성분
                        const tvx = b.vx - vn * nx;            // 접선 성분
                        const tvy = b.vy - vn * ny;
                        b.vx = tvx * FRICT - vn * nx * REST;
                        b.vy = tvy * FRICT - vn * ny * REST;
                    }
                }

                // 칸 영역 안에서는 칸막이 벽에 부딪힌다
                if (b.y > BIN_TOP) {
                    for (let wi = 0; wi < wd.walls.length; wi += 1) {
                        const wx = wd.walls[wi];
                        if (Math.abs(b.x - wx) < BALL_R) {
                            b.x = wx + (b.x >= wx ? BALL_R : -BALL_R);
                            b.vx = (b.x >= wx ? Math.abs(b.vx) : -Math.abs(b.vx)) * REST;
                        }
                    }
                }

                // 바닥 도달 또는 느려지면 안착
                const slow = Math.abs(b.vx) < 14 && Math.abs(b.vy) < 40;
                if (b.y > FLOOR - BALL_R) { b.y = FLOOR - BALL_R; b.vy = -b.vy * REST * 0.4; }
                if ((b.y > BIN_TOP && slow) || b.y >= FLOOR - BALL_R - 1 || b.life > 8) {
                    settle(b);
                    wd.active.splice(bi, 1);
                }
            }

            // 낙하 중 토큰끼리 겹침만 부드럽게 밀어낸다
            for (let a = 0; a < wd.active.length; a += 1) {
                for (let c = a + 1; c < wd.active.length; c += 1) {
                    const A = wd.active[a];
                    const B = wd.active[c];
                    const dx = B.x - A.x;
                    const dy = B.y - A.y;
                    const rr = BALL_R * 2;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < rr * rr && d2 > 0.0001) {
                        const d = Math.sqrt(d2);
                        const push = (rr - d) / 2;
                        const nx = dx / d;
                        const ny = dy / d;
                        A.x -= nx * push; A.y -= ny * push;
                        B.x += nx * push; B.y += ny * push;
                        const tmp = A.vx; A.vx = B.vx * 0.6; B.vx = tmp * 0.6;
                    }
                }
            }
        }
    };

    const draw = (ctx) => {
        const wd = worldRef.current;
        // 밤하늘 열기 그라디언트
        const bg = ctx.createLinearGradient(0, 0, 0, LH);
        bg.addColorStop(0, '#1a1140');
        bg.addColorStop(0.5, '#3a1550');
        bg.addColorStop(1, '#5a1836');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, LW, LH);

        // 아지랑이(상승 입자)
        const tt = wd.swing.t;
        ctx.globalAlpha = 0.16;
        for (let i = 0; i < 14; i += 1) {
            const px = (i * 53 % LW);
            const py = LH - ((tt * 26 + i * 47) % (LH + 40));
            ctx.fillStyle = i % 2 ? '#ff9d5c' : '#ff5c8a';
            ctx.beginPath();
            ctx.arc(px, py, 2.4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 못
        for (let i = 0; i < wd.pegs.length; i += 1) {
            const p = wd.pegs[i];
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, PEG_R, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,180,120,0.35)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, PEG_R + 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 칸막이 + 칸 라벨
        const binW = LW / BINS;
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 2;
        for (let i = 0; i < wd.walls.length; i += 1) {
            ctx.beginPath();
            ctx.moveTo(wd.walls[i], BIN_TOP);
            ctx.lineTo(wd.walls[i], FLOOR);
            ctx.stroke();
        }
        ctx.textAlign = 'center';
        ctx.font = '15px system-ui, sans-serif';
        for (let i = 0; i < BINS; i += 1) {
            ctx.fillText(OUTCOMES[i].emoji, i * binW + binW / 2, FLOOR + 12);
        }

        // 쌓인 토큰
        for (let bi = 0; bi < wd.piles.length; bi += 1) {
            const pile = wd.piles[bi];
            for (let k = 0; k < pile.length; k += 1) {
                const t = pile[k];
                ctx.fillStyle = `hsl(${t.hue}, 90%, 62%)`;
                ctx.beginPath();
                ctx.arc(t.x, t.y, BALL_R, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 낙하 중 토큰
        for (let i = 0; i < wd.active.length; i += 1) {
            const b = wd.active[i];
            ctx.fillStyle = `hsl(${b.hue}, 95%, 66%)`;
            ctx.beginPath();
            ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.arc(b.x - 2, b.y - 2.4, 2.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // 손잡이(스프링 진동)
        const d = dropperState(tt);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(LW / 2, 60);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
        ctx.fillStyle = '#ffd36a';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,211,106,0.3)';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 14, 0, Math.PI * 2);
        ctx.fill();
        // 낙하 예고선
        ctx.strokeStyle = 'rgba(255,211,106,0.25)';
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.moveTo(d.x, d.y + 12);
        ctx.lineTo(d.x, 150);
        ctx.stroke();
        ctx.setLineDash([]);
    };

    const clearPiles = () => {
        const wd = worldRef.current;
        if (!wd) return;
        wd.active = [];
        wd.piles = Array.from({ length: BINS }, () => []);
        wd.drops = 0;
        setCount(0);
        setResult(null);
    };

    dropRef.current = spawn;

    useEffect(() => {
        const canvas = canvasRef.current;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = LW * dpr;
        canvas.height = LH * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        worldRef.current = buildWorld();

        const loop = (ts) => {
            if (!lastRef.current) lastRef.current = ts;
            let dt = (ts - lastRef.current) / 1000;
            lastRef.current = ts;
            if (dt > 0.033) dt = 0.033;
            step(dt);
            draw(ctx);
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    // 키보드: SPACE 로 떨어뜨리기 — 마운트 시 한 번만 바인딩
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); dropRef.current(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <LabShell
            title="SWELTER"
            eyebrow="the night that won't cool down"
            subtitle={'// 입추가 지나도 안 식는 열대야 — 스윙하는 손잡이를 놓아 토큰을 떨어뜨리면 오늘 밤 처방이 튀어나온다'}
            path="swelter"
        >
            <section className="sw-wrap" aria-label="열대야 파친코 뽑기">
                <div className="sw-machine">
                    <div className="sw-topbar">
                        <span className="sw-badge">🌃 TROPICAL NIGHT</span>
                        <span className="sw-drops">{count}번째 밤</span>
                    </div>

                    <canvas
                        ref={canvasRef}
                        className="sw-canvas"
                        onPointerDown={(e) => { e.preventDefault(); dropRef.current(); }}
                        role="button"
                        tabIndex={0}
                        aria-label="토큰 떨어뜨리기"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); dropRef.current(); } }}
                    />

                    <div className={`sw-result${result ? ' show' : ''}`} aria-live="polite">
                        {result ? (
                            <>
                                <span className="sw-remoji">{result.emoji}</span>
                                <span className="sw-rbody">
                                    <b>{result.title}</b>
                                    <span>{result.line}</span>
                                </span>
                            </>
                        ) : (
                            <span className="sw-idle">손잡이가 좌우로 흔들린다 — 지금 놓으면 토큰이 떨어진다</span>
                        )}
                    </div>

                    <div className="sw-controls">
                        <button type="button" className="sw-drop" onClick={() => dropRef.current()}>
                            <span className="sw-key">SPACE</span> 떨어뜨리기
                        </button>
                        <button type="button" className="sw-clear" onClick={clearPiles}>비우기</button>
                    </div>
                    <p className="sw-hint">SPACE · 클릭 · 화면 터치로 떨어뜨린다 — 못들이 결정한다</p>
                </div>

                <section className="sw-read">
                    <h3>입추가 지났는데 왜 아직 열대야일까</h3>
                    <p>
                        <b>열대야</b>는 밤(오후 6시~다음 날 오전 9시)의 최저기온이 <b>25°C 아래로 내려가지 않는 밤</b>을 말한다.
                        낮에 달궈진 도심의 콘크리트·아스팔트가 밤새 열을 되뿜고, 습도가 높으면 땀이 잘 마르지 않아 체감 더위가
                        더 오래간다. 2026년 8월은 <b>입추(8월 7일)가 지났는데도</b> 열대야가 이어졌는데, 절기는 기온이 아니라
                        태양의 위치(황경)로 정해지기 때문에 <b>달력의 가을과 실제 더위는 따로 논다</b>.
                    </p>
                    <p>
                        이 뽑기는 그 밤더위를 <b>파친코(핀 보드)</b>로 옮겼다. 손잡이는 스프링처럼 좌우로 흔들리고, 놓는 순간
                        토큰이 <b>중력으로 떨어지며 못마다 좌우로 튕긴다</b>. 못을 여러 번 거칠수록 좌우 튐이 상쇄돼 토큰은
                        <b>가운데로 몰리고</b>, 그래서 가운데 칸(얼린 물병·미지근한 샤워 같은 상식적 처방)이 자주 나오고
                        <b>가장자리 칸(지구 반대편 겨울·새벽 빙수 항복)은 드물게</b> 나온다. 동전을 여러 번 던져 앞면 수를
                        세면 종 모양으로 몰리는 것과 같은 원리(<b>이항분포 → 정규분포</b>, 중심극한정리)다.
                    </p>
                    <p className="sw-disc">
                        * 물리는 Matter.js 같은 엔진 없이 requestAnimationFrame 안에서 중력 적분과 원-원 충돌로 직접 굴린다.
                        처방은 재미로 뽑는 것이며, 온열질환이 의심되면 시원한 곳에서 수분을 보충하고 필요하면 도움을 요청하세요.
                    </p>
                </section>
            </section>
        </LabShell>
    );
};

export default Swelter;
