import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Ruleset.css';

// RULESET — 미리 적어 둔 규칙만으로 거르기.
//
// 페이지 하나를 열면 그 뒤로 수십 개의 요청이 따라 나간다. 그중 일부는 화면을 그리는 데 필요하고,
// 일부는 화면과 무관하게 "누가 무엇을 봤는가"만 실어 나른다. 이 둘을 갈라내는 방식에는 두 갈래가 있다.
//
//   동적 검사 — 요청이 나갈 때마다 코드가 URL 전체를 들여다보고 그 자리에서 판단한다.
//               정확도는 최고다. 대신 필터가 모든 요청의 내용을 보게 되고, 판단하는 만큼 늦어진다.
//   선언적 규칙 — 무엇을 막을지 패턴으로 미리 적어 두고, 플랫폼이 대조만 한다.
//               필터는 요청 내용을 보지 못한다(노출 0). 대신 적어 둘 수 있는 줄 수가 한정된다.
//
// 이 실험이 다루는 것은 특정 브라우저나 특정 차단기가 아니라, 그 아래 깔린 보편적 교환이다:
//   표현력을 줄이는 대신 노출과 지연을 0으로 만든다. 그 대가는 "예산 안에서 골라야 한다"는 제약이다.
//
// 규칙은 넓게 쓰면 적은 줄로 많이 막지만 멀쩡한 요청까지 함께 걸린다(파손).
// 좁게 쓰면 한 줄에 하나씩만 잡혀 예산이 먼저 바닥난다(누출).
// 예산을 줄여 가며 만져 보면, 이 표는 결국 "몇 줄로 몇 종류를 덮을 수 있는가"라는 덮개 문제가 된다.

// ---- 트래픽 원본 ----------------------------------------------------------
// 실제 서비스가 아닌 가상의 호스트다. tracker=화면과 무관한 수집 요청, content=화면을 그리는 요청.
const TEMPLATES = [
    { host: 'metrics.g-tag.example', path: '/collect?uid=a41', tracker: true, n: 22, label: '수집 엔드포인트' },
    { host: 'px.adnet-3.example', path: '/pixel.gif?uid=a41', tracker: true, n: 20, label: '픽셀' },
    { host: 'beacon.sitestat.example', path: '/b?e=view', tracker: true, n: 16, label: '비컨' },
    { host: 'cdn.adnet-7.example', path: '/track/imp.js', tracker: true, n: 14, label: 'CDN 위의 추적 스크립트' },
    { host: 'api.datapool.example', path: '/v1/collect', tracker: true, n: 14, label: '수집 API' },
    { host: 'tag.mktbox.example', path: '/loader.js', tracker: true, n: 12, label: '태그 로더' },
    { host: 'img.pixelfarm.example', path: '/1x1.gif?uid=a41', tracker: true, n: 12, label: '1×1 이미지' },
    { host: 'api.shopfront.example', path: '/v2/items', tracker: false, n: 26, label: '상품 목록' },
    { host: 'cdn.shopfront.example', path: '/img/hero.webp', tracker: false, n: 24, label: 'CDN 위의 대표 이미지' },
    { host: 'img.shopfront.example', path: '/img/thumb-12.webp', tracker: false, n: 22, label: '썸네일' },
    { host: 'static.docsite.example', path: '/app.js', tracker: false, n: 18, label: '앱 번들' },
    { host: 'fonts.typeworks.example', path: '/inter.woff2', tracker: false, n: 16, label: '웹폰트' },
    { host: 'www.shopfront.example', path: '/checkout', tracker: false, n: 14, label: '결제 화면' },
    { host: 'api.shopfront.example', path: '/v2/cart?uid=u77', tracker: false, n: 10, label: '장바구니(uid 포함)' },
];

