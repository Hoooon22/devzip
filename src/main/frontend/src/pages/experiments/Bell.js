import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Bell.css';

// BELL — 얽힘의 비국소 상관을 CHSH 게임으로 체험한다.
//   심판이 앨리스에게 질문 x, 밥에게 질문 y(각 0/1)를 랜덤으로 던진다. 둘은 서로
//   신호를 주고받을 수 없다. 각자 답 a, b(0/1)를 내고, a⊕b == x·y 이면 한 판을 이긴다.
//   - 고전 전략(공유 난수·사전 약속)의 최선은 승률 0.75 (예: 둘 다 항상 0).
//   - 얽힌 쌍을 나눠 갖고 측정각으로 답을 정하면 cos²(22.5°) ≈ 0.8536 까지 오른다(초른손 한계).
//   측정 모델: 얽힌 쌍의 두 결과가 "같을" 확률 = cos²(αx − βy). 각자의 답 자체는 50:50이라
//   국소적으로는 완전 랜덤(신호 전달 없음)이고, 상관은 오직 양쪽을 맞춰봐야 드러난다.

const D2R = Math.PI / 180;
const CLASSIC_BOUND = 0.75;                 // 고전 최대 승률
const TSIRELSON = Math.cos(22.5 * D2R) ** 2; // ≈ 0.8536 양자 최대 승률
const OPTIMAL = { a0: 0, a1: 45, b0: 22.5, b1: -22.5 };

// 한 판 시뮬레이션 — 전략과 측정각을 받아 결과 한 라운드를 돌려준다.
function playRound(strategy, ang) {
    const x = Math.random() < 0.5 ? 0 : 1;
    const y = Math.random() < 0.5 ? 0 : 1;
    let a, b, alpha = null, beta = null;
    if (strategy === 'classic0') {
        a = 0; b = 0;                            // 둘 다 항상 0 — 고전 최선
    } else if (strategy === 'classicRand') {
        a = Math.random() < 0.5 ? 0 : 1;         // 아무 약속 없는 무작위
        b = Math.random() < 0.5 ? 0 : 1;
    } else {
        alpha = x === 0 ? ang.a0 : ang.a1;       // 얽힘: 질문에 따라 측정각 선택
        beta = y === 0 ? ang.b0 : ang.b1;
        const pSame = Math.cos((alpha - beta) * D2R) ** 2;
        a = Math.random() < 0.5 ? 0 : 1;         // 국소 결과는 완전 랜덤
        b = Math.random() < pSame ? a : 1 - a;   // 상관만 cos²로 얽힌다
    }
    const win = ((a ^ b) === (x & y));
    return { x, y, a, b, alpha, beta, win };
}

// 측정각으로부터 기대 승률(이론값)을 계산.
function expectedWin(strategy, ang) {
    if (strategy === 'classic0') return 0.75;
    if (strategy === 'classicRand') return 0.5;
    const c = (d) => Math.cos(d * D2R) ** 2;
    const s = (d) => Math.sin(d * D2R) ** 2;
    // (0,0)(0,1)(1,0)은 a=b 필요 → cos², (1,1)은 a≠b 필요 → sin²
    return (c(ang.a0 - ang.b0) + c(ang.a0 - ang.b1) + c(ang.a1 - ang.b0) + s(ang.a1 - ang.b1)) / 4;
}

// 측정각 다이얼(편광축은 방향성 없는 직선이라 양방향으로 그린다)
const Dial = ({ deg, active, who }) => {
    const R = 20;
    const rad = deg * D2R;
    const dx = Math.cos(rad) * R, dy = Math.sin(rad) * R;
    return (
        <svg viewBox="0 0 52 52" className={`bl-dial bl-dial-${who}${active ? ' bl-dial-on' : ''}`}>
            <circle cx="26" cy="26" r="23" className="bl-dial-ring" />
            <line x1="3" y1="26" x2="49" y2="26" className="bl-dial-axis" />
            <line x1="26" y1="3" x2="26" y2="49" className="bl-dial-axis" />
            <line x1={26 - dx} y1={26 + dy} x2={26 + dx} y2={26 - dy} className="bl-dial-needle" />
            <circle cx="26" cy="26" r="2.4" className="bl-dial-hub" />
        </svg>
    );
};

Dial.propTypes = {
    deg: PropTypes.number.isRequired,
    active: PropTypes.bool,
    who: PropTypes.string.isRequired,
};

const STRATS = [
    { key: 'quantum', label: '양자 (얽힘)', tag: 'entangled' },
    { key: 'classic0', label: '고전 (항상 0)', tag: 'best classical' },
    { key: 'classicRand', label: '고전 (무작위)', tag: 'random' },
];

