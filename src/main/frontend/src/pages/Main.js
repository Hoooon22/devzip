import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import projects from '../data/projects';
import Footer from '../components/Footer';
import viewService from '../services/viewService';
import pinService from '../services/pinService';
import presenceService, { PRESENCE_EVENT } from '../services/presenceService';
import AuthModal from '../components/auth/AuthModal';
import csTipService from '../services/csTipService';
import authService from '../services/AuthService';
import { useGame } from '../contexts/GameContext';
import KCommandPalette from '../components/KCommandPalette';
import HeroTerminal from '../components/HeroTerminal';
import "../assets/css/Main.scss";

const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "DevZip",
    "alternateName": ["devzip", "데브집"],
    "url": "https://devzip.cloud",
    "description": "Developer's Side Project Hub - 개발자의 사이드 프로젝트 허브",
    "potentialAction": {
        "@type": "SearchAction",
        "target": "https://devzip.cloud/?q={search_term_string}",
        "query-input": "required name=search_term_string"
    }
};

const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "DevZip",
    "url": "https://devzip.cloud",
    "logo": "https://devzip.cloud/logo192.png",
    "sameAs": ["https://github.com/Hoooon22"]
};

const STORAGE_KEYS = {
    dark: 'devzip.kernel.dark',
    layout: 'devzip.kernel.layout',
};

const readPref = (key, fallback) => {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
};

const writePref = (key, value) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
};

