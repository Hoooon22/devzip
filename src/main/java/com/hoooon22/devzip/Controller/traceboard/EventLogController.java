package com.hoooon22.devzip.Controller.traceboard;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hoooon22.devzip.Model.traceboard.EventLog;
import com.hoooon22.devzip.Model.traceboard.dto.ApiResponse;
import com.hoooon22.devzip.Model.traceboard.dto.EventLogRequest;
import com.hoooon22.devzip.Model.traceboard.dto.EventLogResponse;
import com.hoooon22.devzip.Service.traceboard.EventLogService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/traceboard")
@RequiredArgsConstructor
@Slf4j
public class EventLogController {
    
    private final EventLogService eventLogService;
    
    // 이벤트 로그 수집 API
    @PostMapping("/event")
    public ResponseEntity<?> collectEvent(@RequestBody EventLog eventLog, HttpServletRequest request) {
        try {
            // IP 주소 기록
            eventLog.setIpAddress(getClientIp(request));
            
            // User-Agent 기록
            eventLog.setUserAgent(request.getHeader("User-Agent"));
            
            // 이벤트 로그 저장
            EventLog savedLog = eventLogService.saveEventLog(eventLog);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "이벤트 로그가 성공적으로 저장되었습니다.",
                "data", savedLog
            ));
        } catch (Exception e) {
            log.error("이벤트 로그 저장 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "이벤트 로그 저장 중 오류가 발생했습니다: " + e.getMessage()
            ));
        }
    }
    
    // 새로운 이벤트 로그 API (backend 코드)
    @PostMapping("/log/event")
    public ResponseEntity<ApiResponse<EventLogResponse>> logEvent(
            @RequestParam String apiKey,
            @RequestBody EventLogRequest request,
            HttpServletRequest servletRequest) {
        
        try {
            // 클라이언트 IP 주소 가져오기
            String ipAddress = getClientIp(servletRequest);
            
            // 세션 ID 생성 또는 가져오기
            String sessionId = servletRequest.getSession().getId();
            if (sessionId == null || sessionId.isEmpty()) {
                sessionId = UUID.randomUUID().toString();
            }
            
            // 이벤트 로그 저장
            EventLogResponse response = eventLogService.saveEventLog(apiKey, sessionId, ipAddress, request);
            
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("이벤트 로깅 중 오류 발생: ", e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("이벤트 로깅 실패: " + e.getMessage()));
        }
    }
    
    // 대시보드 데이터 조회 API
    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboardData(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        
        try {
            // 시작/종료 시간이 지정되지 않은 경우 기본값 설정 (최근 7일)
            if (start == null) {
                start = LocalDateTime.now().minus(7, ChronoUnit.DAYS);
            }
            if (end == null) {
                end = LocalDateTime.now();
            }
            
            Map<String, Object> dashboardData = eventLogService.getDashboardData(start, end);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", dashboardData,
                "timeRange", Map.of(
                    "start", start.format(DateTimeFormatter.ISO_DATE_TIME),
                    "end", end.format(DateTimeFormatter.ISO_DATE_TIME)
                )
            ));
        } catch (Exception e) {
            log.error("대시보드 데이터 조회 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "대시보드 데이터 조회 중 오류가 발생했습니다: " + e.getMessage()
            ));
        }
    }
    
    // 모든 이벤트 로그 조회 API
    @GetMapping("/events")
    public ResponseEntity<?> getAllEvents(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String userId) {
        
        try {
            List<EventLog> events;
            
            if (start != null && end != null) {
                events = eventLogService.getEventLogsByTimeRange(start, end);
            } else if (eventType != null) {
                events = eventLogService.getEventLogsByType(eventType);
            } else if (userId != null) {
                events = eventLogService.getEventLogsByUser(userId);
            } else {
                events = eventLogService.getAllEventLogs();
            }
            
            // 서비스 계층에서 이미 정렬이 적용되어 있으므로 여기서 다시 정렬할 필요가 없습니다.
            // events.sort((a, b) -> b.getOccurredAt().compareTo(a.getOccurredAt()));
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "count", events.size(),
                "data", events
            ));
        } catch (Exception e) {
            log.error("이벤트 로그 조회 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "이벤트 로그 조회 중 오류가 발생했습니다: " + e.getMessage()
            ));
        }
    }
    
    // 사용자 이벤트 조회 API (backend 코드)
    @GetMapping("/log/events/user/{userId}")
    public ResponseEntity<ApiResponse<List<EventLogResponse>>> getUserEvents(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        try {
            List<EventLogResponse> events = eventLogService.getUserEventLogs(userId, page, size);
            return ResponseEntity.ok(ApiResponse.success(events));
        } catch (Exception e) {
            log.error("사용자 이벤트 조회 중 오류 발생: ", e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("이벤트 조회 실패: " + e.getMessage()));
        }
    }

    // 세션 이벤트 조회 API (backend 코드)
    @GetMapping("/log/events/session/{sessionId}")
    public ResponseEntity<ApiResponse<List<EventLogResponse>>> getSessionEvents(
            @PathVariable String sessionId) {
        
        try {
            List<EventLogResponse> events = eventLogService.getSessionEventLogs(sessionId);
            return ResponseEntity.ok(ApiResponse.success(events));
        } catch (Exception e) {
            log.error("세션 이벤트 조회 중 오류 발생: ", e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("이벤트 조회 실패: " + e.getMessage()));
        }
    }

    // 필터링 이벤트 조회 API (backend 코드)
    @GetMapping("/log/events/filter")
    public ResponseEntity<ApiResponse<List<EventLogResponse>>> getFilteredEvents(
            @RequestParam(required = false) String eventType,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        try {
            List<EventLogResponse> events = eventLogService.getFilteredEventLogs(eventType, startDate, endDate, page, size);
            return ResponseEntity.ok(ApiResponse.success(events));
        } catch (Exception e) {
            log.error("필터링된 이벤트 조회 중 오류 발생: ", e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("이벤트 조회 실패: " + e.getMessage()));
        }
    }

    // 시간별 이벤트 통계 API (backend 코드)
    @GetMapping("/log/analytics/hourly")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getHourlyEventCounts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        try {
            Map<String, Long> hourlyData = eventLogService.getHourlyEventCounts(startDate, endDate);
            return ResponseEntity.ok(ApiResponse.success(hourlyData));
        } catch (Exception e) {
            log.error("시간별 이벤트 집계 중 오류 발생: ", e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("이벤트 집계 실패: " + e.getMessage()));
        }
    }

    // 페이지별 방문자 통계 API (backend 코드)
    @GetMapping("/log/analytics/pages")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getPageViewCounts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        try {
            Map<String, Long> pageData = eventLogService.getPageViewCounts(startDate, endDate);
            return ResponseEntity.ok(ApiResponse.success(pageData));
        } catch (Exception e) {
            log.error("페이지별 방문자 집계 중 오류 발생: ", e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("방문자 집계 실패: " + e.getMessage()));
        }
    }

    // CSV 내보내기 API (backend 코드)
    @GetMapping("/log/export/csv")
    public ResponseEntity<byte[]> exportEventLogsToCSV(
            @RequestParam(required = false) String eventType,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        try {
            byte[] csvData = eventLogService.exportEventLogsToCSV(eventType, startDate, endDate);
            
            String filename = "event_logs_" + startDate.toString() + "_to_" + endDate.toString() + ".csv";
            filename = filename.replace(":", "-");
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", filename);
            
            return new ResponseEntity<>(csvData, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("이벤트 로그 CSV 내보내기 중 오류 발생: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    // 클라이언트 IP 주소 가져오기
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }
} 