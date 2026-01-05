import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/CommandStack.css';

const CommandStackDownload = () => {
    const navigate = useNavigate();
    const [selectedOS, setSelectedOS] = useState('macos');

    const downloads = {
        macos: {
            name: 'macOS',
            icon: '',
            version: 'v1.0.1',
            size: 'Build Required',
            requirements: 'macOS 10.15 or later',
            downloadUrl: 'https://github.com/Hoooon22/Command_Stack/releases/latest',
            instructions: [
                '1. GitHub 릴리즈 페이지에서 소스 코드를 다운로드하세요',
                '2. 프로젝트 루트에서 build.sh 스크립트를 실행하세요',
                '3. 빌드된 앱을 Applications 폴더로 이동하세요',
                '4. 앱을 실행하고 Command Stack을 시작하세요'
            ]
        },
        windows: {
            name: 'Windows',
            icon: '🪟',
            version: 'v1.0.1',
            size: 'Coming Soon',
            requirements: 'Windows 10 or later',
            downloadUrl: null,
            instructions: [
                'Windows 버전은 현재 개발 중입니다.',
                'GitHub에서 소스 코드를 다운로드하여 직접 빌드할 수 있습니다.',
                '빌드 방법은 README.md를 참고하세요.'
            ]
        },
        linux: {
            name: 'Linux',
            icon: '🐧',
            version: 'v1.0.1',
            size: 'Coming Soon',
            requirements: 'Ubuntu 20.04+ or equivalent',
            downloadUrl: null,
            instructions: [
                'Linux 버전은 현재 개발 중입니다.',
                'GitHub에서 소스 코드를 다운로드하여 직접 빌드할 수 있습니다.',
                '빌드 방법은 README.md를 참고하세요.'
            ]
        }
    };

    const currentDownload = downloads[selectedOS];

    const handleDownload = () => {
        if (currentDownload.downloadUrl) {
            window.open(currentDownload.downloadUrl, '_blank');
        }
    };

    return (
        <div className="commandstack-container">
            {/* Header */}
            <section className="download-header">
                <div className="download-header-content">
                    <button
                        onClick={() => navigate('/commandstack')}
                        className="back-button"
                    >
                        ← 소개 페이지로
                    </button>
                    <div className="download-badge">$ COMMAND_STACK</div>
                    <h1 className="download-title">Download</h1>
                    <p className="download-subtitle">
                        당신의 플랫폼에 맞는 Command Stack을 다운로드하세요
                    </p>
                </div>
            </section>

            {/* OS Selection */}
            <section className="download-selection">
                <div className="os-selector">
                    {Object.entries(downloads).map(([key, os]) => (
                        <button
                            key={key}
                            className={`os-button ${selectedOS === key ? 'active' : ''}`}
                            onClick={() => setSelectedOS(key)}
                        >
                            <span className="os-icon">{os.icon}</span>
                            <span className="os-name">{os.name}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Download Card */}
            <section className="download-card-section">
                <div className="download-card">
                    <div className="download-card-header">
                        <div className="download-info">
                            <h2 className="download-os-name">
                                <span className="os-icon-large">{currentDownload.icon}</span>
                                {currentDownload.name}
                            </h2>
                            <div className="download-meta">
                                <span className="meta-item">
                                    <strong>Version:</strong> {currentDownload.version}
                                </span>
                                <span className="meta-divider">•</span>
                                <span className="meta-item">
                                    <strong>Size:</strong> {currentDownload.size}
                                </span>
                            </div>
                            <p className="download-requirements">
                                <strong>Requirements:</strong> {currentDownload.requirements}
                            </p>
                        </div>
                        <div className="download-action">
                            {currentDownload.downloadUrl ? (
                                <button
                                    onClick={handleDownload}
                                    className="btn-download"
                                >
                                    <span className="download-icon">⬇</span>
                                    다운로드
                                </button>
                            ) : (
                                <div className="coming-soon-badge">Coming Soon</div>
                            )}
                        </div>
                    </div>

                    <div className="download-card-body">
                        <h3 className="instructions-title">설치 방법</h3>
                        <ol className="instructions-list">
                            {currentDownload.instructions.map((instruction, index) => (
                                <li key={index} className="instruction-item">
                                    {instruction}
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </section>

            {/* Build from Source */}
            <section className="build-from-source">
                <div className="build-content">
                    <h2 className="section-title">소스에서 빌드하기</h2>
                    <p className="section-description">
                        최신 버전을 직접 빌드하거나 개발에 참여하고 싶으신가요?
                    </p>

                    <div className="build-steps">
                        <div className="build-step">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h3 className="step-title">저장소 클론</h3>
                                <pre className="code-block">
                                    <code>git clone https://github.com/Hoooon22/Command_Stack.git{'\n'}cd Command_Stack</code>
                                </pre>
                            </div>
                        </div>

                        <div className="build-step">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h3 className="step-title">의존성 설치</h3>
                                <pre className="code-block">
                                    <code>npm install</code>
                                </pre>
                            </div>
                        </div>

                        <div className="build-step">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h3 className="step-title">개발 서버 실행 또는 빌드</h3>
                                <pre className="code-block">
                                    <code># 개발 모드로 실행{'\n'}npm run dev{'\n\n'}# 프로덕션 빌드{'\n'}npm run build</code>
                                </pre>
                            </div>
                        </div>
                    </div>

                    <div className="github-link">
                        <a
                            href="https://github.com/Hoooon22/Command_Stack"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-github"
                        >
                            <span className="github-icon">⭐</span>
                            GitHub에서 보기
                        </a>
                    </div>
                </div>
            </section>

            {/* System Requirements */}
            <section className="system-requirements">
                <div className="requirements-content">
                    <h2 className="section-title">시스템 요구사항</h2>
                    <div className="requirements-grid">
                        <div className="requirement-card">
                            <h3 className="requirement-title">Frontend</h3>
                            <ul className="requirement-list">
                                <li>Node.js 18 이상</li>
                                <li>npm 또는 yarn</li>
                                <li>모던 웹 브라우저 (Chrome, Firefox, Safari, Edge)</li>
                            </ul>
                        </div>
                        <div className="requirement-card">
                            <h3 className="requirement-title">Backend (Optional)</h3>
                            <ul className="requirement-list">
                                <li>Java 17 이상</li>
                                <li>Gradle 8.x</li>
                                <li>Spring Boot 3.x 호환 환경</li>
                            </ul>
                        </div>
                        <div className="requirement-card">
                            <h3 className="requirement-title">Recommended</h3>
                            <ul className="requirement-list">
                                <li>8GB RAM 이상</li>
                                <li>SSD 스토리지</li>
                                <li>1920x1080 이상 해상도</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Release Notes */}
            <section className="release-notes">
                <div className="notes-content">
                    <h2 className="section-title">Release Notes</h2>
                    <div className="release-card">
                        <div className="release-header">
                            <h3 className="release-version">v1.0.1</h3>
                            <span className="release-date">2026년 1월 5일</span>
                        </div>
                        <div className="release-body">
                            <h4 className="release-section">✨ Features</h4>
                            <ul className="release-list">
                                <li>캘린더 기반 Schedule Mode 추가</li>
                                <li>타임라인 뷰로 주/월/년 단위 추적</li>
                                <li>Context 기반 작업 조직화</li>
                                <li>터미널 시맨틱 상태 시스템</li>
                            </ul>
                            <h4 className="release-section">🎨 Improvements</h4>
                            <ul className="release-list">
                                <li>다크 테마 UI 개선</li>
                                <li>반응형 레이아웃 최적화</li>
                                <li>키보드 단축키 지원</li>
                            </ul>
                        </div>
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

export default CommandStackDownload;
