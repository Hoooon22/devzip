import React, { useState, useEffect } from 'react';
import projects from '../../data/projects';
import Pagination from '../../components/pagination';
import ProjectBox from '../../components/project-box';
import Footer from '../../components/footer';
import { styles } from './styles';

const Main = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [projectsPerPage, setProjectsPerPage] = useState(6);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // 반응형으로 프로젝트 표시 개수 조정
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      
      if (window.innerWidth >= 1440) {
        setProjectsPerPage(9);
      } else if (window.innerWidth >= 1024) {
        setProjectsPerPage(6);
      } else if (window.innerWidth >= 768) {
        setProjectsPerPage(4);
      } else {
        setProjectsPerPage(3);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // 초기 로드 시 실행
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 현재 페이지에 표시할 프로젝트 계산
  const indexOfLastProject = currentPage * projectsPerPage;
  const indexOfFirstProject = indexOfLastProject - projectsPerPage;
  const currentProjects = projects.slice(indexOfFirstProject, indexOfLastProject);

  // 페이지 변경 핸들러
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // 페이지 변경 시 페이지 상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // 접근성을 위한 페이지 변경 알림
    document.getElementById('page-change-announcement').textContent = 
      `페이지 ${pageNumber}로 이동되었습니다.`;
  };

  return (
    <div style={styles.container}>
      {/* 접근성을 위한 스크린 리더용 알림 */}
      <div 
        id="page-change-announcement" 
        aria-live="polite" 
        className="sr-only"
        style={styles.srOnly}
      ></div>
      
      <h1 style={styles.title}>Hoooon22&apos;s DevZip</h1>
      
      <ul style={styles.projectList} aria-label="프로젝트 목록">
        {currentProjects.map(project => (
          <li key={project.id} style={styles.projectItem}>
            <ProjectBox project={project} />
          </li>
        ))}
      </ul>
      
      <Pagination
        projectsPerPage={projectsPerPage}
        totalProjects={projects.length}
        paginate={handlePageChange}
        currentPage={currentPage}
      />
      
      <Footer />
    </div>
  );
};

export default Main;