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
      console.log('Received data from WebSocket:', event.data);

      try {
        const receivedData = JSON.parse(event.data);

        if (typeof receivedData === 'object' && !Array.isArray(receivedData)) {
          // Received character data
          setCharacters(receivedData);
        } else if (Array.isArray(receivedData)) {
          // Received chat messages
          setMessages((prevMessages) => [...prevMessages, receivedData]);
        } else if (receivedData.message) {
          // Received chat message
          setMessages((prevMessages) => [...prevMessages, receivedData.message]);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        console.log('Invalid data received:', event.data);
      }
    };

    // debug data
    ws.current.onmessage = (event) => {
      console.log('Received data from WebSocket:', event.data);
      console.log('Received data type:', typeof event.data);
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
    if (ws.current) {
      ws.current.send(message);
    }
  };

  const handleNewMessage = (message) => {
    const messageObject = { message };
    if (ws.current) {
      ws.current.send(JSON.stringify(messageObject));
    }
  };

  return (
    <div className="game-container">
      <div className="character-area">
        {Object.keys(characters).map((characterId) => (
          <Character
            key={characterId}
            id={characterId}
            color={characters[characterId]?.color}
            position={{ x: characters[characterId]?.x, y: characters[characterId]?.y }}
            onMove={(x, y) => handleCharacterMove(characterId, x, y)}
          />
        ))}
      </div>
      <ChatWindow onNewMessage={handleNewMessage} messages={messages} />
    </div>
  );
};

export default Game;
