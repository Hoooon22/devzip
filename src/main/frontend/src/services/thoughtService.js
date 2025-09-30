import axios from '../utils/axiosConfig';

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
      const response = await axios.post('/api/thoughts', { content });
      return response.data;
    } catch (error) {
      console.error('Failed to create thought:', error);
      throw error;
    }
  },

  /**
   * 새로운 생각 저장 (주제 포함)
   * @param {string} content - 생각 내용
   * @param {number|null} topicId - 주제 ID (null이면 주제 없이 저장)
   * @returns {Promise} 저장된 생각 데이터
   */
  createThoughtWithTopic: async (content, topicId) => {
    try {
      const payload = { content };
      if (topicId !== null) {
        payload.topicId = topicId;
      }
      const response = await axios.post('/api/thoughts', payload);
      return response.data;
    } catch (error) {
      console.error('Failed to create thought with topic:', error);
      throw error;
    }
  },

  /**
   * 모든 생각 목록 조회
   * @returns {Promise} 생각 목록
   */
  getAllThoughts: async () => {
    try {
      const response = await axios.get('/api/thoughts');
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
      const response = await axios.get(`/api/thoughts/${id}`);
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
      const response = await axios.get('/api/thoughts/map');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch thought map:', error);
      throw error;
    }
  },

  /**
   * 특정 주제의 생각 맵 데이터 조회 (태그별 그룹화)
   * @param {number} topicId - 주제 ID
   * @returns {Promise} 태그별 생각 맵 데이터
   */
  getThoughtMapByTopic: async (topicId) => {
    try {
      const response = await axios.get('/api/thoughts/map', {
        params: { topicId }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch thought map by topic:', error);
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
      const response = await axios.delete(`/api/thoughts/${id}`);
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
      const response = await axios.put(`/api/thoughts/${id}`, { content });
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
      const response = await axios.get('/api/thoughts/search', {
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