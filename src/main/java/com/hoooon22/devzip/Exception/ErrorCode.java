package com.hoooon22.devzip.Exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    
    // === 일반적인 오류 ===
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "TB001", "내부 서버 오류가 발생했습니다."),
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "TB002", "잘못된 요청입니다."),
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "TB003", "입력값이 유효하지 않습니다."),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "TB004", "요청한 리소스를 찾을 수 없습니다."),
    
    // === 인증/권한 관련 오류 ===
    INVALID_API_KEY(HttpStatus.UNAUTHORIZED, "TB101", "잘못된 사용자명 또는 비밀번호입니다."),
    EXPIRED_API_KEY(HttpStatus.UNAUTHORIZED, "TB102", "만료된 API 키입니다."),
    API_RATE_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "TB103", "API 요청 제한을 초과했습니다."),
    INSUFFICIENT_PERMISSIONS(HttpStatus.FORBIDDEN, "TB104", "권한이 부족합니다."),
    
    // === 이벤트 로그 관련 오류 ===
    EVENT_LOG_NOT_FOUND(HttpStatus.NOT_FOUND, "TB201", "이벤트 로그를 찾을 수 없습니다. ID: %s"),
    INVALID_EVENT_TYPE(HttpStatus.BAD_REQUEST, "TB202", "유효하지 않은 이벤트 타입입니다: %s"),
    INVALID_DATE_RANGE(HttpStatus.BAD_REQUEST, "TB203", "유효하지 않은 날짜 범위입니다."),
    EVENT_LOG_SAVE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "TB204", "이벤트 로그 저장에 실패했습니다."),
    
    // === 데이터 처리 관련 오류 ===
    DATA_ENCRYPTION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "TB301", "데이터 암호화에 실패했습니다."),
    DATA_DECRYPTION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "TB302", "데이터 복호화에 실패했습니다."),
    CSV_EXPORT_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "TB303", "CSV 내보내기에 실패했습니다."),
    PAGINATION_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "TB304", "페이징 제한을 초과했습니다. 최대 %d개"),
    
    // === 사용자 관련 오류 ===
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "TB401", "사용자를 찾을 수 없습니다. ID: %s"),
    INVALID_SESSION(HttpStatus.BAD_REQUEST, "TB402", "유효하지 않은 세션입니다."),
    
    // === 외부 서비스 관련 오류 ===
    DATABASE_CONNECTION_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "TB501", "데이터베이스 연결에 실패했습니다."),
    EXTERNAL_API_ERROR(HttpStatus.BAD_GATEWAY, "TB502", "외부 API 호출에 실패했습니다."),
    
    // === 비즈니스 로직 관련 오류 ===
    INVALID_ANALYTICS_PERIOD(HttpStatus.BAD_REQUEST, "TB601", "유효하지 않은 분석 기간입니다. 최대 %d일"),
    DASHBOARD_DATA_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "TB602", "대시보드 데이터를 사용할 수 없습니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}