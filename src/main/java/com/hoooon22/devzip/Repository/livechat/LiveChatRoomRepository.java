package com.hoooon22.devzip.repository.livechat;

import com.hoooon22.devzip.model.livechat.LiveChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LiveChatRoomRepository extends JpaRepository<LiveChatRoom, Long> {
}
