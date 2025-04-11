package com.hoooon22.devzip.Service.traceboard;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import com.hoooon22.devzip.Model.traceboard.EventLog;

public interface EventLogService {
    
    // 이벤트 로그 저장
    EventLog saveEventLog(EventLog eventLog);
    
    // 모든 이벤트 로그 조회
    List<EventLog> getAllEventLogs();
    
    // 특정 기간 내의 이벤트 로그 조회
    List<EventLog> getEventLogsByTimeRange(LocalDateTime start, LocalDateTime end);
    
    // 특정 유형의 이벤트 로그 조회
    List<EventLog> getEventLogsByType(String eventType);
    
    // 특정 사용자의 이벤트 로그 조회
    List<EventLog> getEventLogsByUser(String userId);
    
    // 방문자 통계 조회 (고유 방문자 수, 총 페이지뷰 등)
    Map<String, Object> getVisitorMetrics(LocalDateTime start, LocalDateTime end);
    
    // 이벤트 유형별 통계 조회
    Map<String, Long> getEventTypeMetrics(LocalDateTime start, LocalDateTime end);
    
    // 디바이스 유형별 통계 조회
    Map<String, Long> getDeviceTypeMetrics(LocalDateTime start, LocalDateTime end);
    
    // 대시보드용 종합 데이터 조회
    Map<String, Object> getDashboardData(LocalDateTime start, LocalDateTime end);
} 