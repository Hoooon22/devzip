import React, { useState, useEffect } from 'react';
import authService from '../../services/AuthService';
import AuthModal from './AuthModal';
import './UserStatus.scss';

const UserStatus = () => {
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      if (authService.isAuthenticated()) {
        const isValid = await authService.validateToken();
        if (isValid) {
          setUser(authService.getUserInfo());
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const handleSignup = () => {
    setAuthModalMode('signup');
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const getRoleDisplay = (role) => {
    switch (role) {
      case 'ROLE_ADMIN':
        return '👑 관리자';
      case 'ROLE_USER':
        return '👤 사용자';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="user-status loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="user-status">
      {user ? (
        <div className="user-info">
          <div className="user-details">
            <div className="user-avatar">
              {user.role === 'ROLE_ADMIN' ? '👑' : '👤'}
            </div>
            <div className="user-text">
              <div className="username">{user.username}</div>
              <div className="user-role">{getRoleDisplay(user.role)}</div>
            </div>
          </div>
          <button 
            className="logout-button"
            onClick={handleLogout}
            title="로그아웃"
          >
            🚪 로그아웃
          </button>
        </div>
      ) : (
        <div className="login-prompt">
          <div className="auth-buttons">
            <button 
              className="login-button"
              onClick={handleLogin}
            >
              🔐 로그인
            </button>
            <button 
              className="signup-button"
              onClick={handleSignup}
            >
              📝 회원가입
            </button>
          </div>
          <div className="login-hint">
            관리자는 로그인, 일반 사용자는 회원가입하세요
          </div>
        </div>
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialMode={authModalMode}
      />
    </div>
  );
};

export default UserStatus;