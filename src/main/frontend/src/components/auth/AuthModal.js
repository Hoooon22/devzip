import React, { useState, useEffect } from 'react';
import LoginModal from './LoginModal';
import SignupModal from './SignupModal';

const AuthModal = ({ isOpen, onClose, onLoginSuccess, initialMode = 'login' }) => {
  const [currentMode, setCurrentMode] = useState(initialMode); // 'login' or 'signup'

  // 전역 함수로 모달 전환 기능 등록
  useEffect(() => {
    if (isOpen) {
      window.openLoginModal = () => setCurrentMode('login');
      window.openSignupModal = () => setCurrentMode('signup');
    } else {
      // 모달이 닫힐 때 전역 함수 정리
      delete window.openLoginModal;
      delete window.openSignupModal;
    }

    return () => {
      delete window.openLoginModal;
      delete window.openSignupModal;
    };
  }, [isOpen]);

  const handleSignupSuccess = () => {
    // 회원가입 성공 시 로그인 모달로 전환
    setCurrentMode('login');
  };

  const handleClose = () => {
    setCurrentMode(initialMode);
    onClose();
  };

  if (currentMode === 'login') {
    return (
      <LoginModal
        isOpen={isOpen}
        onClose={handleClose}
        onLoginSuccess={onLoginSuccess}
      />
    );
  }

  return (
    <SignupModal
      isOpen={isOpen}
      onClose={handleClose}
      onSignupSuccess={handleSignupSuccess}
    />
  );
};

export default AuthModal;