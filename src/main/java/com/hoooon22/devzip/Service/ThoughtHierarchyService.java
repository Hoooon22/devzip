package com.hoooon22.devzip.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hoooon22.devzip.Model.Thought;
import com.hoooon22.devzip.dto.ThoughtHierarchyResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ThoughtHierarchyService {

    @Value("${google.api.key:}")
    private String googleApiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public ThoughtHierarchyService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * AI를 사용하여 생각들을 유사도 기반 계층 구조로 재구성
     */
    public ThoughtHierarchyResponse buildHierarchy(List<Thought> thoughts) {
        if (thoughts == null || thoughts.isEmpty()) {
            return new ThoughtHierarchyResponse(new ArrayList<>());
        }

        // 생각이 1개인 경우
        if (thoughts.size() == 1) {
            return new ThoughtHierarchyResponse(
                List.of(ThoughtHierarchyResponse.HierarchyNode.fromThought(thoughts.get(0), 0))
            );
        }

        try {
            // AI에게 계층 구조 생성 요청
            String hierarchyResult = requestHierarchyStructure(thoughts);

            // AI 응답을 파싱하여 계층 구조 생성
            return parseHierarchyResult(hierarchyResult, thoughts);
        } catch (Exception e) {
            log.error("AI 계층 구조 생성 실패, 기본 전략 사용", e);
            // AI 실패 시 태그 기반 계층 구조로 폴백
            return buildHierarchyByTags(thoughts);
        }
    }

    /**
     * AI에게 계층 구조 생성 요청
     */
    private String requestHierarchyStructure(List<Thought> thoughts) {
        if (googleApiKey == null || googleApiKey.trim().isEmpty()) {
            log.warn("Google API key is not configured for hierarchy building.");
            return "";
        }

        try {
            String apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + googleApiKey;

            // 프롬프트 작성
            StringBuilder prompt = new StringBuilder();
            prompt.append("아래 생각들을 의미적 유사도와 연관성에 따라 계층 구조로 재구성해주세요.\n\n");
            prompt.append("### 계층 구조 규칙:\n");
            prompt.append("1. 가장 핵심적이고 포괄적인 생각을 최상위(레벨 0)에 배치\n");
            prompt.append("2. 관련되거나 세부적인 생각을 하위 레벨에 배치\n");
            prompt.append("3. 유사도가 높은 생각들끼리 상-하위 관계 형성\n");
            prompt.append("4. 각 생각은 한 번만 사용 (중복 배치 금지)\n");
            prompt.append("5. 최대 4레벨까지 구성 (0, 1, 2, 3)\n\n");
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
            prompt.append("각 생각을 다음 형식으로 출력해주세요:\n");
            prompt.append("INDEX:생각번호\n");
            prompt.append("LEVEL:레벨(0-3)\n");
            prompt.append("PARENT:부모생각번호(최상위는 -1)\n");
            prompt.append("---\n");
            prompt.append("\n중요: 모든 생각이 하나의 트리 구조로 연결되어야 합니다. 고아 노드가 없도록 해주세요.");

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
                return parseGeminiHierarchyResponse(response.getBody());
            } else {
                log.error("Failed to call Gemini API for hierarchy. Status: {}", response.getStatusCode());
                return "";
            }

        } catch (Exception e) {
            log.error("Error requesting hierarchy from AI: {}", e.getMessage(), e);
            return "";
        }
    }

    /**
     * Gemini API 응답에서 계층 구조 결과 파싱
     */
    private String parseGeminiHierarchyResponse(String responseBody) {
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
            log.error("Error parsing Gemini hierarchy response: {}", e.getMessage());
        }

        return "";
    }

    /**
     * AI 응답 파싱하여 계층 구조 생성
     */
    private ThoughtHierarchyResponse parseHierarchyResult(String result, List<Thought> thoughts) {
        List<ThoughtHierarchyResponse.HierarchyNode> nodes = new ArrayList<>();
        Map<Integer, Thought> thoughtMap = new HashMap<>();
        Map<Integer, ThoughtHierarchyResponse.HierarchyNode> nodeMap = new HashMap<>();

        for (int i = 0; i < thoughts.size(); i++) {
            thoughtMap.put(i, thoughts.get(i));
        }

        String[] entries = result.split("---");
        Set<Integer> processedIndices = new HashSet<>();

        for (String entry : entries) {
            entry = entry.trim();
            if (entry.isEmpty()) continue;

            Integer index = null;
            Integer level = null;
            Integer parent = null;

            String[] lines = entry.split("\n");
            for (String line : lines) {
                if (line.startsWith("INDEX:")) {
                    try {
                        index = Integer.parseInt(line.substring("INDEX:".length()).trim());
                    } catch (NumberFormatException e) {
                        log.warn("잘못된 INDEX 형식: {}", line);
                    }
                } else if (line.startsWith("LEVEL:")) {
                    try {
                        level = Integer.parseInt(line.substring("LEVEL:".length()).trim());
                    } catch (NumberFormatException e) {
                        log.warn("잘못된 LEVEL 형식: {}", line);
                    }
                } else if (line.startsWith("PARENT:")) {
                    try {
                        parent = Integer.parseInt(line.substring("PARENT:".length()).trim());
                    } catch (NumberFormatException e) {
                        log.warn("잘못된 PARENT 형식: {}", line);
                    }
                }
            }

            if (index != null && level != null && parent != null && thoughtMap.containsKey(index)) {
                if (!processedIndices.contains(index)) {
                    Thought thought = thoughtMap.get(index);
                    ThoughtHierarchyResponse.HierarchyNode node =
                        ThoughtHierarchyResponse.HierarchyNode.fromThought(thought, level);

                    node.setParentIndex(parent);
                    nodeMap.put(index, node);
                    processedIndices.add(index);
                }
            }
        }

        // 처리되지 않은 생각들은 기본 레벨 3으로 추가
        for (int i = 0; i < thoughts.size(); i++) {
            if (!processedIndices.contains(i)) {
                ThoughtHierarchyResponse.HierarchyNode node =
                    ThoughtHierarchyResponse.HierarchyNode.fromThought(thoughts.get(i), 3);
                node.setParentIndex(-1);
                nodeMap.put(i, node);
            }
        }

        // 부모-자식 관계 설정
        for (Map.Entry<Integer, ThoughtHierarchyResponse.HierarchyNode> entry : nodeMap.entrySet()) {
            ThoughtHierarchyResponse.HierarchyNode node = entry.getValue();
            Integer parentIdx = node.getParentIndex();

            if (parentIdx != null && parentIdx >= 0 && nodeMap.containsKey(parentIdx)) {
                ThoughtHierarchyResponse.HierarchyNode parent = nodeMap.get(parentIdx);
                parent.addChild(node);
            } else {
                // 최상위 노드
                nodes.add(node);
            }
        }

        return new ThoughtHierarchyResponse(nodes);
    }

    /**
     * 태그 기반 계층 구조 (폴백 전략)
     */
    private ThoughtHierarchyResponse buildHierarchyByTags(List<Thought> thoughts) {
        Map<String, List<Thought>> tagGroups = new HashMap<>();
        List<Thought> untagged = new ArrayList<>();

        // 태그별로 그룹화
        for (Thought thought : thoughts) {
            if (thought.getTags().isEmpty()) {
                untagged.add(thought);
            } else {
                String primaryTag = thought.getTags().get(0);
                tagGroups.computeIfAbsent(primaryTag, k -> new ArrayList<>()).add(thought);
            }
        }

        List<ThoughtHierarchyResponse.HierarchyNode> rootNodes = new ArrayList<>();

        // 각 태그 그룹을 계층 구조로 변환
        for (Map.Entry<String, List<Thought>> entry : tagGroups.entrySet()) {
            List<Thought> groupThoughts = entry.getValue();

            if (groupThoughts.size() == 1) {
                // 단일 생각은 레벨 0
                rootNodes.add(ThoughtHierarchyResponse.HierarchyNode.fromThought(groupThoughts.get(0), 0));
            } else {
                // 첫 번째를 상위로, 나머지를 하위로
                ThoughtHierarchyResponse.HierarchyNode parent =
                    ThoughtHierarchyResponse.HierarchyNode.fromThought(groupThoughts.get(0), 0);

                for (int i = 1; i < groupThoughts.size(); i++) {
                    ThoughtHierarchyResponse.HierarchyNode child =
                        ThoughtHierarchyResponse.HierarchyNode.fromThought(groupThoughts.get(i), 1);
                    parent.addChild(child);
                }

                rootNodes.add(parent);
            }
        }

        // 태그 없는 생각들 추가
        for (Thought thought : untagged) {
            rootNodes.add(ThoughtHierarchyResponse.HierarchyNode.fromThought(thought, 0));
        }

        return new ThoughtHierarchyResponse(rootNodes);
    }
}
