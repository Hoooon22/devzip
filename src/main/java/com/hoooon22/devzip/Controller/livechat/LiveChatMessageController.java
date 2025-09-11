package com.hoooon22.devzip.controller.livechat;

import com.hoooon22.devzip.dto.livechat.LiveChatMessageRequest;
import com.hoooon22.devzip.model.livechat.LiveChatMessage;
import com.hoooon22.devzip.model.livechat.LiveChatRoom;
import com.hoooon22.devzip.repository.livechat.LiveChatMessageRepository;
import com.hoooon22.devzip.repository.livechat.LiveChatRoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;

@Controller
@RequiredArgsConstructor
public class LiveChatMessageController {

    private final SimpMessageSendingOperations messagingTemplate;
    private final LiveChatMessageRepository liveChatMessageRepository;
    private final LiveChatRoomRepository liveChatRoomRepository; // To find the room

    @MessageMapping("/livechat/message")
    public void message(LiveChatMessageRequest messageRequest) {
        // For simplicity, we're not creating a full service layer for this part yet.
        // In a larger app, this logic would be in LiveChatService.

        LiveChatRoom room = liveChatRoomRepository.findById(messageRequest.getRoomId())
                .orElseThrow(() -> new RuntimeException("Chat room not found"));

        LiveChatMessage chatMessage = new LiveChatMessage();
        chatMessage.setLiveChatRoom(room);
        chatMessage.setSenderName(messageRequest.getSenderName());
        chatMessage.setMessage(messageRequest.getMessage());
        // BaseTimeEntity will set createdAt

        LiveChatMessage savedMessage = liveChatMessageRepository.save(chatMessage);

        // Broadcasting the message to all subscribers of the room topic
        messagingTemplate.convertAndSend("/topic/room/" + messageRequest.getRoomId(), savedMessage);
    }
}
