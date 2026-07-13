package com.hoooon22.devzip.Controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hoooon22.devzip.Exception.ErrorCode;
import com.hoooon22.devzip.Exception.TraceBoardException;
import com.hoooon22.devzip.Model.common.ApiResponse;
import com.hoooon22.devzip.Service.ProjectViewService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 프로젝트(카드) 조회수 API.
 * 인증이 필요 없으며 비회원도 조회수를 올릴 수 있습니다.
 */
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080", "https://192.168.75.224", "http://192.168.75.224", "http://192.168.75.224:8080", "https://devzip.site", "http://devzip.site", "https://www.devzip.site", "http://www.devzip.site"})
@Slf4j
@RestController
@RequestMapping("/api/views")
@RequiredArgsConstructor
public class ProjectViewController {

    private final ProjectViewService projectViewService;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Long>>> getAllViewCounts() {
        try {
            Map<String, Long> counts = projectViewService.getAllViewCounts();
            return ResponseEntity.ok(ApiResponse.success(counts));
        } catch (Exception e) {
            log.error("조회수 전체 조회 중 오류 발생", e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "조회수 조회 중 오류가 발생했습니다", e);
        }
    }

    @PostMapping("/increment")
    public ResponseEntity<ApiResponse<Long>> increment(@RequestBody ViewIncrementRequest request) {
        if (request == null || request.getProjectKey() == null || request.getProjectKey().trim().isEmpty()) {
            throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "projectKey를 입력해주세요");
        }
        String projectKey = request.getProjectKey().trim();
        if (projectKey.length() > 255) {
            throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "projectKey가 너무 깁니다");
        }
        try {
            long count = projectViewService.incrementAndGet(projectKey);
            return ResponseEntity.ok(ApiResponse.success(count));
        } catch (Exception e) {
            log.error("조회수 증가 중 오류 발생: key={}", projectKey, e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "조회수 증가 중 오류가 발생했습니다", e);
        }
    }

    /**
     * 조회수 증가 요청 본문.
     */
    static class ViewIncrementRequest {
        private String projectKey;

        public String getProjectKey() {
            return projectKey;
        }

        public void setProjectKey(String projectKey) {
            this.projectKey = projectKey;
        }
    }
}
