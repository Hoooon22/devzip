import React, { useState } from 'react';
import blogImage from '../assets/imgs/blog_logo.png';
import githubImage from '../assets/imgs/GitHub_Logo.png';
import gmailImage from '../assets/imgs/gmail_logo.png';
import "../assets/css/Footer.scss"; // SCSS 파일 임포트

const Footer = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <footer
            className={`footer ${isExpanded ? 'expanded' : ''}`}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            <div className="footer-content">
                <a
                    href="https://hoooon22.github.io/"
                    className="footer-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Blog"
                >
                    <img src={blogImage} alt="GitHub Blog" className="footer-icon" />
                    <span className="link-text">Blog</span>
                </a>
                <a
                    href="https://github.com/Hoooon22"
                    className="footer-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="GitHub"
                >
                    <img src={githubImage} alt="GitHub" className="footer-icon" />
                    <span className="link-text">GitHub</span>
                </a>
                <a
                    href="mailto:momo990305@gmail.com"
                    className="footer-link"
                    title="Email"
                >
                    <img src={gmailImage} alt="Gmail" className="footer-icon" />
                    <span className="link-text">Email</span>
                </a>
            </div>
        </footer>
    );
};

export default Footer;
