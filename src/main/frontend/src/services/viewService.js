import axios from '../utils/axiosConfig';

const API_URL = '/api/views';

/**
 * 프로젝트(카드) 조회수 서비스.
 * 로그인 여부와 무관하게 동작합니다.
 */
const viewService = {
  /**
   * 전체 프로젝트 조회수를 { projectKey: viewCount } 형태로 조회합니다.
   * @returns {Promise<Object>} 조회수 맵 (실패 시 빈 객체)
   */
  getViewCounts: async () => {
    try {
      const response = await axios.get(API_URL);
      return response.data?.data ?? {};
    } catch (error) {
      console.error('Failed to fetch view counts:', error);
      return {};
    }
  },

  /**
   * 특정 프로젝트의 조회수를 1 증가시킵니다.
   * @param {string} projectKey - 프로젝트 식별자 (project.link)
   * @returns {Promise<number|null>} 갱신된 조회수 (실패 시 null)
   */
  incrementView: async (projectKey) => {
    try {
      const response = await axios.post(`${API_URL}/increment`, { projectKey });
      return response.data?.data ?? null;
    } catch (error) {
      console.error('Failed to increment view count:', error);
      return null;
    }
  },
};

export default viewService;
