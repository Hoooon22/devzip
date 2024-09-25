import './App.css';
import Main from "./pages/Main";
import Guestbook from "./pages/Guestbook";
import Joke from "./pages/Joke";
import Lolpatch from "./pages/Lolpatch";
import ServerMonit from "./pages/ServerMonit";
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

        {/* 롤 패치노트 페이지 */}
        <Route path="/Lolpatch" element={<Lolpatch />} />

        {/* 실시간 서버 성능 지표 페이지 */}
        <Route path="/ServerMonit" element={<ServerMonit />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
