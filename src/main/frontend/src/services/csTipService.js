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

  /**
   * 오늘의 농담 조회 (Daily Joke - 캐싱 적용)
   * 메인 페이지에서 사용, 자정에 초기화
   * @returns {Promise} API 응답 객체 (response.data에 TranslatedJoke 객체 포함)
   */
  getDailyJoke: async () => {
    try {
      const response = await axios.get('/api/joke/daily');
      return response;
    } catch (error) {
      console.error('Failed to fetch daily joke:', error);
      throw error;
    }
  },

  /**
   * 번역된 농담 조회 (Joke API - 매번 새로운 농담)
   * @returns {Promise} API 응답 객체 (response.data에 TranslatedJoke 객체 포함)
   */
  getJoke: async () => {
    try {
      const response = await axios.get('/api/joke');
      // 백엔드에서 ResponseEntity<TranslatedJoke>를 반환
      // response.data = {
      //   originalSetup: string,
      //   originalPunchline: string,
      //   translatedSetup: string,
      //   translatedPunchline: string,
      //   type: string
      // }
      return response;
    } catch (error) {
      console.error('Failed to fetch joke:', error);
      throw error;
    }
  },
};

export default csTipService;
