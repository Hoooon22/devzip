// ProjectBox.js

import React from 'react';

const ProjectBox = ({ project }) => {
    const { id, name, description, link } = project;

    const handleClick = () => {
        window.open(link, '_blank'); // 새 탭에서 링크 열기
        // 현재 탭에서 열기: window.location.href = link;
    };

    return (
        <a href="#" className="project-box" onClick={handleClick}>
            <h2>{name}</h2>
            <p>{description}</p>
        </a>
    );
};

export default ProjectBox;
