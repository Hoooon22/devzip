import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import viewService from '../../services/viewService';
import { styles } from './styles';

const ProjectBox = ({ project, viewCount = 0 }) => {
  const { name, description, link, active, startDate, endDate } = project;

  const [count, setCount] = useState(viewCount);

  // 메인에서 조회수 맵을 비동기로 받아오므로 prop 변경 시 동기화
  useEffect(() => {
    setCount(viewCount);
  }, [viewCount]);

  const handleClick = (e) => {
    e.preventDefault(); // 기본 링크 이동 방지

    // 세션당 프로젝트별 1회만 집계 (새로고침·연타로 인한 중복 방지)
    const seenKey = `viewed:${link}`;
    if (!sessionStorage.getItem(seenKey)) {
      sessionStorage.setItem(seenKey, '1');
      setCount((prev) => prev + 1); // 낙관적 갱신
      viewService.incrementView(link);
    }

    window.open(link, '_blank', 'noopener,noreferrer'); // 새 탭에서 링크 열기 (보안 향상)
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

  const projectStatus = active ? '활성 프로젝트' : '비활성 프로젝트';
  const projectDates = getProjectDates();

  return (
    <a 
      href={link} 
      className={`project-box ${active ? 'active' : 'inactive'}`}
      onClick={handleClick}
      style={{
        ...styles.projectBox,
        ...(active ? {} : styles.inactiveBox)
      }}
      aria-label={`${name}: ${description}. ${projectStatus}. 기간: ${projectDates}`}
    >
      <h2 
        className={`project-title ${active ? '' : 'inactive-title'}`}
        style={{
          ...styles.projectTitle,
          ...(active ? {} : styles.inactiveTitle)
        }}
      >
        {name}
      </h2>
      <p 
        className="project-description"
        style={styles.projectDescription}
      >
        {description}
      </p>
      <span 
        className="project-address"
        style={styles.projectAddress}
      >
        {link}
      </span>
      <span
        className="project-duration"
        style={styles.projectDuration}
      >
        {projectDates}
      </span>
      <span
        className="project-views"
        style={styles.projectViews}
        aria-label={`조회수 ${count.toLocaleString()}회`}
      >
        <span aria-hidden="true">👁 </span>
        {count.toLocaleString()}
      </span>
      <span
        className={active ? "permission-icon" : "inactive-icon"}
        style={active ? styles.permissionIcon : styles.inactiveIcon}
        aria-hidden="true"
      />
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
    endDate: PropTypes.string
  }).isRequired,
  viewCount: PropTypes.number,
};

export default ProjectBox;