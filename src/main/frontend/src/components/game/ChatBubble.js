import React, { useEffect, useState } from 'react';
import '../../assets/css/ChatBubble.scss';

const ChatBubble = ({ message }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, [message]);

  if (!visible || !message) {
    return null;
  }

  return (
    <div className="chat-bubble">
      {message}
    </div>
  );
};

export default ChatBubble;
