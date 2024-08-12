package com.hoooon22.devzip.Model;

import java.util.HashSet;
import java.util.Set;

import org.springframework.web.socket.WebSocketSession;

import com.hoooon22.devzip.Service.GameService;

import lombok.Builder;
import lombok.Getter;

@Getter
public class GameRoom {
    private String roomId;
    private String name;
    private Set<WebSocketSession> sessions = new HashSet<>();
    
    @Builder
    public GameRoom(String roomId, String name) {
        this.roomId = roomId;
        this.name = name;
    }


    public void handleActions(WebSocketSession session, GameMessage gameMessage, GameService gameService) {
        if (gameMessage.getType().equals(GameMessage.MessageType.ENTER)) {
            sessions.add(session);
            gameMessage.setContent(gameMessage.getSender() + "님이 입장했습니다.");
        }
        sendMessage(gameMessage, gameService);
    }

    public <T> void sendMessage(T message, GameService gameService) {
        sessions.parallelStream().forEach(session -> gameService.sendMessage(session, message));
    }
}
