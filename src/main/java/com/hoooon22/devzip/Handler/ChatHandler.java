package com.hoooon22.devzip.Handler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.ObjectMapper;

public class ChatHandler extends TextWebSocketHandler {

    // 클라이언트 세션을 저장하기 위한 맵
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 메시지를 처리하는 메서드
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        // 클라이언트로부터 받은 메시지를 JSON 형식으로 변환
        Map<String, Object> receivedMessage = objectMapper.readValue(message.getPayload(), Map.class);
        
        // 예시: 서버에서 특정 데이터를 JSON 형식으로 클라이언트에게 전송
        Map<String, Object> responseMessage = Map.of(
            "characterId", "character1",
            "x", 100,
            "y", 150,
            "color", "#ff0000"
        );
        
        String jsonResponse = objectMapper.writeValueAsString(responseMessage);
        
        // 메시지 수신 시 모든 클라이언트에게 브로드캐스트
        for (WebSocketSession s : sessions.values()) {
            s.sendMessage(new TextMessage(jsonResponse));
        }
    }

    // 새로운 클라이언트가 연결될 때 호출되는 메서드
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.put(session.getId(), session);
    }

    // 클라이언트가 연결을 종료할 때 호출되는 메서드
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessions.remove(session.getId());
    }
}
