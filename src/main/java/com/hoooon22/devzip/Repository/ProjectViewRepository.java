package com.hoooon22.devzip.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.hoooon22.devzip.Model.ProjectView;

/**
 * 프로젝트 조회수 레포지토리입니다.
 */
@Repository
public interface ProjectViewRepository extends JpaRepository<ProjectView, Long> {

    /**
     * 해당 키의 조회수를 1 증가시킵니다. (동시성에 안전한 원자적 UPDATE)
     *
     * @return 갱신된 행의 수 (0이면 해당 키가 아직 없음)
     */
    @Modifying
    @Query("UPDATE ProjectView p SET p.viewCount = p.viewCount + 1, p.updatedAt = CURRENT_TIMESTAMP "
            + "WHERE p.projectKey = :projectKey")
    int incrementViewCount(@Param("projectKey") String projectKey);

    java.util.Optional<ProjectView> findByProjectKey(String projectKey);
}
