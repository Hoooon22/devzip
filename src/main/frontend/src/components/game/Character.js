import React, { useState } from 'react';
import '../../assets/css/Character.scss';

const Character = ({ id, color, position, onMove }) => {
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

  // `window`에 마우스 이동 이벤트를 바인딩
  React.useEffect(() => {
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
      }}
      onMouseDown={handleMouseDown}
    >
      {id}
    </div>
  );
};

export default Character;
