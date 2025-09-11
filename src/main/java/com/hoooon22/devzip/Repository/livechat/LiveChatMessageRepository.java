package com.hoooon22.devzip.repository.livechat;

import com.hoooon22.devzip.model.livechat.LiveChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LiveChatMessageRepository extends JpaRepository<LiveChatMessage, Long> {
    List<LiveChatMessage> findByLiveChatRoomId(Long roomId);
}
