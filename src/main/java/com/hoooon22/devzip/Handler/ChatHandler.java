package com.hoooon22.devzip.Handler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.ObjectMapper;

public class ChatHandler extends TextWebSocketHandler {
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, CharacterData> characters = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String clientIp = getClientIp(session);
        String color = getColorFromIp(clientIp);
        
        String characterId = session.getId();
        characters.put(characterId, new CharacterData(characterId, color, 0, 0));

        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(characters)));
        sessions.put(session.getId(), session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Map<String, Object> data = objectMapper.readValue(message.getPayload(), Map.class);

        // 처리된 데이터가 캐릭터 위치 변경일 경우
        if (data.containsKey("characterId") && data.containsKey("x") && data.containsKey("y")) {
            String characterId = (String) data.get("characterId");
            int x = (int) data.get("x");
            int y = (int) data.get("y");
            System.out.println(characterId);

            // 캐릭터 위치 업데이트
            CharacterData character = characters.get(characterId);
            if (character != null) {
                character.setX(x);
                character.setY(y);
                // 모든 클라이언트에게 업데이트된 캐릭터 정보 전송
                broadcastCharacters();
            }
        } else if (data.containsKey("message")) {
            // 처리된 데이터가 채팅 메시지일 경우
            broadcastMessage(data);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessions.remove(session.getId());
        characters.remove(session.getId());
    }

    private void broadcastCharacters() throws Exception {
        String charactersJson = objectMapper.writeValueAsString(characters);
        for (WebSocketSession s : sessions.values()) {
            s.sendMessage(new TextMessage(charactersJson));
        }
    }

    private void broadcastMessage(Map<String, Object> message) throws Exception {
        String messageJson = objectMapper.writeValueAsString(message);
        for (WebSocketSession s : sessions.values()) {
            s.sendMessage(new TextMessage(messageJson));
        }
    }

    private String getClientIp(WebSocketSession session) {
        String xForwardedForHeader = session.getHandshakeHeaders().getFirst("X-Forwarded-For");
        if (xForwardedForHeader != null && !xForwardedForHeader.isEmpty()) {
            return xForwardedForHeader.split(",")[0].trim();
        } else {
            return session.getRemoteAddress().getAddress().getHostAddress();
        }
    }

    private String getColorFromIp(String ip) {
        int hash = ip.hashCode();
        int red = (hash & 0xFF0000) >> 16;
        int green = (hash & 0x00FF00) >> 8;
        int blue = hash & 0x0000FF;
        return String.format("#%02x%02x%02x", red, green, blue);
    }

    private static class CharacterData {
        private String id;
        private String color;
        private int x;
        private int y;

        public CharacterData(String id, String color, int x, int y) {
            this.id = id;
            this.color = color;
            this.x = x;
            this.y = y;
        }

        // Getters and setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }
        public int getX() { return x; }
        public void setX(int x) { this.x = x; }
        public int getY() { return y; }
        public void setY(int y) { this.y = y; }
    }
}
