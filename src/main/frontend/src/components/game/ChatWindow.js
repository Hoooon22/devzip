// components/game/ChatWindow.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../../assets/css/ChatWindow.scss';
import ChatBubble from './ChatBubble'; // ChatBubble 컴포넌트 import

const ChatWindow = ({ onNewMessage }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [bubbles, setBubbles] = useState([]); // ChatBubble 상태 추가
  const messagesEndRef = useRef(null);

  // WebSocket 연결 설정 및 재연결 로직
  const initializeWebSocket = useCallback(() => {
    const socket = new WebSocket('wss://devzip.site/game-chatting');

    socket.onopen = () => {
      console.log('WebSocket connection opened');
      setConnected(true);
    };

    socket.onmessage = (event) => {
      const newMessage = event.data;
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setBubbles((prevBubbles) => [...prevBubbles, newMessage]); // 새로운 버블 추가
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
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
  }, [initializeWebSocket, ws]);

  const sendMessage = () => {
    if (ws && ws.readyState === WebSocket.OPEN && message.trim()) {
      ws.send(message);
      setMessage('');
    } else {
      console.error('WebSocket is not open or message is empty');
    }
  };

  // Scroll to bottom of the chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-window">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index}>{msg}</div>
        ))}
        <div ref={messagesEndRef} />
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

      {/* 캐릭터 위에 표시되는 채팅 버블 */}
      <div className="chat-bubbles">
        {bubbles.map((bubble, index) => (
          <ChatBubble key={index} message={bubble} />
        ))}
      </div>
    </div>
  );
};

export default ChatWindow;
