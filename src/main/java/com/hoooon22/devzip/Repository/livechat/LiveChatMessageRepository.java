package com.hoooon22.devzip.Repository.livechat;

import com.hoooon22.devzip.Model.livechat.LiveChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LiveChatMessageRepository extends JpaRepository<LiveChatMessage, Long> {
    List<LiveChatMessage> findByLiveChatRoomId(Long roomId);
}
