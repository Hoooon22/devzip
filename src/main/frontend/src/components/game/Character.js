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
        top: `${position.y}px`,
        left: `${position.x}px`,
        backgroundColor: position.color || 'gray', // Default color if not provided
      }}
    >
      <ChatBubble message="Hello!" />
    </div>
  );
};

export default Character;
