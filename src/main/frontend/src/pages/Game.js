import React from 'react';
import Character from '../components/game/Character';
import ChatWindow from '../components/game/ChatWindow';
import '../assets/css/Game.scss'; // SCSS 파일을 임포트

const Game = () => {
  const handleCharacterInteraction = (position) => {
    // 예: 상호작용 범위 안에 들어온 다른 캐릭터와 상호작용
    console.log('Character position:', position);
  };

  return (
    <div className="game-container">
      <div className="game-content">
        <Character onInteraction={handleCharacterInteraction} />
        <ChatWindow />
      </div>
    </div>
  );
};

export default Game;
