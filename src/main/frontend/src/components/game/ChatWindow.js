import React, { useState, useEffect, useCallback } from 'react';

const ChatWindow = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);

  // WebSocket 연결 설정 및 재연결 로직
  const initializeWebSocket = useCallback(() => {
    const socket = new WebSocket('ws://devzip.com:8080/game-chatting');

    socket.onopen = () => {
      console.log('WebSocket connection opened');
      setConnected(true);
    };

    socket.onmessage = (event) => {
      setMessages((prevMessages) => [...prevMessages, event.data]);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error: ', error);
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed', event.reason);
      setConnected(false);
      setTimeout(initializeWebSocket, 5000); // 5초 후 재연결 시도
    };

    setWs(socket);

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  useEffect(() => {
    // WebSocket 초기화
    initializeWebSocket();

    // 컴포넌트 언마운트 시 연결 종료
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [initializeWebSocket]);

  const sendMessage = () => {
    if (ws && ws.readyState === WebSocket.OPEN && message.trim()) {
      ws.send(message);
      setMessage('');
    } else {
      console.error('WebSocket is not open or message is empty');
    }
  };

  return (
    <div>
      <div style={{ border: '1px solid #ccc', padding: '10px', height: '300px', overflowY: 'scroll' }}>
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
        disabled={!connected}
      />
      <button onClick={sendMessage} disabled={!connected}>Send</button>
      {!connected && <p>Disconnected. Reconnecting...</p>}
    </div>
  );
};

export default ChatWindow;
