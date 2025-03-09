import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../assets/css/ChatRoomPage.scss";

const ChatRoomPage = () => {
  const { roomId } = useParams(); // URL에서 채팅방 ID 읽기
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  // 채팅방 정보를 API로부터 가져오기
  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        // 채팅방 조회 API (예: GET /api/chatrooms/{roomId})
        const res = await fetch(`/api/chatrooms/${roomId}`);
        const data = await res.json();
        setRoom(data);
      } catch (error) {
        console.error("채팅방 정보 가져오기 실패:", error);
      }
    };

    fetchRoomDetails();
  }, [roomId]);

  // 채팅 메시지를 주기적으로 불러오기 (예: 5초마다)
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        // 채팅 메시지 조회 API (예: GET /api/chatmessages/{roomId})
        const res = await fetch(`/api/chatmessages/${roomId}`);
        const data = await res.json();
        setMessages(data);
      } catch (error) {
        console.error("메시지 가져오기 실패:", error);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [roomId]);

  // 메시지 전송 핸들러 (POST /api/chatmessages)
  const sendMessage = async () => {
    if (!input.trim()) return;
    try {
      const params = new URLSearchParams();
      // 채팅방 API에서는 키워드로 채팅방을 구분하므로, room.keyword를 같이 보냅니다.
      params.append("keyword", room.keyword);
      params.append("sender", "익명"); // 임시 익명 닉네임
      params.append("content", input);

      const res = await fetch("/api/chatmessages", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const newMsg = await res.json();
      setMessages((prev) => [...prev, newMsg]);
      setInput("");
    } catch (error) {
      console.error("메시지 전송 실패:", error);
    }
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
        {messages && messages.length > 0 ? (
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
