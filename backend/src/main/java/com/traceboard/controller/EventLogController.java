package com.traceboard.controller;

import com.traceboard.model.dto.ApiResponse;
import com.traceboard.model.dto.EventLogRequest;
import com.traceboard.model.dto.EventLogResponse;
import com.traceboard.service.EventLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/log")
@RequiredArgsConstructor
@Slf4j
public class EventLogController {

    private final EventLogService eventLogService;

    @PostMapping("/event")
    public ResponseEntity<ApiResponse<EventLogResponse>> logEvent(
            @RequestParam String apiKey,
            @RequestBody @Valid EventLogRequest request,
            HttpServletRequest servletRequest) {
        
        try {
            // 클라이언트 IP 주소 가져오기
            String ipAddress = servletRequest.getHeader("X-Forwarded-For");
            if (ipAddress == null || ipAddress.isEmpty()) {
                ipAddress = servletRequest.getRemoteAddr();
            }
            
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

    @GetMapping("/events/user/{userId}")
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

    @GetMapping("/events/session/{sessionId}")
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

    @GetMapping("/events/filter")
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

    @GetMapping("/analytics/hourly")
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

    @GetMapping("/analytics/pages")
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

    @GetMapping("/export/csv")
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
}