import React, { useState } from 'react';

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
        style={{
          position: 'absolute',
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: '50px',
          height: '50px',
          backgroundColor: 'red',
        }}
      ></div>
      <button onClick={() => moveCharacter('up')}>Up</button>
      <button onClick={() => moveCharacter('down')}>Down</button>
      <button onClick={() => moveCharacter('left')}>Left</button>
      <button onClick={() => moveCharacter('right')}>Right</button>
    </div>
  );
};

export default Character;
