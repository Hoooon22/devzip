package com.hoooon22.devzip.Service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.hoooon22.devzip.Model.ChatMessage;
import com.hoooon22.devzip.Model.ChatRoom;
import com.hoooon22.devzip.Repository.ChatMessageRepository;

import jakarta.transaction.Transactional;

@Service
public class ChatMessageService {
    
    private final ChatMessageRepository chatMessageRepository;

    @Autowired
    public ChatMessageService(ChatMessageRepository chatMessageRepository) {
        this.chatMessageRepository = chatMessageRepository;
    }

    @Transactional
    public ChatMessage sendMessage(ChatRoom room, String sender, String content) {
        ChatMessage message = new ChatMessage(room, sender, content);
        return chatMessageRepository.save(message);
    }

    public List<ChatMessage> getMessagesByRoomID(Long roomId) {
        return chatMessageRepository.findByChatRoomId(roomId);
    }
}
