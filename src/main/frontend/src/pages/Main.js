import React, { useState } from 'react';
import projects from '../data/projects';
import Pagination from '../components/Pagination';
import ProjectBox from '../components/ProjectBox'; // ProjectBox 컴포넌트 임포트
import Footer from '../components/Footer'; // Footer 컴포넌트 임포트
import UserStatus from '../components/auth/UserStatus'; // UserStatus 컴포넌트 임포트
import { Link } from 'react-router-dom'; // Import Link
import "../assets/css/Main.scss";

const Main = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [projectsPerPage] = useState(6);

    // 현재 페이지에 표시할 프로젝트 계산
    // Sort projects by startDate in descending order
    const sortedProjects = [...projects].sort((a, b) => {
        // Pinned projects first
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;

        // Admin projects second
        if (a.requiresAdmin && !b.requiresAdmin) return -1;
        if (!a.requiresAdmin && b.requiresAdmin) return 1;

        // Then sort by date
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return new Date(b.startDate) - new Date(a.startDate);
    });

    // 현재 페이지에 표시할 프로젝트 계산
    const indexOfLastProject = currentPage * projectsPerPage;
    const indexOfFirstProject = indexOfLastProject - projectsPerPage;
    const currentProjects = sortedProjects.slice(indexOfFirstProject, indexOfLastProject);

    // 페이지 변경
    const paginate = pageNumber => setCurrentPage(pageNumber);

    return (
        <div className="container">
            <h1>Hoooon22&apos;s DevZip</h1>
            
            {/* 사용자 인증 상태 */}
            <UserStatus />
            
            {/* Live Chat Link */}
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <Link to="/livechat" style={{ fontSize: '1.2em', color: '#007bff', textDecoration: 'none' }}>
                    Go to Live Chat
                </Link>
            </div>

            <ul className="project-list">
                {currentProjects.map(project => (
                    <li key={project.id} className="project-item">
                        <ProjectBox project={project} />
                    </li>
                ))}
            </ul>
            <Pagination
                projectsPerPage={projectsPerPage}
                totalProjects={sortedProjects.length}
                paginate={paginate}
            />
            <Footer />
        </div>
    );
};

export default Main;
