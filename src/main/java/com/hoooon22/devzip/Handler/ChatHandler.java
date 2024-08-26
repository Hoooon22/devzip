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
        String payload = message.getPayload();
    
        try {
            if (payload.trim().startsWith("{")) {
                Map<String, Object> receivedMessage = objectMapper.readValue(payload, Map.class);
                String type = (String) receivedMessage.get("type");
    
                if ("move".equals(type)) {
                    // 캐릭터 이동 처리 로직
                    String characterId = (String) receivedMessage.get("characterId");
                    int x = (int) receivedMessage.get("x");
                    int y = (int) receivedMessage.get("y");
                    // 캐릭터 위치 업데이트 로직 (필요에 따라 구현)
                }
            } else {
                System.out.println("Received non-JSON data: " + payload);
            }
        } catch (Exception e) {
            System.err.println("Failed to parse message: " + payload);
            e.printStackTrace();
        }
    
        for (WebSocketSession s : sessions.values()) {
            s.sendMessage(new TextMessage(payload));
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
