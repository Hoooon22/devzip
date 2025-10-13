import React, { useState, useEffect } from 'react';
import projects from '../data/projects';
import Pagination from '../components/Pagination';
import ProjectBox from '../components/ProjectBox'; // ProjectBox 컴포넌트 임포트
import Footer from '../components/Footer'; // Footer 컴포넌트 임포트
import UserStatus from '../components/auth/UserStatus'; // UserStatus 컴포넌트 임포트
import ViewModeToggle from '../components/ViewModeToggle'; // ViewModeToggle 컴포넌트 임포트
import { Link } from 'react-router-dom'; // Import Link
import "../assets/css/Main.scss";

const Main = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [projectsPerPage] = useState(6);
    const [isProductionMode, setIsProductionMode] = useState(true); // 기본값: 실서비스 모드

    // 테마 전환 효과
    useEffect(() => {
        const container = document.querySelector('.container');
        if (container) {
            if (isProductionMode) {
                container.classList.remove('experimental-mode');
                container.classList.add('production-mode');
            } else {
                container.classList.remove('production-mode');
                container.classList.add('experimental-mode');
            }
        }
    }, [isProductionMode]);

    // 모드 전환 핸들러
    const handleModeToggle = () => {
        setIsProductionMode(prev => !prev);
        setCurrentPage(1); // 페이지를 1로 리셋
    };

    // 현재 모드에 맞는 프로젝트 필터링
    const filteredProjects = projects.filter(project =>
        project.isProduction === isProductionMode
    );

    // Sort filtered projects by startDate in descending order
    const sortedProjects = [...filteredProjects].sort((a, b) => {
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
        <div className="container production-mode">
            <h1>Hoooon22&apos;s DevZip</h1>

            {/* 사용자 인증 상태 */}
            <UserStatus />

            {/* 모드 전환 버튼 */}
            <ViewModeToggle
                isProductionMode={isProductionMode}
                onToggle={handleModeToggle}
            />

            {/* 프로젝트가 없을 때 메시지 표시 */}
            {sortedProjects.length === 0 ? (
                <div className="empty-projects">
                    <p>🚧 {isProductionMode ? '실서비스' : '실험용'} 프로젝트가 아직 없습니다.</p>
                    <p>곧 추가될 예정이니 기대해주세요!</p>
                </div>
            ) : (
                <>
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
                </>
            )}
            <Footer />
        </div>
    );
};

export default Main;
