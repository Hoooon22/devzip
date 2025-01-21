import React, { useState } from 'react';
import GamePage from './pages/Gamepage';
import Console from './pages/Console';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);

  return (
    <div className="container">
      <div className="game-page">
        <div className="square">
          <div className="content">
            <GamePage setMessages={setMessages} />
          </div>
        </div>
      </div>
      <div className="console">
        <div className="square">
          <div className="content">
            <Console messages={messages} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;