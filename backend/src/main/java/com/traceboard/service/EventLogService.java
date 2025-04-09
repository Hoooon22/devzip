package com.traceboard.service;

import com.traceboard.model.dto.EventLogRequest;
import com.traceboard.model.dto.EventLogResponse;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface EventLogService {

    /**
     * 이벤트 로그 저장
     */
    EventLogResponse saveEventLog(String apiKey, String sessionId, String ipAddress, EventLogRequest request);

    /**
     * 이벤트 로그 조회
     */
    EventLogResponse getEventLog(Long id);

    /**
     * 특정 사용자의 이벤트 로그 목록 조회
     */
    List<EventLogResponse> getUserEventLogs(String userId, int page, int size);

    /**
     * 특정 세션의 이벤트 로그 목록 조회
     */
    List<EventLogResponse> getSessionEventLogs(String sessionId);

    /**
     * 이벤트 타입 및 시간 범위로 로그 조회
     */
    List<EventLogResponse> getFilteredEventLogs(
            String eventType, LocalDateTime startDate, LocalDateTime endDate, int page, int size);

    /**
     * 시간대별 이벤트 수 집계
     */
    Map<String, Long> getHourlyEventCounts(LocalDateTime startDate, LocalDateTime endDate);

    /**
     * 페이지별 방문자 수 집계
     */
    Map<String, Long> getPageViewCounts(LocalDateTime startDate, LocalDateTime endDate);

    /**
     * 이벤트 데이터 CSV로 내보내기
     */
    byte[] exportEventLogsToCSV(String eventType, LocalDateTime startDate, LocalDateTime endDate);
}