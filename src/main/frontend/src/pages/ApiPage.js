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

    const apiCategories = [
        {
            name: '개발자 관련 API',
            description: '개발자 관련 정보를 제공하는 API들입니다.',
            endpoints: [
                {
                    path: '/api/developer/emotion',
                    method: 'GET',
                    description: '개발자의 감정 상태를 반환합니다.',
                    responseType: 'text/plain',
                    sampleResponse: 'Not Bad :/'
                }
            ]
        },
        {
            name: '트렌드 API',
            description: '개발 트렌드 관련 정보를 제공하는 API들입니다.',
            endpoints: [
                {
                    path: '/api/trend/timestamp',
                    method: 'GET',
                    description: '트렌드 데이터가 마지막으로 업데이트된 시간을 반환합니다.',
                    responseType: 'text/plain',
                    sampleResponse: '2023-05-15T12:30:45Z'
                },
                {
                    path: '/api/trend/keywords',
                    method: 'GET',
                    description: '인기 트렌드 키워드 목록을 반환합니다.',
                    responseType: 'application/json',
                    sampleResponse: '["React", "Next.js", "TypeScript", "AWS", "Docker"]'
                }
            ]
        },
        {
            name: '채팅방 API',
            description: '채팅방 관련 기능을 제공하는 API들입니다.',
            endpoints: [
                {
                    path: '/api/chatrooms',
                    method: 'GET',
                    description: '키워드로 채팅방을 생성하거나 조회합니다.',
                    params: 'keyword (필수): 채팅방 키워드',
                    responseType: 'application/json',
                    sampleResponse: '{"id": 1, "roomId": "room-123", "keyword": "React", "createdAt": "2023-05-15T12:30:45Z"}'
                },
                {
                    path: '/api/chatrooms/{id}',
                    method: 'GET',
                    description: 'ID로 특정 채팅방 정보를 조회합니다.',
                    params: 'id (경로 변수): 채팅방 ID',
                    responseType: 'application/json',
                    sampleResponse: '{"id": 1, "roomId": "room-123", "keyword": "React", "createdAt": "2023-05-15T12:30:45Z"}'
                }
            ]
        },
        {
            name: '엔트리 API',
            description: '엔트리 관련 데이터를 제공하는 API들입니다.',
            endpoints: [
                {
                    path: '/api/v1/entries',
                    method: 'GET',
                    description: '모든 엔트리 목록을 반환합니다.',
                    responseType: 'application/json',
                    sampleResponse: '[{"id": 1, "title": "첫 번째 엔트리", "content": "내용...", "createdAt": "2023-05-15T12:30:45Z"}]'
                },
                {
                    path: '/api/v1/entries',
                    method: 'POST',
                    description: '새 엔트리를 추가합니다.',
                    requestBody: '{"title": "새 엔트리", "content": "내용..."}',
                    responseType: 'application/json',
                    sampleResponse: '{"id": 2, "title": "새 엔트리", "content": "내용...", "createdAt": "2023-05-15T12:30:45Z"}'
                }
            ]
        },
        {
            name: '재미 API',
            description: '재미있는 콘텐츠를 제공하는 API들입니다.',
            endpoints: [
                {
                    path: '/api/joke',
                    method: 'GET',
                    description: '랜덤 개발자 농담을 반환합니다.',
                    responseType: 'text/plain',
                    sampleResponse: '왜 개발자들은 할로윈을 좋아할까요? 고스트 코드가 많아서요!'
                },
                {
                    path: '/api/lolPatch',
                    method: 'GET',
                    description: '최신 롤 패치 정보를 HTML 형식으로 반환합니다.',
                    responseType: 'text/html',
                    sampleResponse: '<html>패치 노트 내용...</html>'
                }
            ]
        },
        {
            name: '서버 관련 API',
            description: '서버 상태 및 정보를 제공하는 API들입니다.',
            endpoints: [
                {
                    path: '/api/v1/serverstarts',
                    method: 'GET',
                    description: '서버 시작 기록을 조회합니다.',
                    responseType: 'application/json',
                    sampleResponse: '[{"id": 1, "startTime": "2023-05-15T12:30:45Z", "serverVersion": "1.0.0"}]'
                }
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
                        <div 
                            className="category-header" 
                            onClick={() => toggleCategory(index)}
                        >
                            <h2>{category.name}</h2>
                            <span className={`expand-icon ${expandedCategory === index ? 'expanded' : ''}`}>
                                {expandedCategory === index ? '−' : '+'}
                            </span>
                        </div>
                        
                        {expandedCategory === index && (
                            <div className="category-content">
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