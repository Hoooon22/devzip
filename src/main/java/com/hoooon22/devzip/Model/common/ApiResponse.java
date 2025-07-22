package com.hoooon22.devzip.Model.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 통일된 API 응답 형식
 */
@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    /**
     * 응답 성공 여부
     */
    private final boolean success;
    
    /**
     * 응답 시간
     */
    @Builder.Default
    private final LocalDateTime timestamp = LocalDateTime.now();
    
    /**
     * 응답 데이터
     */
    private final T data;
    
    /**
     * 응답 메시지 (선택적)
     */
    private final String message;
    
    /**
     * 페이징 정보 (선택적)
     */
    private final PageInfo pageInfo;
    
    /**
     * 성공 응답 생성
     */
    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .build();
    }
    
    /**
     * 성공 응답 생성 (메시지 포함)
     */
    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .message(message)
                .build();
    }
    
    /**
     * 페이징 성공 응답 생성
     */
    public static <T> ApiResponse<T> success(T data, PageInfo pageInfo) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .pageInfo(pageInfo)
                .build();
    }
    
    /**
     * 페이징 성공 응답 생성 (메시지 포함)
     */
    public static <T> ApiResponse<T> success(T data, String message, PageInfo pageInfo) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .message(message)
                .pageInfo(pageInfo)
                .build();
    }
    
    /**
     * 메시지만 있는 성공 응답
     */
    public static <T> ApiResponse<T> success(String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .build();
    }
}