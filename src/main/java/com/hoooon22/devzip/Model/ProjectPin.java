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
 * 프로젝트(카드)별 고정(핀) 여부를 저장하는 엔티티입니다.
 * projectKey 는 data/projects.js 의 link 값(예: "/lossy")을 그대로 사용합니다.
 * 관리자가 설정한 명시적 override 이며, 행이 없으면 프론트의 정적 pinned 기본값을 사용합니다.
 */
@Entity
@Table(name = "project_pin", uniqueConstraints = @UniqueConstraint(columnNames = "project_key"))
public class ProjectPin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_key", nullable = false, length = 255)
    private String projectKey;

    @Column(name = "pinned", nullable = false)
    private boolean pinned;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected ProjectPin() {
    }

    public ProjectPin(String projectKey, boolean pinned) {
        this.projectKey = projectKey;
        this.pinned = pinned;
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getProjectKey() {
        return projectKey;
    }

    public boolean isPinned() {
        return pinned;
    }

    public void setPinned(boolean pinned) {
        this.pinned = pinned;
        this.updatedAt = LocalDateTime.now();
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
