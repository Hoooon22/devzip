import React, { useEffect } from 'react';
import '../../assets/css/Character.scss';
import ChatBubble from '../game/ChatBubble'; 

const Character = ({ id, position = { x: 100, y: 100, color: 'blue', message: 'Hello!' }, onMove }) => {
  useEffect(() => {
    console.log('Character position:', position); // position 객체 로그

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

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [position, onMove]);

  return (
    <div
      className="character"
      style={{
        position: 'absolute',
        top: `${position.y}px`,
        left: `${position.x}px`,
        backgroundColor: position.color,
        width: '50px',
        height: '50px'
      }}
    >
      <ChatBubble message={position.message} />
    </div>
  );
};

export default Character;