const Bell = () => {
    const [strategy, setStrategy] = useState('quantum');
    const [ang, setAng] = useState({ ...OPTIMAL });
    const [round, setRound] = useState(null);
    const [stats, setStats] = useState({ n: 0, wins: 0 });
    const [log, setLog] = useState([]);          // 최근 라운드 승/패 (최신 앞)
    const [running, setRunning] = useState(false);

    // 루프가 최신 설정을 읽도록 ref 미러
    const stratRef = useRef(strategy);
    const angRef = useRef(ang);
    const nRef = useRef(0);
    useEffect(() => { stratRef.current = strategy; }, [strategy]);
    useEffect(() => { angRef.current = ang; }, [ang]);
    useEffect(() => { nRef.current = stats.n; }, [stats.n]);

    const resetStats = useCallback(() => {
        setStats({ n: 0, wins: 0 });
        setLog([]);
        setRound(null);
    }, []);

    const step = useCallback((batch) => {
        const s = stratRef.current, a = angRef.current;
        let last = null, w = 0;
        const fresh = [];
        for (let i = 0; i < batch; i++) {
            const r = playRound(s, a);
            if (r.win) w++;
            last = r;
            fresh.push(r.win);
        }
        setStats((p) => ({ n: p.n + batch, wins: p.wins + w }));
        setRound(last);
        setLog((p) => [...fresh.reverse(), ...p].slice(0, 72));
    }, []);

    // 자동 실행 — 배치로 라운드를 흘려보내며 승률이 한계선으로 수렴하는 걸 본다.
    useEffect(() => {
        if (!running) return undefined;
        const id = setInterval(() => {
            if (nRef.current >= 6000) { setRunning(false); return; }
            step(15);
        }, 45);
        return () => clearInterval(id);
    }, [running, step]);

    const changeStrategy = (key) => {
        if (key === strategy) return;
        setRunning(false);
        setStrategy(key);
        resetStats();
    };

    const changeAngle = (key, val) => {
        setRunning(false);
        setAng((p) => ({ ...p, [key]: val }));
        resetStats();
    };

    const useOptimal = () => {
        setRunning(false);
        setAng({ ...OPTIMAL });
        resetStats();
    };

    const p = stats.n > 0 ? stats.wins / stats.n : 0;
    const theo = expectedWin(strategy, ang);
    const enough = stats.n >= 200;
    const broke = strategy === 'quantum' && enough && p > CLASSIC_BOUND;

    // 설정쌍별 승리 조건과 확률(현재 각 기준) — 얽힘 전략에서만 의미
    const c = (d) => Math.cos(d * D2R) ** 2;
    const s = (d) => Math.sin(d * D2R) ** 2;
    const pairs = [
        { q: '00', need: 'a = b', prob: c(ang.a0 - ang.b0) },
        { q: '01', need: 'a = b', prob: c(ang.a0 - ang.b1) },
        { q: '10', need: 'a = b', prob: c(ang.a1 - ang.b0) },
        { q: '11', need: 'a ≠ b', prob: s(ang.a1 - ang.b1) },
    ];

    let verdict, vclass;
    if (stats.n === 0) {
        verdict = '한 판을 돌려 심판의 질문에 답해보세요';
        vclass = 'idle';
    } else if (!enough) {
        verdict = `표본 ${stats.n}판 — 더 모아야 승률이 안정됩니다`;
        vclass = 'idle';
    } else if (strategy === 'quantum') {
        verdict = broke
            ? '고전 한계 0.75 돌파 ✓ — 어떤 사전 약속으로도 불가능한 상관, 얽힘의 증거'
            : '아직 0.75 아래 — 측정각을 최적(22.5° 간격)으로 맞춰보세요';
        vclass = broke ? 'win' : 'part';
    } else {
        verdict = strategy === 'classic0'
            ? '고전 최선 — 승률 0.75가 벽이다. 이 벽은 절대 못 넘는다'
            : '무작위 답 — 승률 0.5. 상관이 없으면 동전 던지기다';
        vclass = 'part';
    }

    const R = round;
    const banner = R
        ? (R.win ? 'WIN' : 'LOSE')
        : '—';
    const winParity = R ? (R.a ^ R.b) : '—';
    const target = R ? (R.x & R.y) : '—';

    return (
        <LabShell
            title="BELL"
            eyebrow="quantum entanglement · CHSH nonlocal game"
            subtitle={'// 서로 신호도 못 보내는 두 사람이, 어떤 사전 약속으로도 불가능한 승률을 낸다'}
            path="bell.exe"
        >
            <section className="k-win bl-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/chsh/</span>bell-test</span>
                    <span className="meta k-mono">이기는 조건 · a⊕b = x·y</span>
                </div>

                <div className="bl-stage">
                    <div className="bl-view-col">
                        {/* 게임 테이블: 앨리스 ← 얽힘소스 → 밥 */}
                        <div className="bl-table">
                            <div className={`bl-party bl-alice${R ? ' bl-live' : ''}`}>
                                <span className="bl-party-name k-mono">ALICE</span>
                                <span className="bl-q k-mono">질문 x = <b>{R ? R.x : '?'}</b></span>
                                <Dial deg={R && R.alpha != null ? R.alpha : (strategy === 'quantum' ? ang.a0 : 0)} active={!!R} who="alice" />
                                <span className="bl-ang k-mono">
                                    {strategy === 'quantum'
                                        ? `측정각 ${R && R.alpha != null ? R.alpha : ang.a0}°`
                                        : '측정 없음'}
                                </span>
                                <span className={`bl-out${R ? (R.a ? ' bl-out-1' : ' bl-out-0') : ''}`}>
                                    {R ? R.a : '·'}
                                </span>
                                <span className="bl-out-lab k-mono">답 a</span>
                            </div>

                            <div className="bl-source">
                                <div className="bl-source-core">
                                    <span className="bl-photon bl-photon-l" />
                                    <span className="bl-star">✦</span>
                                    <span className="bl-photon bl-photon-r" />
                                </div>
                                <span className="bl-source-lab k-mono">얽힘 소스</span>
                                <span className="bl-nosig k-mono">no signaling</span>
                            </div>

                            <div className={`bl-party bl-bob${R ? ' bl-live' : ''}`}>
                                <span className="bl-party-name k-mono">BOB</span>
                                <span className="bl-q k-mono">질문 y = <b>{R ? R.y : '?'}</b></span>
                                <Dial deg={R && R.beta != null ? R.beta : (strategy === 'quantum' ? ang.b0 : 0)} active={!!R} who="bob" />
                                <span className="bl-ang k-mono">
                                    {strategy === 'quantum'
                                        ? `측정각 ${R && R.beta != null ? R.beta : ang.b0}°`
                                        : '측정 없음'}
                                </span>
                                <span className={`bl-out${R ? (R.b ? ' bl-out-1' : ' bl-out-0') : ''}`}>
                                    {R ? R.b : '·'}
                                </span>
                                <span className="bl-out-lab k-mono">답 b</span>
                            </div>
                        </div>

                        <div className={`bl-referee bl-ref-${R ? (R.win ? 'win' : 'lose') : 'idle'}`}>
                            <span className="bl-ref-calc k-mono">
                                a⊕b = <b>{winParity}</b> · x·y = <b>{target}</b>
                            </span>
                            <span className="bl-ref-stamp">{banner}</span>
                        </div>

                        {/* 전략 선택 */}
                        <div className="bl-strats">
                            {STRATS.map((st) => (
                                <button
                                    key={st.key}
                                    type="button"
                                    className={`bl-strat${strategy === st.key ? ' bl-strat-on' : ''}`}
                                    onClick={() => changeStrategy(st.key)}
                                >
                                    <span className="bl-strat-lab">{st.label}</span>
                                    <span className="bl-strat-tag k-mono">{st.tag}</span>
                                </button>
                            ))}
                        </div>

                        {/* 얽힘 전략일 때만 측정각 조절 */}
                        {strategy === 'quantum' && (
                            <div className="bl-angles">
                                <div className="bl-angles-head k-mono">
                                    측정각 — 앨리스·밥의 각 질문별 각도 <button type="button" className="bl-mini" onClick={useOptimal}>최적각으로</button>
                                </div>
                                <div className="bl-angle-grid">
                                    {[
                                        { key: 'a0', lab: '앨리스 · x=0', who: 'alice' },
                                        { key: 'a1', lab: '앨리스 · x=1', who: 'alice' },
                                        { key: 'b0', lab: '밥 · y=0', who: 'bob' },
                                        { key: 'b1', lab: '밥 · y=1', who: 'bob' },
                                    ].map((it) => (
                                        <label key={it.key} className={`bl-angle bl-angle-${it.who}`}>
                                            <span className="bl-angle-lab k-mono">{it.lab} <b>{ang[it.key]}°</b></span>
                                            <input
                                                type="range" min="-90" max="90" step="1"
                                                value={ang[it.key]}
                                                onChange={(e) => changeAngle(it.key, parseInt(e.target.value, 10))}
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 최근 라운드 스트립 */}
                        <div className="bl-strip">
                            <span className="bl-strip-lab k-mono">최근 {log.length}판</span>
                            <div className="bl-strip-cells">
                                {log.map((w, i) => (
                                    <span key={i} className={`bl-cell ${w ? 'bl-cell-w' : 'bl-cell-l'}`} />
                                ))}
                            </div>
                        </div>

                        <p className="bl-view-foot k-mono">
                            <b>양자(얽힘)</b>에서 측정각을 <b>22.5° 간격</b>으로 맞추면 네 질문 모두 승률이 같아지며
                            평균 <b>0.854</b> — 고전으로는 절대 못 넘는 <b>0.75</b>의 벽을 넘는다.
                        </p>
                    </div>

                    {/* 오른쪽 계기판 */}
                    <div className="bl-right">
                        <div className={`bl-scorebox bl-${vclass}`}>
                            <span className="bl-score-lab k-mono">경험 승률 (이긴 판 / 전체)</span>
                            <span className="bl-score-num">{stats.n > 0 ? p.toFixed(3) : '—'}</span>
                            <span className="bl-score-sub k-mono">{stats.wins} / {stats.n} 판</span>
                        </div>

                        {/* 승률 바 — 0.5 무작위 · 0.75 고전 한계 · 0.854 초른손 한계 */}
                        <div className="bl-bar">
                            <div className="bl-bar-track">
                                <div className="bl-bar-fill" style={{ width: `${p * 100}%` }} />
                                <span className="bl-bar-mark bl-mark-rand" style={{ left: '50%' }} />
                                <span className="bl-bar-mark bl-mark-cl" style={{ left: `${CLASSIC_BOUND * 100}%` }} />
                                <span className="bl-bar-mark bl-mark-ts" style={{ left: `${TSIRELSON * 100}%` }} />
                            </div>
                            <div className="bl-bar-legend k-mono">
                                <span><i className="bl-lg bl-lg-rand" />0.50 무작위</span>
                                <span><i className="bl-lg bl-lg-cl" />0.75 고전 한계</span>
                                <span><i className="bl-lg bl-lg-ts" />0.854 양자 최대</span>
                            </div>
                        </div>

                        <div className="bl-theo">
                            <span className="bl-theo-lab k-mono">이론 기대 승률 (현재 설정)</span>
                            <span className="bl-theo-num k-mono">{theo.toFixed(3)}</span>
                            <span className="bl-theo-foot k-mono">
                                {theo > CLASSIC_BOUND + 1e-9 ? '고전 한계 초과 — 양자 영역' : theo < 0.5 + 1e-9 ? '무작위 수준' : '고전으로 도달 가능'}
                            </span>
                        </div>

                        {strategy === 'quantum' && (
                            <div className="bl-pairs">
                                <span className="bl-pairs-lab k-mono">질문쌍별 승리 확률</span>
                                {pairs.map((pr) => (
                                    <div key={pr.q} className="bl-pair">
                                        <span className="bl-pair-q k-mono">x,y={pr.q}</span>
                                        <span className="bl-pair-need k-mono">{pr.need}</span>
                                        <div className="bl-pair-track">
                                            <div className="bl-pair-fill" style={{ width: `${pr.prob * 100}%` }} />
                                        </div>
                                        <span className="bl-pair-num k-mono">{pr.prob.toFixed(2)}</span>
                                    </div>
                                ))}
                                <span className="bl-pairs-foot k-mono">
                                    넷을 동시에 1.0으로 만들 수는 없다 — 최선의 타협이 0.854
                                </span>
                            </div>
                        )}

                        <div className={`bl-verdict bl-${vclass}`}>
                            <p className="bl-verdict-txt">{verdict}</p>
                        </div>

                        <div className="bl-actions">
                            <button type="button" className="bl-btn bl-btn-hot" onClick={() => { setRunning(false); step(1); }}>
                                ▶ 한 판
                            </button>
                            <button type="button" className="bl-btn bl-btn-warm" onClick={() => setRunning((r) => !r)}>
                                {running ? '⏸ 정지' : '⏩ 자동'}
                            </button>
                            <button type="button" className="bl-btn bl-btn-ghost" onClick={resetStats}>↻ 리셋</button>
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win bl-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="bl-foot">
                    <p>
                        {'"센티미터 크기의 결정에서도 양자 얽힘의 흔적이 뚜렷이 나타났다 — 일상적 크기의 물체가 예상보다 '}
                        {'깊은 양자 성질을 보인다"는 소식이 화제가 됐다. 특정 연구·장치가 아니라 그 밑바탕의 보편적 질문 — '}
                        <b>{'멀리 떨어져 서로 신호도 주고받을 수 없는 두 입자가, 어떻게 어떤 사전 약속으로도 흉내 낼 수 없는 상관을 보이는가'}</b>
                        {' — 를 이 실험에 담았다. 그 질문을 게임 한 판으로 압축한 것이 '}<b>{'CHSH 게임(벨 부등식)'}</b>{'이다.'}
                    </p>
                    <p>
                        {'규칙은 단순하다. 심판이 '}<b>{'앨리스'}</b>{'에게 질문 x, '}<b>{'밥'}</b>{'에게 질문 y 를 랜덤(각 0/1)으로 던진다. '}
                        {'둘은 격리되어 서로의 질문도, 답도 알 수 없다. 각자 답 a, b(0/1)를 내고 '}<b>{'a⊕b = x·y'}</b>{' 이면 그 판을 이긴다. '}
                        {'즉 두 질문이 모두 1일 때만 답이 서로 달라야 하고, 나머지 세 경우엔 답이 같아야 한다. 미리 아무리 좋은 작전을 '}
                        {'짜도 — 심지어 공유 난수표를 나눠 가져도 — '}<b>{'고전 전략의 승률은 0.75를 넘지 못한다'}</b>{'. "둘 다 항상 0"이 '}
                        {'바로 그 최선으로, 네 질문 중 세 경우를 자동으로 맞힌다.'}
                    </p>
                    <p>
                        {'그런데 얽힌 입자 쌍을 하나씩 나눠 가지면 벽이 무너진다. 앨리스는 자기 질문에 따라 측정각 '}<b>{'α'}</b>{'를, '}
                        {'밥은 '}<b>{'β'}</b>{'를 고른다. 얽힌 쌍의 두 측정 결과가 '}<b>{'같을 확률은 cos²(α−β)'}</b>{' — 각도 차가 작으면 거의 '}
                        {'같이 나오고, 90°에 가까우면 거의 반대로 나온다. 각도를 앨리스 0°/45°, 밥 22.5°/−22.5° 로 두면 이길 필요가 '}
                        {'있는 네 경우 모두에서 조건이 '}<b>{'cos²(22.5°) ≈ 0.854'}</b>{' 확률로 충족된다. 이 값이 양자역학이 허락하는 최대치, '}
                        <b>{'초른손 한계'}</b>{'다. 오른쪽 "질문쌍별 승리 확률"을 보라 — 넷을 동시에 1.0으로 만들 수는 없고, 최선의 타협이 0.854다.'}
                    </p>
                    <p>
                        {'놀라운 대목은 '}<b>{'국소적으로는 아무 일도 안 일어난다'}</b>{'는 점이다. 앨리스의 답 a 는 밥이 뭘 하든 언제나 50:50 '}
                        {'완전 무작위다(그래서 이걸로 신호를 보낼 수 없다 — "no signaling"). 상관은 오직 나중에 양쪽 기록을 '}<b>{'맞춰봐야'}</b>
                        {' 드러난다. 그럼에도 그 상관은 "각자 답을 미리 정해두고 나눠 가졌다"는 어떤 고전적 설명으로도 재현되지 않는다. '}
                        {'이것이 벨이 1964년에 증명한 것이고, 이후 실험들이 반복해 확인한 자연의 '}<b>{'비국소성'}</b>{'이다.'}
                    </p>
                    <p>
                        {'직접 해보라. '}<b>{'고전 (항상 0)'}</b>{'으로 자동을 돌리면 승률이 0.75 선에 딱 붙어 멈춘다. '}<b>{'양자 (얽힘)'}</b>{'으로 '}
                        {'바꿔 최적각인 채 돌리면 바가 0.75 벽을 넘어 0.854 쪽으로 기어오른다. 측정각 슬라이더를 흔들어 22.5° 간격을 '}
                        {'깨보면 왜 이론 기대 승률이 곧장 떨어지는지, 왜 이 각이 특별한지 눈으로 확인할 수 있다. 양자 키 분배·양자 컴퓨팅·'}
                        {'난수 인증이 모두 기대는, "얽힘은 흉내 낼 수 없다"는 그 원형이 여기 있다.'}
                    </p>
                    <p className="bl-disclaimer">
                        {'* 얽힘의 통계적 예측(같을 확률 cos²(α−β), 국소 결과는 50:50)만 남긴 개념 데모입니다. 실제 광자 편광·검출 효율·'}
                        {'허점(loophole)·상태 준비 등은 생략했으며, 유한 표본에서는 경험 승률이 이론값 둘레로 요동칩니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Bell;
