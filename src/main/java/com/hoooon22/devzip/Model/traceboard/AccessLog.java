package com.hoooon22.devzip.Model.traceboard;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

/**
 * 접근 로그 엔티티
 *
 * 보안 주의사항:
 * - 이 엔티티는 원본 IP 주소를 저장합니다
 * - 관리자만 접근 가능하도록 컨트롤러에서 엄격한 권한 체크 필요
 * - 개인정보 보호법 준수를 위해 로그 보관 기간 정책 필요 (예: 6개월)
 * - 정기적인 로그 삭제 작업 스케줄링 권장
 */
@Entity
@Table(name = "access_logs", indexes = {
    @Index(name = "idx_access_time", columnList = "accessTime"),
    @Index(name = "idx_ip_address", columnList = "ipAddress"),
    @Index(name = "idx_username", columnList = "username")
})
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccessLog extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 원본 IP 주소 (암호화되지 않음 - 관리자 전용)
    @Column(name = "ip_address", nullable = false, length = 45)
    private String ipAddress; // IPv4는 15자, IPv6는 45자 최대

    @Column(name = "username", length = 100)
    private String username; // 로그인한 사용자명 (익명 사용자는 null)

    @Column(name = "user_role", length = 20)
    private String userRole; // USER, ADMIN 등

    @Column(name = "request_method", nullable = false, length = 10)
    private String requestMethod; // GET, POST, PUT, DELETE 등

    @Column(name = "request_uri", nullable = false, length = 2048)
    private String requestUri; // 요청 URI

    @Column(name = "query_string", length = 2048)
    private String queryString; // 쿼리 파라미터

    @Column(name = "http_status")
    private Integer httpStatus; // HTTP 응답 상태 코드

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent; // 브라우저 정보

    @Column(name = "referer", length = 2048)
    private String referer; // 유입 경로

    @Column(name = "session_id", length = 100)
    private String sessionId; // 세션 ID

    @Column(name = "response_time_ms")
    private Long responseTimeMs; // 응답 시간 (밀리초)

    @CreationTimestamp
    @Column(name = "access_time", nullable = false, updatable = false)
    private LocalDateTime accessTime; // 접근 시간

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage; // 에러 메시지 (있는 경우)

    @Column(name = "country_code", length = 2)
    private String countryCode; // 국가 코드 (ISO 3166-1 alpha-2, 예: KR, US, JP)

    @Column(name = "country_name", length = 100)
    private String countryName; // 국가 이름 (예: South Korea, United States)
}
