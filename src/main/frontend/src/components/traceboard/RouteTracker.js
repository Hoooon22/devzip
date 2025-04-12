import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../../services/traceboard/tracker';

/**
 * 라우트 변경을 감지하여 페이지 뷰 이벤트를 전송하는 컴포넌트
 * App.js에 이 컴포넌트를 BrowserRouter 내부에 포함시켜야 합니다.
 */
const RouteTracker = () => {
  const location = useLocation();
  
  useEffect(() => {
    // 페이지 변경될 때마다 페이지 뷰 이벤트 전송
    trackPageView();
    
    // 디버깅 용도
    console.log(`페이지 뷰 이벤트 전송: ${location.pathname}`);
  }, [location]);
  
  // 아무것도 렌더링하지 않음
  return null;
};

export default RouteTracker; 