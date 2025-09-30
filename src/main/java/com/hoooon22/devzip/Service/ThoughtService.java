package com.hoooon22.devzip.Service;

import com.hoooon22.devzip.Model.Thought;
import com.hoooon22.devzip.Model.User;
import com.hoooon22.devzip.Repository.ThoughtRepository;
import com.hoooon22.devzip.dto.ThoughtMapResponse;
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