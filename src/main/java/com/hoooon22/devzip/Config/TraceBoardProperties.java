package com.hoooon22.devzip.Config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Data
@ConfigurationProperties(prefix = "app")
@Validated
public class TraceBoardProperties {

    /**
     * JWT 관련 설정
     */
    @Data
    public static class Jwt {
        @NotBlank(message = "JWT secret key는 필수입니다")
        private String secret = "MyVerySecureJWTSecretKey123456789012345678901234567890";
        
        @Min(value = 60000, message = "JWT 만료 시간은 최소 1분이어야 합니다")
        @Max(value = 604800000, message = "JWT 만료 시간은 최대 7일이어야 합니다")
        private long expirationInMs = 86400000; // 24시간
    }

    /**
     * 데이터 암호화 관련 설정
     */
    @Data
    public static class Encryption {
        @NotBlank(message = "암호화 키는 필수입니다")
        private String secretKey = "MySecretKey123456789012345678901234567890";
        
        @NotBlank(message = "암호화 솔트는 필수입니다")
        private String salt = "TraceBoard2024Salt";
    }

    /**
     * CORS 관련 설정
     */
    @Data
    public static class Cors {
        @NotNull(message = "허용된 오리진 목록은 필수입니다")
        private String[] allowedOrigins = {"http://localhost:8080", "http://localhost:3000"};
        
        @Min(value = 300, message = "CORS 캐시 시간은 최소 5분이어야 합니다")
        @Max(value = 86400, message = "CORS 캐시 시간은 최대 24시간이어야 합니다")
        private long maxAge = 3600; // 1시간
    }

    /**
     * WebSocket 관련 설정
     */
    @Data
    public static class Websocket {
        @NotNull(message = "웹소켓 허용 오리진 목록은 필수입니다")
        private String[] allowedOrigins = {"http://localhost:8080", "http://localhost:3000"};
    }

    /**
     * 페이징 관련 설정
     */
    @Data
    public static class Pagination {
        @Min(value = 10, message = "기본 제한값은 최소 10이어야 합니다")
        @Max(value = 10000, message = "기본 제한값은 최대 10,000이어야 합니다")
        private int defaultLimit = 1000;
        
        @Min(value = 1000, message = "대시보드 제한값은 최소 1,000이어야 합니다")
        @Max(value = 100000, message = "대시보드 제한값은 최대 100,000이어야 합니다")
        private int dashboardLimit = 50000;
        
        @Min(value = 10000, message = "내보내기 제한값은 최소 10,000이어야 합니다")
        @Max(value = 1000000, message = "내보내기 제한값은 최대 1,000,000이어야 합니다")
        private int exportLimit = 100000;
        
        @Min(value = 100, message = "사용자 제한값은 최소 100이어야 합니다")
        @Max(value = 10000, message = "사용자 제한값은 최대 10,000이어야 합니다")
        private int userLimit = 2000;
        
        @Min(value = 100, message = "타입 제한값은 최소 100이어야 합니다")
        @Max(value = 10000, message = "타입 제한값은 최대 10,000이어야 합니다")
        private int typeLimit = 5000;
    }

    /**
     * API 제한 관련 설정
     */
    @Data
    public static class RateLimit {
        @Min(value = 1, message = "시간당 요청 제한은 최소 1이어야 합니다")
        @Max(value = 10000, message = "시간당 요청 제한은 최대 10,000이어야 합니다")
        private int requestsPerHour = 1000;
        
        @Min(value = 10, message = "일일 요청 제한은 최소 10이어야 합니다")
        @Max(value = 100000, message = "일일 요청 제한은 최대 100,000이어야 합니다")
        private int requestsPerDay = 10000;
    }

    // 중첩 클래스 인스턴스
    private Jwt jwt = new Jwt();
    private Encryption encryption = new Encryption();
    private Cors cors = new Cors();
    private Websocket websocket = new Websocket();
    private Pagination pagination = new Pagination();
    private RateLimit rateLimit = new RateLimit();
}