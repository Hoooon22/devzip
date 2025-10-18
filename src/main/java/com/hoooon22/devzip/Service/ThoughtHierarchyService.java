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
                new ArrayList<>(List.of(ThoughtHierarchyResponse.HierarchyNode.fromThought(thoughts.get(0), 0)))
            );
        }

        try {
            log.info("========================================");
            log.info("🔍 AI 계층 구조 분석 시작");
            log.info("생각 개수: {}", thoughts.size());
            for (int i = 0; i < thoughts.size(); i++) {
                log.info("[{}] {}", i, thoughts.get(i).getContent());
                log.info("    태그: {}", thoughts.get(i).getTags());
            }
            log.info("========================================");

            // AI에게 계층 구조 생성 요청
            String hierarchyResult = requestHierarchyStructure(thoughts);

            log.info("🤖 AI 원본 응답:");
            log.info("{}", hierarchyResult);
            log.info("========================================");

            // AI 응답을 파싱하여 계층 구조 생성
            ThoughtHierarchyResponse response = parseHierarchyResult(hierarchyResult, thoughts);

            log.info("✅ 계층 구조 파싱 완료:");
            log.info("노드 개수: {}", response.getNodes().size());
            for (ThoughtHierarchyResponse.HierarchyNode node : response.getNodes()) {
                log.info("노드 ID: {}, Level: {}, Parent: {}",
                    node.getId(), node.getLevel(), node.getParentIndex());
                log.info("  내용: {}", node.getContent().substring(0, Math.min(50, node.getContent().length())));
            }
            log.info("========================================");

            return response;
        } catch (Exception e) {
            log.error("❌ AI 계층 구조 생성 실패, 기본 전략 사용", e);
            // AI 실패 시 태그 기반 계층 구조로 폴백
            return buildHierarchyByTags(thoughts);
        }
    }

    /**
     * AI에게 계층 구조 생성 요청
     */
    private String requestHierarchyStructure(List<Thought> thoughts) {
        if (googleApiKey == null || googleApiKey.trim().isEmpty()) {
            log.error("❌ Google API 키가 설정되지 않음! application.properties에 google.api.key를 추가하세요.");
            log.error("   현재 값: googleApiKey={}", googleApiKey);
            return "";
        }

        log.info("🔑 Google API 키 확인: {}...{}",
            googleApiKey.substring(0, Math.min(10, googleApiKey.length())),
            googleApiKey.length() > 10 ? "****" : "");

        try {
            String apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + googleApiKey;

            // 최적화된 프롬프트 작성
            StringBuilder prompt = new StringBuilder();
            prompt.append("생각들을 마인드맵 계층 구조로 분류.\n\n");
            prompt.append("규칙:\n");
            prompt.append("1. 가장 핵심적인 생각 1개만 레벨0으로 선정 (마인드맵 중심)\n");
            prompt.append("2. 레벨0과 직접 관련된 생각들 = 레벨1\n");
            prompt.append("3. 레벨1의 세부/하위 생각들 = 레벨2, 레벨2의 세부 = 레벨3 (레벨 숫자가 클수록 하위 개념)\n");
            prompt.append("4. 의미적 유사도, 인과관계, 주제 연관성이 높은 것끼리 부모-자식 관계 형성\n");
            prompt.append("5. 모든 생각은 반드시 레벨0에서 시작하는 트리 구조로 연결\n");
            prompt.append("6. 같은 레벨끼리는 절대 연결하지 말 것 (부모는 항상 더 낮은 레벨)\n\n");
            prompt.append("생각:\n");

            // 각 생각에 인덱스와 태그 부여
            for (int i = 0; i < thoughts.size(); i++) {
                Thought thought = thoughts.get(i);
                prompt.append(String.format("[%d] %s", i, thought.getContent()));
                List<String> tags = thought.getTags();
                if (tags != null && !tags.isEmpty()) {
                    prompt.append(String.format(" (태그: %s)", String.join(", ", tags)));
                }
                prompt.append("\n");
            }

            prompt.append("\n출력 형식:\n");
            prompt.append("INDEX:번호\n");
            prompt.append("LEVEL:레벨(0=핵심,1=주요,2=세부,3=상세...)\n");
            prompt.append("PARENT:부모번호(-1=레벨0만)\n");
            prompt.append("---\n");
            prompt.append("\n중요:\n");
            prompt.append("- 레벨0은 정확히 1개만\n");
            prompt.append("- 레벨1의 PARENT는 반드시 레벨0의 인덱스\n");
            prompt.append("- 레벨2의 PARENT는 레벨1 중 하나\n");
            prompt.append("- 연관성을 깊이 분석하여 자연스러운 계층 형성");

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
        log.info("🔗 부모-자식 관계 설정 시작 (전체 노드: {}개)", nodeMap.size());

        for (Map.Entry<Integer, ThoughtHierarchyResponse.HierarchyNode> entry : nodeMap.entrySet()) {
            Integer nodeIndex = entry.getKey();
            ThoughtHierarchyResponse.HierarchyNode node = entry.getValue();
            Integer parentIdx = node.getParentIndex();

            log.debug("  노드[{}]: Level={}, ParentIndex={}", nodeIndex, node.getLevel(), parentIdx);

            if (parentIdx != null && parentIdx >= 0 && nodeMap.containsKey(parentIdx)) {
                // 부모가 있는 노드: 부모의 children에 추가
                ThoughtHierarchyResponse.HierarchyNode parent = nodeMap.get(parentIdx);
                parent.addChild(node);
                log.debug("    → 부모[{}](Level={})의 자식으로 추가", parentIdx, parent.getLevel());
            } else {
                // 최상위 노드 (Level 0만 여기 해당)
                nodes.add(node);
                log.debug("    → 최상위 노드로 추가");
            }
        }

        log.info("✅ 계층 구조 완성 - 최상위 노드: {}개", nodes.size());

        // 최상위 노드의 children 구조 로깅
        for (ThoughtHierarchyResponse.HierarchyNode rootNode : nodes) {
            logNodeStructure(rootNode, 0);
        }

        return new ThoughtHierarchyResponse(nodes);
    }

    /**
     * 노드 구조 재귀적 로깅 (디버깅용)
     */
    private void logNodeStructure(ThoughtHierarchyResponse.HierarchyNode node, int depth) {
        String indent = "  ".repeat(depth);
        log.info("{}└─ [Level {}] {} (자식: {}개)",
            indent, node.getLevel(),
            node.getContent().substring(0, Math.min(30, node.getContent().length())),
            node.getChildren() != null ? node.getChildren().size() : 0);

        if (node.getChildren() != null && !node.getChildren().isEmpty()) {
            for (ThoughtHierarchyResponse.HierarchyNode child : node.getChildren()) {
                logNodeStructure(child, depth + 1);
            }
        }
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
