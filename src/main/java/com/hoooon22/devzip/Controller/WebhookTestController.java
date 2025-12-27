package com.hoooon22.devzip.Controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hoooon22.devzip.Model.common.ApiResponse;
import com.hoooon22.devzip.Service.WebhookService;
import com.hoooon22.devzip.dto.webhook.GitHubActionsResult;
import com.hoooon22.devzip.dto.webhook.WebhookEntryPayload;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 웹훅 테스트를 위한 컨트롤러
 * 이 엔드포인트는 개발 및 테스트 목적으로 사용됩니다.
 */
@Slf4j
@RestController
@RequestMapping("/api/webhook")
@RequiredArgsConstructor
public class WebhookTestController {

    private final WebhookService webhookService;

    /**
     * 웹훅 테스트 엔드포인트
     * 방명록 이벤트 웹훅을 수신하여 로그로 출력합니다.
     *
     * @param payload 웹훅 페이로드
     * @return 성공 응답
     */
    @PostMapping("/test")
    public ResponseEntity<ApiResponse<String>> receiveWebhook(
            @RequestBody WebhookEntryPayload payload) {

        log.info("=== 웹훅 수신 시작 ===");
        log.info("이벤트 타입: {}", payload.getEventType());
        log.info("타임스탬프: {}", payload.getTimestamp());
        log.info("사이트: {}", payload.getSite());

        if (payload.getEntry() != null) {
            WebhookEntryPayload.EntryData entry = payload.getEntry();
            log.info("방명록 ID: {}", entry.getId());

            if (payload.getEventType().equals("entry.created")) {
                log.info("작성자: {}", entry.getName());
                log.info("내용: {}", entry.getContent());
                log.info("색상: {}", entry.getColor());
                log.info("작성일: {}", entry.getCreateDate());
            }
        }

        log.info("=== 웹훅 수신 완료 ===");

        return ResponseEntity.ok(ApiResponse.success("웹훅 수신 성공"));
    }

    /**
     * GitHub Actions 워크플로우 결과 웹훅 수신
     * 받은 즉시 Conflux로 재전송합니다
     *
     * @param result GitHub Actions 실행 결과
     * @return 성공 응답
     */
    @PostMapping("/github-actions")
    public ResponseEntity<ApiResponse<String>> receiveGitHubActionsWebhook(
            @RequestBody GitHubActionsResult result) {

        log.info("=== GitHub Actions 웹훅 수신 시작 ===");
        log.info("워크플로우: {}", result.getWorkflowName());
        log.info("상태: {}", result.getStatus());
        log.info("저장소: {}", result.getRepository());
        log.info("브랜치: {}", result.getBranch());
        log.info("커밋 SHA: {}", result.getCommitSha());
        log.info("커밋 메시지: {}", result.getCommitMessage());
        log.info("작성자: {}", result.getAuthor());
        log.info("실행 번호: {}", result.getRunNumber());
        log.info("실행 URL: {}", result.getRunUrl());
        log.info("환경: {}", result.getEnvironment());
        log.info("타임스탬프: {}", result.getTimestamp());

        if ("failure".equalsIgnoreCase(result.getStatus())) {
            log.error("❌ 배포 실패!");
            log.error("실패한 Job: {}", result.getFailedJob());
            log.error("실패 이유: {}", result.getFailureReason());
        } else if ("success".equalsIgnoreCase(result.getStatus())) {
            log.info("✅ 배포 성공!");
        } else if ("cancelled".equalsIgnoreCase(result.getStatus())) {
            log.warn("⚠️ 배포 취소됨");
        }

        log.info("=== GitHub Actions 웹훅 수신 완료 ===");

        // Conflux로 재전송
        log.info("🔄 Conflux로 웹훅 재전송 중...");
        webhookService.sendToConflux(result);

        return ResponseEntity.ok(ApiResponse.success("GitHub Actions 웹훅 수신 성공 및 Conflux 전송 완료"));
    }
}
