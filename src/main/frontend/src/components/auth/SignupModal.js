import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import authService from '../../services/AuthService';
import './LoginModal.scss';

const STORAGE_KEY_DARK = 'devzip.mono.dark';

const readDark = () => {
  if (typeof window === 'undefined') return false;
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY_DARK)) === true;
  } catch {
    return false;
  }
};

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
  const [theme, setTheme] = useState(() => (readDark() ? 'dark' : 'light'));

  useEffect(() => {
    if (isOpen) setTheme(readDark() ? 'dark' : 'light');
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
    if (!validateForm()) return;

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
        setFormData({ username: '', email: '', password: '', confirmPassword: '' });

        setTimeout(() => {
          if (onSignupSuccess) onSignupSuccess();
          onClose();
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="mono-modal-backdrop"
      data-theme={theme}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        className="mono-modal signup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-modal-title"
      >
        <div className="mono-modal-head">
          <div className="cmd">
            <span className="prompt">$</span>
            <span className="title" id="signup-modal-title">signup</span>
            <span className="cursor">_</span>
          </div>
          <button type="button" className="close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="mono-modal-body">
          <form onSubmit={handleSubmit} className="mono-modal-form">
            <div className="mono-modal-field">
              <label htmlFor="username">username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="사용자명 (3자 이상)"
                required
                disabled={loading}
                minLength={3}
              />
            </div>

            <div className="mono-modal-field">
              <label htmlFor="email">email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="user@example.com"
                required
                disabled={loading}
              />
            </div>

            <div className="mono-modal-field">
              <label htmlFor="password">password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="비밀번호 (6자 이상)"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <div className="mono-modal-field">
              <label htmlFor="confirmPassword">confirm password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="비밀번호를 다시 입력"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="mono-modal-alert err" role="alert">
                <span className="prefix">!</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mono-modal-alert ok" role="status">
                <span className="prefix">+</span>
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              className="mono-modal-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="mono-modal-spinner" aria-hidden="true" />
                  <span>가입 중…</span>
                </>
              ) : (
                <>
                  <span>회원가입</span>
                  <span className="arrow" aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          <div className="mono-modal-info">
            <p className="comment">일반 사용자 계정으로 가입됩니다. 관리자 계정은 별도로 생성됩니다.</p>
            <p className="req">표시된 항목은 모두 필수 입력값입니다.</p>
          </div>

          <div className="mono-modal-switch">
            <span className="lead">already registered?</span>
            <button
              type="button"
              className="switch-btn"
              onClick={() => {
                onClose();
                if (window.openLoginModal) {
                  window.openLoginModal();
                }
              }}
            >
              login →
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

SignupModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSignupSuccess: PropTypes.func,
};

export default SignupModal;
