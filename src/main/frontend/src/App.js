import './App.css';
import Main from "./pages/Main";
import Guestbook from "./pages/Guestbook";
import Joke from "./pages/Joke";
import Lolpatch from "./pages/Lolpatch"; // 파일 이름에 맞춰 수정
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
        <Route path="/Lolpatch" element={<Lolpatch />} /> {/* 파일 이름에 맞춰 수정 */}

      </Routes>
    </BrowserRouter>
  );
}

export default App;
