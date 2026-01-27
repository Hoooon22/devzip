import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/ApiExperimentPage.css';
import '../../styles/GraphQLApi.css';

const GraphQLApi = () => {
    // 쿼리 및 변수 상태
    const [query, setQuery] = useState(`query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
  }
}`);
    const [variables, setVariables] = useState(`{
  "id": "1"
}`);
    
    // 결과 상태
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 샘플 데이터 로드
    const loadSample = (type) => {
        if (type === 'getUser') {
            setQuery(`query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    posts {
      title
    }
  }
}`);
            setVariables(`{
  "id": "1"
}`);
        } else if (type === 'getPosts') {
            setQuery(`query GetPosts {
  posts {
    id
    title
    content
    author {
      name
    }
  }
}`);
            setVariables(`{}`);
        } else if (type === 'mutation') {
            setQuery(`mutation CreatePost($input: PostInput!) {
  createPost(input: $input) {
    id
    title
    createdAt
  }
}`);
            setVariables(`{
  "input": {
    "title": "새로운 글",
    "content": "안녕하세요 GraphQL!"
  }
}`);
        }
        setResult(null);
        setError(null);
    };

    // TODO(human): GraphQL 쿼리 실행 함수 구현하기
    // 이 함수를 완성하여 실제 API 또는 모의 데이터를 반환하세요.
    const executeQuery = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            // 1. variables 파싱 (JSON.parse 사용)
            // 힌트: const parsedVariables = variables ? JSON.parse(variables) : {};
            let parsedVariables = {};
            // 여기에 코드를 작성하세요...


            // 2. 실제 fetch 요청 구현 (또는 주석 처리된 모의 데이터 사용)
            // 힌트: fetch('https://your-api.com/graphql', { ... })
            
            // 시뮬레이션을 위한 지연 (삭제 가능)
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 여기에 코드를 작성하세요...
            // 예시 응답 구조:
            // const mockResponse = {
            //   data: {
            //     user: { id: "1", name: "김철수", email: "kim@example.com" }
            //   }
            // };
            // setResult(JSON.stringify(mockResponse, null, 2));

            // 임시 에러 메시지 (구현 후 삭제하세요)
            throw new Error("API 연동이 아직 구현되지 않았습니다! executeQuery 함수를 완성해주세요.");

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="experiment-page-container">
            <header className="experiment-page-header">
                <Link to="/api-experiment" className="back-button">
                    ← 돌아가기
                </Link>
                <h1>🔍 GraphQL 실험</h1>
                <p>GraphQL 쿼리 및 뮤테이션을 실험하고 학습해보세요.</p>
            </header>

            <main className="experiment-page-content">
                <div className="graphql-workspace">
                    {/* 왼쪽: 입력 영역 */}
                    <section className="graphql-input-section">
                        <div className="section-header">
                            <h2>📝 Query 작성</h2>
                            <div className="sample-buttons">
                                <button onClick={() => loadSample('getUser')}>유저 조회</button>
                                <button onClick={() => loadSample('getPosts')}>게시글 목록</button>
                                <button onClick={() => loadSample('mutation')}>글 작성 (Mutation)</button>
                            </div>
                        </div>

                        <div>
                            <span className="input-label">Query</span>
                            <textarea
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="graphql-textarea query-editor"
                                spellCheck={false}
                                placeholder="query { ... }"
                            />
                        </div>

                        <div>
                            <span className="input-label">Variables (JSON)</span>
                            <textarea
                                value={variables}
                                onChange={(e) => setVariables(e.target.value)}
                                className="graphql-textarea variables-editor"
                                spellCheck={false}
                                placeholder="{ }"
                            />
                        </div>

                        <button 
                            onClick={executeQuery} 
                            className="btn-execute"
                            disabled={loading}
                        >
                            {loading ? '실행 중...' : '▶ 실행 (Execute)'}
                        </button>
                    </section>

                    {/* 오른쪽: 결과 영역 */}
                    <section className="graphql-result-section">
                        <h2>📊 결과 (Response)</h2>

                        {error && (
                            <div className="error-box">
                                <strong>❌ Error:</strong><br/>
                                {error}
                            </div>
                        )}

                        {!error && (
                            <div className="result-box">
                                {result ? (
                                    <pre className="result-pre">{result}</pre>
                                ) : (
                                    <div className="placeholder-box">
                                        {loading ? '데이터를 불러오는 중입니다...' : '쿼리를 실행하면 결과가 여기에 표시됩니다.'}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>

                {/* 학습 가이드 */}
                <div className="learning-section">
                    <h3>💡 GraphQL 핵심 개념</h3>
                    <div className="concept-cards">
                        <div className="concept-card">
                            <h4>Query (조회)</h4>
                            <p>필요한 데이터만 골라서 요청할 수 있습니다.</p>
                            <code>{`query {
  user(id: 1) {
    name
  }
}`}</code>
                        </div>
                        <div className="concept-card">
                            <h4>Mutation (변경)</h4>
                            <p>데이터를 생성, 수정, 삭제할 때 사용합니다.</p>
                            <code>{`mutation {
  addUser(name: "Kim") {
    id
  }
}`}</code>
                        </div>
                        <div className="concept-card">
                            <h4>Schema (스키마)</h4>
                            <p>사용 가능한 데이터 타입과 관계를 정의합니다.</p>
                            <code>{`type User {
  id: ID!
  name: String
}`}</code>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default GraphQLApi;