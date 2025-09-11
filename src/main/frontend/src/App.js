import React, { useEffect } from 'react';
import './App.css';
import Main from "./pages/Main";
import Guestbook from "./pages/Guestbook";
import Joke from "./pages/Joke";
// import Lolpatch from "./pages/Lolpatch";
import ApiPage from './pages/ApiPage';
import Dashboard from './pages/Dashboard';
import TrendChat from './pages/TrendChat';
import ChatRoomPage from "./pages/ChatRoomPage";
import TraceBoard from './pages/traceboard/index.js';
import PhysicsQuiz from './pages/PhysicsQuiz';
import LiveChatListPage from "./pages/LiveChatListPage";
import LiveChatRoomPage from "./pages/LiveChatRoomPage";
import ViewportMeta from './components/ViewportMeta';
import RouteTracker from './components/traceboard/RouteTracker';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { Routes, Route, BrowserRouter } from "react-router-dom";
import { initTracker } from './services/traceboard/tracker';

function App() {
  // 트래커 초기화
  useEffect(() => {
    // 트레이스보드 초기화
    initTracker({
      // 필요한 경우 설정 변경
      trackClicks: true,
      trackPageViews: true,
      trackScroll: true,
      trackForms: true
    });
    
    console.log('트레이스보드 트래커가 초기화되었습니다.');
  }, []);

  return (
    <BrowserRouter>
      {/* 반응형 뷰포트 설정 컴포넌트 */}
      <ViewportMeta />
      
      {/* 라우트 추적 컴포넌트 */}
      <RouteTracker />
      
      <Routes>
        {/* 메인 페이지 */}
        <Route path="/" element={<Main />} /> 

        {/* 방명록 페이지 */}
        <Route path="/Guestbook" element={<Guestbook />} />

        {/* 농담 페이지 */}
        <Route path="/Joke" element={<Joke />} />

        {/* api 모음 페이지 */}
        <Route path="/apiPage" element={<ApiPage />} />

        {/* Dashboard 모음 페이지 - 관리자 전용 */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* TraceBoard 로그 대시보드 페이지 - 관리자 전용 */}
        <Route 
          path="/traceboard" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <TraceBoard />
            </ProtectedRoute>
          } 
        />

        {/* Trend 채팅 페이지 */}
        <Route path="/trendchat" element={<TrendChat />} />
        <Route path="/chat/:roomId" element={<ChatRoomPage />} />

        {/* 실시간 채팅 페이지 */}
        <Route path="/livechat" element={<LiveChatListPage />} />
        <Route path="/livechat/:roomId" element={<LiveChatRoomPage />} />

        {/* 물리 퀴즈 페이지 */}
        <Route path="/physics-quiz" element={<PhysicsQuiz />} />

        {/* 롤 패치노트 페이지 */}
        {/* <Route path="/Lolpatch" element={<Lolpatch />} /> */}

      </Routes>
    </BrowserRouter>
  );
}

export default App;
