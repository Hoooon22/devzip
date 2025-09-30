import axios from '../utils/axiosConfig';

const API_URL = '/api/topics';

const topicService = {
  /**
   * 모든 주제 조회
   */
  getAllTopics: async () => {
    const response = await axios.get(API_URL);
    return response.data;
  },

  /**
   * 특정 주제 조회
   */
  getTopicById: async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  /**
   * 새로운 주제 생성
   */
  createTopic: async (name, description, color, emoji) => {
    const response = await axios.post(API_URL, {
      name,
      description,
      color,
      emoji
    });
    return response.data;
  },

  /**
   * 주제 수정
   */
  updateTopic: async (id, name, description, color, emoji) => {
    const response = await axios.put(`${API_URL}/${id}`, {
      name,
      description,
      color,
      emoji
    });
    return response.data;
  },

  /**
   * 주제 삭제
   */
  deleteTopic: async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  },

  /**
   * 주제명으로 검색
   */
  searchTopics: async (keyword) => {
    const response = await axios.get(`${API_URL}/search`, {
      params: { keyword }
    });
    return response.data;
  }
};

export default topicService;