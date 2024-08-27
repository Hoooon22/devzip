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
    private final Map<String, String> ipToSessionId = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String clientIp = getClientIp(session);
        String characterId = session.getId();
        
        if (ipToSessionId.containsKey(clientIp)) {
            WebSocketSession existingSession = sessions.get(ipToSessionId.get(clientIp));
            if (existingSession != null) {
                existingSession.sendMessage(new TextMessage("{\"error\": \"Another session is already active from your IP.\"}"));
            }
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        ipToSessionId.put(clientIp, characterId);
        characters.put(characterId, new CharacterData(characterId, getColorFromIp(clientIp), 0, 0));
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(characters)));
        sessions.put(characterId, session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Map<String, Object> data = objectMapper.readValue(message.getPayload(), Map.class);

        if (data.containsKey("username")) {
            String characterId = session.getId();
            String username = (String) data.get("username");
            CharacterData character = characters.get(characterId);
            if (character != null) {
                character.setName(username);
                broadcastCharacters();
            }
        } else if (data.containsKey("characterId") && data.containsKey("x") && data.containsKey("y")) {
            String characterId = (String) data.get("characterId");
            int x = (int) data.get("x");
            int y = (int) data.get("y");

            CharacterData character = characters.get(characterId);
            if (character != null) {
                character.setX(x);
                character.setY(y);
                broadcastCharacters();
            }
        } else if (data.containsKey("message")) {
            broadcastMessage(data);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String characterId = session.getId();
        String clientIp = getClientIp(session);

        sessions.remove(characterId);
        characters.remove(characterId);
        ipToSessionId.remove(clientIp);
        broadcastCharacters();
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
        private String name;

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
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
    }
}
