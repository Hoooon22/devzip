package com.hoooon22.devzip.Model.traceboard;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "event_logs")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventLog extends BaseTimeEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String eventType; // pageView, click, scroll, formSubmit 등
    
    @Column(name = "user_id")
    private String userId; // 익명화된 사용자 ID
    
    @Column(name = "session_id")
    private String sessionId; // 세션 ID
    
    @Column
    private String path; // 이벤트가 발생한 페이지 경로
    
    @Column
    private String referrer; // 유입 경로
    
    @Column(columnDefinition = "TEXT")
    private String eventData; // 추가 이벤트 데이터 (JSON)
    
    @Column(name = "device_type")
    private String deviceType; // mobile, tablet, desktop 등
    
    @Column
    private String browser; // Chrome, Firefox, Safari 등
    
    @Column
    private String os; // 운영체제 정보
    
    @Column(name = "ip_address")
    private String ipAddress; // IP 주소 (익명화 가능)
    
    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent; // 브라우저 및 OS 정보
    
    @Column(name = "occurred_at")
    private LocalDateTime occurredAt; // 이벤트 실제 발생 시간
    
    // 위치 정보 (선택적)
    @Column
    private Double latitude;
    
    @Column
    private Double longitude;
    
    @CreationTimestamp
    @Column(name = "timestamp", nullable = false, updatable = false)
    private LocalDateTime timestamp; // 서버에 기록된 시간
} 