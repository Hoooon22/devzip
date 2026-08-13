import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Arago.css';

// ARAGO SPOT — 원형 장애물의 그림자 한가운데 나타나는 밝은 점(푸아송/아라고 점) 실험.
// 핵심: 빛이 파동이라면, 불투명한 원반의 가장자리에서 회절한 파동이 원반 뒤 축(중심선)에서
//   모두 같은 위상으로 만나 보강간섭한다. 그래서 "그림자의 정중앙"이 오히려 밝아진다.
//   1818년 푸아송은 프레넬의 파동설을 반박하려고 "그렇다면 원반 그림자 중심이 밝아야 하니 터무니없다"고
//   주장했지만, 아라고가 실제로 실험해 그 밝은 점을 관측했다 — 파동설의 결정적 승리.
//
// 모델(스칼라 프레넬 회절, 경계 회절파 근사, 평면파 입사):
//   - 축에서 반경 ρ 떨어진 스크린 점의 세기: I(ρ) ∝ J0( 2π·a·ρ / (λ·b) )²
//     (a=원반 반지름, b=원반–스크린 거리, λ=파장, J0=0차 베셀 함수)
//   - 프레넬 수 N = a² / (λ·b). 화면을 반경 1.5a 범위로 보이면 패턴은 오직 N에만 의존한다
//     (베셀 인자 s = 3πN·frac, frac=화면중심에서의 상대반경 0..1, 그림자 경계 frac=2/3 → s=2πN).
//   - 중심(ρ=0): J0(0)²=1 → 그림자 중심이 방해받지 않은 빛과 똑같은 세기로 밝다(그 역설).
//   - 첫 어두운 링: ρ1 = 0.383·λ·b/a. 스폿/그림자 비 = ρ1/a = 0.383/N (원반 클수록 점은 작아진다).

const CANVAS = 390;                 // 패턴 캔버스 한 변(정사각)
const MAXR = CANVAS / 2;            // 픽셀 반경
const PROF_W = 390, PROF_H = 96;    // 반경 방향 세기 그래프
const VIEW_K = 1.5;                 // 화면에 보이는 물리 반경 = VIEW_K · a
const SHADOW_FRAC = 1 / VIEW_K;     // 그림자 경계의 상대반경(=2/3)

// 프레넬 수로 결정되는 밴드(패턴의 성격)
function bandOf(N) {
    if (N < 0.5) return 'weak';     // 그림자가 거의 없고 점이 그림자를 채움
    if (N < 3) return 'clean';      // 선명한 스폿 + 굵은 링(교과서 그림)
    return 'dense';                 // 촘촘한 미세 링 · 또렷한 점 스폿
}
const BAND_LABEL = { weak: '그림자 흐릿 · 점이 번짐', clean: '선명한 스폿 + 링', dense: '촘촘한 링 · 또렷한 점' };

