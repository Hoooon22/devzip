// axiosConfig.js
import axios from 'axios';

// CSRF 토큰 설정
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';

// 여기서 추가적인 설정도 가능
axios.defaults.baseURL = 'https://devzip.site';  // 기본 API URL 설정

export default axios;
