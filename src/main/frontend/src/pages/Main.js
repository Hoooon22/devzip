import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import projects from '../data/projects';
import Footer from '../components/Footer';
import AuthModal from '../components/auth/AuthModal';
import csTipService from '../services/csTipService';
import authService from '../services/AuthService';
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
    dark: 'devzip.mono.dark',
    layout: 'devzip.mono.layout',
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

const MonoAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('login');

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
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const open = (mode) => { setModalMode(mode); setModalOpen(true); };
    const handleLogout = () => { authService.logout(); setUser(null); };

    if (loading) {
        return (
            <div className="mono-auth">
                <span className="who">
                    <span className="host">guest</span>
                    <span className="at">@</span>
                    <span className="host">devzip</span>
                    <span className="cursor">_</span>
                </span>
            </div>
        );
    }

    if (user) {
        const isAdmin = user.role === 'ROLE_ADMIN';
        return (
            <div className="mono-auth">
                <span className="who">
                    <span className="host">{user.username}</span>
                    <span className="at">@</span>
                    <span className="host">devzip</span>
                    {isAdmin && <span className="role">admin</span>}
                </span>
                <button className="auth-btn" onClick={handleLogout}>$ logout</button>
            </div>
        );
    }

    return (
        <div className="mono-auth">
            <span className="who">
                <span className="host">guest</span>
                <span className="at">@</span>
                <span className="host">devzip</span>
                <span className="cursor">_</span>
            </span>
            <button className="auth-btn primary" onClick={() => open('login')}>$ login</button>
            <button className="auth-btn" onClick={() => open('signup')}>$ signup</button>
            <AuthModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onLoginSuccess={(u) => setUser(u)}
                initialMode={modalMode}
            />
        </div>
    );
};

