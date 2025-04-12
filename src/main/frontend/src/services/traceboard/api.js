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
export const getDashboardData = async (startDate, endDate) => {
  try {
    // Date 객체를 ISO 8601 형식의 문자열로 변환
    const formatDate = (date) => {
      if (date instanceof Date) {
        return date.toISOString();
      }
      return date;
    };
    
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    
    console.log(`대시보드 데이터 요청: ${formattedStartDate} ~ ${formattedEndDate}`);
    
    const response = await axios.get(`${API_URL}/dashboard`, {
      params: {
        start: formattedStartDate,
        end: formattedEndDate
      }
    });
    
    console.log('서버 응답 코드:', response.status);
    
    if (response.status === 200) {
      // 서버 응답 데이터 확인 및 로깅
      console.log('서버 응답 데이터 구조:', JSON.stringify(response.data, null, 2));
      
      let dashboardData = response.data;
      
      // 응답 데이터가 다양한 형태로 올 수 있으므로 처리
      if (response.data.success && response.data.data) {
        // success: true로 래핑된 응답 처리
        dashboardData = response.data.data;
        console.log('success: true 응답에서 data 추출');
      } else if (response.data.result && response.data.result.data) {
        // result 객체로 래핑된 응답 처리
        dashboardData = response.data.result.data;
        console.log('result 응답에서 data 추출');
      } else if (response.data.events) {
        // events 키가 직접 있는 경우
        dashboardData = response.data;
        console.log('events 키 포함 응답 사용');
      }
      
      // 빈 응답인지 확인 (실제 데이터가 있지만 이벤트 배열이 없는 경우도 처리)
      const hasStatisticalData = 
        dashboardData.eventTypeDistribution || 
        dashboardData.deviceDistribution || 
        dashboardData.totalEvents > 0;
      
      const isEmpty = 
        (!dashboardData) || 
        (Object.keys(dashboardData).length === 0) ||
        (Array.isArray(dashboardData) && dashboardData.length === 0) ||
        (!dashboardData.events && !dashboardData.totalUsers && !hasStatisticalData);
      
      if (isEmpty) {
        console.warn('서버에서 빈 데이터 응답이 반환되었습니다');
        return {
          success: true,
          message: '데이터가 없습니다. 선택한 날짜 범위에 기록된 이벤트가 없는 것 같습니다.',
          data: {
            totalUsers: 0,
            totalPageViews: 0,
            eventTypeDistribution: {
              pageView: 0,
              click: 0,
              scroll: 0,
              formSubmit: 0,
              custom: 0 // 커스텀 이벤트에 대한 기본값 추가
            },
            deviceDistribution: {
              mobile: 0,
              tablet: 0, 
              desktop: 0,
              unknown: 0 // 알 수 없는 디바이스에 대한 기본값 추가
            },
            browserDistribution: {}, // 브라우저 분포에 대한 기본값 추가
            timeDistribution: [], // 시간대별 분포에 대한 기본값 추가
            events: []
          }
        };
      }
      
      // 누락된 필드에 대한 기본값 설정
      if (!dashboardData.eventTypeDistribution) {
        dashboardData.eventTypeDistribution = {
          pageView: 0,
          click: 0,
          scroll: 0,
          formSubmit: 0,
          custom: 0
        };
      }
      
      if (!dashboardData.deviceDistribution) {
        dashboardData.deviceDistribution = {
          mobile: 0,
          tablet: 0,
          desktop: 0,
          unknown: 0
        };
      }
      
      if (!dashboardData.browserDistribution) {
        dashboardData.browserDistribution = {};
      }
      
      if (!dashboardData.events) {
        dashboardData.events = [];
      }
      
      return {
        success: true,
        message: '대시보드 데이터를 성공적으로 불러왔습니다.',
        data: dashboardData
      };
    } else {
      console.error('API 응답이 성공(200)이 아닙니다:', response.status);
      return {
        success: false,
        message: `서버 오류: ${response.status}`,
        data: null
      };
    }
  } catch (error) {
    console.error('대시보드 데이터 요청 중 오류 발생:', error);
    
    // 자세한 오류 메시지 생성
    let errorMessage = '데이터를 불러오는 중 오류가 발생했습니다.';
    
    if (error.response) {
      // 서버가 응답을 반환했지만 2xx 외의 상태 코드
      errorMessage = `서버 오류: ${error.response.status} - ${error.response.data.message || '알 수 없는 오류'}`;
      console.error('서버 응답 오류:', error.response.data);
    } else if (error.request) {
      // 요청이 이루어졌으나 응답이 오지 않음
      errorMessage = '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.';
      console.error('서버 응답 없음:', error.request);
    } else {
      // 요청 설정 중 오류 발생
      errorMessage = `요청 오류: ${error.message}`;
      console.error('요청 설정 오류:', error.message);
    }
    
    return {
      success: false,
      message: errorMessage,
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