// ---- 규칙 팔레트 ----------------------------------------------------------
// 한 줄 = 예산 1칸. narrow=한 종류만 정확히, wide=여러 종류를 한 번에(대신 오탐 위험).
const RULES = [
    { id: 'collect', p: '*/collect*', note: '경로에 collect' },
    { id: 'adnet', p: '*://*.adnet-*.example/*', note: '광고망 계열 호스트' },
    { id: 'gif', p: '*.gif*', note: '.gif 로 끝나는 자원' },
    { id: 'track', p: '*/track/*', note: '경로에 /track/' },
    { id: 'metrics', p: '*://metrics.*/*', note: 'metrics. 호스트' },
    { id: 'px', p: '*://px.*/*', note: 'px. 호스트' },
    { id: 'beacon', p: '*://beacon.*/*', note: 'beacon. 호스트' },
    { id: 'tag', p: '*://tag.*/*', note: 'tag. 호스트' },
    { id: 'cdn', p: '*://cdn.*/*', note: 'cdn. 호스트 전부' },
    { id: 'uid', p: '*?uid=*', note: '질의에 uid 파라미터' },
    { id: 'all', p: '*://*.example/*', note: '전부' },
];

const toRegex = (glob) => new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '\\?')}$`);
const RULE_RE = RULES.reduce((m, r) => ({ ...m, [r.id]: toRegex(r.p) }), {});

const urlOf = (t) => `https://${t.host}${t.path}`;

