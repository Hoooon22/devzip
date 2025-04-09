import React, { useEffect } from 'react';

/**
 * 반응형 디자인을 위한 뷰포트 설정 컴포넌트
 * - 모바일 화면에서 올바른 스케일링 적용
 * - CSS의 vh 단위를 실제 뷰포트 높이에 맞게 설정
 */
const ViewportMeta = () => {
  // 뷰포트 높이 CSS 변수 설정 함수
  const setViewportHeight = () => {
    // 실제 뷰포트 높이의 1%를 계산
    const vh = window.innerHeight * 0.01;
    // CSS 변수로 설정
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  useEffect(() => {
    // 컴포넌트 마운트 시 실행
    setViewportHeight();

    // 화면 크기 변경 시 뷰포트 높이 재계산
    const handleResize = () => {
      // 디바운싱을 위한 타임아웃
      setTimeout(setViewportHeight, 150);
    };
    
    // 이벤트 리스너 등록
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // 이 컴포넌트는 UI를 렌더링하지 않음
  return null;
};

export default ViewportMeta; 