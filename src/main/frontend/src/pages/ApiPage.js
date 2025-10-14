import React, { useState } from 'react';
import '../styles/ApiPage.css';

const ApiPage = () => {
    const [expandedCategory, setExpandedCategory] = useState(null);

    const toggleCategory = (category) => {
        if (expandedCategory === category) {
            setExpandedCategory(null);
        } else {
            setExpandedCategory(category);
        }
    };

    const handleKeyDown = (event, index) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleCategory(index);
        }
    };

    const apiCategories = [
        {
            name: '공개 API',
            description: '누구나 인증 없이 사용할 수 있는 API입니다.',
            endpoints: [
                {
                    path: '/api/v1/entries',
                    method: 'GET',
                    description: '모든 방명록 글 목록을 조회합니다.',
                },
                {
                    path: '/api/v1/entries',
                    method: 'POST',
                    description: '새 방명록 글을 작성합니다.',
                    requestBody: '{"name": "이름", "content": "내용"}',
                },
                {
                    path: '/api/joke',
                    method: 'GET',
                    description: '랜덤 개발자 농담을 반환합니다.',
                },
                {
                    path: '/api/lolPatch',
                    method: 'GET',
                    description: '최신 롤 패치 정보를 HTML 형식으로 반환합니다.',
                },
                {
                    path: '/api/trend/timestamp',
                    method: 'GET',
                    description: '트렌드 데이터가 마지막으로 업데이트된 시간을 반환합니다.',
                },
                {
                    path: '/api/trend/keywords',
                    method: 'GET',
                    description: '인기 트렌드 키워드 목록을 반환합니다.',
                },
                {
                    path: '/api/cs-tip',
                    method: 'GET',
                    description: '매일 다른 CS 팁을 제공합니다.',
                },
            ]
        },
        {
            name: '인증이 필요한 API',
            description: '로그인 후 발급된 JWT 토큰이 필요한 API입니다. 헤더에 `Authorization: Bearer {token}`을 포함해야 합니다.',
            endpoints: [
                {
                    path: '/api/auth/signin',
                    method: 'POST',
                    description: '로그인하여 JWT 토큰을 발급받습니다.',
                    requestBody: '{"username": "user", "password": "password"}',
                },
                {
                    path: '/api/auth/signup',
                    method: 'POST',
                    description: '새로운 사용자를 등록합니다.',
                    requestBody: '{"username": "user", "email": "user@example.com", "password": "password"}',
                },
                {
                    path: '/api/auth/validate',
                    method: 'GET',
                    description: '현재 JWT 토큰의 유효성을 검사합니다. (헤더 필요)',
                },
                {
                    path: '/api/v1/entries/{id}',
                    method: 'DELETE',
                    description: 'ID로 특정 방명록 글을 삭제합니다. (권한 필요)',
                },
                {
                    path: '/api/topics',
                    method: 'GET',
                    description: '사용자의 모든 주제 목록을 조회합니다. (인증 필요)',
                },
                {
                    path: '/api/topics',
                    method: 'POST',
                    description: '새로운 주제를 생성합니다. (인증 필요)',
                    requestBody: '{"name": "주제명", "description": "설명", "color": "#FFFFFF", "emoji": "👍"}',
                },
                {
                    path: '/api/topics/{id}',
                    method: 'GET',
                    description: 'ID로 특정 주제를 조회합니다. (인증 필요)',
                },
                {
                    path: '/api/topics/{id}',
                    method: 'PUT',
                    description: 'ID로 특정 주제를 수정합니다. (인증 필요)',
                    requestBody: '{"name": "새 주제명", "description": "새 설명"}',
                },
                {
                    path: '/api/topics/{id}',
                    method: 'DELETE',
                    description: 'ID로 특정 주제를 삭제합니다. (인증 필요)',
                },
            ]
        },
        {
            name: '내부 개발 및 분석용 API',
            description: '서버 관리, 모니터링, 데이터 분석 등 내부용으로 사용되는 API입니다. 직접적인 호출은 권장되지 않습니다.',
            endpoints: [
                {
                    path: '/api/developer/emotion',
                    method: 'GET',
                    description: '개발자의 현재 감정 상태를 반환합니다. (내부용)',
                },
                {
                    path: '/api/system/cpu',
                    method: 'GET',
                    description: '서버의 현재 CPU 사용량을 조회합니다. (내부 모니터링용)',
                },
                {
                    path: '/api/system/memory',
                    method: 'GET',
                    description: '서버의 현재 메모리 사용량을 조회합니다. (내부 모니터링용)',
                },
                {
                    path: '/api/v1/serverstarts',
                    method: 'GET',
                    description: '서버 시작 기록을 조회합니다. (내부용)',
                },
                {
                    path: '/api/traceboard/event',
                    method: 'POST',
                    description: '사용자 행동 등 이벤트 로그를 수집합니다. (내부 분석용)',
                },
                {
                    path: '/api/traceboard/dashboard',
                    method: 'GET',
                    description: '수집된 로그 기반의 대시보드 데이터를 조회합니다. (내부 분석용)',
                },
                {
                    path: '/api/traceboard/events',
                    method: 'GET',
                    description: '저장된 모든 이벤트 로그를 조회합니다. (내부 분석용)',
                },
            ]
        }
    ];

    return (
        <div className="api-page-container">
            <header className="api-header">
                <h1>DevZip API 목록</h1>
                <p>DevZip에서 제공하는 다양한 API 엔드포인트들입니다. 모든 API는 JSON 형식으로 응답합니다.</p>
            </header>

            <main className="api-content">
                {apiCategories.map((category, index) => (
                    <section key={index} className="api-category">
                        <button 
                            className="category-header" 
                            onClick={() => toggleCategory(index)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            aria-expanded={expandedCategory === index}
                            aria-controls={`category-content-${index}`}
                        >
                            <h2>{category.name}</h2>
                            <span className={`expand-icon ${expandedCategory === index ? 'expanded' : ''}`} aria-hidden="true">
                                {expandedCategory === index ? '−' : '+'}
                            </span>
                        </button>
                        
                        {expandedCategory === index && (
                            <div 
                                className="category-content" 
                                id={`category-content-${index}`}
                            >
                                <p className="category-description">{category.description}</p>
                                
                                <div className="endpoints">
                                    {category.endpoints.map((endpoint, endpointIndex) => (
                                        <div key={endpointIndex} className="endpoint">
                                            <div className="endpoint-header">
                                                <span className={`method ${endpoint.method.toLowerCase()}`}>
                                                    {endpoint.method}
                                                </span>
                                                <code className="path">{endpoint.path}</code>
                                            </div>
                                            
                                            <div className="endpoint-details">
                                                <p className="description">{endpoint.description}</p>
                                                
                                                {endpoint.params && (
                                                    <div className="params">
                                                        <h4>파라미터:</h4>
                                                        <p>{endpoint.params}</p>
                                                    </div>
                                                )}
                                                
                                                {endpoint.requestBody && (
                                                    <div className="request-body">
                                                        <h4>요청 본문:</h4>
                                                        <pre>{endpoint.requestBody}</pre>
                                                    </div>
                                                )}
                                                
                                                <div className="response">
                                                    <h4>응답 타입:</h4>
                                                    <p>{endpoint.responseType}</p>
                                                    
                                                    <h4>샘플 응답:</h4>
                                                    <pre>{endpoint.sampleResponse}</pre>
                                                </div>
                                                
                                                <div className="try-api">
                                                    <a href={endpoint.path} target="_blank" rel="noopener noreferrer">
                                                        API 테스트
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                ))}
            </main>
        </div>
    );
};

export default ApiPage;