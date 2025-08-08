import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import authService from '../../services/AuthService';
import './LoginModal.scss';

const SignupModal = ({ isOpen, onClose, onSignupSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // 입력 시 에러 메시지 초기화
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError('사용자명을 입력해주세요.');
      return false;
    }
    
    if (formData.username.length < 3) {
      setError('사용자명은 3글자 이상이어야 합니다.');
      return false;
    }

    if (!formData.email.trim()) {
      setError('이메일을 입력해주세요.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('올바른 이메일 형식을 입력해주세요.');
      return false;
    }

    if (!formData.password) {
      setError('비밀번호를 입력해주세요.');
      return false;
    }

    if (formData.password.length < 6) {
      setError('비밀번호는 6글자 이상이어야 합니다.');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await authService.signup(
        formData.username,
        formData.email,
        formData.password
      );
      
      if (result.success) {
        setSuccess(result.message);
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        
        // 성공 메시지를 보여준 후 2초 뒤에 모달 닫기
        setTimeout(() => {
          if (onSignupSuccess) onSignupSuccess();
          onClose();
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError('회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="login-modal-backdrop" 
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div 
        className="login-modal signup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-modal-title"
      >
        <div className="login-modal-header">
          <h2 id="signup-modal-title">📝 회원가입</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="login-modal-body">
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">사용자명 *</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="사용자명을 입력하세요 (3글자 이상)"
                required
                disabled={loading}
                minLength={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">이메일 *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="이메일을 입력하세요"
                required
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">비밀번호 *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="비밀번호를 입력하세요 (6글자 이상)"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">비밀번호 확인 *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="비밀번호를 다시 입력하세요"
                required
                disabled={loading}
              />
            </div>
            
            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div className="success-message">
                ✅ {success}
              </div>
            )}
            
            <button 
              type="submit" 
              className={`login-button ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  가입 중...
                </>
              ) : (
                '회원가입'
              )}
            </button>
          </form>
          
          <div className="login-info">
            <p className="info-text">
              💡 일반 사용자 계정으로 가입됩니다. 관리자 계정은 별도로 생성됩니다.
            </p>
            <p className="info-text small">
              * 표시된 항목은 필수 입력사항입니다.
            </p>
          </div>

          <div className="auth-switch">
            <p className="auth-switch-text">이미 계정이 있으신가요?</p>
            <button 
              type="button" 
              className="auth-switch-button"
              onClick={() => {
                onClose();
                // 부모 컴포넌트에서 로그인 모달을 열도록 이벤트 전달
                if (window.openLoginModal) {
                  window.openLoginModal();
                }
              }}
            >
              로그인하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Portal을 사용하여 document.body에 직접 렌더링
  return createPortal(modalContent, document.body);
};

SignupModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSignupSuccess: PropTypes.func,
};

export default SignupModal;