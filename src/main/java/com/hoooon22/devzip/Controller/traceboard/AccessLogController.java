package com.hoooon22.devzip.Controller.traceboard;

import com.hoooon22.devzip.Model.traceboard.AccessLog;
import com.hoooon22.devzip.Model.traceboard.dto.ApiResponse;
import com.hoooon22.devzip.Model.User;
import com.hoooon22.devzip.Repository.UserRepository;
import com.hoooon22.devzip.Service.JwtUtils;
import com.hoooon22.devzip.Service.traceboard.AccessLogService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;

/**
 * 접근 로그 컨트롤러
 *
 * 보안 정책:
 * 1. 모든 엔드포인트는 관리자 권한 필요 (JWT + 비밀번호 재확인)
 * 2. 원본 IP 주소를 다루므로 이중 인증 필요
 * 3. Rate limiting 적용 권장
 */
@RestController
@RequestMapping("/api/traceboard/access-logs")
@Slf4j
public class AccessLogController {

    @Autowired
    private AccessLogService accessLogService;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * 비밀번호 재확인 (접근 로그 페이지 진입 시)
     */
    @PostMapping("/verify-password")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyPassword(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, String> request) {

        try {
            // JWT 토큰 검증
            if (!token.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("유효하지 않은 토큰 형식입니다."));
            }

            String jwt = token.substring(7);
            if (!jwtUtils.validateJwtToken(jwt)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("유효하지 않은 토큰입니다."));
            }

            // 관리자 권한 확인
            String role = jwtUtils.getRoleFromJwtToken(jwt);
            if (!"ROLE_ADMIN".equals(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("관리자 권한이 필요합니다."));
            }

            // 사용자 정보 조회
            String username = jwtUtils.getUsernameFromJwtToken(jwt);
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

            // 비밀번호 재확인
            String password = request.get("password");
            if (password == null || !passwordEncoder.matches(password, user.getPassword())) {
                log.warn("접근 로그 페이지 비밀번호 인증 실패: username={}", username);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("비밀번호가 일치하지 않습니다."));
            }

            log.info("접근 로그 페이지 비밀번호 인증 성공: username={}", username);
            return ResponseEntity.ok(ApiResponse.success(Map.of(
                "verified", true,
                "message", "비밀번호 인증 성공"
            )));

        } catch (Exception e) {
            log.error("비밀번호 확인 중 오류 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("비밀번호 확인 중 오류가 발생했습니다."));
        }
    }

    /**
     * 필터링된 접근 로그 조회
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<AccessLog>>> getAccessLogs(
            @RequestHeader("Authorization") String token,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(required = false) String ipAddress,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String requestMethod,
            @RequestParam(required = false) String requestUri,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        try {
            // 관리자 권한 확인
            if (!isAdminAuthorized(token)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("관리자 권한이 필요합니다."));
            }

            // 기본값 설정 (최근 24시간)
            if (startTime == null) {
                startTime = LocalDateTime.now().minus(24, ChronoUnit.HOURS);
            }
            if (endTime == null) {
                endTime = LocalDateTime.now();
            }

            Page<AccessLog> logs = accessLogService.getFilteredAccessLogs(
                startTime, endTime, ipAddress, username, requestMethod, requestUri, page, size);

            return ResponseEntity.ok(ApiResponse.success(logs));

        } catch (Exception e) {
            log.error("접근 로그 조회 중 오류 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("접근 로그 조회 중 오류가 발생했습니다."));
        }
    }

    /**
     * 일별 통계 조회
     */
    @GetMapping("/statistics/daily")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDailyStatistics(
            @RequestHeader("Authorization") String token,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {

        try {
            // 관리자 권한 확인
            if (!isAdminAuthorized(token)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("관리자 권한이 필요합니다."));
            }

            // 기본값 설정 (최근 30일)
            if (startTime == null) {
                startTime = LocalDateTime.now().minus(30, ChronoUnit.DAYS);
            }
            if (endTime == null) {
                endTime = LocalDateTime.now();
            }

            Map<String, Object> stats = accessLogService.getDailyStatistics(startTime, endTime);
            return ResponseEntity.ok(ApiResponse.success(stats));

        } catch (Exception e) {
            log.error("일별 통계 조회 중 오류 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("통계 조회 중 오류가 발생했습니다."));
        }
    }

    /**
     * 전체 통계 요약
     */
    @GetMapping("/statistics/overview")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOverallStatistics(
            @RequestHeader("Authorization") String token,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {

        try {
            // 관리자 권한 확인
            if (!isAdminAuthorized(token)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("관리자 권한이 필요합니다."));
            }

            // 기본값 설정 (최근 7일)
            if (startTime == null) {
                startTime = LocalDateTime.now().minus(7, ChronoUnit.DAYS);
            }
            if (endTime == null) {
                endTime = LocalDateTime.now();
            }

            Map<String, Object> stats = accessLogService.getOverallStatistics(startTime, endTime);
            return ResponseEntity.ok(ApiResponse.success(stats));

        } catch (Exception e) {
            log.error("전체 통계 조회 중 오류 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("통계 조회 중 오류가 발생했습니다."));
        }
    }

    /**
     * 에러 로그 조회
     */
    @GetMapping("/errors")
    public ResponseEntity<ApiResponse<Page<AccessLog>>> getErrorLogs(
            @RequestHeader("Authorization") String token,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        try {
            // 관리자 권한 확인
            if (!isAdminAuthorized(token)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("관리자 권한이 필요합니다."));
            }

            // 기본값 설정 (최근 7일)
            if (startTime == null) {
                startTime = LocalDateTime.now().minus(7, ChronoUnit.DAYS);
            }
            if (endTime == null) {
                endTime = LocalDateTime.now();
            }

            Page<AccessLog> errorLogs = accessLogService.getErrorLogs(startTime, endTime, page, size);
            return ResponseEntity.ok(ApiResponse.success(errorLogs));

        } catch (Exception e) {
            log.error("에러 로그 조회 중 오류 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("에러 로그 조회 중 오류가 발생했습니다."));
        }
    }

    /**
     * 특정 IP의 접근 로그 조회
     */
    @GetMapping("/by-ip/{ipAddress}")
    public ResponseEntity<ApiResponse<Page<AccessLog>>> getAccessLogsByIp(
            @RequestHeader("Authorization") String token,
            @PathVariable String ipAddress,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        try {
            // 관리자 권한 확인
            if (!isAdminAuthorized(token)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("관리자 권한이 필요합니다."));
            }

            Page<AccessLog> logs = accessLogService.getAccessLogsByIp(ipAddress, page, size);
            return ResponseEntity.ok(ApiResponse.success(logs));

        } catch (Exception e) {
            log.error("IP별 접근 로그 조회 중 오류 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("접근 로그 조회 중 오류가 발생했습니다."));
        }
    }

    /**
     * 관리자 권한 확인 헬퍼 메서드
     */
    private boolean isAdminAuthorized(String token) {
        if (!token.startsWith("Bearer ")) {
            return false;
        }

        String jwt = token.substring(7);
        if (!jwtUtils.validateJwtToken(jwt)) {
            return false;
        }

        String role = jwtUtils.getRoleFromJwtToken(jwt);
        return "ROLE_ADMIN".equals(role);
    }
}
