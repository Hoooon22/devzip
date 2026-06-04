import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import PropTypes from 'prop-types';

/* DevZip — 사이트 전역 게이미피케이션 상태.
   방문자의 활동(프로젝트 탐험, 로그인, 이스터에그 등)에 XP를 부여하고
   레벨/진행도를 계산해 사이트 어디서든 동일하게 노출한다.
   상태는 localStorage에 보관되어 재방문 시 이어진다. */

const STORAGE_XP = 'devzip.game.xp';
const STORAGE_SEEN = 'devzip.game.seen';

// 누적 XP 임계값: L1=0, L2=100, L3=300, L4=600, L5=1000 … (완만한 삼각수 곡선)
const thresholdFor = (level) => 50 * (level - 1) * level;

const levelFromXp = (xp) => {
  let level = 1;
  while (thresholdFor(level + 1) <= xp) level += 1;
  return level;
};

// 레벨마다 부여하는 별칭 — 게임적 재미 요소.
const TITLES = [
  '뉴비 탐험가',
  '호기심 코더',
  '사이드 프로젝트 헌터',
  '디지털 탐험가',
  '데브집 단골',
  '숨은 기능 마스터',
  '레전드 빌더',
];

const titleFor = (level) => TITLES[Math.min(level - 1, TITLES.length - 1)];

const readNumber = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

const readSeen = () => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_SEEN)) || {};
  } catch {
    return {};
  }
};

const GameContext = createContext(null);

let toastSeq = 0;

export const GameProvider = ({ children }) => {
  const [xp, setXp] = useState(() => readNumber(STORAGE_XP, 0));
  const [toasts, setToasts] = useState([]);
  const [levelUp, setLevelUp] = useState(null); // { level, title } | null
  const [celebrations, setCelebrations] = useState(0); // confetti 트리거 카운터
  const seenRef = useRef(readSeen());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_XP, String(xp));
  }, [xp]);

  const pushToast = useCallback((toast) => {
    toastSeq += 1;
    const id = toastSeq;
    setToasts((prev) => [...prev, { id, ...toast }]);
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const celebrate = useCallback(() => {
    setCelebrations((c) => c + 1);
  }, []);

  /* XP 부여. once=true 인 보상은 key 기준으로 한 번만 지급한다. */
  const award = useCallback((amount, reason, opts = {}) => {
    const { once = false, key = reason, icon = '✨' } = opts;
    if (once) {
      if (seenRef.current[key]) return false;
      seenRef.current[key] = true;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_SEEN, JSON.stringify(seenRef.current));
      }
    }

    setXp((prev) => {
      const next = prev + amount;
      const before = levelFromXp(prev);
      const after = levelFromXp(next);
      if (after > before) {
        setLevelUp({ level: after, title: titleFor(after) });
        setCelebrations((c) => c + 1);
      }
      return next;
    });

    pushToast({ amount, reason, icon });
    return true;
  }, [pushToast]);

  const clearLevelUp = useCallback(() => setLevelUp(null), []);

  const value = useMemo(() => {
    const level = levelFromXp(xp);
    const base = thresholdFor(level);
    const next = thresholdFor(level + 1);
    const span = next - base;
    const into = xp - base;
    return {
      xp,
      level,
      title: titleFor(level),
      intoLevel: into,
      levelSpan: span,
      toNext: next - xp,
      progress: span > 0 ? into / span : 1,
      toasts,
      levelUp,
      celebrations,
      award,
      celebrate,
      dismissToast,
      clearLevelUp,
    };
  }, [xp, toasts, levelUp, celebrations, award, celebrate, dismissToast, clearLevelUp]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

GameProvider.propTypes = {
  children: PropTypes.node,
};

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) {
    // Provider 밖에서 호출돼도 앱이 죽지 않도록 무해한 no-op 폴백 제공.
    return {
      xp: 0,
      level: 1,
      title: TITLES[0],
      intoLevel: 0,
      levelSpan: 100,
      toNext: 100,
      progress: 0,
      toasts: [],
      levelUp: null,
      celebrations: 0,
      award: () => false,
      celebrate: () => {},
      dismissToast: () => {},
      clearLevelUp: () => {},
    };
  }
  return ctx;
};

export default GameContext;
