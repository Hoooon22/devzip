package com.hoooon22.devzip.Repository.traceboard;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hoooon22.devzip.Model.traceboard.EventLog;

public interface EventLogRepository extends JpaRepository<EventLog, Long> {
    
    // 특정 기간 내의 모든 이벤트 로그 찾기
    List<EventLog> findByTimestampBetween(LocalDateTime start, LocalDateTime end);
    
    // 특정 사용자의 이벤트 로그 찾기
    List<EventLog> findByUserId(String userId);
    
    // 특정 이벤트 유형의 로그 찾기
    List<EventLog> findByEventType(String eventType);
    
    // 특정 이벤트 유형과 기간으로 로그 찾기
    List<EventLog> findByEventTypeAndTimestampBetween(String eventType, LocalDateTime start, LocalDateTime end);
    
    // 특정 페이지 경로의 이벤트 로그 찾기
    List<EventLog> findByPath(String path);
    
    // 특정 디바이스 유형의 이벤트 로그 찾기
    List<EventLog> findByDeviceType(String deviceType);
    
    // 특정 기간 내의 고유 사용자 수 계산
    @Query("SELECT COUNT(DISTINCT e.userId) FROM EventLog e WHERE e.timestamp BETWEEN :start AND :end")
    Long countDistinctUsersBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
    
    // 특정 기간 내의 이벤트 유형별 건수 계산
    @Query("SELECT e.eventType, COUNT(e) FROM EventLog e WHERE e.timestamp BETWEEN :start AND :end GROUP BY e.eventType")
    List<Object[]> countByEventTypeBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
    
    // 특정 기간 내의 디바이스 유형별 이벤트 건수 계산
    @Query("SELECT e.deviceType, COUNT(e) FROM EventLog e WHERE e.timestamp BETWEEN :start AND :end GROUP BY e.deviceType")
    List<Object[]> countByDeviceTypeBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
} 