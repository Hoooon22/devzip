package com.hoooon22.devzip.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.hoooon22.devzip.Model.ServerStart;

/**
 * 서버스타트 레포지토리입니다.
 */
@Repository
public interface ServerStartRepository extends JpaRepository<ServerStart, Long> {
    // 최신 날짜 기준으로 정렬 후 첫 번째 데이터 가져오기
    List<ServerStart> findTopByOrderByDateDesc();
}
