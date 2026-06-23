import axios from '../utils/axiosConfig';

const API_URL = '/api/pins';

/**
 * 프로젝트(카드) 고정(핀) 서비스.
 * 조회는 누구나 가능하며, 설정 변경은 관리자만 가능합니다(토큰은 axios 인터셉터가 자동 첨부).
 */
const pinService = {
  /**
   * 관리자가 설정한 고정 override 를 { projectKey: boolean } 형태로 조회합니다.
   * @returns {Promise<Object>} 고정 맵 (실패 시 빈 객체)
   */
  getPins: async () => {
    try {
      const response = await axios.get(API_URL);
      return response.data?.data ?? {};
    } catch (error) {
      console.error('Failed to fetch pins:', error);
      return {};
    }
  },

  /**
   * 특정 프로젝트의 고정 여부를 설정합니다. (관리자 전용)
   * @param {string} projectKey - 프로젝트 식별자 (project.link)
   * @param {boolean} pinned - 고정 여부
   * @returns {Promise<boolean|null>} 갱신된 고정 여부 (실패 시 null)
   */
  setPin: async (projectKey, pinned) => {
    try {
      const response = await axios.post(API_URL, { projectKey, pinned });
      return response.data?.data ?? null;
    } catch (error) {
      console.error('Failed to set pin:', error);
      return null;
    }
  },
};

export default pinService;
