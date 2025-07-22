package com.hoooon22.devzip.Model.traceboard;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "api_keys")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiKey extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "api_key", unique = true, nullable = false)
    private String keyValue;

    @Column(name = "key_name")
    private String keyName;

    @Column(name = "description")
    private String description;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    // 사용량 제한
    @Builder.Default
    @Column(name = "requests_per_hour")
    private Integer requestsPerHour = 1000;

    @Builder.Default
    @Column(name = "requests_per_day")
    private Integer requestsPerDay = 10000;

    // 현재 사용량 (Redis나 별도 테이블로 관리하는 것이 더 좋음)
    @Builder.Default
    @Column(name = "current_hourly_requests")
    private Integer currentHourlyRequests = 0;

    @Builder.Default
    @Column(name = "current_daily_requests")
    private Integer currentDailyRequests = 0;
}