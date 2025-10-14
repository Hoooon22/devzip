package com.hoooon22.devzip.Service;

import com.hoooon22.devzip.Exception.ErrorCode;
import com.hoooon22.devzip.Exception.TraceBoardException;
import com.hoooon22.devzip.Model.Thought;
import com.hoooon22.devzip.Model.Topic;
import com.hoooon22.devzip.Model.User;
import com.hoooon22.devzip.Repository.ThoughtRepository;
import com.hoooon22.devzip.Repository.TopicRepository;
import com.hoooon22.devzip.dto.ThoughtMapResponse;
import com.hoooon22.devzip.dto.TopicMapResponse;
import com.hoooon22.devzip.dto.ThoughtHierarchyResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ThoughtService {

    private final ThoughtRepository thoughtRepository;
    private final TopicRepository topicRepository;
    private final AiTagExtractorService aiTagExtractorService;
    private final ThoughtClusteringService clusteringService;
    private final ThoughtHierarchyService hierarchyService;

    /**
     * 새로운 생각 저장 (AI 태그 자동 추출)
     */
    @Transactional
    public Thought createThought(User user, String content) {
        log.info("Creating new thought for user {} with content: {}", user.getUsername(), content);

        // 기존 태그 수집 (사용자의 모든 생각에서)
        List<String> existingTags = getExistingTagsForUser(user, null);
        log.info("Existing tags for context: {}", existingTags);

        // AI를 사용하여 태그 추출 (기존 태그 참조)
        List<String> tags = aiTagExtractorService.extractTags(content, existingTags);
        log.info("Extracted tags: {}", tags);

        // Thought 엔티티 생성 및 저장
        Thought thought = new Thought(user, content, tags);
        Thought savedThought = thoughtRepository.save(thought);

        log.info("Thought saved with id: {}", savedThought.getId());
        return savedThought;
    }

    /**
     * 새로운 생각 저장 (주제 포함, AI 태그 자동 추출)
     */
    @Transactional
    public Thought createThoughtWithTopic(User user, Long topicId, String content) {
        log.info("Creating new thought for user {} with topic {} and content: {}",
                 user.getUsername(), topicId, content);

        // Topic 조회 및 검증
        Topic topic = topicRepository.findById(topicId)
            .orElseThrow(() -> new TraceBoardException(ErrorCode.NOT_FOUND, "주제를 찾을 수 없습니다"));

        // 주제 소유자 확인
        if (!topic.getUser().getId().equals(user.getId())) {
            throw new TraceBoardException(ErrorCode.INSUFFICIENT_PERMISSIONS, "해당 주제에 접근할 수 없습니다");
        }

        // 기존 태그 수집 (같은 주제의 생각들에서)
        List<String> existingTags = getExistingTagsForUser(user, topicId);
        log.info("Existing tags for topic {} context: {}", topicId, existingTags);

        // AI를 사용하여 태그 추출 (기존 태그 참조)
        List<String> tags = aiTagExtractorService.extractTags(content, existingTags);
        log.info("Extracted tags: {}", tags);

        // Topic과 함께 생각 생성
        Thought thought = new Thought(user, topic, content, tags);
        Thought savedThought = thoughtRepository.save(thought);

        log.info("Thought saved with id: {} and topic: {}", savedThought.getId(), topicId);
        return savedThought;
    }

    /**
     * 특정 사용자의 모든 생각 조회 (최신순)
     */
    @Transactional(readOnly = true)
    public List<Thought> getAllThoughts(User user) {
        return thoughtRepository.findByUserOrderByCreatedAtDesc(user);
    }

    /**
     * 특정 ID의 생각 조회
     */
    @Transactional(readOnly = true)
    public Optional<Thought> getThoughtById(Long id) {
        return thoughtRepository.findById(id);
    }

    /**
     * 특정 사용자의 생각 맵 데이터 조회 (태그별 그룹화)
     */
    @Transactional(readOnly = true)
    public List<ThoughtMapResponse> getThoughtMap(User user) {
        List<Thought> allThoughts = thoughtRepository.findByUserOrderByCreatedAtDesc(user);

        // 태그별로 생각들을 그룹화
        Map<String, List<Thought>> tagToThoughtsMap = new HashMap<>();

        for (Thought thought : allThoughts) {
            for (String tag : thought.getTags()) {
                tagToThoughtsMap
                    .computeIfAbsent(tag, k -> new ArrayList<>())
                    .add(thought);
            }
        }

        // ThoughtMapResponse 리스트로 변환
        return tagToThoughtsMap.entrySet().stream()
            .map(entry -> ThoughtMapResponse.from(entry.getKey(), entry.getValue()))
            .sorted(Comparator.comparing(ThoughtMapResponse::getTag))
            .collect(Collectors.toList());
    }

    /**
     * 특정 주제의 생각 맵 데이터 조회 (태그별 그룹화)
     */
    @Transactional(readOnly = true)
    public List<ThoughtMapResponse> getThoughtMapByTopic(User user, Topic topic) {
        List<Thought> topicThoughts = thoughtRepository.findByUserAndTopicOrderByCreatedAtDesc(user, topic);

        // 태그별로 생각들을 그룹화
        Map<String, List<Thought>> tagToThoughtsMap = new HashMap<>();

        for (Thought thought : topicThoughts) {
            for (String tag : thought.getTags()) {
                tagToThoughtsMap
                    .computeIfAbsent(tag, k -> new ArrayList<>())
                    .add(thought);
            }
        }

        // ThoughtMapResponse 리스트로 변환
        return tagToThoughtsMap.entrySet().stream()
            .map(entry -> ThoughtMapResponse.from(entry.getKey(), entry.getValue()))
            .sorted(Comparator.comparing(ThoughtMapResponse::getTag))
            .collect(Collectors.toList());
    }

    /**
     * 특정 주제 중심의 생각 맵 데이터 조회 (주제가 중심, AI 클러스터링 적용)
     */
    @Transactional(readOnly = true)
    public TopicMapResponse getTopicCentricMap(User user, Long topicId) {
        // Topic 조회 및 검증
        Topic topic = topicRepository.findById(topicId)
            .orElseThrow(() -> new TraceBoardException(ErrorCode.NOT_FOUND, "주제를 찾을 수 없습니다"));

        // 주제 소유자 확인
        if (!topic.getUser().getId().equals(user.getId())) {
            throw new TraceBoardException(ErrorCode.INSUFFICIENT_PERMISSIONS, "해당 주제에 접근할 수 없습니다");
        }

        // 주제에 속한 생각들 조회
        List<Thought> thoughts = thoughtRepository.findByUserOrderByCreatedAtDesc(user).stream()
            .filter(thought -> thought.getTopic() != null && thought.getTopic().getId().equals(topicId))
            .collect(Collectors.toList());

        // AI 클러스터링 적용
        List<TopicMapResponse.ThoughtCluster> clusters = clusteringService.clusterThoughts(thoughts);

        return TopicMapResponse.from(topic, clusters);
    }

    /**
     * 특정 주제 ID로 생각 맵 데이터 조회 (태그별 그룹화) - 레거시
     */
    @Transactional(readOnly = true)
    public List<ThoughtMapResponse> getThoughtMapByTopicId(User user, Long topicId) {
        // TopicRepository에서 Topic 조회 필요 - Controller에서 Topic을 직접 전달하는 방식으로 변경 권장
        // 여기서는 간단히 Repository 메서드를 추가로 만들거나, Controller에서 처리하도록 수정
        List<Thought> allThoughts = thoughtRepository.findByUserOrderByCreatedAtDesc(user);
        List<Thought> topicThoughts = allThoughts.stream()
            .filter(thought -> thought.getTopic() != null && thought.getTopic().getId().equals(topicId))
            .collect(Collectors.toList());

        // 태그별로 생각들을 그룹화
        Map<String, List<Thought>> tagToThoughtsMap = new HashMap<>();

        for (Thought thought : topicThoughts) {
            for (String tag : thought.getTags()) {
                tagToThoughtsMap
                    .computeIfAbsent(tag, k -> new ArrayList<>())
                    .add(thought);
            }
        }

        // ThoughtMapResponse 리스트로 변환
        return tagToThoughtsMap.entrySet().stream()
            .map(entry -> ThoughtMapResponse.from(entry.getKey(), entry.getValue()))
            .sorted(Comparator.comparing(ThoughtMapResponse::getTag))
            .collect(Collectors.toList());
    }

    /**
     * 생각 삭제
     */
    @Transactional
    public boolean deleteThought(Long id) {
        if (thoughtRepository.existsById(id)) {
            thoughtRepository.deleteById(id);
            log.info("Thought deleted with id: {}", id);
            return true;
        }
        return false;
    }

    /**
     * 생각 수정
     */
    @Transactional
    public Optional<Thought> updateThought(Long id, String newContent) {
        Optional<Thought> thoughtOpt = thoughtRepository.findById(id);

        if (thoughtOpt.isPresent()) {
            Thought thought = thoughtOpt.get();
            thought.setContent(newContent);

            // 기존 태그 수집 (같은 주제 또는 전체에서)
            Long topicId = thought.getTopic() != null ? thought.getTopic().getId() : null;
            List<String> existingTags = getExistingTagsForUser(thought.getUser(), topicId);

            // 내용이 변경되면 태그도 다시 추출 (기존 태그 참조)
            List<String> newTags = aiTagExtractorService.extractTags(newContent, existingTags);
            thought.setTags(newTags);

            Thought updatedThought = thoughtRepository.save(thought);
            log.info("Thought updated with id: {}", id);
            return Optional.of(updatedThought);
        }

        return Optional.empty();
    }

    /**
     * 특정 사용자의 특정 태그로 생각 검색
     */
    @Transactional(readOnly = true)
    public List<Thought> searchByTag(User user, String tag) {
        return thoughtRepository.findByUserAndTagOrderByCreatedAtDesc(user, tag);
    }

    /**
     * 주제 중심의 생각 계층 구조 맵 데이터 조회 (유사도 기반)
     */
    @Transactional(readOnly = true)
    public ThoughtHierarchyResponse getTopicHierarchyMap(User user, Long topicId) {
        // Topic 조회 및 검증
        Topic topic = topicRepository.findById(topicId)
            .orElseThrow(() -> new TraceBoardException(ErrorCode.NOT_FOUND, "주제를 찾을 수 없습니다"));

        // 주제 소유자 확인
        if (!topic.getUser().getId().equals(user.getId())) {
            throw new TraceBoardException(ErrorCode.INSUFFICIENT_PERMISSIONS, "해당 주제에 접근할 수 없습니다");
        }

        // 주제에 속한 생각들 조회
        List<Thought> thoughts = thoughtRepository.findByUserOrderByCreatedAtDesc(user).stream()
            .filter(thought -> thought.getTopic() != null && thought.getTopic().getId().equals(topicId))
            .collect(Collectors.toList());

        // AI 기반 계층 구조 생성
        ThoughtHierarchyResponse response = hierarchyService.buildHierarchy(thoughts);

        // 주제를 최상위 노드 (Level 0)로 추가
        if (response != null && response.getNodes() != null) {
            // 주제 노드 생성 (ID는 음수로 구별)
            ThoughtHierarchyResponse.HierarchyNode topicNode =
                ThoughtHierarchyResponse.HierarchyNode.createTopicNode(
                    -topicId,  // 음수 ID로 주제 구별
                    topic.getEmoji() + " " + topic.getName(),  // 이모지 + 주제명
                    0,  // Level 0 (최상위)
                    -1  // 부모 없음
                );

            // 기존 노드들의 레벨을 1씩 증가
            List<ThoughtHierarchyResponse.HierarchyNode> nodes = response.getNodes();
            for (ThoughtHierarchyResponse.HierarchyNode node : nodes) {
                node.setLevel(node.getLevel() + 1);
                // 원래 최상위 노드 (parentIndex == -1)들은 주제 노드를 부모로 설정
                if (node.getParentIndex() == -1) {
                    node.setParentIndex(0);  // 주제 노드의 인덱스
                } else if (node.getParentIndex() >= 0) {
                    // 다른 노드들의 parentIndex도 1씩 증가
                    node.setParentIndex(node.getParentIndex() + 1);
                }
            }

            // 주제 노드를 맨 앞에 추가
            nodes.add(0, topicNode);
        }

        return response;
    }

    /**
     * 기존 태그 수집 (사용자의 모든 생각 또는 특정 주제의 생각들에서)
     * @param user 사용자
     * @param topicId 주제 ID (null이면 모든 생각에서 태그 수집)
     * @return 중복 제거된 기존 태그 목록
     */
    private List<String> getExistingTagsForUser(User user, Long topicId) {
        List<Thought> thoughts;

        if (topicId != null) {
            // 특정 주제의 생각들에서 태그 수집
            thoughts = thoughtRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .filter(thought -> thought.getTopic() != null && thought.getTopic().getId().equals(topicId))
                .collect(Collectors.toList());
        } else {
            // 모든 생각에서 태그 수집
            thoughts = thoughtRepository.findByUserOrderByCreatedAtDesc(user);
        }

        // 모든 태그를 수집하고 중복 제거
        return thoughts.stream()
            .flatMap(thought -> thought.getTags().stream())
            .distinct()
            .collect(Collectors.toList());
    }
}
