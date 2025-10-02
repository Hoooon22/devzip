package com.hoooon22.devzip.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hoooon22.devzip.Model.Thought;
import com.hoooon22.devzip.dto.TopicMapResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ThoughtClusteringService {

    @Value("${google.api.key:}")
    private String googleApiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public ThoughtClusteringService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

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
        // API 키가 설정되지 않은 경우 빈 문자열 반환 (폴백 처리는 호출자가 담당)
        if (googleApiKey == null || googleApiKey.trim().isEmpty()) {
            log.warn("Google API key is not configured for clustering.");
            return "";
        }

        try {
            String apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + googleApiKey;

            // 프롬프트 작성
            StringBuilder prompt = new StringBuilder();
            prompt.append("아래 생각들을 의미적 연관성에 따라 그룹화해주세요.\n\n");
            prompt.append("### 그룹화 규칙:\n");
            prompt.append("1. 같은 주제나 맥락에 속하는 생각들은 반드시 하나의 그룹으로 묶어주세요\n");
            prompt.append("2. 연속적이거나 인과관계가 있는 생각들(예: A → B → C)은 같은 그룹입니다\n");
            prompt.append("3. 도구/기술 스택처럼 함께 사용되는 것들도 같은 그룹입니다\n");
            prompt.append("4. 완전히 다른 주제만 별도 그룹으로 분리하세요\n\n");
            prompt.append("### 생각 목록:\n");

            // 각 생각에 인덱스 부여
            for (int i = 0; i < thoughts.size(); i++) {
                Thought thought = thoughts.get(i);
                prompt.append(String.format("[%d] %s\n", i, thought.getContent()));
                List<String> tags = thought.getTags();
                if (tags != null && !tags.isEmpty()) {
                    prompt.append(String.format("   태그: %s\n", String.join(", ", tags)));
                }
            }

            prompt.append("\n### 응답 형식:\n");
            prompt.append("각 그룹을 다음 형식으로 출력해주세요:\n");
            prompt.append("GROUP:그룹의 주제나 공통점\n");
            prompt.append("MEMBERS:0,1,2\n");
            prompt.append("---\n");
            prompt.append("\n중요: 연관성이 조금이라도 있으면 같은 그룹으로 묶어주세요. 너무 세분화하지 마세요.");

            // 요청 바디 생성
            Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                    Map.of(
                        "parts", List.of(
                            Map.of("text", prompt.toString())
                        )
                    )
                )
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            // API 호출
            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl,
                HttpMethod.POST,
                request,
                String.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return parseGeminiClusteringResponse(response.getBody());
            } else {
                log.error("Failed to call Gemini API for clustering. Status: {}", response.getStatusCode());
                return "";
            }

        } catch (Exception e) {
            log.error("Error requesting clustering from AI: {}", e.getMessage(), e);
            return "";
        }
    }

    /**
     * Gemini API 응답에서 클러스터링 결과 파싱
     */
    private String parseGeminiClusteringResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");

            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode firstCandidate = candidates.get(0);
                JsonNode content = firstCandidate.path("content");
                JsonNode parts = content.path("parts");

                if (parts.isArray() && parts.size() > 0) {
                    return parts.get(0).path("text").asText();
                }
            }
        } catch (Exception e) {
            log.error("Error parsing Gemini clustering response: {}", e.getMessage());
        }

        return "";
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
