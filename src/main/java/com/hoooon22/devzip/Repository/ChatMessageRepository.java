package com.hoooon22.devzip.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.hoooon22.devzip.Model.ChatMessage;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    // 특정 채팅방의 ID를 기반으로 메시지를 조회
        List<ChatMessage> findByChatRoomId(Long chatRoomId);
}
