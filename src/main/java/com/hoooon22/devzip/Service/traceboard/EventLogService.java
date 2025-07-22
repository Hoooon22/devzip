package com.hoooon22.devzip.Service.traceboard;

import com.hoooon22.devzip.Model.traceboard.EventLog;
import com.hoooon22.devzip.Model.traceboard.dto.EventLogRequest;
import com.hoooon22.devzip.Model.traceboard.dto.EventLogResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface EventLogService {

    /**
     * 이벤트 로그 저장
     */
    EventLogResponse saveEventLog(String apiKey, String sessionId, String ipAddress, EventLogRequest request);

    /**
     * 이벤트 로그 저장 (기존 메서드 유지)
     */
    EventLog saveEventLog(EventLog eventLog);

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
    
    /**
     * 대시보드용 데이터 조회 (기존 메서드 유지)
     */
    Map<String, Object> getDashboardData(LocalDateTime start, LocalDateTime end);
    
    /**
     * 특정 기간 내의 모든 이벤트 로그 조회 (기존 메서드 유지)
     */
    List<EventLog> getEventLogsByTimeRange(LocalDateTime start, LocalDateTime end);
    
    /**
     * 특정 이벤트 타입의 로그 조회 (기존 메서드 유지)
     */
    List<EventLog> getEventLogsByType(String eventType);
    
    /**
     * 특정 사용자의 이벤트 로그 조회 (기존 메서드 유지)
     */
    List<EventLog> getEventLogsByUser(String userId);
    
    /**
     * 모든 이벤트 로그 조회 (기존 메서드 유지)
     */
    List<EventLog> getAllEventLogs();
    
    // === 페이징 지원 메서드 추가 ===
    
    /**
     * 페이징을 지원하는 모든 이벤트 로그 조회
     */
    Page<EventLogResponse> getAllEventLogs(Pageable pageable);
    
    /**
     * 페이징을 지원하는 사용자별 이벤트 로그 조회
     */
    Page<EventLogResponse> getUserEventLogs(String userId, Pageable pageable);
    
    /**
     * 페이징을 지원하는 시간 범위별 이벤트 로그 조회
     */
    Page<EventLogResponse> getEventLogsByTimeRange(LocalDateTime start, LocalDateTime end, Pageable pageable);
    
    /**
     * 검색 조건을 지원하는 고급 이벤트 로그 조회
     */
    Page<EventLogResponse> searchEventLogs(
            String eventType, 
            String userId, 
            String path,
            LocalDateTime startDate, 
            LocalDateTime endDate, 
            Pageable pageable
    );
} 