package com.hoooon22.devzip.Model.traceboard.dto;

import com.hoooon22.devzip.Model.traceboard.EventLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class EventLogResponse {
    
    // 이벤트 로그 ID
    private Long id;
    
    // 이벤트 타입
    private String eventType;
    
    // 사용자 ID (인증된 사용자인 경우)
    private String userId;
    
    // 세션 ID
    private String sessionId;
    
    // 페이지 경로
    private String path;
    
    // 참조 URL
    private String referrer;
    
    // 이벤트 추가 데이터 - JSON 문자열
    private String eventData;
    
    // 디바이스 타입
    private String deviceType;
    
    // 브라우저 정보
    private String browser;
    
    // 운영체제 정보
    private String os;
    
    // IP 주소
    private String ipAddress;
    
    // 사용자 에이전트
    private String userAgent;
    
    // 이벤트 발생 시간
    private LocalDateTime occurredAt;
    
    // 위도
    private Double latitude;
    
    // 경도
    private Double longitude;
    
    // 생성 시간
    private LocalDateTime createdAt;

    public static EventLogResponse fromEntity(EventLog eventLog) {
        return EventLogResponse.builder()
                .id(eventLog.getId())
                .eventType(eventLog.getEventType())
                .userId(eventLog.getUserId())
                .sessionId(eventLog.getSessionId())
                .path(eventLog.getPath())
                .referrer(eventLog.getReferrer())
                .eventData(eventLog.getEventData())
                .deviceType(eventLog.getDeviceType())
                .browser(eventLog.getBrowser())
                .os(eventLog.getOs())
                .ipAddress(eventLog.getIpAddress())
                .userAgent(eventLog.getUserAgent())
                .occurredAt(eventLog.getOccurredAt())
                .latitude(eventLog.getLatitude())
                .longitude(eventLog.getLongitude())
                .createdAt(eventLog.getCreatedAt())
                .build();
    }
} 