// components/game/Character.js
import React from 'react';
import '../../assets/css/Character.scss';

const Character = ({ id, color, position, onMove }) => {
  const characterStyle = {
    backgroundColor: color,
    left: `${position.x}px`,
    top: `${position.y}px`,
    position: 'absolute',
    width: '50px', // 캐릭터 크기 조정
    height: '50px',
  };

  const handleKeyDown = (event) => {
    let newX = position.x;
    let newY = position.y;

    if (event.key === 'ArrowUp') newY -= 10;
    if (event.key === 'ArrowDown') newY += 10;
    if (event.key === 'ArrowLeft') newX -= 10;
    if (event.key === 'ArrowRight') newX += 10;

    onMove(newX, newY);
  };

  return (
    <div
      className="character"
      style={characterStyle}
      tabIndex="0"
      onKeyDown={handleKeyDown}
    >
      {/* 캐릭터를 식별할 수 있는 내용 추가 */}
      <span>{id}</span>
    </div>
  );
};

export default Character;
