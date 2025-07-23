import axios from 'axios';

// CSRF 토큰 읽기 함수
function getCSRFToken() {
    const matches = document.cookie.match(/(^| )XSRF-TOKEN=([^;]+)/);
    return matches ? decodeURIComponent(matches[2]) : null;
}

// 환경에 따른 API URL 설정
const getApiBaseUrl = () => {
    // 개발 환경 (localhost:3000에서 실행)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8080';
    }
    // 프로덕션 환경 (devzip.cloud에서 실행)
    return ''; // 상대 경로 사용 (Nginx 프록시를 통해)
};

// Axios 인스턴스 설정
const axiosConfig = axios.create({
    baseURL: getApiBaseUrl(),
    withCredentials: true, // 쿠키 포함
    headers: {
        'X-CSRF-Token': getCSRFToken(), // CSRF 토큰 추가
    },
});

export default axiosConfig;
