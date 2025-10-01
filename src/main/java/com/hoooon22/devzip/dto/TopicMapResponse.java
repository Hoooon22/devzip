package com.hoooon22.devzip.dto;

import com.hoooon22.devzip.Model.Thought;
import com.hoooon22.devzip.Model.Topic;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopicMapResponse {
    private Long topicId;
    private String topicName;
    private String topicEmoji;
    private String topicColor;
    private List<ThoughtCluster> clusters;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ThoughtCluster {
        private String clusterId;
        private List<ThoughtNode> thoughts;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ThoughtNode {
        private Long id;
        private String content;
        private List<String> tags;
    }

    public static TopicMapResponse from(Topic topic, List<ThoughtCluster> clusters) {
        return TopicMapResponse.builder()
            .topicId(topic.getId())
            .topicName(topic.getName())
            .topicEmoji(topic.getEmoji())
            .topicColor(topic.getColor())
            .clusters(clusters)
            .build();
    }

    // 레거시 호환성을 위한 메서드 (클러스터링 없이)
    public static TopicMapResponse fromThoughts(Topic topic, List<Thought> thoughts) {
        ThoughtCluster singleCluster = ThoughtCluster.builder()
            .clusterId("default")
            .thoughts(thoughts.stream()
                .map(thought -> ThoughtNode.builder()
                    .id(thought.getId())
                    .content(thought.getContent())
                    .tags(thought.getTags())
                    .build())
                .collect(Collectors.toList()))
            .build();

        return TopicMapResponse.builder()
            .topicId(topic.getId())
            .topicName(topic.getName())
            .topicEmoji(topic.getEmoji())
            .topicColor(topic.getColor())
            .clusters(List.of(singleCluster))
            .build();
    }
}
