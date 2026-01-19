import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/ApiExperimentPage.css';
import '../../styles/RestApi.css';

const RestApi = () => {
    // 요청 상태 관리
    const [method, setMethod] = useState('GET');
    const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
    const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
    const [body, setBody] = useState('');

    // 응답 상태 관리
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [responseTime, setResponseTime] = useState(null);

    // HTTP 메서드 목록
    const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

    // API 요청 실행 함수
    const executeRequest = async () => {
        // 1. 이전 결과 초기화
        setLoading(true);
        setError(null);
        setResponse(null);

        // 시간 측정 시작
        const startTime = Date.now();

        try {
            // 2. 헤더 문자열을 객체로 변환
            const headerObj = headers ? JSON.parse(headers) : {};

            // 3. fetch 요청 보내기
            const res = await fetch(url, {
                method: method,
                headers: headerObj,
                // body는 GET/DELETE가 아닐 때만
                ...(body && !['GET', 'DELETE'].includes(method) && {
                    body: body
                })
            });

            // 4. 응답 시간 계산
            setResponseTime(Date.now() - startTime);

            // 5. 응답 헤더를 객체로 변환
            const responseHeaders = {};
            res.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            // 6. 응답 바디 파싱
            let responseData;
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                responseData = await res.json();
            } else {
                responseData = await res.text();
            }

            // 7. 응답 상태 업데이트
            setResponse({
                status: res.status,
                statusText: res.statusText,
                headers: responseHeaders,
                data: responseData
            });

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // 응답 상태 코드에 따른 색상 결정
    const getStatusColor = (status) => {
        if (status >= 200 && status < 300) return 'success';
        if (status >= 300 && status < 400) return 'redirect';
        if (status >= 400 && status < 500) return 'client-error';
        if (status >= 500) return 'server-error';
        return 'unknown';
    };

    return (
        <div className="experiment-page-container">
            <header className="experiment-page-header">
                <Link to="/api-experiment" className="back-button">
                    ← 돌아가기
                </Link>
                <h1>🌐 REST API 실험</h1>
                <p>RESTful API 요청과 응답을 실험해보세요.</p>
            </header>

            <main className="experiment-page-content">
                <div className="rest-api-workspace">
                    {/* 요청 섹션 */}
                    <section className="request-section">
                        <h2>📤 요청 (Request)</h2>

                        {/* URL 입력 영역 */}
                        <div className="url-bar">
                            <select
                                value={method}
                                onChange={(e) => setMethod(e.target.value)}
                                className={`method-select method-${method.toLowerCase()}`}
                            >
                                {httpMethods.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://api.example.com/endpoint"
                                className="url-input"
                            />
                            <button
                                onClick={executeRequest}
                                disabled={loading || !url}
                                className="send-button"
                            >
                                {loading ? '전송 중...' : '전송'}
                            </button>
                        </div>

                        {/* 헤더 편집 */}
                        <div className="editor-section">
                            <h3>Headers (JSON 형식)</h3>
                            <textarea
                                value={headers}
                                onChange={(e) => setHeaders(e.target.value)}
                                placeholder='{"Content-Type": "application/json"}'
                                className="editor-textarea"
                                rows={4}
                            />
                        </div>

                        {/* 바디 편집 (GET, DELETE 제외) */}
                        {!['GET', 'DELETE'].includes(method) && (
                            <div className="editor-section">
                                <h3>Body (JSON 형식)</h3>
                                <textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder='{"key": "value"}'
                                    className="editor-textarea"
                                    rows={6}
                                />
                            </div>
                        )}
                    </section>

                    {/* 응답 섹션 */}
                    <section className="response-section">
                        <h2>📥 응답 (Response)</h2>

                        {error && (
                            <div className="error-message">
                                ❌ {error}
                            </div>
                        )}

                        {response && (
                            <>
                                {/* 응답 메타 정보 */}
                                <div className="response-meta">
                                    <span className={`status-badge ${getStatusColor(response.status)}`}>
                                        {response.status} {response.statusText}
                                    </span>
                                    {responseTime && (
                                        <span className="response-time">
                                            ⏱️ {responseTime}ms
                                        </span>
                                    )}
                                </div>

                                {/* 응답 헤더 */}
                                <div className="response-headers">
                                    <h3>Response Headers</h3>
                                    <pre>{JSON.stringify(response.headers, null, 2)}</pre>
                                </div>

                                {/* 응답 바디 */}
                                <div className="response-body">
                                    <h3>Response Body</h3>
                                    <pre>{JSON.stringify(response.data, null, 2)}</pre>
                                </div>
                            </>
                        )}

                        {!response && !error && (
                            <div className="placeholder-response">
                                요청을 전송하면 여기에 응답이 표시됩니다.
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
};

export default RestApi;
