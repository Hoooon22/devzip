import axios from 'axios';

/**
 * 뮤직박스 REST API 클라이언트
 *
 * HTTP 요청으로 초기 그리드 상태를 가져오거나
 * 그리드를 초기화하는 용도입니다.
 */
const API_BASE_URL = '/api/musicbox';

/**
 * 현재 그리드 상태 조회
 *
 * @returns {Promise} 그리드 상태 데이터
 */
export const fetchGridState = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/grid`);
        console.log('✅ Grid state fetched:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Error fetching grid state:', error);
        throw error;
    }
};

/**
 * 특정 X 좌표의 활성화된 노트 조회
 *
 * @param {number} x - X 좌표
 * @returns {Promise} 활성화된 Y 좌표 배열
 */
export const fetchActiveNotesAt = async (x) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/notes/${x}`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error fetching notes at x=${x}:`, error);
        throw error;
    }
};

/**
 * 그리드 전체 클리어 (HTTP 방식)
 *
 * @returns {Promise} 응답
 */
export const clearGrid = async () => {
    try {
        const response = await axios.delete(`${API_BASE_URL}/grid`);
        console.log('✅ Grid cleared successfully');
        return response.data;
    } catch (error) {
        console.error('❌ Error clearing grid:', error);
        throw error;
    }
};
