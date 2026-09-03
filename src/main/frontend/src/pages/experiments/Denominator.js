import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Denominator.css';

// DENOMINATOR — 정의가 바꾸는 지표.
//
// 어떤 비율이든 두 번의 선택을 거쳐 나온다. 누구를 분자로 셀 것인가, 그리고 누구를 분모에 남길 것인가.
// 이 두 선택은 대개 발표된 숫자 뒤에 숨어 있어서, 우리는 결과값만 보고 상태가 좋아졌다 나빠졌다를 읽는다.
//
// 여기서는 그 순서를 뒤집는다. 인구는 고정해 두고 정의만 손으로 고쳐 쓴다.
// 같은 1,000명, 같은 달을 놓고도 셈법에 따라 3%대에서 36%대까지 열 배 넘게 벌어진다.
//
// 더 중요한 건 수준이 아니라 방향이다. 이 인구에서는 24개월 동안
//   좁은 정의로 보면 지표가 절반 아래로 내려가고(개선),
//   넓은 정의로 보면 같은 기간에 오히려 올라간다(악화).
// 두 문장 모두 참이고, 둘 다 같은 사람들을 세고 있다.
//
// 특정 국가·기관의 공식 통계를 재현한 것이 아니라, 지표 정의가 갖는 일반적인 구조만 다룬다.

const POP = 1000;
const MONTHS = 24;

// ---- 인구 집단 ------------------------------------------------------------
// 서로 겹치지 않는 8개 칸으로 생산가능인구 1,000명을 나눈다.
const GROUPS = [
    { key: 'ft', label: '풀타임 취업', note: '원하는 만큼 일한다' },
    { key: 'ftlow', label: '저임금 풀타임', note: '풀타임인데 생계 기준 미만' },
    { key: 'pt', label: '불완전취업', note: '파트타임 — 더 일하고 싶다' },
    { key: 'ptok', label: '자발적 파트타임', note: '파트타임 — 그걸 원한다' },
    { key: 'unemp', label: '구직 중 실업', note: '무직 · 최근 구직활동 있음' },
    { key: 'disc', label: '구직 단념', note: '일하고 싶지만 찾기를 멈췄다' },
    { key: 'latent', label: '잠재 취업가능', note: '일하고 싶지만 지금은 못 한다' },
    { key: 'nilf', label: '비경제활동', note: '학업 · 돌봄 · 은퇴' },
];

const KEYS = ['ft', 'ftlow', 'pt', 'ptok', 'unemp', 'disc', 'latent'];
const START = { ft: 560, ftlow: 60, pt: 70, ptok: 90, unemp: 60, disc: 25, latent: 25 };
const END = { ft: 480, ftlow: 85, pt: 150, ptok: 95, unemp: 30, disc: 55, latent: 45 };
const WIGGLE = { ft: 5, ftlow: 2, pt: 4, ptok: 2, unemp: 3, disc: 2, latent: 2 };

// 24개월 합성 인구. 풀타임 일자리가 파트타임으로 쪼개지고, 실업자 일부는 구직을 멈춘다.
// 어느 달에도 여덟 칸의 합은 정확히 1,000명이다(나머지를 비경제활동에 넣는다).
const SERIES = (() => {
    const rows = [];
    for (let m = 0; m < MONTHS; m += 1) {
        const t = m / (MONTHS - 1);
        const e = t * t * (3 - 2 * t);
        const row = {};
        let sum = 0;
        KEYS.forEach((k, i) => {
            const base = START[k] + (END[k] - START[k]) * e;
            const v = Math.max(0, Math.round(base + WIGGLE[k] * Math.sin((m + i * 2.3) * 1.1)));
            row[k] = v;
            sum += v;
        });
        row.nilf = POP - sum;
        rows.push(row);
    }
    return rows;
})();

