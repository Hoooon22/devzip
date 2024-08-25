// components/game/Character.js

import React, { useEffect } from 'react';
import '../../assets/css/Character.scss';
import ChatBubble from '../game/ChatBubble'; 

const Character = ({ id, position, onMove }) => {
  useEffect(() => {
    console.log(`Character ${id} position:`, position); // 위치 확인
  }, [position]);

  const handleKeyDown = (event) => {
    if (!position) return;

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

  if (!position) {
    return null;
  }

  return (
    <div
      className="character"
      style={{
        position: 'absolute',
        top: `${position.y}px`,
        left: `${position.x}px`,
        backgroundColor: position.color || 'lightgray',
        width: '50px',
        height: '50px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontSize: '12px',
        color: 'white',
        borderRadius: '5px',
        transition: 'top 0.1s, left 0.1s' // 부드러운 이동 효과
      }}
    >
      {position.message && <ChatBubble message={position.message} />}
    </div>
  );
};

export default Character;
