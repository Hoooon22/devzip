/**
 * TraceBoard API 서비스
 * 백엔드 API와 통신하여 이벤트 로그 데이터를 가져오는 함수들을 제공합니다.
 */
import axios from 'axios';

// API 기본 URL
const API_URL = '/api/traceboard';

/**
 * 이벤트 로그 수집 API
 * @param {Object} eventData - 수집할 이벤트 데이터
 * @returns {Promise} - API 응답 Promise
 */
export const collectEvent = async (eventData) => {
  try {
    const response = await axios.post(`${API_URL}/event`, eventData);
    return response.data;
  } catch (error) {
    console.error('이벤트 수집 중 오류 발생:', error);
    throw error;
  }
};

/**
 * 대시보드 데이터 조회 API
 * @param {Date|string} start - 시작 날짜/시간 (ISO 문자열 또는 Date 객체)
 * @param {Date|string} end - 종료 날짜/시간 (ISO 문자열 또는 Date 객체)
 * @returns {Promise} - API 응답 Promise
 */
export const getDashboardData = async (start, end) => {
  try {
    // Date 객체를 ISO 8601 형식의 문자열로 변환
    const formatDate = (date) => {
      if (date instanceof Date) {
        return date.toISOString();
      }
      return date;
    };

    // 쿼리 파라미터 구성
    const params = {};
    if (start) params.start = formatDate(start);
    if (end) params.end = formatDate(end);

    const response = await axios.get(`${API_URL}/dashboard`, { params });
    
    if (response.data && response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || ''
      };
    } else {
      // 서버에서 오류 응답을 보낸 경우
      console.error('대시보드 데이터 조회 실패:', response.data);
      return {
        success: false,
        message: response.data.message || '데이터를 가져오는데 실패했습니다.',
        data: null
      };
    }
  } catch (error) {
    console.error('대시보드 데이터 조회 중 오류 발생:', error);
    return {
      success: false,
      message: error.message || '서버 연결 오류가 발생했습니다.',
      data: null
    };
  }
};

/**
 * 모든 이벤트 로그 조회 API
 * @param {Object} options - 조회 옵션
 * @param {Date|string} options.start - 시작 날짜/시간
 * @param {Date|string} options.end - 종료 날짜/시간
 * @param {string} options.eventType - 이벤트 유형
 * @param {string} options.userId - 사용자 ID
 * @returns {Promise} - API 응답 Promise
 */
export const getEventLogs = async (options = {}) => {
  try {
    // Date 객체를 ISO 8601 형식의 문자열로 변환
    const formatDate = (date) => {
      if (date instanceof Date) {
        return date.toISOString();
      }
      return date;
    };

    // 쿼리 파라미터 구성
    const params = {};
    if (options.start) params.start = formatDate(options.start);
    if (options.end) params.end = formatDate(options.end);
    if (options.eventType) params.eventType = options.eventType;
    if (options.userId) params.userId = options.userId;

    const response = await axios.get(`${API_URL}/events`, { params });
    
    if (response.data && response.data.success) {
      return {
        success: true,
        data: response.data.data,
        count: response.data.count,
        message: response.data.message || ''
      };
    } else {
      return {
        success: false,
        message: response.data.message || '이벤트 로그 조회에 실패했습니다.',
        data: []
      };
    }
  } catch (error) {
    console.error('이벤트 로그 조회 중 오류 발생:', error);
    return {
      success: false,
      message: error.message || '서버 연결 오류가 발생했습니다.',
      data: []
    };
  }
}; 