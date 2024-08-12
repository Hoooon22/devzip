import React from 'react';
import Character from '../components/game/Character';
import ChatWindow from '../components/game/ChatWindow';

const Game = () => {
  return (
    <div>
      <h1>Game Page</h1>
      <Character />
      <ChatWindow />
    </div>
  );
};

export default Game;
