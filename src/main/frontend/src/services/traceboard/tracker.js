/**
 * 트레이스보드 추적 스크립트
 * 웹사이트 방문자의 행동을 추적하여 서버로 전송합니다.
 */

const trackerConfig = {
  apiEndpoint: '/api/traceboard/event',
  trackClicks: true,
  trackPageViews: true,
  trackScroll: true,
  trackForms: true
};

// 브라우저 및 장치 정보 가져오기
const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let os = 'Unknown';
  let deviceType = 'desktop';
  
  // 브라우저 감지
  if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
  else if (ua.indexOf('Safari') > -1) browser = 'Safari';
  else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
  else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident/') > -1) browser = 'IE';
  else if (ua.indexOf('Edge') > -1) browser = 'Edge';
  
  // OS 감지
  if (ua.indexOf('Windows') > -1) os = 'Windows';
  else if (ua.indexOf('Mac') > -1) os = 'MacOS';
  else if (ua.indexOf('Linux') > -1) os = 'Linux';
  else if (ua.indexOf('Android') > -1) os = 'Android';
  else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) os = 'iOS';
  
  // 장치 타입 감지
  if (ua.indexOf('Mobile') > -1 || ua.indexOf('Android') > -1 || ua.indexOf('iPhone') > -1) {
    deviceType = 'mobile';
  } else if (ua.indexOf('iPad') > -1 || ua.indexOf('Tablet') > -1) {
    deviceType = 'tablet';
  }
  
  return { browser, os, deviceType };
};

// 쿠키 관련 유틸리티
const cookies = {
  set: (name, value, days = 365) => {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `; expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value}${expires}; path=/`;
  },
  
  get: (name) => {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }
};

// 고유 ID 생성
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// 사용자 세션 관리
const initSession = () => {
  // 사용자 ID
  let userId = cookies.get('tb_uid');
  if (!userId) {
    userId = generateId();
    cookies.set('tb_uid', userId);
  }
  
  // 세션 ID
  let sessionId = sessionStorage.getItem('tb_sid');
  if (!sessionId) {
    sessionId = generateId();
    sessionStorage.setItem('tb_sid', sessionId);
  }
  
  return { userId, sessionId };
};

// 이벤트 전송
const sendEvent = (eventType, eventData = {}) => {
  const { browser, os, deviceType } = getBrowserInfo();
  const { userId, sessionId } = initSession();
  
  const eventLog = {
    eventType,
    userId,
    sessionId,
    path: window.location.pathname,
    referrer: document.referrer || '',
    eventData: JSON.stringify(eventData || {}),
    deviceType,
    browser,
    os,
    userAgent: navigator.userAgent,
    occurredAt: new Date().toISOString()
  };
  
  // API로 데이터 전송
  return fetch(trackerConfig.apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventLog),
  })
  .then(response => response.json())
  .catch(error => {
    console.error('트레이스보드 이벤트 전송 오류:', error);
  });
};

// 클릭 이벤트 추적
const trackClicks = () => {
  if (!trackerConfig.trackClicks) return;
  
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a, button, [role="button"], input[type="submit"]');
    if (!target) return;
    
    const tagName = target.tagName.toLowerCase();
    const eventData = {
      elementType: tagName,
      elementId: target.id || '',
      elementClass: target.className || '',
      elementText: target.innerText?.substring(0, 100) || '',
    };
    
    if (tagName === 'a' && target.href) {
      eventData.href = target.href;
      eventData.isExternal = target.hostname !== window.location.hostname;
    }
    
    sendEvent('click', eventData);
  });
};

// 페이지 뷰 추적
const trackPageView = () => {
  if (!trackerConfig.trackPageViews) return;
  
  const eventData = {
    title: document.title,
    url: window.location.href,
  };
  
  sendEvent('pageView', eventData);
};

// 스크롤 추적
const trackScroll = () => {
  if (!trackerConfig.trackScroll) return;
  
  let scrollDepths = [25, 50, 75, 90];
  let depthsReached = [];
  
  const getScrollPercent = () => {
    const h = document.documentElement;
    const b = document.body;
    const st = 'scrollTop';
    const sh = 'scrollHeight';
    
    return (h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight) * 100;
  };
  
  window.addEventListener('scroll', () => {
    const scrollPercent = Math.round(getScrollPercent());
    
    scrollDepths.forEach(depth => {
      if (scrollPercent >= depth && !depthsReached.includes(depth)) {
        depthsReached.push(depth);
        sendEvent('scroll', { depth: depth });
      }
    });
  });
};

// 폼 제출 추적
const trackForms = () => {
  if (!trackerConfig.trackForms) return;
  
  document.addEventListener('submit', (e) => {
    const form = e.target;
    
    const eventData = {
      formId: form.id || '',
      formAction: form.action || '',
      formMethod: form.method || '',
    };
    
    sendEvent('formSubmit', eventData);
  });
};

// 트레이스보드 초기화
const initTracker = (config = {}) => {
  // 설정 병합
  Object.assign(trackerConfig, config);
  
  // 페이지 로드시 페이지뷰 이벤트 전송
  trackPageView();
  
  // 이벤트 리스너 설정
  trackClicks();
  trackScroll();
  trackForms();
};

// 커스텀 이벤트 트래킹
const trackEvent = (eventName, eventData = {}) => {
  return sendEvent(`custom_${eventName}`, eventData);
};

export { initTracker, trackEvent, trackPageView }; 