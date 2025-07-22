package com.hoooon22.devzip.Exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {
    
    /**
     * 응답 성공 여부
     */
    private final boolean success;
    
    /**
     * 오류 발생 시간
     */
    private final LocalDateTime timestamp;
    
    /**
     * HTTP 상태 코드
     */
    private final int status;
    
    /**
     * HTTP 상태 메시지
     */
    private final String error;
    
    /**
     * 비즈니스 에러 코드
     */
    private final String code;
    
    /**
     * 에러 메시지
     */
    private final String message;
    
    /**
     * 요청 경로
     */
    private final String path;
    
    /**
     * 추가 상세 정보 (validation errors 등)
     */
    private final Map<String, String> details;
    
    /**
     * 요청 ID (추후 로깅/추적용)
     */
    private final String requestId;
}