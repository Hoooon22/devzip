import React, { useState, useEffect } from 'react';

const ChatWindow = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080/chat');
    socket.onmessage = (event) => {
      setMessages((prevMessages) => [...prevMessages, event.data]);
    };
    setWs(socket);

    return () => socket.close();
  }, []);

  const sendMessage = () => {
    if (ws) {
      ws.send(message);
      setMessage('');
    }
  };

  return (
    <div>
      <div>
        {messages.map((msg, index) => (
          <div key={index}>{msg}</div>
        ))}
      </div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            sendMessage();
          }
        }}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default ChatWindow;