const Main = () => {
    const [mode, setMode] = useState('all'); // 'all' | 'production' | 'experiment'
    const [layout, setLayout] = useState(() => readPref(STORAGE_KEYS.layout, 'table'));
    const [dark, setDark] = useState(() => readPref(STORAGE_KEYS.dark, false));
    const [dailyTip, setDailyTip] = useState('');
    const [isTipLoading, setIsTipLoading] = useState(true);
    const [dailyJoke, setDailyJoke] = useState(null);
    const [isJokeLoading, setIsJokeLoading] = useState(true);

    useEffect(() => {
        document.body.classList.add('main-scroll-locked');
        return () => document.body.classList.remove('main-scroll-locked');
    }, []);

    useEffect(() => { writePref(STORAGE_KEYS.dark, dark); }, [dark]);
    useEffect(() => { writePref(STORAGE_KEYS.layout, layout); }, [layout]);

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
    const totalCount = projects.length;
    const prodCount = heroStats.production.total;
    const expCount  = heroStats.experiments.total;

    const filtered = useMemo(() => {
        let pool;
        if (mode === 'all') pool = projects;
        else if (mode === 'production') pool = projects.filter(p => p.isProduction);
        else pool = projects.filter(p => !p.isProduction);

        return [...pool].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            if (!a.startDate) return 1;
            if (!b.startDate) return -1;
            return new Date(b.startDate) - new Date(a.startDate);
        });
    }, [mode]);

    const handleProjectClick = (e, project) => {
        if (project.requiresAdmin && !authService.isAdmin()) {
            e.preventDefault();
            alert('이 프로젝트에 접근하려면 관리자 권한이 필요합니다.');
            return;
        }
        if (project.link?.startsWith('http://') || project.link?.startsWith('https://')) {
            e.preventDefault();
            window.open(project.link, '_blank', 'noopener,noreferrer');
        }
    };

    const renderTechTags = (project, max = 2) => {
        const stack = project.techStack || project.tech || [];
        const list = stack.length > 0
            ? stack.slice(0, max)
            : (project.category?.split('/').filter(Boolean).slice(0, max) || []);
        return list.map(tag => <span key={`tech-${tag}`}>{tag}</span>);
    };

    const browseProjects = () => {
        document.getElementById('mono-projects')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="mono-root" data-theme={dark ? 'dark' : 'light'}>
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

            <div className="mono-wrap">
                <header className="mono-top">
                    <div className="mono-brand">
                        <div className="mark">D</div>
                        <div>
                            <div className="name">DevZip</div>
                            <div className="tag">개발자 사이드 프로젝트 허브</div>
                        </div>
                    </div>
                    <nav className="mono-nav">
                        <a className="on" href="#">홈</a>
                        <a href="#mono-projects">프로젝트</a>
                        <a href="#mono-projects">실험실</a>
                        <a href="https://github.com/Hoooon22" target="_blank" rel="noopener noreferrer">GitHub</a>
                    </nav>
                    <MonoAuth />
                </header>

                <section className="mono-hero">
                    <div>
                        <h1>한 사람이 만드는 <span className="mark">제품</span>의 모든 단계.</h1>
                        <p>
                            아이디어부터 운영까지 — 정식 서비스와 실험실의 프로토타입을 한곳에서 관리합니다. {totalCount}개의 프로젝트, {prodCount}개의 운영 서비스.
                        </p>
                        <div className="mono-cta">
                            <button className="mono-btn" onClick={browseProjects}>프로젝트 둘러보기 →</button>
                            <a className="mono-btn ghost" href="https://github.com/Hoooon22" target="_blank" rel="noopener noreferrer">소개 읽기</a>
                        </div>
                    </div>
                    <div className="mono-hero-meta">
                        <div className="mono-meta-card">
                            <div>
                                <div className="label">운영 중인 서비스</div>
                                <div className="sub">
                                    {heroStats.production.names.join(' · ') || '준비 중'}
                                </div>
                            </div>
                            <div className="value">
                                <span className="acc">{heroStats.production.active}</span>
                                <span className="total">/{totalCount}</span>
                            </div>
                        </div>
                        <div className="mono-meta-card invert">
                            <div>
                                <div className="label">실험실 프로젝트</div>
                                <div className="sub">
                                    {heroStats.experiments.running} running · {heroStats.experiments.archived} archived
                                </div>
                            </div>
                            <div className="value">{expCount}</div>
                        </div>
                    </div>
                </section>

                <div id="mono-projects" className="mono-section-title">
                    <h2>모든 프로젝트</h2>
                    <span className="count">{filtered.length}개 표시 중 · 총 {totalCount}개</span>
                </div>

                <div className="mono-toolbar">
                    <div className="mono-tabs">
                        <button
                            className={`tab ${mode === 'all' ? 'on' : ''}`}
                            onClick={() => setMode('all')}
                        >
                            전체 <span className="num">{totalCount}</span>
                        </button>
                        <button
                            className={`tab ${mode === 'production' ? 'on' : ''}`}
                            onClick={() => setMode('production')}
                        >
                            운영 중 <span className="num">{prodCount}</span>
                        </button>
                        <button
                            className={`tab ${mode === 'experiment' ? 'on' : ''}`}
                            onClick={() => setMode('experiment')}
                        >
                            실험실 <span className="num">{expCount}</span>
                        </button>
                    </div>
                    <div className="mono-layout-toggle">
                        <span>보기</span>
                        <div className="opts">
                            <button
                                className={layout === 'table' ? 'on' : ''}
                                onClick={() => setLayout('table')}
                            >
                                <span className="icn">☰</span> 표
                            </button>
                            <button
                                className={layout === 'cards' ? 'on' : ''}
                                onClick={() => setLayout('cards')}
                            >
                                <span className="icn">▦</span> 카드
                            </button>
                        </div>
                        <button
                            className="theme-btn"
                            onClick={() => setDark(d => !d)}
                            aria-label="Toggle theme"
                        >{dark ? '☀ light' : '☾ dark'}</button>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="mono-empty">
                        🚧 표시할 프로젝트가 없습니다.
                    </div>
                ) : layout === 'table' ? (
                    <div className="mono-table">
                        <div className="mono-row head">
                            <div>#</div>
                            <div></div>
                            <div>이름</div>
                            <div>설명</div>
                            <div className="cat-cell">카테고리</div>
                            <div>스택</div>
                            <div>상태</div>
                            <div></div>
                        </div>
                        {filtered.map((p, i) => (
                            <a
                                key={p.id}
                                href={p.link}
                                className="mono-row data"
                                onClick={(e) => handleProjectClick(e, p)}
                                aria-label={`${p.name} — ${p.description}`}
                            >
                                <div className="idx">{String(i + 1).padStart(2, '0')}</div>
                                <div className="glyph">{p.thumbnail || '📦'}</div>
                                <div className="name">{p.name}</div>
                                <div className="desc">{p.description}</div>
                                <div className="cat-cell"><span className="cat">{cleanCategory(p.category)}</span></div>
                                <div className="stack">{renderTechTags(p, 2)}</div>
                                <div>
                                    <span className={`status ${p.isProduction ? 'live' : 'lab'}`}>
                                        <span className="dot" aria-hidden="true"></span>
                                        {p.isProduction ? '운영 중' : '실험실'}
                                    </span>
                                </div>
                                <div className="arrow">→</div>
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="mono-cardgrid">
                        {filtered.map((p) => (
                            <a
                                key={p.id}
                                href={p.link}
                                className="mono-cell"
                                onClick={(e) => handleProjectClick(e, p)}
                                aria-label={`${p.name} — ${p.description}`}
                            >
                                <div className="top">
                                    <div className="glyph-wrap">{p.thumbnail || '📦'}</div>
                                    <div className="top-r">
                                        <span className="cat">{cleanCategory(p.category)}</span>
                                        <span className={`status ${p.isProduction ? 'live' : 'lab'}`}>
                                            <span className="dot" aria-hidden="true"></span>
                                            {p.isProduction ? '운영 중' : '실험실'}
                                        </span>
                                    </div>
                                </div>
                                <h3>{p.name}</h3>
                                <p>{p.description}</p>
                                <div className="foot">
                                    <div className="stack">{renderTechTags(p, 3)}</div>
                                    <span className="open">열기 →</span>
                                </div>
                            </a>
                        ))}
                    </div>
                )}

                <div className="mono-bottom">
                    <div className="mono-mini">
                        <span className="lbl">데일리 CS 팁</span>
                        <h4>오늘의 한 줄</h4>
                        <p className="body">
                            {isTipLoading
                                ? <span className="skeleton" aria-label="loading">&nbsp;</span>
                                : (dailyTip || '오늘의 팁이 없습니다.')}
                        </p>
                    </div>
                    <div className="mono-mini">
                        <span className="lbl">잠깐 쉬어가기</span>
                        <h4>오늘의 농담</h4>
                        <p className="body">
                            {isJokeLoading ? (
                                <span className="skeleton" aria-label="loading">&nbsp;</span>
                            ) : dailyJoke ? (
                                <>
                                    {dailyJoke.translatedSetup}
                                    <br />
                                    <span style={{ opacity: 0.78 }}>— {dailyJoke.translatedPunchline}</span>
                                </>
                            ) : '농담을 불러오지 못했습니다.'}
                        </p>
                    </div>
                </div>

                <footer className="mono-foot">
                    <span>© {new Date().getFullYear()} hoooon22 · devzip.cloud</span>
                    <div className="links">
                        <a href="https://github.com/Hoooon22" target="_blank" rel="noopener noreferrer">GitHub</a>
                        <a href="/Guestbook">방명록</a>
                        <a href="#">개인정보</a>
                    </div>
                </footer>
            </div>

            <Footer />
        </div>
    );
};

export default Main;
