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
        String characterId = session.getId();
        characters.put(characterId, new CharacterData(characterId, "#000000", 0, 0)); // Default color
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(characters)));
        sessions.put(characterId, session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Map<String, Object> data = objectMapper.readValue(message.getPayload(), Map.class);

        if (data.containsKey("username")) {
            // Handle username
            String characterId = session.getId();
            String username = (String) data.get("username");
            CharacterData character = characters.get(characterId);
            if (character != null) {
                character.setName(username);
                broadcastCharacters();
            }
        } else if (data.containsKey("characterId") && data.containsKey("x") && data.containsKey("y")) {
            // Handle character movement
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
            // Handle chat message
            broadcastMessage(data);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessions.remove(session.getId());
        characters.remove(session.getId());
        broadcastCharacters(); // Update remaining clients
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

