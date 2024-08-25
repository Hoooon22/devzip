// components/game/Character.js

import React, { useEffect } from 'react';
import '../../assets/css/Character.scss';
import ChatBubble from '../game/ChatBubble'; 

const Character = ({ id, position = {}, onMove }) => {
  useEffect(() => {
    console.log('Character position:', position); // 캐릭터 위치 확인
  }, [position]);

  const handleKeyDown = (event) => {
    let { x = 0, y = 0 } = position;

    switch (event.key) {
      case 'ArrowUp':
        y -= 10;
        break;
      case 'ArrowDown':
        y += 10;
        break;
      case 'ArrowLeft':
        x -= 10;
        break;
      case 'ArrowRight':
        x += 10;
        break;
      default:
        return;
    }

    onMove(x, y);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [position]);

  if (!position || Object.keys(position).length === 0) {
    return null;
  }

  return (
    <div
      className="character"
      style={{
        position: 'absolute',
        top: `${position.y || 0}px`,
        left: `${position.x || 0}px`,
        backgroundColor: position.color || 'lightgray',
        width: '50px',
        height: '50px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontSize: '12px',
        color: 'white',
        borderRadius: '5px'
      }}
    >
      {position.message && <ChatBubble message={position.message} />}
    </div>
  );
};

export default Character;
