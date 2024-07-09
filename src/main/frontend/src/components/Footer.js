import React from 'react';
import blogImage from '../assets/imgs/blog_logo.png';
import githubImage from '../assets/imgs/GitHub_Logo.png';
import gmailImage from '../assets/imgs/gmail_logo.png';
import "../assets/css/Footer.scss"; // SCSS 파일 임포트

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                <a href="https://hoooon22.github.io/" className="footer-link">
                    <img src={blogImage} alt="GitHub Blog" className="footer-icon" style={iconStyle} />
                </a>
                <a href="https://github.com/Hoooon22" className="footer-link">
                    <img src={githubImage} alt="GitHub" className="footer-icon" style={iconStyle} />
                </a>
                <a href="mailto:momo990305@gmail.com" className="footer-link">
                    <img src={gmailImage} alt="Gmail" className="footer-icon" style={iconStyle} />
                </a>
            </div>
        </footer>
    );
};

const iconStyle = {
    width: '30px', // 아이콘 너비 조정
    height: '30px', // 높이 자동 설정하여 비율 유지
    margin: '0 10px', // 아이콘 간격 조정
    border: '1px solid #ddd', // 테두리 추가
    borderRadius: '50%', // 원형 모양
    padding: '5px', // 내부 여백 추가
};

export default Footer;
