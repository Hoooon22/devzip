package com.traceboard.model.dto;

import com.traceboard.model.entity.EventLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventLogResponse {
    private Long id;
    private String eventType;
    private String userId;
    private String sessionId;
    private String path;
    private String referrer;
    private String eventData;
    private String deviceType;
    private String browser;
    private String os;
    private LocalDateTime occurredAt;
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
                .occurredAt(eventLog.getOccurredAt())
                .createdAt(eventLog.getCreatedAt())
                .build();
    }
}