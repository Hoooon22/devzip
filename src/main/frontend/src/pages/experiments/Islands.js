import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Islands.css';

// 섬(아일랜드) 아키텍처 / 부분 하이드레이션 실험.
// 핵심: 서버가 페이지 전체를 정적 HTML로 먼저 그려서 첫 화면은 즉시 뜬다.
// 그런데 전통적 SSR은 "상호작용 가능한 모든 것"에 JS를 붙여(hydrate) 다시 살려낸다 —
// 텍스트·이미지처럼 애초에 JS가 필요 없는 부분까지 통째로. 섬 아키텍처는 반대로
// 실제로 상호작용이 일어나는 위젯(=섬)에만 JS를 실어보낸다. 나머지는 정적 HTML 그대로 둔다.
// JS 전송량이 줄면 상호작용까지 걸리는 시간(TTI)이 짧아진다. 대신 섬으로 안 만든 위젯은
// 클릭해도 반응하지 않는 "죽은 HTML"로 남는다 — 속도 ↔ 상호작용의 줄다리기.

const FIRST_PAINT = 250; // 서버-우선 렌더의 첫 페인트(ms) — 정적 HTML은 늘 이 시점에 뜬다
const EXEC_MS_PER_KB = 4; // KB당 파싱·실행 비용(ms) — 메인 스레드에서 직렬로 처리

// 가상의 기사 페이지를 이루는 컴포넌트들. kb=0 이고 interactive=false 면 JS가 필요 없는 정적 조각.
const COMPONENTS = [
    { id: 'nav', label: '내비게이션', icon: '≡', kb: 14, interactive: true, span: 12 },
    { id: 'search', label: '검색창', icon: '⌕', kb: 20, interactive: true, span: 12 },
    { id: 'hero', label: '히어로 이미지', icon: '▤', kb: 0, interactive: false, span: 12 },
    { id: 'title', label: '기사 제목', icon: 'H1', kb: 0, interactive: false, span: 8 },
    { id: 'toc', label: '목차 접기', icon: '⋮', kb: 6, interactive: true, span: 4 },
    { id: 'body', label: '본문 텍스트', icon: '¶', kb: 0, interactive: false, span: 8 },
    { id: 'share', label: '공유 버튼', icon: '↗', kb: 9, interactive: true, span: 4 },
    { id: 'gallery', label: '이미지 캐러셀', icon: '❐', kb: 34, interactive: true, span: 8 },
    { id: 'like', label: '좋아요', icon: '♥', kb: 5, interactive: true, span: 4 },
    { id: 'video', label: '동영상 플레이어', icon: '▷', kb: 58, interactive: true, span: 8 },
    { id: 'newsletter', label: '뉴스레터 폼', icon: '✉', kb: 18, interactive: true, span: 4 },
    { id: 'comments', label: '댓글창', icon: '❝', kb: 41, interactive: true, span: 8 },
    { id: 'ads', label: '사이드 광고', icon: '▦', kb: 0, interactive: false, span: 4 },
    { id: 'footer', label: '푸터', icon: '▂', kb: 0, interactive: false, span: 12 },
];

const INTERACTIVE_IDS = COMPONENTS.filter((c) => c.interactive).map((c) => c.id);

// 프리셋: 어떤 위젯을 섬(하이드레이션 대상)으로 삼을지
const PRESETS = {
    all: INTERACTIVE_IDS, // 전통적 SSR — 상호작용 가능한 전부 하이드레이션
    smart: ['nav', 'search', 'like', 'toc'], // 실제로 자주 쓰는 가벼운 섬만
    none: [], // 완전 정적 (JS 0)
};

