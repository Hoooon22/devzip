package com.hoooon22.devzip.Model.traceboard;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "projects")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    // 프로젝트 소유자
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // API 키 (웹사이트에서 추적 코드에 사용)
    @Column(unique = true, nullable = false)
    private String apiKey;

    // 추적 코드를 삽입할 도메인
    @Column(nullable = false)
    private String domain;

    // 활성화 여부
    @Column(columnDefinition = "boolean default true")
    private boolean active;
} 