const buildHeroStats = (allProjects) => allProjects.reduce((acc, p) => {
    if (p.isProduction) {
        acc.production.total += 1;
        if (p.active !== false) {
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

const openExternal = (url) => window.open(url, '_blank', 'noopener,noreferrer');

// 고정(핀) 글리프 — 터미널/커널 테마에 맞춘 얇은 압정 아이콘. 색은 currentColor 를 따른다.
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
// 홈 전체(프로젝트 목록·게이지 등)는 시계 때문에 리렌더되지 않는다.
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
const LiveClock = () => { useTick(); return <>{formatClock(new Date())}</>; };
const LiveUptime = () => { useTick(); return <>{formatUptime()}</>; };

const Main = () => {
    const { award, xp, level, progress } = useGame();
    const navigate = useNavigate();

    const [mode, setMode] = useState('all'); // 'all' | 'production' | 'experiment'
    const [terminalOn, setTerminalOn] = useState(false); // 히어로 부트 로그 → 검색 터미널 전환
    const [layout, setLayout] = useState(() => readPref(STORAGE_KEYS.layout, 'cards'));
    const [dark, setDark] = useState(() => readPref(STORAGE_KEYS.dark, false));
    const [dailyTip, setDailyTip] = useState('');
    const [isTipLoading, setIsTipLoading] = useState(true);
    const [dailyJoke, setDailyJoke] = useState(null);
    const [isJokeLoading, setIsJokeLoading] = useState(true);
    const [showJokeTranslation, setShowJokeTranslation] = useState(false);
    const [viewCounts, setViewCounts] = useState({});
    // 관리자가 설정한 고정 override { projectKey: boolean }. 행이 없으면 정적 pinned 기본값 사용.
    const [pinOverrides, setPinOverrides] = useState({});
    const [paletteOpen, setPaletteOpen] = useState(false);

    // 인증 상태 (메뉴바 트레이 + 명령 팔레트가 공유)
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

    useEffect(() => { writePref(STORAGE_KEYS.dark, dark); }, [dark]);
    useEffect(() => { writePref(STORAGE_KEYS.layout, layout); }, [layout]);

    // ⌘K / Ctrl+K 로 명령 팔레트 토글
    useEffect(() => {
        const onKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPaletteOpen((o) => !o);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setIsTipLoading(true);
            try {
                const r = await csTipService.getDailyTip();
                if (!cancelled) {
                    setDailyTip(r.data || '');
                    award(5, '오늘의 CS 팁 정독!', { once: true, key: 'read-tip', icon: '💡' });
                }
            } catch {
                if (!cancelled) setDailyTip('팁을 불러오는 중 오류가 발생했습니다.');
            } finally {
                if (!cancelled) setIsTipLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [award]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setIsJokeLoading(true);
            try {
                const r = await csTipService.getDailyJoke();
                if (!cancelled) {
                    setDailyJoke(r.data || null);
                    award(5, '오늘의 농담으로 힐링!', { once: true, key: 'read-joke', icon: '😄' });
                }
            } catch {
                if (!cancelled) setDailyJoke(null);
            } finally {
                if (!cancelled) setIsJokeLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [award]);

    const heroStats = useMemo(() => buildHeroStats(projects), []);
    const totalCount = projects.length;
    const prodCount = heroStats.production.total;
    const expCount  = heroStats.experiments.total;

    const latestProject = useMemo(() => (
        [...projects]
            .filter(p => p.startDate)
            .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0] || null
    ), []);

    const tickerItems = useMemo(() => [
        `${totalCount} projects mounted`,
        `${heroStats.production.active} services online`,
        `${heroStats.experiments.running} experiments running`,
        'built by one dev',
        'insert coin to continue',
    ], [totalCount, heroStats]);

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
    const scrollToProc = () => {
        const el = document.getElementById('k-proc');
        if (!el) return;
        // 모바일에서는 메뉴바가 두 줄로 늘어나므로 실제 높이를 재서 보정한다.
        const barH = document.querySelector('.k-menubar')?.offsetHeight || 46;
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - barH - 12, behavior: 'smooth' });
    };
    const gotoFilter = (m) => { setMode(m); setTimeout(scrollToProc, 30); };

    // 조회수 집계(세션당 프로젝트별 1회) + 탐험 보상 — 카드 클릭과 터미널 검색이 공유한다.
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
        // 새로 발견한 프로젝트마다 1회 탐험 보상.
        award(15, `${project.name} 탐험!`, {
            once: true,
            key: `proj-${project.id}`,
            icon: project.thumbnail || '🧭',
        });
    }, [award]);

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

    const toggleDark = () => {
        setDark(d => !d);
        award(5, '테마 전환 발견!', { once: true, key: 'toggle-theme', icon: '🌗' });
    };

    const changeLayout = (next) => {
        setLayout(next);
        award(5, '보기 방식 전환!', { once: true, key: 'toggle-layout', icon: '🔀' });
    };

    const renderTechTags = (project, max = 2) => {
        const stack = project.techStack || project.tech || [];
        const list = stack.length > 0
            ? stack.slice(0, max)
            : (project.category?.split('/').filter(Boolean).slice(0, max) || []);
        return list.map(tag => <span key={`tech-${tag}`}>{tag}</span>);
    };

    /* 인증 */
    const openAuth = (m) => { setModalMode(m); setModalOpen(true); };
    const handleLogout = () => { authService.logout(); setUser(null); };
    const handleLoginSuccess = (u) => {
        setUser(u);
        award(50, '로그인 보너스 획득!', { once: true, key: 'login', icon: '🔓' });
    };

    /* 명령 팔레트 항목 */
    const paletteItems = useMemo(() => {
        const nav = [
            { id: 'n-home', group: '탐색', icon: '⌂', title: '홈', hint: '/', run: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
            { id: 'n-prod', group: '탐색', icon: '◆', title: '프로젝트 — 운영 중', hint: 'filter', run: () => gotoFilter('production') },
            { id: 'n-lab', group: '탐색', icon: '⚗', title: '실험실', hint: 'filter', run: () => gotoFilter('experiment') },
            { id: 'n-map', group: '탐색', icon: '✦', title: '실험 별자리 맵', hint: '/constellation', run: () => window.location.assign('/constellation') },
            { id: 'n-lib', group: '탐색', icon: '▤', title: '자료실', hint: '/library', run: () => window.location.assign('/library') },
            { id: 'n-gh', group: '탐색', icon: '⎇', title: 'GitHub — Hoooon22', hint: 'external', run: () => openExternal('https://github.com/Hoooon22') },
        ];
        const sys = [
            { id: 's-theme', group: '시스템', icon: '◑', title: dark ? '라이트 모드로 전환' : '다크 모드로 전환', hint: 'theme', run: toggleDark },
            { id: 's-layout', group: '시스템', icon: '▦', title: layout === 'cards' ? '표 보기로 전환' : '카드 보기로 전환', hint: 'view', run: () => changeLayout(layout === 'cards' ? 'table' : 'cards') },
            user
                ? { id: 's-out', group: '시스템', icon: '⏻', title: '로그아웃', hint: '$ logout', run: handleLogout }
                : { id: 's-in', group: '시스템', icon: '⏼', title: '로그인', hint: '$ login', run: () => openAuth('login') },
        ];
        const projs = filtered.map((p) => ({
            id: `p-${p.id}`, group: '프로젝트', icon: p.thumbnail || '📦', title: p.name,
            hint: p.isProduction ? 'live' : 'lab', keywords: `${p.description} ${cleanCategory(p.category)}`,
            run: () => handleProjectClick({ preventDefault() {} }, p),
        }));
        return [...nav, ...sys, ...projs];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtered, dark, layout, user]);

    const filledSegs = Math.round(Math.min(Math.max(progress, 0), 1) * 5);

    return (
        <div className="k-os" data-theme={dark ? 'dark' : 'light'}>
            <Helmet>
                <title>DevZip - 개발자의 사이드 프로젝트 허브 | Developer&apos;s Side Project Hub</title>
                <meta name="description" content="DevZip은 개발자를 위한 사이드 프로젝트 허브입니다. Command Stack, Conflux 등 개발자 도구와 실험적인 프로젝트를 만나보세요." />
                <meta name="keywords" content="DevZip, devzip, Command Stack, commandstack, Conflux, conflux, 개발자도구, developer tools, side project, 사이드프로젝트" />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://devzip.cloud/" />
                <meta property="og:title" content="DevZip - Developer's Side Project Hub" />
                <meta property="og:description" content="A hub for developer side projects. Discover Command Stack, Conflux, and more experimental tools." />
                <meta property="og:locale" content="ko_KR" />
                <meta property="og:locale:alternate" content="en_US" />
                <link rel="alternate" hrefLang="ko" href="https://devzip.cloud/" />
                <link rel="alternate" hrefLang="en" href="https://devzip.cloud/" />
                <link rel="alternate" hrefLang="x-default" href="https://devzip.cloud/" />
                <link rel="canonical" href="https://devzip.cloud/" />
                <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
                <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
            </Helmet>

            {/* ── 메뉴 바 ── */}
            <header className="k-menubar">
                <div className="k-brand">
                    <span className="dia">◆</span>
                    <span className="nm">DEVZIP</span>
                    <span className="ver k-mono">{'/ kernel v3.0'}</span>
                </div>
                <nav className="k-mb-nav">
                    <a className="on" href="/" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>home</a>
                    <button type="button" onClick={() => gotoFilter('production')}>projects</button>
                    <button type="button" onClick={() => gotoFilter('experiment')}>lab</button>
                    <a href="/constellation">map</a>
                    <a href="/library">library</a>
                    <a href="https://github.com/Hoooon22" target="_blank" rel="noopener noreferrer">github</a>
                </nav>
                <div className="k-mb-tray">
                    <button type="button" className="k-kbd" onClick={() => setPaletteOpen(true)} aria-label="명령 팔레트 열기">
                        <span>⌘</span><kbd>K</kbd>
                    </button>
                    <span className="k-xp k-mono">
                        <span className="lv">Lv.{level}</span>
                        <span className="bar">{[0, 1, 2, 3, 4].map((n) => <i key={n} className={n < filledSegs ? 'f' : ''} />)}</span>
                        <span className="coins">◉ <b>{xp}</b></span>
                    </span>
                    <TrayWho />
                    <TrayClock />
                    {authLoading ? (
                        <span className="k-auth">
                            <span className="who k-mono"><span className="host">guest</span><span className="at">@</span><span className="host">devzip</span><span className="cur">_</span></span>
                        </span>
                    ) : user ? (
                        <span className="k-auth">
                            <span className="who k-mono">
                                <span className="host">{user.username}</span><span className="at">@</span><span className="host">devzip</span>
                                {user.role === 'ROLE_ADMIN' && <span className="role">admin</span>}
                            </span>
                            <button type="button" className="k-auth-btn" onClick={handleLogout}>$ logout</button>
                        </span>
                    ) : (
                        <span className="k-auth">
                            <span className="who k-mono"><span className="host">guest</span><span className="at">@</span><span className="host">devzip</span><span className="cur">_</span></span>
                            <button type="button" className="k-auth-btn primary" onClick={() => openAuth('login')}>$ login</button>
                            <button type="button" className="k-auth-btn" onClick={() => openAuth('signup')}>$ signup</button>
                        </span>
                    )}
                    <button type="button" className="k-theme k-mono" onClick={toggleDark} aria-label="테마 전환">{dark ? '☀ light' : '☾ dark'}</button>
                </div>
            </header>

            {/* ── 티커 ── */}
            <div className="k-ticker" aria-hidden="true">
                <div className="track">
                    {[0, 1].map((half) => (
                        <span className="seq" key={half}>
                            {tickerItems.map((it) => <span className="item" key={it}>{it}<span className="star">★</span></span>)}
                        </span>
                    ))}
                </div>
            </div>

            <main className="k-desk">
                {/* ── 히어로 / 부트 매니페스트 ── */}
                <section className="k-win" aria-label="소개">
                    <div className="k-win-bar">
                        <div className="k-dots"><i></i><i></i><i></i></div>
                        <span className="path k-mono"><span className="dir">~/devzip/</span>MOTD.md</span>
                        <span className="meta k-mono">read-only · <LiveClock /></span>
                    </div>
                    <div className="k-hero-bd">
                        <div className="k-hero-main">
                            <span className="k-eyebrow"><span className="sq"></span>one-person project arcade</span>
                            <h1>한 사람이 만드는 <span className="box">제품</span>의 <span className="mk">모든 단계</span>.</h1>
                            <p>아이디어부터 운영까지 — 정식 서비스와 실험실의 프로토타입을 하나의 커널 위에서 관리합니다. {totalCount}개의 프로젝트, {prodCount}개의 운영 서비스가 마운트되어 있습니다.</p>
                            <div className="k-cta">
                                <button type="button" className="k-btn" onClick={scrollToProc}>프로세스 모니터 열기 →</button>
                                <button type="button" className="k-btn ghost" onClick={() => setPaletteOpen(true)}>⌘K 명령 팔레트</button>
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
                                <span className="ln"><span className="ok">[ ok ]</span> kernel devzip v3.0 booted</span>
                                <span className="ln"><span className="ok">[ ok ]</span> mounted {totalCount} projects</span>
                                <span className="ln"><span className="ok">[ ok ]</span> {heroStats.production.active} services online</span>
                                <span className="ln"><span className="dim">[ .. ]</span> {heroStats.experiments.running} experiments running</span>
                                <span className="ln"><span className="ok">[ ok ]</span> command palette ready ⌘K</span>
                                <span className="coin">click to search projects <span className="cur">▌</span></span>
                            </button>
                        )}
                    </div>
                    <div className="k-resize"></div>
                </section>

                {/* ── 게이지 (히어로 메타) ── */}
                <section className="k-gauges">
                    <div className="k-win">
                        <div className="k-win-bar"><div className="k-dots"><i></i><i></i><i></i></div><span className="path k-mono"><span className="dir">/sys/</span>services</span></div>
                        <div className="k-gauge-bd">
                            <div className="top">
                                <div><div className="label">운영 중인 서비스</div><div className="sub">{heroStats.production.names.join(' · ') || '준비 중'}</div></div>
                                <div className="val"><span className="acc">{heroStats.production.active}</span><span className="tot">/{totalCount}</span></div>
                            </div>
                            <div className="k-meter">{Array.from({ length: totalCount }).map((_, n) => <i key={n} className={n < heroStats.production.active ? 'f' : ''} />)}</div>
                        </div>
                        <div className="k-resize"></div>
                    </div>
                    <div className="k-win">
                        <div className="k-win-bar"><div className="k-dots"><i></i><i></i><i></i></div><span className="path k-mono"><span className="dir">/sys/</span>lab</span></div>
                        <div className="k-gauge-bd">
                            <div className="top">
                                <div><div className="label">실험실 프로젝트</div><div className="sub">{heroStats.experiments.running} running · {heroStats.experiments.archived} archived</div></div>
                                <div className="val">{expCount}</div>
                            </div>
                            <div className="k-meter">{Array.from({ length: totalCount }).map((_, n) => <i key={n} className={n < expCount ? 'f' : ''} />)}</div>
                        </div>
                        <div className="k-resize"></div>
                    </div>
                    {latestProject && (
                        <a className="k-win k-gauge" href={latestProject.link} onClick={(e) => handleProjectClick(e, latestProject)}>
                            <div className="k-win-bar"><div className="k-dots"><i></i><i></i><i></i></div><span className="path k-mono"><span className="dir">/sys/</span>latest</span></div>
                            <div className="k-gauge-bd">
                                <div className="top"><div><div className="label">최근 추가</div><div className="sub">{latestProject.startDate} · {cleanCategory(latestProject.category)}</div></div></div>
                                <div className="latest"><span className="gl">{latestProject.thumbnail || '📦'}</span>{latestProject.name}<span className="go">→</span></div>
                            </div>
                        </a>
                    )}
                </section>

                {/* ── 프로세스 모니터 ── */}
                <section id="k-proc" className="k-win">
                    <div className="k-win-bar">
                        <div className="k-dots"><i></i><i></i><i></i></div>
                        <span className="path k-mono"><span className="dir">/proc/</span>projects</span>
                        <span className="meta k-mono">{filtered.length} / {totalCount} 표시 중</span>
                    </div>
                    <div className="k-toolbar">
                        <div className="k-tabs">
                            <button type="button" className={`k-tab ${mode === 'all' ? 'on' : ''}`} onClick={() => setMode('all')}>전체 <span className="num">{totalCount}</span></button>
                            <button type="button" className={`k-tab ${mode === 'production' ? 'on' : ''}`} onClick={() => setMode('production')}>운영 중 <span className="num">{prodCount}</span></button>
                            <button type="button" className={`k-tab ${mode === 'experiment' ? 'on' : ''}`} onClick={() => setMode('experiment')}>실험실 <span className="num">{expCount}</span></button>
                        </div>
                        <div className="k-seg k-mono">
                            <span>render</span>
                            <div className="opts">
                                <button type="button" className={layout === 'table' ? 'on' : ''} onClick={() => changeLayout('table')}><span>☰</span> 표</button>
                                <button type="button" className={layout === 'cards' ? 'on' : ''} onClick={() => changeLayout('cards')}><span>▦</span> 카드</button>
                            </div>
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="k-empty">🚧 표시할 프로세스가 없습니다.</div>
                    ) : layout === 'table' ? (
                        <div className="k-table">
                            <div className="k-row head">
                                <div className="pid">PID</div><div className="state">STATE</div><div className="name">PROCESS</div>
                                <div className="desc">DESC</div><div className="cat-cell">CAT</div><div className="stack-cell">STACK</div><div className="arrow"></div>
                            </div>
                            {filtered.map((p, n) => (
                                <a key={p.id} href={p.link} className={`k-row data ${isPinned(p) ? 'is-pinned' : ''}`} onClick={(e) => handleProjectClick(e, p)} aria-label={`${p.name} — ${p.description}`}>
                                    <div className="pid">{String(n + 1).padStart(2, '0')}</div>
                                    <div className="state">
                                        <span className={`k-stat ${p.isProduction ? 'live' : 'lab'} ${p.active === false ? 'off' : ''}`}><span className="sq"></span>{p.isProduction ? 'live' : 'lab'}</span>
                                    </div>
                                    <div className="name">{p.thumbnail} {p.name}{isNewProject(p) && <span className="k-new">NEW</span>}{isAdmin ? (
                                        <button type="button" className={`k-pin-btn ${isPinned(p) ? 'on' : ''}`} title={isPinned(p) ? '고정 해제' : '맨 위에 고정'} aria-label={isPinned(p) ? '고정 해제' : '맨 위에 고정'} aria-pressed={isPinned(p)} onClick={(e) => handlePinToggle(e, p)}><PinGlyph /></button>
                                    ) : isPinned(p) && (
                                        <span className="k-pin-badge"><PinGlyph />고정</span>
                                    )}{p.subtitle && <span className="k-subtitle">{p.subtitle}</span>}</div>
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
                                    <div className="k-tile-bar">
                                        <div className="k-dots"><i></i><i></i><i></i></div>
                                        <span className="tname">{p.name}</span>
                                        {isAdmin ? (
                                            <button type="button" className={`k-pin-btn ${isPinned(p) ? 'on' : ''}`} title={isPinned(p) ? '고정 해제' : '맨 위에 고정'} aria-label={isPinned(p) ? '고정 해제' : '맨 위에 고정'} aria-pressed={isPinned(p)} onClick={(e) => handlePinToggle(e, p)}><PinGlyph /></button>
                                        ) : isPinned(p) && (
                                            <span className="k-pin-mark" title="고정됨"><PinGlyph /></span>
                                        )}
                                        <span className={`tdot ${p.isProduction ? 'live' : ''}`}></span>
                                    </div>
                                    <div className="k-tile-bd">
                                        <div className="gl-row">
                                            <div className="glw">{p.thumbnail || '📦'}</div>
                                            <span className="k-chip">{cleanCategory(p.category)}</span>
                                        </div>
                                        <h3>{p.name}{isNewProject(p) && <span className="k-new">NEW</span>}{p.subtitle && <span className="k-subtitle">{p.subtitle}</span>}</h3>
                                        <p>{p.description}</p>
                                        <div className="foot">
                                            <span className="k-stack">{renderTechTags(p, 2)}</span>
                                            <span className="views k-mono">👁 {(viewCounts[p.link] || 0).toLocaleString()}</span>
                                            <span className="open">열기 →</span>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                    <div className="k-resize"></div>
                </section>

                {/* ── 도크 위젯 ── */}
                <section className="k-dock">
                    <div className="k-win k-widget">
                        <div className="k-win-bar"><div className="k-dots"><i></i><i></i><i></i></div><span className="path k-mono">man cs-tip</span></div>
                        <div className="k-widget-bd">
                            <span className="lbl k-mono">데일리 CS 팁</span>
                            <h4>오늘의 한 줄</h4>
                            <p className="body">{isTipLoading ? <span className="k-skel"></span> : (dailyTip || '오늘의 팁이 없습니다.')}</p>
                        </div>
                    </div>
                    <div className="k-win k-widget">
                        <div className="k-win-bar"><div className="k-dots"><i></i><i></i><i></i></div><span className="path k-mono">fortune</span></div>
                        <div className="k-widget-bd">
                            <span className="lbl k-mono">잠깐 쉬어가기</span>
                            <h4>오늘의 농담</h4>
                            <p className="body">
                                {isJokeLoading ? <span className="k-skel"></span> : dailyJoke ? (
                                    <>
                                        {dailyJoke.originalSetup}<br />
                                        <span style={{ opacity: 0.78 }}>— {dailyJoke.originalPunchline}</span>
                                        {showJokeTranslation && <span className="joke-trans">{dailyJoke.translatedSetup}<br /><span style={{ opacity: 0.78 }}>— {dailyJoke.translatedPunchline}</span></span>}
                                    </>
                                ) : '농담을 불러오지 못했습니다.'}
                            </p>
                            {!isJokeLoading && dailyJoke && (
                                <button type="button" className="k-trans-btn" aria-expanded={showJokeTranslation} onClick={() => setShowJokeTranslation((v) => !v)}>
                                    {showJokeTranslation ? '번역 숨기기' : '번역 보기'}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="k-win k-widget">
                        <div className="k-win-bar"><div className="k-dots"><i></i><i></i><i></i></div><span className="path k-mono"><span className="dir">/sys/</span>status</span></div>
                        <div className="k-widget-bd">
                            <span className="lbl k-mono">시스템 상태</span>
                            <h4>all systems go</h4>
                            <div className="k-sys-rows">
                                <div className="sr"><span className="k">uptime</span><span className="v"><LiveUptime /></span></div>
                                <div className="sr"><span className="k">level</span><span className="v ok">Lv.{level} · {xp} XP</span></div>
                                <div className="sr"><span className="k">session</span><span className="v">{user ? user.username : 'guest'}@devzip</span></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 상태 바 ── */}
                <footer className="k-statusbar">
                    <span className="sys"><span className="sq"></span>all systems go</span>
                    <span>© {new Date().getFullYear()} hoooon22 · devzip.cloud</span>
                    <span className="dir">build f7c4a3b · master</span>
                    <div className="links">
                        <a href="https://github.com/Hoooon22" target="_blank" rel="noopener noreferrer">GitHub</a>
                        <a href="/Guestbook">방명록</a>
                    </div>
                </footer>
            </main>

            {/* 오버레이 */}
            {paletteOpen && <KCommandPalette items={paletteItems} onClose={() => setPaletteOpen(false)} />}
            <AuthModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onLoginSuccess={handleLoginSuccess}
                initialMode={modalMode}
            />

            <Footer />
        </div>
    );
};

export default Main;
