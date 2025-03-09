package com.hoooon22.devzip.Service;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.hoooon22.devzip.Model.ChatRoom;
import com.hoooon22.devzip.Repository.ChatRoomRepository;

import jakarta.transaction.Transactional;

@Service
public class ChatRoomService {
    
    private final ChatRoomRepository chatRoomRepository;

    @Autowired
    public ChatRoomService(ChatRoomRepository chatRoomRepository) {
        this.chatRoomRepository = chatRoomRepository;
    }

    @Transactional
    public ChatRoom getOrCreateChatRoom(String keyword) {
        // keyword로 채팅방 조회
        Optional<ChatRoom> chatRoom = chatRoomRepository.findByKeyword(keyword);
        if (chatRoom.isPresent()) {
            return chatRoom.get();
        }

        // 채팅방이 없으면 새로 생성 (keyword 설정)
        ChatRoom newRoom = new ChatRoom(keyword);
        return chatRoomRepository.save(newRoom);
    }
}
