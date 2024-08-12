import React, { useState, useRef } from 'react';
import '../../assets/css/Character.scss';

const Character = () => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
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

  return (
    <div className="character-area" ref={characterAreaRef}>
      <div
        className="character"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      ></div>
      <div className="controls">
        <button onClick={() => moveCharacter('up')}>Up</button>
        <button onClick={() => moveCharacter('down')}>Down</button>
        <button onClick={() => moveCharacter('left')}>Left</button>
        <button onClick={() => moveCharacter('right')}>Right</button>
      </div>
    </div>
  );
};

export default Character;
