package com.traceboard.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventLogRequest {

    @NotBlank(message = "이벤트 타입은 필수입니다")
    private String eventType;

    private String path;
    private String referrer;
    private String eventData;
    private String deviceType;
    private String browser;
    private String os;
    private LocalDateTime occurredAt;
    
    // 위치 정보 (선택적)
    private Double latitude;
    private Double longitude;
}