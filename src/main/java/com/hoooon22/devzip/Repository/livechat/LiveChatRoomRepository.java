package com.hoooon22.devzip.Repository.livechat;

import com.hoooon22.devzip.Model.livechat.LiveChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LiveChatRoomRepository extends JpaRepository<LiveChatRoom, Long> {
}
