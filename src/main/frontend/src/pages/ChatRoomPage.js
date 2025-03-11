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

  // 채팅방 정보 API 호출
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

  // WebSocket 연결 설정
  useEffect(() => {
    // SockJS를 사용하여 엔드포인트 연결
    const socket = new SockJS("https://devzip.site/ws");
    stompClient.current = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("WebSocket 연결 성공");
        // 채팅방 구독 (room.id가 필요하므로 room 정보가 로드된 후 구독)
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
      sender: "익명", // 임시 닉네임, 필요하면 사용자 정보 사용
      content: input,
    };
    // 채팅 메시지는 "/app/chat/{keyword}"로 전송합니다.
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
              <strong>{msg.sender}</strong>: {msg.content}
              <span className="timestamp">{msg.formattedSentAt || msg.sentAt}</span>
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
