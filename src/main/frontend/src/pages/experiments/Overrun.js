import React, { useEffect, useRef } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Overrun.css';

// OVERRUN — 과잉생산과 재고 폐기 흐름 (뉴스·트렌드 × 시뮬레이터 × Canvas 2D × 설명 없이 만지면 알게).
//   소재: 재고 폐기 금지 규제가 화제가 된 "과잉생산" — 특정 브랜드가 아니라
//         "수요를 넘겨 만든 물건은 어디로 가는가"라는 보편 흐름으로 일반화.
//   형식: 시뮬레이터 — 생산 레버를 만지면 결과(팔림/폐기)가 즉시 갈린다.
//   기술: Canvas 2D 직접 그리기 — 공장 라인·벨트·게이트·폐기더미를 손으로 그린다.
//   제약: 설명 문장 없이 — 화면엔 안내 문구도 숫자도 없다. 레버를 쥐면 알게 된다.
//
//   도전: 물리 엔진 없이 컨베이어·수요 게이트·오버플로 폐기물을 순수 Canvas로 세우고,
//         "생산이 수요를 넘으면 안 팔린 게 폐기더미로 쏟아진다"를 텍스트 한 줄 없이
//         레버 하나로 손끝에 납득시킬 수 있느냐. 수요가 스스로 드리프트해 계속 쫓게 만든다.

