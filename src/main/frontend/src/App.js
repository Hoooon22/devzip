import './App.css';

import Main from "./pages/Main";
import { Routes, Route, BrowserRouter } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 웹 서비스 소개 페이지 */}
        <Route path="/" element={<Main />} />
      </Routes>
    </BrowserRouter> 
  );
}

export default App;