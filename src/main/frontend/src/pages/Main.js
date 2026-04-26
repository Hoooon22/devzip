import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import projects from '../data/projects';
import Footer from '../components/Footer';
import UserStatus from '../components/auth/UserStatus';
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

const TODAY_ISO = new Date().toISOString().slice(0, 10);

// Calculate hero stats for the two stat cards.
// Returns:
//   {
//     production: { active: number, total: number, names: string[] },
//     experiments: { total: number, running: number, archived: number },
//   }
//
// "Active" production = isProduction && active !== false.
// "Archived" experiment = !isProduction && (active === false || endDate truthy).
// "Running" experiment = !isProduction && not archived.
const buildHeroStats = (allProjects) => {
    // TODO(human): implement the reducer that walks `allProjects` once and returns
    // the shape above. See VariantMono in the design — the Production stat shows
    // "02 / 02 · Command Stack · Conflux" and the Lab stat shows total + a "11 running, 2 archived" sub line.
    return {
        production: { active: 0, total: 0, names: [] },
        experiments: { total: 0, running: 0, archived: 0 },
    };
};

const Main = () => {
    const [mode, setMode] = useState('production'); // 'production' | 'experiment'
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
                const response = await csTipService.getDailyTip();
                if (!cancelled) setDailyTip(response.data || '');
            } catch (err) {
                if (!cancelled) setDailyTip('팁을 불러오는 중 오류가 발생했습니다. 😥');
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
                const response = await csTipService.getDailyJoke();
                if (!cancelled) setDailyJoke(response.data || null);
            } catch (err) {
                if (!cancelled) setDailyJoke(null);
            } finally {
                if (!cancelled) setIsJokeLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const heroStats = useMemo(() => buildHeroStats(projects), []);

    const filtered = useMemo(() => {
        const matches = projects.filter(p =>
            mode === 'production' ? p.isProduction : !p.isProduction
        );
        return [...matches].sort((a, b) => {
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

    const renderTechStack = (project) => {
        const stack = project.techStack || project.tech || [];
        if (stack.length === 0) {
            const fallback = project.category?.split('/').filter(Boolean).slice(0, 2) || [];
            return fallback.map(tag => <span key={`cat-${tag}`}>{tag}</span>);
        }
        return stack.slice(0, 2).map(tag => <span key={`tech-${tag}`}>{tag}</span>);
    };

    return (
        <div
            className="mono-root"
            data-theme={dark ? 'dark' : 'light'}
        >
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
                <div className="mono-bar">
                    <div className="lhs">
                        <span className="dot" aria-hidden="true"></span>
                        <span className="path">~ / devzip / index</span>
                    </div>
                    <div className="meta">
                        last build: {TODAY_ISO} · {projects.length} projects · v3.2
                    </div>
                </div>

                <div className="mono-hero">
                    <div className="mono-headline">
                        <p className="pre">{'// developer side project hub'}</p>
                        <h1>한 사람이 만드는 <span className="mark">제품</span>의 모든 단계.</h1>
                        <p>기획부터 운영까지 — 운영 중인 서비스와 실험실의 프로토타입을 한 곳에서 인덱싱합니다. 모드를 전환해 두 세계를 넘나드세요.</p>
                    </div>
                    <div className="mono-stat-stack">
                        <div className="mono-stat">
                            <span className="lbl">Active Production</span>
                            <div className="big">
                                <span className="acc">
                                    {String(heroStats.production.active).padStart(2, '0')}
                                </span>
                                {' / '}
                                {String(heroStats.production.total).padStart(2, '0')}
                            </div>
                            <span className="sub">
                                {heroStats.production.names.join(' · ') || '—'}
                            </span>
                        </div>
                        <div className="mono-stat invert">
                            <span className="lbl">Lab Experiments</span>
                            <div className="big">{heroStats.experiments.total}</div>
                            <span className="sub">
                                {heroStats.experiments.running} running, {heroStats.experiments.archived} archived
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mono-toolbar">
                    <span className="crumb">
                        $ ls projects/ --filter={mode} --view={layout}
                    </span>
                    <div className="right">
                        <div className="lay">
                            <button
                                className={layout === 'table' ? 'on' : ''}
                                onClick={() => setLayout('table')}
                            >[table]</button>
                            <button
                                className={layout === 'cards' ? 'on' : ''}
                                onClick={() => setLayout('cards')}
                            >[cards]</button>
                        </div>
                        <div className="seg">
                            <button
                                className={mode === 'production' ? 'on' : ''}
                                onClick={() => setMode('production')}
                            >production</button>
                            <button
                                className={mode === 'experiment' ? 'on' : ''}
                                onClick={() => setMode('experiment')}
                            >experiment</button>
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
                        🚧 {mode === 'production' ? '운영 중인' : '실험 중인'} 프로젝트가 없습니다.
                    </div>
                ) : layout === 'table' ? (
                    <div className="mono-table">
                        <div className="mono-row head">
                            <div>#</div>
                            <div></div>
                            <div>Name</div>
                            <div>Description</div>
                            <div>Stack</div>
                            <div>Started</div>
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
                                <div className="stack">{renderTechStack(p)}</div>
                                <div className="date">{p.startDate || '—'}</div>
                                <div className="arrow">→</div>
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="mono-cardgrid">
                        {filtered.map((p, i) => (
                            <a
                                key={p.id}
                                href={p.link}
                                className="mono-cell"
                                onClick={(e) => handleProjectClick(e, p)}
                                aria-label={`${p.name} — ${p.description}`}
                            >
                                <div className="top">
                                    <span className="num">№ {String(i + 1).padStart(2, '0')}</span>
                                    <span className="cat">{p.category || '—'}</span>
                                </div>
                                <div className="glyph">{p.thumbnail || '📦'}</div>
                                <h3 className="name">{p.name}</h3>
                                <p className="desc">{p.description}</p>
                                <div className="foot">
                                    <div className="stack">{renderTechStack(p)}</div>
                                    <span className="arrow">→</span>
                                </div>
                            </a>
                        ))}
                    </div>
                )}

                <div className="mono-bottom">
                    <div className="mono-mini">
                        <div className="lbl">[daily/cs-tip]</div>
                        <div className="body">
                            {isTipLoading
                                ? <span className="skeleton" aria-label="loading">&nbsp;</span>
                                : (dailyTip || '오늘의 팁이 없습니다.')}
                        </div>
                    </div>
                    <div className="mono-mini">
                        <div className="lbl">[break/joke]</div>
                        <div className="body">
                            {isJokeLoading ? (
                                <span className="skeleton" aria-label="loading">&nbsp;</span>
                            ) : dailyJoke ? (
                                <>
                                    <div>{dailyJoke.translatedSetup}</div>
                                    <div style={{ marginTop: 8, opacity: 0.75 }}>
                                        — {dailyJoke.translatedPunchline}
                                    </div>
                                </>
                            ) : '농담을 불러오지 못했습니다.'}
                        </div>
                    </div>
                </div>

                <div className="mono-account">
                    <span className="label">[ account ]</span>
                    <UserStatus />
                </div>

                <div className="mono-foot">
                    <span>© {new Date().getFullYear()} hoooon22</span>
                    <span>devzip.cloud</span>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default Main;