const MAX_EMIT = 6.6;     // 레버 최대 생산율(개/초)
const TRANSIT = 2.35;     // 벨트를 가로지르는 시간(초)
const GATE_CAP = 1.7;     // 수요 토큰 버킷 상한(개) — 넘치면 게이트가 "굶주림"
const HAUL = 1.35;        // 폐기더미 반출(수거) 속도(개/초) — 균형이면 더미가 준다

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const Overrun = () => {
    const canvasRef = useRef(null);
    const stageRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const stage = stageRef.current;
        if (!canvas || !stage) return undefined;
        const ctx = canvas.getContext('2d');

        // ── 팔레트: 공장 바닥(콘크리트) · 강철/먹 · hazard 주황 ──
        const isDark = () =>
            (document.documentElement.getAttribute('data-theme') === 'dark') ||
            (canvas.closest('[data-theme="dark"]') != null);

        const pal = () => (isDark()
            ? {
                floor: '#17150f', floorLine: 'rgba(216,209,192,0.06)',
                steel: '#2c2823', steelHi: '#443f38', roller: '#1c1a15',
                item: '#c7bfad', itemHi: '#e5ddca', sold: '#f4f1e8',
                ink: '#d8d1c0', hazard: '#ff6a34', hazardHi: '#ffa072',
                shadow: 'rgba(0,0,0,0.4)',
            }
            : {
                floor: '#cbc4b3', floorLine: 'rgba(33,30,26,0.08)',
                steel: '#3b3731', steelHi: '#575049', roller: '#26231e',
                item: '#33302b', itemHi: '#4d473f', sold: '#f6f3ec',
                ink: '#2a2723', hazard: '#e6531d', hazardHi: '#f07a3d',
                shadow: 'rgba(30,26,20,0.22)',
            });

        // ── 시뮬레이션 상태 ──
        let lever = 0.5;             // 0..1 생산율
        let touched = false;         // 사용자가 레버를 만졌나(힌트용)
        let demand = 0.5;            // 0..1 현재 수요(스스로 드리프트)
        let gateTok = 0;             // 수요 토큰 버킷
        let hunger = 0;              // 0..1 게이트 굶주림(시각용)
        let emitAcc = 0;
        let haulAcc = 0;
        let soldPulse = 0;
        let shake = 0;               // 배출기 진동
        let items = [];              // 벨트 위 물건 {x}
        let flies = [];              // 팔린 물건 튀어오름 {x,y,vx,vy,life}
        let spills = [];             // 폐기로 떨어지는 물건 {x,y,vy,tx,ty}
        let waste = [];              // 쌓인 폐기물 {x,y,tone}
        let dragging = false;
        let t = 0;

        // ── 레이아웃(캔버스 크기 기준으로 매 프레임 산출) ──
        let L = null;
        const layout = (W, H) => {
            const s = W / 720;
            const beltY = H * 0.44;
            const beltX0 = W * 0.24;
            const beltX1 = W * 0.80;
            const cell = 15 * s;
            const binW = W * 0.40;
            const binX0 = clamp(beltX1 - binW * 0.5, W * 0.02, W - binW - W * 0.02);
            const binX1 = binX0 + binW;
            const binY1 = H * 0.965;
            const binY0 = H * 0.66;
            const cols = Math.max(1, Math.floor(binW / cell));
            const rows = Math.max(1, Math.floor((binY1 - binY0) / cell));
            return {
                W, H, s, beltY, beltX0, beltX1,
                leverX: W * 0.10, trackY0: H * 0.15, trackY1: H * 0.84,
                iw: 24 * s, ih: 17 * s,
                cell, binX0, binX1, binY0, binY1, cols, rows, cap: cols * rows,
            };
        };

        const slotFor = (n) => {
            const col = n % L.cols;
            const row = Math.floor(n / L.cols);
            return {
                x: L.binX0 + (col + 0.5) * L.cell,
                y: L.binY1 - (row + 0.5) * L.cell,
            };
        };

        // ── 물리/모델 업데이트 ──
        const step = (dt) => {
            t += dt;
            // 수요는 스스로 출렁인다 — 두 사인 합성으로 리듬을 못 외우게.
            demand = clamp(0.5 + 0.34 * Math.sin(t * 0.52) + 0.12 * Math.sin(t * 0.19 + 1.1), 0.05, 0.97);

            // 생산: 레버 비례 배출
            const rate = lever * MAX_EMIT;
            emitAcc += rate * dt;
            let guard = 0;
            while (emitAcc >= 1 && guard < 12) {
                const last = items[items.length - 1];
                if (!last || last.x > L.beltX0 + L.iw * 1.25) {
                    items.push({ x: L.beltX0 });
                    emitAcc -= 1;
                    shake = 1;
                    guard += 1;
                } else {
                    break; // 배출구가 막힘(백프레셔) — 토큰 유지
                }
            }
            if (emitAcc > 2) emitAcc = 2;

            // 벨트 이송
            const speed = (L.beltX1 - L.beltX0) / TRANSIT;
            for (const it of items) it.x += speed * dt;

            // 수요 토큰 채우기
            gateTok = Math.min(GATE_CAP, gateTok + demand * MAX_EMIT * dt);

            // 게이트 도달 처리: 준비되면 팔림, 아니면 폐기로 흘러넘침
            for (let i = items.length - 1; i >= 0; i -= 1) {
                if (items[i].x >= L.beltX1) {
                    if (gateTok >= 1) {
                        gateTok -= 1;
                        flies.push({
                            x: L.beltX1, y: L.beltY,
                            vx: (30 + Math.random() * 50) * L.s,
                            vy: -(150 + Math.random() * 70) * L.s,
                            life: 1,
                        });
                        soldPulse = 1;
                    } else {
                        const slot = slotFor(waste.length + spills.length);
                        spills.push({
                            x: L.beltX1, y: L.beltY, vy: 40 * L.s,
                            tx: slot.x, ty: slot.y, tone: (waste.length * 7) % 5,
                        });
                    }
                    items.splice(i, 1);
                }
            }

            // 굶주림: 토큰이 상한에 가까운데 공급이 없으면 게이트가 헛문다
            hunger = clamp(gateTok / GATE_CAP, 0, 1);

            // 폐기물 반출(수거차) — 균형이면 더미가 서서히 줄어든다
            haulAcc += HAUL * dt;
            while (haulAcc >= 1 && waste.length > 0) {
                haulAcc -= 1;
                waste.pop();
            }

            // 팔린 물건 튀어오름
            for (const f of flies) {
                f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 260 * L.s * dt; f.life -= dt * 1.25;
            }
            flies = flies.filter((f) => f.life > 0);

            // 폐기물 낙하 → 더미에 안착
            for (let i = spills.length - 1; i >= 0; i -= 1) {
                const sp = spills[i];
                sp.vy += 1500 * L.s * dt;
                sp.y += sp.vy * dt;
                sp.x += (sp.tx - sp.x) * Math.min(1, dt * 3.5);
                if (sp.y >= sp.ty) {
                    if (waste.length < L.cap) waste.push({ x: sp.tx, y: sp.ty, tone: sp.tone });
                    spills.splice(i, 1);
                }
            }

            soldPulse = Math.max(0, soldPulse - dt * 2.4);
            shake = Math.max(0, shake - dt * 5);
        };

        // ── 그리기 ──
        const rrect = (x, y, w, h, r) => {
            const rr = Math.min(r, w * 0.5, h * 0.5);
            ctx.beginPath();
            ctx.moveTo(x + rr, y);
            ctx.arcTo(x + w, y, x + w, y + h, rr);
            ctx.arcTo(x + w, y + h, x, y + h, rr);
            ctx.arcTo(x, y + h, x, y, rr);
            ctx.arcTo(x, y, x + w, y, rr);
            ctx.closePath();
        };

        const draw = () => {
            const C = pal();
            const { W, H, s } = L;
            ctx.clearRect(0, 0, W, H);

            // 콘크리트 바닥 + 사선 해치
            ctx.fillStyle = C.floor;
            ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = C.floorLine;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = -H; x < W; x += 26 * s) {
                ctx.moveTo(x, 0); ctx.lineTo(x + H, H);
            }
            ctx.stroke();

            // ── 폐기물 통(hazard 줄무늬 프레임) ──
            const bx = L.binX0; const bw = L.binX1 - L.binX0; const by = L.binY0; const bh = L.binY1 - by;
            ctx.save();
            rrect(bx - 4 * s, by - 4 * s, bw + 8 * s, bh + 8 * s, 6 * s);
            ctx.clip();
            // 바닥 그림자 통
            ctx.fillStyle = C.shadow;
            ctx.fillRect(bx - 4 * s, by - 4 * s, bw + 8 * s, bh + 8 * s);
            ctx.restore();
            // hazard 경사 줄무늬 테두리(상단 립)
            ctx.save();
            rrect(bx - 4 * s, by - 10 * s, bw + 8 * s, 10 * s, 3 * s);
            ctx.clip();
            for (let x = bx - 40 * s; x < L.binX1 + 20 * s; x += 22 * s) {
                ctx.fillStyle = ((x / (22 * s)) | 0) % 2 === 0 ? C.hazard : C.steel;
                ctx.beginPath();
                ctx.moveTo(x, by - 10 * s); ctx.lineTo(x + 11 * s, by - 10 * s);
                ctx.lineTo(x + 11 * s + 10 * s, by); ctx.lineTo(x + 10 * s, by);
                ctx.closePath(); ctx.fill();
            }
            ctx.restore();

            // 쌓인 폐기물
            const fillRatio = waste.length / L.cap;
            for (const w of waste) {
                const c = w.tone < 2 ? C.hazard : (w.tone < 4 ? C.hazardHi : C.steel);
                ctx.fillStyle = c;
                ctx.fillRect(w.x - L.cell * 0.44, w.y - L.cell * 0.44, L.cell * 0.88, L.cell * 0.88);
            }
            // 다 차면 위로 넘치는 주황 홍수 느낌
            if (fillRatio > 0.92) {
                ctx.fillStyle = C.hazard;
                const over = (fillRatio - 0.92) / 0.08;
                ctx.globalAlpha = 0.5 * over;
                ctx.fillRect(bx, by - 24 * s * over, bw, 24 * s * over);
                ctx.globalAlpha = 1;
            }

            // 낙하 중 폐기물
            for (const sp of spills) {
                ctx.fillStyle = C.hazard;
                ctx.fillRect(sp.x - L.iw * 0.4, sp.y - L.ih * 0.4, L.iw * 0.8, L.ih * 0.8);
            }

            // ── 컨베이어 벨트 ──
            const bandH = L.ih + 20 * s;
            const beltTop = L.beltY - bandH * 0.5;
            ctx.fillStyle = C.steel;
            rrect(L.beltX0 - 26 * s, beltTop, (L.beltX1 - L.beltX0) + 52 * s, bandH, 8 * s);
            ctx.fill();
            // 이동 해치(움직임 표시)
            ctx.save();
            rrect(L.beltX0 - 26 * s, beltTop, (L.beltX1 - L.beltX0) + 52 * s, bandH, 8 * s);
            ctx.clip();
            ctx.strokeStyle = C.steelHi;
            ctx.lineWidth = 3 * s;
            const scroll = (t * 90 * s) % (24 * s);
            ctx.beginPath();
            for (let x = L.beltX0 - 60 * s + scroll; x < L.beltX1 + 40 * s; x += 24 * s) {
                ctx.moveTo(x, beltTop + 2); ctx.lineTo(x + 12 * s, beltTop + bandH - 2);
            }
            ctx.stroke();
            ctx.restore();
            // 롤러
            ctx.fillStyle = C.roller;
            for (let x = L.beltX0 - 18 * s; x <= L.beltX1 + 18 * s; x += 34 * s) {
                ctx.beginPath();
                ctx.arc(x, L.beltY + bandH * 0.5 + 3 * s, 5 * s, 0, Math.PI * 2);
                ctx.fill();
            }

            // ── 벨트 위 물건 ──
            for (const it of items) {
                ctx.fillStyle = C.item;
                ctx.fillRect(it.x - L.iw * 0.5, L.beltY - L.ih * 0.5, L.iw, L.ih);
                ctx.fillStyle = C.itemHi;
                ctx.fillRect(it.x - L.iw * 0.5, L.beltY - L.ih * 0.5, L.iw, 3 * s);
            }

            // ── 배출기(호퍼) ──
            const hx = L.beltX0; const hy = beltTop - 40 * s;
            const sh = (shake > 0 ? Math.sin(t * 60) * 2 * shake * s : 0);
            ctx.fillStyle = C.steel;
            ctx.beginPath();
            ctx.moveTo(hx - 34 * s + sh, hy);
            ctx.lineTo(hx + 34 * s + sh, hy);
            ctx.lineTo(hx + 13 * s + sh, hy + 40 * s);
            ctx.lineTo(hx - 13 * s + sh, hy + 40 * s);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = C.roller;
            ctx.fillRect(hx - 13 * s + sh, hy + 36 * s, 26 * s, 6 * s);

            // ── 수요 게이트(셔터) ──
            const gx = L.beltX1;
            const frameW = 16 * s; const frameH = bandH + 40 * s;
            const gTop = L.beltY - frameH * 0.5;
            ctx.fillStyle = C.steel;
            ctx.fillRect(gx + L.iw * 0.5, gTop, frameW, frameH);
            // 셔터 입(팔릴 때 열림, 굶주리면 주황 점멸)
            const open = clamp(soldPulse * 1.2 + 0.15, 0, 1);
            const starving = hunger > 0.7 && items.every((it) => it.x < L.beltX1 - (L.beltX1 - L.beltX0) * 0.28);
            const mouthH = frameH * (0.22 + 0.55 * open);
            ctx.fillStyle = starving
                ? (Math.sin(t * 9) > 0 ? C.hazard : C.steelHi)
                : C.roller;
            ctx.fillRect(gx + L.iw * 0.5 + 3 * s, L.beltY - mouthH * 0.5, frameW - 6 * s, mouthH);
            if (starving) {
                ctx.strokeStyle = C.hazard;
                ctx.lineWidth = 2.5 * s;
                ctx.strokeRect(gx + L.iw * 0.5, gTop, frameW, frameH);
            }

            // 팔린 물건(빛으로 튀어올라 사라짐)
            for (const f of flies) {
                ctx.globalAlpha = clamp(f.life, 0, 1);
                ctx.fillStyle = C.sold;
                const sz = L.ih * (0.6 + 0.4 * f.life);
                ctx.fillRect(f.x - sz * 0.5, f.y - sz * 0.5, sz, sz);
            }
            ctx.globalAlpha = 1;

            // ── 생산 레버 ──
            const track = L.trackY1 - L.trackY0;
            const knobY = L.trackY1 - lever * track;
            const demY = L.trackY1 - demand * track;
            // 트랙
            ctx.strokeStyle = C.steel;
            ctx.lineWidth = 6 * s;
            ctx.beginPath();
            ctx.moveTo(L.leverX, L.trackY0);
            ctx.lineTo(L.leverX, L.trackY1);
            ctx.stroke();
            // 수요 목표 표식(속이 빈 주황 삼각형 — 이 높이에 레버를 맞추면 균형)
            ctx.fillStyle = C.hazard;
            ctx.beginPath();
            ctx.moveTo(L.leverX - 18 * s, demY);
            ctx.lineTo(L.leverX - 30 * s, demY - 7 * s);
            ctx.lineTo(L.leverX - 30 * s, demY + 7 * s);
            ctx.closePath();
            ctx.fill();
            // 정렬 정도에 따라 손잡이 후광
            const aligned = 1 - Math.min(1, Math.abs(lever - demand) / 0.12);
            if (aligned > 0) {
                ctx.globalAlpha = 0.35 * aligned;
                ctx.fillStyle = C.sold;
                ctx.beginPath();
                ctx.arc(L.leverX, knobY, 22 * s, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            // 손잡이 막대 + 노브
            ctx.strokeStyle = C.roller;
            ctx.lineWidth = 9 * s;
            ctx.beginPath();
            ctx.moveTo(L.leverX, L.trackY1);
            ctx.lineTo(L.leverX, knobY);
            ctx.stroke();
            ctx.fillStyle = C.ink;
            rrect(L.leverX - 15 * s, knobY - 11 * s, 30 * s, 22 * s, 5 * s);
            ctx.fill();
            ctx.fillStyle = C.hazard;
            ctx.fillRect(L.leverX - 15 * s, knobY - 2 * s, 30 * s, 4 * s);

            // 첫 진입 힌트: 만지기 전 노브가 위아래로 숨쉰다
            if (!touched) {
                const pulse = (Math.sin(t * 3) + 1) * 0.5;
                ctx.globalAlpha = 0.5 + 0.5 * pulse;
                ctx.strokeStyle = C.hazard;
                ctx.lineWidth = 2.5 * s;
                rrect(L.leverX - 20 * s - pulse * 4 * s, knobY - 16 * s - pulse * 4 * s,
                    40 * s + pulse * 8 * s, 32 * s + pulse * 8 * s, 8 * s);
                ctx.stroke();
                // 위아래 화살표(도형)
                ctx.fillStyle = C.ink;
                ctx.beginPath();
                ctx.moveTo(L.leverX, knobY - 26 * s - pulse * 4 * s);
                ctx.lineTo(L.leverX - 6 * s, knobY - 18 * s - pulse * 4 * s);
                ctx.lineTo(L.leverX + 6 * s, knobY - 18 * s - pulse * 4 * s);
                ctx.closePath(); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(L.leverX, knobY + 26 * s + pulse * 4 * s);
                ctx.lineTo(L.leverX - 6 * s, knobY + 18 * s + pulse * 4 * s);
                ctx.lineTo(L.leverX + 6 * s, knobY + 18 * s + pulse * 4 * s);
                ctx.closePath(); ctx.fill();
                ctx.globalAlpha = 1;
            }
        };

        // ── 크기/DPR 처리 ──
        let dpr = 1;
        const resize = () => {
            const rect = stage.getBoundingClientRect();
            if (rect.width === 0) return;
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(rect.width * dpr);
            canvas.height = Math.round(rect.height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            L = layout(rect.width, rect.height);
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(stage);

        // ── 포인터: 레버 드래그 ──
        const pointerY = (e) => {
            const rect = canvas.getBoundingClientRect();
            return e.clientY - rect.top;
        };
        const pointerX = (e) => {
            const rect = canvas.getBoundingClientRect();
            return e.clientX - rect.left;
        };
        const setLever = (y) => {
            lever = clamp((L.trackY1 - y) / (L.trackY1 - L.trackY0), 0, 1);
        };
        const onDown = (e) => {
            const x = pointerX(e);
            // 왼쪽 레버 구역이면 잡는다
            if (x < L.W * 0.24) {
                dragging = true;
                touched = true;
                setLever(pointerY(e));
                canvas.setPointerCapture?.(e.pointerId);
                e.preventDefault();
            }
        };
        const onMove = (e) => {
            if (!dragging) return;
            setLever(pointerY(e));
            e.preventDefault();
        };
        const onUp = (e) => {
            if (dragging) {
                dragging = false;
                canvas.releasePointerCapture?.(e.pointerId);
            }
        };
        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);

        // ── 루프 ──
        let raf = 0;
        let last = 0;
        const frame = (ts) => {
            if (!last) last = ts;
            let dt = (ts - last) / 1000;
            last = ts;
            if (dt > 0.05) dt = 0.05;
            if (L) { step(dt); draw(); }
            raf = window.requestAnimationFrame(frame);
        };
        raf = window.requestAnimationFrame(frame);

        return () => {
            window.cancelAnimationFrame(raf);
            ro.disconnect();
            canvas.removeEventListener('pointerdown', onDown);
            canvas.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            items = []; flies = []; spills = []; waste = [];
        };
    }, []);

    return (
        <LabShell
            title="OVERRUN"
            eyebrow="trend · overproduction · simulator"
            subtitle={'// 과잉생산과 재고 폐기의 흐름 — 만드는 속도를 손으로 쥐고 흔들어 보라'}
            path="overrun"
        >
            <section className="ovr-wrap" aria-label="과잉생산과 재고 폐기 시뮬레이터">
                <div className="ovr-stage" ref={stageRef}>
                    <canvas ref={canvasRef} className="ovr-canvas" aria-label="컨베이어 생산 라인과 폐기더미" />
                </div>

                <ReadBlock />
            </section>
        </LabShell>
    );
};

