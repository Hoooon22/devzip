// components/game/Game.js

import React, { useState } from 'react';
import Character from '../components/game/Character';
import ChatWindow from './components/game/ChatWindow';
import '../assets/css/Game.scss';

const Game = () => {
  const [messages, setMessages] = useState({});

  const characters = [
    { id: 'char1', position: { top: 50, left: 100 } },
    { id: 'char2', position: { top: 150, left: 200 } },
    // 필요한 만큼 캐릭터 추가
  ];

  const handleNewMessage = (characterId, message) => {
    setMessages((prevMessages) => ({
      ...prevMessages,
      [characterId]: [...(prevMessages[characterId] || []), message],
    }));
  };

  return (
    <div className="game-container">
      <div className="game-content">
        {characters.map((char) => (
          <div key={char.id} className="character-with-chat">
            <Character
              id={char.id}
              position={char.position}
              messages={messages[char.id] || []}
              onInteraction={() => {}}
            />
            <ChatWindow
              characterId={char.id}
              onNewMessage={(message) => handleNewMessage(char.id, message)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Game;
