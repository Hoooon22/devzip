package com.hoooon22.devzip.Controller;

import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hoooon22.devzip.Model.ChatRoom;
import com.hoooon22.devzip.Service.ChatRoomService;

@RestController
@RequestMapping("/api/chatrooms")
public class ChatRoomController {

    private final ChatRoomService chatRoomService;

    public ChatRoomController(ChatRoomService chatRoomService) {
        this.chatRoomService = chatRoomService;
    }

    // 키워드를 통한 채팅방 생성/조회
    @GetMapping
    public ResponseEntity<?> getOrCreateChatRoom(@RequestParam String keyword) {
        try {
            ChatRoom room = chatRoomService.getOrCreateChatRoom(keyword);
            return ResponseEntity.ok(room);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                 .body("{\"error\": \"채팅방 생성에 실패했습니다.\"}");
        }
    }

    // ID로 채팅방 정보를 조회하는 엔드포인트 추가
    @GetMapping("/{id}")
    public ResponseEntity<?> getChatRoomById(@PathVariable Long id) {
        Optional<ChatRoom> room = chatRoomService.getChatRoomById(id);
        if (room.isPresent()) {
            return ResponseEntity.ok(room.get());
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                 .body("{\"error\": \"채팅방을 찾을 수 없습니다.\"}");
        }
    }
}
