import React, { useMemo, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Wildcard.css';

// WILDCARD — 조별 3위 줄 세우기(와일드카드 진출). 48개 참가자를 4팀씩 12개 조로 나눠
//   조별 리그를 치르고, 각 조 1·2위는 곧장 진출(24팀), 각 조 3위 12팀 중 "가장 성적 좋은 8팀"만
//   추가로 살린다(와일드카드). 나머지 16팀 탈락.
// 밑바탕의 보편 개념: 서로 한 번도 맞붙지 않은 12개 조를 어떻게 한 줄로 세우나 —
//   비교 불가능한 집단(cohort)의 순위 매기기. 여기서 "조 편성 운"이 실력을 뒤집는 역설이 드러난다.
//   (특정 국가·선수·대회를 지목하지 않고 추상적인 참가자 코드 A1..L4 로만 다룬다.)

const GN = 12;                 // 조 수
const PER = 4;                 // 조당 팀 수
const N = GN * PER;            // 48
const WILDCARDS = 8;           // 3위 중 살아남는 수
const LETTERS = 'ABCDEFGHIJKL'.split('');
const MU = 1.35;               // 기본 기대 득점
const SCALE = 20;              // 실력차 → 득점 스케일

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// 표준정규 난수 (Box–Muller)
const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// 포아송 표본 (Knuth)
const poisson = (lam) => {
    const L = Math.exp(-lam);
    let k = 0, p = 1;
    do { k += 1; p *= Math.random(); } while (p > L);
    return k - 1;
};

const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

// 순위 비교: 승점 → 골득실 → 다득점 → 무작위 추첨(tb)
const cmpStanding = (a, b) => (b.p - a.p) || (b.gd - a.gd) || (b.gf - a.gf) || (b.tb - a.tb);

// 48개 참가자 생성 — 실력 편차(spread)가 클수록 강약이 뚜렷해진다.
const makeTeams = (spread) => {
    const sd = 4 + spread * 26; // 4 ~ 30
    const arr = [];
    for (let i = 0; i < N; i += 1) arr.push({ r: gauss() * sd, tb: Math.random() });
    // 실력 순위(1 = 가장 강함) — "실력대로라면 진출했어야 할 팀"을 판정하는 데 쓴다.
    [...arr].sort((x, y) => y.r - x.r).forEach((t, i) => { t.srank = i + 1; });
    return arr;
};

// 12개 조로 배정. seeded=시드 포트(균형), random=완전 무작위(불균형·죽음의 조 가능)
const assign = (teams, mode) => {
    const groups = Array.from({ length: GN }, () => []);
    if (mode === 'seeded') {
        const sorted = [...teams].sort((x, y) => y.r - x.r);
        for (let pot = 0; pot < PER; pot += 1) {
            shuffle(sorted.slice(pot * GN, pot * GN + GN)).forEach((t, g) => groups[g].push(t));
        }
    } else {
        shuffle([...teams]).forEach((t, i) => groups[Math.floor(i / PER)].push(t));
    }
    groups.forEach((g, gi) => g.forEach((t, ti) => { t.grp = LETTERS[gi]; t.code = `${LETTERS[gi]}${ti + 1}`; }));
    return groups;
};

// 한 조의 라운드로빈(6경기)을 치르고 순위대로 정렬해 반환
const playGroup = (gt) => {
    gt.forEach((t) => { t.p = 0; t.w = 0; t.d = 0; t.l = 0; t.gf = 0; t.ga = 0; });
    for (let i = 0; i < gt.length; i += 1) {
        for (let j = i + 1; j < gt.length; j += 1) {
            const A = gt[i], B = gt[j];
            const dl = (A.r - B.r) / SCALE;
            const ga = poisson(clamp(MU * Math.exp(0.9 * dl), 0.12, 6));
            const gb = poisson(clamp(MU * Math.exp(-0.9 * dl), 0.12, 6));
            A.gf += ga; A.ga += gb; B.gf += gb; B.ga += ga;
            if (ga > gb) { A.p += 3; A.w += 1; B.l += 1; }
            else if (ga < gb) { B.p += 3; B.w += 1; A.l += 1; }
            else { A.p += 1; B.p += 1; A.d += 1; B.d += 1; }
        }
    }
    gt.forEach((t) => { t.gd = t.gf - t.ga; });
    const ranked = [...gt].sort(cmpStanding);
    ranked.forEach((t, i) => { t.pos = i + 1; });
    return ranked;
};

// 전체 한 판 시뮬레이션
const simulate = (spread, mode) => {
    const teams = makeTeams(spread);
    const groups = assign(teams, mode).map(playGroup);

    // 각 조 1·2위 직행, 3위는 와일드카드 풀, 4위 탈락
    groups.forEach((g) => {
        g[0].status = 'Q'; g[1].status = 'Q'; g[3].status = 'X';
        g[2].status = 'T'; // 임시(3위) — 아래에서 W/X 확정
    });
    const thirds = groups.map((g) => g[2]).sort(cmpStanding);
    thirds.forEach((t, i) => { t.status = i < WILDCARDS ? 'W' : 'X'; t.wrank = i + 1; });

    const advancers = teams.filter((t) => t.status === 'Q' || t.status === 'W');
    const eliminated = teams.filter((t) => t.status === 'X');

    // 조 편성 운으로 탈락한 강팀: 실력 상위 32위 안인데 탈락한 수
    const unjust = eliminated.filter((t) => t.srank <= 32).length;
    // "죽음의 조": 실력 최상위 12팀(시드 포트라면 조당 1팀) 중 2팀 이상이 몰린 조 수
    const deathGroups = groups.filter((g) => g.filter((t) => t.srank <= GN).length >= 2).length;
    const strongestOut = eliminated.reduce((m, t) => (t.r > m.r ? t : m), eliminated[0]);
    const weakestIn = advancers.reduce((m, t) => (t.r < m.r ? t : m), advancers[0]);
    const cutPts = thirds[WILDCARDS - 1].p;         // 8위(마지막 진출) 승점 = 진출 컷
    const firstOutPts = thirds[WILDCARDS].p;        // 9위(첫 탈락) 승점

    return { groups, thirds, advancers, eliminated, unjust, deathGroups, strongestOut, weakestIn, cutPts, firstOutPts };
};

// 몬테카를로 — 진출 컷 승점 분포와 "부당 탈락" 빈도를 집계
const monteCarlo = (spread, mode, K) => {
    const hist = Array.from({ length: 10 }, (_, pts) => ({ pts, c: 0 })); // cutPts 0..9
    let sumCut = 0, sumUnjust = 0, sumDeath = 0;
    for (let i = 0; i < K; i += 1) {
        const s = simulate(spread, mode);
        hist[clamp(s.cutPts, 0, 9)].c += 1;
        sumCut += s.cutPts;
        sumUnjust += s.unjust;
        sumDeath += s.deathGroups;
    }
    return {
        K, hist,
        avgCut: sumCut / K,
        avgUnjust: sumUnjust / K,
        avgDeath: sumDeath / K,
    };
};

const sgn = (n) => (n > 0 ? `+${n}` : `${n}`);

const Wildcard = () => {
    const [spread, setSpread] = useState(0.55);
    const [mode, setMode] = useState('seeded');
    const [nonce, setNonce] = useState(0);
    const [mc, setMc] = useState(null);

    // nonce 를 의존성에 두어 "새 대진 추첨" 버튼이 같은 설정에서도 새 난수로 재시뮬레이션하게 한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const sim = useMemo(() => simulate(spread, mode), [spread, mode, nonce]);
    const redraw = () => { setNonce((n) => n + 1); setMc(null); };
    const runMC = () => setMc(monteCarlo(spread, mode, 800));

    const mcMax = mc ? Math.max(...mc.hist.map((d) => d.c)) : 1;

    return (
        <LabShell
            title="WILDCARD"
            eyebrow="cross-cohort ranking · best 3rd-placed"
            subtitle={'// 서로 만난 적 없는 12개 조를 어떻게 한 줄로 세우나 — 조 편성 운이 실력을 뒤집는 역설'}
            path="wildcard.exe"
        >
            {/* 컨트롤 */}
            <section className="k-win wc-ctrl-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">/draw/</span>controls</span>
                    <span className="meta k-mono">48팀 · 12조 · 각 조 1·2위 직행 + 3위 중 상위 8팀</span>
                </div>
                <div className="wc-ctrl">
                    <div className="wc-ctrl-block">
                        <span className="wc-ctrl-lab k-mono">조 편성 방식</span>
                        <div className="wc-seg">
                            <button
                                type="button"
                                className={`wc-seg-btn${mode === 'seeded' ? ' on' : ''}`}
                                onClick={() => { setMode('seeded'); setMc(null); }}
                            >
                                시드 포트 (균형)
                            </button>
                            <button
                                type="button"
                                className={`wc-seg-btn${mode === 'random' ? ' on' : ''}`}
                                onClick={() => { setMode('random'); setMc(null); }}
                            >
                                완전 무작위 (불균형)
                            </button>
                        </div>
                    </div>

                    <div className="wc-ctrl-block wc-grow">
                        <span className="wc-ctrl-lab k-mono">
                            팀 실력 편차 <b>{spread.toFixed(2)}</b>
                            <span className="wc-hint">{spread < 0.25 ? '거의 동등 → 순위가 운' : spread > 0.75 ? '강약 뚜렷 → 강팀 유리' : '적당한 변별력'}</span>
                        </span>
                        <input
                            type="range" min="0" max="1" step="0.01" value={spread}
                            onChange={(e) => { setSpread(parseFloat(e.target.value)); setMc(null); }}
                            className="wc-range"
                            aria-label="팀 실력 편차"
                        />
                    </div>

                    <div className="wc-ctrl-actions">
                        <button type="button" className="wc-btn wc-btn-hot" onClick={redraw}>🎲 새 대진 추첨</button>
                        <button type="button" className="wc-btn wc-btn-ghost" onClick={runMC}>800번 돌리기</button>
                    </div>
                </div>
            </section>

            {/* 요약 계기판 */}
            <section className="k-win wc-metric-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">/result/</span>summary</span>
                    <span className="meta k-mono">진출 32 · 탈락 16</span>
                </div>
                <div className="wc-metrics">
                    <div className="wc-metric">
                        <span className="wc-metric-num" style={{ color: 'var(--wc-go)' }}>{sgn(sim.cutPts).replace('+', '')}</span>
                        <span className="wc-metric-lab">와일드카드 진출 컷 (승점)</span>
                        <span className="wc-metric-sub k-mono">3위 8위 팀 승점 · 첫 탈락(9위)은 {sim.firstOutPts}점</span>
                    </div>
                    <div className="wc-metric">
                        <span className="wc-metric-num" style={{ color: sim.unjust ? 'var(--wc-out)' : 'var(--ink)' }}>{sim.unjust}</span>
                        <span className="wc-metric-lab">조 편성 운으로 탈락한 강팀</span>
                        <span className="wc-metric-sub k-mono">실력 상위 32위 안인데 집에 간 수</span>
                    </div>
                    <div className="wc-metric">
                        <span className="wc-metric-num" style={{ color: 'var(--wc-flag)' }}>{sim.strongestOut.code}</span>
                        <span className="wc-metric-lab">가장 강했는데 탈락한 팀</span>
                        <span className="wc-metric-sub k-mono">실력 {sim.strongestOut.srank}위 · {sim.strongestOut.p}점(조 {sim.strongestOut.pos}위)</span>
                    </div>
                    <div className="wc-metric">
                        <span className="wc-metric-num" style={{ color: 'var(--wc-go)' }}>{sim.weakestIn.code}</span>
                        <span className="wc-metric-lab">가장 약한데 진출한 팀</span>
                        <span className="wc-metric-sub k-mono">실력 {sim.weakestIn.srank}위 · {sim.weakestIn.p}점</span>
                    </div>
                </div>
            </section>

            {/* 12개 조 */}
            <section className="k-win wc-groups-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">/groups/</span>A–L</span>
                    <span className="meta k-mono">
                        <i className="wc-key wc-key-q" /> 직행
                        <i className="wc-key wc-key-w" /> 와일드카드
                        <i className="wc-key wc-key-x" /> 탈락
                    </span>
                </div>
                <div className="wc-groups">
                    {sim.groups.map((g) => (
                        <div className="wc-group" key={g[0].grp}>
                            <div className="wc-group-hd">
                                <span className="wc-group-name">GROUP {g[0].grp}</span>
                            </div>
                            <div className="wc-table">
                                <div className="wc-th k-mono">
                                    <span className="wc-c-pos">#</span>
                                    <span className="wc-c-code">팀</span>
                                    <span className="wc-c-n">승점</span>
                                    <span className="wc-c-n">골득실</span>
                                </div>
                                {g.map((t) => (
                                    <div className={`wc-tr wc-${t.status} k-mono`} key={t.code}>
                                        <span className="wc-c-pos">{t.pos}</span>
                                        <span className="wc-c-code">
                                            {t.code}
                                            {t.status === 'W' && <span className="wc-badge">WC</span>}
                                        </span>
                                        <span className="wc-c-n wc-pts">{t.p}</span>
                                        <span className="wc-c-n">{sgn(t.gd)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 와일드카드 리더보드 (3위 12팀 줄 세우기) */}
            <section className="k-win wc-lead-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">/wildcard/</span>3rd-placed</span>
                    <span className="meta k-mono">12개 조 3위를 승점·골득실로 한 줄 세워 상위 8팀만 진출</span>
                </div>
                <div className="wc-lead">
                    {sim.thirds.map((t, i) => (
                        <React.Fragment key={t.code}>
                            {i === WILDCARDS && (
                                <div className="wc-cut" aria-hidden="true">
                                    <span className="k-mono">─ 진출 컷 · 8/12 ─</span>
                                </div>
                            )}
                            <div className={`wc-lead-row wc-${t.status} k-mono`}>
                                <span className="wc-lead-rank">{i + 1}</span>
                                <span className="wc-lead-code">{t.code}<span className="wc-lead-grp">조 {t.grp}</span></span>
                                <span className="wc-lead-stat"><b>{t.p}</b>점</span>
                                <span className="wc-lead-stat">{sgn(t.gd)}</span>
                                <span className="wc-lead-stat">{t.gf}득점</span>
                                <span className="wc-lead-tag">{t.status === 'W' ? '진출' : '탈락'}</span>
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            </section>

            {/* 몬테카를로 */}
            {mc && (
                <section className="k-win wc-mc-win">
                    <div className="k-win-bar">
                        <span className="path k-mono"><span className="dir">/montecarlo/</span>{mc.K}runs</span>
                        <span className="meta k-mono">현재 설정으로 {mc.K}판을 돌린 통계</span>
                    </div>
                    <div className="wc-mc">
                        <div className="wc-mc-stats">
                            <div className="wc-mc-stat">
                                <span className="wc-mc-num">{mc.avgCut.toFixed(2)}</span>
                                <span className="wc-mc-lab k-mono">평균 진출 컷 승점</span>
                            </div>
                            <div className="wc-mc-stat">
                                <span className="wc-mc-num">{mc.avgDeath.toFixed(2)}</span>
                                <span className="wc-mc-lab k-mono">대회당 평균 &apos;죽음의 조&apos; 수 (강팀 2팀+ 몰린 조)</span>
                            </div>
                            <div className="wc-mc-stat">
                                <span className="wc-mc-num">{mc.avgUnjust.toFixed(2)}</span>
                                <span className="wc-mc-lab k-mono">대회당 평균 부당 탈락 팀 수</span>
                            </div>
                        </div>
                        <div className="wc-mc-hist">
                            <span className="wc-mc-hist-lab k-mono">진출 컷 승점 분포</span>
                            <div className="wc-mc-bars">
                                {mc.hist.map((d) => (
                                    <div className="wc-mc-col" key={`pts${d.pts}`}>
                                        <span className="wc-mc-cval k-mono">{d.c ? Math.round((d.c / mc.K) * 100) : ''}</span>
                                        <div className="wc-mc-bar" style={{ height: `${(d.c / mcMax) * 100}%` }} />
                                        <span className="wc-mc-cpts k-mono">{d.pts}</span>
                                    </div>
                                ))}
                            </div>
                            <span className="wc-mc-hist-foot k-mono">가로=8위(마지막 진출) 팀 승점 · 세로=그 승점이 나온 대회 비율(%)</span>
                        </div>
                    </div>
                </section>
            )}

            {/* 해설 */}
            <section className="k-win wc-foot-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="wc-foot">
                    <p>
                        본선이 48팀·12개 조로 커지면서, 각 조 1·2위(24팀)만으로는 16강(32팀)이 채워지지 않는다.
                        그래서 <b>각 조 3위 12팀 중 성적이 좋은 8팀</b>을 추가로 살린다. 문제는 여기서 시작된다 —
                        이 12개 조는 <b>서로 한 번도 맞붙지 않았다</b>. 맞대결로 가릴 수 없는 집단을 어떻게 한 줄로 세울까?
                    </p>
                    <p>
                        규칙은 <b>승점 → 골득실 → 다득점</b> 순으로 3위끼리 비교하는 것이다. 하지만 이 숫자들은
                        각자 <b>다른 상대</b>를 상대로 얻은 값이다. 강한 조에서 3위를 한 팀은 약한 조에서 1위를 한
                        팀보다 훨씬 강할 수 있지만, 규칙은 그 <b>맥락(상대의 세기)</b>을 보지 않는다. 이것이
                        비교 불가능한 코호트(cohort)를 억지로 한 줄 세울 때 늘 생기는 <b>맥락 소실</b>의 문제다.
                    </p>
                    <p>
                        직접 확인해 보라. <b>완전 무작위</b> 편성으로 두면 어떤 조는 강팀만 몰린 &quot;죽음의 조&quot;가 되어,
                        실력 상위권 팀이 3위로 밀려 집에 가는 일이 잦아진다(위 &quot;조 편성 운으로 탈락한 강팀&quot; 카운터).
                        반대로 <b>시드 포트</b>로 조를 균형 있게 나누면 이런 부당 탈락이 크게 줄어든다 — 실제 대회가
                        조 추첨에 시드를 두는 이유다. <b>실력 편차</b>를 0에 가깝게 내리면 승점이 거의 운으로 갈려
                        진출 컷과 탈락의 경계가 골득실 한 끗에서 요동친다.
                    </p>
                    <p>
                        <b>800번 돌리기</b>를 누르면 이 요동이 통계로 보인다. 3위로 살아남는 데 필요한 승점(진출 컷)이
                        보통 몇 점에 몰리는지, 그리고 조 편성만으로 강팀이 억울하게 떨어지는 대회가 얼마나 되는지를
                        분포로 확인할 수 있다.
                    </p>
                    <p className="wc-disclaimer">
                        * 경기는 두 팀의 실력차로 기대 득점을 정하고 포아송 분포로 골 수를 뽑는 단순화 모델입니다.
                        참가자는 특정 국가·팀·선수와 무관한 추상 코드(A1..L4)이며, 실력은 상대값입니다. 실제 대회의
                        세부 편성·시드·타이브레이크 규칙과는 다릅니다.
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Wildcard;