// 애니메이션 순서용 결정론적 셔플 — 통계는 순서와 무관하다.
const mulberry32 = (a) => () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const CORPUS = (() => {
    const rows = [];
    TEMPLATES.forEach((t, ti) => {
        for (let i = 0; i < t.n; i += 1) rows.push({ ...t, ti, url: urlOf(t) });
    });
    const rnd = mulberry32(20260902);
    for (let i = rows.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rnd() * (i + 1));
        [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    return rows;
})();

const TRACKERS = CORPUS.filter((r) => r.tracker).length;
const CONTENT = CORPUS.length - TRACKERS;

const PRESETS = [
    { key: 'clean5', label: '정밀 5줄', budget: 5, rules: ['collect', 'adnet', 'gif', 'beacon', 'tag'] },
    { key: 'tight3', label: '예산 3줄', budget: 3, rules: ['collect', 'adnet', 'gif'] },
    { key: 'blunt', label: 'cdn 통째로', budget: 5, rules: ['cdn', 'uid', 'collect', 'tag', 'beacon'] },
    { key: 'nuke', label: '전부 차단', budget: 5, rules: ['all'] },
];

const pct = (v) => `${Math.round(v * 100)}%`;

const Ruleset = () => {
    const [budget, setBudget] = useState(5);
    const [active, setActive] = useState(['collect', 'adnet', 'gif']);
    const [dynamic, setDynamic] = useState(false);
    const canvasRef = useRef(null);
    const stateRef = useRef({ parts: [], cursor: 0, acc: 0, last: 0 });

    // 활성 규칙이 예산을 넘지 않도록 — 예산을 줄이면 뒤에서부터 떨어져 나간다.
    useEffect(() => { setActive((a) => (a.length > budget ? a.slice(0, budget) : a)); }, [budget]);

    const toggleRule = useCallback((id) => {
        setActive((a) => {
            if (a.includes(id)) return a.filter((x) => x !== id);
            if (a.length >= budget) return a;
            return [...a, id];
        });
    }, [budget]);

    const applyPreset = useCallback((p) => {
        setBudget(p.budget);
        setActive(p.rules);
        setDynamic(false);
    }, []);

    // ---- 판정 -------------------------------------------------------------
    // 선언적: 활성 규칙 중 먼저 맞는 줄이 이긴다(first-match). 동적: 내용을 읽고 정확히 가른다.
    const ordered = useMemo(() => RULES.filter((r) => active.includes(r.id)), [active]);

    const verdict = useMemo(() => {
        const byTemplate = TEMPLATES.map((t) => {
            if (dynamic) return { hit: t.tracker, by: t.tracker ? 'inspect' : null };
            const r = ordered.find((rule) => RULE_RE[rule.id].test(urlOf(t)));
            return { hit: !!r, by: r ? r.id : null };
        });
        return byTemplate;
    }, [ordered, dynamic]);

    const stats = useMemo(() => {
        let blocked = 0; let leaked = 0; let broken = 0; let served = 0;
        const perRule = {};
        TEMPLATES.forEach((t, i) => {
            const v = verdict[i];
            if (v.hit) {
                if (t.tracker) blocked += t.n; else broken += t.n;
                if (v.by) {
                    const e = perRule[v.by] || (perRule[v.by] = { good: 0, bad: 0 });
                    if (t.tracker) e.good += t.n; else e.bad += t.n;
                }
            } else if (t.tracker) leaked += t.n; else served += t.n;
        });
        return { blocked, leaked, broken, served, perRule };
    }, [verdict]);

    // ---- 흐름 애니메이션 ---------------------------------------------------
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const ctx = canvas.getContext('2d');
        let raf = 0;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize);

        const st = stateRef.current;
        st.last = performance.now();

        const frame = (now) => {
            const dt = Math.min(48, now - st.last);
            st.last = now;
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            const dpr = window.devicePixelRatio || 1;
            if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) resize();
            const dark = canvas.closest('[data-theme="dark"]') != null;
            const ink = dark ? '#F2F2F2' : '#111111';
            const mute = dark ? '#6E6E6E' : '#8A8A8A';
            const line = dark ? '#303030' : '#DBDBDB';
            const panel = dark ? '#171717' : '#FFFFFF';
            const warn = dark ? '#FF6B57' : '#B02A1F';
            const pass = dark ? '#3DD68C' : '#0B8A50';
            const wallX = Math.round(w * 0.56);

            ctx.fillStyle = panel;
            ctx.fillRect(0, 0, w, h);

            // 배경 레인
            const lanes = 8;
            ctx.strokeStyle = line;
            ctx.lineWidth = 1;
            for (let i = 1; i < lanes; i += 1) {
                const y = Math.round((h / lanes) * i) + 0.5;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }

            // 방출 — 코퍼스를 순서대로 흘려보낸다.
            st.acc += dt;
            const gap = 78;
            while (st.acc > gap) {
                st.acc -= gap;
                const row = CORPUS[st.cursor % CORPUS.length];
                st.cursor += 1;
                const v = verdict[row.ti];
                st.parts.push({
                    x: -10,
                    lane: st.cursor % lanes,
                    tracker: row.tracker,
                    hit: v.hit,
                    life: 1,
                    stopped: false,
                });
            }

            const speed = 0.22;
            st.parts = st.parts.filter((p) => {
                if (!p.stopped) {
                    p.x += speed * dt;
                    if (p.hit && p.x >= wallX) { p.x = wallX; p.stopped = true; }
                } else {
                    p.life -= dt / 420;
                }
                return p.life > 0 && p.x < w + 14;
            });

            // 규칙 벽 — 활성 줄 수만큼 눈금이 찍힌다.
            const rows = Math.max(1, dynamic ? 1 : ordered.length);
            ctx.strokeStyle = dynamic ? warn : ink;
            ctx.lineWidth = 2;
            ctx.setLineDash(dynamic ? [3, 4] : []);
            ctx.beginPath();
            ctx.moveTo(wallX + 0.5, 8);
            ctx.lineTo(wallX + 0.5, h - 8);
            ctx.stroke();
            ctx.setLineDash([]);
            for (let i = 0; i < rows; i += 1) {
                const y = 14 + ((h - 28) / rows) * (i + 0.5);
                ctx.fillStyle = dynamic ? warn : ink;
                ctx.fillRect(wallX - 6, Math.round(y) - 1, 13, 3);
            }
            // 남은 예산 눈금(빈칸)
            if (!dynamic) {
                for (let i = ordered.length; i < budget; i += 1) {
                    const y = 14 + ((h - 28) / Math.max(1, budget)) * (i + 0.5);
                    ctx.strokeStyle = mute;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(wallX - 6, Math.round(y) + 0.5);
                    ctx.lineTo(wallX + 7, Math.round(y) + 0.5);
                    ctx.stroke();
                }
            }

            // 페이지 도착부
            ctx.strokeStyle = line;
            ctx.lineWidth = 1;
            ctx.strokeRect(w - 26.5, 8.5, 18, h - 17);

            // 요청 입자
            st.parts.forEach((p) => {
                const y = Math.round((h / lanes) * (p.lane + 0.5));
                const a = p.stopped ? Math.max(0, p.life) : 1;
                ctx.globalAlpha = a;
                if (p.stopped) {
                    // 벽에서 멈춤 — 추적이면 정상 차단, 정상 요청이면 파손
                    ctx.fillStyle = p.tracker ? mute : warn;
                    ctx.fillRect(p.x - 4, y - 4, 8, 8);
                    if (!p.tracker) {
                        ctx.strokeStyle = warn;
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(p.x - 7, y - 7);
                        ctx.lineTo(p.x + 7, y + 7);
                        ctx.moveTo(p.x + 7, y - 7);
                        ctx.lineTo(p.x - 7, y + 7);
                        ctx.stroke();
                    }
                } else if (p.tracker) {
                    // 통과한 추적 = 누출
                    ctx.fillStyle = p.x > wallX ? warn : mute;
                    ctx.fillRect(p.x - 3, y - 3, 6, 6);
                } else {
                    ctx.fillStyle = pass;
                    ctx.fillRect(p.x - 3, y - 3, 6, 6);
                }
                ctx.globalAlpha = 1;
            });

            raf = window.requestAnimationFrame(frame);
        };
        raf = window.requestAnimationFrame(frame);
        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    }, [verdict, ordered, budget, dynamic]);

    const blockRate = TRACKERS ? stats.blocked / TRACKERS : 0;
    const breakRate = CONTENT ? stats.broken / CONTENT : 0;

    return (
        <LabShell
            title="Ruleset"
            subtitle="미리 적어 둔 몇 줄로만 거를 때 — 표현력을 내주고 노출과 지연을 0으로 바꾸는 교환"
            eyebrow="실험 · 필터링"
            path="ruleset"
        >
            <section className="k-win rs-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">~/lab/</span>ruleset</span>
                    <span className="meta k-mono">{dynamic ? 'dynamic inspect' : `declarative · ${ordered.length}/${budget}`}</span>
                </div>

                <div className="rs-toolbar">
                    <div className="rs-stat">
                        <span className="rs-stat-k k-mono">차단한 추적</span>
                        <span className="rs-stat-v">{stats.blocked}<i> / {TRACKERS}</i></span>
                        <span className="rs-stat-s">{pct(blockRate)}</span>
                    </div>
                    <div className="rs-stat">
                        <span className="rs-stat-k k-mono">새어 나간 추적</span>
                        <span className={`rs-stat-v ${stats.leaked ? 'is-bad' : 'is-ok'}`}>{stats.leaked}</span>
                        <span className="rs-stat-s">규칙에 안 걸린 수집</span>
                    </div>
                    <div className="rs-stat">
                        <span className="rs-stat-k k-mono">잘못 막은 정상</span>
                        <span className={`rs-stat-v ${stats.broken ? 'is-bad' : 'is-ok'}`}>{stats.broken}</span>
                        <span className="rs-stat-s">파손 {pct(breakRate)}</span>
                    </div>
                    <div className="rs-stat rs-stat-edge">
                        <span className="rs-stat-k k-mono">필터에 노출된 요청</span>
                        <span className={`rs-stat-v ${dynamic ? 'is-bad' : 'is-ok'}`}>{dynamic ? CORPUS.length : 0}</span>
                        <span className="rs-stat-s">{dynamic ? '전량의 URL을 읽는다' : '플랫폼이 대조만 한다'}</span>
                    </div>
                    <div className="rs-stat">
                        <span className="rs-stat-k k-mono">요청당 지연</span>
                        <span className={`rs-stat-v ${dynamic ? 'is-bad' : 'is-ok'}`}>{dynamic ? '+1.4' : '0.0'}<i> ms</i></span>
                        <span className="rs-stat-s">{dynamic ? '매번 코드가 깨어난다' : '대조는 공짜에 가깝다'}</span>
                    </div>
                </div>

                <canvas ref={canvasRef} className="rs-canvas" aria-label="요청 흐름과 규칙 벽" />

                <div className="rs-legend k-mono">
                    <span><i className="sw is-pass" />통과한 정상</span>
                    <span><i className="sw is-mute" />차단된 추적</span>
                    <span><i className="sw is-warn" />누출·파손</span>
                    <span className="rs-legend-note">{`벽의 눈금 = 지금 쓰고 있는 규칙 줄 (${dynamic ? '동적 검사' : `${ordered.length}/${budget}`})`}</span>
                </div>

                <div className="rs-controls">
                    <label className="rs-ctl">
                        <span className="rs-ctl-k k-mono">규칙 예산 <b>{budget}줄</b></span>
                        <input type="range" min="1" max="8" step="1" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
                        <span className="rs-ctl-s">플랫폼이 미리 받아 두는 규칙의 최대 줄 수</span>
                    </label>
                    <div className="rs-ctl rs-ctl-switch">
                        <span className="rs-ctl-k k-mono">판정 방식</span>
                        <button
                            type="button"
                            className={`rs-toggle ${dynamic ? 'is-on' : ''}`}
                            onClick={() => setDynamic((v) => !v)}
                            aria-pressed={dynamic}
                        >
                            {dynamic ? '동적 검사 — 매 요청을 읽고 판단' : '선언적 규칙 — 적어 둔 줄만 대조'}
                        </button>
                        <span className="rs-ctl-s">정확도를 얻으면 노출과 지연을 낸다</span>
                    </div>
                </div>

                <div className={`rs-palette ${dynamic ? 'is-off' : ''}`}>
                    <span className="rs-sec-k k-mono">규칙 팔레트</span>
                    <ul className="rs-rules">
                        {RULES.map((r) => {
                            const on = active.includes(r.id);
                            const full = !on && active.length >= budget;
                            const hit = stats.perRule[r.id];
                            return (
                                <li key={r.id}>
                                    <button
                                        type="button"
                                        className={`rs-rule ${on ? 'is-on' : ''} ${full ? 'is-full' : ''}`}
                                        onClick={() => toggleRule(r.id)}
                                        disabled={dynamic || full}
                                        aria-pressed={on}
                                    >
                                        <code className="k-mono">{r.p}</code>
                                        <span className="rs-rule-note">{r.note}</span>
                                        {on && (
                                            <span className="rs-rule-hit k-mono">
                                                <b>+{hit ? hit.good : 0}</b>
                                                {hit && hit.bad ? <em>−{hit.bad}</em> : null}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    <p className="rs-palette-cap">
                        {'+ 는 그 줄이 처음으로 잡아낸 추적 요청 수, − 는 같은 줄에 함께 걸린 정상 요청 수다. 앞선 줄이 이미 잡은 것은 세지 않는다.'}
                    </p>
                </div>

                <div className="rs-presets">
                    <span className="rs-sec-k k-mono">시나리오</span>
                    {PRESETS.map((p) => (
                        <button key={p.key} type="button" className="rs-chip" onClick={() => applyPreset(p)}>{p.label}</button>
                    ))}
                </div>

                <div className="rs-table-wrap">
                    <table className="rs-table">
                        <thead>
                            <tr>
                                <th>요청</th>
                                <th>호스트</th>
                                <th className="num">건수</th>
                                <th>판정</th>
                            </tr>
                        </thead>
                        <tbody>
                            {TEMPLATES.map((t, i) => {
                                const v = verdict[i];
                                const bad = v.hit ? !t.tracker : t.tracker;
                                return (
                                    <tr key={`${t.host}${t.path}`} className={t.tracker ? 'is-tracker' : ''}>
                                        <td>{t.label}</td>
                                        <td className="k-mono rs-url">{t.host}<span>{t.path}</span></td>
                                        <td className="num k-mono">{t.n}</td>
                                        <td className={`rs-verdict ${bad ? 'is-bad' : 'is-ok'}`}>
                                            {v.hit
                                                ? (t.tracker ? '차단' : '파손 — 정상인데 걸림')
                                                : (t.tracker ? '누출 — 그대로 나감' : '통과')}
                                            {v.hit && v.by && v.by !== 'inspect' && <code className="k-mono">{RULES.find((r) => r.id === v.by).p}</code>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="k-win rs-foot-win">
                <div className="k-win-bar">
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="rs-foot">
                    <p>
                        {'거르는 방식에는 두 갈래가 있다. 하나는 요청이 나갈 때마다 코드를 깨워 URL 전체를 읽고 그 자리에서 판단하는 것이고, '}
                        {'다른 하나는 무엇을 막을지 '}<b>미리 적어 두고</b>{' 플랫폼이 대조만 하게 두는 것이다. '}
                        {'앞의 방식은 정확하지만 필터가 모든 요청의 내용을 보게 되고, 뒤의 방식은 아무것도 보지 못하는 대신 적어 둘 줄 수가 한정된다.'}
                    </p>
                    <p>
                        {'그래서 선언적 규칙은 정확도 문제가 아니라 '}<b>덮개 문제</b>{'가 된다. 이 트래픽에는 일곱 종류의 수집 요청이 섞여 있고, '}
                        {'한 줄로 두 종류까지 덮는 규칙은 있어도 세 종류를 덮는 규칙은 없다. beacon 과 tag 는 각각 자기 한 줄을 반드시 써야 한다. '}
                        {'그래서 파손 없이 전부 막으려면 '}<b>정확히 다섯 줄</b>{'이 필요하고, 네 줄로는 아무리 잘 골라도 한 종류가 남는다.'}
                    </p>
                    <p>
                        {'예산을 3줄로 줄이면 갈림길이 선명해진다. collect·adnet·gif 세 줄이면 파손 0으로 추적의 74.5%를 막지만 나머지는 그대로 나간다. '}
                        {'더 막으려고 넓은 줄을 쓰면 — cdn 을 통째로 막으면 CDN 위의 추적 스크립트와 함께 '}<b>대표 이미지도 사라지고</b>{', '}
                        {'uid 파라미터를 막으면 픽셀과 함께 '}<b>장바구니가 깨진다</b>{'. 넓은 규칙의 대가는 항상 화면 쪽에서 지불된다.'}
                    </p>
                    <p>
                        {'동적 검사로 바꾸면 이 고민이 전부 사라진다. 파손 0, 누출 0, 예산 무관 — 대신 노출이 0에서 전량으로 뛴다. '}
                        {'차단 성능을 산 값이 "필터가 내 요청을 전부 본다"인 셈이다. 이 교환에는 정답이 없고, '}
                        {'플랫폼이 어느 쪽을 기본값으로 고르느냐에 따라 '}<b>남는 표현력의 상한</b>{'이 정해질 뿐이다.'}
                    </p>
                    <p className="rs-disclaimer">
                        {'* 호스트·경로·건수는 구조를 보기 위한 가상의 트래픽이며 실제 서비스나 실제 차단 목록이 아닙니다. '}
                        {'특정 브라우저·확장·차단기를 모델링한 것이 아니라, 선언적 규칙과 동적 검사 사이의 일반적인 교환만 다룹니다. '}
                        {'지연 수치는 두 방식의 차이를 나타내는 상징값입니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Ruleset;
