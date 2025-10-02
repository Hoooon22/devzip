package com.hoooon22.devzip.Controller;

import com.hoooon22.devzip.Exception.ErrorCode;
import com.hoooon22.devzip.Exception.TraceBoardException;
import com.hoooon22.devzip.Model.Thought;
import com.hoooon22.devzip.Model.User;
import com.hoooon22.devzip.Model.common.ApiResponse;
import com.hoooon22.devzip.Repository.UserRepository;
import com.hoooon22.devzip.Service.ThoughtService;
import com.hoooon22.devzip.Service.UserDetailsServiceImpl;
import com.hoooon22.devzip.dto.ThoughtMapResponse;
import com.hoooon22.devzip.dto.TopicMapResponse;
import com.hoooon22.devzip.dto.ThoughtHierarchyResponse;
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
@RequestMapping("/api/thoughts")
@RequiredArgsConstructor
public class ThoughtController {

    private final ThoughtService thoughtService;
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
     * 새로운 생각 생성 (AI 태그 자동 추출)
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Thought>> createThought(@Valid @RequestBody Map<String, String> request) {
        try {
            String content = request.get("content");
            String topicIdStr = request.get("topicId");

            if (content == null || content.trim().isEmpty()) {
                log.warn("생각 등록 실패: 내용이 비어있음");
                throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "내용을 입력해주세요");
            }

            if (content.length() > 5000) {
                log.warn("생각 등록 실패: 내용이 너무 김 - {} 글자", content.length());
                throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "내용은 5000자 이하로 입력해주세요");
            }

            User currentUser = getCurrentUser();
            Thought savedThought;

            // Topic이 지정된 경우
            if (topicIdStr != null && !topicIdStr.trim().isEmpty()) {
                savedThought = thoughtService.createThoughtWithTopic(currentUser, Long.parseLong(topicIdStr), content);
            } else {
                savedThought = thoughtService.createThought(currentUser, content);
            }

