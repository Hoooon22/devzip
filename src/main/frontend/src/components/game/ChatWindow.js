import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../../assets/css/ChatWindow.scss';

const ChatWindow = ({ onNewMessage }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const isSending = useRef(false);

  const initializeWebSocket = useCallback(() => {
    if (ws) return; // 이미 WebSocket이 설정된 경우 초기화하지 않음

    const socket = new WebSocket('wss://devzip.site/game-chatting');

    socket.onopen = () => {
      console.log('WebSocket connection opened');
      setConnected(true);
    };

    socket.onmessage = (event) => {
      setMessages((prevMessages) => [...prevMessages, event.data]);
      if (onNewMessage) {
        onNewMessage(event.data);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed', event.reason);
      setConnected(false);
      setWs(null); // WebSocket 연결이 닫혔을 때 ws 상태를 null로 설정
    };

    setWs(socket);
  }, [ws, onNewMessage]);

  useEffect(() => {
    initializeWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [initializeWebSocket, ws]);

  const sendMessage = () => {
    if (isSending.current) return;

    if (ws && ws.readyState === WebSocket.OPEN && message.trim()) {
      isSending.current = true;
      ws.send(message);
      setMessage('');
      setTimeout(() => {
        isSending.current = false;
      }, 100);
    } else {
      console.error('WebSocket is not open or message is empty');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-window">
      <div className="chat-messages" style={{ border: '1px solid #ccc', padding: '10px', height: '300px', overflowY: 'scroll' }}>
        {messages.map((msg, index) => (
          <div key={index}>{msg}</div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <input
        className="chat-input"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            sendMessage();
          }
        }}
        disabled={!connected}
      />
      <button className="chat-send-button" onClick={sendMessage} disabled={!connected}>Send</button>
      {!connected && <p className="chat-disconnected-message">Disconnected. Reconnecting...</p>}
    </div>
  );
};

export default ChatWindow;
