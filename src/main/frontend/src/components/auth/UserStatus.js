import React, { useState, useEffect } from 'react';
import authService from '../../services/AuthService';
import LoginModal from './LoginModal';
import './UserStatus.scss';

const UserStatus = () => {
  const [user, setUser] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
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
    setIsLoginModalOpen(true);
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
          <button 
            className="login-button"
            onClick={handleLogin}
          >
            🔐 관리자 로그인
          </button>
          <div className="login-hint">
            대시보드/트레이스보드 접근을 위해 로그인하세요
          </div>
        </div>
      )}

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default UserStatus;