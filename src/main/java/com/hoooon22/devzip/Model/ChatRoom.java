package com.hoooon22.devzip.Model;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "chat_room")
public class ChatRoom {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 검색어 기반 채팅방 구분, 중복 방지
    @Column(nullable = false, unique = true)
    private String keyword;

    // 채팅방 생성 일시 (null이 되지 않도록 설정)
    @Column(nullable = false, updatable = false)
    private LocalDateTime createDate;

    // 채팅방 업데이트 일시
    private LocalDateTime updatedDate;

    // 채팅방 상태 (예: "ACTIVE", "ARCHIVED")
    @Column(nullable = false)
    private String status;

    // 기본 생성자 (JPA 용)
    public ChatRoom() {}

    // 생성자: 새 채팅방 생성 시 keyword만 전달받음
    public ChatRoom(String keyword) {
        this.keyword = keyword;
    }
    
    @PrePersist
    public void prePersist() {
        this.createDate = LocalDateTime.now();
        this.updatedDate = this.createDate;
        if (this.status == null) {
            this.status = "ACTIVE";
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedDate = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getKeyword() {
        return keyword;
    }

    public void setKeyword(String keyword) {
        this.keyword = keyword;
    }

    public LocalDateTime getCreateDate() {
        return createDate;
    }

    public void setCreateDate(LocalDateTime createDate) {
        this.createDate = createDate;
    }

    public LocalDateTime getUpdatedDate() {
        return updatedDate;
    }

    public void setUpdatedDate(LocalDateTime updatedDate) {
        this.updatedDate = updatedDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    // 생성일을 읽기 좋게 포맷하여 반환
    public String getFormattedCreateDate() {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        return createDate.format(formatter);
    }
}
