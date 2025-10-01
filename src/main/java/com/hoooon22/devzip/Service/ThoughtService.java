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

    /**
     * 새로운 생각 저장 (AI 태그 자동 추출)
     */
    @Transactional
    public Thought createThought(User user, String content) {
        log.info("Creating new thought for user {} with content: {}", user.getUsername(), content);

        // AI를 사용하여 태그 추출
        List<String> tags = aiTagExtractorService.extractTags(content);
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

        // AI를 사용하여 태그 추출
        List<String> tags = aiTagExtractorService.extractTags(content);
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
     * 특정 주제 중심의 생각 맵 데이터 조회 (주제가 중심)
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

        return TopicMapResponse.from(topic, thoughts);
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

            // 내용이 변경되면 태그도 다시 추출
            List<String> newTags = aiTagExtractorService.extractTags(newContent);
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
}