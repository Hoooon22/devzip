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
        LiveChatRoom room = liveChatRoomRepository.findById(messageRequest.getRoomId())
                .orElseThrow(() -> new RuntimeException("Chat room not found"));

        LiveChatMessage chatMessage = new LiveChatMessage();
        chatMessage.setLiveChatRoom(room);
        chatMessage.setSenderName(principal.getName());
        chatMessage.setMessage(messageRequest.getMessage());

        LiveChatMessage savedMessage = liveChatMessageRepository.save(chatMessage);

        LiveChatMessageDTO messageDTO = new LiveChatMessageDTO(
                savedMessage.getId(),
                savedMessage.getLiveChatRoom().getId(),
                savedMessage.getSenderName(),
                savedMessage.getMessage(),
                savedMessage.getCreatedAt()
        );

        messagingTemplate.convertAndSend("/topic/room/" + messageRequest.getRoomId(), messageDTO);
    }
}
