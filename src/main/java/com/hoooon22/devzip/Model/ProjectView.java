package com.hoooon22.devzip.Model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * 프로젝트(카드)별 조회수를 저장하는 엔티티입니다.
 * projectKey 는 data/projects.js 의 link 값(예: "/lossy")을 그대로 사용합니다.
 */
@Entity
@Table(name = "project_view", uniqueConstraints = @UniqueConstraint(columnNames = "project_key"))
public class ProjectView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_key", nullable = false, length = 255)
    private String projectKey;

    @Column(name = "view_count", nullable = false)
    private long viewCount;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected ProjectView() {
    }

    public ProjectView(String projectKey, long viewCount) {
        this.projectKey = projectKey;
        this.viewCount = viewCount;
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getProjectKey() {
        return projectKey;
    }

    public long getViewCount() {
        return viewCount;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
