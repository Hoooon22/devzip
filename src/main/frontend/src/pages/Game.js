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

        if (receivedData && typeof receivedData === 'object') {
          if (receivedData.message) {
            // Received chat message
            setMessages((prevMessages) => [...prevMessages, receivedData.message]);
          } else {
            // Received character data
            setCharacters(receivedData);
          }
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
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ characterId, x, y });
      ws.current.send(message);
    } else {
      console.error('WebSocket is not open. Cannot send move data.');
    }
  };

  const handleNewMessage = (message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const messageObject = { message };
      ws.current.send(JSON.stringify(messageObject));
    } else {
      console.error('WebSocket is not open. Cannot send message.');
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
            message={characters[characterId]?.message} // Pass message to character
          />
        ))}
      </div>
      <ChatWindow onNewMessage={handleNewMessage} messages={messages} />
    </div>
  );
};

export default Game;
