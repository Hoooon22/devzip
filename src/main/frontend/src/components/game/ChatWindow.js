// components/game/ChatWindow.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../../assets/css/ChatWindow.scss';

const ChatWindow = ({ onNewMessage, messages }) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      onNewMessage(input);
      setInput('');
    }
  };

  return (
    <div className="chat-window">
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className="message">{msg}</div>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSend();
          }
        }}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
};

export default ChatWindow;
