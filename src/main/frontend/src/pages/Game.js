// components/game/Game.js

import React, { useState, useEffect } from 'react';
import Character from '../components/game/Character';
import ChatWindow from '../components/game/ChatWindow';
import '../assets/css/Game.scss';

const Game = () => {
  const [characters, setCharacters] = useState({});
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    const ws = new WebSocket('wss://devzip.site/game-chatting');

    ws.onopen = () => {
      console.log('WebSocket connection opened');
    };

    ws.onmessage = (event) => {
      try {
        const receivedData = JSON.parse(event.data);

        if (receivedData.characterId) {
          // 캐릭터 위치 업데이트
          setCharacters((prevCharacters) => ({
            ...prevCharacters,
            [receivedData.characterId]: receivedData
          }));
        } else {
          // 메시지가 들어온 경우
          setMessages((prevMessages) => [...prevMessages, receivedData]);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        console.log('Received data:', event.data); // 디버깅용으로 수신된 데이터를 로그에 출력
      }
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
    // WebSocket 인스턴스를 useEffect 내에서 정의했기 때문에
    // WebSocket 인스턴스를 useEffect 외부에서 접근할 수 없습니다.
    // 따라서 handleCharacterMove 함수는 웹소켓을 내부에서 참조할 수 있도록 구조를 변경해야 합니다.
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