// ---- 정의 --------------------------------------------------------------
// 분자에 넣을 수 있는 칸들. 구직 중 실업은 어떤 정의에서도 빠지지 않으므로 손잡이가 아니다.
const ADDABLE = [
    { key: 'pt', label: '불완전취업', note: '일하고 있지만 시간이 모자란다' },
    { key: 'disc', label: '구직 단념', note: '찾기를 멈추면 실업에서 사라진다' },
    { key: 'latent', label: '잠재 취업가능', note: '지금 당장은 시작할 수 없다' },
    { key: 'ftlow', label: '저임금 풀타임', note: '풀타임인데도 생계가 안 된다' },
];
// 구직 중 실업이 아닌데 분자로 세는 칸 중, 원래 경제활동인구 밖에 있던 칸.
// 이들을 분자에 넣으면 분모에도 함께 들어가야 셈이 성립한다.
const OUTSIDE = ['disc', 'latent'];

const laborForce = (r) => r.ft + r.ftlow + r.pt + r.ptok + r.unemp;

const measure = (row, add, wholePop) => {
    const num = add.reduce((s, k) => s + row[k], row.unemp);
    const extra = OUTSIDE.filter((k) => add.includes(k)).reduce((s, k) => s + row[k], 0);
    const den = wholePop ? POP : laborForce(row) + extra;
    return { num, den, pct: (num / den) * 100 };
};

const inNumerator = (key, add) => key === 'unemp' || add.includes(key);
const inDenominator = (key, add, wholePop) => {
    if (wholePop) return true;
    if (key === 'nilf') return false;
    if (OUTSIDE.includes(key)) return add.includes(key);
    return true;
};

const PRESETS = [
    { key: 'narrow', label: '좁은 정의', add: [], whole: false, note: '구직 중인 무직자만' },
    { key: 'under', label: '+ 불완전취업', add: ['pt'], whole: false },
    { key: 'margin', label: '+ 주변 인구', add: ['pt', 'disc', 'latent'], whole: false },
    { key: 'widest', label: '가장 넓은 정의', add: ['pt', 'disc', 'latent', 'ftlow'], whole: true, note: '분모도 전체 인구로' },
];

const fmt = (v) => v.toFixed(1);
const monthLabel = (m) => `${Math.floor(m / 12) + 1}년차 ${(m % 12) + 1}월`;

