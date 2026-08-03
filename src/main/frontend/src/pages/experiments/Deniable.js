import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Deniable.css';

// DENIABLE — 랜덤 응답으로 개인은 숨기고 통계는 살리는 ε-차등 프라이버시 실험.
//   민감한 예/아니오 질문에 각 응답자는 "랜덤 응답"으로 답한다:
//     확률 p 로 진실을 말하고, 확률 (1-p) 로는 동전을 던져 무작위로 답한다.
//   그러면 어떤 개인의 답도 곧이곧대로 믿을 수 없어(그럴듯한 부인) 개인은 보호되지만,
//   집계는 편향을 벗겨내면 진짜 비율을 복원할 수 있다.
//     P(보고=Yes | 진짜=Yes) = (1+p)/2 ,  P(보고=Yes | 진짜=No) = (1-p)/2
//     ε = ln((1+p)/(1-p))  — p가 작을수록 ε↓(강한 보호), 크면 ε↑(노출).
//   조사원 추정:  ŷ = 보고된 Yes 비율,  π̂ = (ŷ - (1-p)/2) / p   (편향 제거)
//     표준오차 SE(π̂) = sqrt(ŷ(1-ŷ)/N) / p  — p가 작을수록, N이 작을수록 커진다.

const clamp01 = (x) => Math.max(0, Math.min(1, x));

// 한 명의 랜덤 응답: 확률 p로 진실, 아니면 공정한 동전.
function respond(trueBit, p) {
    if (Math.random() < p) return { report: trueBit, lied: false };
    const coin = Math.random() < 0.5 ? 1 : 0;
    return { report: coin, lied: coin !== trueBit };
}

// 모집단 생성 — 각자 민감 속성(1=Yes)을 유병률 pi 로 가진다.
function makePop(n, pi) {
    const arr = new Array(n);
    for (let i = 0; i < n; i++) arr[i] = Math.random() < pi ? 1 : 0;
    return arr;
}

// 모집단 전체에서 한 번의 릴리스(랜덤 응답 수집)를 수행.
function collect(pop, p) {
    return pop.map((b) => respond(b, p));
}

const N_OPTIONS = [100, 256, 400];

