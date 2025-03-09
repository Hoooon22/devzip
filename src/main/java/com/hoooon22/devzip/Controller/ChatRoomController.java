package com.hoooon22.devzip.Controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hoooon22.devzip.Model.ChatRoom;
import com.hoooon22.devzip.Service.ChatRoomService;

@RestController
@RequestMapping("/api/chatrooms")
public class ChatRoomController {

    private final ChatRoomService chatRoomService;

    @Autowired
    public ChatRoomController(ChatRoomService chatRoomService) {
        this.chatRoomService = chatRoomService;
    }
    
    @GetMapping
    public ChatRoom getOrCreateChatRoom(@RequestParam String keyword) {
        return chatRoomService.getOrCreateChatRoom(keyword);
    }
}
