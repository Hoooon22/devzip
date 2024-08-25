import React, { useState, useEffect } from 'react';
import Character from '../components/game/Character';
import ChatWindow from '../components/game/ChatWindow';
import '../assets/css/Game.scss';

const Game = () => {
  const [characters, setCharacters] = useState({
    '1': { x: 100, y: 100, color: 'red', message: 'Test' },
  }); // 기본 데이터로 테스트

  return (
    <div className="game-container">
      <div className="character-area">
        {Object.keys(characters).map((characterId) => (
          <Character
            key={characterId}
            id={characterId}
            position={characters[characterId]}
            onMove={() => {}}
          />
        ))}
      </div>
      <ChatWindow />
    </div>
  );
};


export default Game;
