import React, { useState, useEffect } from 'react';
import projects from '../data/projects';
import Pagination from '../components/Pagination';
import ProjectBox from '../components/ProjectBox'; // ProjectBox 컴포넌트 임포트
import Footer from '../components/Footer'; // Footer 컴포넌트 임포트
import UserStatus from '../components/auth/UserStatus'; // UserStatus 컴포넌트 임포트
import ViewModeToggle from '../components/ViewModeToggle'; // ViewModeToggle 컴포넌트 임포트
import DailyTip from '../components/cs-tip/DailyTip'; // DailyTip 컴포넌트 임포트
import csTipService from '../services/csTipService'; // CS Tip Service 임포트
import { Link } from 'react-router-dom'; // Import Link
import "../assets/css/Main.scss";

const Main = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [projectsPerPage] = useState(6);
    const [isProductionMode, setIsProductionMode] = useState(true); // 기본값: 실서비스 모드
    const [dailyTip, setDailyTip] = useState('');
    const [isTipLoading, setIsTipLoading] = useState(true); // 로딩 상태 추가

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

    // 페이지 로드 시 production 프로젝트 확인 및 자동 모드 전환
    useEffect(() => {
        const productionProjects = projects.filter(project => project.isProduction === true);
        if (productionProjects.length === 0) {
            setIsProductionMode(false); // production이 없으면 experiment 모드로 전환
        }
    }, []);

    // 일일 CS 팁 가져오기 (Hopperbox 패턴 적용)
    useEffect(() => {
        const fetchDailyTip = async () => {
            setIsTipLoading(true);
            try {
                const response = await csTipService.getDailyTip();
                // 백엔드에서 ResponseEntity<String>으로 반환하므로 response.data가 직접 문자열
                setDailyTip(response.data || '');
            } catch (error) {
                console.error('Failed to load daily tip:', error);
                setDailyTip('팁을 불러오는 중 오류가 발생했습니다. 😥');
            } finally {
                setIsTipLoading(false);
            }
        };

        fetchDailyTip();
    }, []); // 페이지 로드 시 한 번만 실행

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

            {/* 상단 정보 영역: CS 팁(왼쪽) + 로그인(오른쪽) */}
            <div className="top-info-section">
                {/* 일일 CS 팁 */}
                <div className="tip-section">
                    <DailyTip tip={dailyTip} isLoading={isTipLoading} />
                </div>

                {/* 사용자 인증 상태 */}
                <div className="auth-section">
                    <UserStatus />
                </div>
            </div>

            {/* 모드 전환 버튼 */}
            <ViewModeToggle
                isProductionMode={isProductionMode}
                onToggle={handleModeToggle}
            />

            {/* 프로젝트가 없을 때 메시지 표시 */}
            {sortedProjects.length === 0 ? (
                <div className="empty-projects">
                    <p>🚧 {isProductionMode ? '현재 서비스 중인' : '현재 실험'} 프로젝트가 없습니다.</p>
                    <p>곧 추가될 예정입니다!</p>
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
