import React, { useState, useEffect, useRef } from 'react';
import Character from '../components/game/Character';
import ChatWindow from '../components/game/ChatWindow';
import '../assets/css/Game.scss';

const Game = () => {
  const [characters, setCharacters] = useState({});
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket('wss://devzip.site/game-chatting');

    ws.current.onopen = () => {
      console.log('WebSocket connection opened');
    };

    ws.current.onmessage = (event) => {
      try {
        const receivedData = JSON.parse(event.data);
        console.log('Received data from WebSocket:', receivedData);

        if (receivedData.characterId && receivedData.x !== undefined && receivedData.y !== undefined) {
          setCharacters((prevCharacters) => ({
            ...prevCharacters,
            [receivedData.characterId]: {
              x: receivedData.x,
              y: receivedData.y,
              color: receivedData.color || '#000',  // 기본 색상 설정
            },
          }));
        } else {
          console.warn('Invalid data received:', receivedData);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error, event.data);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const handleCharacterMove = (characterId, x, y) => {
    if (!ws.current) return;

    const message = JSON.stringify({ characterId, x, y });
    ws.current.send(message);
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
      <ChatWindow onNewMessage={(message) => console.log('New message:', message)} />
    </div>
  );
};

export default Game;