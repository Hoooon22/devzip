package com.hoooon22.devzip.Controller;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
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
        int hash = ip.hashCode();
        int red = (hash & 0xFF0000) >> 16;
        int green = (hash & 0x00FF00) >> 8;
        int blue = hash & 0x0000FF;
        return String.format("#%02x%02x%02x", red, green, blue);
    }

    @MessageMapping("/chat/{keyword}")
    public void sendMessage(@DestinationVariable String keyword, @Payload ChatMessage incomingMessage) {
        try {
            // 클라이언트 IP 기반 색상 생성
            String ip = getClientIp();
            String color = getColorFromIp(ip);
            incomingMessage.setColor(color);

            // 해당 키워드의 채팅방 조회 또는 생성
            ChatRoom room = chatRoomService.getOrCreateChatRoom(keyword);

            // 메시지 저장 (채팅방, sender, content, color)
            ChatMessage savedMessage = chatMessageService.saveMessage(room, incomingMessage.getSender(), incomingMessage.getContent(), color);

            // 구독자에게 메시지 전송 (채팅방 id를 사용하여 브로드캐스트)
            messagingTemplate.convertAndSend("/topic/chat/" + room.getId(), savedMessage);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
