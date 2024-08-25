// components/game/Game.js

import React, { useState, useEffect, useRef } from 'react';
import Character from '../components/game/Character';
import ChatWindow from '../components/game/ChatWindow';
import '../assets/css/Game.scss';

const Game = () => {
  const [characters, setCharacters] = useState({});
  const [messages, setMessages] = useState([]);
  const ws = useRef(null);

  useEffect(() => {
    // WebSocket 연결 설정
    ws.current = new WebSocket('wss://devzip.site/game-chatting');

    ws.current.onopen = () => {
      console.log('WebSocket connection opened');
    };

    ws.current.onmessage = (event) => {
      const receivedData = JSON.parse(event.data);
      console.log('Received data:', receivedData); // 데이터 확인

      if (receivedData.characterId) {
        setCharacters((prevCharacters) => ({
          ...prevCharacters,
          [receivedData.characterId]: {
            x: receivedData.x || 0,
            y: receivedData.y || 0,
            color: receivedData.color || 'lightgray',
            message: receivedData.message || ''
          }
        }));
      } else {
        // 메시지가 들어온 경우
        setMessages((prevMessages) => [...prevMessages, receivedData]);
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
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ characterId, x, y });
      ws.current.send(message);
    }
  };

  const handleNewMessage = (message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
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
      <ChatWindow onNewMessage={handleNewMessage} />
    </div>
  );
};

export default Game;