// components/game/Game.js
import React, { useState } from 'react';
import Character from '../components/game/Character';
import ChatWindow from '../components/game/ChatWindow';
import '../assets/css/Game.scss';

const Game = () => {
  const [characterPosition, setCharacterPosition] = useState({ top: 0, left: 0 });

  const handleCharacterInteraction = (position) => {
    // 예: 상호작용 범위 안에 들어온 다른 캐릭터와 상호작용
    console.log('Character position:', position);
  };

  return (
    <div className="game-container">
      <h1>Game Page</h1>
      <div className="game-area">
        <Character onInteraction={handleCharacterInteraction} />
        <ChatWindow />
      </div>
    </div>
  );
};

export default Game;
