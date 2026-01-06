import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/ApiExperiment.css';

const ApiExperiment = () => {
    const apiTypes = [
        {
            name: 'REST API',
            path: '/api-experiment/rest',
            description: 'RESTful API 요청/응답 실험',
            icon: '🌐'
        },
        {
            name: 'JSON API',
            path: '/api-experiment/json',
            description: 'JSON 데이터 포맷 처리 실험',
            icon: '📦'
        },
        {
            name: 'SOAP API',
            path: '/api-experiment/soap',
            description: 'SOAP 프로토콜 통신 실험',
            icon: '📡'
        },
        {
            name: 'gRPC',
            path: '/api-experiment/grpc',
            description: 'gRPC 프로토콜 통신 실험',
            icon: '⚡'
        },
        {
            name: 'GraphQL',
            path: '/api-experiment/graphql',
            description: 'GraphQL 쿼리 실험',
            icon: '🔍'
        }
    ];

    return (
        <div className="api-experiment-container">
            <header className="experiment-header">
                <h1>🧪 API 실험실</h1>
                <p>다양한 API 타입을 공부해본 공간입니다.</p>
            </header>

            <main className="experiment-content">
                <div className="api-types-grid">
                    {apiTypes.map((apiType, index) => (
                        <Link
                            key={index}
                            to={apiType.path}
                            className="api-type-card"
                        >
                            <div className="card-icon">{apiType.icon}</div>
                            <h2>{apiType.name}</h2>
                            <p>{apiType.description}</p>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default ApiExperiment;
