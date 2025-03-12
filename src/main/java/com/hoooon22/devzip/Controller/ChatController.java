package com.hoooon22.devzip.Controller;

import java.util.Map;

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
            // 세션 속성에서 클라이언트 고유 색상을 가져옵니다.
            Map<String, Object> sessionAttrs = headerAccessor.getSessionAttributes();
            System.out.println("Session attributes: " + sessionAttrs);
            String clientColor = sessionAttrs != null ? (String) sessionAttrs.get("clientColor") : null;
            System.out.println("clientColor: " + clientColor);
            if (clientColor == null || clientColor.isEmpty()) {
                clientColor = "#007bff"; // 기본값
            }
            incomingMessage.setColor(clientColor);
            
            ChatRoom room = chatRoomService.getOrCreateChatRoom(keyword);
            ChatMessage savedMessage = chatMessageService.saveMessage(
                    room, incomingMessage.getSender(), incomingMessage.getContent(), incomingMessage.getColor());
            messagingTemplate.convertAndSend("/topic/chat/" + room.getId(), savedMessage);
            
            // 디버그 정보를 문자열로 만들어 별도의 토픽으로 전송 (브라우저에서 구독)
            String debugMessage = "Session attributes: " + sessionAttrs + ", clientColor: " + clientColor;
            messagingTemplate.convertAndSend("/topic/debug", debugMessage);
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
