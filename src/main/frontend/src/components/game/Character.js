import React, { useState, useEffect } from 'react';
import '../../assets/css/Character.scss';
import ChatBubble from '../game/ChatBubble';

const Character = ({ id, color, position, onMove, chatMessage }) => {
  const [dragging, setDragging] = useState(false);
  const [localPosition, setLocalPosition] = useState(position);
  const [startOffset, setStartOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    setDragging(true);
    setStartOffset({
      x: e.clientX - localPosition.x,
      y: e.clientY - localPosition.y,
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  const handleMouseMove = (e) => {
    if (dragging) {
      const newX = e.clientX - startOffset.x;
      const newY = e.clientY - startOffset.y;
      setLocalPosition({ x: newX, y: newY });
      onMove(newX, newY);
    }
  };

  const handleKeyDown = (e) => {
    const step = 10;
    let newX = localPosition.x;
    let newY = localPosition.y;

    switch (e.key) {
      case 'ArrowUp':
        newY -= step;
        break;
      case 'ArrowDown':
        newY += step;
        break;
      case 'ArrowLeft':
        newX -= step;
        break;
      case 'ArrowRight':
        newX += step;
        break;
      default:
        return;
    }

    setLocalPosition({ x: newX, y: newY });
    onMove(newX, newY);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [localPosition]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  return (
    <div
      className="character"
      style={{
        backgroundColor: color,
        left: `${localPosition.x}px`,
        top: `${localPosition.y}px`,
        position: 'absolute',
        display: 'inline-block',
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="character-id">{id}</div>
      {chatMessage && (
        <ChatBubble message={chatMessage} />
      )}
    </div>
  );
};

export default Character;
