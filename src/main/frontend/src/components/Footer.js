import React from 'react';

// 사이트 공통 하단 푸터 — 스타일은 styles/base.css 의 .s-footer.
const Footer = () => (
    <footer className="s-footer">
        <span className="k-mono">© {new Date().getFullYear()} hoooon22 · devzip.site</span>
        <nav>
            <a href="https://hoooon22.github.io/" target="_blank" rel="noopener noreferrer">Blog</a>
            <a href="https://github.com/Hoooon22" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="mailto:momo990305@gmail.com">Email</a>
        </nav>
    </footer>
);

export default Footer;
