package com.hoooon22.devzip.Repository.traceboard;

import com.hoooon22.devzip.Model.traceboard.EventLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventLogRepository extends JpaRepository<EventLog, Long>, JpaSpecificationExecutor<EventLog> {

    // 특정 사용자의 이벤트 로그 조회
    Page<EventLog> findByUserId(String userId, Pageable pageable);
    
    // 시간 범위별 이벤트 로그 조회 (페이징)
    Page<EventLog> findByOccurredAtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);

    // 특정 세션의 이벤트 로그 조회
    List<EventLog> findBySessionId(String sessionId);

    // 특정 이벤트 타입의 로그 조회
    Page<EventLog> findByEventType(String eventType, Pageable pageable);

    // 시간 범위 내의 로그 조회
    Page<EventLog> findByOccurredAtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);

    // 이벤트 타입과 시간 범위로 필터링
    Page<EventLog> findByEventTypeAndOccurredAtBetween(
            String eventType, LocalDateTime start, LocalDateTime end, Pageable pageable);

    // 특정 사용자, 이벤트 타입, 시간 범위
    Page<EventLog> findByUserIdAndEventTypeAndOccurredAtBetween(
            String userId, String eventType, LocalDateTime start, LocalDateTime end, Pageable pageable);

    // 시간대별 이벤트 수 집계 (MySQL 호환)
    @Query(value = 
            "SELECT DATE_FORMAT(occurred_at, '%Y-%m-%d %H:00:00') as hour, COUNT(*) " +
            "FROM event_logs " +
            "WHERE occurred_at BETWEEN :startDate AND :endDate " +
            "GROUP BY DATE_FORMAT(occurred_at, '%Y-%m-%d %H:00:00') " +
            "ORDER BY hour", 
            nativeQuery = true)
    List<Object[]> countByHourBetween(@Param("startDate") LocalDateTime startDate, 
                                      @Param("endDate") LocalDateTime endDate);

    // 페이지별 방문자 수 집계 (MySQL 호환)
    @Query(value = 
            "SELECT path, COUNT(DISTINCT user_id) as visitors " +
            "FROM event_logs " +
            "WHERE event_type = 'pageview' " +  // 이벤트 타입을 일관성 있게 수정
            "AND occurred_at BETWEEN :startDate AND :endDate " +
            "GROUP BY path ORDER BY visitors DESC LIMIT 100", 
            nativeQuery = true)
    List<Object[]> countVisitorsByPage(@Param("startDate") LocalDateTime startDate, 
                                       @Param("endDate") LocalDateTime endDate);
} 