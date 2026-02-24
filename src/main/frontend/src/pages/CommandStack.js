import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import '../styles/CommandStack.css';
import calendarView from '../assets/imgs/calendar-view.png';
import timelineView from '../assets/imgs/timeline-view.png';
import createCommand from '../assets/imgs/create-command.png';
import commandDetail from '../assets/imgs/command-detail.png';

const CommandStack = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: '📅',
            title: 'Schedule Mode',
            subtitle: '일정 기반 관리',
            description: '캘린더와 타임라인 뷰로 데드라인을 시각화하고 작업을 직관적으로 관리하세요.',
            image: calendarView,
            details: [
                '월간 캘린더로 한눈에 보는 작업 현황',
                '타임라인으로 주/월/년 단위 진행 상황 추적',
                '데드라인 기반 작업 우선순위 자동화'
            ]
        },
        {
            icon: '🗂️',
            title: 'Context Mode',
            subtitle: '프로젝트별 조직화',
            description: 'Context로 작업을 그룹화하고 프로젝트별로 명령어를 체계적으로 관리하세요.',
            image: commandDetail,
            details: [
                'Dev-Project, Life-Routine 등 자유로운 컨텍스트 생성',
                '프로젝트별 작업 현황 실시간 확인',
                'PID 기반 명령어 추적 및 상태 관리'
            ]
        },
        {
            icon: '⚡',
            title: 'Terminal Semantics',
            subtitle: '개발자 친화적 인터페이스',
            description: 'OS와 터미널의 메타포를 활용한 직관적인 작업 상태 관리 시스템.',
            image: createCommand,
            details: [
                'EXECUTING, EXIT_SUCCESS, SIGKILL 등 터미널 상태 시맨틱',
                'Command Syntax로 작업을 명확하게 정의',
                'Task와 Schedule 타입으로 작업 성격 구분'
            ]
        }
    ];

    const useCases = [
        {
            title: '개발 프로젝트 관리',
            items: [
                'Sprint 단위 작업을 Command로 등록',
                'PR 리뷰, 배포 일정을 캘린더에서 확인',
                '완료된 작업은 EXIT_SUCCESS로 마킹'
            ],
            icon: '💻'
        },
        {
            title: '개인 루틴 추적',
            items: [
                '운동, 독서 등 일상 루틴을 Schedule로 등록',
                '타임라인에서 습관 형성 과정 시각화',
                '반복 작업의 진행률 한눈에 파악'
            ],
            icon: '🎯'
        },
        {
            title: '아이디어 백로그',
            items: [
                '떠오르는 아이디어를 즉시 Command로 기록',
                'Context로 카테고리화하여 체계적 관리',
                '우선순위에 따라 작업으로 전환'
            ],
            icon: '💡'
        }
    ];

    const techStack = [
        { name: 'React', version: '18', category: 'Frontend', color: '#61dafb' },
        { name: 'TypeScript', version: 'Latest', category: 'Language', color: '#3178c6' },
        { name: 'Vite', version: 'Latest', category: 'Build Tool', color: '#646cff' },
        { name: 'Tailwind CSS', version: '3.x', category: 'Styling', color: '#06b6d4' },
        { name: 'Spring Boot', version: '3.x', category: 'Backend', color: '#6db33f' },
        { name: 'Java', version: '17+', category: 'Language', color: '#007396' }
    ];

    return (
        <div className="commandstack-container">
            <Helmet>
                {/* 기본 메타 태그 - 한국어 */}
                <title>Command Stack - 개발자를 위한 터미널 기반 작업 관리 앱 | Terminal-style Task Manager</title>
                <meta name="description" content="Command Stack은 터미널과 OS의 메타포를 활용한 개발자 친화적 작업 관리 앱입니다. Command Stack is a developer-friendly task management app using terminal and OS metaphors." />
                <meta name="keywords" content="Command Stack, commandstack, 작업관리, task manager, 할일관리, todo app, 개발자도구, developer tools, 터미널, terminal, 프로젝트관리, project management, DevZip" />
                
                {/* Open Graph */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://devzip.cloud/commandstack" />
                <meta property="og:title" content="Command Stack - Terminal-style Task Manager for Developers" />
                <meta property="og:description" content="A developer-friendly personal management system using terminal metaphors. Manage your tasks as Commands, projects as Contexts." />
                <meta property="og:locale" content="ko_KR" />
                <meta property="og:locale:alternate" content="en_US" />
                
                {/* Twitter */}
                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:title" content="Command Stack - Terminal-style Task Manager" />
                <meta property="twitter:description" content="Control your life's runtime. A terminal-based task management app for developers." />
                
                {/* hrefLang */}
                <link rel="alternate" hrefLang="ko" href="https://devzip.cloud/commandstack" />
                <link rel="alternate" hrefLang="en" href="https://devzip.cloud/commandstack" />
                <link rel="alternate" hrefLang="x-default" href="https://devzip.cloud/commandstack" />
                
                {/* Canonical */}
                <link rel="canonical" href="https://devzip.cloud/commandstack" />
                
                {/* JSON-LD 구조화된 데이터 */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "SoftwareApplication",
                        "name": "Command Stack",
                        "alternateName": ["commandstack", "커맨드스택"],
                        "applicationCategory": "ProductivityApplication",
                        "operatingSystem": "macOS, Windows, Linux",
                        "description": "A developer-friendly task management app using terminal and OS metaphors. 터미널 메타포를 활용한 개발자 친화적 작업 관리 앱.",
                        "url": "https://devzip.cloud/commandstack",
                        "downloadUrl": "https://devzip.cloud/commandstack/download",
                        "softwareVersion": "1.0.13",
                        "author": {
                            "@type": "Person",
                            "name": "Hoooon22"
                        },
                        "offers": {
                            "@type": "Offer",
                            "price": "0",
                            "priceCurrency": "USD"
                        }
                    })}
                </script>
            </Helmet>

            {/* Hero Section */}
            <section className="commandstack-hero">
                <div className="hero-content">
                    <div className="hero-badge">$ COMMAND_STACK</div>
                    <h1 className="hero-title">
                        Control your life&apos;s runtime.
                    </h1>
                    <p className="hero-subtitle">
                        개발자를 위한 터미널 메타포 기반 개인 관리 시스템
                    </p>
                    <p className="hero-description">
                        작업을 Command로, 프로젝트를 Context로 관리하세요.<br />
                        OS와 터미널의 익숙한 개념으로 당신의 일상을 제어합니다.<br />
                        일정 기반 Schedule Mode와 프로젝트 중심 Context Mode를 자유롭게 전환하며 사용하세요.
                    </p>
                    <div className="hero-actions">
                        <button
                            onClick={() => navigate('/commandstack/download')}
                            className="btn-primary"
                        >
                            다운로드
                        </button>
                        <a
                            href="https://github.com/Hoooon22/Command_Stack"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary"
                        >
                            GitHub 보기
                        </a>
                    </div>
                    <div className="hero-status">
                        <span className="status-badge">v1.0.13</span>
                        <span className="status-divider">•</span>
                        <span className="status-text">macOS • Windows • Linux</span>
                        <span className="status-divider">•</span>
                        <span className="status-text">MIT License</span>
                    </div>
                </div>
            </section>

            {/* Latest Release Update */}
            <section className="commandstack-release-update">
                <div className="release-update-content">
                    <div className="release-badge">
                        <span className="release-new-tag">NEW</span>
                        <span className="release-version">v1.0.13</span>
                    </div>
                    <h3 className="release-title">🚨 시스템 안정화 핫픽스 (v1.0.13)</h3>
                    <p className="release-description">
                        Windows 환경에서의 빈 화면 표시 버그 및 백엔드 서버 로컬 실행 문제가 해결되었습니다. <br />
                        <strong style={{ color: "#ef4444" }}>※ 중요: 원활한 사용을 위해 백엔드 서버는 반드시 Java 17 이상 버전을 필요로 합니다.</strong>
                    </p>
                    <div className="release-features">
                        <code className="release-command">Windows 디스플레이 핫픽스</code>
                        <code className="release-command">로컬 서버 실행 안정화</code>
                        <code className="release-command">macOS UI 개선 (1.0.12)</code>
                    </div>
                    <a
                        href="https://github.com/Hoooon22/Command_Stack/releases"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="release-link"
                    >
                        전체 릴리즈 노트 보기 →
                    </a>
                </div>
            </section>

            {/* Problem Statement */}
            <section className="commandstack-problem">
                <div className="section-content">
                    <h2 className="section-title">당신의 작업 흐름을 제어하세요</h2>
                    <p className="section-description">
                        Command Stack은 단순한 할 일 관리 앱이 아닙니다.<br />
                        개발자가 익숙한 <strong>터미널과 OS의 개념</strong>으로<br />
                        작업을 명령어처럼, 프로젝트를 프로세스처럼 관리합니다.
                    </p>
                </div>
            </section>

            {/* Features with Images */}
            <section className="commandstack-features">
                <h2 className="section-title">Key Features</h2>
                <div className="features-showcase">
                    {features.map((feature, index) => (
                        <div key={index} className={`feature-showcase-card ${index % 2 === 1 ? 'reverse' : ''}`}>
                            <div className="feature-content">
                                <div className="feature-icon">{feature.icon}</div>
                                <h3 className="feature-title">{feature.title}</h3>
                                <p className="feature-subtitle">{feature.subtitle}</p>
                                <p className="feature-description">{feature.description}</p>
                                <ul className="feature-details">
                                    {feature.details.map((detail, idx) => (
                                        <li key={idx}>
                                            <span className="detail-bullet">▸</span>
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="feature-image">
                                <img src={feature.image} alt={feature.title} />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Timeline View Section */}
            <section className="commandstack-timeline-section">
                <div className="timeline-content">
                    <h2 className="section-title">진행 상황을 타임라인으로 추적</h2>
                    <p className="section-description">
                        주, 월, 년 단위로 작업 진행률을 시각화하고<br />
                        장기적인 목표 달성 과정을 한눈에 파악하세요.
                    </p>
                    <div className="timeline-image">
                        <img src={timelineView} alt="Timeline View" />
                    </div>
                </div>
            </section>

            {/* Use Cases */}
            <section className="commandstack-usage">
                <h2 className="section-title">Use Cases</h2>
                <div className="usage-grid">
                    {useCases.map((useCase, index) => (
                        <div key={index} className="usage-card">
                            <div className="usage-icon">{useCase.icon}</div>
                            <h3 className="usage-title">{useCase.title}</h3>
                            <ul className="usage-items">
                                {useCase.items.map((item, idx) => (
                                    <li key={idx}>
                                        <span className="usage-bullet">→</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            {/* Tech Stack */}
            <section className="commandstack-tech">
                <h2 className="section-title">Built With</h2>
                <p className="section-description">
                    최신 기술 스택으로 구축된 안정적이고 빠른 애플리케이션
                </p>
                <div className="tech-grid">
                    {techStack.map((tech, index) => (
                        <div key={index} className="tech-card">
                            <div
                                className="tech-indicator"
                                style={{ backgroundColor: tech.color }}
                            />
                            <div className="tech-info">
                                <div className="tech-category">{tech.category}</div>
                                <div className="tech-name">{tech.name}</div>
                                <div className="tech-version">{tech.version}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="commandstack-cta">
                <div className="cta-content">
                    <h2 className="cta-title">지금 바로 시작하세요</h2>
                    <p className="cta-description">
                        Command Stack은 오픈소스 프로젝트입니다.<br />
                        무료로 다운로드하고 당신만의 작업 흐름을 만들어보세요.
                    </p>
                    <div className="cta-actions">
                        <button
                            onClick={() => navigate('/commandstack/download')}
                            className="btn-primary-large"
                        >
                            다운로드 페이지로 이동
                        </button>
                    </div>
                    <div className="cta-contact">
                        <p>문의사항이 있으신가요?</p>
                        <a href="mailto:momo990305@gmail.com" className="contact-link">
                            momo990305@gmail.com
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="commandstack-footer">
                <p>Command Stack • Created by Hoooon22</p>
                <p className="footer-subtitle">MIT License • 2026</p>
            </footer>
        </div>
    );
};

export default CommandStack;