const Islands = () => {
    const [islandSet, setIslandSet] = useState(() => new Set(PRESETS.smart));
    const [netKBps, setNetKBps] = useState(80); // 회선 속도(KB/s)
    const [playT, setPlayT] = useState(null); // 애니메이션 중인 시뮬레이션 시계(ms), null이면 정착 상태
    const timerRef = useRef(null);

    const toggleIsland = useCallback((c) => {
        if (!c.interactive) return;
        setPlayT(null);
        setIslandSet((prev) => {
            const next = new Set(prev);
            if (next.has(c.id)) next.delete(c.id);
            else next.add(c.id);
            return next;
        });
    }, []);

    // 하이드레이션 스케줄: DOM 순서대로 다운로드→실행을 직렬 처리해 각 섬의 완료 시각을 누적 계산
    const schedule = useMemo(() => {
        const dlPerKb = 1000 / netKBps; // KB당 다운로드 ms
        const build = (ids) => {
            const order = COMPONENTS.filter((c) => c.interactive && ids.has(c.id));
            const map = {};
            let t = FIRST_PAINT;
            for (const c of order) {
                const start = t;
                t += c.kb * dlPerKb + c.kb * EXEC_MS_PER_KB;
                map[c.id] = { start, end: t };
            }
            return { map, tti: t, order };
        };
        const isl = build(islandSet);
        const allIds = new Set(INTERACTIVE_IDS);
        const all = build(allIds);
        return { isl, allTti: all.tti };
    }, [islandSet, netKBps]);

    const jsKB = useMemo(
        () => COMPONENTS.reduce((s, c) => (islandSet.has(c.id) ? s + c.kb : s), 0),
        [islandSet]
    );
    const allKB = useMemo(() => COMPONENTS.reduce((s, c) => s + c.kb, 0), []);
    const keptPct = Math.round((islandSet.size / INTERACTIVE_IDS.length) * 100);

    const ttiIslands = schedule.isl.tti;
    const ttiAll = schedule.allTti;
    const saved = Math.max(0, Math.round((1 - ttiIslands / ttiAll) * 100));

    // 재생: 시뮬레이션 시계를 0→TTI 까지 훑으며 섬이 하나씩 살아나는 파동을 보여준다
    const play = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (islandSet.size === 0) return;
        const end = ttiIslands + 120;
        const step = end / 60;
        let t = 0;
        setPlayT(0);
        timerRef.current = setInterval(() => {
            t += step;
            if (t >= end) {
                clearInterval(timerRef.current);
                timerRef.current = null;
                setPlayT(null); // 정착 상태로 복귀 (모든 섬 라이브)
            } else {
                setPlayT(t);
            }
        }, 26);
    }, [islandSet, ttiIslands]);

    useEffect(() => () => timerRef.current && clearInterval(timerRef.current), []);

    // 재생 중인 시각 기준으로 각 섬의 현재 상태 판정
    const stateOf = (c) => {
        if (!c.interactive) return 'static';
        if (!islandSet.has(c.id)) return 'inert'; // 섬 아님 → 죽은 HTML
        if (playT === null) return 'live'; // 정착: 살아있음
        const s = schedule.isl.map[c.id];
        if (!s) return 'live';
        if (playT >= s.end) return 'live';
        if (playT >= s.start) return 'loading';
        return 'pending';
    };

    const liveNow =
        playT === null
            ? islandSet.size
            : schedule.isl.order.filter((c) => playT >= schedule.isl.map[c.id].end).length;

    return (
        <div className="il-container">
            <div className="il-inner">
                <Link to="/" className="il-back">← 실험실로 돌아가기</Link>

                <header className="il-header">
                    <h1 className="il-title">ISLANDS</h1>
                    <p className="il-sub">{'// 상호작용이 일어나는 곳에만 JS를 실어보낸다 — 섬 아키텍처 · 부분 하이드레이션'}</p>
                </header>

                <div className="il-stage">
                    {/* 좌측: 가상 페이지 목업 */}
                    <section className="il-left">
                        <div className="il-browser">
                            <div className="il-chrome">
                                <i className="il-dot" /><i className="il-dot" /><i className="il-dot" />
                                <span className="il-url">devzip.cloud/article</span>
                                <span className={'il-badge ' + (playT === null ? 'il-badge-done' : 'il-badge-hy')}>
                                    {playT === null ? '정착됨' : '하이드레이션 중…'}
                                </span>
                            </div>

                            <div className="il-page">
                                {COMPONENTS.map((c) => {
                                    const st = stateOf(c);
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            className={`il-block il-${st} il-span-${c.span}`}
                                            onClick={() => toggleIsland(c)}
                                            disabled={!c.interactive}
                                            title={c.interactive ? '클릭해 섬 지정/해제' : '정적 조각 — JS 불필요'}
                                        >
                                            <span className="il-block-top">
                                                <span className="il-ico">{c.icon}</span>
                                                <span className="il-name">{c.label}</span>
                                            </span>
                                            <span className="il-block-tag">
                                                {!c.interactive
                                                    ? '정적'
                                                    : st === 'inert'
                                                    ? '죽은 HTML'
                                                    : st === 'live'
                                                    ? `섬 · ${c.kb}KB`
                                                    : st === 'loading'
                                                    ? '살아나는 중…'
                                                    : `대기 · ${c.kb}KB`}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="il-legend">
                            <span><i className="il-key il-key-static" />정적 HTML (JS 0)</span>
                            <span><i className="il-key il-key-inert" />죽은 HTML (섬 아님)</span>
                            <span><i className="il-key il-key-live" />살아있는 섬 (JS 실림)</span>
                        </div>
                        <p className="il-tip">위젯을 클릭하면 섬(하이드레이션 대상)이 되거나 해제됩니다. 정적 조각은 애초에 JS가 필요 없어요.</p>
                    </section>

                    {/* 우측: 컨트롤 + 지표 */}
                    <aside className="il-panel">
                        <div className="il-presets">
                            <span className="il-presets-label">프리셋</span>
                            <button type="button" className="il-pbtn" onClick={() => { setPlayT(null); setIslandSet(new Set(PRESETS.all)); }}>전부 하이드레이션</button>
                            <button type="button" className="il-pbtn" onClick={() => { setPlayT(null); setIslandSet(new Set(PRESETS.smart)); }}>똑똑한 섬만</button>
                            <button type="button" className="il-pbtn il-pbtn-ghost" onClick={() => { setPlayT(null); setIslandSet(new Set(PRESETS.none)); }}>완전 정적</button>
                        </div>

                        <div className="il-control">
                            <label htmlFor="il-net">회선 속도 <b>{netKBps} KB/s</b></label>
                            <input
                                id="il-net"
                                type="range"
                                min={20}
                                max={400}
                                step={10}
                                value={netKBps}
                                onChange={(e) => { setPlayT(null); setNetKBps(Number(e.target.value)); }}
                            />
                            <span className="il-note">느린 회선일수록 JS 전송량 차이가 TTI에 크게 반영됩니다.</span>
                        </div>

                        <div className="il-metric">
                            <div className="il-metric-head"><span>JS 전송량</span><b>{jsKB}<small> / {allKB} KB</small></b></div>
                            <div className="il-bar"><div className="il-bar-fill il-bar-js" style={{ width: `${(jsKB / allKB) * 100}%` }} /></div>
                        </div>

                        <div className="il-metric">
                            <div className="il-metric-head"><span>상호작용 유지</span><b>{keptPct}<small>%</small></b></div>
                            <div className="il-bar"><div className="il-bar-fill il-bar-keep" style={{ width: `${keptPct}%` }} /></div>
                            <span className="il-note">{islandSet.size} / {INTERACTIVE_IDS.length} 개 위젯만 실제로 반응합니다.</span>
                        </div>

                        <div className="il-tti">
                            <div className="il-tti-row">
                                <span className="il-tti-label">섬 아키텍처 TTI</span>
                                <span className="il-tti-val il-tti-good">{Math.round(ttiIslands)}<small>ms</small></span>
                            </div>
                            <div className="il-tti-track">
                                <div className="il-tti-fill il-tti-fill-good" style={{ width: `${(ttiIslands / ttiAll) * 100}%` }} />
                            </div>
                            <div className="il-tti-row">
                                <span className="il-tti-label">전부 하이드레이션 TTI</span>
                                <span className="il-tti-val">{Math.round(ttiAll)}<small>ms</small></span>
                            </div>
                            <div className="il-tti-track">
                                <div className="il-tti-fill" style={{ width: '100%' }} />
                            </div>
                            <p className="il-tti-note">
                                {saved > 0
                                    ? <>상호작용까지 <b>{saved}% 더 빠름</b> — 필요 없는 JS를 안 실은 만큼 앞당겨졌습니다.</>
                                    : <>지금은 전부 하이드레이션과 같습니다. 섬을 줄여보세요.</>}
                            </p>
                        </div>

                        <button type="button" className="il-play" onClick={play} disabled={islandSet.size === 0}>
                            ▷ 하이드레이션 재생 ({liveNow}/{islandSet.size} 라이브)
                        </button>
                    </aside>
                </div>

                <footer className="il-foot">
                    <p>
                        {'서버-우선 렌더링에선 서버가 페이지를 '}<b>정적 HTML</b>{'로 먼저 그려서 첫 화면은 곧바로 뜬다. '}
                        {'문제는 그 다음 — 전통적 SSR은 상호작용 가능한 '}<b>모든 컴포넌트에 JS를 붙여</b>
                        {' 브라우저에서 다시 살려낸다(하이드레이션). 텍스트·이미지처럼 원래 JS가 필요 없는 부분까지 포함해서.'}
                    </p>
                    <p>
                        {'섬(아일랜드) 아키텍처는 반대로 접근한다. 실제로 '}<b>상호작용이 일어나는 위젯만 「섬」</b>
                        {'으로 지정해 그 조각에만 JS를 실어보낸다. 나머지는 정적 HTML 그대로 둔다. JS 전송량이 줄면 '}
                        {'파싱·실행할 코드가 줄어 '}<b>상호작용까지 걸리는 시간(TTI)</b>{'이 짧아진다.'}
                    </p>
                    <p>
                        {'대신 공짜는 아니다. 섬으로 만들지 않은 위젯은 클릭해도 반응하지 않는 '}<b>죽은 HTML</b>
                        {'로 남는다. 그래서 "어디까지를 섬으로 둘 것인가"는 '}<b>속도 ↔ 상호작용</b>
                        {'의 줄다리기다 — 자주 쓰는 가벼운 위젯만 섬으로 두는 게 대체로 이득이다.'}
                    </p>
                    <p className="il-disclaimer">
                        {'* 실제 번들러·프레임워크가 아니라 부분 하이드레이션의 비용 구조(JS 전송량 → TTI)를 보여주는 결정적 근사 시뮬레이터입니다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default Islands;
