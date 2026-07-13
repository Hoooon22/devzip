package com.hoooon22.devzip.Controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hoooon22.devzip.Exception.ErrorCode;
import com.hoooon22.devzip.Exception.TraceBoardException;
import com.hoooon22.devzip.Model.common.ApiResponse;
import com.hoooon22.devzip.Service.PresenceService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 실시간 접속자(presence) API.
 * 인증이 필요 없으며, 클라이언트가 30초 주기로 하트비트를 보내면
 * 현재 접속 스냅샷(전체 인원 + 페이지별 인원)을 돌려줍니다.
 */
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080", "https://192.168.75.224", "http://192.168.75.224", "http://192.168.75.224:8080", "https://devzip.site", "http://devzip.site", "https://www.devzip.site", "http://www.devzip.site"})
@Slf4j
@RestController
@RequestMapping("/api/presence")
@RequiredArgsConstructor
public class PresenceController {

    private final PresenceService presenceService;

    @PostMapping("/heartbeat")
    public ResponseEntity<ApiResponse<PresenceService.Snapshot>> heartbeat(@RequestBody HeartbeatRequest request) {
        if (request == null || isBlank(request.getClientId()) || isBlank(request.getPage())) {
            throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "clientId와 page를 입력해주세요");
        }
        String clientId = request.getClientId().trim();
        String page = request.getPage().trim();
        if (clientId.length() > 64 || page.length() > 128 || !page.startsWith("/")) {
            throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "잘못된 presence 요청입니다");
        }
        try {
            return ResponseEntity.ok(ApiResponse.success(presenceService.heartbeat(clientId, page)));
        } catch (Exception e) {
            log.error("presence 하트비트 처리 중 오류 발생: page={}", page, e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "접속 현황 처리 중 오류가 발생했습니다", e);
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    /**
     * 하트비트 요청 본문.
     */
    static class HeartbeatRequest {
        private String clientId;
        private String page;

        public String getClientId() {
            return clientId;
        }

        public void setClientId(String clientId) {
            this.clientId = clientId;
        }

        public String getPage() {
            return page;
        }

        public void setPage(String page) {
            this.page = page;
        }
    }
}
