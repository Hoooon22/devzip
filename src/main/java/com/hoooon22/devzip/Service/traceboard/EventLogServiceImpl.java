package com.hoooon22.devzip.Service.traceboard;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hoooon22.devzip.Model.traceboard.EventLog;
import com.hoooon22.devzip.Model.traceboard.dto.EventLogRequest;
import com.hoooon22.devzip.Model.traceboard.dto.EventLogResponse;
import com.hoooon22.devzip.Repository.traceboard.EventLogRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventLogServiceImpl implements EventLogService {
    
    private final EventLogRepository eventLogRepository;
    
    @Override
    @Transactional
    public EventLog saveEventLog(EventLog eventLog) {
        log.info("이벤트 로그 저장: {}", eventLog);
        return eventLogRepository.save(eventLog);
    }
    
    @Override
    @Transactional
    public EventLogResponse saveEventLog(String apiKey, String sessionId, String ipAddress, EventLogRequest request) {
        // API 키 검증 (필요한 경우 구현)

        // EventLog 엔티티로 변환
        EventLog eventLog = EventLog.builder()
                .eventType(request.getEventType())
                .userId(request.getUserId())
                .sessionId(sessionId)
                .path(request.getPath())
                .referrer(request.getReferrer())
                .eventData(request.getEventData())
                .deviceType(request.getDeviceType())
                .browser(request.getBrowser())
                .os(request.getOs())
                .ipAddress(ipAddress)
                .userAgent(request.getUserAgent())
                .occurredAt(request.getOccurredAt())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .build();

        // 이벤트 로그 저장
        EventLog savedLog = eventLogRepository.save(eventLog);

        // 응답 DTO로 변환하여 반환
        return EventLogResponse.fromEntity(savedLog);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<EventLog> getAllEventLogs() {
        return eventLogRepository.findAll();
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<EventLog> getEventLogsByTimeRange(LocalDateTime start, LocalDateTime end) {
        return eventLogRepository.findByOccurredAtBetween(start, end);
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
    public Map<String, Object> getDashboardData(LocalDateTime start, LocalDateTime end) {
        List<EventLog> logs = eventLogRepository.findByOccurredAtBetween(start, end);
        
        Map<String, Object> result = new HashMap<>();
        
        // 전체 이벤트 수
        result.put("totalEvents", logs.size());
        
        // 이벤트 타입별 분포
        Map<String, Long> eventTypeDistribution = logs.stream()
                .collect(Collectors.groupingBy(EventLog::getEventType, Collectors.counting()));
        result.put("eventTypeDistribution", eventTypeDistribution);
        
        // 시간별 이벤트 분포
        Map<String, Long> hourlyDistribution = logs.stream()
                .collect(Collectors.groupingBy(log -> log.getOccurredAt().getHour() + "시", Collectors.counting()));
        result.put("hourlyDistribution", hourlyDistribution);
        
        // 페이지별 방문자 수
        Map<String, Long> pageViewDistribution = logs.stream()
                .filter(log -> "pageview".equals(log.getEventType()))
                .collect(Collectors.groupingBy(EventLog::getPath, Collectors.counting()));
        result.put("pageViewDistribution", pageViewDistribution);
        
        // 기기 타입별 분포
        Map<String, Long> deviceDistribution = logs.stream()
                .collect(Collectors.groupingBy(EventLog::getDeviceType, Collectors.counting()));
        result.put("deviceDistribution", deviceDistribution);
        
        // 브라우저별 분포
        Map<String, Long> browserDistribution = logs.stream()
                .collect(Collectors.groupingBy(EventLog::getBrowser, Collectors.counting()));
        result.put("browserDistribution", browserDistribution);
        
        // OS별 분포
        Map<String, Long> osDistribution = logs.stream()
                .collect(Collectors.groupingBy(EventLog::getOs, Collectors.counting()));
        result.put("osDistribution", osDistribution);
        
        return result;
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<EventLogResponse> getUserEventLogs(String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("occurredAt").descending());
        List<EventLog> eventLogs = eventLogRepository.findByUserId(userId, pageable);
        
        return eventLogs.stream()
                .map(EventLogResponse::fromEntity)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<EventLogResponse> getSessionEventLogs(String sessionId) {
        List<EventLog> eventLogs = eventLogRepository.findBySessionId(sessionId, Sort.by("occurredAt").ascending());
        
        return eventLogs.stream()
                .map(EventLogResponse::fromEntity)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<EventLogResponse> getFilteredEventLogs(String eventType, LocalDateTime startDate, LocalDateTime endDate, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("occurredAt").descending());
        List<EventLog> eventLogs;
        
        if (eventType != null && !eventType.isEmpty()) {
            eventLogs = eventLogRepository.findByEventTypeAndOccurredAtBetween(eventType, startDate, endDate, pageable);
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
        List<EventLog> logs = eventLogRepository.findByOccurredAtBetween(startDate, endDate);
        
        Map<String, Long> hourlyData = new HashMap<>();
        
        // 모든 시간대를 초기화 (0으로)
        for (int hour = 0; hour < 24; hour++) {
            hourlyData.put(String.format("%02d:00", hour), 0L);
        }
        
        // 실제 데이터로 업데이트
        logs.forEach(log -> {
            String hourKey = String.format("%02d:00", log.getOccurredAt().getHour());
            hourlyData.put(hourKey, hourlyData.getOrDefault(hourKey, 0L) + 1);
        });
        
        return hourlyData;
    }
    
    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> getPageViewCounts(LocalDateTime startDate, LocalDateTime endDate) {
        List<EventLog> logs = eventLogRepository.findByEventTypeAndOccurredAtBetween("pageview", startDate, endDate);
        
        return logs.stream()
                .collect(Collectors.groupingBy(EventLog::getPath, Collectors.counting()));
    }
    
    @Override
    @Transactional(readOnly = true)
    public byte[] exportEventLogsToCSV(String eventType, LocalDateTime startDate, LocalDateTime endDate) throws Exception {
        List<EventLog> logs;
        
        if (eventType != null && !eventType.isEmpty()) {
            logs = eventLogRepository.findByEventTypeAndOccurredAtBetween(eventType, startDate, endDate);
        } else {
            logs = eventLogRepository.findByOccurredAtBetween(startDate, endDate);
        }
        
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        CSVPrinter csvPrinter = new CSVPrinter(new OutputStreamWriter(out, StandardCharsets.UTF_8), 
                CSVFormat.DEFAULT.withHeader(
                        "ID", "이벤트 유형", "사용자 ID", "세션 ID", "경로", "참조 URL", 
                        "이벤트 데이터", "기기 유형", "브라우저", "OS", "IP 주소", 
                        "User Agent", "발생 시간", "위도", "경도", "생성 시간", "수정 시간"));
        
        for (EventLog log : logs) {
            csvPrinter.printRecord(
                    log.getId(),
                    log.getEventType(),
                    log.getUserId(),
                    log.getSessionId(),
                    log.getPath(),
                    log.getReferrer(),
                    log.getEventData(),
                    log.getDeviceType(),
                    log.getBrowser(),
                    log.getOs(),
                    log.getIpAddress(),
                    log.getUserAgent(),
                    log.getOccurredAt(),
                    log.getLatitude(),
                    log.getLongitude(),
                    log.getCreatedAt(),
                    log.getModifiedAt()
            );
        }
        
        csvPrinter.flush();
        csvPrinter.close();
        
        return out.toByteArray();
    }
} 