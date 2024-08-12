import React, { useState, useRef, useEffect } from 'react';
import '../../assets/css/Character.scss';

const Character = ({ messages }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [activeMessage, setActiveMessage] = useState(null);
  const characterAreaRef = useRef(null);

  const moveCharacter = (direction) => {
    setPosition((prevPosition) => {
      const step = 10;
      const characterArea = characterAreaRef.current;
      const characterAreaRect = characterArea.getBoundingClientRect();

      // 캐릭터의 크기
      const characterSize = 50;

      let newTop = prevPosition.top;
      let newLeft = prevPosition.left;

      switch (direction) {
        case 'up':
          newTop = Math.max(prevPosition.top - step, 0);
          break;
        case 'down':
          newTop = Math.min(prevPosition.top + step, characterAreaRect.height - characterSize);
          break;
        case 'left':
          newLeft = Math.max(prevPosition.left - step, 0);
          break;
        case 'right':
          newLeft = Math.min(prevPosition.left + step, characterAreaRect.width - characterSize);
          break;
        default:
          break;
      }

      return { top: newTop, left: newLeft };
    });
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'ArrowUp':
          moveCharacter('up');
          break;
        case 'ArrowDown':
          moveCharacter('down');
          break;
        case 'ArrowLeft':
          moveCharacter('left');
          break;
        case 'ArrowRight':
          moveCharacter('right');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setActiveMessage(messages[messages.length - 1]);
      const timer = setTimeout(() => {
        setActiveMessage(null);
      }, 10000); // 10초 후 사라지게

      return () => clearTimeout(timer);
    }
  }, [messages]);

  return (
    <div className="character-area" ref={characterAreaRef}>
      <div
        className="character"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      ></div>
      {activeMessage && (
        <div className="character-message" style={{
          top: `${position.top - 60}px`,
          left: `${position.left}px`,
        }}>
          {activeMessage}
        </div>
      )}
    </div>
  );
};

export default Character;