const Arago = () => {
    const canvasRef = useRef(null);
    const profRef = useRef(null);

    // 파라미터
    const [aMm, setAMm] = useState(1.0);     // 원반 반지름 (mm)
    const [bM, setBM] = useState(1.0);       // 원반–스크린 거리 (m)
    const [lamNm, setLamNm] = useState(550); // 파장 (nm)
    const [obstacle, setObstacle] = useState(true); // 원반 있음/없음

    const N = (aMm * 1e-3) * (aMm * 1e-3) / ((lamNm * 1e-9) * bM); // 프레넬 수
    const rho1Mm = 0.383 * (lamNm * 1e-9) * bM / (aMm * 1e-3) * 1e3; // 첫 어두운 링(mm)
    const spotRatio = 0.383 / N; // 스폿/그림자
    const band = bandOf(N);

    // 반경 방향 세기 LUT(픽셀 반경 → 세기). 화면은 반경 VIEW_K·a 를 담고,
    // 패턴은 프레넬 수 N 하나로 정해진다: s = 3πN·frac.
    const buildLut = useCallback(() => {
        const lut = new Float32Array(MAXR + 1);
        for (let pr = 0; pr <= MAXR; pr++) {
            const frac = pr / MAXR;               // 0(중심)..1(화면 가장자리)
            if (!obstacle) { lut[pr] = 1; continue; } // 원반 제거 → 균일 조명
            const s = 3 * Math.PI * N * frac;     // 베셀 인자
            const g = besselJ0(s);
            const inShadow = frac < SHADOW_FRAC;
            lut[pr] = inShadow ? g * g : 1;       // 그림자 안=회절 패턴, 밖=완전 조명
        }
        return lut;
    }, [N, obstacle]);

    // 패턴 렌더 — 방사대칭이라 1D LUT를 픽셀에 되쏜다.
    const renderPattern = useCallback(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const [br, bg, bb] = wavelengthRGB(lamNm);
        const lut = buildLut();
        const img = ctx.createImageData(CANVAS, CANVAS);
        const d = img.data;
        const cx = MAXR, cy = MAXR;
        for (let y = 0; y < CANVAS; y++) {
            for (let x = 0; x < CANVAS; x++) {
                const dx = x - cx, dy = y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                let I = dist <= MAXR ? lut[Math.round(dist)] : lut[MAXR];
                const v = Math.pow(Math.max(0, I), 0.75); // 감마 — 흐린 링을 살짝 들어올린다
                const o = (y * CANVAS + x) * 4;
                d[o] = br * v; d[o + 1] = bg * v; d[o + 2] = bb * v; d[o + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);

        // 중심 스폿 글로우(연출) — 원반이 있을 때만
        if (obstacle) {
            const spotPx = Math.max(2, (spotRatio * SHADOW_FRAC) * MAXR); // 첫 링까지의 px
            const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, spotPx * 1.6);
            glow.addColorStop(0, `rgba(${br},${bg},${bb},0.55)`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(cx, cy, spotPx * 1.6, 0, Math.PI * 2); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        // 그림자 경계(기하 그림자) 표시
        const shPx = SHADOW_FRAC * MAXR;
        ctx.strokeStyle = 'rgba(150,160,175,0.35)';
        ctx.setLineDash([4, 5]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, shPx, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);

        // 중심 십자선(빔 정렬)
        ctx.strokeStyle = 'rgba(200,205,215,0.28)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 9, cy); ctx.lineTo(cx + 9, cy);
        ctx.moveTo(cx, cy - 9); ctx.lineTo(cx, cy + 9);
        ctx.stroke();
    }, [lamNm, buildLut, obstacle, spotRatio]);

    // 반경 방향 세기 그래프 — J0² 프로파일
    const renderProfile = useCallback(() => {
        const cv = profRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const [br, bg, bb] = wavelengthRGB(lamNm);
        ctx.clearRect(0, 0, PROF_W, PROF_H);
        ctx.fillStyle = '#07090d'; ctx.fillRect(0, 0, PROF_W, PROF_H);
        const padL = 8, padR = 8, padT = 10, padB = 16;
        const gw = PROF_W - padL - padR, gh = PROF_H - padT - padB;

        // 그림자 경계 세로선
        const shX = padL + SHADOW_FRAC * gw;
        ctx.strokeStyle = 'rgba(150,160,175,0.4)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(shX, padT); ctx.lineTo(shX, padT + gh); ctx.stroke();
        ctx.setLineDash([]);

        // 세기 곡선
        ctx.strokeStyle = `rgb(${br},${bg},${bb})`; ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let px = 0; px <= gw; px++) {
            const frac = px / gw;
            let I;
            if (!obstacle) I = 1;
            else { const s = 3 * Math.PI * N * frac; const g = besselJ0(s); I = frac < SHADOW_FRAC ? g * g : 1; }
            const X = padL + px, Y = padT + gh - Math.max(0, Math.min(1, I)) * gh;
            if (px === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
        }
        ctx.stroke();

        // 중심 스폿 표식(중심이 최대라는 점)
        if (obstacle) {
            ctx.fillStyle = `rgb(${br},${bg},${bb})`;
            ctx.beginPath(); ctx.arc(padL, padT, 2.6, 0, Math.PI * 2); ctx.fill();
        }

        // 라벨
        ctx.fillStyle = 'rgba(190,196,206,0.75)'; ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('중심', padL, PROF_H - 4);
        ctx.fillText('그림자 경계', shX - 26, PROF_H - 4);
        ctx.textAlign = 'right'; ctx.fillText('세기 →', PROF_W - padR, PROF_H - 4); ctx.textAlign = 'left';
    }, [lamNm, N, obstacle]);

    useEffect(() => {
        const cv = canvasRef.current; if (cv) { cv.width = CANVAS; cv.height = CANVAS; }
        const pf = profRef.current; if (pf) { pf.width = PROF_W; pf.height = PROF_H; }
        renderPattern(); renderProfile();
    }, [renderPattern, renderProfile]);

    const onReset = () => { setAMm(1.0); setBM(1.0); setLamNm(550); setObstacle(true); };

    return (
        <LabShell
            title="ARAGO SPOT"
            eyebrow="fresnel diffraction · the spot in the shadow"
            subtitle={'// 불투명한 원반의 그림자 정중앙이 오히려 밝아지는 푸아송·아라고 점'}
            path="arago.exe"
        >
            <section className="k-win ar-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">/optics/</span>disc-shadow</span>
                    <span className="meta k-mono">원반 가장자리 회절파가 축에서 보강간섭 → 그림자 중심이 밝다</span>
                </div>

                <div className="ar-toolbar">
                    <div className="ar-ctrls">
                        <div className="ar-ctrl">
                            <label className="ar-ctrl-label k-mono" htmlFor="ar-a">원반 반지름 a <b>{aMm.toFixed(2)} mm</b></label>
                            <input id="ar-a" type="range" min="0.1" max="2" step="0.02"
                                value={aMm} onChange={(e) => setAMm(Number(e.target.value))} />
                        </div>
                        <div className="ar-ctrl">
                            <label className="ar-ctrl-label k-mono" htmlFor="ar-b">스크린 거리 b <b>{bM.toFixed(2)} m</b></label>
                            <input id="ar-b" type="range" min="0.2" max="3" step="0.02"
                                value={bM} onChange={(e) => setBM(Number(e.target.value))} />
                        </div>
                        <div className="ar-ctrl">
                            <label className="ar-ctrl-label k-mono" htmlFor="ar-l">파장 λ <b>{lamNm} nm</b></label>
                            <input id="ar-l" type="range" min="400" max="700" step="1"
                                value={lamNm} onChange={(e) => setLamNm(Number(e.target.value))} />
                        </div>
                    </div>
                    <div className="ar-actions">
                        <button type="button" className={`ar-btn ${obstacle ? 'ar-btn-hot' : 'ar-btn-on'}`}
                            onClick={() => setObstacle((o) => !o)}>
                            {obstacle ? '⚫ 원반 제거' : '○ 원반 놓기'}
                        </button>
                        <button type="button" className="ar-btn ar-btn-ghost" onClick={onReset}>↻ 리셋</button>
                    </div>
                </div>

                <div className="ar-stage">
                    <div className="ar-view-col">
                        <div className="ar-screen">
                            <canvas ref={canvasRef} className="ar-canvas" />
                            {!obstacle && <span className="ar-overlay k-mono">원반 없음 — 균일 조명</span>}
                        </div>
                        <canvas ref={profRef} className="ar-profile" />
                        <p className="ar-view-foot k-mono">
                            점선이 <b>기하 그림자 경계</b>. 원반이 있으면 그 <b>안쪽 정중앙</b>에 밝은 점(푸아송 점)이 뜨고
                            둘레로 링이 번진다 · <b>원반 제거</b>를 눌러 점이 사라졌다 다시 나타나는 걸 보라
                        </p>
                    </div>

                    <div className="ar-right">
                        <div className={`ar-amp ar-${band}`}>
                            <span className="ar-amp-lab k-mono">프레넬 수 N = a²/(λ·b)</span>
                            <span className="ar-amp-num">{N < 100 ? N.toFixed(2) : N.toFixed(0)}</span>
                            <span className="ar-amp-sub k-mono">{BAND_LABEL[band]}</span>
                        </div>

                        <div className="ar-stats">
                            <div className="ar-stat">
                                <span className="ar-stat-lab k-mono">첫 어두운 링</span>
                                <span className="ar-stat-num k-mono">{rho1Mm < 1 ? (rho1Mm * 1000).toFixed(0) + ' µm' : rho1Mm.toFixed(2) + ' mm'}</span>
                                <span className="ar-stat-foot k-mono">ρ₁ = 0.383·λb/a</span>
                            </div>
                            <div className="ar-stat">
                                <span className="ar-stat-lab k-mono">스폿 / 그림자</span>
                                <span className="ar-stat-num k-mono">{(spotRatio * 100).toFixed(1)}%</span>
                                <span className="ar-stat-foot k-mono">= 0.383 / N</span>
                            </div>
                        </div>

                        <div className="ar-predict">
                            <span className="ar-predict-lab k-mono">1818 · 파동설 검증</span>
                            <div className="ar-predict-row">
                                <span className="ar-predict-name">푸아송의 예측</span>
                                <span className="ar-predict-val">그림자 중심은 밝아야 한다 (반박용)</span>
                            </div>
                            <div className="ar-predict-row">
                                <span className="ar-predict-name">아라고의 관측</span>
                                <span className={`ar-predict-val ${obstacle ? 'ar-ok' : 'ar-off'}`}>
                                    {obstacle ? '밝은 점 확인 ✓ — 빛은 파동' : '원반을 놓아야 관측된다'}
                                </span>
                            </div>
                        </div>

                        <div className={`ar-verdict ar-${band}`}>
                            <p className="ar-verdict-txt">
                                {!obstacle
                                    ? <><b>원반 놓기</b>를 눌러 보라. 장애물이 없으면 화면은 그냥 균일하게 밝을 뿐 — 역설도 없다.</>
                                    : band === 'weak'
                                        ? <>N이 작다(원반이 작거나 스크린이 멀다). 그림자 자체가 <b>흐릿</b>하고 밝은 점이 그림자를 거의 <b>가득 채운다</b>.</>
                                        : band === 'dense'
                                            ? <>N이 크다. 그림자 둘레로 <b>촘촘한 미세 링</b>이 깔리고, 정중앙의 <b>또렷한 점</b>이 도드라진다.</>
                                            : <>교과서 그림이다. 어두운 그림자 원반 <b>정중앙</b>에 방해받지 않은 빛과 <b>똑같은 세기</b>의 점이 박혀 있다.</>}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win ar-foot-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="ar-foot">
                    <p>
                        {'빛이 '}<b>{'입자'}</b>{'라면 불투명한 원반의 그림자 한가운데는 가장 어두운 곳이어야 한다. 그런데 빛이 '}
                        <b>{'파동'}</b>{'이라면 이야기가 달라진다. 원반 '}<b>{'가장자리'}</b>{'의 모든 점에서 빛이 회절해 퍼지는데, '}
                        {'원반 뒤 축(중심선) 위의 한 점까지 오는 거리는 가장자리 어느 지점에서 출발하든 '}<b>{'똑같다'}</b>{'. '}
                        {'그래서 그 파동들이 모두 같은 위상으로 만나 '}<b>{'보강간섭'}</b>{'한다 — 그림자 정중앙이 오히려 밝아지는 것이다.'}
                    </p>
                    <p>
                        {'1818년 프랑스 학술원 현상 논문에서 '}<b>{'프레넬'}</b>{'이 빛의 파동설을 정교하게 펼치자, 심사위원 '}
                        <b>{'푸아송'}</b>{'은 이를 반박하려 했다. "그 이론이 옳다면 원형 장애물의 그림자 한복판에 밝은 점이 있어야 하는데, '}
                        {'그런 터무니없는 일은 없다"는 것이었다. 그러나 또 다른 심사위원 '}<b>{'아라고'}</b>{'가 실제로 실험대를 차려 '}
                        {'원반 뒤를 들여다보니 — 정말로 그 밝은 점이 있었다. 반박하려던 예측이 오히려 파동설을 못 박은 셈이라, '}
                        {'이 점은 '}<b>{'푸아송 점'}</b>{' 또는 '}<b>{'아라고 점'}</b>{'이라 불린다.'}
                    </p>
                    <p>
                        {'세기 분포는 스칼라 프레넬 회절로 '}<b>{'I(ρ) ∝ J₀(2π·a·ρ/λb)²'}</b>{' 꼴이 된다(a=원반 반지름, b=거리, λ=파장, '}
                        {'J₀=베셀 함수). 중심 ρ=0에서 J₀(0)²=1 — '}<b>{'방해받지 않은 빛과 똑같은 세기'}</b>{'다. 화면을 반지름 1.5a로 보면 '}
                        {'패턴 전체가 오직 '}<b>{'프레넬 수 N = a²/(λb)'}</b>{' 하나에 좌우된다. N이 클수록(원반이 크거나 가까울수록) 점은 작고 링은 '}
                        {'촘촘해지며, 스폿/그림자 비는 '}<b>{'0.383/N'}</b>{'로 줄어든다. 슬라이더로 '}<b>{'원반 크기·거리·파장'}</b>{'을 밀고 당겨 '}
                        {'점이 어떻게 커지고 작아지는지, '}<b>{'원반 제거'}</b>{'로 역설이 어떻게 사라졌다 되살아나는지 확인해 보라.'}
                    </p>
                    <p>
                        {'왜 흥미로운가. "반박하려던 사고실험이 도리어 결정적 증거가 됐다"는 과학사의 드라마이자, '}
                        {'같은 원리가 오늘날 '}<b>{'전자 회절'}</b>{'로 원자를 보고, 망원경 '}<b>{'거리계'}</b>{'에서 정렬을 잡는 데까지 이어진다. '}
                        {'그림자의 한가운데에 빛이 있다는 사실 하나가, 빛의 본성을 가른 것이다.'}
                    </p>
                    <p className="ar-disclaimer">
                        {'* 스칼라 프레넬 회절·경계 회절파 근사(평면파 입사, 완전 흡수 원반)로 축 부근 세기 I∝J₀² 만 남긴 개념 데모입니다. '}
                        {'점광원 배율, 원반 밖 프레넬 프린지의 정확한 형태, 편광·벡터 효과 등은 생략했으며 수치는 예시입니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

// ---- 0차 베셀 함수 J0 (Abramowitz & Stegun 9.4.1 / 9.4.3, |오차|<1e-7) ----
function besselJ0(x) {
    const ax = Math.abs(x);
    if (ax < 3) {
        const t = x / 3, y = t * t;
        return 1 + y * (-2.2499997 + y * (1.2656208 + y * (-0.3163866 +
            y * (0.0444479 + y * (-0.0039444 + y * 0.0002100)))));
    }
    const t = 3 / ax;
    const f0 = 0.79788456 + t * (-0.00000077 + t * (-0.00552740 + t * (-0.00009512 +
        t * (0.00137237 + t * (-0.00072805 + t * 0.00014476)))));
    const th = ax - 0.78539816 + t * (-0.04166397 + t * (-0.00003954 + t * (0.00262573 +
        t * (-0.00054125 + t * (-0.00029333 + t * 0.00013558)))));
    return f0 * Math.cos(th) / Math.sqrt(ax);
}

// ---- 파장(nm) → RGB(0..255). Dan Bruton의 근사. ----
function wavelengthRGB(nm) {
    let r = 0, g = 0, b = 0;
    if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
    else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
    else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
    else if (nm <= 780) { r = 1; }
    // 가장자리 파장 감쇠
    let f = 1;
    if (nm >= 380 && nm < 420) f = 0.3 + 0.7 * (nm - 380) / 40;
    else if (nm > 700 && nm <= 780) f = 0.3 + 0.7 * (780 - nm) / 80;
    const gamma = 0.8;
    const adj = (c) => Math.round(255 * Math.pow(Math.max(0, c) * f, gamma));
    return [adj(r), adj(g), adj(b)];
}

export default Arago;
