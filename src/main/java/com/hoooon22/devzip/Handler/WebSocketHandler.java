package com.hoooon22.devzip.Handler;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hoooon22.devzip.Model.GameMessage;
import com.hoooon22.devzip.Model.GameRoom;
import com.hoooon22.devzip.Service.GameService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
@Component
public class WebSocketHandler extends TextWebSocketHandler {
    
    private final ObjectMapper objectMapper;
    private final GameService gameService;

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        log.info("payload: {}", payload);
        GameMessage gameMessage = objectMapper.readValue(payload, GameMessage.class);
        GameRoom room = gameService.findRoomById(gameMessage.getRoomId());
        room.handleActions(session, gameMessage, gameService);
    }
}
