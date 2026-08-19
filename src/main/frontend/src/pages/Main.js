import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import projects from '../data/projects';
import { originAnchorId, originLinkSet } from '../data/labOrigins';
import Footer from '../components/Footer';
import SiteHeader from '../components/SiteHeader';
import viewService from '../services/viewService';
import pinService from '../services/pinService';
import presenceService, { PRESENCE_EVENT } from '../services/presenceService';
import AuthModal from '../components/auth/AuthModal';
import csTipService from '../services/csTipService';
import authService from '../services/AuthService';
import HeroTerminal from '../components/HeroTerminal';
import ProjectIcon from '../components/ProjectIcon';
import useSiteTheme from '../hooks/useSiteTheme';
import "../assets/css/Main.scss";

const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "DevZip",
    "alternateName": ["devzip", "데브집"],
    "url": "https://devzip.site",
    "description": "Developer's Side Project Hub - 개발자의 사이드 프로젝트 허브",
    "potentialAction": {
        "@type": "SearchAction",
        "target": "https://devzip.site/?q={search_term_string}",
        "query-input": "required name=search_term_string"
    }
};

const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "DevZip",
    "url": "https://devzip.site",
    "logo": "https://devzip.site/logo192.png",
    "sameAs": ["https://github.com/Hoooon22"]
};

const LAYOUT_KEY = 'devzip.kernel.layout';

const readLayout = () => {
    if (typeof window === 'undefined') return 'cards';
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    if (raw === null) return 'cards';
    try { return JSON.parse(raw); } catch { return 'cards'; }
};

const buildHeroStats = (allProjects) => allProjects.reduce((acc, p) => {
    if (p.isProduction) {
        acc.production.total += 1;
        if (p.active !== false && p.wip !== true) {
            acc.production.active += 1;
            acc.production.names.push(p.name);
        }
    } else {
        acc.experiments.total += 1;
        const archived = p.active === false || Boolean(p.endDate);
        if (archived) acc.experiments.archived += 1;
        else acc.experiments.running += 1;
    }
    return acc;
}, {
    production: { active: 0, total: 0, names: [] },
    experiments: { total: 0, running: 0, archived: 0 },
});

// Categories often arrive as "프로젝트/생산성도구" — show only the trailing label.
const cleanCategory = (raw) => {
    if (!raw) return '기타';
    const parts = raw.split('/').filter(Boolean);
    return parts[parts.length - 1];
};

// 최근 30일 내 시작한 프로젝트는 NEW 배지를 단다.
const NEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const isNewProject = (p) =>
    Boolean(p.startDate) && (Date.now() - new Date(p.startDate).getTime()) < NEW_WINDOW_MS;

// 소개 페이지는 열려 있지만 서비스로는 아직 개발 중인 프로젝트.
// 카드에 "개발 중" 배지를 달고 "운영 중" 집계에서는 빼되, 링크는 정상 동작한다.
const isWip = (p) => p.wip === true;

// 이 실험에 "실험 계기 연대기" 기록이 있으면 해당 항목으로의 딥링크를 돌려준다(없으면 null).
// labOrigins.js 에 항목이 추가되면 카드에 자동으로 "계기" 링크가 붙는다(별도 작업 불필요).
const originHrefFor = (project) =>
    originLinkSet.has(project.link) ? `/lab-origins#${originAnchorId(project.link)}` : null;

// 고정(핀) 글리프 — 얇은 압정 아이콘. 색은 currentColor 를 따른다.
const PinGlyph = () => (
    <svg className="k-pin-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="9" y1="4" x2="15" y2="4" />
        <path d="M10 4 L9 11 C7.4 11.7 6.4 12.8 6.4 14 H17.6 C17.6 12.8 16.6 11.7 15 11 L14 4" />
        <line x1="12" y1="14" x2="12" y2="20.5" />
    </svg>
);

// 세션 시작 시각(번들 로드 시점). 업타임 계산 기준이며 페이지 어디서든 동일하게 참조한다.
const SESSION_START = Date.now();
const pad2 = (n) => String(n).padStart(2, '0');
const formatClock = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
const formatUptime = () => {
    const s = Math.floor((Date.now() - SESSION_START) / 1000);
    return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
};

