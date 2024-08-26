// components/game/Game.js

import React, { useState, useEffect, useRef } from 'react';
import Character from '../components/game/Character';
import ChatWindow from '../components/game/ChatWindow';
import '../assets/css/Game.scss';

const Game = () => {
  const [characters, setCharacters] = useState({});
  const [messages, setMessages] = useState([]);
  const ws = useRef(null);  // WebSocket을 useRef로 관리

  useEffect(() => {
    ws.current = new WebSocket('wss://devzip.site/game-chatting');

    ws.current.onopen = () => {
      console.log('WebSocket connection opened');
    };

    ws.current.onmessage = (event) => {
      console.log('Received data from WebSocket:', event.data);

      try {
        const receivedData = JSON.parse(event.data);

        if (receivedData.characterId) {
          setCharacters((prevCharacters) => ({
            ...prevCharacters,
            [receivedData.characterId]: receivedData
          }));
        } else {
          setMessages((prevMessages) => [...prevMessages, receivedData]);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        console.log('Invalid data received:', event.data);
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
    const message = JSON.stringify({ 
      type: "move",
      characterId: characterId, 
      x: x, 
      y: y 
    });
    if (ws.current) {
      ws.current.send(message);
    } else {
      console.log('ws cant send');
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
