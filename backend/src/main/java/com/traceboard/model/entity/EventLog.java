package com.traceboard.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "event_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventLog extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String eventType;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String sessionId;

    private String path;

    private String referrer;

    @Column(columnDefinition = "TEXT")
    private String eventData;

    private String deviceType;

    private String browser;

    private String os;

    private String ipAddress;

    // 이벤트 발생 시간
    private LocalDateTime occurredAt;

    // 필요시 위도, 경도 (선택적)
    private Double latitude;
    private Double longitude;
}