const Denominator = () => {
    const [add, setAdd] = useState(['pt']);
    const [wholePop, setWholePop] = useState(false);
    const [month, setMonth] = useState(MONTHS - 1);
    const gridRef = useRef(null);

    const row = SERIES[month];
    const now = useMemo(() => measure(row, add, wholePop), [row, add, wholePop]);
    const narrow = useMemo(() => measure(row, [], false), [row]);

    // 두 계열: 고정된 좁은 정의 vs 지금 고쳐 쓰고 있는 정의.
    const lines = useMemo(() => ({
        narrow: SERIES.map((r) => measure(r, [], false).pct),
        current: SERIES.map((r) => measure(r, add, wholePop).pct),
    }), [add, wholePop]);

    const yMax = useMemo(
        () => Math.max(10, Math.ceil(Math.max(...lines.narrow, ...lines.current) / 5) * 5 + 5),
        [lines],
    );

    const toggle = useCallback((key) => {
        setAdd((a) => (a.includes(key) ? a.filter((x) => x !== key) : [...a, key]));
    }, []);

    const applyPreset = useCallback((p) => {
        setAdd(p.add);
        setWholePop(p.whole);
    }, []);

    // ---- 인구 격자 ------------------------------------------------------
    // 1,000명을 점 하나씩 찍는다. 같은 칸의 사람은 붙여 두어 덩어리가 눈에 들어오게 한다.
    useEffect(() => {
        const canvas = gridRef.current;
        if (!canvas) return undefined;
        const ctx = canvas.getContext('2d');
        let raf = 0;

        const draw = () => {
            const dpr = window.devicePixelRatio || 1;
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);

            const css = getComputedStyle(canvas);
            const accent = css.getPropertyValue('--dn-accent').trim() || '#1f4fd8';
            const ink = css.getPropertyValue('--ink').trim() || '#111';
            const mute = css.getPropertyValue('--ink-mute').trim() || '#999';

            // 칸이 정사각형에 가깝도록 폭·높이 비율에서 열 수를 정한다.
            const cols = Math.max(20, Math.round(Math.sqrt((POP * w) / h)));
            const rows = Math.ceil(POP / cols);
            const cw = w / cols;
            const ch = h / rows;
            const r = Math.max(1.3, Math.min(cw, ch) * 0.32);

            let i = 0;
            GROUPS.forEach((g) => {
                const num = inNumerator(g.key, add);
                const den = inDenominator(g.key, add, wholePop);
                for (let n = 0; n < row[g.key]; n += 1, i += 1) {
                    const x = (i % cols) * cw + cw / 2;
                    const y = Math.floor(i / cols) * ch + ch / 2;
                    ctx.beginPath();
                    ctx.arc(x, y, num ? r * 1.15 : r, 0, Math.PI * 2);
                    if (num) {
                        ctx.fillStyle = accent;
                        ctx.fill();
                    } else if (den) {
                        ctx.fillStyle = ink;
                        ctx.globalAlpha = 0.34;
                        ctx.fill();
                        ctx.globalAlpha = 1;
                    } else {
                        ctx.strokeStyle = mute;
                        ctx.globalAlpha = 0.38;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                    }
                }
            });
        };

        draw();
        const onResize = () => {
            window.cancelAnimationFrame(raf);
            raf = window.requestAnimationFrame(draw);
        };
        window.addEventListener('resize', onResize);
        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('resize', onResize);
        };
    }, [row, add, wholePop]);

    // ---- 추이 선 --------------------------------------------------------
    const CW = 640;
    const CH = 180;
    const PADL = 34;
    const PADB = 22;
    const px = (m) => PADL + (m / (MONTHS - 1)) * (CW - PADL - 8);
    const py = (v) => (CH - PADB) - (v / yMax) * (CH - PADB - 10);
    const path = (arr) => arr.map((v, m) => `${m ? 'L' : 'M'}${px(m).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
    const ticks = [0, yMax / 2, yMax];

    const diverges = (lines.current[MONTHS - 1] - lines.current[0]) * (lines.narrow[MONTHS - 1] - lines.narrow[0]) < 0;

    return (
        <LabShell
            title="Denominator"
            subtitle="같은 사람들을 놓고 분자와 분모만 고쳐 쓸 때 — 지표는 어디까지 움직이나"
            eyebrow="실험 · 통계"
            path="denominator"
        >
            <section className="k-win dn-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">~/lab/</span>denominator</span>
                    <span className="meta k-mono">{`n=${POP} · ${monthLabel(month)}`}</span>
                </div>

                <div className="dn-head">
                    <div className="dn-big">
                        <span className="dn-big-k k-mono">지금 정의로 읽은 값</span>
                        <span className="dn-big-v">{fmt(now.pct)}<i>%</i></span>
                        <span className="dn-big-s k-mono">{`${now.num} / ${now.den}`}</span>
                    </div>
                    <div className="dn-cmp">
                        <span className="dn-cmp-k k-mono">좁은 정의로 읽으면</span>
                        <span className="dn-cmp-v">{fmt(narrow.pct)}<i>%</i></span>
                        <span className="dn-cmp-s k-mono">{`${narrow.num} / ${narrow.den}`}</span>
                    </div>
                    <div className="dn-cmp dn-cmp-gap">
                        <span className="dn-cmp-k k-mono">둘 사이의 배율</span>
                        <span className="dn-cmp-v is-accent">{(now.pct / narrow.pct).toFixed(1)}<i>배</i></span>
                        <span className="dn-cmp-s k-mono">같은 달 · 같은 인구</span>
                    </div>
                </div>

                <canvas ref={gridRef} className="dn-grid" aria-label={`생산가능인구 ${POP}명 중 ${now.num}명이 분자로 세어진 상태`} />

                <div className="dn-legend k-mono">
                    <span><i className="sw is-num" />분자로 세어진 {now.num}명</span>
                    <span><i className="sw is-den" />분모에만 있는 {now.den - now.num}명</span>
                    <span><i className="sw is-out" />셈에서 빠진 {POP - now.den}명</span>
                </div>

                <div className="dn-controls">
                    <label className="dn-ctl">
                        <span className="dn-ctl-k k-mono">관측 시점 <b>{monthLabel(month)}</b></span>
                        <input
                            type="range"
                            min="0"
                            max={MONTHS - 1}
                            step="1"
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                        />
                        <span className="dn-ctl-s">인구는 24개월에 걸쳐 바뀐다 — 정의를 고정하고 시점만 옮겨 볼 수 있다</span>
                    </label>
                    <div className="dn-ctl dn-ctl-den">
                        <span className="dn-ctl-k k-mono">분모를 무엇으로 둘까</span>
                        <div className="dn-seg">
                            <button
                                type="button"
                                className={`dn-seg-b ${wholePop ? '' : 'is-on'}`}
                                onClick={() => setWholePop(false)}
                                aria-pressed={!wholePop}
                            >
                                일하거나 찾는 사람만
                            </button>
                            <button
                                type="button"
                                className={`dn-seg-b ${wholePop ? 'is-on' : ''}`}
                                onClick={() => setWholePop(true)}
                                aria-pressed={wholePop}
                            >
                                생산가능인구 전부
                            </button>
                        </div>
                        <span className="dn-ctl-s">
                            {wholePop
                                ? '학업·돌봄·은퇴까지 분모에 들어간다 — 분모가 커지니 같은 분자라도 값이 내려간다'
                                : '분자에 넣은 칸은 분모에도 자동으로 편입된다 — 그래야 셈이 성립한다'}
                        </span>
                    </div>
                </div>

                <div className="dn-palette">
                    <span className="dn-sec-k k-mono">분자에 누구까지 넣을까</span>
                    <ul className="dn-adds">
                        <li>
                            <div className="dn-add is-fixed">
                                <b>구직 중 실업</b>
                                <span className="dn-add-note">어떤 정의에서도 빠지지 않는다</span>
                                <span className="dn-add-n k-mono">{row.unemp}</span>
                            </div>
                        </li>
                        {ADDABLE.map((a) => {
                            const on = add.includes(a.key);
                            return (
                                <li key={a.key}>
                                    <button
                                        type="button"
                                        className={`dn-add ${on ? 'is-on' : ''}`}
                                        onClick={() => toggle(a.key)}
                                        aria-pressed={on}
                                    >
                                        <b>{a.label}</b>
                                        <span className="dn-add-note">{a.note}</span>
                                        <span className="dn-add-n k-mono">{on ? `+${row[a.key]}` : row[a.key]}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="dn-presets">
                    <span className="dn-sec-k k-mono">셈법</span>
                    {PRESETS.map((p) => (
                        <button key={p.key} type="button" className="dn-chip" onClick={() => applyPreset(p)}>
                            {p.label}
                        </button>
                    ))}
                </div>

                <div className="dn-chart-wrap">
                    <div className="dn-chart-head">
                        <span className="dn-sec-k k-mono">24개월 추이</span>
                        <span className={`dn-verdict ${diverges ? 'is-split' : ''}`}>
                            {diverges
                                ? '두 정의가 서로 반대 방향을 가리키고 있다'
                                : '두 정의가 같은 방향을 가리키고 있다'}
                        </span>
                    </div>
                    <svg className="dn-chart" viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label="정의별 지표 추이">
                        {ticks.map((t) => (
                            <g key={t}>
                                <line className="dn-ax" x1={PADL} y1={py(t)} x2={CW - 8} y2={py(t)} />
                                <text className="dn-tick" x={PADL - 6} y={py(t) + 3.5} textAnchor="end">{t.toFixed(0)}</text>
                            </g>
                        ))}
                        <line className="dn-cursor" x1={px(month)} y1={8} x2={px(month)} y2={CH - PADB} />
                        <path className="dn-line is-narrow" d={path(lines.narrow)} />
                        <path className="dn-line is-current" d={path(lines.current)} />
                        <circle className="dn-dot is-narrow" cx={px(month)} cy={py(lines.narrow[month])} r="3.5" />
                        <circle className="dn-dot is-current" cx={px(month)} cy={py(lines.current[month])} r="3.5" />
                        <text className="dn-tick" x={PADL} y={CH - 6}>1년차 1월</text>
                        <text className="dn-tick" x={CW - 8} y={CH - 6} textAnchor="end">2년차 12월</text>
                    </svg>
                    <div className="dn-chart-legend k-mono">
                        <span><i className="ln is-narrow" />좁은 정의 (고정)</span>
                        <span><i className="ln is-current" />지금 고쳐 쓴 정의</span>
                        <span className="dn-chart-note">
                            {`24개월 동안 ${fmt(lines.narrow[0])}% → ${fmt(lines.narrow[MONTHS - 1])}% / ${fmt(lines.current[0])}% → ${fmt(lines.current[MONTHS - 1])}%`}
                        </span>
                    </div>
                </div>

                <div className="dn-table-wrap">
                    <table className="dn-table">
                        <thead>
                            <tr>
                                <th>집단</th>
                                <th>{monthLabel(month)}</th>
                                <th className="num">인원</th>
                                <th>지금 셈법에서의 자리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {GROUPS.map((g) => {
                                const num = inNumerator(g.key, add);
                                const den = inDenominator(g.key, add, wholePop);
                                return (
                                    <tr key={g.key} className={num ? 'is-num' : ''}>
                                        <td>{g.label}</td>
                                        <td className="dn-note">{g.note}</td>
                                        <td className="num k-mono">{row[g.key]}</td>
                                        <td className={`dn-role ${num ? 'is-num' : ''} ${!den ? 'is-out' : ''}`}>
                                            {num ? '분자 + 분모' : den ? '분모에만' : '셈에서 제외'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="k-win dn-foot-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="dn-foot">
                    <p>
                        {'비율은 측정이 아니라 '}<b>두 번의 선택</b>{'이다. 누구를 분자로 셀 것인가, 그리고 누구를 분모에 남길 것인가. '}
                        {'발표된 숫자에는 이 두 선택이 이미 끝난 채로 담겨 있어서, 우리는 결과만 보고 상태를 읽는다. '}
                        {'여기서는 순서를 뒤집어, 인구를 고정해 두고 셈법 쪽을 손으로 고쳐 쓴다.'}
                    </p>
                    <p>
                        {'마지막 달의 이 인구는 좁은 정의로 '}<b>3.3%</b>{', 가장 넓은 정의로 '}<b>36.2%</b>{'로 읽힌다 — 열 배가 넘는다. '}
                        {'어느 쪽도 조작이 아니다. 좁은 쪽은 "지금 일자리를 찾고 있는 무직자"를 세고, 넓은 쪽은 "일이 필요한데 충분히 얻지 못한 사람"을 센다. '}
                        {'세는 대상이 다를 뿐 둘 다 같은 1,000명 위에서 계산된다.'}
                    </p>
                    <p>
                        {'더 중요한 건 수준이 아니라 '}<b>방향</b>{'이다. 이 24개월 동안 풀타임 일자리가 파트타임으로 쪼개지고, 구직을 멈춘 사람이 늘었다. '}
                        {'구직을 멈추면 분자에서도 분모에서도 동시에 빠지기 때문에 좁은 지표는 '}<b>6.9% → 3.3%로 내려간다</b>{'. '}
                        {'같은 기간을 불완전취업과 주변 인구까지 세면 '}<b>19.7% → 29.4%로 올라간다</b>{'. '}
                        {'"개선되었다"와 "악화되었다"가 같은 데이터에서 동시에 참이 된다.'}
                    </p>
                    <p>
                        {'그래서 지표를 볼 때 먼저 물어야 할 것은 값이 아니라 '}<b>분모에서 누가 빠졌는가</b>{'다. '}
                        {'분자를 넓히는 논쟁은 눈에 잘 띄지만, 조용히 분모에서 빠져나간 사람들 — 찾기를 멈춘 쪽 — 은 지표를 좋게 만들면서 화면에서 사라진다. '}
                        {'위 격자에서 테두리만 남은 점들이 그 자리다.'}
                    </p>
                    <p className="dn-disclaimer">
                        {'* 여기 쓰인 1,000명은 구조를 보기 위해 만든 가상의 합성 인구이며 실제 통계가 아닙니다. '}
                        {'특정 국가·기관의 공식 지표나 그 산출 방식을 재현한 것이 아니라, 비율 지표가 일반적으로 갖는 정의 구조(분자 포함 범위와 분모 편입 규칙)만 다룹니다. '}
                        {'본문의 수치는 이 합성 인구에서 계산된 값입니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Denominator;
