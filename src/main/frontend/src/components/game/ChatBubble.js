// components/game/ChatBubble.js

import React, { useEffect, useState } from 'react';
import '../../assets/css/ChatBubble.scss';

const ChatBubble = ({ message }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 10000); // 10초 후에 메시지를 숨깁니다.

    return () => clearTimeout(timer);
  }, [message]);

  if (!visible) {
    return null;
  }

  return (
    <div className="chat-bubble">
      {message}
    </div>
  );
};

export default ChatBubble;
