import React, { useState, useEffect, useRef } from 'react';
import Character from '../components/game/Character';
import ChatWindow from '../components/game/ChatWindow';
import NameInput from '../components/game/NameInput';
import '../assets/css/Game.scss';

const Game = () => {
  const [characters, setCharacters] = useState({});
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState(null);
  const ws = useRef(null);

  useEffect(() => {
    if (username === null) return; // Wait for username to be set

    ws.current = new WebSocket('wss://devzip.site/game-chatting');

    ws.current.onopen = () => {
      console.log('WebSocket connection opened');
    };

    ws.current.onmessage = (event) => {
      console.log('Received data from WebSocket:', event.data);

      try {
        const receivedData = JSON.parse(event.data);

        if (receivedData.message) {
          // Handle chat message
          setMessages((prevMessages) => [...prevMessages, receivedData]);
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
    const messageObject = { characterId: null, message }; // Use `null` for characterId in chat messages
    if (ws.current) {
      ws.current.send(JSON.stringify(messageObject));
    }
  };

  const handleNameSubmit = (name) => {
    setUsername(name); // Set the username and start the game
  };

  // Map messages to characters
  const messagesByCharacter = messages.reduce((acc, msg) => {
    acc[msg.characterId] = msg.message;
    return acc;
  }, {});

  return (
    <div className="game-container">
      {username === null ? (
        <NameInput onSubmit={handleNameSubmit} />
      ) : (
        <>
          <div className="character-area">
            {Object.keys(characters).map((characterId) => (
              <Character
                key={characterId}
                id={characterId}
                color={characters[characterId]?.color}
                position={{ x: characters[characterId]?.x, y: characters[characterId]?.y }}
                onMove={(x, y) => handleCharacterMove(characterId, x, y)}
                chatMessage={messagesByCharacter[characterId]} // Pass the chat message
                name={characters[characterId]?.name} // Pass the character's name
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