// 본문 — 과잉생산은 어디로 가는가.
const ReadBlock = () => (
    <section className="ovr-read">
        <h3>안 팔린 물건은 사라지지 않는다 — 어딘가에 쌓인다</h3>
        <p>
            공장은 <b>수요를 정확히 알 수 없다</b>. 그래서 대개 넉넉히 만든다. 넉넉함이
            지나치면, 팔리지 않은 물건은 창고를 지나 결국 <b>폐기더미</b>로 간다. 이 화면의
            컨베이어가 바로 그 흐름이다 — 왼쪽 레버로 만드는 속도를 올리면, 물건이 벨트를 타고
            오른쪽 수요 게이트로 흐른다. 게이트가 받아주면 빛으로 팔려 나가고, 미처 못 받은
            건 그대로 아래 통으로 <b>쏟아진다</b>.
        </p>
        <p>
            핵심은 수요가 <b>가만있지 않는다</b>는 점이다. 게이트가 원하는 양(주황 삼각형)은
            스스로 오르내린다. 레버를 그 높이에 맞추면 대부분 팔리고 더미는 수거차가 실어내
            줄어든다. 레버가 수요보다 높으면 남는 만큼 폐기물이 불어나 화면을 메우고, 낮으면
            게이트가 <b>헛문다</b>(주황 점멸) — 팔 수 있었는데 물건이 없는, 놓친 수요다.
        </p>
        <p className="ovr-tail">
            {'// 계기: 2026년, 여러 나라가 안 팔린 재고를 소각·매립하지 못하게 하는 규제를 도입하며 '}
            {'"과잉생산"이 다시 화제가 됐다. 특정 브랜드의 문제가 아니라, 수요를 넘겨 만든 물건은 '}
            {'반드시 어딘가에 쌓인다는 구조의 문제다. 그 구조를 레버 하나로 만져 보게 옮겼다.'}
        </p>
    </section>
);

export default Overrun;
