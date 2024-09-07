import './App.css';
import Main from "./pages/Main";
import Guestbook from "./pages/Guestbook";
import Joke from "./pages/Joke";
import LolPatch from "./pages/LolPatch";
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
        <Route path="/LolPatch" element={<LolPatch />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
