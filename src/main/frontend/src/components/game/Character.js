import React, { useState } from 'react';
import '../../assets/css/Character.scss';

const Character = () => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const moveCharacter = (direction) => {
    setPosition((prevPosition) => {
      const step = 10;
      switch (direction) {
        case 'up':
          return { ...prevPosition, top: prevPosition.top - step };
        case 'down':
          return { ...prevPosition, top: prevPosition.top + step };
        case 'left':
          return { ...prevPosition, left: prevPosition.left - step };
        case 'right':
          return { ...prevPosition, left: prevPosition.left + step };
        default:
          return prevPosition;
      }
    });
  };

  return (
    <div>
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
