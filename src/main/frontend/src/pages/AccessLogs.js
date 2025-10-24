import React, { useState, useEffect } from "react";
import axios from "axios";
import authService from "../services/AuthService";
import "../assets/css/AccessLogs.scss";

const AccessLogs = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [showPasswordModal, setShowPasswordModal] = useState(true);
    const [authError, setAuthError] = useState("");

    const [logs, setLogs] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(false);

    // 필터 상태
    const [filters, setFilters] = useState({
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        endTime: new Date().toISOString().slice(0, 16),
        ipAddress: "",
        username: "",
        requestMethod: "",
        requestUri: "",
        page: 0,
        size: 50
    });

    // 통계 기간 필터
    const [statsFilters, setStatsFilters] = useState({
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        endTime: new Date().toISOString().slice(0, 16)
    });

    const [activeTab, setActiveTab] = useState("logs"); // logs, stats, daily

    // 비밀번호 확인
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setAuthError("");

        try {
            const token = authService.getToken();
            if (!token) {
                setAuthError("로그인이 필요합니다.");
                return;
            }

            const response = await axios.post(
                "/api/traceboard/access-logs/verify-password",
                { password },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                setIsAuthenticated(true);
                setShowPasswordModal(false);
                fetchAccessLogs();
            }
        } catch (error) {
            console.error("비밀번호 인증 실패:", error);
            setAuthError(
                error.response?.data?.message || "비밀번호가 일치하지 않습니다."
            );
        }
    };

    // 접근 로그 조회
    const fetchAccessLogs = async () => {
        setLoading(true);
        try {
            const token = authService.getToken();
            const params = new URLSearchParams();

            if (filters.startTime) params.append("startTime", filters.startTime);
            if (filters.endTime) params.append("endTime", filters.endTime);
            if (filters.ipAddress) params.append("ipAddress", filters.ipAddress);
            if (filters.username) params.append("username", filters.username);
            if (filters.requestMethod) params.append("requestMethod", filters.requestMethod);
            if (filters.requestUri) params.append("requestUri", filters.requestUri);
            params.append("page", filters.page);
            params.append("size", filters.size);

            const response = await axios.get(
                `/api/traceboard/access-logs?${params.toString()}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                setLogs(response.data.data.content || []);
            }
        } catch (error) {
            console.error("접근 로그 조회 실패:", error);
            alert("접근 로그를 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // 통계 조회
    const fetchStatistics = async () => {
        setLoading(true);
        try {
            const token = authService.getToken();
            const params = new URLSearchParams();

            if (statsFilters.startTime) params.append("startTime", statsFilters.startTime);
            if (statsFilters.endTime) params.append("endTime", statsFilters.endTime);

            const response = await axios.get(
                `/api/traceboard/access-logs/statistics/overview?${params.toString()}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                setStatistics(response.data.data);
            }
        } catch (error) {
            console.error("통계 조회 실패:", error);
            alert("통계를 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // 필터 변경 핸들러
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    // 필터 리셋
    const handleResetFilters = () => {
        setFilters({
            startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
            endTime: new Date().toISOString().slice(0, 16),
            ipAddress: "",
            username: "",
            requestMethod: "",
            requestUri: "",
            page: 0,
            size: 50
        });
    };

    // 날짜 포맷팅
    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return "-";
        const date = new Date(dateTimeString);
        return date.toLocaleString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    };

    // HTTP 상태 코드 색상
    const getStatusColor = (status) => {
        if (status >= 200 && status < 300) return "status-success";
        if (status >= 300 && status < 400) return "status-redirect";
        if (status >= 400 && status < 500) return "status-client-error";
        if (status >= 500) return "status-server-error";
        return "";
    };

    useEffect(() => {
        if (isAuthenticated && activeTab === "logs") {
            fetchAccessLogs();
        } else if (isAuthenticated && activeTab === "stats") {
            fetchStatistics();
        }
    }, [filters, statsFilters, activeTab, isAuthenticated]);

    // 비밀번호 모달
    if (showPasswordModal) {
        return (
            <div className="access-logs-password-modal">
                <div className="modal-content">
                    <h2>🔒 접근 로그 페이지</h2>
                    <p>민감한 정보를 포함하고 있습니다. 비밀번호를 입력해주세요.</p>
                    <form onSubmit={handlePasswordSubmit}>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="관리자 비밀번호"
                            className="password-input"
                            autoComplete="current-password"
                            required
                        />
                        {authError && <div className="error-message">{authError}</div>}
                        <div className="modal-buttons">
                            <button type="submit" className="btn-primary">
                                확인
                            </button>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => window.history.back()}
                            >
                                취소
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="access-logs-container">
            <div className="access-logs-header">
                <h1>🔍 서버 접근 로그</h1>
                <p className="warning-text">
                    ⚠️ 이 페이지는 원본 IP 주소를 포함한 민감한 정보를 표시합니다.
                </p>
            </div>

            {/* 탭 메뉴 */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === "logs" ? "active" : ""}`}
                    onClick={() => setActiveTab("logs")}
                >
                    접근 로그
                </button>
                <button
                    className={`tab ${activeTab === "stats" ? "active" : ""}`}
                    onClick={() => setActiveTab("stats")}
                >
                    통계
                </button>
            </div>

            {/* 접근 로그 탭 */}
            {activeTab === "logs" && (
                <>
                    {/* 필터 */}
                    <div className="filters">
                        <div className="filter-row">
                            <div className="filter-item">
                                <label htmlFor="filter-start-time">시작 시간:</label>
                                <input
                                    id="filter-start-time"
                                    type="datetime-local"
                                    value={filters.startTime}
                                    onChange={(e) => handleFilterChange("startTime", e.target.value)}
                                />
                            </div>
                            <div className="filter-item">
                                <label htmlFor="filter-end-time">종료 시간:</label>
                                <input
                                    id="filter-end-time"
                                    type="datetime-local"
                                    value={filters.endTime}
                                    onChange={(e) => handleFilterChange("endTime", e.target.value)}
                                />
                            </div>
                            <div className="filter-item">
                                <label htmlFor="filter-ip-address">IP 주소:</label>
                                <input
                                    id="filter-ip-address"
                                    type="text"
                                    value={filters.ipAddress}
                                    onChange={(e) => handleFilterChange("ipAddress", e.target.value)}
                                    placeholder="예: 192.168.1.1"
                                />
                            </div>
                            <div className="filter-item">
                                <label htmlFor="filter-username">사용자명:</label>
                                <input
                                    id="filter-username"
                                    type="text"
                                    value={filters.username}
                                    onChange={(e) => handleFilterChange("username", e.target.value)}
                                    placeholder="사용자명"
                                />
                            </div>
                            <div className="filter-item">
                                <label htmlFor="filter-request-method">HTTP 메서드:</label>
                                <select
                                    id="filter-request-method"
                                    value={filters.requestMethod}
                                    onChange={(e) => handleFilterChange("requestMethod", e.target.value)}
                                >
                                    <option value="">전체</option>
                                    <option value="GET">GET</option>
                                    <option value="POST">POST</option>
                                    <option value="PUT">PUT</option>
                                    <option value="DELETE">DELETE</option>
                                    <option value="PATCH">PATCH</option>
                                </select>
                            </div>
                            <div className="filter-item">
                                <label htmlFor="filter-request-uri">요청 URL:</label>
                                <input
                                    id="filter-request-uri"
                                    type="text"
                                    value={filters.requestUri}
                                    onChange={(e) => handleFilterChange("requestUri", e.target.value)}
                                    placeholder="예: /api/users"
                                />
                            </div>
                        </div>
                        <div className="filter-actions">
                            <button onClick={fetchAccessLogs} className="btn-primary">
                                조회
                            </button>
                            <button onClick={handleResetFilters} className="btn-secondary">
                                초기화
                            </button>
                        </div>
                    </div>

                    {/* 로그 테이블 */}
                    <div className="logs-table-container">
                        {loading ? (
                            <div className="loading">로딩 중...</div>
                        ) : (
                            <table className="logs-table">
                                <thead>
                                    <tr>
                                        <th>시간</th>
                                        <th>IP 주소</th>
                                        <th>사용자</th>
                                        <th>메서드</th>
                                        <th>요청 URI</th>
                                        <th>상태</th>
                                        <th>응답시간</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="no-data">
                                                조회된 로그가 없습니다.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id}>
                                                <td>{formatDateTime(log.accessTime)}</td>
                                                <td className="ip-address">{log.ipAddress}</td>
                                                <td>{log.username || "익명"}</td>
                                                <td className={`method-${log.requestMethod.toLowerCase()}`}>
                                                    {log.requestMethod}
                                                </td>
                                                <td className="uri">{log.requestUri}</td>
                                                <td className={getStatusColor(log.httpStatus)}>
                                                    {log.httpStatus || "-"}
                                                </td>
                                                <td>{log.responseTimeMs ? `${log.responseTimeMs}ms` : "-"}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}

            {/* 통계 탭 */}
            {activeTab === "stats" && (
                <div className="statistics-container">
                    <div className="stats-filters">
                        <div className="filter-item">
                            <label htmlFor="stats-start-time">시작 날짜:</label>
                            <input
                                id="stats-start-time"
                                type="datetime-local"
                                value={statsFilters.startTime}
                                onChange={(e) => setStatsFilters(prev => ({ ...prev, startTime: e.target.value }))}
                            />
                        </div>
                        <div className="filter-item">
                            <label htmlFor="stats-end-time">종료 날짜:</label>
                            <input
                                id="stats-end-time"
                                type="datetime-local"
                                value={statsFilters.endTime}
                                onChange={(e) => setStatsFilters(prev => ({ ...prev, endTime: e.target.value }))}
                            />
                        </div>
                        <button onClick={fetchStatistics} className="btn-primary">
                            조회
                        </button>
                    </div>

                    {loading ? (
                        <div className="loading">로딩 중...</div>
                    ) : statistics ? (
                        <div className="stats-grid">
                            <div className="stat-card">
                                <h3>총 접근 횟수</h3>
                                <div className="stat-value">{statistics.totalAccesses?.toLocaleString() || 0}</div>
                            </div>
                            <div className="stat-card">
                                <h3>고유 방문자 수</h3>
                                <div className="stat-value">{statistics.totalUniqueVisitors?.toLocaleString() || 0}</div>
                            </div>
                            <div className="stat-card">
                                <h3>에러 발생 횟수</h3>
                                <div className="stat-value error">{statistics.totalErrors?.toLocaleString() || 0}</div>
                            </div>

                            {/* 접근 페이지 */}
                            {statistics.dailyStatistics?.topAccessedPages && (
                                <div className="stat-card wide">
                                    <h3>접근 페이지</h3>
                                    <table className="mini-table">
                                        <thead>
                                            <tr>
                                                <th>URI</th>
                                                <th>접근 횟수</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {statistics.dailyStatistics.topAccessedPages.map((page, idx) => (
                                                <tr key={idx}>
                                                    <td>{page.uri}</td>
                                                    <td>{page.count?.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* 접근 IP */}
                            {statistics.dailyStatistics?.topAccessIps && (
                                <div className="stat-card wide">
                                    <h3>접근 IP</h3>
                                    <table className="mini-table">
                                        <thead>
                                            <tr>
                                                <th>IP 주소</th>
                                                <th>접근 횟수</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {statistics.dailyStatistics.topAccessIps.map((ip, idx) => (
                                                <tr key={idx}>
                                                    <td>{ip.ip}</td>
                                                    <td>{ip.count?.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="no-data">통계를 조회해주세요.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AccessLogs;
