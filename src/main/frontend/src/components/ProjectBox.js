import React, { useState } from 'react';
import PropTypes from 'prop-types';
import "../assets/css/ProjectBox.scss";
import { FaCalendarAlt, FaLink, FaInfoCircle, FaTags, FaLock } from 'react-icons/fa';
import authService from '../services/AuthService';

const ProjectBox = ({ project }) => {
    const { 
        name, 
        description, 
        link, 
        active, 
        startDate, 
        endDate, 
        category = '프로젝트', // 기본값 설정
        techStack = [], // 기본값 설정
        status = active ? '활성' : '비활성', // 기본값 설정
        requiresAdmin = false // 관리자 권한 필요 여부
    } = project;
    
    const [isHovered, setIsHovered] = useState(false);

    const handleClick = (e) => {
        // 관리자 권한이 필요한 프로젝트인 경우 권한 확인
        if (requiresAdmin && !authService.isAdmin()) {
            e.preventDefault();
            alert('이 프로젝트에 접근하려면 관리자 권한이 필요합니다.');
            return;
        }
        
        // 외부 링크인 경우에만 새 탭에서 열기
        if (link.startsWith('http://') || link.startsWith('https://')) {
            e.preventDefault();
            window.open(link, '_blank');
        }
        // 내부 링크인 경우 기본 링크 동작(같은 탭에서 이동) 허용
    };

    // startDate와 endDate를 표시하는 함수
    const getProjectDates = () => {
        if (startDate && endDate) {
            return `${startDate} ~ ${endDate}`;
        } else if (startDate) {
            return `${startDate} ~ 진행 중`;
        } else {
            return `계획 중`;
        }
    };
    
    // 프로젝트 상태에 따른 클래스 이름 결정
    const getStatusClass = () => {
        if (!active) return 'inactive';
        if (status.includes('완료')) return 'completed';
        if (status.includes('진행')) return 'in-progress';
        if (status.includes('계획')) return 'planned';
        return '';
    };
    
    // 프로젝트 상태 배지 표시
    const renderStatusBadge = () => (
        <div className={`status-badge ${getStatusClass()}`} aria-label={`프로젝트 상태: ${status}`}>
            {status}
        </div>
    );
    
    // 기술 스택 태그 표시
    const renderTechStack = () => {
        if (!techStack || techStack.length === 0) return null;
        
        return (
            <div className="tech-stack" aria-label="사용 기술 스택">
                <FaTags className="tech-icon" aria-hidden="true" />
                <div className="tech-tags">
                    {techStack.slice(0, 3).map((tech) => (
                        <span key={`tech-${tech}`} className="tech-tag">{tech}</span>
                    ))}
                    {techStack.length > 3 && <span className="tech-tag more">+{techStack.length - 3}</span>}
                </div>
            </div>
        );
    };

    return (
        <a 
            href={link} 
            className={`project-box ${getStatusClass()}`} 
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            aria-label={`${name} 프로젝트: ${description}`}
        >
            {/* 카테고리 표시 */}
            <div className="project-category">
                {requiresAdmin && <FaLock className="admin-lock-icon" aria-hidden="true" />}
                <span>{category}</span>
            </div>
            
            {/* 상태 배지 */}
            {renderStatusBadge()}
            
            {/* 프로젝트 제목 */}
            <h2 className={`project-title ${active ? '' : 'inactive-title'}`}>
                {name}
            </h2>
            
            {/* 프로젝트 설명 */}
            <p className="project-description">{description}</p>
            
            {/* 기술 스택 */}
            {renderTechStack()}
            
            {/* 프로젝트 정보 영역 */}
            <div className="project-info">
                {/* 프로젝트 링크 */}
                <div className="info-item project-link">
                    <FaLink className="info-icon" aria-hidden="true" />
                    <span className="project-address">{link}</span>
                </div>
                
                {/* 프로젝트 기간 */}
                <div className="info-item">
                    <FaCalendarAlt className="info-icon" aria-hidden="true" />
                    <span className="project-duration">{getProjectDates()}</span>
                </div>
            </div>
            
            {/* 호버 시 표시되는 상세 정보 */}
            <div className={`project-details ${isHovered ? 'visible' : ''}`}>
                <div className="details-content">
                    <FaInfoCircle className="details-icon" aria-hidden="true" />
                    <span>클릭하여 프로젝트 페이지로 이동</span>
                </div>
            </div>
        </a>
    );
};

ProjectBox.propTypes = {
    project: PropTypes.shape({
        name: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        link: PropTypes.string.isRequired,
        active: PropTypes.bool.isRequired,
        startDate: PropTypes.string,
        endDate: PropTypes.string,
        category: PropTypes.string,
        techStack: PropTypes.arrayOf(PropTypes.string),
        status: PropTypes.string,
        requiresAdmin: PropTypes.bool
    }).isRequired,
};

export default ProjectBox;