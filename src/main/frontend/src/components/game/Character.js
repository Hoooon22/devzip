import React, { useEffect } from 'react';
import '../../assets/css/Character.scss';

const Character = ({ id, position, onMove }) => {
  useEffect(() => {
    console.log('Character position:', position);  // position 확인

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

      onMove(id, x, y);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [position, onMove, id]);

  return (
    <div
      className="character"
      style={{
        position: 'absolute',
        top: `${position.y}px`,
        left: `${position.x}px`,
        backgroundColor: position.color,
        width: '50px',
        height: '50px',
      }}
    >
      {id}
    </div>
  );
};

export default Character;
