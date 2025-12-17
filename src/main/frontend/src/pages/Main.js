import React, { useState, useEffect, useRef } from 'react';
import projects from '../data/projects';
import ProjectBox from '../components/ProjectBox'; // ProjectBox 컴포넌트 임포트
import Footer from '../components/Footer'; // Footer 컴포넌트 임포트
import UserStatus from '../components/auth/UserStatus'; // UserStatus 컴포넌트 임포트
import ViewModeToggle from '../components/ViewModeToggle'; // ViewModeToggle 컴포넌트 임포트
import DailyTip from '../components/cs-tip/DailyTip'; // DailyTip 컴포넌트 임포트
import DailyJoke from '../components/cs-tip/DailyJoke'; // DailyJoke 컴포넌트 임포트
import csTipService from '../services/csTipService'; // CS Tip Service 임포트
import "../assets/css/Main.scss";

const Main = () => {
    const [isProductionMode, setIsProductionMode] = useState(true); // 기본값: 실서비스 모드
    const [dailyTip, setDailyTip] = useState('');
    const [isTipLoading, setIsTipLoading] = useState(true); // 로딩 상태 추가
    const [dailyJoke, setDailyJoke] = useState(null);
    const [isJokeLoading, setIsJokeLoading] = useState(true); // 농담 로딩 상태
    const [showAllProjects, setShowAllProjects] = useState(false);
    const overlayRef = useRef(null);

    // 메인 페이지에 있을 때만 바디 스크롤을 잠금 (클래스로 명시적으로 관리)
    useEffect(() => {
        document.body.classList.add('main-scroll-locked');
        return () => {
            document.body.classList.remove('main-scroll-locked');
        };
    }, []);

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

    // 일일 농담 가져오기 (자정에 초기화되는 캐시된 농담)
    useEffect(() => {
        const fetchDailyJoke = async () => {
            setIsJokeLoading(true);
            try {
                const response = await csTipService.getDailyJoke();
                // 백엔드에서 ResponseEntity<TranslatedJoke>로 반환
                setDailyJoke(response.data || null);
            } catch (error) {
                console.error('Failed to load daily joke:', error);
                setDailyJoke(null);
            } finally {
                setIsJokeLoading(false);
            }
        };

        fetchDailyJoke();
    }, []); // 페이지 로드 시 한 번만 실행

    // 모드 전환 핸들러
    const handleModeToggle = () => {
        setIsProductionMode(prev => !prev);
    };
    const filteredProjects = projects
        .filter(project => project.isProduction === isProductionMode);

    const sortedProjects = [...filteredProjects].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        if (a.requiresAdmin && !b.requiresAdmin) return -1;
        if (!a.requiresAdmin && b.requiresAdmin) return 1;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return new Date(b.startDate) - new Date(a.startDate);
    });

    return (
        <div className={`page-shell ${isProductionMode ? 'mode-production' : 'mode-experiment'}`}>
            <div className="noise-layer" aria-hidden="true"></div>

            <header className="hero">
                <div className="hero__text">
                    <p className="eyebrow">Hoooon22&apos;s DevZip</p>
                    <h1>빌드하고 실험하며 기록하는 개발 랩</h1>
                    <p className="lede">
                        사이드 프로젝트와 실험적인 아이디어를 한 곳에서 모았습니다. 운영 중인 서비스와 실험실 프로젝트를 모드 전환으로 빠르게 오가며 확인하세요.
                    </p>
                    <div className="hero__actions">
                        <ViewModeToggle
                            isProductionMode={isProductionMode}
                            onToggle={handleModeToggle}
                        />
                    </div>
                    <div className="deck-window">
                        <div className="deck-window__header">
                            <div>
                                <p className="eyebrow">Project Deck</p>
                                <h3>{isProductionMode ? '운영 중인 프로젝트' : '실험 중인 프로젝트'}</h3>
                            </div>
                            <button className="view-all-btn" onClick={() => setShowAllProjects(true)}>전체 보기</button>
                        </div>
                        {sortedProjects.length === 0 ? (
                            <div className="empty-projects compact">
                                <p>🚧 {isProductionMode ? '현재 서비스 중인' : '현재 실험'} 프로젝트가 없습니다.</p>
                            </div>
                        ) : (
                            <div className="deck-window__body">
                                <div className="carousel-wrapper">
                                    <div className="carousel-track">
                                        {sortedProjects.map(project => (
                                            <div className="carousel-item" key={project.id}>
                                                <ProjectBox project={project} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="hero__panel hero__panel--stack">
                    <div className="meta-card">
                        <span className="meta-label">현재 모드</span>
                        <strong className="meta-value">{isProductionMode ? 'Production' : 'Experiment'}</strong>
                        <p className="meta-desc">
                            {isProductionMode ? '실서비스 상태의 안정된 프로젝트' : '새 기능과 디자인을 실험하는 공간'}
                        </p>
                        <div className="meta-embedded">
                            <div className="card-heading tight">
                                <span className="pill">Daily</span>
                                <p>오늘의 CS 팁</p>
                            </div>
                            <DailyTip tip={dailyTip} isLoading={isTipLoading} />
                        </div>
                        <div className="meta-embedded">
                            <div className="card-heading tight">
                                <span className="pill pill--warm">Break</span>
                                <p>오늘의 농담</p>
                            </div>
                            <DailyJoke joke={dailyJoke} isLoading={isJokeLoading} />
                        </div>
                        <div className="meta-embedded">
                            <span className="meta-label">계정</span>
                            <UserStatus />
                        </div>
                    </div>
                </div>
            </header>

            {showAllProjects && (
                <div
                    className="modal-overlay"
                    role="presentation"
                    ref={overlayRef}
                    onClick={(e) => {
                        if (overlayRef.current && e.target === overlayRef.current) {
                            setShowAllProjects(false);
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') setShowAllProjects(false);
                    }}
                    tabIndex={-1}
                >
                    <div
                        className="modal"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="modal-header">
                            <div>
                                <p className="eyebrow">Project Deck</p>
                                <h3>{isProductionMode ? '전체 운영 프로젝트' : '전체 실험 프로젝트'}</h3>
                            </div>
                            <button className="close-btn" onClick={() => setShowAllProjects(false)}>닫기</button>
                        </div>
                        <ul className="project-grid">
                            {sortedProjects.map(project => (
                                <li key={`grid-${project.id}`} className="project-item">
                                    <ProjectBox project={project} />
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
};

export default Main;
