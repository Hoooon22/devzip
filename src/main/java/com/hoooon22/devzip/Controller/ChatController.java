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

import jakarta.servlet.http.HttpServletRequest;

@Controller
public class ChatController {

    private final ChatRoomService chatRoomService;
    private final ChatMessageService chatMessageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final HttpServletRequest request;

    public ChatController(ChatRoomService chatRoomService,
                          ChatMessageService chatMessageService,
                          SimpMessagingTemplate messagingTemplate,
                          HttpServletRequest request) {
        this.chatRoomService = chatRoomService;
        this.chatMessageService = chatMessageService;
        this.messagingTemplate = messagingTemplate;
        this.request = request;
    }

    // IP 정보를 가져오는 메서드 (간단한 예시)
    private String getClientIp() {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isEmpty()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    // IP를 기반으로 색상을 생성하는 메서드 (EntryService의 로직 참고)
    private String getColorFromIp(String ip) {
        // 해시값이 음수일 수 있으므로 절대값을 취합니다.
        int hash = Math.abs(ip.hashCode());
        // 오른쪽 시프트 후 0xFF와 AND 연산하여 각 색상 값을 추출합니다.
        int red = (hash >> 16) & 0xFF;
        int green = (hash >> 8) & 0xFF;
        int blue = hash & 0xFF;
        return String.format("#%02x%02x%02x", red, green, blue);
    }
    

    @MessageMapping("/chat/{keyword}")
    public void sendMessage(@DestinationVariable String keyword,
                            @Payload ChatMessage incomingMessage,
                            SimpMessageHeaderAccessor headerAccessor) {
        try {
            // WebSocket 세션 속성에서 IP 가져오기
            String ip = (String) headerAccessor.getSessionAttributes().get("clientIp");
            if (ip == null || ip.isEmpty()) {
                ip = "0.0.0.0"; // 기본값 설정
            }
            String color = getColorFromIp(ip);
            incomingMessage.setColor(color);
            
            ChatRoom room = chatRoomService.getOrCreateChatRoom(keyword);
            ChatMessage savedMessage = chatMessageService.saveMessage(
                    room, incomingMessage.getSender(), incomingMessage.getContent(), incomingMessage.getColor());
            messagingTemplate.convertAndSend("/topic/chat/" + room.getId(), savedMessage);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
