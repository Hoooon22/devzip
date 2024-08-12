// components/game/ChatBubble.js

import React, { useEffect, useState } from 'react';
import '../../assets/css/ChatBubble.scss';

const ChatBubble = ({ message }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // 메시지를 받은 후 10초 동안 표시하고 사라짐
    const timer = setTimeout(() => setVisible(false), 10000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!visible) return null;

  return (
    <div className="chat-bubble">
      {message}
    </div>
  );
};

export default ChatBubble;
