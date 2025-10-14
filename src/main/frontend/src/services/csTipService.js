import axios from '../utils/axiosConfig';

/**
 * CS Tip Service
 * Hopperbox 패턴을 따르는 서비스 레이어
 */
const csTipService = {
  /**
   * 오늘의 CS 팁 조회
   * @returns {Promise} API 응답 객체 (response.data에 문자열 포함)
   */
  getDailyTip: async () => {
    try {
      const response = await axios.get('/api/cs-tip');
      // axios는 자동으로 response를 { data, status, headers, ... } 형태로 반환
      // 백엔드에서 ResponseEntity<String>을 반환하므로 response.data가 직접 문자열
      return response;
    } catch (error) {
      console.error('Failed to fetch daily CS tip:', error);
      throw error;
    }
  },
};

export default csTipService;
