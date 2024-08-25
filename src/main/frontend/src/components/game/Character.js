// components/game/Character.js

import React, { useEffect } from 'react';
import '../../assets/css/Character.scss';
import ChatBubble from '../game/ChatBubble'; 

const Character = ({ id, position, onMove }) => {
  const handleKeyDown = (event) => {
    let { x, y } = position;

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

  return (
    <div
      className="character"
      style={{
        position: 'absolute',
        top: `${position.y}px`,
        left: `${position.x}px`,
        backgroundColor: position.color || 'lightgray', // 기본 색상 지정
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
