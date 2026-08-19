import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

// 사이트 공통 상단바 — 홈·자료실·연대기·별자리 맵·방명록이 공유한다.
// 스타일은 styles/base.css 의 .s-header 계열을 사용한다.
const NAV = [
    { key: 'home', label: 'home', to: '/' },
    { key: 'library', label: 'library', to: '/library' },
    { key: 'origins', label: 'origins', to: '/lab-origins' },
    { key: 'map', label: 'map', to: '/constellation' },
    { key: 'guestbook', label: 'guestbook', to: '/Guestbook' },
];

const SiteHeader = ({ active, dark, onToggleTheme, children }) => (
    <header className="s-header">
        <Link className="s-brand" to="/">DEVZIP</Link>
        <nav className="s-nav">
            {NAV.map((n) => (
                <Link key={n.key} className={active === n.key ? 'on' : ''} to={n.to}>{n.label}</Link>
            ))}
            <a href="https://github.com/Hoooon22" target="_blank" rel="noopener noreferrer">github</a>
        </nav>
        <div className="s-tray">
            {children}
            <button type="button" className="s-theme" onClick={onToggleTheme} aria-label="테마 전환">
                {dark ? 'light' : 'dark'}
            </button>
        </div>
    </header>
);

SiteHeader.propTypes = {
    active: PropTypes.oneOf(['home', 'library', 'origins', 'map', 'guestbook']),
    dark: PropTypes.bool.isRequired,
    onToggleTheme: PropTypes.func.isRequired,
    children: PropTypes.node,
};

export default SiteHeader;
