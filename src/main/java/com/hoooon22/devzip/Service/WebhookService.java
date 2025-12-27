package com.hoooon22.devzip.Service;

import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.hoooon22.devzip.Model.Entry;
import com.hoooon22.devzip.dto.webhook.ConfluxWebhookPayload;
import com.hoooon22.devzip.dto.webhook.GitHubActionsResult;
import com.hoooon22.devzip.dto.webhook.WebhookEntryPayload;

import lombok.extern.slf4j.Slf4j;

/**
 * 웹훅 전송을 처리하는 서비스
 */
@Slf4j
@Service
public class WebhookService {

    @Value("${webhook.entry.url:}")
    private String webhookUrl;

    @Value("${webhook.entry.enabled:false}")
    private boolean webhookEnabled;

    @Value("${webhook.conflux.url:}")
    private String confluxWebhookUrl;

    @Value("${webhook.conflux.enabled:false}")
    private boolean confluxWebhookEnabled;

    private final RestTemplate restTemplate;

    public WebhookService() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * 방명록 등록 이벤트 웹훅 전송 (비동기)
     * @param entry 등록된 방명록
     */
    @Async
    public void sendEntryCreatedWebhook(Entry entry) {
        if (!webhookEnabled) {
            log.debug("웹훅이 비활성화되어 있습니다");
            return;
        }

        if (webhookUrl == null || webhookUrl.trim().isEmpty()) {
            log.warn("웹훅 URL이 설정되지 않았습니다");
            return;
        }

        try {
            // 페이로드 생성
            WebhookEntryPayload payload = WebhookEntryPayload.builder()
                .eventType("entry.created")
                .timestamp(LocalDateTime.now())
                .site("devzip.cloud")
                .entry(WebhookEntryPayload.EntryData.builder()
                    .id(entry.getId())
                    .name(entry.getName())
                    .content(entry.getContent())
                    .color(entry.getColor())
                    .createDate(entry.getCreateDate())
                    .build())
                .build();

            // HTTP 헤더 설정
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // HTTP 요청 생성
            HttpEntity<WebhookEntryPayload> request = new HttpEntity<>(payload, headers);

            // 웹훅 전송
            log.info("웹훅 전송 시작: URL={}, EntryId={}", webhookUrl, entry.getId());
            ResponseEntity<String> response = restTemplate.postForEntity(
                webhookUrl,
                request,
                String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("웹훅 전송 성공: EntryId={}, Status={}",
                    entry.getId(), response.getStatusCode());
            } else {
                log.warn("웹훅 전송 실패: EntryId={}, Status={}, Body={}",
                    entry.getId(), response.getStatusCode(), response.getBody());
            }

        } catch (Exception e) {
            log.error("웹훅 전송 중 오류 발생: EntryId={}, URL={}",
                entry.getId(), webhookUrl, e);
        }
    }

    /**
     * 방명록 삭제 이벤트 웹훅 전송 (비동기)
     * @param entryId 삭제된 방명록 ID
     */
    @Async
    public void sendEntryDeletedWebhook(Long entryId) {
        if (!webhookEnabled) {
            log.debug("웹훅이 비활성화되어 있습니다");
            return;
        }

        if (webhookUrl == null || webhookUrl.trim().isEmpty()) {
            log.warn("웹훅 URL이 설정되지 않았습니다");
            return;
        }

        try {
            // 페이로드 생성
            WebhookEntryPayload payload = WebhookEntryPayload.builder()
                .eventType("entry.deleted")
                .timestamp(LocalDateTime.now())
                .site("devzip.cloud")
                .entry(WebhookEntryPayload.EntryData.builder()
                    .id(entryId)
                    .build())
                .build();

            // HTTP 헤더 설정
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // HTTP 요청 생성
            HttpEntity<WebhookEntryPayload> request = new HttpEntity<>(payload, headers);

            // 웹훅 전송
            log.info("웹훅 전송 시작: URL={}, EntryId={}, EventType=deleted", webhookUrl, entryId);
            ResponseEntity<String> response = restTemplate.postForEntity(
                webhookUrl,
                request,
                String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("웹훅 전송 성공: EntryId={}, Status={}",
                    entryId, response.getStatusCode());
            } else {
                log.warn("웹훅 전송 실패: EntryId={}, Status={}, Body={}",
                    entryId, response.getStatusCode(), response.getBody());
            }

        } catch (Exception e) {
            log.error("웹훅 전송 중 오류 발생: EntryId={}, URL={}",
                entryId, webhookUrl, e);
        }
    }

    /**
     * GitHub Actions 결과를 Conflux로 전송 (비동기)
     * @param result GitHub Actions 실행 결과
     */
    @Async
    public void sendToConflux(GitHubActionsResult result) {
        if (!confluxWebhookEnabled) {
            log.debug("Conflux 웹훅이 비활성화되어 있습니다");
            return;
        }

        if (confluxWebhookUrl == null || confluxWebhookUrl.trim().isEmpty()) {
            log.warn("Conflux 웹훅 URL이 설정되지 않았습니다");
            return;
        }

        try {
            // Conflux 페이로드 생성
            String title = String.format("🚀 %s - %s",
                result.getWorkflowName(),
                "success".equalsIgnoreCase(result.getStatus()) ? "배포 성공" : "배포 실패");

            String message = String.format(
                "저장소: %s\n브랜치: %s\n커밋: %s\n작성자: %s\n메시지: %s",
                result.getRepository(),
                result.getBranch(),
                result.getCommitSha(),
                result.getAuthor(),
                result.getCommitMessage()
            );

            if ("failure".equalsIgnoreCase(result.getStatus())) {
                message += String.format("\n\n❌ 실패 Job: %s\n실패 이유: %s",
                    result.getFailedJob(),
                    result.getFailureReason());
            }

            ConfluxWebhookPayload payload = ConfluxWebhookPayload.builder()
                .title(title)
                .message(message)
                .status(result.getStatus())
                .url(result.getRunUrl())
                .source("DevZip CI/CD")
                .build();

            // HTTP 헤더 설정
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // HTTP 요청 생성
            HttpEntity<ConfluxWebhookPayload> request = new HttpEntity<>(payload, headers);

            // Conflux 웹훅 전송
            log.info("Conflux 웹훅 전송 시작: URL={}, Status={}", confluxWebhookUrl, result.getStatus());
            ResponseEntity<String> response = restTemplate.postForEntity(
                confluxWebhookUrl,
                request,
                String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ Conflux 웹훅 전송 성공: Status={}, Response={}",
                    response.getStatusCode(), response.getBody());
            } else {
                log.warn("⚠️ Conflux 웹훅 전송 실패: Status={}, Body={}",
                    response.getStatusCode(), response.getBody());
            }

        } catch (Exception e) {
            log.error("❌ Conflux 웹훅 전송 중 오류 발생: URL={}", confluxWebhookUrl, e);
        }
    }
}
