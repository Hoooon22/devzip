import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import useSiteTheme from '../../hooks/useSiteTheme';
import './LabShell.css';

// 실험 상세 페이지 공용 셸 — 흑백 미니멀 톤.
// 세부 페이지가 상단바·타이틀·하단·다크 토글을 공유하도록 한다.
// 페이지는 children 으로 본문(시뮬레이터 등)만 넘기고, 셸이 제공하는 토큰·프리미티브를 소비한다.

const useClock = () => {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
};

const LabShell = ({ title, subtitle, eyebrow, path = 'experiment', children }) => {
    const [dark, toggleDark] = useSiteTheme();
    const time = useClock();

    return (
        <div className="lab-os" data-theme={dark ? 'dark' : 'light'}>
            <header className="lab-bar">
                <div className="k-brand">
                    <span className="dia">◆</span>
                    <span className="nm">DEVZIP</span>
                    <span className="ver k-mono">{'/ lab'}</span>
                </div>
                <nav className="lab-nav">
                    <Link to="/">← home</Link>
                    <span className="lab-path k-mono"><span className="dir">~/lab/</span>{path}</span>
                </nav>
                <div className="lab-tray">
                    <span className="lab-clock k-mono">{time}</span>
                    <button type="button" className="k-theme k-mono" onClick={toggleDark} aria-label="테마 전환">
                        {dark ? '☀ light' : '☾ dark'}
                    </button>
                </div>
            </header>

            <main className="lab-main">
                <section className="k-win lab-hero" aria-label={title}>
                    <div className="k-win-bar">
                        <span className="path k-mono"><span className="dir">~/lab/</span>{path}</span>
                        <span className="meta k-mono">read-only · {time}</span>
                    </div>
                    <div className="lab-hero-bd">
                        {eyebrow && <span className="k-eyebrow">{eyebrow}</span>}
                        <h1>{title}</h1>
                        {subtitle && <p className="lab-sub">{subtitle}</p>}
                    </div>
                </section>

                {children}

                <footer className="lab-foot">
                    <span className="sys">experiment mounted</span>
                    <span>© {new Date().getFullYear()} hoooon22 · devzip.site</span>
                    <div className="links">
                        <Link to="/">홈으로</Link>
                        <a href="https://github.com/Hoooon22" target="_blank" rel="noopener noreferrer">GitHub</a>
                    </div>
                </footer>
            </main>
        </div>
    );
};

LabShell.propTypes = {
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    eyebrow: PropTypes.string,
    path: PropTypes.string,
    children: PropTypes.node,
};

export default LabShell;
