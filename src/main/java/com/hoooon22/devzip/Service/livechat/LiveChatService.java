package com.hoooon22.devzip.service.livechat;

import com.hoooon22.devzip.dto.livechat.CreateLiveChatRoomRequest;
import com.hoooon22.devzip.dto.livechat.LiveChatMessageResponse;
import com.hoooon22.devzip.dto.livechat.LiveChatRoomResponse;
import com.hoooon22.devzip.model.livechat.LiveChatMessage;
import com.hoooon22.devzip.model.livechat.LiveChatRoom;
import com.hoooon22.devzip.repository.livechat.LiveChatMessageRepository;
import com.hoooon22.devzip.repository.livechat.LiveChatRoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LiveChatService {

    private final LiveChatRoomRepository liveChatRoomRepository;
    private final LiveChatMessageRepository liveChatMessageRepository;

    public List<LiveChatRoomResponse> findAllRooms() {
        return liveChatRoomRepository.findAll().stream()
                .map(LiveChatRoomResponse::new)
                .collect(Collectors.toList());
    }

    @Transactional
    public LiveChatRoomResponse createRoom(CreateLiveChatRoomRequest request, String username) { // Add username
        LiveChatRoom liveChatRoom = new LiveChatRoom();
        liveChatRoom.setName(request.getName());
        liveChatRoom.setCreatorName(username); // Use username
        LiveChatRoom savedRoom = liveChatRoomRepository.save(liveChatRoom);
        return new LiveChatRoomResponse(savedRoom);
    }

    public List<LiveChatMessageResponse> findMessagesByRoomId(Long roomId) {
        // You might want to add a check to see if the room exists first
        return liveChatMessageRepository.findByLiveChatRoomId(roomId).stream()
                .map(LiveChatMessageResponse::new)
                .collect(Collectors.toList());
    }
}
