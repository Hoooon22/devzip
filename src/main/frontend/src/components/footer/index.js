import React from 'react';
import blogImage from '../../assets/imgs/blog_logo.png';
import githubImage from '../../assets/imgs/GitHub_Logo.png';
import gmailImage from '../../assets/imgs/gmail_logo.png';
import { styles } from './styles';

const Footer = () => {
  return (
    <footer className="footer" style={styles.footer}>
      <div className="footer-content" style={styles.footerContent}>
        <a 
          href="https://hoooon22.github.io/" 
          className="footer-link"
          style={styles.footerLink}
          aria-label="GitHub 블로그로 이동"
          role="link"
        >
          <img 
            src={blogImage} 
            alt="GitHub Blog" 
            className="footer-icon" 
            style={styles.iconStyle} 
          />
        </a>
        <a 
          href="https://github.com/Hoooon22" 
          className="footer-link"
          style={styles.footerLink}
          aria-label="GitHub 프로필로 이동"
          role="link"
        >
          <img 
            src={githubImage} 
            alt="GitHub" 
            className="footer-icon" 
            style={styles.iconStyle} 
          />
        </a>
        <a 
          href="mailto:momo990305@gmail.com" 
          className="footer-link"
          style={styles.footerLink}
          aria-label="이메일 보내기"
          role="link"
        >
          <img 
            src={gmailImage} 
            alt="Gmail" 
            className="footer-icon" 
            style={styles.iconStyle} 
          />
        </a>
      </div>
    </footer>
  );
};

export default Footer;