const Deniable = () => {
    const [n, setN] = useState(256);
    const [piTrue, setPiTrue] = useState(0.35);   // 숨겨진 실제 유병률
    const [p, setP] = useState(0.5);               // 진실을 말할 확률 (프라이버시 손잡이)
    const [pop, setPop] = useState(() => makePop(256, 0.35));
    const [reports, setReports] = useState(() => collect(pop, 0.5)); // pop과 같은 모집단으로 초기 수집
    const [selected, setSelected] = useState(null);
    const [reveal, setReveal] = useState(false);   // 진짜 값 공개 여부
    const [log, setLog] = useState([]);            // 최근 릴리스들의 π̂
    const [running, setRunning] = useState(false);

    // 루프가 최신 값을 읽도록 ref 미러
    const popRef = useRef(pop);
    const pRef = useRef(p);
    useEffect(() => { popRef.current = pop; }, [pop]);
    useEffect(() => { pRef.current = p; }, [p]);

    // 모집단 재생성 — N 또는 유병률이 바뀌면 새 사람들을 뽑고 한 번 수집.
    const regenerate = useCallback((nn, pi, pp) => {
        setRunning(false);
        const fresh = makePop(nn, pi);
        setPop(fresh);
        setReports(collect(fresh, pp));
        setSelected(null);
        setLog([]);
    }, []);

    // 같은 모집단에 새 릴리스 한 번 (랜덤 응답 다시 수집).
    const release = useCallback(() => {
        const rep = collect(popRef.current, pRef.current);
        setReports(rep);
        const pp = pRef.current;
        const yes = rep.reduce((s, r) => s + r.report, 0);
        const yhat = yes / rep.length;
        const piHat = clamp01((yhat - (1 - pp) / 2) / pp);
        setLog((prev) => [piHat, ...prev].slice(0, 60));
    }, []);

    // 자동 실행 — 릴리스를 반복해 π̂가 진짜 값 둘레로 요동치는 폭을 본다.
    useEffect(() => {
        if (!running) return undefined;
        const id = setInterval(release, 420);
        return () => clearInterval(id);
    }, [running, release]);

    const changeN = (nn) => { if (nn !== n) { setN(nn); regenerate(nn, piTrue, p); } };
    const changePi = (v) => { setPiTrue(v); regenerate(n, v, p); };
    const changeP = (v) => {
        setRunning(false);
        setP(v);
        // p만 바뀌면 사람은 그대로, 응답만 다시 수집
        const rep = collect(popRef.current, v);
        setReports(rep);
        setLog([]);
    };

    // ---- 파생 통계 ----
    const a1 = (1 + p) / 2;                 // P(보고Yes | 진짜Yes)
    const a0 = (1 - p) / 2;                 // P(보고Yes | 진짜No)
    const eps = Math.log((1 + p) / (1 - p));

    const yesReports = reports.reduce((s, r) => s + r.report, 0);
    const yhat = yesReports / n;
    const piHat = clamp01((yhat - a0) / p);
    const se = Math.sqrt(Math.max(yhat * (1 - yhat), 1e-9) / n) / p;
    const ci = 1.96 * se;
    const err = Math.abs(piHat - piTrue);
    const lied = reports.reduce((s, r) => s + (r.lied ? 1 : 0), 0);

    // 공격자 관점 — 선택된 개인의 보고를 보고 진짜를 추정하는 사후확률.
    const sel = selected != null ? { t: pop[selected], r: reports[selected] } : null;
    let post1 = piTrue, conf = 0.5;
    if (sel) {
        if (sel.r.report === 1) {
            const num = piTrue * a1;
            post1 = num / (num + (1 - piTrue) * a0);
        } else {
            const num = piTrue * (1 - a1);
            post1 = num / (num + (1 - piTrue) * (1 - a0));
        }
        conf = Math.max(post1, 1 - post1);
    }

    // 프라이버시 등급
    let grade, gclass;
    if (eps < 0.5) { grade = '강한 보호'; gclass = 'safe'; }
    else if (eps < 1.5) { grade = '보통'; gclass = 'mid'; }
    else if (eps < 3) { grade = '약한 보호'; gclass = 'weak'; }
    else { grade = '거의 노출'; gclass = 'open'; }

    // 그리드 셀 색 클래스 — 공개 뷰(보고)냐 진짜 뷰냐에 따라.
    const cells = useMemo(() => reports.map((r, i) => {
        const truth = pop[i];
        const shown = reveal ? truth : r.report;
        return {
            i,
            cls: shown === 1 ? 'yes' : 'no',
            flipped: reveal && r.report !== truth, // 진짜 뷰에서 잡음(거짓 응답) 표시
        };
    }), [reports, pop, reveal]);

    // 로그 요약(자동 실행 시 π̂ 분산 감각)
    const logStats = useMemo(() => {
        if (log.length < 2) return null;
        const m = log.reduce((s, v) => s + v, 0) / log.length;
        const sd = Math.sqrt(log.reduce((s, v) => s + (v - m) ** 2, 0) / log.length);
        return { m, sd, spread: sd * 2 };
    }, [log]);

    return (
        <LabShell
            title="DENIABLE"
            eyebrow="differential privacy · randomized response"
            subtitle={'// 누구의 답도 믿을 수 없게 만들되, 전체 통계는 되살린다 — 프라이버시와 정확도의 거래'}
            path="deniable.exe"
        >
            <section className="k-win dn-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/survey/</span>randomized-response</span>
                    <span className="meta k-mono">민감 질문 · &quot;당신은 …했습니까?&quot;</span>
                </div>

                <div className="dn-stage">
                    {/* ---- 왼쪽: 모집단 · 조사 ---- */}
                    <div className="dn-view-col">
                        <div className="dn-grid-head">
                            <span className="dn-grid-title k-mono">
                                모집단 {n}명 · {reveal ? '진짜 값' : '공개된 응답'}
                            </span>
                            <div className="dn-legend k-mono">
                                <span><i className="dn-lg dn-lg-yes" />Yes</span>
                                <span><i className="dn-lg dn-lg-no" />No</span>
                                {reveal && <span><i className="dn-lg dn-lg-flip" />잡음(거짓 응답)</span>}
                            </div>
                        </div>

                        <div
                            className={`dn-grid dn-grid-${n <= 100 ? 'sm' : n <= 256 ? 'md' : 'lg'}`}
                            role="group"
                            aria-label="모집단 응답 격자"
                        >
                            {cells.map((c) => (
                                <button
                                    key={c.i}
                                    type="button"
                                    className={`dn-cell dn-cell-${c.cls}${c.flipped ? ' dn-cell-flip' : ''}${selected === c.i ? ' dn-cell-sel' : ''}`}
                                    onClick={() => setSelected(c.i)}
                                    aria-label={`개인 ${c.i + 1}`}
                                    title={`개인 #${c.i + 1}`}
                                />
                            ))}
                        </div>

                        <div className="dn-grid-foot">
                            <button
                                type="button"
                                className={`dn-mini${reveal ? ' dn-mini-on' : ''}`}
                                onClick={() => setReveal((v) => !v)}
                            >
                                {reveal ? '● 진짜 값 숨기기' : '○ 진짜 값 보기'}
                            </button>
                            <span className="dn-noise-tag k-mono">
                                이번 릴리스에서 <b>{lied}</b>명 ({(lied / n * 100).toFixed(0)}%)이 잡음으로 뒤집힘
                            </span>
                        </div>

                        {/* 선택된 개인 — 공격자 관점 */}
                        <div className={`dn-person${sel ? ' dn-person-on' : ''}`}>
                            {!sel ? (
                                <span className="dn-person-idle k-mono">위 격자에서 한 명을 클릭하면 — 공격자가 그 사람의 공개 응답만 보고 진짜를 얼마나 맞힐 수 있는지 나온다</span>
                            ) : (
                                <>
                                    <div className="dn-person-id">
                                        <span className="dn-person-hash k-mono">개인 #{selected + 1}</span>
                                        <div className="dn-person-bits">
                                            <span className={`dn-bit dn-bit-${sel.t ? 'yes' : 'no'}`}>
                                                진짜 {sel.t ? 'Yes' : 'No'}
                                            </span>
                                            <span className="dn-arrow">→</span>
                                            <span className={`dn-bit dn-bit-rep dn-bit-${sel.r.report ? 'yes' : 'no'}`}>
                                                공개 {sel.r.report ? 'Yes' : 'No'}
                                            </span>
                                            {sel.r.lied && <span className="dn-bit-lie k-mono">동전이 뒤집음</span>}
                                        </div>
                                    </div>
                                    <div className="dn-attack">
                                        <span className="dn-attack-lab k-mono">
                                            공격자 확신도 — 공개 응답 &quot;{sel.r.report ? 'Yes' : 'No'}&quot;만 보고 진짜를 맞힐 확률
                                        </span>
                                        <div className="dn-attack-bar">
                                            <div className="dn-attack-fill" style={{ width: `${conf * 100}%` }} />
                                            <span className="dn-attack-half" style={{ left: '50%' }} />
                                        </div>
                                        <span className="dn-attack-num k-mono">
                                            {(conf * 100).toFixed(1)}%
                                            <span className="dn-attack-sub">
                                                {conf < 0.6 ? ' · 동전 던지기와 다를 바 없음 — 부인 가능' : conf < 0.8 ? ' · 살짝 유리 — 부분 노출' : ' · 사실상 들통 — 부인 불가'}
                                            </span>
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 컨트롤 */}
                        <div className="dn-controls">
                            <label className="dn-ctl">
                                <span className="dn-ctl-lab k-mono">
                                    진실을 말할 확률 p <b>{p.toFixed(2)}</b>
                                    <span className="dn-ctl-hint">← 강한 보호 · 노출 →</span>
                                </span>
                                <input
                                    type="range" min="0.02" max="0.98" step="0.02"
                                    value={p}
                                    onChange={(e) => changeP(parseFloat(e.target.value))}
                                />
                            </label>
                            <label className="dn-ctl">
                                <span className="dn-ctl-lab k-mono">
                                    숨겨진 실제 유병률 π <b>{(piTrue * 100).toFixed(0)}%</b>
                                    <span className="dn-ctl-hint">조사원은 이 값을 모른다</span>
                                </span>
                                <input
                                    type="range" min="0.05" max="0.95" step="0.01"
                                    value={piTrue}
                                    onChange={(e) => changePi(parseFloat(e.target.value))}
                                />
                            </label>
                            <div className="dn-ctl dn-ctl-n">
                                <span className="dn-ctl-lab k-mono">모집단 크기 N</span>
                                <div className="dn-nbtns">
                                    {N_OPTIONS.map((opt) => (
                                        <button
                                            key={opt}
                                            type="button"
                                            className={`dn-nbtn${n === opt ? ' dn-nbtn-on' : ''}`}
                                            onClick={() => changeN(opt)}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="dn-actions">
                            <button type="button" className="dn-btn dn-btn-hot" onClick={() => { setRunning(false); release(); }}>
                                ▶ 다시 조사
                            </button>
                            <button type="button" className="dn-btn dn-btn-warm" onClick={() => setRunning((r) => !r)}>
                                {running ? '⏸ 정지' : '⏩ 반복'}
                            </button>
                            <button type="button" className="dn-btn dn-btn-ghost" onClick={() => regenerate(n, piTrue, p)}>
                                ↻ 새 모집단
                            </button>
                        </div>
                    </div>

                    {/* ---- 오른쪽: 계기판 ---- */}
                    <div className="dn-right">
                        <div className={`dn-epsbox dn-${gclass}`}>
                            <span className="dn-eps-lab k-mono">프라이버시 예산 ε = ln((1+p)/(1−p))</span>
                            <span className="dn-eps-num">{eps.toFixed(2)}</span>
                            <span className="dn-eps-grade k-mono">{grade}</span>
                            <div className="dn-eps-bar">
                                <div className="dn-eps-fill" style={{ width: `${Math.min(eps / 4, 1) * 100}%` }} />
                            </div>
                            <span className="dn-eps-foot k-mono">ε가 작을수록 개인 보호가 강하다 (0 = 완전 부인)</span>
                        </div>

                        {/* 조사원 추정 — 유용성 */}
                        <div className="dn-est">
                            <span className="dn-est-lab k-mono">조사원의 복원 추정 π̂ (편향 제거 후)</span>
                            <div className="dn-est-row">
                                <div className="dn-est-track">
                                    {/* 진짜 값 마커 */}
                                    <span className="dn-est-true" style={{ left: `${piTrue * 100}%` }} title="진짜 π" />
                                    {/* 신뢰구간 */}
                                    <span
                                        className="dn-est-ci"
                                        style={{ left: `${clamp01(piHat - ci) * 100}%`, width: `${(clamp01(piHat + ci) - clamp01(piHat - ci)) * 100}%` }}
                                    />
                                    <span className="dn-est-point" style={{ left: `${piHat * 100}%` }} />
                                </div>
                            </div>
                            <div className="dn-est-nums k-mono">
                                <span>π̂ = <b>{(piHat * 100).toFixed(1)}%</b></span>
                                <span className="dn-est-sep">·</span>
                                <span>진짜 {(piTrue * 100).toFixed(0)}%</span>
                                <span className="dn-est-sep">·</span>
                                <span className={err < 0.05 ? 'dn-ok' : err < 0.1 ? 'dn-warnc' : 'dn-badc'}>
                                    오차 {(err * 100).toFixed(1)}%p
                                </span>
                            </div>
                            <div className="dn-est-nums k-mono dn-est-ci-line">
                                95% 신뢰구간 폭 ±{(ci * 100).toFixed(1)}%p
                                <span className="dn-est-sub"> — p가 작거나 N이 작으면 넓어진다</span>
                            </div>
                        </div>

                        {/* 자동 반복 시 π̂ 요동 */}
                        <div className="dn-jitter">
                            <span className="dn-jitter-lab k-mono">최근 릴리스별 π̂ ({log.length})</span>
                            <div className="dn-jitter-strip">
                                {log.length === 0 ? (
                                    <span className="dn-jitter-idle k-mono">⏩ 반복을 눌러 릴리스마다 추정이 얼마나 흔들리는지 보라</span>
                                ) : (
                                    log.map((v, i) => (
                                        <span
                                            key={i}
                                            className="dn-jitter-bar"
                                            style={{ height: `${clamp01(v) * 100}%` }}
                                            title={`${(v * 100).toFixed(1)}%`}
                                        />
                                    ))
                                )}
                                <span className="dn-jitter-true" style={{ bottom: `${piTrue * 100}%` }} />
                            </div>
                            {logStats && (
                                <span className="dn-jitter-foot k-mono">
                                    평균 {(logStats.m * 100).toFixed(1)}% · 요동폭 ≈ ±{(logStats.spread * 50).toFixed(1)}%p
                                </span>
                            )}
                        </div>

                        <div className={`dn-verdict dn-${gclass}`}>
                            <p className="dn-verdict-txt">
                                {eps < 0.5
                                    ? '개인은 강하게 보호되지만, 같은 정확도를 얻으려면 훨씬 많은 사람이 필요하다 — 신뢰구간이 넓다.'
                                    : eps < 1.5
                                        ? '보호와 정확도가 균형에 가깝다 — 개인은 그럴듯이 부인하고, 집계는 쓸 만하다.'
                                        : eps < 3
                                            ? '추정은 날카로워지지만 개인의 부인 여지가 줄어든다 — 응답이 진실 쪽으로 기운다.'
                                            : '통계는 정확하지만 사실상 진짜 답을 공개하는 셈 — 프라이버시가 거의 없다.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win dn-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="dn-foot">
                    <p>
                        {'"2026년, 각국이 포괄적 데이터 프라이버시 법제를 손보고 웨어러블·스마트홈이 쏟아내는 개인 데이터를 어떻게 다룰지"가 화두로 오르내렸다. '}
                        {'특정 기업·사건이 아니라 그 밑바탕의 보편적 물음 — '}
                        <b>{'한 사람 한 사람은 결코 드러나지 않게 하면서도, 집단에 대한 통계는 정확히 알아낼 수 있는가'}</b>
                        {' — 를 이 실험에 담았다. 그 물음에 수십 년 전 이미 답을 준 고전적 장치가 '}<b>{'랜덤 응답(randomized response)'}</b>{'이고, '}
                        {'오늘날 '}<b>{'차등 프라이버시(differential privacy)'}</b>{'의 씨앗이다.'}
                    </p>
                    <p>
                        {'규칙은 놀랍도록 단순하다. "당신은 …했습니까?" 같은 민감한 예/아니오 질문에, 응답자는 곧이곧대로 답하지 않는다. '}
                        {'확률 '}<b>{'p'}</b>{'로는 진실을 말하고, 확률 '}<b>{'1−p'}</b>{'로는 동전을 던져 앞면이면 Yes, 뒷면이면 No라고 답한다. '}
                        {'그러면 누군가의 답이 "Yes"라 해도 그게 진심인지 동전 탓인지 아무도 단정할 수 없다 — 이것이 '}<b>{'그럴듯한 부인(plausible deniability)'}</b>{'이다. '}
                        {'왼쪽 격자에서 한 명을 골라보라. p를 낮추면 공격자의 확신도가 동전 던지기(50%)로 주저앉는다.'}
                    </p>
                    <p>
                        {'그런데도 조사원은 진짜 비율을 되찾을 수 있다. 보고된 Yes 비율을 '}<b>{'ŷ'}</b>{'라 하면, 잡음이 섞이는 방식을 알기에 편향을 벗겨낼 수 있다: '}
                        <b>{'π̂ = (ŷ − (1−p)/2) ÷ p'}</b>{'. 개인은 거짓말을 해도, 거짓말의 '}<b>{'규칙'}</b>{'이 알려져 있으면 평균은 정직해지는 셈이다. '}
                        {'다만 공짜는 없다 — p가 작을수록(보호가 강할수록) 추정의 신뢰구간이 넓어져, 같은 정확도를 얻으려면 더 많은 표본 N이 필요하다. '}
                        {'이 맞바꿈의 세기를 하나의 숫자로 압축한 것이 '}<b>{'프라이버시 예산 ε = ln((1+p)/(1−p))'}</b>{'이다. ε이 작으면 강한 보호·흐린 통계, 크면 선명한 통계·약한 보호다.'}
                    </p>
                    <p>
                        {'직접 밀고 당겨 보라. '}<b>{'p'}</b>{' 슬라이더를 왼쪽 끝으로 가져가면 격자의 절반 가까이가 잡음으로 뒤집히고 ε이 0에 붙으며 공격자는 무력해지지만, '}
                        {'오른쪽 π̂의 신뢰구간이 크게 벌어진다. '}<b>{'⏩ 반복'}</b>{'을 켜면 릴리스마다 추정이 진짜 값 둘레로 얼마나 요동치는지, '}
                        <b>{'N'}</b>{'을 키우면 그 요동이 어떻게 좁혀지는지 눈으로 확인할 수 있다. 설문조사·통계청 집계·브라우저 원격 측정·연합 학습이 기대는, '}
                        <b>{'"개인은 잡음 뒤에 숨고 진실은 평균으로만 드러난다"'}</b>{'는 그 원형이 여기 있다.'}
                    </p>
                    <p className="dn-disclaimer">
                        {'* 랜덤 응답의 통계적 구조(진실 확률 p, 편향 제거 추정, ε=ln((1+p)/(1−p)))만 남긴 개념 데모입니다. '}
                        {'실제 차등 프라이버시의 반복 질의 합성(composition)·라플라스/가우스 메커니즘·민감도 보정 등은 단순화했으며, 유한 표본에서는 추정이 이론값 둘레로 요동칩니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Deniable;
