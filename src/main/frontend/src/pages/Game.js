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
          console.log('Received character data:', receivedData);
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
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleCharacterMove = (characterId, x, y) => {
    const message = JSON.stringify({ characterId, x, y });
    const ws = new WebSocket('wss://devzip.site/game-chatting'); // Ensure WebSocket is accessible
    ws.send(message);
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
