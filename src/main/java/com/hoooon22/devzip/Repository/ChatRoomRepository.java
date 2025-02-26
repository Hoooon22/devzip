package com.hoooon22.devzip.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.hoooon22.devzip.Model.ChatRoom;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    // 특정 keyword에 해당하는 채팅방 조회
    Optional<ChatRoom> findByKeyword(String keyword);
}
