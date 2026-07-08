import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Bracket.css';

// BRACKET — 단판 토너먼트의 운(single-elimination variance) 실험.
// 핵심: 리그(풀리그)에서는 강팀이 약팀보다 경기를 더 많이 치러 실력이 성적에 수렴하지만,
// 단판 토너먼트는 "한 번 지면 끝"이다. 매 경기 약간의 운만 섞여도 그 실수 확률이 라운드마다
// 복리로 쌓여, 최강팀조차 우승 확률이 100%에서 뚝 떨어진다. 대진이 커질수록(라운드가 늘수록)
// 최강팀이 통과해야 할 관문이 많아져 우승은 더 불확실해진다.
//   · 운(luck) 슬라이더  — 매 경기의 무작위성. 0이면 강팀이 거의 항상 이기고, 100이면 동전던지기.
//   · 대진 크기          — 8/16/32강. 라운드 수 = log2(N). 클수록 업셋이 쌓일 기회가 많다.

const SIMS = 2000; // 몬테카를로 반복 수
const SIZES = [8, 16, 32];

// 표준 시딩 순서 — 1번과 2번 시드가 결승에서만 만나도록 대진을 좌우로 갈라 배치한다.
function seedOrder(n) {
    let pols = [1];
    while (pols.length < n) {
        const len = pols.length * 2;
        const next = [];
        for (const p of pols) { next.push(p); next.push(len + 1 - p); }
        pols = next;
    }
    return pols;
}

// 한 판 시뮬레이션 — 라운드별 경기 결과를 모아 반환한다.
// base: 시드→실력(0~1, 1번 시드=1). slope: 실력 반영 강도(운이 높을수록 작아짐).
function simulate(order, base, slope) {
    let round = order.slice();
    const rounds = [];
    while (round.length > 1) {
        const matches = [];
        const next = [];
        for (let i = 0; i < round.length; i += 2) {
            const a = round[i], b = round[i + 1];
            const pa = 1 / (1 + Math.exp(-(base(a) - base(b)) * slope));
            const winner = Math.random() < pa ? a : b;
            const loser = winner === a ? b : a;
            matches.push({ a, b, winner, upset: winner > loser }); // 시드 번호가 클수록 약체 → 업셋
            next.push(winner);
        }
        rounds.push(matches);
        round = next;
    }
    return { rounds, champion: round[0] };
}

const roundLabel = (teams) => (teams === 2 ? '결승' : `${teams}강`);

