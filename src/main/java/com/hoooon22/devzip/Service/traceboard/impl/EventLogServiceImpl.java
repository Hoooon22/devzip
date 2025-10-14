package com.hoooon22.devzip.Service.traceboard.impl;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hoooon22.devzip.Model.traceboard.EventLog;
import com.hoooon22.devzip.Model.traceboard.dto.EventLogRequest;
import com.hoooon22.devzip.Model.traceboard.dto.EventLogResponse;
import com.hoooon22.devzip.Repository.traceboard.EventLogRepository;
import com.hoooon22.devzip.Repository.traceboard.ProjectRepository;
import com.hoooon22.devzip.Security.DataEncryptionUtil;
import com.hoooon22.devzip.Service.traceboard.EventLogService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventLogServiceImpl implements EventLogService {

    private final EventLogRepository eventLogRepository;
    private final ProjectRepository projectRepository;
    private final DataEncryptionUtil encryptionUtil;

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
                .ipAddressHash(encryptionUtil.hashIpAddress(ipAddress))
                .userAgentEncrypted(encryptionUtil.encryptUserAgent(request.getUserAgent()))
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
        // 기본 제한: 최근 1000개 이벤트만 반환
        Pageable pageable = PageRequest.of(0, 1000, Sort.by(Sort.Direction.DESC, "occurredAt"));
        Page<EventLog> logPage = eventLogRepository.findAll(pageable);
        return logPage.getContent();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventLog> getEventLogsByTimeRange(LocalDateTime start, LocalDateTime end) {
        // 시간 범위 조회 시 기본 제한: 10,000개
        Pageable pageable = PageRequest.of(0, 10000, Sort.by(Sort.Direction.DESC, "occurredAt"));
        Page<EventLog> logPage = eventLogRepository.findByOccurredAtBetween(start, end, pageable);
        return logPage.getContent();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventLog> getEventLogsByType(String eventType) {
        // 이벤트 타입별 조회 시 기본 제한: 5,000개
        Pageable pageable = PageRequest.of(0, 5000, Sort.by(Sort.Direction.DESC, "occurredAt"));
        Page<EventLog> logPage = eventLogRepository.findByEventType(eventType, pageable);
        return logPage.getContent();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventLog> getEventLogsByUser(String userId) {
        // 사용자별 조회 시 기본 제한: 2,000개
        Pageable pageable = PageRequest.of(0, 2000, Sort.by(Sort.Direction.DESC, "occurredAt"));
        Page<EventLog> logPage = eventLogRepository.findByUserId(userId, pageable);
        return logPage.getContent();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardData(LocalDateTime start, LocalDateTime end) {
        // 대시보드 데이터 조회 시 제한: 50,000개 (통계 목적)
        Pageable pageable = PageRequest.of(0, 50000, Sort.by(Sort.Direction.DESC, "occurredAt"));
        Page<EventLog> logPage = eventLogRepository.findByOccurredAtBetween(start, end, pageable);
        List<EventLog> logs = logPage.getContent();

        // 이전 기간 데이터 조회 (비교용)
        long daysDiff = java.time.Duration.between(start, end).toDays();
        if (daysDiff == 0) daysDiff = 1; // 최소 1일

        LocalDateTime prevStart = start.minusDays(daysDiff);
        LocalDateTime prevEnd = start;
        Page<EventLog> prevLogPage = eventLogRepository.findByOccurredAtBetween(prevStart, prevEnd, pageable);
        List<EventLog> prevLogs = prevLogPage.getContent();

        Map<String, Object> result = new HashMap<>();

        // 전체 이벤트 수
        result.put("totalEvents", logs.size());

        // 고유 방문자 수 계산 (IP 해시 기반 또는 userId 기반)
        long uniqueVisitors = logs.stream()
                .filter(log -> log.getUserId() != null && !log.getUserId().isEmpty())
                .map(EventLog::getUserId)
                .distinct()
                .count();

        // userId가 없는 경우 IP 해시로 대체
        if (uniqueVisitors == 0) {
            uniqueVisitors = logs.stream()
                    .filter(log -> log.getIpAddressHash() != null)
                    .map(EventLog::getIpAddressHash)
                    .distinct()
                    .count();
        }

        long prevUniqueVisitors = prevLogs.stream()
                .filter(log -> log.getUserId() != null && !log.getUserId().isEmpty())
                .map(EventLog::getUserId)
                .distinct()
                .count();

        if (prevUniqueVisitors == 0) {
            prevUniqueVisitors = prevLogs.stream()
                    .filter(log -> log.getIpAddressHash() != null)
                    .map(EventLog::getIpAddressHash)
                    .distinct()
                    .count();
        }

        result.put("totalUsers", uniqueVisitors);
        result.put("uniqueVisitors", uniqueVisitors);

        // 총 페이지뷰 수
        long totalPageViews = logs.stream()
                .filter(log -> "pageview".equalsIgnoreCase(log.getEventType()) || "page_view".equalsIgnoreCase(log.getEventType()))
                .count();

        long prevTotalPageViews = prevLogs.stream()
                .filter(log -> "pageview".equalsIgnoreCase(log.getEventType()) || "page_view".equalsIgnoreCase(log.getEventType()))
                .count();

        result.put("totalPageViews", totalPageViews);
        result.put("pageViews", totalPageViews);

        // 방문자당 페이지뷰
        double pageViewsPerVisitor = uniqueVisitors > 0 ? (double) totalPageViews / uniqueVisitors : 0;
        double prevPageViewsPerVisitor = prevUniqueVisitors > 0 ? (double) prevTotalPageViews / prevUniqueVisitors : 0;
        result.put("pageViewsPerVisitor", Math.round(pageViewsPerVisitor * 10.0) / 10.0);

        // 증감률 계산
        Map<String, Object> trends = new HashMap<>();
        trends.put("uniqueVisitors", calculatePercentageChange(prevUniqueVisitors, uniqueVisitors));
        trends.put("totalPageViews", calculatePercentageChange(prevTotalPageViews, totalPageViews));
        trends.put("pageViewsPerVisitor", calculatePercentageChange(prevPageViewsPerVisitor, pageViewsPerVisitor));
        result.put("trends", trends);

        // 이벤트 타입별 분포
        Map<String, Long> eventTypeDistribution = logs.stream()
                .collect(Collectors.groupingBy(
                    log -> {
                        String type = log.getEventType();
                        if (type == null) return "unknown";
                        // 대소문자 통일 및 언더스코어 처리
                        return type.toLowerCase().replace("_", "");
                    },
                    Collectors.counting()
                ));
        result.put("eventTypeDistribution", eventTypeDistribution);

        // 시간별 이벤트 분포
        Map<String, Long> hourlyDistribution = logs.stream()
                .collect(Collectors.groupingBy(log -> log.getOccurredAt().getHour() + "시", Collectors.counting()));
        result.put("hourlyDistribution", hourlyDistribution);

        // 가장 많이 방문한 페이지
        Map<String, Long> pageViewDistribution = logs.stream()
                .filter(log -> {
                    String type = log.getEventType();
                    return type != null && (type.equalsIgnoreCase("pageview") || type.equalsIgnoreCase("page_view"));
                })
                .filter(log -> log.getPath() != null && !log.getPath().isEmpty())
                .collect(Collectors.groupingBy(EventLog::getPath, Collectors.counting()));

        result.put("pageViewDistribution", pageViewDistribution);

        // 최다 방문 페이지 정보
        Map<String, Object> mostVisitedPage = new HashMap<>();
        if (!pageViewDistribution.isEmpty()) {
            Map.Entry<String, Long> topPage = pageViewDistribution.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .orElse(null);
            if (topPage != null) {
                mostVisitedPage.put("path", topPage.getKey());
                mostVisitedPage.put("count", topPage.getValue());
            }
        } else {
            mostVisitedPage.put("path", "-");
            mostVisitedPage.put("count", 0);
        }
        result.put("mostVisitedPage", mostVisitedPage);

        // 기기 타입별 분포
        Map<String, Long> deviceDistribution = logs.stream()
                .filter(log -> log.getDeviceType() != null && !log.getDeviceType().isEmpty())
                .collect(Collectors.groupingBy(EventLog::getDeviceType, Collectors.counting()));
        result.put("deviceDistribution", deviceDistribution);

        // 모바일 사용자 비율
        long mobileCount = deviceDistribution.getOrDefault("mobile", 0L) + deviceDistribution.getOrDefault("Mobile", 0L);
        double mobilePercentage = logs.size() > 0 ? (double) mobileCount / logs.size() * 100 : 0;
        result.put("mobilePercentage", Math.round(mobilePercentage * 10.0) / 10.0);

        // 브라우저별 분포
        Map<String, Long> browserDistribution = logs.stream()
                .filter(log -> log.getBrowser() != null && !log.getBrowser().isEmpty())
                .collect(Collectors.groupingBy(EventLog::getBrowser, Collectors.counting()));
        result.put("browserDistribution", browserDistribution);

        // OS별 분포
        Map<String, Long> osDistribution = logs.stream()
                .filter(log -> log.getOs() != null && !log.getOs().isEmpty())
                .collect(Collectors.groupingBy(EventLog::getOs, Collectors.counting()));
        result.put("osDistribution", osDistribution);

        // 최근 로그 추가 (최대 100개)
        List<EventLog> recentLogs = logs.stream()
                .limit(100)
                .collect(Collectors.toList());
        result.put("recentLogs", recentLogs);

        return result;
    }

    /**
     * 퍼센테지 변화율 계산
     * @param oldValue 이전 값
     * @param newValue 현재 값
     * @return 변화율 (소수점 첫째자리까지)
     */
    private double calculatePercentageChange(double oldValue, double newValue) {
        if (oldValue == 0) {
            return newValue > 0 ? 100.0 : 0.0;
        }
        double change = ((newValue - oldValue) / oldValue) * 100;
        return Math.round(change * 10.0) / 10.0;
    }

    @Override
    @Transactional(readOnly = true)
    public EventLogResponse getEventLog(Long id) {
        EventLog eventLog = eventLogRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("이벤트 로그를 찾을 수 없습니다: " + id));
        return EventLogResponse.fromEntity(eventLog);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventLogResponse> getUserEventLogs(String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("occurredAt").descending());
        Page<EventLog> eventLogs = eventLogRepository.findByUserId(userId, pageable);
        
        return eventLogs.getContent().stream()
                .map(EventLogResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventLogResponse> getSessionEventLogs(String sessionId) {
        List<EventLog> eventLogs = eventLogRepository.findBySessionId(sessionId);
        
        return eventLogs.stream()
                .sorted((e1, e2) -> e2.getOccurredAt().compareTo(e1.getOccurredAt()))
                .map(EventLogResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventLogResponse> getFilteredEventLogs(String eventType, LocalDateTime startDate, LocalDateTime endDate, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("occurredAt").descending());
        Page<EventLog> eventLogs;
        
        if (eventType != null && !eventType.isEmpty()) {
            eventLogs = eventLogRepository.findByEventTypeAndOccurredAtBetween(eventType, startDate, endDate, pageable);
        } else {
            eventLogs = eventLogRepository.findByOccurredAtBetween(startDate, endDate, pageable);
        }
        
        return eventLogs.getContent().stream()
                .map(EventLogResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> getHourlyEventCounts(LocalDateTime startDate, LocalDateTime endDate) {
        // 시간별 통계 조회 시 제한: 100,000개
        Pageable pageable = PageRequest.of(0, 100000, Sort.by(Sort.Direction.DESC, "occurredAt"));
        Page<EventLog> logPage = eventLogRepository.findByOccurredAtBetween(startDate, endDate, pageable);
        List<EventLog> logs = logPage.getContent();
        
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
        // 페이지뷰 통계 조회 시 제한: 50,000개
        Pageable pageable = PageRequest.of(0, 50000, Sort.by(Sort.Direction.DESC, "occurredAt"));
        Page<EventLog> logPage = eventLogRepository.findByEventTypeAndOccurredAtBetween("pageview", startDate, endDate, pageable);
        List<EventLog> logs = logPage.getContent();
        
        return logs.stream()
                .collect(Collectors.groupingBy(EventLog::getPath, Collectors.counting()));
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportEventLogsToCSV(String eventType, LocalDateTime startDate, LocalDateTime endDate) {
        try {
            // CSV 내보내기 시 제한: 100,000개 (메모리 보호)
            Pageable pageable = PageRequest.of(0, 100000);
            Page<EventLog> logPage;
            
            if (eventType != null && !eventType.isEmpty()) {
                logPage = eventLogRepository.findByEventTypeAndOccurredAtBetween(eventType, startDate, endDate, pageable);
            } else {
                logPage = eventLogRepository.findByOccurredAtBetween(startDate, endDate, pageable);
            }
            
            List<EventLog> logs = logPage.getContent();
            
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
                        log.getIpAddressHash(),
                        log.getUserAgentEncrypted(),
                        log.getOccurredAt(),
                        log.getLatitude(),
                        log.getLongitude(),
                        log.getCreatedAt(),
                        log.getUpdatedAt()
                );
            }
            
            csvPrinter.flush();
            csvPrinter.close();
            
            return out.toByteArray();
        } catch (Exception e) {
            log.error("CSV 내보내기 실패", e);
            throw new RuntimeException("CSV 내보내기 실패: " + e.getMessage());
        }
    }

    @Override
    public Page<EventLogResponse> searchEventLogs(
            String eventType, 
            String userId, 
            String path,
            LocalDateTime startDate, 
            LocalDateTime endDate, 
            Pageable pageable) {
        
        // 검색 조건에 따른 동적 쿼리 구성
        Specification<EventLog> spec = Specification.where(null);
        
        if (eventType != null && !eventType.trim().isEmpty()) {
            spec = spec.and((root, query, criteriaBuilder) -> 
                criteriaBuilder.equal(root.get("eventType"), eventType));
        }
        
        if (userId != null && !userId.trim().isEmpty()) {
            spec = spec.and((root, query, criteriaBuilder) -> 
                criteriaBuilder.equal(root.get("userId"), userId));
        }
        
        if (path != null && !path.trim().isEmpty()) {
            spec = spec.and((root, query, criteriaBuilder) -> 
                criteriaBuilder.like(root.get("path"), "%" + path + "%"));
        }
        
        if (startDate != null) {
            spec = spec.and((root, query, criteriaBuilder) -> 
                criteriaBuilder.greaterThanOrEqualTo(root.get("occurredAt"), startDate));
        }
        
        if (endDate != null) {
            spec = spec.and((root, query, criteriaBuilder) -> 
                criteriaBuilder.lessThanOrEqualTo(root.get("occurredAt"), endDate));
        }
        
        Page<EventLog> eventLogPage = eventLogRepository.findAll(spec, pageable);
        
        return eventLogPage.map(EventLogResponse::fromEntity);
    }

    @Override
    public Page<EventLogResponse> getEventLogsByTimeRange(LocalDateTime start, LocalDateTime end, Pageable pageable) {
        Page<EventLog> eventLogPage = eventLogRepository.findByOccurredAtBetween(start, end, pageable);
        return eventLogPage.map(EventLogResponse::fromEntity);
    }

    @Override
    public Page<EventLogResponse> getUserEventLogs(String userId, Pageable pageable) {
        Page<EventLog> eventLogPage = eventLogRepository.findByUserId(userId, pageable);
        return eventLogPage.map(EventLogResponse::fromEntity);
    }

    @Override
    public Page<EventLogResponse> getAllEventLogs(Pageable pageable) {
        Page<EventLog> eventLogPage = eventLogRepository.findAll(pageable);
        return eventLogPage.map(EventLogResponse::fromEntity);
    }
} 