package com.hoooon22.devzip.Controller;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
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

    // 클라이언트가 "/app/chat/{keyword}"로 메시지를 보내면 처리
    @MessageMapping("/chat/{keyword}")
    public void sendMessage(@DestinationVariable String keyword, ChatMessage incomingMessage) {
        // 해당 키워드의 채팅방 조회 또는 생성
        ChatRoom room = chatRoomService.getOrCreateChatRoom(keyword);
        // 메시지 저장 (incomingMessage의 sender와 content를 사용)
        ChatMessage savedMessage = chatMessageService.saveMessage(room, incomingMessage.getSender(), incomingMessage.getContent());
        // 구독자에게 메시지 전송 (채팅방 id를 사용하여 브로드캐스트)
        messagingTemplate.convertAndSend("/topic/chat/" + room.getId(), savedMessage);
    }
}
