package com.hoooon22.devzip.Controller.livechat;

import com.hoooon22.devzip.dto.livechat.LiveChatMessageDTO;
import com.hoooon22.devzip.dto.livechat.LiveChatMessageRequest;
import com.hoooon22.devzip.Model.livechat.LiveChatMessage;
import com.hoooon22.devzip.Model.livechat.LiveChatRoom;
import com.hoooon22.devzip.Repository.livechat.LiveChatMessageRepository;
import com.hoooon22.devzip.Repository.livechat.LiveChatRoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;
import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class LiveChatMessageController {

    private final SimpMessageSendingOperations messagingTemplate;
    private final LiveChatMessageRepository liveChatMessageRepository;
    private final LiveChatRoomRepository liveChatRoomRepository;

    @MessageMapping("/livechat/message")
    public void message(LiveChatMessageRequest messageRequest, Principal principal) {
        System.out.println("Received message request: " + messageRequest.getMessage() + " for room: " + messageRequest.getRoomId());
        System.out.println("Principal: " + (principal != null ? principal.getName() : "null"));

        try {
            LiveChatRoom room = liveChatRoomRepository.findById(messageRequest.getRoomId())
                    .orElseThrow(() -> new RuntimeException("Chat room not found"));

            LiveChatMessage chatMessage = new LiveChatMessage();
            chatMessage.setLiveChatRoom(room);

            // Principal이 null인 경우 임시로 senderName 사용
            String senderName = (principal != null) ? principal.getName() :
                               (messageRequest.getSenderName() != null) ? messageRequest.getSenderName() : "Anonymous";
            chatMessage.setSenderName(senderName);
            chatMessage.setMessage(messageRequest.getMessage());

        LiveChatMessage savedMessage = liveChatMessageRepository.save(chatMessage);
        System.out.println("Message saved with ID: " + savedMessage.getId());

        LiveChatMessageDTO messageDTO = new LiveChatMessageDTO(
                savedMessage.getId(),
                savedMessage.getLiveChatRoom().getId(),
                savedMessage.getSenderName(),
                savedMessage.getMessage(),
                savedMessage.getCreatedAt()
        );

            System.out.println("Sending DTO: " + messageDTO.getMessage() + " to topic: /topic/room/" + messageRequest.getRoomId());
            messagingTemplate.convertAndSend("/topic/room/" + messageRequest.getRoomId(), messageDTO);
            System.out.println("Message sent to topic");
        } catch (Exception e) {
            System.err.println("Error processing message: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
