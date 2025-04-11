package com.hoooon22.devzip.Service.traceboard;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hoooon22.devzip.Model.traceboard.EventLog;
import com.hoooon22.devzip.Repository.traceboard.EventLogRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EventLogServiceImpl implements EventLogService {
    
    private final EventLogRepository eventLogRepository;
    
    @Override
    @Transactional
    public EventLog saveEventLog(EventLog eventLog) {
        return eventLogRepository.save(eventLog);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<EventLog> getAllEventLogs() {
        return eventLogRepository.findAll();
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<EventLog> getEventLogsByTimeRange(LocalDateTime start, LocalDateTime end) {
        return eventLogRepository.findByTimestampBetween(start, end);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<EventLog> getEventLogsByType(String eventType) {
        return eventLogRepository.findByEventType(eventType);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<EventLog> getEventLogsByUser(String userId) {
        return eventLogRepository.findByUserId(userId);
    }
    
    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getVisitorMetrics(LocalDateTime start, LocalDateTime end) {
        Map<String, Object> metrics = new HashMap<>();
        
        // 고유 방문자 수
        Long uniqueVisitors = eventLogRepository.countDistinctUsersBetween(start, end);
        
        // 총 페이지뷰 수
        Long totalPageViews = (long) eventLogRepository.findByEventTypeAndTimestampBetween("pageView", start, end).size();
        
        // 방문자당 페이지뷰 수
        double pageViewsPerVisitor = uniqueVisitors > 0 ? (double) totalPageViews / uniqueVisitors : 0;
        
        metrics.put("uniqueVisitors", uniqueVisitors);
        metrics.put("totalPageViews", totalPageViews);
        metrics.put("pageViewsPerVisitor", pageViewsPerVisitor);
        
        return metrics;
    }
    
    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> getEventTypeMetrics(LocalDateTime start, LocalDateTime end) {
        return eventLogRepository.countByEventTypeBetween(start, end)
                .stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> (Long) row[1]
                ));
    }
    
    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> getDeviceTypeMetrics(LocalDateTime start, LocalDateTime end) {
        return eventLogRepository.countByDeviceTypeBetween(start, end)
                .stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> (Long) row[1]
                ));
    }
    
    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardData(LocalDateTime start, LocalDateTime end) {
        Map<String, Object> dashboardData = new HashMap<>();
        
        // 방문자 지표
        dashboardData.put("visitorMetrics", getVisitorMetrics(start, end));
        
        // 이벤트 유형별 지표
        dashboardData.put("eventTypeMetrics", getEventTypeMetrics(start, end));
        
        // 디바이스 유형별 지표
        dashboardData.put("deviceTypeMetrics", getDeviceTypeMetrics(start, end));
        
        // 최근 이벤트 로그 (최대 100개)
        List<EventLog> recentLogs = getEventLogsByTimeRange(start, end);
        if (recentLogs.size() > 100) {
            recentLogs = recentLogs.subList(0, 100);
        }
        dashboardData.put("recentLogs", recentLogs);
        
        return dashboardData;
    }
} 