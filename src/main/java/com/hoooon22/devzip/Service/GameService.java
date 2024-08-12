package com.hoooon22.devzip.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hoooon22.devzip.Model.GameRoom;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
@Service
public class GameService {
    
    private final ObjectMapper objectMapper;
    private Map<String, GameRoom> gameRooms;

    @PostConstruct
    private void init() {
        gameRooms = new LinkedHashMap<>();
    }

    public List<GameRoom> findAllRooms() {
        return new ArrayList<>(gameRooms.values());
    }

    public GameRoom findRoomById(String roomId) {
        return gameRooms.get(roomId);
    }

    public GameRoom createRoom(String name) {
        String randomId = UUID.randomUUID().toString();
        GameRoom gameRoom = GameRoom.builder()
                .roomId(randomId)
                .name(name)
                .build();
        gameRooms.put(randomId, gameRoom);
        return gameRoom;
    }

    public <T> void sendMessage(WebSocketSession session, T message) {
        try {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
        } catch (IOException e) {
            log.error(e.getMessage(), e);
        }
    }
}
