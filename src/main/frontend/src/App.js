import './App.css';
import Main from "./pages/Main";
import Guestbook from "./pages/Guestbook";
import Game from "./pages/Game";
import ThiefVsCop from "./pages/ThiefVsCop";
import { Routes, Route, BrowserRouter } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 메인 페이지 */}
        <Route path="/" element={<Main />} />

        {/* 방명록 페이지 */}
        <Route path="/Guestbook" element={<Guestbook />} />

        {/* 게임 페이지 */}
        <Route path="/Game" element={<Game />} />

        {/* 경찰과 도둑 페이지 */}
        <Route path="/ThiefVsCop" element={<ThiefVsCop />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
