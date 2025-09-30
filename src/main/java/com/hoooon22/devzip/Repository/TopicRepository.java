package com.hoooon22.devzip.Repository;

import com.hoooon22.devzip.Model.Topic;
import com.hoooon22.devzip.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TopicRepository extends JpaRepository<Topic, Long> {

    /**
     * 특정 사용자의 모든 주제 조회 (최신순)
     */
    List<Topic> findByUserOrderByCreatedAtDesc(User user);

    /**
     * 특정 사용자의 특정 주제 조회
     */
    Optional<Topic> findByIdAndUser(Long id, User user);

    /**
     * 특정 사용자의 주제명으로 검색
     */
    List<Topic> findByUserAndNameContainingIgnoreCaseOrderByCreatedAtDesc(User user, String name);

    /**
     * 특정 사용자의 주제 수 조회
     */
    long countByUser(User user);
}