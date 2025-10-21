package com.hoooon22.devzip.Config;

import com.hoooon22.devzip.Service.ActiveUserService;
import com.hoooon22.devzip.dto.musicbox.UserListMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

/**
 * WebSocket 이벤트 리스너
 *
 * 사용자 연결, 구독, 연결 해제 이벤트를 감지하여
 * 활성 사용자 목록을 업데이트하고 브로드캐스트합니다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final ActiveUserService activeUserService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * WebSocket 연결 이벤트
     */
    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        log.info("New WebSocket connection: session={}", sessionId);
    }

    /**
     * Topic 구독 이벤트 (실제 사용자 입장으로 간주)
     */
    @EventListener
    public void handleWebSocketSubscribeListener(SessionSubscribeEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        String destination = headerAccessor.getDestination();

        // /topic/musicbox/updates 구독 시에만 처리
        if (destination != null && (destination.equals("/topic/musicbox/updates") || destination.equals("/topic/musicbox/users"))) {
            // 사용자명 추출 (헤더에서 전달되거나 기본값 사용)
            String username = headerAccessor.getFirstNativeHeader("username");
            if (username == null || username.isEmpty()) {
                username = "사용자" + Math.abs(sessionId.hashCode() % 1000);
            }

            activeUserService.addUser(sessionId, username);
            broadcastUserList();
        }
    }

    /**
     * WebSocket 연결 해제 이벤트
     */
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();

        log.info("WebSocket disconnected: session={}", sessionId);
        activeUserService.removeUser(sessionId);
        broadcastUserList();
    }

    /**
     * 활성 사용자 목록을 모든 클라이언트에게 브로드캐스트
     */
    private void broadcastUserList() {
        UserListMessage message = UserListMessage.builder()
                .users(activeUserService.getActiveUsers().stream()
                        .map(ActiveUserService.ActiveUser::getUsername)
                        .toList())
                .totalCount(activeUserService.getActiveUserCount())
                .build();

        messagingTemplate.convertAndSend("/topic/musicbox/users", message);
        log.info("Broadcasted user list: {} users", message.getTotalCount());
    }
}
