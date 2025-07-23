import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import "../assets/css/ChatRoomPage.scss";

const ChatRoomPage = () => {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const stompClient = useRef(null);

  // 채팅방 정보 API 호출 (GET /api/chatrooms/{roomId})
  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        const res = await fetch(`/api/chatrooms/${roomId}`);
        const data = await res.json();
        setRoom(data);
      } catch (error) {
        console.error("채팅방 정보 가져오기 실패:", error);
      }
    };

    fetchRoomDetails();
  }, [roomId]);

  // 기존 메시지 불러오기 (GET /api/chatmessages/{roomId}) 및 폴링
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/chatmessages/${roomId}`);
        const data = await res.json();
        setMessages(data);
      } catch (error) {
        console.error("메시지 가져오기 실패:", error);
      }
    };

    // 입장 시 즉시 기존 메시지 로드
    fetchMessages();
    // 이후 5초마다 폴링
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [roomId]);

  // WebSocket 연결 설정 (실시간 메시지 수신)
  useEffect(() => {
    // 환경에 따른 WebSocket URL 설정
    const getWebSocketUrl = () => {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return "http://localhost:8080/ws";
      }
      return "/ws"; // 프로덕션에서는 상대 경로 사용
    };
    
    const socket = new SockJS(getWebSocketUrl());
    stompClient.current = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("WebSocket 연결 성공");
        if (room) {
          stompClient.current.subscribe(`/topic/chat/${room.id}`, (message) => {
            const msg = JSON.parse(message.body);
            setMessages((prev) => [...prev, msg]);
          });
        }
      },
      onStompError: (frame) => {
        console.error("WebSocket 오류:", frame);
      },
    });
    stompClient.current.activate();

    return () => {
      if (stompClient.current) {
        stompClient.current.deactivate();
      }
    };
  }, [room]);

  // 메시지 전송 함수 (WebSocket을 통해 전송)
  const sendMessage = () => {
    if (!input.trim() || !room) return;
    const message = {
      sender: "익명", // 임시 닉네임; 필요에 따라 사용자 정보를 활용
      content: input,
    };
    stompClient.current.publish({
      destination: `/app/chat/${room.keyword}`,
      body: JSON.stringify(message),
    });
    setInput("");
  };

  return (
    <div className="chatroom-container">
      <h1>채팅방</h1>
      {room ? (
        <div className="chatroom-info">
          <h2>{room.keyword}</h2>
          <p>생성일: {room.formattedCreateDate || room.createDate}</p>
        </div>
      ) : (
        <p>채팅방 정보를 불러오는 중...</p>
      )}

      <div className="chat-messages">
        {messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg.id} className="chat-message">
              <strong style={{ color: msg.color || "#007bff" }}>
                {msg.sender}
              </strong>
              : {msg.content}
              <span className="timestamp">
                {msg.formattedSentAt || msg.sentAt}
              </span>
            </div>
          ))
        ) : (
          <p>아직 메시지가 없습니다.</p>
        )}
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지를 입력하세요..."
        />
        <button onClick={sendMessage}>전송</button>
      </div>
    </div>
  );
};

export default ChatRoomPage;
