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
import lombok.NoArgsConstructor;

@Entity
@Table(name = "event_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String eventType; // pageView, click, scroll, formSubmit 등
    
    @Column(nullable = false)
    private String path; // 이벤트가 발생한 페이지 경로
    
    @Column(nullable = false)
    private String userId; // 익명화된 사용자 ID
    
    @Column(nullable = false)
    private String deviceType; // mobile, tablet, desktop 등
    
    @Column(nullable = false)
    private String browser; // Chrome, Firefox, Safari 등
    
    @Column
    private String referrer; // 유입 경로
    
    @Column
    private String ipAddress; // IP 주소 (익명화 가능)
    
    @Column
    private String userAgent; // 브라우저 및 OS 정보
    
    @Column
    private String eventData; // 추가 이벤트 데이터 (JSON)
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp; // 이벤트 발생 시간
} 