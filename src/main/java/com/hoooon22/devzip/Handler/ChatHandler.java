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
            // 수신한 메시지를 파싱하기 전에 JSON인지 확인합니다.
            if (payload.trim().startsWith("{")) {
                // JSON 형식인 경우에만 처리
                Map<String, Object> receivedMessage = objectMapper.readValue(payload, Map.class);

                // 처리 로직 (예: 클라이언트로 응답 전송)
                // ...

            } else {
                // JSON이 아닌 데이터의 경우 처리
                System.out.println("Received non-JSON data: " + payload);
            }
        } catch (Exception e) {
            System.err.println("Failed to parse message: " + payload);
            e.printStackTrace();
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
