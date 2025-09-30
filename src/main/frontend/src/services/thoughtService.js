import axios from 'axios';

// API 기본 URL 설정
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

const thoughtAPI = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
thoughtAPI.interceptors.request.use(
  (config) => {
    // 토큰이 필요한 경우 여기에 추가
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터
thoughtAPI.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // 서버 응답 에러
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // 요청은 보냈지만 응답 없음
      console.error('No response from server');
    } else {
      // 요청 설정 중 에러
      console.error('Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Thought Service
 */
const thoughtService = {
  /**
   * 새로운 생각 저장
   * @param {string} content - 생각 내용
   * @returns {Promise} 저장된 생각 데이터
   */
  createThought: async (content) => {
    try {
      const response = await thoughtAPI.post('/thoughts', { content });
      return response.data;
    } catch (error) {
      console.error('Failed to create thought:', error);
      throw error;
    }
  },

  /**
   * 모든 생각 목록 조회
   * @returns {Promise} 생각 목록
   */
  getAllThoughts: async () => {
    try {
      const response = await thoughtAPI.get('/thoughts');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch thoughts:', error);
      throw error;
    }
  },

  /**
   * 특정 생각 조회
   * @param {number} id - 생각 ID
   * @returns {Promise} 생각 데이터
   */
  getThoughtById: async (id) => {
    try {
      const response = await thoughtAPI.get(`/thoughts/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch thought:', error);
      throw error;
    }
  },

  /**
   * 생각 맵 데이터 조회 (태그별 그룹화)
   * @returns {Promise} 태그별 생각 맵 데이터
   */
  getThoughtMap: async () => {
    try {
      const response = await thoughtAPI.get('/thoughts/map');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch thought map:', error);
      throw error;
    }
  },

  /**
   * 생각 삭제
   * @param {number} id - 생각 ID
   * @returns {Promise}
   */
  deleteThought: async (id) => {
    try {
      const response = await thoughtAPI.delete(`/thoughts/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete thought:', error);
      throw error;
    }
  },

  /**
   * 생각 수정
   * @param {number} id - 생각 ID
   * @param {string} content - 수정할 내용
   * @returns {Promise} 수정된 생각 데이터
   */
  updateThought: async (id, content) => {
    try {
      const response = await thoughtAPI.put(`/thoughts/${id}`, { content });
      return response.data;
    } catch (error) {
      console.error('Failed to update thought:', error);
      throw error;
    }
  },

  /**
   * 태그로 생각 검색
   * @param {string} tag - 검색할 태그
   * @returns {Promise} 검색 결과
   */
  searchByTag: async (tag) => {
    try {
      const response = await thoughtAPI.get('/thoughts/search', {
        params: { tag },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to search thoughts by tag:', error);
      throw error;
    }
  },
};

export default thoughtService;