import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/ApiExperimentPage.css';
import '../../styles/JsonApi.css';

const JsonApi = () => {
    // 입력 JSON 문자열
    const [inputJson, setInputJson] = useState(`{
  "name": "김철수",
  "age": 25,
  "isStudent": true,
  "hobbies": ["축구", "게임", "독서"]
}`);

    // 결과 상태
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // TODO(human): 1. JSON 유효성 검사 구현
    // JSON.parse()로 inputJson이 유효한지 확인하세요
    const validateJson = () => {
        setError(null);
        setResult(null);

        // 여기에 구현하세요
        // 힌트: try/catch로 JSON.parse(inputJson) 감싸기
        // 성공: setResult({ type: 'validate', message: '✅ 유효한 JSON입니다!' })
        // 실패: setError(`❌ 오류: ${err.message}`)
        try {
            JSON.parse(inputJson);
            setResult({ type: 'validate', message: '유효한 JSON입니다.'})
        } catch (err) {
            setError(`오류: ${err.message}`);
        }
    };

    // TODO(human): 2. JSON 포맷터 구현
    // JSON.stringify(obj, null, 2)로 보기 좋게 정리하세요
    const formatJson = () => {
        setError(null);
        setResult(null);

        // 여기에 구현하세요
        // 1. JSON.parse()로 파싱
        // 2. JSON.stringify(parsed, null, 2)로 포맷
        // 3. setInputJson()으로 입력창 업데이트
        
        try {
            const parsed = JSON.parse(inputJson);
            const formatted = JSON.stringify(parsed, null, 2);
            setInputJson(formatted);
        } catch (err) {
            setError(`오류: ${err.message}`);
        }
    };

    // TODO(human): 3. JSON 압축 구현
    // JSON.stringify(obj)로 공백 없이 압축하세요
    const minifyJson = () => {
        setError(null);
        setResult(null);

        // 여기에 구현하세요
        // 보너스: 압축 전/후 길이를 비교해서 결과에 표시해보세요

        try {
            const parsed = JSON.parse(inputJson);
            JSON.stringify(parsed);
            const result = setInputJson(parsed);
            setInputJson(result);
        } catch (err) {
            setError(`오류: ${err.message}`);
        }
    };

    // 4. 샘플 JSON 로드
    const loadSample = (type) => {
        const samples = {
            simple: `{"name": "홍길동", "age": 30}`,
            array: `["사과", "바나나", "오렌지"]`,
            nested: `{
                    "user": {
                        "id": 1,
                        "name": "김철수",
                        "contacts": {
                        "email": "kim@example.com",
                        "phone": "010-1234-5678"
                        }
                    },
                    "posts": [
                        {"id": 1, "title": "첫 번째 글"},
                        {"id": 2, "title": "두 번째 글"}
                    ]
                    }`
        };
        setInputJson(samples[type]);
        setResult(null);
        setError(null);
    };

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
                <div className="json-workspace">
                    {/* 입력 영역 */}
                    <section className="json-input-section">
                        <div className="section-header">
                            <h2>📝 JSON 입력</h2>
                            <div className="sample-buttons">
                                <button onClick={() => loadSample('simple')}>간단한 예제</button>
                                <button onClick={() => loadSample('array')}>배열 예제</button>
                                <button onClick={() => loadSample('nested')}>중첩 예제</button>
                            </div>
                        </div>

                        <textarea
                            value={inputJson}
                            onChange={(e) => setInputJson(e.target.value)}
                            className="json-textarea"
                            spellCheck={false}
                            placeholder='{"key": "value"}'
                        />

                        <div className="action-buttons">
                            <button onClick={validateJson} className="btn-validate">
                                ✓ 유효성 검사
                            </button>
                            <button onClick={formatJson} className="btn-format">
                                📐 포맷터
                            </button>
                            <button onClick={minifyJson} className="btn-minify">
                                🗜️ 압축
                            </button>
                        </div>
                    </section>

                    {/* 결과 영역 */}
                    <section className="json-result-section">
                        <h2>📊 결과</h2>

                        {error && (
                            <div className="error-box">{error}</div>
                        )}

                        {result && (
                            <div className="result-box">
                                <p className="result-message">{result.message}</p>

                                {result.type === 'validate' && (
                                    <p>데이터 타입: <strong>{result.dataType}</strong></p>
                                )}

                                {result.type === 'minify' && (
                                    <div className="minify-stats">
                                        <p>압축 전: {result.before}자</p>
                                        <p>압축 후: {result.after}자</p>
                                        <p className="saved">
                                            절약: {result.saved}자
                                            ({Math.round((result.saved / result.before) * 100)}%)
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {!result && !error && (
                            <div className="placeholder-box">
                                버튼을 클릭하여 JSON을 처리해보세요.
                            </div>
                        )}
                    </section>
                </div>

                {/* 학습 가이드 */}
                <div className="learning-section">
                    <h3>💡 JSON 핵심 개념</h3>
                    <div className="concept-cards">
                        <div className="concept-card">
                            <h4>JSON.parse()</h4>
                            <p>문자열 → 객체</p>
                            <code>{'JSON.parse(\'{"name":"철수"}\')'}</code>
                        </div>
                        <div className="concept-card">
                            <h4>JSON.stringify()</h4>
                            <p>객체 → 문자열</p>
                            <code>{'JSON.stringify({name:"철수"})'}</code>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default JsonApi;
