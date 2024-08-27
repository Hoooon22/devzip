import React, { useState, useEffect, useRef } from 'react';
import Character from '../components/game/Character';
import ChatWindow from '../components/game/ChatWindow';
import '../assets/css/Game.scss';

const Game = () => {
  const [characters, setCharacters] = useState({});
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket('wss://devzip.site/game-chatting');

    ws.current.onopen = () => {
      console.log('WebSocket connection opened');
      // Send username after connection is established
      if (username) {
        ws.current.send(JSON.stringify({ username }));
      }
    };

    ws.current.onmessage = (event) => {
      console.log('Received data from WebSocket:', event.data);

      try {
        const receivedData = JSON.parse(event.data);

        if (receivedData.message) {
          // Handle chat message
          setMessages((prevMessages) => [...prevMessages, receivedData.message]);
        } else {
          // Handle character data
          setCharacters(receivedData);
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
  }, [username]);

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

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
  };

  const handleUsernameSubmit = () => {
    if (username && ws.current) {
      ws.current.send(JSON.stringify({ username }));
    }
  };

  return (
    <div className="game-container">
      {!username ? (
        <div className="name-input">
          <input
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={handleUsernameChange}
          />
          <button onClick={handleUsernameSubmit}>Submit</button>
        </div>
      ) : (
        <>
          <div className="character-area">
            {Object.keys(characters).map((characterId) => (
              <Character
                key={characterId}
                id={characterId}
                name={characters[characterId]?.name}
                color={characters[characterId]?.color}
                position={{ x: characters[characterId]?.x, y: characters[characterId]?.y }}
                onMove={(x, y) => handleCharacterMove(characterId, x, y)}
                chatMessage={characters[characterId]?.message} // Pass the chat message
              />
            ))}
          </div>
          <ChatWindow onNewMessage={handleNewMessage} messages={messages} />
        </>
      )}
    </div>
  );
};

export default Game;
