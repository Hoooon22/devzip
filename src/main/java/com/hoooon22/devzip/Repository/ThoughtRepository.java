package com.hoooon22.devzip.Repository;

import com.hoooon22.devzip.Model.Thought;
import com.hoooon22.devzip.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ThoughtRepository extends JpaRepository<Thought, Long> {

    /**
     * 특정 사용자의 모든 생각 조회 (최신순)
     */
    List<Thought> findByUserOrderByCreatedAtDesc(User user);

    /**
     * 특정 사용자의 특정 태그를 포함하는 생각들 조회
     */
    @Query("SELECT DISTINCT t FROM Thought t JOIN t.tags tag WHERE t.user = :user AND tag = :tag ORDER BY t.createdAt DESC")
    List<Thought> findByUserAndTagOrderByCreatedAtDesc(@Param("user") User user, @Param("tag") String tag);

    /**
     * 특정 사용자의 여러 태그 중 하나라도 포함하는 생각들 조회
     */
    @Query("SELECT DISTINCT t FROM Thought t JOIN t.tags tag WHERE t.user = :user AND tag IN :tags ORDER BY t.createdAt DESC")
    List<Thought> findByUserAndTagsInOrderByCreatedAtDesc(@Param("user") User user, @Param("tags") List<String> tags);
}