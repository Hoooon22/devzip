import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/CommandStack.css';

const CommandStackDownload = () => {
    const navigate = useNavigate();
    const [selectedOS, setSelectedOS] = useState('macos');
    const [selectedMacArch, setSelectedMacArch] = useState('arm64'); // 'arm64' or 'intel'

    const downloads = {
        macos: {
            name: 'macOS',
            icon: '',
            version: 'v1.0.2',
            requirements: 'macOS 10.15 or later',
            architectures: {
                arm64: {
                    name: 'Apple Silicon (M1/M2/M3)',
                    size: '~85 MB',
                    downloadUrl: 'https://github.com/Hoooon22/Command_Stack/releases/download/v1.0.2/CommandStack-1.0.2-arm64.dmg',
                    fileName: 'CommandStack-1.0.2-arm64.dmg'
                },
                intel: {
                    name: 'Intel Processor',
                    size: '~88 MB',
                    downloadUrl: 'https://github.com/Hoooon22/Command_Stack/releases/download/v1.0.2/CommandStack-1.0.2.dmg',
                    fileName: 'CommandStack-1.0.2.dmg'
                }
            },
            instructions: [
                '1. 다운로드한 DMG 파일을 열어주세요',
                '2. Command Stack 아이콘을 Applications 폴더로 드래그하세요',
                '3. Applications 폴더에서 Command Stack을 실행하세요',
                '4. 보안 설정에서 "확인 없이 열기"를 선택해야 할 수 있습니다'
            ]
        },
        windows: {
            name: 'Windows',
            icon: '🪟',
            version: 'v1.0.2',
            size: '~92 MB',
            requirements: 'Windows 10 or later',
            downloadUrl: 'https://github.com/Hoooon22/Command_Stack/releases/download/v1.0.2/CommandStack.Setup.1.0.2.exe',
            fileName: 'CommandStack.Setup.1.0.2.exe',
            instructions: [
                '1. 다운로드한 설치 파일(.exe)을 실행하세요',
                '2. 설치 마법사의 안내를 따라 진행하세요',
                '3. 설치가 완료되면 시작 메뉴에서 Command Stack을 찾을 수 있습니다',
                '4. Windows Defender에서 경고가 나타날 수 있습니다. "추가 정보"를 클릭한 후 "실행"을 선택하세요'
            ]
        },
        linux: {
            name: 'Linux',
            icon: '🐧',
            version: 'v1.0.2',
            size: '~89 MB',
            requirements: 'Ubuntu 20.04+ or equivalent (Debian-based)',
            downloadUrl: 'https://github.com/Hoooon22/Command_Stack/releases/download/v1.0.2/commandstack-electron_1.0.2_amd64.deb',
            fileName: 'commandstack-electron_1.0.2_amd64.deb',
            instructions: [
                '1. 다운로드한 .deb 파일이 있는 디렉토리로 이동하세요',
                '2. 터미널에서 다음 명령어를 실행하세요:',
                '   sudo dpkg -i commandstack-electron_1.0.2_amd64.deb',
                '3. 의존성 문제가 발생하면: sudo apt-get install -f',
                '4. 애플리케이션 메뉴에서 Command Stack을 실행하세요'
            ]
        }
    };

    const currentDownload = downloads[selectedOS];

    const handleDownload = (url) => {
        if (url) {
            window.open(url, '_blank');
        }
    };

    const getMacDownloadInfo = () => {
        if (selectedOS === 'macos') {
            return currentDownload.architectures[selectedMacArch];
        }
        return null;
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

                            {/* macOS Architecture Selection */}
                            {selectedOS === 'macos' && (
                                <div className="mac-arch-selector">
                                    <button
                                        className={`arch-button ${selectedMacArch === 'arm64' ? 'active' : ''}`}
                                        onClick={() => setSelectedMacArch('arm64')}
                                    >
                                        <span className="arch-icon">🍎</span>
                                        Apple Silicon
                                    </button>
                                    <button
                                        className={`arch-button ${selectedMacArch === 'intel' ? 'active' : ''}`}
                                        onClick={() => setSelectedMacArch('intel')}
                                    >
                                        <span className="arch-icon">⚙️</span>
                                        Intel
                                    </button>
                                </div>
                            )}

                            <div className="download-meta">
                                <span className="meta-item">
                                    <strong>Version:</strong> {currentDownload.version}
                                </span>
                                <span className="meta-divider">•</span>
                                <span className="meta-item">
                                    <strong>Size:</strong> {selectedOS === 'macos' ? getMacDownloadInfo().size : currentDownload.size}
                                </span>
                            </div>
                            <p className="download-requirements">
                                <strong>Requirements:</strong> {currentDownload.requirements}
                            </p>
                            {selectedOS === 'macos' && (
                                <p className="download-filename">
                                    <strong>File:</strong> {getMacDownloadInfo().fileName}
                                </p>
                            )}
                            {selectedOS !== 'macos' && currentDownload.fileName && (
                                <p className="download-filename">
                                    <strong>File:</strong> {currentDownload.fileName}
                                </p>
                            )}
                        </div>
                        <div className="download-action">
                            <button
                                onClick={() => handleDownload(
                                    selectedOS === 'macos'
                                        ? getMacDownloadInfo().downloadUrl
                                        : currentDownload.downloadUrl
                                )}
                                className="btn-download"
                            >
                                <span className="download-icon">⬇</span>
                                다운로드
                            </button>
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

            {/* All Releases Link */}
            <section className="all-releases-section">
                <div className="all-releases-content">
                    <h3 className="all-releases-title">모든 릴리즈 보기</h3>
                    <p className="all-releases-description">
                        이전 버전이나 다른 플랫폼용 빌드가 필요하신가요?
                    </p>
                    <a
                        href="https://github.com/Hoooon22/Command_Stack/releases"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-all-releases"
                    >
                        GitHub 릴리즈 페이지 방문
                    </a>
                </div>
            </section>

            {/* Build from Source */}
            <section className="build-from-source">
                <div className="build-content">
                    <h2 className="section-title">소스에서 빌드하기</h2>
                    <p className="section-description">
                        최신 개발 버전을 직접 빌드하거나 개발에 참여하고 싶으신가요?
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

                    {/* Latest Release - v1.0.2 */}
                    <div className="release-card">
                        <div className="release-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h3 className="release-version">v1.0.2</h3>
                                <span style={{
                                    padding: '4px 12px',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                }}>Latest</span>
                            </div>
                            <span className="release-date">2026년 1월 12일</span>
                        </div>
                        <div className="release-body">
                            <h4 className="release-section">✨ New Features</h4>
                            <ul className="release-list">
                                <li>향상된 캘린더 인터페이스</li>
                                <li>컨텍스트 자동 추천 기능</li>
                                <li>작업 우선순위 시각화</li>
                            </ul>
                            <h4 className="release-section">🔧 Bug Fixes</h4>
                            <ul className="release-list">
                                <li>날짜 선택 시 발생하던 오류 수정</li>
                                <li>다크 테마 일관성 개선</li>
                                <li>메모리 누수 문제 해결</li>
                            </ul>
                            <h4 className="release-section">📦 Downloads</h4>
                            <ul className="release-list">
                                <li>macOS (Apple Silicon & Intel)</li>
                                <li>Windows (x64)</li>
                                <li>Linux (Debian/Ubuntu)</li>
                            </ul>
                        </div>
                    </div>

                    {/* Previous Versions */}
                    <details style={{ marginTop: '2rem' }}>
                        <summary style={{
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            padding: '1rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px',
                            marginBottom: '1rem'
                        }}>
                            이전 버전 보기
                        </summary>

                        {/* v1.0.1 */}
                        <div className="release-card" style={{ marginTop: '1rem', opacity: '0.9' }}>
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
                                <h4 className="release-section">📦 Downloads</h4>
                                <ul className="release-list">
                                    <li>
                                        <a href="https://github.com/Hoooon22/Command_Stack/releases/download/v1.0.1/CommandStack-1.0.1-arm64.dmg"
                                           target="_blank"
                                           rel="noopener noreferrer"
                                           style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                                            macOS (Apple Silicon)
                                        </a>
                                    </li>
                                    <li>
                                        <a href="https://github.com/Hoooon22/Command_Stack/releases/download/v1.0.1/CommandStack-1.0.1.dmg"
                                           target="_blank"
                                           rel="noopener noreferrer"
                                           style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                                            macOS (Intel)
                                        </a>
                                    </li>
                                    <li>
                                        <a href="https://github.com/Hoooon22/Command_Stack/releases/download/v1.0.1/CommandStack.Setup.1.0.1.exe"
                                           target="_blank"
                                           rel="noopener noreferrer"
                                           style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                                            Windows (x64)
                                        </a>
                                    </li>
                                    <li>
                                        <a href="https://github.com/Hoooon22/Command_Stack/releases/download/v1.0.1/commandstack-electron_1.0.1_amd64.deb"
                                           target="_blank"
                                           rel="noopener noreferrer"
                                           style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                                            Linux (Debian/Ubuntu)
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </details>
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
