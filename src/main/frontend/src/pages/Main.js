import React, { useState } from 'react';
import projects from '../data/projects';
import Pagination from '../components/Pagination';
import ProjectBox from '../components/ProjectBox'; // ProjectBox 컴포넌트 임포트
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
            <h1>Hoooon22's DevZip</h1>
            <ul className="project-list">
                {currentProjects.map(project => (
                    <li key={project.id} className="project-item">
                        <ProjectBox project={project} />
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
