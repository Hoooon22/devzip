import React from 'react';
import PropTypes from 'prop-types';
import "../assets/css/ProjectBox.scss";

const ProjectBox = ({ project }) => {
    const { name, description, link, active } = project;

    const handleClick = (e) => {
        e.preventDefault(); // 기본 링크 이동 방지
        window.open(link, '_blank'); // 새 탭에서 링크 열기
    };

    return (
        <a href={link} className={`project-box ${active ? '' : 'inactive'}`} onClick={handleClick}>
            <h2 className={`project-title ${active ? '' : 'inactive-title'}`}>{name}</h2>
            <p className="project-description">{description}</p>
        </a>
    );
};

ProjectBox.propTypes = {
    project: PropTypes.shape({
        name: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        link: PropTypes.string.isRequired,
        active: PropTypes.bool.isRequired,
    }).isRequired,
};

export default ProjectBox;
