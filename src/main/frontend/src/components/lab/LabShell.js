import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import './LabShell.css';

// 실험 상세 페이지 공용 셸. 메인(.k-os)의 커널/터미널 OS 톤을 그대로 미러링해
// 세부 페이지가 상단바·타이틀 창·상태바·다크 토글·창 크롬을 공유하도록 한다.
// 페이지는 children 으로 본문(시뮬레이터 등)만 넘기고, 셸이 제공하는 토큰·프리미티브를 소비한다.

// 다크 설정은 메인과 같은 키를 공유해 사이트 전체에서 테마가 일관되게 유지된다.
const DARK_KEY = 'devzip.kernel.dark';

const readDark = () => {
    if (typeof window === 'undefined') return false;
    try {
        const raw = window.localStorage.getItem(DARK_KEY);
        return raw === null ? false : JSON.parse(raw);
    } catch {
        return false;
    }
};

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
    const [dark, setDark] = useState(readDark);
    const time = useClock();

    useEffect(() => {
        try { window.localStorage.setItem(DARK_KEY, JSON.stringify(dark)); } catch { /* noop */ }
    }, [dark]);

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
                    <button type="button" className="k-theme k-mono" onClick={() => setDark((d) => !d)} aria-label="테마 전환">
                        {dark ? '☀ light' : '☾ dark'}
                    </button>
                </div>
            </header>

            <main className="lab-main">
                <section className="k-win lab-hero" aria-label={title}>
                    <div className="k-win-bar">
                        <div className="k-dots"><i></i><i></i><i></i></div>
                        <span className="path k-mono"><span className="dir">~/lab/</span>{path}</span>
                        <span className="meta k-mono">read-only · {time}</span>
                    </div>
                    <div className="lab-hero-bd">
                        {eyebrow && <span className="k-eyebrow"><span className="sq"></span>{eyebrow}</span>}
                        <h1>{title}</h1>
                        {subtitle && <p className="lab-sub">{subtitle}</p>}
                    </div>
                    <div className="k-resize"></div>
                </section>

                {children}

                <footer className="lab-foot">
                    <span className="sys"><span className="sq"></span>experiment mounted</span>
                    <span>© {new Date().getFullYear()} hoooon22 · devzip.cloud</span>
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
