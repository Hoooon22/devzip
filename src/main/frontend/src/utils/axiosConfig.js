// axiosConfig.js
import axios from 'axios';

// CSRF 토큰 설정
axios.defaults.xsrfCookieName = 'csrftoken'; // 서버에서 설정한 CSRF 쿠키 이름
axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN'; // 서버에서 사용하는 CSRF 헤더 이름

// 기본 API URL 설정
axios.defaults.baseURL = 'https://devzip.site'; // 로컬 개발 서버의 기본 URL, 프로덕션 서버에 맞게 변경 가능

// 추가적인 설정 (필요시)
axios.defaults.withCredentials = true; // 쿠키 포함 요청 설정

// 요청 인터셉터 설정 (필요시)
axios.interceptors.request.use(
    (config) => {
        // 예시: 인증 토큰 추가, 필요시 설정
        // config.headers['Authorization'] = `Bearer ${token}`;
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default axios;
