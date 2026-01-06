import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/ApiExperimentPage.css';

const JsonApi = () => {
    return (
        <div className="experiment-page-container">
            <header className="experiment-page-header">
                <Link to="/api-experiment" className="back-button">
                    ← 돌아가기
                </Link>
                <h1>📦 JSON API 실험</h1>
                <p>JSON 데이터 포맷 처리를 실험해보세요.</p>
            </header>

            <main className="experiment-page-content">
                <div className="experiment-workspace">
                    {/* 실험 영역 - 추후 구현 */}
                    <p className="placeholder-text">실험 영역이 준비 중입니다.</p>
                </div>
            </main>
        </div>
    );
};

export default JsonApi;
