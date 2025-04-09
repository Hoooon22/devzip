package com.traceboard.service.impl;

import com.traceboard.model.dto.EventLogRequest;
import com.traceboard.model.dto.EventLogResponse;
import com.traceboard.model.entity.EventLog;
import com.traceboard.model.entity.Project;
import com.traceboard.repository.EventLogRepository;
import com.traceboard.repository.ProjectRepository;
import com.traceboard.service.EventLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
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
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    @Async
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
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .build();
        
        // Redis에 이벤트 로그 저장 (나중에 비동기로 처리하기 위해)
        String redisKey = "event_log:" + System.currentTimeMillis();
        redisTemplate.opsForValue().set(redisKey, eventLog);
        
        // DB에 직접 저장 (실제로는 Redis에서 비동기로 처리할 것)
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
}