import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import presenceService from '../services/presenceService';

const PING_INTERVAL_MS = 30_000;

// 라우트 변경 시 + 30초 주기로 presence 하트비트를 보내는 무렌더 컴포넌트.
// App 최상단(BrowserRouter 안)에 한 번만 마운트한다.
const PresencePing = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    presenceService.ping(pathname);
    const id = setInterval(() => presenceService.ping(pathname), PING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pathname]);

  return null;
};

export default PresencePing;
