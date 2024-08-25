// components/game/Game.js

import React, { useState } from 'react';
import Character from '../components/game/Character';
import ChatWindow from '../components/game/ChatWindow';
import '../assets/css/Game.scss';

const Game = () => {
  const [messages, setMessages] = useState({});

  const characters = [
    { id: 'char1', initialPosition: { top: 50, left: 100 } },
    { id: 'char2', initialPosition: { top: 150, left: 200 } },
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
      <div className="character-area">
        {characters.map((char) => (
          <Character
            key={char.id}
            id={char.id}
            initialPosition={char.initialPosition}
            messages={messages[char.id] || []}
            onInteraction={() => {}}
          />
        ))}
      </div>
      <ChatWindow
        characterId={characters[0].id} // 첫 번째 캐릭터의 ID로 채팅 창을 연결
        onNewMessage={(message) => handleNewMessage(characters[0].id, message)}
      />
    </div>
  );
};

export default Game;