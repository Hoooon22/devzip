package com.hoooon22.devzip.Service;

import com.hoooon22.devzip.Exception.ErrorCode;
import com.hoooon22.devzip.Exception.TraceBoardException;
import com.hoooon22.devzip.Model.Topic;
import com.hoooon22.devzip.Model.User;
import com.hoooon22.devzip.Repository.TopicRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class TopicService {

    private final TopicRepository topicRepository;

    /**
     * 새로운 주제 생성
     */
    @Transactional
    public Topic createTopic(User user, String name, String description, String color, String emoji) {
        log.info("주제 생성 시도: User={}, Name={}", user.getUsername(), name);

        Topic topic = new Topic(user, name, description, color, emoji);
        Topic savedTopic = topicRepository.save(topic);

        log.info("주제 생성 성공: ID={}, Name={}", savedTopic.getId(), savedTopic.getName());
        return savedTopic;
    }

    /**
     * 사용자의 모든 주제 조회
     */
    @Transactional(readOnly = true)
    public List<Topic> getAllTopics(User user) {
        log.debug("주제 목록 조회: User={}", user.getUsername());
        return topicRepository.findByUserOrderByCreatedAtDesc(user);
    }

    /**
     * 특정 주제 조회
     */
    @Transactional(readOnly = true)
    public Optional<Topic> getTopicById(Long id, User user) {
        return topicRepository.findByIdAndUser(id, user);
    }

    /**
     * 주제명으로 검색
     */
    @Transactional(readOnly = true)
    public List<Topic> searchTopics(User user, String keyword) {
        log.debug("주제 검색: User={}, Keyword={}", user.getUsername(), keyword);
        return topicRepository.findByUserAndNameContainingIgnoreCaseOrderByCreatedAtDesc(user, keyword);
    }

    /**
     * 주제 수정
     */
    @Transactional
    public Optional<Topic> updateTopic(Long id, User user, String name, String description, String color, String emoji) {
        Optional<Topic> topicOpt = topicRepository.findByIdAndUser(id, user);

        if (topicOpt.isEmpty()) {
            log.warn("주제 수정 실패: 주제를 찾을 수 없음 - ID={}", id);
            return Optional.empty();
        }

        Topic topic = topicOpt.get();

        if (name != null && !name.trim().isEmpty()) {
            topic.setName(name);
        }
        if (description != null) {
            topic.setDescription(description);
        }
        if (color != null) {
            topic.setColor(color);
        }
        if (emoji != null) {
            topic.setEmoji(emoji);
        }

        Topic updatedTopic = topicRepository.save(topic);
        log.info("주제 수정 성공: ID={}, Name={}", updatedTopic.getId(), updatedTopic.getName());

        return Optional.of(updatedTopic);
    }

    /**
     * 주제 삭제 (연관된 생각들도 함께 삭제됨)
     */
    @Transactional
    public boolean deleteTopic(Long id, User user) {
        Optional<Topic> topicOpt = topicRepository.findByIdAndUser(id, user);

        if (topicOpt.isEmpty()) {
            log.warn("주제 삭제 실패: 주제를 찾을 수 없음 - ID={}", id);
            return false;
        }

        Topic topic = topicOpt.get();
        int thoughtCount = topic.getThoughts().size();

        // CASCADE 설정으로 인해 주제 삭제 시 연관된 생각들도 함께 삭제됨
        topicRepository.delete(topic);
        log.info("주제 삭제 성공: ID={}, 삭제된 생각 수={}", id, thoughtCount);

        return true;
    }

    /**
     * 사용자의 주제 수 조회
     */
    @Transactional(readOnly = true)
    public long countUserTopics(User user) {
        return topicRepository.countByUser(user);
    }
}