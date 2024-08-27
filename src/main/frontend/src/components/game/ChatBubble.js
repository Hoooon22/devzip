import React, { useEffect, useState } from 'react';
import '../../assets/css/ChatBubble.scss';

const ChatBubble = ({ message }) => {
  const [visible, setVisible] = useState(!!message);

  useEffect(() => {
    if (message) {
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, 10000); // Show for 10 seconds

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
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
