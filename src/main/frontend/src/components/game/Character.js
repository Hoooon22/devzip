// components/game/Character.js

import React, { useState, useRef, useEffect } from 'react';
import '../../assets/css/Character.scss';
import ChatBubble from '../game/ChatBubble'; // ChatBubble 컴포넌트 import

const Character = ({ id, onInteraction, messages }) => {
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
    const checkForInteractions = () => {
      if (onInteraction) {
        onInteraction(position);
      }
    };

    checkForInteractions();
  }, [position, onInteraction]);

  return (
    <div className="character-area" ref={characterAreaRef}>
      <div
        className="character"
        style={{
          position: 'absolute', // 캐릭터 위치 설정
          width: '50px', // 캐릭터 크기
          height: '50px',
          backgroundColor: 'lightgray', // 예시로 배경색 지정
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        {/* 캐릭터 위에 표시되는 채팅 버블 */}
        {messages
          .filter((msg) => msg.characterId === id) // 해당 캐릭터의 메시지 필터링
          .slice(-1) // 마지막 메시지만 표시
          .map((msg, index) => (
            <ChatBubble key={index} message={msg.text} />
          ))}
      </div>
    </div>
  );
};

export default Character;
