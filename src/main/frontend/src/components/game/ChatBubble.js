// components/game/ChatBubble.js
import React, { useState, useEffect } from 'react';
import '../../assets/css/ChatBubble.scss';

const ChatBubble = ({ message, duration = 10000 }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // 주어진 시간 후 메시지를 숨기도록 설정
    const timer = setTimeout(() => {
      setVisible(false);
    }, duration);

    // 컴포넌트가 언마운트될 때 타이머를 정리합니다.
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    visible && (
      <div className="chat-bubble">
        {message}
      </div>
    )
  );
};

export default ChatBubble;
