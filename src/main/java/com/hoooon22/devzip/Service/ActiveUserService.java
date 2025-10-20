package com.hoooon22.devzip.Service;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 활성 사용자 관리 서비스
 *
 * WebSocket 세션과 사용자명을 매핑하여 실시간 접속자를 추적합니다.
 */
@Service
@Slf4j
public class ActiveUserService {

    // 세션 ID -> 사용자명 매핑
    private final Map<String, String> sessionUserMap = new ConcurrentHashMap<>();

    /**
     * 사용자 추가
     */
    public void addUser(String sessionId, String username) {
        sessionUserMap.put(sessionId, username);
        log.info("User added: {} (session: {})", username, sessionId);
        log.info("Total active users: {}", sessionUserMap.size());
    }

    /**
     * 사용자 제거
     */
    public void removeUser(String sessionId) {
        String username = sessionUserMap.remove(sessionId);
        if (username != null) {
            log.info("User removed: {} (session: {})", username, sessionId);
            log.info("Total active users: {}", sessionUserMap.size());
        }
    }

    /**
     * 활성 사용자 목록 조회
     */
    public List<ActiveUser> getActiveUsers() {
        List<ActiveUser> users = new ArrayList<>();
        sessionUserMap.forEach((sessionId, username) -> {
            users.add(new ActiveUser(sessionId, username));
        });
        return users;
    }

    /**
     * 활성 사용자 수 조회
     */
    public int getActiveUserCount() {
        return sessionUserMap.size();
    }

    /**
     * 활성 사용자 정보
     */
    @Getter
    public static class ActiveUser {
        private final String sessionId;
        private final String username;

        public ActiveUser(String sessionId, String username) {
            this.sessionId = sessionId;
            this.username = username;
        }
    }
}
