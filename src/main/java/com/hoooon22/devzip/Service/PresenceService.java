package com.hoooon22.devzip.Service;

import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

/**
 * 실시간 접속자(presence) 집계 서비스.
 * 클라이언트가 주기적으로 보내는 하트비트를 인메모리에 보관하고,
 * TTL이 지난 항목을 걷어낸 스냅샷(전체 인원 + 페이지별 인원)을 돌려줍니다.
 * 서버 재시작 시 사라져도 무방한 휘발성 데이터라 별도 저장소를 두지 않습니다.
 */
@Service
public class PresenceService {

    // 하트비트 주기(30초) 2회 유실까지는 접속 중으로 간주
    private static final long TTL_MS = 75_000L;
    // 비인증 공개 엔드포인트이므로 인메모리 맵 크기에 보호 상한을 둔다
    private static final int MAX_CLIENTS = 10_000;

    private final ConcurrentHashMap<String, Beat> beats = new ConcurrentHashMap<>();

    public Snapshot heartbeat(String clientId, String page) {
        long now = System.currentTimeMillis();
        beats.entrySet().removeIf(e -> now - e.getValue().lastSeen() > TTL_MS);
        if (beats.size() < MAX_CLIENTS || beats.containsKey(clientId)) {
            beats.put(clientId, new Beat(page, now));
        }
        Map<String, Long> pages = new TreeMap<>();
        for (Beat beat : beats.values()) {
            pages.merge(beat.page(), 1L, Long::sum);
        }
        return new Snapshot(beats.size(), pages);
    }

    private record Beat(String page, long lastSeen) {}

    public record Snapshot(int total, Map<String, Long> pages) {}
}
