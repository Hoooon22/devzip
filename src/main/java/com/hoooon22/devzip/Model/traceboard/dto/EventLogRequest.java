package com.hoooon22.devzip.Model.traceboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class EventLogRequest {
    
    // 이벤트 타입 (필수)
    private String eventType;
    
    // 사용자 ID (선택)
    private String userId;
    
    // 페이지 경로 (필수)
    private String path;
    
    // 참조 URL (선택)
    private String referrer;
    
    // 이벤트 추가 데이터 (선택) - JSON 문자열
    private String eventData;
    
    // 디바이스 타입 (선택)
    private String deviceType;
    
    // 브라우저 정보 (선택)
    private String browser;
    
    // 운영체제 정보 (선택)
    private String os;
    
    // User Agent 정보 (선택)
    private String userAgent;
    
    // 이벤트 발생 시간 (선택, null이면 서버 시간 사용)
    private LocalDateTime occurredAt;
    
    // 위도 (선택)
    private Double latitude;
    
    // 경도 (선택)
    private Double longitude;
} 