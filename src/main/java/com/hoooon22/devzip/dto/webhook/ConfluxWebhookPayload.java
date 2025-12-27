package com.hoooon22.devzip.dto.webhook;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Conflux로 전송할 웹훅 페이로드
 * Conflux의 /api/webhook/custom 엔드포인트로 전송됩니다
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfluxWebhookPayload {

    /**
     * 알림 제목
     */
    private String title;

    /**
     * 알림 메시지
     */
    private String message;

    /**
     * 상태 (success, failure, warning, info)
     */
    private String status;

    /**
     * 추가 정보 (선택사항)
     */
    private String url;

    /**
     * 발신 소스
     */
    private String source;
}
