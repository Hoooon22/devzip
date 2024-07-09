import React from 'react';
import PropTypes from 'prop-types';
import "../assets/css/ProjectBox.scss";

const ProjectBox = ({ project }) => {
    const { name, description, link, active, startDate, endDate } = project;

    const handleClick = (e) => {
        e.preventDefault(); // 기본 링크 이동 방지
        window.open(link, '_blank'); // 새 탭에서 링크 열기
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

    return (
        <a href={link} className={`project-box ${active ? '' : 'inactive'}`} onClick={handleClick}>
            <h2 className={`project-title ${active ? '' : 'inactive-title'}`}>{name}</h2>
            <p className="project-description">{description}</p>
            <span className="project-address">{link}</span>
            <span className="project-duration">{getProjectDates()}</span>
            {active ? <span className="permission-icon"></span> : <span className="inactive-icon"></span>}
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
