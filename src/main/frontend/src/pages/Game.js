// components/game/Game.js

import React, { useState, useEffect } from 'react';
import Character from '../components/game/Character';
import '../assets/css/Game.scss';

const Game = () => {
  const [characters, setCharacters] = useState({});
  let ws = null;

  useEffect(() => {
    // WebSocket 연결 설정
    ws = new WebSocket('wss://devzip.site/game-chatting');

    ws.onopen = () => {
      console.log('WebSocket connection opened');
    };

    ws.onmessage = (event) => {
      const receivedData = JSON.parse(event.data);
      setCharacters((prevCharacters) => ({
        ...prevCharacters,
        [receivedData.characterId]: receivedData
      }));
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const handleCharacterMove = (characterId, x, y) => {
    const message = JSON.stringify({ characterId, x, y });
    ws.send(message);
  };

  return (
    <div className="game-container">
      <div className="character-area">
        {Object.keys(characters).map((characterId) => (
          <Character
            key={characterId}
            id={characterId}
            position={characters[characterId]}
            onMove={(x, y) => handleCharacterMove(characterId, x, y)}
          />
        ))}
      </div>
    </div>
  );
};

export default Game;
