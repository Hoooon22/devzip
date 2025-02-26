package com.hoooon22.devzip.Model;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "ChatMessage")
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 어떤 채팅방에 속하는 메시지인지 지정 (ChatRoom과 다대일 관계)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false)
    private ChatRoom chatRoom;

    // 발신자: 익명 사용자일 경우 임시 닉네임이나 식별자 사용
    @Column(nullable = false)
    private String sender;

    // 메시지 내용
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    // 메시지 전송 시각
    @Column(nullable = false, updatable = false)
    private LocalDateTime sentAt;

    // 기본 생성자 (JPA 용)
    public ChatMessage() {}

    // 생성자: 채팅방, 발신자, 내용으로 초기화
    public ChatMessage(ChatRoom chatRoom, String sender, String content) {
        this.chatRoom = chatRoom;
        this.sender = sender;
        this.content = content;
        this.sentAt = LocalDateTime.now();
    }

    // Getters & Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ChatRoom getChatRoom() {
        return chatRoom;
    }

    public void setChatRoom(ChatRoom chatRoom) {
        this.chatRoom = chatRoom;
    }

    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }

    // 전송 시각을 읽기 좋게 포맷팅하여 반환
    public String getFormattedSentAt() {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        return sentAt.format(formatter);
    }
}
