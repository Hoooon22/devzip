package com.hoooon22.devzip.Service;

import com.hoooon22.devzip.Model.Thought;
import com.hoooon22.devzip.dto.TopicMapResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ThoughtClusteringService {

    private final ChatClient.Builder chatClientBuilder;

    /**
     * AI를 사용하여 생각들을 관련성에 따라 클러스터링
     */
    public List<TopicMapResponse.ThoughtCluster> clusterThoughts(List<Thought> thoughts) {
        if (thoughts == null || thoughts.isEmpty()) {
            return Collections.emptyList();
        }

        // 생각이 1개인 경우 클러스터링 불필요
        if (thoughts.size() == 1) {
            return List.of(createSingleCluster("cluster-0", thoughts));
        }

        try {
            // AI에게 클러스터링 요청
            String clusteringResult = requestClustering(thoughts);

            // AI 응답을 파싱하여 클러스터 생성
            return parseClusteringResult(clusteringResult, thoughts);
        } catch (Exception e) {
            log.error("AI 클러스터링 실패, 기본 전략 사용", e);
            // AI 실패 시 태그 기반 클러스터링으로 폴백
            return clusterByTags(thoughts);
        }
    }

    /**
     * AI에게 클러스터링 요청
     */
    private String requestClustering(List<Thought> thoughts) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("다음 생각들을 내용의 유사성과 관련성에 따라 그룹화해주세요.\n\n");

        // 각 생각에 인덱스 부여
        for (int i = 0; i < thoughts.size(); i++) {
            Thought thought = thoughts.get(i);
            prompt.append(String.format("[%d] %s\n", i, thought.getContent()));
            if (!thought.getTags().isEmpty()) {
                prompt.append(String.format("   태그: %s\n", String.join(", ", thought.getTags())));
            }
        }

        prompt.append("\n응답 형식:\n");
        prompt.append("각 그룹을 다음 형식으로 출력해주세요:\n");
        prompt.append("GROUP:그룹설명\n");
        prompt.append("MEMBERS:0,1,2\n");
        prompt.append("---\n");
        prompt.append("\n중요: 서로 관련 있는 생각들은 같은 그룹으로, 독립적인 생각은 별도 그룹으로 만들어주세요.");

        ChatClient chatClient = chatClientBuilder.build();

        return chatClient.prompt()
            .user(prompt.toString())
            .call()
            .content();
    }

    /**
     * AI 응답 파싱하여 클러스터 생성
     */
    private List<TopicMapResponse.ThoughtCluster> parseClusteringResult(String result, List<Thought> thoughts) {
        List<TopicMapResponse.ThoughtCluster> clusters = new ArrayList<>();
        Map<Integer, Thought> thoughtMap = new HashMap<>();

        for (int i = 0; i < thoughts.size(); i++) {
            thoughtMap.put(i, thoughts.get(i));
        }

        String[] groups = result.split("---");
        Set<Integer> assignedThoughts = new HashSet<>();

        for (int groupIdx = 0; groupIdx < groups.length; groupIdx++) {
            String group = groups[groupIdx].trim();
            if (group.isEmpty()) continue;

            String clusterId = "cluster-" + groupIdx;
            List<Integer> memberIndices = new ArrayList<>();

            // MEMBERS 라인 파싱
            String[] lines = group.split("\n");
            for (String line : lines) {
                if (line.startsWith("MEMBERS:")) {
                    String membersStr = line.substring("MEMBERS:".length()).trim();
                    String[] indices = membersStr.split(",");

                    for (String indexStr : indices) {
                        try {
                            int index = Integer.parseInt(indexStr.trim());
                            if (thoughtMap.containsKey(index) && !assignedThoughts.contains(index)) {
                                memberIndices.add(index);
                                assignedThoughts.add(index);
                            }
                        } catch (NumberFormatException e) {
                            log.warn("잘못된 인덱스 형식: {}", indexStr);
                        }
                    }
                }
            }

            if (!memberIndices.isEmpty()) {
                List<Thought> clusterThoughts = memberIndices.stream()
                    .map(thoughtMap::get)
                    .collect(Collectors.toList());

                clusters.add(createSingleCluster(clusterId, clusterThoughts));
            }
        }

        // AI가 할당하지 못한 생각들은 개별 클러스터로 추가
        for (int i = 0; i < thoughts.size(); i++) {
            if (!assignedThoughts.contains(i)) {
                String clusterId = "cluster-orphan-" + i;
                clusters.add(createSingleCluster(clusterId, List.of(thoughts.get(i))));
            }
        }

        return clusters;
    }

    /**
     * 태그 기반 클러스터링 (폴백 전략)
     */
    private List<TopicMapResponse.ThoughtCluster> clusterByTags(List<Thought> thoughts) {
        Map<String, List<Thought>> tagClusters = new HashMap<>();
        List<Thought> untaggedThoughts = new ArrayList<>();

        for (Thought thought : thoughts) {
            if (thought.getTags().isEmpty()) {
                untaggedThoughts.add(thought);
            } else {
                // 첫 번째 태그를 기준으로 그룹화
                String primaryTag = thought.getTags().get(0);
                tagClusters.computeIfAbsent(primaryTag, k -> new ArrayList<>()).add(thought);
            }
        }

        List<TopicMapResponse.ThoughtCluster> clusters = new ArrayList<>();

        // 태그별 클러스터 생성
        int clusterIdx = 0;
        for (Map.Entry<String, List<Thought>> entry : tagClusters.entrySet()) {
            String clusterId = "cluster-tag-" + clusterIdx++;
            clusters.add(createSingleCluster(clusterId, entry.getValue()));
        }

        // 태그 없는 생각들은 개별 클러스터로
        for (int i = 0; i < untaggedThoughts.size(); i++) {
            String clusterId = "cluster-notag-" + i;
            clusters.add(createSingleCluster(clusterId, List.of(untaggedThoughts.get(i))));
        }

        return clusters;
    }

    /**
     * 단일 클러스터 생성
     */
    private TopicMapResponse.ThoughtCluster createSingleCluster(String clusterId, List<Thought> thoughts) {
        List<TopicMapResponse.ThoughtNode> nodes = thoughts.stream()
            .map(thought -> TopicMapResponse.ThoughtNode.builder()
                .id(thought.getId())
                .content(thought.getContent())
                .tags(thought.getTags())
                .build())
            .collect(Collectors.toList());

        return TopicMapResponse.ThoughtCluster.builder()
            .clusterId(clusterId)
            .thoughts(nodes)
            .build();
    }
}
