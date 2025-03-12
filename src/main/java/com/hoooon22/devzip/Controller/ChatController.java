package com.hoooon22.devzip.Controller;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.hoooon22.devzip.Model.ChatMessage;
import com.hoooon22.devzip.Model.ChatRoom;
import com.hoooon22.devzip.Service.ChatMessageService;
import com.hoooon22.devzip.Service.ChatRoomService;

@Controller
public class ChatController {

    private final ChatRoomService chatRoomService;
    private final ChatMessageService chatMessageService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatController(ChatRoomService chatRoomService,
                          ChatMessageService chatMessageService,
                          SimpMessagingTemplate messagingTemplate) {
        this.chatRoomService = chatRoomService;
        this.chatMessageService = chatMessageService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat/{keyword}")
    public void sendMessage(@DestinationVariable String keyword,
                            @Payload ChatMessage incomingMessage,
                            SimpMessageHeaderAccessor headerAccessor) {
        try {
            // WebSocket 세션 속성에서 클라이언트의 고유 색상을 가져옵니다.
            String clientColor = (String) headerAccessor.getSessionAttributes().get("clientColor");
            if (clientColor == null || clientColor.isEmpty()) {
                clientColor = "#007bff"; // 기본값
            }
            // 이 색상을 메시지에 설정합니다.
            incomingMessage.setColor(clientColor);
            
            // 해당 키워드의 채팅방 조회 또는 생성
            ChatRoom room = chatRoomService.getOrCreateChatRoom(keyword);
            ChatMessage savedMessage = chatMessageService.saveMessage(
                    room, incomingMessage.getSender(), incomingMessage.getContent(), incomingMessage.getColor());
            // 메시지를 채팅방의 구독자에게 전송
            messagingTemplate.convertAndSend("/topic/chat/" + room.getId(), savedMessage);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
