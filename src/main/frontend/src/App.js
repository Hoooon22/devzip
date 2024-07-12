import './App.css';
import Main from "./pages/Main";
import Guestbook from "./pages/Guestbook";
import { Routes, Route, BrowserRouter } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 메인 페이지 */}
        <Route path="/" element={<Main />} />

        {/* 방명록 페이지 */}
        <Route path="/Guestbook" element={<Guestbook />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
