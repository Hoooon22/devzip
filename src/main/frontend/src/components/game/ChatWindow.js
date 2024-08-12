import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../../assets/css/ChatWindow.scss';

const ChatWindow = ({ onNewMessage }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const isSending = useRef(false); // 메시지 전송 중인지 여부를 추적

  // WebSocket 연결 설정 및 재연결 로직
  const initializeWebSocket = useCallback(() => {
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
      setTimeout(initializeWebSocket, 5000); // 5초 후 재연결 시도
    };

    setWs(socket);

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [onNewMessage]);

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
    if (isSending.current) return; // 이미 메시지를 보내는 중이면 return

    if (ws && ws.readyState === WebSocket.OPEN && message.trim()) {
      isSending.current = true; // 메시지 전송 시작
      ws.send(message);
      setMessage('');
      setTimeout(() => {
        isSending.current = false; // 전송 후에 상태 초기화
      }, 100); // 적절한 딜레이 설정
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