// 1초마다 리렌더만 유발하는 최소 훅. 이 훅을 쓰는 "작은" 컴포넌트만 매초 갱신되고
// 홈 전체(프로젝트 목록 등)는 시계 때문에 리렌더되지 않는다.
const useTick = () => {
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, []);
};

// presence 페이지 경로 → 표시 이름. 프로젝트 데이터에 없는 경로는 원문 그대로 보여준다.
const PAGE_NAMES = projects.reduce((acc, p) => {
    if (p.link?.startsWith('/')) acc[p.link] = p.name;
    return acc;
}, { '/': '홈', '/library': '자료실', '/lab-origins': '실험 계기 연대기', '/constellation': '별자리 맵' });

// 실시간 접속자(who) 트레이 — PresencePing이 발행하는 스냅샷 이벤트를 구독한다.
// 스냅샷이 아직 없으면(백엔드 미응답 포함) 아무것도 그리지 않는다.
const TrayWho = () => {
    const [snap, setSnap] = useState(() => presenceService.getLastSnapshot());
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onUpdate = (e) => setSnap(e.detail);
        window.addEventListener(PRESENCE_EVENT, onUpdate);
        return () => window.removeEventListener(PRESENCE_EVENT, onUpdate);
    }, []);

    useEffect(() => {
        if (!open) return undefined;
        const close = () => setOpen(false);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [open]);

    if (!snap || !snap.total) return null;
    const rows = Object.entries(snap.pages || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return (
        <span className="k-who-wrap">
            <button
                type="button"
                className="k-who-btn k-mono"
                aria-expanded={open}
                title="지금 접속 중인 사람들"
                onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
            >
                <span className="dot" />who: {snap.total}
            </button>
            {open && (
                <div className="k-who-pop k-mono" role="dialog" aria-label="실시간 접속 현황">
                    <div className="hd">{'$ who — '}{snap.total}명 접속 중</div>
                    {rows.map(([page, count]) => (
                        <div className="rw" key={page}>
                            <span className="pg">{PAGE_NAMES[page] || page}</span>
                            <span className="ct">×{count}</span>
                        </div>
                    ))}
                </div>
            )}
        </span>
    );
};

// 라이브 시계/업타임 — 각자 독립적으로 매초 갱신되는 격리 컴포넌트.
const TrayClock = () => {
    useTick();
    return (
        <span className="k-tray-clock k-mono">
            {formatClock(new Date())} <span className="up">· up {formatUptime()}</span>
        </span>
    );
};
const LiveUptime = () => { useTick(); return <>{formatUptime()}</>; };

const Main = () => {
    const navigate = useNavigate();
    const [dark, toggleDark] = useSiteTheme();

    // 홈의 기본 시야는 "실험실"이 아니라 운영 중인 서비스다.
    const [mode, setMode] = useState('production'); // 'production' | 'experiment' | 'all'
    const [terminalOn, setTerminalOn] = useState(false); // 히어로 부트 로그 → 검색 터미널 전환
    const [layout, setLayout] = useState(readLayout);
    const [dailyTip, setDailyTip] = useState('');
    const [isTipLoading, setIsTipLoading] = useState(true);
    const [dailyJoke, setDailyJoke] = useState(null);
    const [isJokeLoading, setIsJokeLoading] = useState(true);
    const [showJokeTranslation, setShowJokeTranslation] = useState(false);
    const [viewCounts, setViewCounts] = useState({});
    // 관리자가 설정한 고정 override { projectKey: boolean }. 행이 없으면 정적 pinned 기본값 사용.
    const [pinOverrides, setPinOverrides] = useState({});

    // 인증 상태
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('login');

    // 프로젝트 조회수 로드 (로그인 불필요)
    useEffect(() => {
        let cancelled = false;
        viewService.getViewCounts().then((counts) => {
            if (!cancelled) setViewCounts(counts);
        });
        return () => { cancelled = true; };
    }, []);

    // 프로젝트 고정(핀) 설정 로드 (로그인 불필요, 모두에게 동일하게 보임)
    useEffect(() => {
        let cancelled = false;
        pinService.getPins().then((pins) => {
            if (!cancelled) setPinOverrides(pins);
        });
        return () => { cancelled = true; };
    }, []);

    // 기존 로그인 세션 복원
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (authService.isAuthenticated()) {
                    const ok = await authService.validateToken();
                    if (!cancelled && ok) setUser(authService.getUserInfo());
                }
            } catch {
                /* guest */
            } finally {
                if (!cancelled) setAuthLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => { window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); }, [layout]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setIsTipLoading(true);
            try {
                const r = await csTipService.getDailyTip();
                if (!cancelled) setDailyTip(r.data || '');
            } catch {
                if (!cancelled) setDailyTip('팁을 불러오는 중 오류가 발생했습니다.');
            } finally {
                if (!cancelled) setIsTipLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setIsJokeLoading(true);
            try {
                const r = await csTipService.getDailyJoke();
                if (!cancelled) setDailyJoke(r.data || null);
            } catch {
                if (!cancelled) setDailyJoke(null);
            } finally {
                if (!cancelled) setIsJokeLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const heroStats = useMemo(() => buildHeroStats(projects), []);
    // 홈 상단 쇼케이스에 크게 노출할 운영 서비스 — 최신 시작순, 개발 중인 것은 맨 뒤.
    const services = useMemo(() => (
        projects
            .filter(p => p.isProduction)
            .sort((a, b) => (isWip(a) - isWip(b)) || (new Date(b.startDate) - new Date(a.startDate)))
    ), []);
    const totalCount = projects.length;
    const prodCount = heroStats.production.total;
    const expCount  = heroStats.experiments.total;

    const latestProject = useMemo(() => (
        [...projects]
            .filter(p => p.startDate)
            .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0] || null
    ), []);

    const isAdmin = user?.role === 'ROLE_ADMIN';

    // 고정 여부의 유일한 기준은 관리자가 설정한 백엔드 핀(pinOverrides)이다.
    // 기본값은 "고정 안 됨"이며, 관리자가 명시적으로 고정한 것만 맨 위로 올라간다.
    const isPinned = useCallback(
        (p) => pinOverrides[p.link] === true,
        [pinOverrides]
    );

    const filtered = useMemo(() => {
        let pool;
        if (mode === 'all') pool = projects;
        else if (mode === 'production') pool = projects.filter(p => p.isProduction);
        else pool = projects.filter(p => !p.isProduction);

        return [...pool].sort((a, b) => {
            const ap = isPinned(a);
            const bp = isPinned(b);
            if (ap && !bp) return -1;
            if (!ap && bp) return 1;
            if (!a.startDate) return 1;
            if (!b.startDate) return -1;
            return new Date(b.startDate) - new Date(a.startDate);
        });
    }, [mode, isPinned]);

    // 관리자: 프로젝트 고정/해제 토글 (전역 설정, 모두에게 반영)
    const handlePinToggle = useCallback(async (e, project) => {
        e.preventDefault();
        e.stopPropagation();
        const next = !isPinned(project);
        // 고정 시 목록이 즉시 재정렬되므로, 클릭한 카드를 따라가 시야에서 사라지지 않게 한다.
        const card = e.currentTarget.closest('.k-row, .k-tile');
        // 낙관적 업데이트
        setPinOverrides((prev) => ({ ...prev, [project.link]: next }));
        if (card) {
            requestAnimationFrame(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        }
        const result = await pinService.setPin(project.link, next);
        if (result === null) {
            // 실패 시 롤백
            setPinOverrides((prev) => ({ ...prev, [project.link]: !next }));
            alert('고정 설정에 실패했습니다. 관리자 권한 또는 네트워크를 확인해주세요.');
        }
    }, [isPinned]);

    /* 액션 */
    const scrollToId = (id) => {
        const el = document.getElementById(id);
        if (!el) return;
        // 모바일에서는 상단바가 두 줄로 늘어나므로 실제 높이를 재서 보정한다.
        const barH = document.querySelector('.s-header')?.offsetHeight || 52;
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - barH - 12, behavior: 'smooth' });
    };
    const gotoFilter = (m) => { setMode(m); setTimeout(() => scrollToId('k-proc'), 30); };

    // 조회수 집계(세션당 프로젝트별 1회) — 카드 클릭과 터미널 검색이 공유한다.
    const registerProjectVisit = useCallback((project) => {
        const seenKey = `viewed:${project.link}`;
        if (!sessionStorage.getItem(seenKey)) {
            sessionStorage.setItem(seenKey, '1');
            setViewCounts((prev) => ({
                ...prev,
                [project.link]: (prev[project.link] || 0) + 1,
            }));
            viewService.incrementView(project.link);
        }
    }, []);

    const handleProjectClick = (e, project) => {
        if (project.requiresAdmin && !authService.isAdmin()) {
            e.preventDefault();
            alert('이 프로젝트에 접근하려면 관리자 권한이 필요합니다.');
            return;
        }
        registerProjectVisit(project);
        if (project.link?.startsWith('http://') || project.link?.startsWith('https://')) {
            e.preventDefault();
            window.open(project.link, '_blank', 'noopener,noreferrer');
        }
    };

    // 터미널 검색 결과에서 프로젝트 열기 — 앵커 기본이동이 없으므로 직접 라우팅한다.
    const openProject = useCallback((project) => {
        if (project.requiresAdmin && !authService.isAdmin()) {
            alert('이 프로젝트에 접근하려면 관리자 권한이 필요합니다.');
            return;
        }
        registerProjectVisit(project);
        if (project.link?.startsWith('http://') || project.link?.startsWith('https://')) {
            window.open(project.link, '_blank', 'noopener,noreferrer');
        } else {
            navigate(project.link);
        }
    }, [registerProjectVisit, navigate]);

    const renderTechTags = (project, max = 2) => {
        const stack = project.techStack || project.tech || [];
        const list = stack.length > 0
            ? stack.slice(0, max)
            : (project.category?.split('/').filter(Boolean).slice(0, max) || []);
        return list.map(tag => <span key={`tech-${tag}`}>{tag}</span>);
    };

    // 카드 내부의 "계기" 링크 — 카드 자체의 이동을 막고 실험 계기 연대기의 해당 항목으로 딥링크한다.
    const handleOriginClick = (e, href) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(href);
    };

    // 이 실험에 계기 기록이 있을 때만 렌더된다(없으면 null). 표/카드 뷰 공용.
    const renderOriginLink = (project) => {
        const href = originHrefFor(project);
        if (!href) return null;
        return (
            <button
                type="button"
                className="k-origin-btn"
                title="이 실험을 시작한 계기 — 실험 계기 연대기"
                aria-label={`${project.name} 실험 계기 보기`}
                onClick={(e) => handleOriginClick(e, href)}
            >
                계기
            </button>
        );
    };

    /* 인증 */
    const openAuth = (m) => { setModalMode(m); setModalOpen(true); };
    const handleLogout = () => { authService.logout(); setUser(null); };
    const handleLoginSuccess = (u) => { setUser(u); };

    return (
        <div className="k-os" data-theme={dark ? 'dark' : 'light'}>
            <Helmet>
                <title>DevZip - 개발자의 사이드 프로젝트 허브 | Developer&apos;s Side Project Hub</title>
                <meta name="description" content="DevZip은 개발자를 위한 사이드 프로젝트 허브입니다. Command Stack, Conflux 등 개발자 도구와 실험적인 프로젝트를 만나보세요." />
                <meta name="keywords" content="DevZip, devzip, Command Stack, commandstack, Conflux, conflux, 개발자도구, developer tools, side project, 사이드프로젝트" />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://devzip.site/" />
                <meta property="og:title" content="DevZip - Developer's Side Project Hub" />
                <meta property="og:description" content="A hub for developer side projects. Discover Command Stack, Conflux, and more experimental tools." />
                <meta property="og:locale" content="ko_KR" />
                <meta property="og:locale:alternate" content="en_US" />
                <link rel="alternate" hrefLang="ko" href="https://devzip.site/" />
                <link rel="alternate" hrefLang="en" href="https://devzip.site/" />
                <link rel="alternate" hrefLang="x-default" href="https://devzip.site/" />
                <link rel="canonical" href="https://devzip.site/" />
                <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
                <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
            </Helmet>

            <SiteHeader active="home" dark={dark} onToggleTheme={toggleDark}>
                <TrayWho />
                <TrayClock />
                {authLoading ? (
                    <span className="k-auth">
                        <span className="who k-mono">guest@devzip</span>
                    </span>
                ) : user ? (
                    <span className="k-auth">
                        <span className="who k-mono">
                            {user.username}@devzip
                            {user.role === 'ROLE_ADMIN' && <span className="role">admin</span>}
                        </span>
                        <button type="button" className="k-auth-btn" onClick={handleLogout}>logout</button>
                    </span>
                ) : (
                    <span className="k-auth">
                        <button type="button" className="k-auth-btn primary" onClick={() => openAuth('login')}>login</button>
                        <button type="button" className="k-auth-btn" onClick={() => openAuth('signup')}>signup</button>
                    </span>
                )}
            </SiteHeader>

            <main className="k-desk">
                {/* ── 히어로 ── */}
                <section className="k-hero" aria-label="소개">
                    <div className="k-hero-main">
                        <span className="k-eyebrow k-mono">one-person project arcade</span>
                        <h1>한 사람이 만드는<br />제품의 <span className="ul">모든 단계</span>.</h1>
                        <p>아이디어부터 운영까지 — 정식 서비스와 실험실의 프로토타입을 한곳에서 관리합니다. {totalCount}개의 프로젝트, {prodCount}개의 운영 서비스가 있습니다.</p>
                        <div className="k-cta">
                            <button type="button" className="k-btn" onClick={() => scrollToId('k-srv')}>운영 중인 서비스 보기 →</button>
                            <button type="button" className="k-btn ghost" onClick={() => gotoFilter('experiment')}>실험실 둘러보기</button>
                        </div>
                    </div>
                    {terminalOn ? (
                        <aside className="k-bootlog is-term">
                            <HeroTerminal
                                projects={projects}
                                username={user ? user.username : 'guest'}
                                onOpen={openProject}
                                onClose={() => setTerminalOn(false)}
                            />
                        </aside>
                    ) : (
                        <button
                            type="button"
                            className="k-bootlog k-bootlog-btn"
                            onClick={() => setTerminalOn(true)}
                            aria-label="프로젝트 검색 터미널 열기"
                            title="클릭해서 프로젝트 검색"
                        >
                            <span className="ln"><span className="ok">[ ok ]</span> devzip booted</span>
                            <span className="ln"><span className="ok">[ ok ]</span> {totalCount} projects mounted</span>
                            <span className="ln"><span className="ok">[ ok ]</span> {heroStats.production.active} services online</span>
                            <span className="ln"><span className="dim">[ .. ]</span> {heroStats.experiments.running} experiments running</span>
                            <span className="coin">click to search projects <span className="cur">▌</span></span>
                        </button>
                    )}
                </section>

                {/* ── 서비스 쇼케이스 (홈의 주인공) ── */}
                <section id="k-srv" className="k-srv" aria-label="운영 중인 서비스">
                    <div className="k-sec-hd">
                        <div className="tx">
                            <h2>지금 운영 중인 서비스</h2>
                            <p>직접 쓰려고 만들었고, 쓰면서 불편한 곳을 계속 다듬고 있습니다.</p>
                        </div>
                        <span className="meta k-mono">{heroStats.production.active} online · {prodCount} total</span>
                    </div>
                    <div className="k-srv-grid">
                        {services.map((p) => (
                            <a key={p.id} href={p.link} className="k-srv-card" onClick={(e) => handleProjectClick(e, p)} aria-label={`${p.name} — ${p.description}`}>
                                <div className="hd">
                                    <span className="glw"><ProjectIcon link={p.link} category={p.category} size={28} /></span>
                                    {isWip(p) ? (
                                        <span className="k-stat wip"><span className="sq"></span>개발 중</span>
                                    ) : (
                                        <span className={`k-stat live ${p.active === false ? 'off' : ''}`}><span className="sq"></span>{p.active === false ? 'paused' : 'live'}</span>
                                    )}
                                </div>
                                <h3>{p.name}{isNewProject(p) && <span className="k-new">NEW</span>}</h3>
                                {p.subtitle && <span className="sub">{p.subtitle}</span>}
                                <p>{p.description}</p>
                                <div className="foot">
                                    <span className="k-chip">{cleanCategory(p.category)}</span>
                                    <span className="since k-mono">since {p.startDate}</span>
                                    <span className="views k-mono">{(viewCounts[p.link] || 0).toLocaleString()} views</span>
                                    <span className="open k-mono">열기 →</span>
                                </div>
                            </a>
                        ))}
                    </div>
                </section>

                {/* ── 현황 ── */}
                <section className="k-stats" aria-label="현황">
                    <div className="st">
                        <span className="lbl">운영 중인 서비스</span>
                        <span className="val">{heroStats.production.active}<span className="tot">/{prodCount}</span></span>
                        <span className="sub k-mono">{heroStats.production.names.join(' · ') || '준비 중'}</span>
                    </div>
                    <div className="st">
                        <span className="lbl">실험실 프로젝트</span>
                        <span className="val">{expCount}</span>
                        <span className="sub k-mono">{heroStats.experiments.running} running · {heroStats.experiments.archived} archived</span>
                    </div>
                    {latestProject && (
                        <a className="st st-link" href={latestProject.link} onClick={(e) => handleProjectClick(e, latestProject)}>
                            <span className="lbl">최근 추가</span>
                            <span className="val latest"><span className="gl"><ProjectIcon link={latestProject.link} category={latestProject.category} size={22} /></span>{latestProject.name}<span className="go">→</span></span>
                            <span className="sub k-mono">{latestProject.startDate} · {cleanCategory(latestProject.category)}</span>
                        </a>
                    )}
                </section>

                {/* ── 프로젝트 목록 ── */}
                <section id="k-proc" className="k-proc" aria-label="프로젝트 목록">
                    <div className="k-toolbar">
                        <div className="k-tabs">
                            <button type="button" className={`k-tab ${mode === 'production' ? 'on' : ''}`} onClick={() => setMode('production')}>서비스 <span className="num">{prodCount}</span></button>
                            <button type="button" className={`k-tab ${mode === 'experiment' ? 'on' : ''}`} onClick={() => setMode('experiment')}>실험실 <span className="num">{expCount}</span></button>
                            <button type="button" className={`k-tab ${mode === 'all' ? 'on' : ''}`} onClick={() => setMode('all')}>전체 <span className="num">{totalCount}</span></button>
                        </div>
                        <div className="k-seg k-mono">
                            <span className="cnt">{filtered.length} / {totalCount}</span>
                            <div className="opts">
                                <button type="button" className={layout === 'table' ? 'on' : ''} onClick={() => setLayout('table')}>표</button>
                                <button type="button" className={layout === 'cards' ? 'on' : ''} onClick={() => setLayout('cards')}>카드</button>
                            </div>
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="k-empty">표시할 프로젝트가 없습니다.</div>
                    ) : layout === 'table' ? (
                        <div className="k-table">
                            <div className="k-row head">
                                <div className="pid">NO</div><div className="state">STATE</div><div className="name">PROJECT</div>
                                <div className="desc">DESC</div><div className="cat-cell">CAT</div><div className="stack-cell">STACK</div><div className="arrow"></div>
                            </div>
                            {filtered.map((p, n) => (
                                <a key={p.id} href={p.link} className={`k-row data ${isPinned(p) ? 'is-pinned' : ''}`} onClick={(e) => handleProjectClick(e, p)} aria-label={`${p.name} — ${p.description}`}>
                                    <div className="pid">{String(n + 1).padStart(2, '0')}</div>
                                    <div className="state">
                                        {isWip(p) ? (
                                            <span className="k-stat wip"><span className="sq"></span>개발 중</span>
                                        ) : (
                                            <span className={`k-stat ${p.isProduction ? 'live' : 'lab'} ${p.active === false ? 'off' : ''}`}><span className="sq"></span>{p.isProduction ? 'live' : 'lab'}</span>
                                        )}
                                    </div>
                                    <div className="name"><span className="ic"><ProjectIcon link={p.link} category={p.category} size={17} /></span> {p.name}{isNewProject(p) && <span className="k-new">NEW</span>}{isAdmin ? (
                                        <button type="button" className={`k-pin-btn ${isPinned(p) ? 'on' : ''}`} title={isPinned(p) ? '고정 해제' : '맨 위에 고정'} aria-label={isPinned(p) ? '고정 해제' : '맨 위에 고정'} aria-pressed={isPinned(p)} onClick={(e) => handlePinToggle(e, p)}><PinGlyph /></button>
                                    ) : isPinned(p) && (
                                        <span className="k-pin-badge"><PinGlyph />고정</span>
                                    )}{p.subtitle && <span className="k-subtitle">{p.subtitle}</span>}{renderOriginLink(p)}</div>
                                    <div className="desc">{p.description}</div>
                                    <div className="cat-cell"><span className="k-chip">{cleanCategory(p.category)}</span></div>
                                    <div className="stack-cell"><span className="k-stack">{renderTechTags(p, 2)}</span></div>
                                    <div className="arrow">→</div>
                                </a>
                            ))}
                        </div>
                    ) : (
                        <div className="k-tiles">
                            {filtered.map((p) => (
                                <a key={p.id} href={p.link} className={`k-tile ${isPinned(p) ? 'is-pinned' : ''}`} onClick={(e) => handleProjectClick(e, p)} aria-label={`${p.name} — ${p.description}`}>
                                    <div className="k-tile-bd">
                                        <div className="gl-row">
                                            <div className="glw"><ProjectIcon link={p.link} category={p.category} size={24} /></div>
                                            {isAdmin ? (
                                                <button type="button" className={`k-pin-btn ${isPinned(p) ? 'on' : ''}`} title={isPinned(p) ? '고정 해제' : '맨 위에 고정'} aria-label={isPinned(p) ? '고정 해제' : '맨 위에 고정'} aria-pressed={isPinned(p)} onClick={(e) => handlePinToggle(e, p)}><PinGlyph /></button>
                                            ) : isPinned(p) && (
                                                <span className="k-pin-mark" title="고정됨"><PinGlyph /></span>
                                            )}
                                            {isWip(p) ? (
                                                <span className="k-stat wip"><span className="sq"></span>개발 중</span>
                                            ) : (
                                                <span className={`k-stat ${p.isProduction ? 'live' : 'lab'} ${p.active === false ? 'off' : ''}`}><span className="sq"></span>{p.isProduction ? 'live' : 'lab'}</span>
                                            )}
                                        </div>
                                        <h3>{p.name}{isNewProject(p) && <span className="k-new">NEW</span>}{p.subtitle && <span className="k-subtitle">{p.subtitle}</span>}</h3>
                                        <p>{p.description}</p>
                                        <div className="foot">
                                            <span className="k-stack">{renderTechTags(p, 2)}</span>
                                            <span className="views k-mono">{(viewCounts[p.link] || 0).toLocaleString()} views</span>
                                            {renderOriginLink(p)}
                                            <span className="open k-mono">열기 →</span>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </section>

                {/* ── 위젯 ── */}
                <section className="k-dock" aria-label="위젯">
                    <div className="k-widget">
                        <span className="lbl k-mono">daily cs tip</span>
                        <h4>오늘의 한 줄</h4>
                        <p className="body">{isTipLoading ? <span className="k-skel"></span> : (dailyTip || '오늘의 팁이 없습니다.')}</p>
                    </div>
                    <div className="k-widget">
                        <span className="lbl k-mono">fortune</span>
                        <h4>오늘의 농담</h4>
                        <p className="body">
                            {isJokeLoading ? <span className="k-skel"></span> : dailyJoke ? (
                                <>
                                    {dailyJoke.originalSetup}<br />
                                    <span className="pl">— {dailyJoke.originalPunchline}</span>
                                    {showJokeTranslation && <span className="joke-trans">{dailyJoke.translatedSetup}<br /><span className="pl">— {dailyJoke.translatedPunchline}</span></span>}
                                </>
                            ) : '농담을 불러오지 못했습니다.'}
                        </p>
                        {!isJokeLoading && dailyJoke && (
                            <button type="button" className="k-trans-btn k-mono" aria-expanded={showJokeTranslation} onClick={() => setShowJokeTranslation((v) => !v)}>
                                {showJokeTranslation ? '번역 숨기기' : '번역 보기'}
                            </button>
                        )}
                    </div>
                    <div className="k-widget">
                        <span className="lbl k-mono">status</span>
                        <h4>시스템 상태</h4>
                        <div className="k-sys-rows k-mono">
                            <div className="sr"><span className="k">uptime</span><span className="v"><LiveUptime /></span></div>
                            <div className="sr"><span className="k">session</span><span className="v">{user ? user.username : 'guest'}@devzip</span></div>
                            <div className="sr"><span className="k">projects</span><span className="v">{totalCount} mounted</span></div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />

            <AuthModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onLoginSuccess={handleLoginSuccess}
                initialMode={modalMode}
            />
        </div>
    );
};

export default Main;
