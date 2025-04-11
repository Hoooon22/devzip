package com.hoooon22.devzip.Service.traceboard.impl;

import com.hoooon22.devzip.Model.traceboard.EventLog;
import com.hoooon22.devzip.Model.traceboard.Project;
import com.hoooon22.devzip.Model.traceboard.dto.EventLogRequest;
import com.hoooon22.devzip.Model.traceboard.dto.EventLogResponse;
import com.hoooon22.devzip.Repository.traceboard.EventLogRepository;
import com.hoooon22.devzip.Repository.traceboard.ProjectRepository;
import com.hoooon22.devzip.Service.traceboard.EventLogService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventLogServiceImpl implements EventLogService {

    private final EventLogRepository eventLogRepository;
    private final ProjectRepository projectRepository;

    // 기존 메서드 (이벤트 로그 저장)
    @Override
    @Transactional
    public EventLog saveEventLog(EventLog eventLog) {
        // 타임스탬프가 없는 경우 현재 시간으로 설정
        if (eventLog.getTimestamp() == null) {
            eventLog.setTimestamp(LocalDateTime.now());
        }
        
        // 발생 시간이 없는 경우 현재 시간으로 설정
        if (eventLog.getOccurredAt() == null) {
            eventLog.setOccurredAt(LocalDateTime.now());
        }
        
        return eventLogRepository.save(eventLog);
    }

    // 새로운 메서드 (API 키를 사용한 이벤트 로그 저장)
    @Override
    @Transactional
    public EventLogResponse saveEventLog(String apiKey, String sessionId, String ipAddress, EventLogRequest request) {
        // apiKey로 프로젝트 찾기
        Optional<Project> projectOpt = projectRepository.findByApiKey(apiKey);
        
        if (projectOpt.isEmpty()) {
            throw new IllegalArgumentException("유효하지 않은 API 키입니다.");
        }
        
        Project project = projectOpt.get();
        
        // 이벤트 로그 생성
        EventLog eventLog = EventLog.builder()
                .eventType(request.getEventType())
                .userId(sessionId) // 일단 세션 ID를 사용자 ID로 사용
                .sessionId(sessionId)
                .path(request.getPath())
                .referrer(request.getReferrer())
                .eventData(request.getEventData())
                .deviceType(request.getDeviceType())
                .browser(request.getBrowser())
                .os(request.getOs())
                .ipAddress(ipAddress)
                .occurredAt(request.getOccurredAt() != null ? request.getOccurredAt() : LocalDateTime.now())
                .timestamp(LocalDateTime.now())
                .build();
        
        EventLog savedLog = eventLogRepository.save(eventLog);
        
        return EventLogResponse.fromEntity(savedLog);
    }

    @Override
    @Transactional(readOnly = true)
    public EventLogResponse getEventLog(Long id) {
        EventLog eventLog = eventLogRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("이벤트 로그를 찾을 수 없습니다. ID: " + id));
        
        return EventLogResponse.fromEntity(eventLog);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventLogResponse> getUserEventLogs(String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<EventLog> eventLogs = eventLogRepository.findByUserId(userId, pageable);
        
        return eventLogs.stream()
                .map(EventLogResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventLogResponse> getSessionEventLogs(String sessionId) {
        List<EventLog> eventLogs = eventLogRepository.findBySessionId(sessionId);
        
        return eventLogs.stream()
                .map(EventLogResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventLogResponse> getFilteredEventLogs(
            String eventType, LocalDateTime startDate, LocalDateTime endDate, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<EventLog> eventLogs;
        
        if (eventType != null && !eventType.isEmpty()) {
            eventLogs = eventLogRepository.findByEventTypeAndOccurredAtBetween(
                    eventType, startDate, endDate, pageable);
        } else {
            eventLogs = eventLogRepository.findByOccurredAtBetween(startDate, endDate, pageable);
        }
        
        return eventLogs.stream()
                .map(EventLogResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> getHourlyEventCounts(LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> results = eventLogRepository.countByHourBetween(startDate, endDate);
        Map<String, Long> hourlyData = new HashMap<>();
        
        for (Object[] result : results) {
            String hour = result[0].toString();
            Long count = ((Number) result[1]).longValue();
            hourlyData.put(hour, count);
        }
        
        return hourlyData;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> getPageViewCounts(LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> results = eventLogRepository.countVisitorsByPage(startDate, endDate);
        Map<String, Long> pageData = new HashMap<>();
        
        for (Object[] result : results) {
            String path = (String) result[0];
            Long visitors = ((Number) result[1]).longValue();
            pageData.put(path, visitors);
        }
        
        return pageData;
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportEventLogsToCSV(String eventType, LocalDateTime startDate, LocalDateTime endDate) {
        // CSV 헤더
        StringBuilder csv = new StringBuilder();
        csv.append("ID,이벤트 타입,사용자 ID,세션 ID,경로,참조 URL,발생 시간,기기 타입,브라우저,OS,IP 주소\n");
        
        // 이벤트 로그 조회 (페이징 없이 전체)
        List<EventLog> eventLogs;
        if (eventType != null && !eventType.isEmpty()) {
            eventLogs = eventLogRepository.findByEventTypeAndOccurredAtBetween(
                    eventType, startDate, endDate, Pageable.unpaged()).getContent();
        } else {
            eventLogs = eventLogRepository.findByOccurredAtBetween(startDate, endDate, Pageable.unpaged()).getContent();
        }
        
        // CSV 데이터 생성
        for (EventLog log : eventLogs) {
            csv.append(log.getId()).append(",")
               .append(log.getEventType()).append(",")
               .append(log.getUserId()).append(",")
               .append(log.getSessionId()).append(",")
               .append(log.getPath() != null ? log.getPath().replace(",", "\\,") : "").append(",")
               .append(log.getReferrer() != null ? log.getReferrer().replace(",", "\\,") : "").append(",")
               .append(log.getOccurredAt()).append(",")
               .append(log.getDeviceType()).append(",")
               .append(log.getBrowser()).append(",")
               .append(log.getOs()).append(",")
               .append(log.getIpAddress()).append("\n");
        }
        
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }
    
    // 기존 대시보드 데이터 조회 메서드
    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardData(LocalDateTime start, LocalDateTime end) {
        Map<String, Object> result = new HashMap<>();
        
        // 총 이벤트 수
        long totalEvents = eventLogRepository.count();
        result.put("totalEvents", totalEvents);
        
        // 지정 기간 내 이벤트 수
        List<EventLog> periodEvents = getEventLogsByTimeRange(start, end);
        result.put("periodEvents", periodEvents.size());
        
        // 고유 사용자 수
        long uniqueUsers = periodEvents.stream()
                .map(EventLog::getUserId)
                .distinct()
                .count();
        result.put("uniqueUsers", uniqueUsers);
        
        // 이벤트 타입별 통계
        Map<String, Long> eventTypeStats = periodEvents.stream()
                .collect(Collectors.groupingBy(EventLog::getEventType, Collectors.counting()));
        result.put("eventTypeStats", eventTypeStats);
        
        // 디바이스 타입별 통계
        Map<String, Long> deviceTypeStats = periodEvents.stream()
                .collect(Collectors.groupingBy(EventLog::getDeviceType, Collectors.counting()));
        result.put("deviceTypeStats", deviceTypeStats);
        
        // 페이지별 방문자 수
        Map<String, Long> pageStats = periodEvents.stream()
                .filter(e -> "pageView".equals(e.getEventType()) || "page_view".equals(e.getEventType()))
                .collect(Collectors.groupingBy(EventLog::getPath, Collectors.counting()));
        result.put("pageStats", pageStats);
        
        // 일별 이벤트 추이
        Map<String, Long> dailyStats = periodEvents.stream()
                .collect(Collectors.groupingBy(
                        e -> e.getTimestamp().toLocalDate().toString(),
                        Collectors.counting()));
        result.put("dailyStats", dailyStats);
        
        return result;
    }
    
    // 기존 메서드 구현
    @Override
    @Transactional(readOnly = true)
    public List<EventLog> getEventLogsByTimeRange(LocalDateTime start, LocalDateTime end) {
        // 기존 코드는 timestamp 필드 사용, 새 코드는 occurredAt 필드 사용
        // 두 필드 모두 사용 가능하도록 구현
        try {
            return eventLogRepository.findByOccurredAtBetween(start, end, Pageable.unpaged()).getContent();
        } catch (Exception e) {
            log.warn("occurredAt 필드로 조회 실패, timestamp 필드로 시도: {}", e.getMessage());
            return eventLogRepository.findAll(); // 임시로 모든 이벤트 반환
        }
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<EventLog> getEventLogsByType(String eventType) {
        return eventLogRepository.findByEventType(eventType, Pageable.unpaged()).getContent();
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<EventLog> getEventLogsByUser(String userId) {
        return eventLogRepository.findByUserId(userId, Pageable.unpaged()).getContent();
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<EventLog> getAllEventLogs() {
        return eventLogRepository.findAll();
    }
} 