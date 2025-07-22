package com.hoooon22.devzip.Exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * TraceBoard 커스텀 예외 처리
     */
    @ExceptionHandler(TraceBoardException.class)
    public ResponseEntity<ErrorResponse> handleTraceBoardException(
            TraceBoardException ex, HttpServletRequest request) {
        
        String requestId = generateRequestId();
        log.warn("TraceBoardException [{}]: {}", requestId, ex.getMessage(), ex);
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .success(false)
                .timestamp(LocalDateTime.now())
                .status(ex.getHttpStatus().value())
                .error(ex.getHttpStatus().getReasonPhrase())
                .code(ex.getErrorCode().getCode())
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .requestId(requestId)
                .build();
        
        return ResponseEntity.status(ex.getHttpStatus()).body(errorResponse);
    }

    /**
     * 인증 관련 예외 처리
     */
    @ExceptionHandler({AuthenticationException.class, BadCredentialsException.class})
    public ResponseEntity<ErrorResponse> handleAuthenticationException(
            Exception ex, HttpServletRequest request) {
        
        String requestId = generateRequestId();
        log.warn("Authentication failed [{}]: {}", requestId, ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .success(false)
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.UNAUTHORIZED.value())
                .error(HttpStatus.UNAUTHORIZED.getReasonPhrase())
                .code(ErrorCode.INVALID_API_KEY.getCode())
                .message(ErrorCode.INVALID_API_KEY.getMessage())
                .path(request.getRequestURI())
                .requestId(requestId)
                .build();
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
    }

    /**
     * 권한 부족 예외 처리
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(
            AccessDeniedException ex, HttpServletRequest request) {
        
        String requestId = generateRequestId();
        log.warn("Access denied [{}]: {}", requestId, ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .success(false)
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.FORBIDDEN.value())
                .error(HttpStatus.FORBIDDEN.getReasonPhrase())
                .code(ErrorCode.INSUFFICIENT_PERMISSIONS.getCode())
                .message(ErrorCode.INSUFFICIENT_PERMISSIONS.getMessage())
                .path(request.getRequestURI())
                .requestId(requestId)
                .build();
        
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
    }

    /**
     * 유효성 검사 실패 예외 처리 (Request Body)
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        
        String requestId = generateRequestId();
        log.warn("Validation failed [{}]: {}", requestId, ex.getMessage());
        
        Map<String, String> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        error -> error.getDefaultMessage() != null ? error.getDefaultMessage() : "Invalid value",
                        (existing, replacement) -> existing
                ));
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .success(false)
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
                .code(ErrorCode.INVALID_REQUEST.getCode())
                .message("입력값 검증에 실패했습니다.")
                .path(request.getRequestURI())
                .details(fieldErrors)
                .requestId(requestId)
                .build();
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * 유효성 검사 실패 예외 처리 (Form Data)
     */
    @ExceptionHandler(BindException.class)
    public ResponseEntity<ErrorResponse> handleBindException(
            BindException ex, HttpServletRequest request) {
        
        String requestId = generateRequestId();
        log.warn("Binding failed [{}]: {}", requestId, ex.getMessage());
        
        Map<String, String> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        error -> error.getDefaultMessage() != null ? error.getDefaultMessage() : "Invalid value"
                ));
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .success(false)
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
                .code(ErrorCode.INVALID_REQUEST.getCode())
                .message("입력값 검증에 실패했습니다.")
                .path(request.getRequestURI())
                .details(fieldErrors)
                .requestId(requestId)
                .build();
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * Bean Validation 예외 처리
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolationException(
            ConstraintViolationException ex, HttpServletRequest request) {
        
        String requestId = generateRequestId();
        log.warn("Constraint violation [{}]: {}", requestId, ex.getMessage());
        
        Map<String, String> violations = ex.getConstraintViolations()
                .stream()
                .collect(Collectors.toMap(
                        violation -> violation.getPropertyPath().toString(),
                        violation -> violation.getMessage(),
                        (existing, replacement) -> existing
                ));
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .success(false)
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
                .code(ErrorCode.INVALID_REQUEST.getCode())
                .message("입력값 제약 조건을 위반했습니다.")
                .path(request.getRequestURI())
                .details(violations)
                .requestId(requestId)
                .build();
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * 필수 파라미터 누락 예외 처리
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingServletRequestParameterException(
            MissingServletRequestParameterException ex, HttpServletRequest request) {
        
        String requestId = generateRequestId();
        log.warn("Missing required parameter [{}]: {}", requestId, ex.getParameterName());
        
        Map<String, String> details = new HashMap<>();
        details.put("missingParameter", ex.getParameterName());
        details.put("parameterType", ex.getParameterType());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .success(false)
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
                .code(ErrorCode.INVALID_REQUEST.getCode())
                .message(String.format("필수 파라미터가 누락되었습니다: %s", ex.getParameterName()))
                .path(request.getRequestURI())
                .details(details)
                .requestId(requestId)
                .build();
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * 파라미터 타입 불일치 예외 처리
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentTypeMismatchException(
            MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        
        String requestId = generateRequestId();
        log.warn("Parameter type mismatch [{}]: {} for parameter {}", requestId, ex.getValue(), ex.getName());
        
        Map<String, String> details = new HashMap<>();
        details.put("parameter", ex.getName());
        details.put("providedValue", String.valueOf(ex.getValue()));
        details.put("requiredType", ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown");
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .success(false)
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
                .code(ErrorCode.INVALID_REQUEST.getCode())
                .message(String.format("파라미터 타입이 올바르지 않습니다: %s", ex.getName()))
                .path(request.getRequestURI())
                .details(details)
                .requestId(requestId)
                .build();
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * JSON 파싱 오류 예외 처리
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleHttpMessageNotReadableException(
            HttpMessageNotReadableException ex, HttpServletRequest request) {
        
        String requestId = generateRequestId();
        log.warn("JSON parsing failed [{}]: {}", requestId, ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .success(false)
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
                .code(ErrorCode.INVALID_REQUEST.getCode())
                .message("잘못된 JSON 형식입니다.")
                .path(request.getRequestURI())
                .requestId(requestId)
                .build();
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * 지원하지 않는 HTTP 메소드 예외 처리
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleHttpRequestMethodNotSupportedException(
            HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        
        String requestId = generateRequestId();
        log.warn("Method not supported [{}]: {}", requestId, ex.getMethod());
        
        Map<String, String> details = new HashMap<>();
        details.put("method", ex.getMethod());
        details.put("supportedMethods", String.join(", ", ex.getSupportedMethods() != null ? ex.getSupportedMethods() : new String[0]));
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .success(false)
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.METHOD_NOT_ALLOWED.value())
                .error(HttpStatus.METHOD_NOT_ALLOWED.getReasonPhrase())
                .code(ErrorCode.INVALID_REQUEST.getCode())
                .message(String.format("지원하지 않는 HTTP 메소드입니다: %s", ex.getMethod()))
                .path(request.getRequestURI())
                .details(details)
                .requestId(requestId)
                .build();
        
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(errorResponse);
    }

    /**
     * 404 Not Found 예외 처리
     */
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoHandlerFoundException(
            NoHandlerFoundException ex, HttpServletRequest request) {
        
        String requestId = generateRequestId();
        log.warn("No handler found [{}]: {} {}", requestId, ex.getHttpMethod(), ex.getRequestURL());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .success(false)
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.NOT_FOUND.value())
                .error(HttpStatus.NOT_FOUND.getReasonPhrase())
                .code(ErrorCode.RESOURCE_NOT_FOUND.getCode())
                .message(ErrorCode.RESOURCE_NOT_FOUND.getMessage())
                .path(request.getRequestURI())
                .requestId(requestId)
                .build();
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    /**
     * 데이터베이스 관련 예외 처리
     */
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ErrorResponse> handleDataAccessException(
            DataAccessException ex, HttpServletRequest request) {
        
        String requestId = generateRequestId();
        log.error("Database error occurred [{}]: {}", requestId, ex.getMessage(), ex);
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .success(false)
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.SERVICE_UNAVAILABLE.value())
                .error(HttpStatus.SERVICE_UNAVAILABLE.getReasonPhrase())
                .code(ErrorCode.DATABASE_CONNECTION_FAILED.getCode())
                .message(ErrorCode.DATABASE_CONNECTION_FAILED.getMessage())
                .path(request.getRequestURI())
                .requestId(requestId)
                .build();
        
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(errorResponse);
    }

    /**
     * 데이터 무결성 위반 예외 처리
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolationException(
            DataIntegrityViolationException ex, HttpServletRequest request) {
        
        String requestId = generateRequestId();
        log.warn("Data integrity violation [{}]: {}", requestId, ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .success(false)
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.CONFLICT.value())
                .error(HttpStatus.CONFLICT.getReasonPhrase())
                .code(ErrorCode.INVALID_REQUEST.getCode())
                .message("데이터 무결성 제약 조건을 위반했습니다.")
                .path(request.getRequestURI())
                .requestId(requestId)
                .build();
        
        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
    }

    /**
     * 모든 기타 예외 처리 (최종 fallback)
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex, HttpServletRequest request) {
        
        String requestId = generateRequestId();
        log.error("Unexpected error occurred [{}]: {}", requestId, ex.getMessage(), ex);
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .success(false)
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .error(HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase())
                .code(ErrorCode.INTERNAL_SERVER_ERROR.getCode())
                .message(ErrorCode.INTERNAL_SERVER_ERROR.getMessage())
                .path(request.getRequestURI())
                .requestId(requestId)
                .build();
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }

    /**
     * 요청별 고유 ID 생성
     */
    private String generateRequestId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
