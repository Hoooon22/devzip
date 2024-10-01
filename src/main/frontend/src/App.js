import './App.css';
import Main from "./pages/Main";
import Guestbook from "./pages/Guestbook";
import Joke from "./pages/Joke";
import Lolpatch from "./pages/Lolpatch";
import Timecapsule from './pages/Timecapsule';
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
        {/* <Route path="/Lolpatch" element={<Lolpatch />} /> */}

        {/* 타임캡슐 페이지 */}
        <Route path="/timecapsule" element={<Timecapsule />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
