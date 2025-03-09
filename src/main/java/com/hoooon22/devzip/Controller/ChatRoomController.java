package com.hoooon22.devzip.Controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<ChatRoom> getOrCreateChatRoom(@RequestParam String keyword) {
        try {
            ChatRoom room = chatRoomService.getOrCreateChatRoom(keyword);
            return ResponseEntity.ok(room);
        } catch (Exception e) {
            e.printStackTrace(); // 로그 확인
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
