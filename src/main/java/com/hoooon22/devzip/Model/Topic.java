package com.hoooon22.devzip.Model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "topics")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Topic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 20)
    private String color; // 주제별 색상 구분용

    @Column(length = 50)
    private String emoji; // 주제별 이모지

    @OneToMany(mappedBy = "topic", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Thought> thoughts = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 생성자 편의 메서드
    public Topic(User user, String name) {
        this.user = user;
        this.name = name;
    }

    public Topic(User user, String name, String description, String color, String emoji) {
        this.user = user;
        this.name = name;
        this.description = description;
        this.color = color;
        this.emoji = emoji;
    }

    // 생각 수 조회
    public int getThoughtCount() {
        return thoughts != null ? thoughts.size() : 0;
    }
}