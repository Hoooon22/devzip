import axios from '../utils/axiosConfig';

const API_URL = '/api/presence';
const ID_KEY = 'devzip.presence.id';

// 최신 스냅샷이 갱신될 때마다 window에 발행되는 이벤트 이름.
export const PRESENCE_EVENT = 'devzip:presence';

let lastSnapshot = null;

// 브라우저(기기) 단위 익명 식별자 — 탭이 여러 개여도 1명으로 집계된다.
const getClientId = () => {
  let id = window.localStorage.getItem(ID_KEY);
  if (!id) {
    id = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(ID_KEY, id);
  }
  return id;
};

/**
 * 실시간 접속자(presence) 서비스.
 * 로그인 여부와 무관하게 동작하며, 실패해도 조용히 무시되는 부가 기능입니다.
 */
const presenceService = {
  /** 마지막으로 받은 스냅샷 ({ total, pages }) — 아직 없으면 null */
  getLastSnapshot: () => lastSnapshot,

  /**
   * 현재 페이지의 하트비트를 보내고 접속 스냅샷을 받습니다.
   * 성공 시 PRESENCE_EVENT 커스텀 이벤트로 스냅샷을 발행합니다.
   * @param {string} page - 현재 라우트 경로 (예: '/pathfind')
   * @returns {Promise<{total: number, pages: Object}|null>} 스냅샷 (실패 시 null)
   */
  ping: async (page) => {
    try {
      const response = await axios.post(`${API_URL}/heartbeat`, { clientId: getClientId(), page });
      const snapshot = response.data?.data ?? null;
      if (snapshot) {
        lastSnapshot = snapshot;
        window.dispatchEvent(new CustomEvent(PRESENCE_EVENT, { detail: snapshot }));
      }
      return snapshot;
    } catch {
      return null;
    }
  },
};

export default presenceService;
