import React from 'react';
import PropTypes from 'prop-types';
import { styles } from './styles';

const ProjectBox = ({ project }) => {
  const { name, description, link, active, startDate, endDate } = project;

  const handleClick = (e) => {
    e.preventDefault(); // 기본 링크 이동 방지
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
};

export default ProjectBox;