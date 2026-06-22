import React, { useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
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
import AccessLogs from './pages/AccessLogs';
import PhysicsQuiz from './pages/PhysicsQuiz';
import PhysicsLab from './pages/PhysicsLab';
import LiveChatListPage from "./pages/LiveChatListPage";
import LiveChatRoomPage from "./pages/LiveChatRoomPage";
import Hopperbox from './pages/Hopperbox';
import ChaoticMusicBox from './pages/ChaoticMusicBox';
import Conflux from './pages/Conflux';
import CommandStack from './pages/CommandStack';
import CommandStackDownload from './pages/CommandStackDownload';
import ApiExperiment from './pages/ApiExperiment';
import Library from './pages/Library';
import RestApi from './pages/experiments/RestApi';
import JsonApi from './pages/experiments/JsonApi';
import SoapApi from './pages/experiments/SoapApi';
import GrpcApi from './pages/experiments/GrpcApi';
import GraphQLApi from './pages/experiments/GraphQLApi';
import TippingPoint from './pages/experiments/TippingPoint';
import GhostFeed from './pages/experiments/GhostFeed';
import QubitLab from './pages/experiments/QubitLab';
import NostalgiaEngine from './pages/experiments/NostalgiaEngine';
import ContextWindow from './pages/experiments/ContextWindow';
import LatencyArena from './pages/experiments/LatencyArena';
import UncannyValley from './pages/experiments/UncannyValley';
import Murmuration from './pages/experiments/Murmuration';
import RubberBand from './pages/experiments/RubberBand';
import EdgeRun from './pages/experiments/EdgeRun';
import Lossy from './pages/experiments/Lossy';
import FanOut from './pages/experiments/FanOut';
import Tokenizer from './pages/experiments/Tokenizer';
import ViewportMeta from './components/ViewportMeta';
import RouteTracker from './components/traceboard/RouteTracker';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { GameProvider } from './contexts/GameContext';
import GameHud from './components/game/GameHud';
import CommandPalette from './components/CommandPalette';
import { Routes, Route, BrowserRouter } from "react-router-dom";
import { initTracker } from './services/traceboard/tracker';
import Overview from './components/dashboard/views/Overview';
import SystemView from './components/dashboard/views/SystemView';

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
    <HelmetProvider>
      <GameProvider>
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
        >
          <Route index element={<Overview />} />
          <Route path="system" element={<SystemView />} />
        </Route>
        
        {/* TraceBoard 로그 대시보드 페이지 - 관리자 전용 */}
        <Route
          path="/traceboard"
          element={
            <ProtectedRoute requireAdmin={true}>
              <TraceBoard />
            </ProtectedRoute>
          }
        />

        {/* 접근 로그 페이지 - 관리자 전용 */}
        <Route
          path="/access-logs"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AccessLogs />
            </ProtectedRoute>
          }
        />

        {/* Trend 채팅 페이지 */}
        <Route path="/trendchat" element={<TrendChat />} />
        <Route path="/chat/:roomId" element={<ChatRoomPage />} />

        {/* 실시간 채팅 페이지 */}
        <Route 
          path="/livechat" 
          element={
            <ProtectedRoute>
              <LiveChatListPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/livechat/:roomId" 
          element={
            <ProtectedRoute>
              <LiveChatRoomPage />
            </ProtectedRoute>
          } 
        />

        {/* 물리 퀴즈 페이지 */}
        <Route path="/physics-quiz" element={<PhysicsQuiz />} />

        {/* 물리 엔진 놀이터 */}
        <Route path="/physics-lab" element={<PhysicsLab />} />

        {/* Hopperbox 페이지 - 로그인 필수 */}
        <Route
          path="/hopperbox"
          element={
            <ProtectedRoute>
              <Hopperbox />
            </ProtectedRoute>
          }
        />

        {/* 카오틱 뮤직박스 페이지 - 로그인 필수 */}
        <Route
          path="/chaotic-music-box"
          element={
            <ProtectedRoute>
              <ChaoticMusicBox />
            </ProtectedRoute>
          }
        />

        {/* Conflux 소개 페이지 */}
        <Route path="/conflux" element={<Conflux />} />

        {/* Command Stack 소개 및 다운로드 페이지 */}
        <Route path="/commandstack" element={<CommandStack />} />
        <Route path="/commandstack/download" element={<CommandStackDownload />} />

        {/* API 실험실 페이지 */}
        <Route path="/api-experiment" element={<ApiExperiment />} />
        <Route path="/api-experiment/rest" element={<RestApi />} />
        <Route path="/api-experiment/json" element={<JsonApi />} />
        <Route path="/api-experiment/soap" element={<SoapApi />} />
        <Route path="/api-experiment/grpc" element={<GrpcApi />} />
        <Route path="/api-experiment/graphql" element={<GraphQLApi />} />
        <Route path="/tipping-point" element={<TippingPoint />} />
        <Route path="/ghost-feed" element={<GhostFeed />} />
        <Route path="/qubit-lab" element={<QubitLab />} />
        <Route path="/nostalgia-engine" element={<NostalgiaEngine />} />
        <Route path="/context-window" element={<ContextWindow />} />
        <Route path="/latency-arena" element={<LatencyArena />} />
        <Route path="/uncanny-valley" element={<UncannyValley />} />
        <Route path="/murmuration" element={<Murmuration />} />
        <Route path="/rubber-band" element={<RubberBand />} />
        <Route path="/edge-run" element={<EdgeRun />} />
        <Route path="/lossy" element={<Lossy />} />
        <Route path="/fan-out" element={<FanOut />} />
        <Route path="/tokenizer" element={<Tokenizer />} />

        {/* 자료실 페이지 */}
        <Route path="/library" element={<Library />} />

        {/* 롤 패치노트 페이지 */}
        {/* <Route path="/Lolpatch" element={<Lolpatch />} /> */}

        </Routes>

        {/* 사이트 전역 게이미피케이션 HUD */}
        <GameHud />

        {/* 전역 명령 팔레트 (Cmd/Ctrl+K) */}
        <CommandPalette />
      </BrowserRouter>
      </GameProvider>
    </HelmetProvider>
  );
}

export default App;