            log.info("생각 등록 성공: ID={}, User={}", savedThought.getId(), currentUser.getUsername());
            return ResponseEntity.ok(ApiResponse.success(savedThought));
        } catch (TraceBoardException e) {
            throw e;
        } catch (Exception e) {
            log.error("생각 등록 중 오류 발생", e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "생각 저장 중 오류가 발생했습니다", e);
        }
    }

    /**
     * 현재 사용자의 모든 생각 조회
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Thought>>> getAllThoughts() {
        try {
            User currentUser = getCurrentUser();
            List<Thought> thoughts = thoughtService.getAllThoughts(currentUser);

            log.info("생각 전체 조회: User={}, Count={}", currentUser.getUsername(), thoughts.size());
            return ResponseEntity.ok(ApiResponse.success(thoughts));
        } catch (TraceBoardException e) {
            throw e;
        } catch (Exception e) {
            log.error("생각 조회 중 오류 발생", e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "생각 조회 중 오류가 발생했습니다", e);
        }
    }

    /**
     * 특정 생각 조회
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Thought>> getThought(@PathVariable Long id) {
        try {
            User currentUser = getCurrentUser();
            Optional<Thought> thought = thoughtService.getThoughtById(id);

            if (thought.isEmpty()) {
                throw new TraceBoardException(ErrorCode.NOT_FOUND, "생각을 찾을 수 없습니다");
            }

            // 본인의 생각인지 확인
            if (!thought.get().getUser().getId().equals(currentUser.getId())) {
                throw new TraceBoardException(ErrorCode.INSUFFICIENT_PERMISSIONS, "접근 권한이 없습니다");
            }

            return ResponseEntity.ok(ApiResponse.success(thought.get()));
        } catch (TraceBoardException e) {
            throw e;
        } catch (Exception e) {
            log.error("생각 조회 중 오류 발생: ID={}", id, e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "생각 조회 중 오류가 발생했습니다", e);
        }
    }

    /**
     * 주제 중심 생각 맵 데이터 조회 (주제가 중심에 위치)
     */
    @GetMapping("/map/topic")
    public ResponseEntity<ApiResponse<TopicMapResponse>> getTopicCentricMap(@RequestParam Long topicId) {
        try {
            User currentUser = getCurrentUser();
            TopicMapResponse topicMap = thoughtService.getTopicCentricMap(currentUser, topicId);

            int totalThoughts = topicMap.getClusters() != null
                ? topicMap.getClusters().stream()
                    .mapToInt(cluster -> cluster.getThoughts() != null ? cluster.getThoughts().size() : 0)
                    .sum()
                : 0;
            log.info("주제 중심 맵 조회: User={}, TopicId={}, Clusters={}, Thoughts={}",
                     currentUser.getUsername(), topicId,
                     topicMap.getClusters() != null ? topicMap.getClusters().size() : 0,
                     totalThoughts);

            return ResponseEntity.ok(ApiResponse.success(topicMap));
        } catch (TraceBoardException e) {
            throw e;
        } catch (Exception e) {
            log.error("주제 맵 조회 중 오류 발생", e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "주제 맵 조회 중 오류가 발생했습니다", e);
        }
    }

    /**
     * 생각 맵 데이터 조회 (태그별 그룹화)
     * topicId 파라미터가 있으면 해당 주제의 생각만, 없으면 전체 생각 조회
     */
    @GetMapping("/map")
    public ResponseEntity<ApiResponse<List<ThoughtMapResponse>>> getThoughtMap(@RequestParam(required = false) Long topicId) {
        try {
            User currentUser = getCurrentUser();
            List<ThoughtMapResponse> thoughtMap;

            if (topicId != null) {
                // 특정 주제의 생각 맵 조회
                thoughtMap = thoughtService.getThoughtMapByTopicId(currentUser, topicId);
                log.info("주제별 생각 맵 조회: User={}, TopicId={}, Tags={}", currentUser.getUsername(), topicId, thoughtMap.size());
            } else {
                // 전체 생각 맵 조회
                thoughtMap = thoughtService.getThoughtMap(currentUser);
                log.info("전체 생각 맵 조회: User={}, Tags={}", currentUser.getUsername(), thoughtMap.size());
            }

            return ResponseEntity.ok(ApiResponse.success(thoughtMap));
        } catch (TraceBoardException e) {
            throw e;
        } catch (Exception e) {
            log.error("생각 맵 조회 중 오류 발생", e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "생각 맵 조회 중 오류가 발생했습니다", e);
        }
    }

    /**
     * 생각 수정
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Thought>> updateThought(
            @PathVariable Long id,
            @Valid @RequestBody Map<String, String> request) {
        try {
            String content = request.get("content");

            if (content == null || content.trim().isEmpty()) {
                throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "내용을 입력해주세요");
            }

            if (content.length() > 5000) {
                throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "내용은 5000자 이하로 입력해주세요");
            }

            User currentUser = getCurrentUser();

            // 본인의 생각인지 확인
            Optional<Thought> existingThought = thoughtService.getThoughtById(id);
            if (existingThought.isEmpty()) {
                throw new TraceBoardException(ErrorCode.NOT_FOUND, "생각을 찾을 수 없습니다");
            }

            if (!existingThought.get().getUser().getId().equals(currentUser.getId())) {
                throw new TraceBoardException(ErrorCode.INSUFFICIENT_PERMISSIONS, "수정 권한이 없습니다");
            }

            Optional<Thought> updatedThought = thoughtService.updateThought(id, content);

            if (updatedThought.isEmpty()) {
                throw new TraceBoardException(ErrorCode.NOT_FOUND, "생각을 찾을 수 없습니다");
            }

            log.info("생각 수정 성공: ID={}, User={}", id, currentUser.getUsername());
            return ResponseEntity.ok(ApiResponse.success(updatedThought.get()));
        } catch (TraceBoardException e) {
            throw e;
        } catch (Exception e) {
            log.error("생각 수정 중 오류 발생: ID={}", id, e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "생각 수정 중 오류가 발생했습니다", e);
        }
    }

    /**
     * 생각 삭제
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteThought(@PathVariable Long id) {
        try {
            User currentUser = getCurrentUser();

            // 본인의 생각인지 확인
            Optional<Thought> thought = thoughtService.getThoughtById(id);
            if (thought.isEmpty()) {
                throw new TraceBoardException(ErrorCode.NOT_FOUND, "생각을 찾을 수 없습니다");
            }

            if (!thought.get().getUser().getId().equals(currentUser.getId())) {
                throw new TraceBoardException(ErrorCode.INSUFFICIENT_PERMISSIONS, "삭제 권한이 없습니다");
            }

            boolean deleted = thoughtService.deleteThought(id);

            if (deleted) {
                log.info("생각 삭제 성공: ID={}, User={}", id, currentUser.getUsername());
                return ResponseEntity.ok(ApiResponse.success("생각이 삭제되었습니다"));
            } else {
                throw new TraceBoardException(ErrorCode.NOT_FOUND, "생각을 찾을 수 없습니다");
            }
        } catch (TraceBoardException e) {
            throw e;
        } catch (Exception e) {
            log.error("생각 삭제 중 오류 발생: ID={}", id, e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "생각 삭제 중 오류가 발생했습니다", e);
        }
    }

    /**
     * 태그로 생각 검색
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<Thought>>> searchByTag(@RequestParam String tag) {
        try {
            if (tag == null || tag.trim().isEmpty()) {
                throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "검색할 태그를 입력해주세요");
            }

            User currentUser = getCurrentUser();
            List<Thought> thoughts = thoughtService.searchByTag(currentUser, tag);

            log.info("태그 검색: User={}, Tag={}, Count={}", currentUser.getUsername(), tag, thoughts.size());
            return ResponseEntity.ok(ApiResponse.success(thoughts));
        } catch (TraceBoardException e) {
            throw e;
        } catch (Exception e) {
            log.error("태그 검색 중 오류 발생: Tag={}", tag, e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "태그 검색 중 오류가 발생했습니다", e);
        }
    }

    /**
     * 주제 중심 계층 구조 맵 데이터 조회 (유사도 기반)
     */
    @GetMapping("/map/hierarchy")
    public ResponseEntity<ApiResponse<ThoughtHierarchyResponse>> getTopicHierarchyMap(@RequestParam Long topicId) {
        try {
            User currentUser = getCurrentUser();
            ThoughtHierarchyResponse hierarchyMap = thoughtService.getTopicHierarchyMap(currentUser, topicId);

            log.info("주제 계층 구조 맵 조회: User={}, TopicId={}, Nodes={}",
                     currentUser.getUsername(), topicId,
                     hierarchyMap.getNodes() != null ? hierarchyMap.getNodes().size() : 0);

            return ResponseEntity.ok(ApiResponse.success(hierarchyMap));
        } catch (TraceBoardException e) {
            throw e;
        } catch (Exception e) {
            log.error("계층 구조 맵 조회 중 오류 발생", e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "계층 구조 맵 조회 중 오류가 발생했습니다", e);
        }
    }
}