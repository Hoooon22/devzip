import React, { useEffect, useMemo, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Syzygy.css';

// SYZYGY — 식(蝕)의 그림자 기하. 세 천체가 한 줄로 정렬(syzygy)할 때 벌어지는 가림 현상.
//   핵심은 물리가 아니라 각지름(angular size)의 우연이다. 가까운 작은 것이 멀리 있는 큰 것을
//   "각도상" 똑같은 크기로 덮으면 완벽히 가려진다(개기). 조금 모자라면 테두리가 남는다(금환).
//
//   가리개가 만드는 그림자는 원뿔이다.
//     · 엄브라(umbra)   : 광원이 완전히 가려지는 어두운 원뿔 — 광원이 더 크면 뒤에서 한 점으로 수렴한다.
//     · 펜엄브라(penumbra): 광원이 일부만 가려지는 반그림자 — 항상 넓어진다.
//     · 안텀브라(antumbra): 엄브라 원뿔의 꼭짓점 너머 — 여기 선 관측자는 가리개가 각도상 작아 보여
//                          광원의 테두리가 고리로 남는다(금환).
//   관측자가 엄브라 안이면 개기, 안텀브라면 금환, 펜엄브라면 부분, 셋 다 아니면 식 없음이다.
//
//   그래서 개기냐 금환이냐는 "거리"가 가른다 — 같은 가리개라도 관측자에게서 멀어지면(또는 가리개가
//   더 멀면) 각지름이 줄어 엄브라 꼭짓점이 관측자에 못 미치고, 금환으로 바뀐다.

const W = 680, H = 430, YC = 215, XS = 64, XO = 270;   // 측면 광선도 좌표
const SKY = 250;                                        // "관측자 시야" 인셋 크기
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// 두 점을 지나는 직선의 x 에서의 y
const yAtX = (p1, p2, x) => p1.y + (x - p1.x) * (p2.y - p1.y) / (p2.x - p1.x);

// 두 직선(각각 두 점)의 교점
function intersect(p1, p2, p3, p4) {
    const a1 = p2.y - p1.y, b1 = p1.x - p2.x, c1 = a1 * p1.x + b1 * p1.y;
    const a2 = p4.y - p3.y, b2 = p3.x - p4.x, c2 = a2 * p3.x + b2 * p3.y;
    const det = a1 * b2 - a2 * b1;
    if (Math.abs(det) < 1e-9) return null;
    return { x: (b2 * c1 - b1 * c2) / det, y: (a1 * c2 - a2 * c1) / det };
}

// 반지름 a,b 두 원(중심 거리 d)의 겹침 넓이
function overlapArea(a, b, d) {
    if (d >= a + b) return 0;
    if (d <= Math.abs(a - b)) return Math.PI * Math.min(a, b) ** 2;
    const a2 = a * a, b2 = b * b;
    const alpha = Math.acos((d * d + a2 - b2) / (2 * d * a));
    const beta = Math.acos((d * d + b2 - a2) / (2 * d * b));
    const tri = 0.5 * Math.sqrt((-d + a + b) * (d + a - b) * (d - a + b) * (d + a + b));
    return a2 * alpha + b2 * beta - tri;
}

const Syzygy = () => {
    const [rs, setRs] = useState(100);    // 광원(별) 크기
    const [ro, setRo] = useState(40);     // 가리개 크기
    const [dObs, setDObs] = useState(80); // 가리개→관측자 거리
    const [off, setOff] = useState(0);    // 정렬 어긋남(관측자 가로 이동)

    const sideRef = useRef(null);
    const skyRef = useRef(null);

    // ---- 관측자 시점에서의 각지름/정렬 (분류의 근거) ----
    const geo = useMemo(() => {
        const xObs = XO + dObs;
        const yObs = YC + off;
        const distS = xObs - XS, distO = xObs - XO;
        const aS = Math.atan2(rs, distS);              // 광원 각반지름
        const aO = Math.atan2(ro, distO);              // 가리개 각반지름
        const dirS = Math.atan2(YC - yObs, distS);     // 광원 중심 방향
        const dirO = Math.atan2(YC - yObs, distO);     // 가리개 중심 방향
        const beta = Math.abs(dirS - dirO);            // 두 원반의 각거리

        let type, key;
        if (beta >= aS + aO) { type = '식 없음'; key = 'none'; }
        else if (beta <= Math.abs(aS - aO)) {
            if (aO >= aS) { type = '개기 (Total)'; key = 'total'; }
            else { type = '금환 (Annular)'; key = 'annular'; }
        } else { type = '부분 (Partial)'; key = 'partial'; }

        const covered = clamp(overlapArea(aS, aO, beta) / (Math.PI * aS * aS), 0, 1);
        const ratio = aO / aS;                         // 각지름 비 (1 이면 완벽 일치)
        // 엄브라 꼭짓점까지 거리(가리개 기준, px). rs>ro 일 때만 수렴.
        const umbraLen = rs > ro ? ro * (XO - XS) / (rs - ro) : Infinity;
        return { xObs, yObs, aS, aO, beta, type, key, covered, ratio, umbraLen };
    }, [rs, ro, dObs, off]);

    const nearCoincide = Math.abs(geo.ratio - 1) < 0.04 && geo.beta < geo.aS * 0.25;

    // ---- 측면 광선도 ----
    useEffect(() => {
        const cv = sideRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, W, H);

        // 우주 배경 (테마 무관, 항상 어둡다)
        const bg = ctx.createLinearGradient(0, 0, W, 0);
        bg.addColorStop(0, '#080b16');
        bg.addColorStop(1, '#0b0f1e');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        const sTop = { x: XS, y: YC - rs }, sBot = { x: XS, y: YC + rs };
        const oTop = { x: XO, y: YC - ro }, oBot = { x: XO, y: YC + ro };

        // 펜엄브라 (외접선: 위-위 / 아래-아래) — 가리개 가장자리에서 시작해 넓어진다
        ctx.fillStyle = 'rgba(120,132,158,0.14)';
        ctx.beginPath();
        ctx.moveTo(XO, YC - ro);
        ctx.lineTo(W, yAtX(sTop, oTop, W));
        ctx.lineTo(W, yAtX(sBot, oBot, W));
        ctx.lineTo(XO, YC + ro);
        ctx.closePath();
        ctx.fill();

        // 엄브라 / 안텀브라 (내접선: 위-아래 / 아래-위)
        const tip = intersect(sTop, oBot, sBot, oTop);
        const rsGtRo = rs > ro && tip && tip.x > XO;
        if (rsGtRo && tip.x < W) {
            // 엄브라: 삼각형 (가리개 → 꼭짓점)
            ctx.fillStyle = 'rgba(26,34,66,0.92)';
            ctx.beginPath();
            ctx.moveTo(XO, YC - ro);
            ctx.lineTo(tip.x, tip.y);
            ctx.lineTo(XO, YC + ro);
            ctx.closePath();
            ctx.fill();
            // 안텀브라: 꼭짓점 너머로 다시 벌어지는 원뿔
            ctx.fillStyle = 'rgba(70,86,128,0.30)';
            ctx.beginPath();
            ctx.moveTo(tip.x, tip.y);
            ctx.lineTo(W, yAtX(sBot, oTop, W));
            ctx.lineTo(W, yAtX(sTop, oBot, W));
            ctx.closePath();
            ctx.fill();
            // 꼭짓점 표식
            ctx.strokeStyle = 'rgba(180,196,230,0.55)';
            ctx.setLineDash([3, 4]);
            ctx.beginPath(); ctx.moveTo(tip.x, 24); ctx.lineTo(tip.x, H - 24); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(180,196,230,0.8)';
            ctx.font = '9px monospace';
            ctx.fillText('엄브라 꼭짓점', tip.x + 5, 34);
        } else {
            // 광원보다 가리개가 크면 엄브라가 수렴하지 않고 계속 넓어진다
            ctx.fillStyle = 'rgba(26,34,66,0.9)';
            ctx.beginPath();
            ctx.moveTo(XO, YC - ro);
            ctx.lineTo(W, yAtX(sTop, oBot, W));
            ctx.lineTo(W, yAtX(sBot, oTop, W));
            ctx.lineTo(XO, YC + ro);
            ctx.closePath();
            ctx.fill();
        }

        // 광원(별) — 따뜻한 금빛
        const sun = ctx.createRadialGradient(XS, YC, rs * 0.2, XS, YC, rs);
        sun.addColorStop(0, '#fff2cf');
        sun.addColorStop(0.6, '#eeb457');
        sun.addColorStop(1, '#d38b34');
        ctx.fillStyle = sun;
        ctx.beginPath(); ctx.arc(XS, YC, rs, 0, Math.PI * 2); ctx.fill();

        // 가리개 — 어두운 슬레이트
        ctx.fillStyle = '#141a2a';
        ctx.strokeStyle = 'rgba(150,164,190,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(XO, YC, ro, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        // 관측자
        const c = { total: '#3f9f77', annular: '#d98a3c', partial: '#d4b23a', none: '#7b8798' }[geo.key];
        ctx.strokeStyle = 'rgba(150,164,190,0.25)';
        ctx.setLineDash([2, 5]);
        ctx.beginPath(); ctx.moveTo(geo.xObs, 20); ctx.lineTo(geo.xObs, H - 20); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(geo.xObs, geo.yObs, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#080b16'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(geo.xObs, geo.yObs, 6, 0, Math.PI * 2); ctx.stroke();

        // 라벨
        ctx.fillStyle = 'rgba(230,206,150,0.85)';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('광원 (별)', XS - 24, YC + rs + 16);
        ctx.fillStyle = 'rgba(180,192,214,0.8)';
        ctx.fillText('가리개', XO - 16, YC - ro - 8);
        ctx.fillStyle = c;
        ctx.fillText('관측자', geo.xObs - 18, geo.yObs - 12);
        ctx.fillStyle = 'rgba(120,134,162,0.7)';
        ctx.font = '9px monospace';
        ctx.fillText('펜엄브라(반그림자)', W - 118, 22);
    }, [rs, ro, dObs, off, geo]);

    // ---- "관측자 시야" 인셋: 실제로 무엇이 보이나 ----
    useEffect(() => {
        const cv = skyRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, SKY, SKY);
        ctx.fillStyle = '#05070f';
        ctx.fillRect(0, 0, SKY, SKY);

        const cx = SKY / 2, cy = SKY / 2;
        const k = 78 / geo.aS;                 // 각도 → px (광원 각반지름을 78px 로 정규화)
        const Rsun = geo.aS * k;               // = 78
        const Rocc = geo.aO * k;
        const sep = geo.beta * k;

        // 광원 원반 + 은은한 코로나
        const halo = ctx.createRadialGradient(cx, cy, Rsun * 0.7, cx, cy, Rsun * 1.5);
        halo.addColorStop(0, 'rgba(255,214,132,0.35)');
        halo.addColorStop(1, 'rgba(255,214,132,0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(cx, cy, Rsun * 1.5, 0, Math.PI * 2); ctx.fill();
        const disk = ctx.createRadialGradient(cx, cy, Rsun * 0.2, cx, cy, Rsun);
        disk.addColorStop(0, '#fff4d6');
        disk.addColorStop(1, '#eeb457');
        ctx.fillStyle = disk;
        ctx.beginPath(); ctx.arc(cx, cy, Rsun, 0, Math.PI * 2); ctx.fill();

        // 가리개 원반 (아래쪽으로 각거리만큼 이동)
        const ox = cx, oy = cy + sep;
        ctx.fillStyle = '#0a0d16';
        ctx.beginPath(); ctx.arc(ox, oy, Rocc, 0, Math.PI * 2); ctx.fill();

        // 개기: 코로나 링을 검은 원반 둘레에 그린다
        if (geo.key === 'total') {
            ctx.strokeStyle = 'rgba(255,224,150,0.55)';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(ox, oy, Rocc + 2, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,224,150,0.18)';
            ctx.lineWidth = 10;
            ctx.beginPath(); ctx.arc(ox, oy, Rocc + 8, 0, Math.PI * 2); ctx.stroke();
        }
        // 가리개 얇은 테두리
        ctx.strokeStyle = 'rgba(150,164,190,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(ox, oy, Rocc, 0, Math.PI * 2); ctx.stroke();

        // 십자 중심 가이드
        ctx.strokeStyle = 'rgba(120,134,162,0.18)';
        ctx.beginPath(); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy);
        ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10); ctx.stroke();
    }, [geo]);

    const badge = { total: 'syz-total', annular: 'syz-annular', partial: 'syz-partial', none: 'syz-none' }[geo.key];
    const deg = (rad) => (rad * 180 / Math.PI).toFixed(1);

    return (
        <LabShell
            title="SYZYGY"
            eyebrow="occultation · when the near-small covers the far-large"
            subtitle={'// 각지름이 맞으면 개기, 모자라면 금환 — 식의 그림자 원뿔 기하'}
            path="syzygy.exe"
        >
            <section className="k-win syz-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">/sky/</span>eclipse</span>
                    <span className="meta k-mono">개기 ⟺ 금환 : 각지름 = 거리의 문제</span>
                </div>

                <div className="syz-stage">
                    {/* 왼쪽: 측면 광선도 + 컨트롤 */}
                    <div className="syz-main-col">
                        <div className="syz-side">
                            <canvas ref={sideRef} width={W} height={H} className="syz-canvas" />
                            <div className="syz-side-foot k-mono">
                                <span>◇ 광원 · 가리개 · 관측자의 정렬과 그림자 원뿔</span>
                                <span className={`syz-badge ${badge}`}>{geo.type}</span>
                            </div>
                        </div>

                        <div className="syz-controls">
                            <label className="syz-ctl">
                                <span className="syz-ctl-lab k-mono">
                                    광원(별) 크기 <b>{rs}</b>
                                    <span className="syz-hint">멀리 있는 큰 빛 · 각반지름 {deg(geo.aS)}°</span>
                                </span>
                                <input type="range" min={50} max={120} step={1} value={rs}
                                    onChange={(e) => setRs(parseFloat(e.target.value))}
                                    className="syz-range syz-range-s" />
                            </label>

                            <label className="syz-ctl">
                                <span className="syz-ctl-lab k-mono">
                                    가리개 크기 <b>{ro}</b>
                                    <span className="syz-hint">가까이 있는 작은 몸체 · 각반지름 {deg(geo.aO)}°</span>
                                </span>
                                <input type="range" min={12} max={130} step={1} value={ro}
                                    onChange={(e) => setRo(parseFloat(e.target.value))}
                                    className="syz-range syz-range-o" />
                            </label>

                            <label className="syz-ctl">
                                <span className="syz-ctl-lab k-mono">
                                    관측자 거리 <b>{dObs}</b>
                                    <span className="syz-hint">가리개에서 멀수록 각지름이 줄어 금환으로 넘어간다</span>
                                </span>
                                <input type="range" min={30} max={390} step={1} value={dObs}
                                    onChange={(e) => setDObs(parseFloat(e.target.value))}
                                    className="syz-range syz-range-d" />
                                <div className="syz-scale k-mono">
                                    <span>30 가까이</span><span>엄브라 길이 {geo.umbraLen === Infinity ? '∞' : Math.round(geo.umbraLen)}</span><span>390 멀리</span>
                                </div>
                            </label>

                            <label className="syz-ctl">
                                <span className="syz-ctl-lab k-mono">
                                    정렬 어긋남 <b>{off}</b>
                                    <span className="syz-hint">완벽한 정렬(0)에서 벗어날수록 부분식 · 각거리 {deg(geo.beta)}°</span>
                                </span>
                                <input type="range" min={-150} max={150} step={1} value={off}
                                    onChange={(e) => setOff(parseFloat(e.target.value))}
                                    className="syz-range syz-range-a" />
                                <div className="syz-scale k-mono">
                                    <span>어긋남 ◀</span><span>정렬</span><span>▶ 어긋남</span>
                                </div>
                            </label>

                            <div className="syz-run">
                                <button type="button" className="syz-btn"
                                    onClick={() => { setRs(100); setRo(40); setDObs(80); setOff(0); }}>
                                    ↺ 개기식 프리셋
                                </button>
                                <button type="button" className="syz-btn syz-btn-ghost"
                                    onClick={() => setOff(0)}>
                                    ◎ 완벽 정렬
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 오른쪽: 관측자 시야 + 계기판 + 해설 */}
                    <aside className="syz-side-panel">
                        <div className="syz-sky">
                            <div className="syz-sky-head k-mono">관측자에게 보이는 하늘</div>
                            <canvas ref={skyRef} width={SKY} height={SKY} className="syz-sky-canvas" />
                            <div className={`syz-sky-cap k-mono syz-cap-${geo.key}`}>
                                {geo.key === 'total' && '개기 — 광원이 완전히 가려지고 코로나만 남는다'}
                                {geo.key === 'annular' && '금환 — 가리개가 각도상 작아 빛의 고리가 남는다'}
                                {geo.key === 'partial' && '부분 — 정렬이 어긋나 한쪽만 베어 물린다'}
                                {geo.key === 'none' && '식 없음 — 두 원반이 겹치지 않는다'}
                            </div>
                        </div>

                        <div className="syz-hud">
                            <div className="syz-hud-row">
                                <span className="syz-hud-k k-mono">광원면 가림</span>
                                <span className="syz-hud-big">{Math.round(geo.covered * 100)}<em>%</em></span>
                            </div>
                            <div className="syz-hud-grid k-mono">
                                <div><span>광원 각반지름</span><b>{deg(geo.aS)}°</b></div>
                                <div><span>가리개 각반지름</span><b>{deg(geo.aO)}°</b></div>
                                <div><span>각지름 비 (가리개/광원)</span><b>{geo.ratio.toFixed(2)}</b></div>
                                <div><span>중심 각거리</span><b>{deg(geo.beta)}°</b></div>
                            </div>
                            {nearCoincide && (
                                <div className="syz-coincide k-mono">
                                    ★ 각지름 일치 (비 ≈ 1.00) — 개기와 금환의 경계.
                                    태양·달이 하늘에서 거의 같은 크기로 보이는 그 우연.
                                </div>
                            )}
                        </div>

                        <div className="syz-read">
                            <h3>가까운 작은 것이 먼 큰 것을 덮는다</h3>
                            <p>
                                실제 크기가 아니라 <b>각지름</b> &mdash; 하늘에서 차지하는 각도 &mdash; 가
                                가림을 정한다. 가리개의 각반지름이 광원보다 <b>크거나 같으면</b> 완전히 덮어
                                <b>개기</b>, <b>작으면</b> 테두리가 남아 <b>금환</b>이다. 태양은 달보다 400배
                                크지만 400배 멀어, 하늘에서 거의 같은 각지름으로 보인다 &mdash; 개기일식이
                                가능한 우주적 우연이다.
                            </p>
                            <h3>그림자는 원뿔이다</h3>
                            <p>
                                광원이 가리개보다 크면 <b>엄브라</b>(완전 그림자)가 뒤에서 한 점으로 수렴한다.
                                <b>관측자 거리</b>를 밀어 그 꼭짓점 너머로 나가면 &mdash; <b>안텀브라</b> &mdash;
                                가리개가 각도상 작아져 개기가 <b>금환</b>으로 바뀐다. 같은 달이라도 궤도가 멀 때
                                금환식이 되는 이유다. <b>정렬 어긋남</b>을 주면 관측자가 <b>펜엄브라</b>로 밀려
                                광원이 한쪽만 베어 물린 <b>부분식</b>이 된다.
                            </p>
                        </div>
                    </aside>
                </div>
            </section>
        </LabShell>
    );
};

export default Syzygy;
