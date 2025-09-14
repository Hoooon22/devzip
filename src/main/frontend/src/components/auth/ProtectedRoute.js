import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import authService from '../../services/AuthService';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (!authService.isAuthenticated()) {
        setLoading(false);
        return;
      }

      const isValid = await authService.validateToken();
      if (isValid) {
        setAuthenticated(true);
        setIsAdmin(authService.isAdmin());
      } else {
        // 토큰이 유효하지 않은 경우, 인증 상태를 false로 설정
        setAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '1.2rem'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '2rem',
          borderRadius: '15px',
          textAlign: 'center'
        }}>
          🔐 인증 확인 중...
        </div>
      </div>
    );
  }

  // 인증이 필요한데 인증되지 않은 경우
  if (!authenticated) {
    alert('로그인이 필요합니다.');
    return <Navigate to="/" replace />;
  }

  // 관리자 권한이 필요한데 관리자가 아닌 경우
  if (requireAdmin && !isAdmin) {
    alert('관리자 권한이 필요합니다.');
    return <Navigate to="/" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requireAdmin: PropTypes.bool,
};

ProtectedRoute.defaultProps = {
  requireAdmin: false,
};

export default ProtectedRoute;