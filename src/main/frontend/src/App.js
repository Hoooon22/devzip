import './App.css';

import Main from "./pages/Main";
import Guestbook from "./pages/Guestbook";
import { Routes, Route, BrowserRouter } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 웹 서비스 소개 페이지 */}
        <Route path="/" element={<Main />} />
        <Route path="/Guestbook" element={<Guestbook />} />
      </Routes>
    </BrowserRouter> 
  );
}

export default App;