package com.hoooon22.devzip.Service.livechat;

import com.hoooon22.devzip.dto.livechat.CreateLiveChatRoomRequest;
import com.hoooon22.devzip.dto.livechat.LiveChatMessageResponse;
import com.hoooon22.devzip.dto.livechat.LiveChatRoomResponse;
import com.hoooon22.devzip.Model.livechat.LiveChatMessage;
import com.hoooon22.devzip.Model.livechat.LiveChatRoom;
import com.hoooon22.devzip.Model.User;
import com.hoooon22.devzip.Repository.livechat.LiveChatMessageRepository;
import com.hoooon22.devzip.Repository.livechat.LiveChatRoomRepository;
import com.hoooon22.devzip.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LiveChatService {

    private final LiveChatRoomRepository liveChatRoomRepository;
    private final LiveChatMessageRepository liveChatMessageRepository;
    private final UserRepository userRepository;

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

    @Transactional
    public void deleteRoom(Long roomId, String username) {
        LiveChatRoom room = liveChatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방을 찾을 수 없습니다."));

        Optional<User> user = userRepository.findByUsername(username);

        if (user.isPresent() && user.get().getRole() == User.Role.ADMIN) {
            // 관리자는 모든 채팅방 삭제 가능
            liveChatRoomRepository.delete(room);
        } else if (room.getCreatorName().equals(username)) {
            // 일반 유저는 자신이 만든 채팅방만 삭제 가능
            liveChatRoomRepository.delete(room);
        } else {
            throw new AccessDeniedException("채팅방을 삭제할 권한이 없습니다.");
        }
    }
}
