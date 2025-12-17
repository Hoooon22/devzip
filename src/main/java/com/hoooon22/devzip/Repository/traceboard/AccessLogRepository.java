package com.hoooon22.devzip.Repository.traceboard;

import com.hoooon22.devzip.Model.traceboard.AccessLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Repository
public interface AccessLogRepository extends JpaRepository<AccessLog, Long> {

    /**
     * 시간 범위로 접근 로그 조회 (페이징)
     */
    Page<AccessLog> findByAccessTimeBetween(
        LocalDateTime startTime,
        LocalDateTime endTime,
        Pageable pageable
    );

    /**
     * 특정 IP 주소로 접근 로그 조회
     */
    Page<AccessLog> findByIpAddress(String ipAddress, Pageable pageable);

    /**
     * 특정 사용자명으로 접근 로그 조회
     */
    Page<AccessLog> findByUsername(String username, Pageable pageable);

    /**
     * 복합 필터링: 시간 범위 + IP + 사용자명 + 요청 URI
     */
    @Query("SELECT a FROM AccessLog a WHERE " +
           "(:startTime IS NULL OR a.accessTime >= :startTime) AND " +
           "(:endTime IS NULL OR a.accessTime <= :endTime) AND " +
           "(:ipAddress IS NULL OR a.ipAddress = :ipAddress) AND " +
           "(:username IS NULL OR a.username = :username) AND " +
           "(:requestMethod IS NULL OR a.requestMethod = :requestMethod) AND " +
           "(:requestUri IS NULL OR a.requestUri LIKE CONCAT('%', :requestUri, '%')) " +
           "ORDER BY a.accessTime DESC")
    Page<AccessLog> findByFilters(
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime,
        @Param("ipAddress") String ipAddress,
        @Param("username") String username,
        @Param("requestMethod") String requestMethod,
        @Param("requestUri") String requestUri,
        Pageable pageable
    );

    /**
     * 일별 고유 방문자 수 통계
     */
    @Query("SELECT DATE(a.accessTime) as date, COUNT(DISTINCT a.ipAddress) as uniqueVisitors " +
           "FROM AccessLog a " +
           "WHERE a.accessTime BETWEEN :startTime AND :endTime " +
           "GROUP BY DATE(a.accessTime) " +
           "ORDER BY date DESC")
    List<Map<String, Object>> getDailyUniqueVisitors(
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );

    /**
     * 시간대별 접근 통계
     */
    @Query("SELECT HOUR(a.accessTime) as hour, COUNT(a) as count " +
           "FROM AccessLog a " +
           "WHERE a.accessTime BETWEEN :startTime AND :endTime " +
           "GROUP BY HOUR(a.accessTime) " +
           "ORDER BY hour")
    List<Map<String, Object>> getHourlyAccessStats(
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );

    /**
     * 가장 많이 접근한 페이지 (TOP N)
     */
    @Query("SELECT a.requestUri as uri, COUNT(a) as count " +
           "FROM AccessLog a " +
           "WHERE a.accessTime BETWEEN :startTime AND :endTime " +
           "GROUP BY a.requestUri " +
           "ORDER BY count DESC")
    List<Map<String, Object>> getTopAccessedPages(
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime,
        Pageable pageable
    );

    /**
     * IP별 접근 횟수 (국가 정보 포함)
     */
    @Query("SELECT a.ipAddress as ip, a.countryCode as countryCode, a.countryName as countryName, COUNT(a) as count " +
           "FROM AccessLog a " +
           "WHERE a.accessTime BETWEEN :startTime AND :endTime " +
           "GROUP BY a.ipAddress, a.countryCode, a.countryName " +
           "ORDER BY count DESC")
    List<Map<String, Object>> getAccessCountByIp(
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime,
        Pageable pageable
    );

    /**
     * 특정 기간보다 오래된 로그 삭제 (개인정보 보호)
     */
    @Modifying
    @Query("DELETE FROM AccessLog a WHERE a.accessTime < :cutoffDate")
    int deleteOldLogs(@Param("cutoffDate") LocalDateTime cutoffDate);

    /**
     * 에러 로그만 조회 (HTTP 상태 코드 400 이상)
     */
    @Query("SELECT a FROM AccessLog a WHERE " +
           "a.httpStatus >= 400 AND " +
           "a.accessTime BETWEEN :startTime AND :endTime " +
           "ORDER BY a.accessTime DESC")
    Page<AccessLog> findErrorLogs(
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime,
        Pageable pageable
    );

    /**
     * 특정 IP의 특정 기간 내 접근 횟수
     * 오늘 접근 횟수를 확인하려면 startTime에 오늘 00:00:00, endTime에 내일 00:00:00을 전달
     */
    long countByIpAddressAndAccessTimeBetween(String ipAddress, LocalDateTime startTime, LocalDateTime endTime);
}
