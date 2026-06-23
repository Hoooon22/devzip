package com.hoooon22.devzip.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.hoooon22.devzip.Model.ProjectPin;

/**
 * 프로젝트 고정(핀) 레포지토리입니다.
 */
@Repository
public interface ProjectPinRepository extends JpaRepository<ProjectPin, Long> {

    Optional<ProjectPin> findByProjectKey(String projectKey);
}
