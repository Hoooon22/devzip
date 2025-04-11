package com.hoooon22.devzip.Controller.traceboard;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hoooon22.devzip.Model.traceboard.EventLog;
import com.hoooon22.devzip.Service.traceboard.EventLogService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/traceboard")
@RequiredArgsConstructor
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
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "이벤트 로그 저장 중 오류가 발생했습니다: " + e.getMessage()
            ));
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
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "count", events.size(),
                "data", events
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "이벤트 로그 조회 중 오류가 발생했습니다: " + e.getMessage()
            ));
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