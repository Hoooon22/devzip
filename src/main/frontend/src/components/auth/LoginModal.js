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

const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(() => (readDark() ? 'dark' : 'light'));

  useEffect(() => {
    if (isOpen) setTheme(readDark() ? 'dark' : 'light');
  }, [isOpen]);

  // ESC 닫기 + 배경 스크롤 잠금 (모달이 열려 있는 동안만)
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authService.login(formData.username, formData.password);

      if (result.success) {
        setFormData({ username: '', password: '' });
        onLoginSuccess(result.user);
        onClose();
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="mono-modal-backdrop"
      data-theme={theme}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="mono-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
      >
        <div className="mono-modal-head">
          <div className="cmd">
            <span className="prompt">$</span>
            <span className="title" id="login-modal-title">login</span>
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
                placeholder="사용자명"
                autoComplete="username"
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
                placeholder="비밀번호"
                autoComplete="current-password"
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

            <button
              type="submit"
              className="mono-modal-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="mono-modal-spinner" aria-hidden="true" />
                  <span>로그인 중…</span>
                </>
              ) : (
                <>
                  <span>로그인</span>
                  <span className="arrow" aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          <div className="mono-modal-info">
            <p className="comment">로그인하면 방명록과 실시간 채팅을 이용할 수 있습니다.</p>
            <p className="req">대시보드·트레이스보드는 관리자 계정만 접근할 수 있습니다.</p>
          </div>

          <div className="mono-modal-switch">
            <span className="lead">no account?</span>
            <button
              type="button"
              className="switch-btn"
              onClick={() => {
                if (window.openSignupModal) window.openSignupModal();
              }}
            >
              signup →
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

LoginModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onLoginSuccess: PropTypes.func.isRequired,
};

export default LoginModal;
