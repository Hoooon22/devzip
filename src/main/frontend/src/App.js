import './App.css';
import Main from "./pages/Main";
import Guestbook from "./pages/Guestbook";
import Joke from "./pages/Joke";
// import Lolpatch from "./pages/Lolpatch";
import ApiPage from './pages/ApiPage';
import Dashboard from './pages/Dashboard';
import TrendChat from './pages/TrendChat';
import { Routes, Route, BrowserRouter } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 메인 페이지 */}
        <Route path="/" element={<Main />} /> 

        {/* 방명록 페이지 */}
        <Route path="/Guestbook" element={<Guestbook />} />

        {/* 농담 페이지 */}
        <Route path="/Joke" element={<Joke />} />

        {/* api 모음 페이지 */}
        <Route path="/apiPage" element={<ApiPage />} />

        {/* Dashboard 모음 페이지 */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Trend 채팅 페이지 */}
        <Route path="/trendchat" element={<TrendChat />} />

        {/* 롤 패치노트 페이지 */}
        {/* <Route path="/Lolpatch" element={<Lolpatch />} /> */}

      </Routes>
    </BrowserRouter>
  );
}

export default App;
