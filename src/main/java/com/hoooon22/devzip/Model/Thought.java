package com.hoooon22.devzip.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "thoughts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Thought {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    private Topic topic;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "thought_tags", joinColumns = @JoinColumn(name = "thought_id"))
    @Column(name = "tag")
    private List<String> tags = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 생성자 편의 메서드
    public Thought(User user, String content) {
        this.user = user;
        this.content = content;
        this.tags = new ArrayList<>();
    }

    public Thought(User user, String content, List<String> tags) {
        this.user = user;
        this.content = content;
        this.tags = tags != null ? tags : new ArrayList<>();
    }

    public Thought(User user, Topic topic, String content) {
        this.user = user;
        this.topic = topic;
        this.content = content;
        this.tags = new ArrayList<>();
    }

    public Thought(User user, Topic topic, String content, List<String> tags) {
        this.user = user;
        this.topic = topic;
        this.content = content;
        this.tags = tags != null ? tags : new ArrayList<>();
    }

    // 태그 추가/제거 편의 메서드
    public void addTag(String tag) {
        if (tag != null && !tag.trim().isEmpty() && !this.tags.contains(tag)) {
            this.tags.add(tag);
        }
    }

    public void removeTag(String tag) {
        this.tags.remove(tag);
    }

    public void clearTags() {
        this.tags.clear();
    }
}