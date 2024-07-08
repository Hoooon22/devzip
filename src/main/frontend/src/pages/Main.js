import React, { useState } from 'react';
import projects from '../data/projects';
import Pagination from '../components/Pagination';
import "../assets/css/Main.scss";

const Main = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [projectsPerPage] = useState(3);

    // 현재 페이지에 표시할 프로젝트 계산
    const indexOfLastProject = currentPage * projectsPerPage;
    const indexOfFirstProject = indexOfLastProject - projectsPerPage;
    const currentProjects = projects.slice(indexOfFirstProject, indexOfLastProject);

    // 페이지 변경
    const paginate = pageNumber => setCurrentPage(pageNumber);

    return (
        <div className="container">
            <h1>My Projects</h1>
            <ul className="project-list">
                {currentProjects.map(project => (
                    <li key={project.id} className="project-item">
                        <h2>{project.name}</h2>
                        <p>{project.description}</p>
                    </li>
                ))}
            </ul>
            <Pagination
                projectsPerPage={projectsPerPage}
                totalProjects={projects.length}
                paginate={paginate}
            />
        </div>
    );
};

export default Main;
