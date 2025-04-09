/**
 * TraceBoard SDK - 웹사이트의 사용자 행동을 추적하는 가벼운 JavaScript 라이브러리
 * v1.0.0
 */

(function(window, document) {
  'use strict';
  
  // 기본 설정
  const defaultConfig = {
    apiKey: null,
    apiEndpoint: 'https://api.traceboard.io/api/log/event',
    trackClicks: true,
    trackPageViews: true,
    trackScrollDepth: true,
    sampleRate: 100, // 100%의 사용자를 추적
    cookieDomain: window.location.hostname,
    cookieExpires: 365 // 쿠키 만료일 (일)
  };
  
  // 사용자 설정과 기본 설정 병합
  let config = { ...defaultConfig };
  
  // 사용자 정보 저장
  let userData = {
    sessionId: null,
    userId: null,
    pageViewCount: 0
  };
  
  // 브라우저 및 디바이스 정보 가져오기
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
    
    // 디바이스 타입 감지
    if (ua.indexOf('Mobile') > -1 || ua.indexOf('Android') > -1 || ua.indexOf('iPhone') > -1) {
      deviceType = 'mobile';
    } else if (ua.indexOf('iPad') > -1 || ua.indexOf('Tablet') > -1) {
      deviceType = 'tablet';
    }
    
    return { browser, os, deviceType };
  };
  
  // 쿠키 설정 및 가져오기 헬퍼 함수
  const cookies = {
    set: (name, value, days) => {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      const expires = '; expires=' + date.toUTCString();
      document.cookie = name + '=' + value + expires + '; path=/; domain=' + config.cookieDomain;
    },
    get: (name) => {
      const nameEQ = name + '=';
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
      }
      return null;
    },
    delete: (name) => {
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + config.cookieDomain;
    }
  };
  
  // 고유 ID 생성
  const generateId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  
  // 샘플링 테스트 (true인 경우 추적)
  const shouldTrack = () => {
    return Math.random() * 100 <= config.sampleRate;
  };
  
  // 세션 관리
  const initSession = () => {
    // 이미 있는 세션 ID 가져오기
    let sessionId = cookies.get('tb_sid');
    
    // 세션 ID가 없으면 새로 생성
    if (!sessionId) {
      sessionId = generateId();
      cookies.set('tb_sid', sessionId, 1); // 세션 쿠키 (1일)
    }
    
    // 사용자 ID 가져오기 (오랫동안 유지되는 쿠키)
    let userId = cookies.get('tb_uid');
    if (!userId) {
      userId = generateId();
      cookies.set('tb_uid', userId, config.cookieExpires);
    }
    
    userData.sessionId = sessionId;
    userData.userId = userId;
  };
  
  // 이벤트 보내기
  const sendEvent = (eventType, eventData = {}) => {
    if (!shouldTrack() || !config.apiKey) return;
    
    const { browser, os, deviceType } = getBrowserInfo();
    
    const data = {
      eventType: eventType,
      path: window.location.pathname,
      referrer: document.referrer,
      eventData: JSON.stringify(eventData),
      deviceType: deviceType,
      browser: browser,
      os: os,
      occurredAt: new Date().toISOString()
    };
    
    // 현재 좌표 정보가 있으면 추가 (선택적)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        data.latitude = position.coords.latitude;
        data.longitude = position.coords.longitude;
      });
    }
    
    // API로 데이터 보내기
    const url = config.apiEndpoint + '?apiKey=' + config.apiKey;
    
    // 비동기 전송 (fire-and-forget)
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
    
    // 개발 모드일 때 콘솔에 로그 출력
    if (config.debug) {
      console.log('[TraceBoard]', eventType, data);
    }
  };
  
  // 클릭 이벤트 추적
  const trackClicks = () => {
    document.addEventListener('click', function(e) {
      const target = e.target.closest('a, button, [role="button"], input[type="submit"], [data-tb-track]');
      if (!target) return;
      
      const tagName = target.tagName.toLowerCase();
      const elementId = target.id ? target.id : 'unknown';
      const elementText = target.innerText ? target.innerText.substring(0, 50) : '';
      const elementClass = target.className ? target.className : '';
      
      let elementData;
      if (tagName === 'a') {
        elementData = {
          type: 'link',
          id: elementId,
          text: elementText,
          class: elementClass,
          href: target.href,
          isExternal: target.hostname !== window.location.hostname
        };
      } else {
        elementData = {
          type: tagName,
          id: elementId,
          text: elementText,
          class: elementClass
        };
      }
      
      sendEvent('click', elementData);
    });
  };
  
  // 페이지 뷰 추적
  const trackPageView = () => {
    userData.pageViewCount++;
    
    const data = {
      title: document.title,
      url: window.location.href,
      count: userData.pageViewCount
    };
    
    sendEvent('page_view', data);
  };
  
  // 스크롤 깊이 추적
  const trackScrollDepth = () => {
    let scrollMarks = [25, 50, 75, 100];
    let marksReached = [];
    
    const getScrollPercent = () => {
      const h = document.documentElement;
      const b = document.body;
      const st = 'scrollTop';
      const sh = 'scrollHeight';
      
      return (h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight) * 100;
    };
    
    window.addEventListener('scroll', function() {
      const scrollPercent = Math.round(getScrollPercent());
      
      scrollMarks.forEach(mark => {
        if (scrollPercent >= mark && !marksReached.includes(mark)) {
          marksReached.push(mark);
          sendEvent('scroll_depth', { depth: mark });
        }
      });
    });
  };
  
  // 사용자 정의 이벤트
  const trackEvent = (eventName, eventData = {}) => {
    if (typeof eventName !== 'string' || eventName.length === 0) {
      console.error('[TraceBoard] 이벤트 이름은 필수입니다.');
      return;
    }
    
    sendEvent('custom_' + eventName, eventData);
  };
  
  // 사용자 식별 설정
  const setUser = (userId) => {
    userData.userId = userId;
    cookies.set('tb_uid', userId, config.cookieExpires);
    sendEvent('user_identify', { userId });
  };
  
  // 초기화 함수
  const init = (userConfig) => {
    // 사용자 설정과 기본 설정 병합
    config = { ...defaultConfig, ...userConfig };
    
    if (!config.apiKey) {
      console.error('[TraceBoard] API 키가 필요합니다.');
      return;
    }
    
    // 추적 대상인지 확인 (샘플링)
    if (!shouldTrack()) return;
    
    // 세션 초기화
    initSession();
    
    // 페이지 뷰 추적
    if (config.trackPageViews) {
      trackPageView();
      
      // SPA 지원 (history API)
      const pushState = history.pushState;
      history.pushState = function() {
        pushState.apply(this, arguments);
        trackPageView();
      };
      
      window.addEventListener('popstate', trackPageView);
    }
    
    // 클릭 추적
    if (config.trackClicks) {
      trackClicks();
    }
    
    // 스크롤 깊이 추적
    if (config.trackScrollDepth) {
      trackScrollDepth();
    }
  };
  
  // API 정의
  const TraceBoard = {
    init,
    trackEvent,
    setUser
  };
  
  // 전역 객체에 등록
  window.TraceBoard = TraceBoard;
  
})(window, document);