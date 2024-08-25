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
    ws.current = new WebSocket('wss://devzip.site/game-chatting');

    ws.current.onopen = () => {
      console.log('WebSocket connection opened');
    };

    ws.current.onmessage = (event) => {
      try {
        const receivedData = JSON.parse(event.data);
        console.log('Received data:', receivedData); // 수신된 데이터 로그

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

    ws.current.onmessage = (event) => {
      try {
        const receivedData = JSON.parse(event.data);
        console.log('Received data:', receivedData);
    
        if (receivedData.characterId) {
          console.log('Updating character:', receivedData);
          setCharacters((prevCharacters) => ({
            ...prevCharacters,
            [receivedData.characterId]: receivedData
          }));
        } else {
          setMessages((prevMessages) => [...prevMessages, receivedData]);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        console.log('Received data:', event.data);
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
    const message = JSON.stringify({ characterId, x, y });
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
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
