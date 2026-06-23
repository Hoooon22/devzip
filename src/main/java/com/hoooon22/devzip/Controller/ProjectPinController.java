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
import com.hoooon22.devzip.Service.ProjectPinService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 프로젝트(카드) 고정(핀) API.
 * 조회(GET)는 모두에게 공개되며, 설정 변경(POST)은 관리자만 가능합니다.
 * (POST 권한은 WebSecurityConfig 에서 hasRole("ADMIN") 으로 보호됩니다.)
 */
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080", "https://192.168.75.224", "http://192.168.75.224", "http://192.168.75.224:8080", "https://devzip.cloud", "http://devzip.cloud", "https://www.devzip.cloud", "http://www.devzip.cloud"})
@Slf4j
@RestController
@RequestMapping("/api/pins")
@RequiredArgsConstructor
public class ProjectPinController {

    private final ProjectPinService projectPinService;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> getAllPins() {
        try {
            Map<String, Boolean> pins = projectPinService.getAllPins();
            return ResponseEntity.ok(ApiResponse.success(pins));
        } catch (Exception e) {
            log.error("고정 정보 조회 중 오류 발생", e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "고정 정보 조회 중 오류가 발생했습니다", e);
        }
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Boolean>> setPin(@RequestBody PinRequest request) {
        if (request == null || request.getProjectKey() == null || request.getProjectKey().trim().isEmpty()) {
            throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "projectKey를 입력해주세요");
        }
        String projectKey = request.getProjectKey().trim();
        if (projectKey.length() > 255) {
            throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "projectKey가 너무 깁니다");
        }
        try {
            boolean pinned = projectPinService.setPin(projectKey, request.isPinned());
            return ResponseEntity.ok(ApiResponse.success(pinned));
        } catch (Exception e) {
            log.error("고정 설정 중 오류 발생: key={}", projectKey, e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "고정 설정 중 오류가 발생했습니다", e);
        }
    }

    /**
     * 고정 설정 요청 본문.
     */
    static class PinRequest {
        private String projectKey;
        private boolean pinned;

        public String getProjectKey() {
            return projectKey;
        }

        public void setProjectKey(String projectKey) {
            this.projectKey = projectKey;
        }

        public boolean isPinned() {
            return pinned;
        }

        public void setPinned(boolean pinned) {
            this.pinned = pinned;
        }
    }
}
