package com.hoooon22.devzip.controller.livechat;

import com.hoooon22.devzip.dto.livechat.CreateLiveChatRoomRequest;
import com.hoooon22.devzip.dto.livechat.LiveChatMessageResponse;
import com.hoooon22.devzip.dto.livechat.LiveChatRoomResponse;
import com.hoooon22.devzip.service.livechat.LiveChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/livechat")
public class LiveChatController {

    private final LiveChatService liveChatService;

    @GetMapping("/rooms")
    public ResponseEntity<List<LiveChatRoomResponse>> getAllRooms() {
        return ResponseEntity.ok(liveChatService.findAllRooms());
    }

    @PostMapping("/rooms")
    public ResponseEntity<LiveChatRoomResponse> createRoom(@RequestBody CreateLiveChatRoomRequest request) {
        LiveChatRoomResponse room = liveChatService.createRoom(request);
        return ResponseEntity.ok(room);
    }

    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<List<LiveChatMessageResponse>> getRoomMessages(@PathVariable Long roomId) {
        return ResponseEntity.ok(liveChatService.findMessagesByRoomId(roomId));
    }
}