const Bracket = () => {
    const [size, setSize] = useState(16);
    const [luck, setLuck] = useState(40);
    const [run, setRun] = useState(null);   // 단판 결과
    const [dist, setDist] = useState(null);  // 몬테카를로 결과

    const order = useMemo(() => seedOrder(size), [size]);
    const base = useCallback((s) => (size - s) / (size - 1), [size]);
    const slope = useMemo(() => 12 * (1 - luck / 100), [luck]); // 운 0→12(결정적), 100→0(동전던지기)

    const runOne = useCallback(() => {
        setRun(simulate(order, base, slope));
    }, [order, base, slope]);

    const runMany = useCallback(() => {
        const counts = new Array(size + 1).fill(0);
        let upsetTotal = 0, matchTotal = 0;
        for (let t = 0; t < SIMS; t++) {
            const r = simulate(order, base, slope);
            counts[r.champion] += 1;
            for (const rd of r.rounds) for (const m of rd) { matchTotal += 1; if (m.upset) upsetTotal += 1; }
        }
        const half = size / 2;
        let underdog = 0;
        for (let s = half + 1; s <= size; s++) underdog += counts[s];
        setDist({
            counts,
            favRate: counts[1] / SIMS,       // 1번 시드(최강) 우승률
            underdogRate: underdog / SIMS,   // 하위 절반 팀의 우승 비율
            upsetRate: upsetTotal / matchTotal,
        });
    }, [order, base, slope, size]);

    // 크기·운이 바뀌면 이전 결과를 지우고, 화면이 비지 않게 단판 하나를 새로 돌린다.
    useEffect(() => {
        setDist(null);
        setRun(simulate(seedOrder(size), (s) => (size - s) / (size - 1), 12 * (1 - luck / 100)));
    }, [size, luck]);

    const rounds = run ? run.rounds : [];
    const bracketH = rounds.length ? rounds[0].length * 56 : 0;
    const favPct = dist ? Math.round(dist.favRate * 100) : null;

    return (
        <LabShell
            title="BRACKET"
            eyebrow="single elimination"
            subtitle={'// 단판 승부 — 매 경기의 작은 운이 라운드마다 쌓여 최강팀도 자주 진다'}
            path="bracket.exe"
        >
            <section className="k-win br-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/tourney/</span>knockout</span>
                    <span className="meta k-mono">{size}강 · {Math.log2(size)}라운드</span>
                </div>

                <div className="br-toolbar">
                    <div className="br-sizes" role="group" aria-label="대진 크기">
                        {SIZES.map((n) => (
                            <button
                                key={n}
                                type="button"
                                className={`br-size ${size === n ? 'is-on' : ''}`}
                                onClick={() => setSize(n)}
                            >
                                {n}강
                            </button>
                        ))}
                    </div>
                    <div className="br-ctrl">
                        <label className="br-ctrl-label k-mono" htmlFor="br-luck">
                            운(randomness) <b>{luck}</b>
                            <span className="br-ctrl-hint">{luck <= 15 ? '실력대로' : luck >= 80 ? '거의 동전던지기' : '실력 + 운'}</span>
                        </label>
                        <input id="br-luck" type="range" min="0" max="100" step="5"
                            value={luck} onChange={(e) => setLuck(Number(e.target.value))} />
                    </div>
                    <div className="br-actions">
                        <button type="button" className="br-btn" onClick={runOne}>▶ 한 판</button>
                        <button type="button" className="br-btn br-btn-ghost" onClick={runMany}>🎲 {SIMS.toLocaleString()}판 시뮬</button>
                    </div>
                </div>

                <div className="br-stage">
                    <div className="br-bracket-col">
                        <div className="br-bracket" style={{ height: bracketH ? `${bracketH}px` : 'auto' }}>
                            {rounds.map((matches, ri) => (
                                <div className="br-round" key={ri}>
                                    <div className="br-round-head k-mono">{roundLabel(matches.length * 2)}</div>
                                    <div className="br-round-body">
                                        {matches.map((m, mi) => (
                                            <div className={`br-match ${m.upset ? 'is-upset' : ''}`} key={mi}>
                                                <BracketTeam seed={m.a} win={m.winner === m.a} />
                                                <BracketTeam seed={m.b} win={m.winner === m.b} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {run && (
                                <div className="br-round br-round-champ">
                                    <div className="br-round-head k-mono">우승</div>
                                    <div className="br-round-body">
                                        <div className={`br-champ ${run.champion === 1 ? 'is-fav' : 'is-upset'}`}>
                                            <span className="br-crown">🏆</span>
                                            <span className="br-champ-seed k-mono">#{run.champion}</span>
                                            <span className="br-champ-tag k-mono">
                                                {run.champion === 1 ? '최강 시드' : `${run.champion}번 시드`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <p className="br-bracket-foot k-mono">
                            숫자는 <b>시드(#1 = 최강)</b> · <span className="br-inline-win">굵은 칸</span>이 승자 · <span className="br-inline-upset">붉은 테두리</span>는 약체가 이긴 업셋
                        </p>
                    </div>

                    <div className="br-right">
                        <div className="br-panel-head k-mono">{dist ? `${SIMS.toLocaleString()}판 통계` : '한 판 결과'}</div>

                        {dist ? (
                            <>
                                <div className="br-stats">
                                    <div className="br-stat">
                                        <span className="br-stat-lab k-mono">#1 우승률</span>
                                        <span className="br-stat-num k-mono">{favPct}%</span>
                                        <span className="br-stat-sub k-mono">최강팀도 이만큼만</span>
                                    </div>
                                    <div className="br-stat">
                                        <span className="br-stat-lab k-mono">하위 절반 우승</span>
                                        <span className="br-stat-num k-mono">{Math.round(dist.underdogRate * 100)}%</span>
                                        <span className="br-stat-sub k-mono">약체가 든 트로피</span>
                                    </div>
                                </div>

                                <div className="br-dist">
                                    <div className="br-dist-head k-mono">시드별 우승 확률</div>
                                    <ul className="br-dist-list">
                                        {dist.counts.slice(1).map((c, i) => {
                                            const seed = i + 1;
                                            const pct = (c / SIMS) * 100;
                                            const w = Math.max(pct, c > 0 ? 1.5 : 0);
                                            return (
                                                <li key={seed} className={`br-bar-row ${seed === 1 ? 'is-fav' : ''}`}>
                                                    <span className="br-bar-seed k-mono">#{seed}</span>
                                                    <span className="br-bar-track">
                                                        <span className="br-bar-fill" style={{ width: `${w}%` }} />
                                                    </span>
                                                    <span className="br-bar-pct k-mono">{pct >= 0.1 ? pct.toFixed(1) : '·'}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </>
                        ) : (
                            <div className="br-run-note">
                                <p>
                                    한 판을 돌릴 때마다 대진이 새로 풀립니다. 운이 섞이면 <b>#1이 초반에 탈락</b>하기도 합니다.
                                </p>
                                <p className="k-mono br-run-hint">
                                    같은 조건으로 <b>🎲 {SIMS.toLocaleString()}판</b>을 돌려, 최강팀의 우승 확률이 실제로 몇 %인지 세어 보세요.
                                </p>
                            </div>
                        )}

                        <div className={`br-verdict ${dist ? 'is-on' : ''}`}>
                            {dist ? (
                                <p className="br-verdict-txt">
                                    실력만 통했다면 <b>#1이 100%</b> 우승하지만, 지금 설정에선 <b>{favPct}%</b>에 그칩니다.
                                    라운드마다 쌓인 업셋(경기당 {Math.round(dist.upsetRate * 100)}%)이
                                    나머지 <b>{100 - favPct}%</b>를 다른 팀들에게 나눠 줍니다.
                                </p>
                            ) : (
                                <p className="br-verdict-hint k-mono">
                                    운을 올리거나 대진을 키운 뒤 다시 시뮬해, #1 우승률이 어떻게 떨어지는지 비교해 보세요.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win br-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="br-foot">
                    <p>
                        {'풀리그(라운드 로빈)에서는 강팀이 약팀보다 훨씬 많은 경기를 치른다. 한두 번 삐끗해도 '}
                        {'수십 경기의 평균이 실력을 성적에 수렴시켜, 대개 진짜 강한 팀이 위로 올라온다. '}
                        <b>{'단판 토너먼트'}</b>{'는 정반대다 — 한 번 지면 그대로 끝. 매 경기에 섞인 작은 운이 '}
                        {'"그날의 이변"으로 곧장 탈락을 만든다.'}
                    </p>
                    <p>
                        {'핵심은 '}<b>{'복리'}</b>{'다. 최강팀이 우승하려면 '}<b>{'log₂(N)'}</b>{'번의 관문을 '}
                        {'모두 통과해야 한다(16강이면 4번, 32강이면 5번). 경기당 이길 확률이 아무리 높아도 '}
                        {'그것을 여러 번 곱하면 값은 빠르게 깎인다. 경기당 승률 85%라도 4연승 확률은 0.85⁴ ≈ 52%, '}
                        {'5연승이면 44%로 떨어진다. 대진을 키울수록 최강팀의 우승은 더 불확실해진다.'}
                    </p>
                    <p>
                        <b>{'운'}</b>{' 슬라이더를 0에 두면 강팀이 거의 항상 이겨 #1 우승률이 100%에 가깝지만, '}
                        {'조금만 올려도 우승 트로피가 여러 시드에게 흩어진다. 이것이 왜 짧은 시리즈·단판 승부가 '}
                        {'"각본 없는 드라마"가 되는지, 왜 리그 1위가 컵대회에서 곧잘 무너지는지의 이유다 — '}
                        {'약팀이 강해서가 아니라, 형식 자체가 운을 증폭하기 때문이다.'}
                    </p>
                    <p className="br-disclaimer">
                        {'* 각 팀 실력을 시드 순으로 매긴 뒤 경기 승패를 로지스틱 확률로 뽑는 단순 모델입니다. '}
                        {'홈/원정·컨디션·상성·체력 소모 같은 실제 요인은 생략했습니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

const BracketTeam = ({ seed, win }) => (
    <span className={`br-team ${win ? 'is-win' : 'is-lose'}`}>
        <span className="br-team-seed k-mono">#{seed}</span>
        {seed === 1 && <span className="br-team-star" aria-hidden="true">★</span>}
    </span>
);

BracketTeam.propTypes = {
    seed: PropTypes.number.isRequired,
    win: PropTypes.bool.isRequired,
};

export default Bracket;
