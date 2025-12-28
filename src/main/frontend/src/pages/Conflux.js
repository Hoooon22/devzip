import React from 'react';
import '../styles/Conflux.css';

const Conflux = () => {
    const features = [
        {
            icon: '📥',
            title: 'Unified Inbox',
            subtitle: '통합 인박스',
            description: 'GitHub, Jira, Slack, Sentry의 모든 알림을 한곳에서 관리하세요. 더 이상 탭을 헤매지 않아도 됩니다.',
            details: [
                '모든 개발 도구의 알림을 하나의 타임라인으로',
                '중요한 알림만 필터링하여 집중력 유지',
                '@Mention과 Critical Error는 놓치지 않습니다'
            ]
        },
        {
            icon: '🔒',
            title: 'Secure Health Check',
            subtitle: '보안 능동 감시',
            description: 'Private 서버의 상태를 안전하게 감시합니다. Authorization Header와 API Token을 지원합니다.',
            details: [
                '1분마다 등록된 API 엔드포인트 상태 체크',
                'Authorization Header와 API Token 지원',
                '서버 다운 시 즉시 데스크톱 알림 전송'
            ]
        },
        {
            icon: '🖥️',
            title: 'Cross-Platform',
            subtitle: '어디서나 접속',
            description: '데스크톱 앱과 웹 버전 모두 지원합니다. 당신의 환경에 맞춰 선택하세요.',
            details: [
                'macOS와 Windows 시스템 트레이 상주',
                '웹 브라우저만 있다면 어디서든 접속 가능',
                '동일한 기능, 일관된 경험 제공'
            ]
        }
    ];

    const useCases = [
        {
            title: '배치 작업 완료 알림',
            code: `curl -X POST http://localhost:8080/api/webhook/custom \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "데이터 백업 완료",
    "message": "총 50GB 백업 성공. 소요시간: 120s",
    "status": "success"
  }'`,
            description: '파이썬 스크립트나 배치 작업이 끝나면 curl 한 줄로 PC에 알림을 보낼 수 있습니다.'
        },
        {
            title: 'Private API 감시',
            config: [
                'Target URL: https://api.my-service.com/health',
                'Method: GET',
                'Headers: Authorization: Bearer my-secret-token',
                'Interval: 60s'
            ],
            description: '보안 토큰이 필요한 내 서버를 안전하게 감시할 수 있습니다.'
        }
    ];

    const techStack = [
        { name: 'Spring Boot', version: '3.4', category: 'Backend' },
        { name: 'React', version: '18', category: 'Frontend' },
        { name: 'Electron', version: 'Latest', category: 'Desktop' },
        { name: 'Linear-style Dark UI', version: '-', category: 'Design' }
    ];

    return (
        <div className="conflux-container">
            {/* Hero Section */}
            <section className="conflux-hero">
                <div className="hero-content">
                    <div className="hero-badge">🌊 Conflux</div>
                    <h1 className="hero-title">
                        Where all streams merge.
                    </h1>
                    <p className="hero-subtitle">
                        개발자를 위한 개인화된 통합 알림 관제 센터
                    </p>
                    <p className="hero-description">
                        하루에 몇 번이나 알림을 확인하느라 흐름이 끊기나요?<br />
                        Conflux는 GitHub, Jira, Sentry 등 흩어진 개발 도구의 알림을<br />
                        하나의 타임라인으로 통합하여 진짜 중요한 정보만을 전달합니다.
                    </p>
                    <div className="hero-actions">
                        <a
                            href="https://github.com/Hoooon22/conflux"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary"
                        >
                            GitHub에서 사용해보기
                        </a>
                        <a
                            href="mailto:momo990305@gmail.com"
                            className="btn-secondary"
                        >
                            문의하기
                        </a>
                    </div>
                    <div className="hero-status">
                        <span className="status-badge">Beta</span>
                        <span className="status-divider">•</span>
                        <span className="status-text">Desktop & Web</span>
                        <span className="status-divider">•</span>
                        <span className="status-text">MIT License</span>
                    </div>
                </div>
            </section>

            {/* Problem Statement */}
            <section className="conflux-problem">
                <div className="section-content">
                    <h2 className="section-title">단순한 알림함이 아닙니다</h2>
                    <p className="section-description">
                        당신의 Private 서버 상태를 감시하고, 배치 작업 결과를 수신하는<br />
                        <strong>당신만의 관제 탑</strong>입니다.
                    </p>
                </div>
            </section>

            {/* Features */}
            <section className="conflux-features">
                <h2 className="section-title">Key Features</h2>
                <div className="features-grid">
                    {features.map((feature, index) => (
                        <div key={index} className="feature-card">
                            <div className="feature-icon">{feature.icon}</div>
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-subtitle">{feature.subtitle}</p>
                            <p className="feature-description">{feature.description}</p>
                            <ul className="feature-details">
                                {feature.details.map((detail, idx) => (
                                    <li key={idx}>{detail}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            {/* Use Cases */}
            <section className="conflux-usage">
                <h2 className="section-title">Usage Examples</h2>
                <div className="usage-grid">
                    {useCases.map((useCase, index) => (
                        <div key={index} className="usage-card">
                            <h3 className="usage-title">{useCase.title}</h3>
                            {useCase.code && (
                                <pre className="usage-code">
                                    <code>{useCase.code}</code>
                                </pre>
                            )}
                            {useCase.config && (
                                <div className="usage-config">
                                    {useCase.config.map((line, idx) => (
                                        <div key={idx} className="config-line">
                                            <span className="config-bullet">•</span>
                                            {line}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="usage-description">{useCase.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Tech Stack */}
            <section className="conflux-tech">
                <h2 className="section-title">Built With</h2>
                <p className="section-description">
                    현대적이고 안정적인 기술 스택으로 만들어졌습니다.
                </p>
                <div className="tech-grid">
                    {techStack.map((tech, index) => (
                        <div key={index} className="tech-card">
                            <div className="tech-category">{tech.category}</div>
                            <div className="tech-name">{tech.name}</div>
                            <div className="tech-version">{tech.version}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Getting Started */}
            <section className="conflux-start">
                <div className="start-content">
                    <h2 className="section-title">Getting Started</h2>
                    <p className="section-description">
                        현재 Beta 버전은 소스 코드를 통해 직접 실행할 수 있습니다.
                    </p>

                    <div className="start-steps">
                        <div className="step-card">
                            <div className="step-number">1</div>
                            <h3 className="step-title">Backend Setup</h3>
                            <p className="step-description">Conflux의 두뇌를 실행합니다. (Java 17+ 필요)</p>
                            <pre className="step-code">
                                <code>{`cd conflux-backend
./gradlew bootRun`}</code>
                            </pre>
                        </div>

                        <div className="step-card">
                            <div className="step-number">2</div>
                            <h3 className="step-title">Launch Client</h3>
                            <p className="step-description">원하는 방식으로 클라이언트를 실행하세요. (Node.js 18+ 필요)</p>
                            <div className="step-options">
                                <div className="option">
                                    <strong>🅰️ 데스크톱 앱 (권장)</strong>
                                    <pre className="step-code">
                                        <code>{`cd conflux-client
npm run electron`}</code>
                                    </pre>
                                </div>
                                <div className="option">
                                    <strong>🅱️ 웹 버전</strong>
                                    <pre className="step-code">
                                        <code>{`cd conflux-client
npm start`}</code>
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="conflux-cta">
                <div className="cta-content">
                    <h2 className="cta-title">지금 바로 시작해보세요</h2>
                    <p className="cta-description">
                        Conflux는 오픈소스 프로젝트입니다.<br />
                        GitHub에서 코드를 확인하고 직접 사용해보세요.
                    </p>
                    <div className="cta-actions">
                        <a
                            href="https://github.com/Hoooon22/conflux"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary-large"
                        >
                            GitHub 저장소 방문
                        </a>
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
            <footer className="conflux-footer">
                <p>Conflux Project • Created by Hoooon22</p>
                <p className="footer-subtitle">MIT License • 2025</p>
            </footer>
        </div>
    );
};

export default Conflux;
