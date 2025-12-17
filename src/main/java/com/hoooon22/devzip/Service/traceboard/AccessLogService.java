package com.hoooon22.devzip.Service.traceboard;

import com.hoooon22.devzip.Model.traceboard.AccessLog;
import com.hoooon22.devzip.Repository.traceboard.AccessLogRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class AccessLogService {

    @Autowired
    private AccessLogRepository accessLogRepository;

    /**
     * 접근 로그 저장
     */
    @Transactional
    public AccessLog saveAccessLog(AccessLog accessLog) {
        return accessLogRepository.save(accessLog);
    }

    /**
     * 필터링된 접근 로그 조회
     */
    @Transactional(readOnly = true)
    public Page<AccessLog> getFilteredAccessLogs(
            LocalDateTime startTime,
            LocalDateTime endTime,
            String ipAddress,
            String username,
            String requestMethod,
            String requestUri,
            int page,
            int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("accessTime").descending());
        return accessLogRepository.findByFilters(startTime, endTime, ipAddress, username, requestMethod, requestUri, pageable);
    }

    /**
     * 특정 IP의 접근 로그 조회
     */
    @Transactional(readOnly = true)
    public Page<AccessLog> getAccessLogsByIp(String ipAddress, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("accessTime").descending());
        return accessLogRepository.findByIpAddress(ipAddress, pageable);
    }

    /**
     * 특정 사용자의 접근 로그 조회
     */
    @Transactional(readOnly = true)
    public Page<AccessLog> getAccessLogsByUsername(String username, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("accessTime").descending());
        return accessLogRepository.findByUsername(username, pageable);
    }

    /**
     * 일별 통계 데이터 조회
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getDailyStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        Map<String, Object> stats = new HashMap<>();

        // 일별 고유 방문자 수
        List<Map<String, Object>> dailyVisitors = accessLogRepository.getDailyUniqueVisitors(startTime, endTime);
        stats.put("dailyUniqueVisitors", dailyVisitors);

        // 시간대별 접근 통계
        List<Map<String, Object>> hourlyStats = accessLogRepository.getHourlyAccessStats(startTime, endTime);
        stats.put("hourlyAccessStats", hourlyStats);

        // 전체 접근 페이지
        List<Map<String, Object>> topPages = accessLogRepository.getTopAccessedPages(
            startTime, endTime, PageRequest.of(0, Integer.MAX_VALUE));
        stats.put("topAccessedPages", topPages);

        // 전체 접근 IP
        List<Map<String, Object>> topIps = accessLogRepository.getAccessCountByIp(
            startTime, endTime, PageRequest.of(0, Integer.MAX_VALUE));
        stats.put("topAccessIps", topIps);

        return stats;
    }

    /**
     * 에러 로그 조회
     */
    @Transactional(readOnly = true)
    public Page<AccessLog> getErrorLogs(LocalDateTime startTime, LocalDateTime endTime, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("accessTime").descending());
        return accessLogRepository.findErrorLogs(startTime, endTime, pageable);
    }

    /**
     * 오래된 로그 자동 삭제 (매일 새벽 3시 실행)
     * 6개월 이상 된 로그 삭제 (개인정보 보호법 준수)
     */
    @Scheduled(cron = "0 0 3 * * ?")
    @Transactional
    public void deleteOldAccessLogs() {
        LocalDateTime cutoffDate = LocalDateTime.now().minusMonths(6);
        int deletedCount = accessLogRepository.deleteOldLogs(cutoffDate);
        log.info("오래된 접근 로그 삭제 완료: {} 건 삭제됨 (기준: {} 이전)", deletedCount, cutoffDate);
    }

    /**
     * 특정 IP의 오늘 접근 횟수 조회 (DoS 방지)
     */
    @Transactional(readOnly = true)
    public long getTodayAccessCountByIp(String ipAddress) {
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime startOfNextDay = startOfDay.plusDays(1);
        return accessLogRepository.countByIpAddressAndAccessTimeBetween(ipAddress, startOfDay, startOfNextDay);
    }

    /**
     * 전체 통계 요약
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getOverallStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        Map<String, Object> stats = new HashMap<>();

        // 전체 접근 횟수
        Pageable pageable = PageRequest.of(0, Integer.MAX_VALUE);
        Page<AccessLog> allLogs = accessLogRepository.findByAccessTimeBetween(startTime, endTime, pageable);
        stats.put("totalAccesses", allLogs.getTotalElements());

        // 고유 방문자 수 (고유 IP 수)
        List<Map<String, Object>> dailyVisitors = accessLogRepository.getDailyUniqueVisitors(startTime, endTime);
        long totalUniqueVisitors = dailyVisitors.stream()
            .mapToLong(m -> ((Number) m.get("uniqueVisitors")).longValue())
            .sum();
        stats.put("totalUniqueVisitors", totalUniqueVisitors);

        // 에러 발생 횟수
        Page<AccessLog> errorLogs = accessLogRepository.findErrorLogs(
            startTime, endTime, PageRequest.of(0, 1));
        stats.put("totalErrors", errorLogs.getTotalElements());

        // 일별 통계
        stats.put("dailyStatistics", getDailyStatistics(startTime, endTime));

        return stats;
    }
}
