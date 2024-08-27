import React, { useState } from 'react';
import '../../assets/css/Character.scss';

const Character = ({ id, color, position, onMove }) => {
  const [dragging, setDragging] = useState(false);
  const [localPosition, setLocalPosition] = useState(position);

  const handleMouseDown = (e) => {
    setDragging(true);
  };

  const handleMouseUp = (e) => {
    setDragging(false);
  };

  const handleMouseMove = (e) => {
    if (dragging) {
      const newX = e.clientX;
      const newY = e.clientY;
      setLocalPosition({ x: newX, y: newY });
      onMove(newX, newY);
    }
  };

  return (
    <div
      className="character"
      style={{
        backgroundColor: color,
        left: `${localPosition.x}px`,
        top: `${localPosition.y}px`,
        position: 'absolute',
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      {id}
    </div>
  );
};

export default Character;
