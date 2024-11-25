import axios from 'axios';

// CSRF 토큰 읽기 함수
function getCSRFToken() {
    const matches = document.cookie.match(/(^| )XSRF-TOKEN=([^;]+)/);
    return matches ? decodeURIComponent(matches[2]) : null;
}

// Axios 인스턴스 설정
const axiosConfig = axios.create({
    baseURL: 'https://devzip.site',
    withCredentials: true, // 쿠키 포함
    headers: {
        'X-CSRF-Token': getCSRFToken(), // CSRF 토큰 추가
    },
});

export default axiosConfig;
