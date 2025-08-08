import axios from '../utils/axiosConfig';

const AUTH_TOKEN_KEY = 'devzip_auth_token';
const USER_INFO_KEY = 'devzip_user_info';

class AuthService {
  // 로그인
  async login(username, password) {
    try {
      const response = await axios.post('/api/auth/signin', {
        username,
        password
      });
      
      const { token, username: user, email, role } = response.data;
      
      // 토큰과 사용자 정보를 localStorage에 저장
      this.setToken(token);
      this.setUserInfo({ username: user, email, role });
      
      return {
        success: true,
        user: { username: user, email, role }
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || '로그인에 실패했습니다.'
      };
    }
  }

  // 회원가입
  async signup(username, email, password) {
    try {
      const response = await axios.post('/api/auth/signup', {
        username,
        email,
        password
      });
      
      return {
        success: true,
        message: response.data.message || '회원가입이 완료되었습니다.'
      };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        message: error.response?.data?.message || '회원가입에 실패했습니다.'
      };
    }
  }

  // 로그아웃
  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
  }

  // 토큰 저장
  setToken(token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  // 토큰 가져오기
  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  // 사용자 정보 저장
  setUserInfo(userInfo) {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
  }

  // 사용자 정보 가져오기
  getUserInfo() {
    const userInfo = localStorage.getItem(USER_INFO_KEY);
    return userInfo ? JSON.parse(userInfo) : null;
  }

  // 인증 상태 확인
  isAuthenticated() {
    const token = this.getToken();
    return token !== null && token !== undefined;
  }

  // 관리자 권한 확인
  isAdmin() {
    const userInfo = this.getUserInfo();
    return userInfo && userInfo.role === 'ROLE_ADMIN';
  }

  // 토큰 유효성 검증
  async validateToken() {
    try {
      const token = this.getToken();
      if (!token) return false;

      const response = await axios.get('/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const { valid, username, role } = response.data;
      
      if (valid) {
        // 사용자 정보 업데이트
        this.setUserInfo({ username, role });
        return true;
      } else {
        // 토큰이 무효하면 로그아웃 처리
        this.logout();
        return false;
      }
    } catch (error) {
      console.error('Token validation error:', error);
      this.logout();
      return false;
    }
  }

  // 인증이 필요한 요청에 토큰 추가
  getAuthHeader() {
    const token = this.getToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  // 관리자 권한이 필요한 페이지 접근 시 권한 확인
  requireAdmin() {
    if (!this.isAuthenticated()) {
      throw new Error('로그인이 필요합니다.');
    }
    
    if (!this.isAdmin()) {
      throw new Error('관리자 권한이 필요합니다.');
    }
    
    return true;
  }

  // 현재 사용자명 반환
  getCurrentUsername() {
    const userInfo = this.getUserInfo();
    return userInfo ? userInfo.username : null;
  }

  // 현재 사용자 역할 반환
  getCurrentUserRole() {
    const userInfo = this.getUserInfo();
    return userInfo ? userInfo.role : null;
  }
}

// 싱글톤 인스턴스 생성
const authService = new AuthService();

// axios 인터셉터 설정 - 모든 요청에 자동으로 토큰 추가
axios.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 설정 - 401 에러 시 자동 로그아웃
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authService.logout();
      // 현재 페이지가 보호된 페이지라면 메인으로 리다이렉트
      if (window.location.pathname === '/dashboard' || window.location.pathname === '/traceboard') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default authService;