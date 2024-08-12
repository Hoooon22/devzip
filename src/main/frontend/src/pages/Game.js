import React, { useState } from 'react';
import Character from '../components/game/Character';
import ChatWindow from '../components/game/ChatWindow';
import '../assets/css/Game.scss';

const Game = () => {
  const [messages, setMessages] = useState([]);

  const handleCharacterInteraction = (position) => {
    // 예: 상호작용 범위 안에 들어온 다른 캐릭터와 상호작용
    console.log('Character position:', position);
  };

  const handleNewMessage = (message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  return (
    <div className="game-container">
      <div className="game-content">
        <Character messages={messages} onInteraction={handleCharacterInteraction} />
        <ChatWindow onNewMessage={handleNewMessage} />
      </div>
    </div>
  );
};

export default Game;
