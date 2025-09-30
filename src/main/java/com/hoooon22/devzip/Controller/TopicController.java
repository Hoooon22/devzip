package com.hoooon22.devzip.Controller;

import com.hoooon22.devzip.Exception.ErrorCode;
import com.hoooon22.devzip.Exception.TraceBoardException;
import com.hoooon22.devzip.Model.Topic;
import com.hoooon22.devzip.Model.User;
import com.hoooon22.devzip.Model.common.ApiResponse;
import com.hoooon22.devzip.Repository.UserRepository;
import com.hoooon22.devzip.Service.TopicService;
import com.hoooon22.devzip.Service.UserDetailsServiceImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080", "https://192.168.75.224", "http://192.168.75.224", "http://192.168.75.224:8080", "https://devzip.cloud", "http://devzip.cloud"})
@Slf4j
@RestController
@RequestMapping("/api/topics")
@RequiredArgsConstructor
public class TopicController {

    private final TopicService topicService;
    private final UserRepository userRepository;

    /**
     * 현재 인증된 사용자 가져오기
     */
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated() ||
            authentication.getPrincipal().equals("anonymousUser")) {
            throw new TraceBoardException(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다");
        }

        UserDetailsServiceImpl.UserPrincipal userPrincipal =
            (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();

        return userRepository.findByUsername(userPrincipal.getUsername())
            .orElseThrow(() -> new TraceBoardException(ErrorCode.USER_NOT_FOUND, "사용자를 찾을 수 없습니다"));
    }

    /**
     * 새로운 주제 생성
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Topic>> createTopic(@Valid @RequestBody Map<String, String> request) {
        try {
            String name = request.get("name");
            String description = request.get("description");
            String color = request.get("color");
            String emoji = request.get("emoji");

            if (name == null || name.trim().isEmpty()) {
                throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "주제명을 입력해주세요");
            }

            if (name.length() > 100) {
                throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "주제명은 100자 이하로 입력해주세요");
            }

            User currentUser = getCurrentUser();
            Topic savedTopic = topicService.createTopic(currentUser, name, description, color, emoji);

            log.info("주제 생성 성공: ID={}, User={}, Name={}", savedTopic.getId(), currentUser.getUsername(), savedTopic.getName());
            return ResponseEntity.ok(ApiResponse.success(savedTopic));
        } catch (TraceBoardException e) {
            throw e;
        } catch (Exception e) {
            log.error("주제 생성 중 오류 발생", e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "주제 생성 중 오류가 발생했습니다", e);
        }
    }

    /**
     * 모든 주제 조회
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Topic>>> getAllTopics() {
        try {
            User currentUser = getCurrentUser();
            List<Topic> topics = topicService.getAllTopics(currentUser);

            log.info("주제 전체 조회: User={}, Count={}", currentUser.getUsername(), topics.size());
            return ResponseEntity.ok(ApiResponse.success(topics));
        } catch (TraceBoardException e) {
            throw e;
        } catch (Exception e) {
            log.error("주제 조회 중 오류 발생", e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "주제 조회 중 오류가 발생했습니다", e);
        }
    }

    /**
     * 특정 주제 조회
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Topic>> getTopic(@PathVariable Long id) {
        try {
            User currentUser = getCurrentUser();
            Optional<Topic> topic = topicService.getTopicById(id, currentUser);

            if (topic.isEmpty()) {
                throw new TraceBoardException(ErrorCode.NOT_FOUND, "주제를 찾을 수 없습니다");
            }

            return ResponseEntity.ok(ApiResponse.success(topic.get()));
        } catch (TraceBoardException e) {
            throw e;
        } catch (Exception e) {
            log.error("주제 조회 중 오류 발생: ID={}", id, e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "주제 조회 중 오류가 발생했습니다", e);
        }
    }

    /**
     * 주제 검색
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<Topic>>> searchTopics(@RequestParam String keyword) {
        try {
            if (keyword == null || keyword.trim().isEmpty()) {
                throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "검색어를 입력해주세요");
            }

            User currentUser = getCurrentUser();
            List<Topic> topics = topicService.searchTopics(currentUser, keyword);

            log.info("주제 검색: User={}, Keyword={}, Count={}", currentUser.getUsername(), keyword, topics.size());
            return ResponseEntity.ok(ApiResponse.success(topics));
        } catch (TraceBoardException e) {
            throw e;
        } catch (Exception e) {
            log.error("주제 검색 중 오류 발생: Keyword={}", keyword, e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "주제 검색 중 오류가 발생했습니다", e);
        }
    }

    /**
     * 주제 수정
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Topic>> updateTopic(
            @PathVariable Long id,
            @Valid @RequestBody Map<String, String> request) {
        try {
            String name = request.get("name");
            String description = request.get("description");
            String color = request.get("color");
            String emoji = request.get("emoji");

            if (name != null && name.length() > 100) {
                throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "주제명은 100자 이하로 입력해주세요");
            }

            User currentUser = getCurrentUser();
            Optional<Topic> updatedTopic = topicService.updateTopic(id, currentUser, name, description, color, emoji);

            if (updatedTopic.isEmpty()) {
                throw new TraceBoardException(ErrorCode.NOT_FOUND, "주제를 찾을 수 없습니다");
            }

            log.info("주제 수정 성공: ID={}, User={}", id, currentUser.getUsername());
            return ResponseEntity.ok(ApiResponse.success(updatedTopic.get()));
        } catch (TraceBoardException e) {
            throw e;
        } catch (Exception e) {
            log.error("주제 수정 중 오류 발생: ID={}", id, e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "주제 수정 중 오류가 발생했습니다", e);
        }
    }

    /**
     * 주제 삭제
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteTopic(@PathVariable Long id) {
        try {
            User currentUser = getCurrentUser();
            boolean deleted = topicService.deleteTopic(id, currentUser);

            if (deleted) {
                log.info("주제 삭제 성공: ID={}, User={}", id, currentUser.getUsername());
                return ResponseEntity.ok(ApiResponse.success("주제가 삭제되었습니다"));
            } else {
                throw new TraceBoardException(ErrorCode.NOT_FOUND, "주제를 찾을 수 없습니다");
            }
        } catch (TraceBoardException e) {
            throw e;
        } catch (Exception e) {
            log.error("주제 삭제 중 오류 발생: ID={}", id, e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "주제 삭제 중 오류가 발생했습니다", e);
        }
    }
}