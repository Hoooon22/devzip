package com.hoooon22.devzip.dto.webhook;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 방명록 등록 시 웹훅으로 전송될 페이로드
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookEntryPayload {

    /**
     * 이벤트 타입 (예: "entry.created")
     */
    private String eventType;

    /**
     * 이벤트 발생 시간
     */
    private LocalDateTime timestamp;

    /**
     * 방명록 정보
     */
    private EntryData entry;

    /**
     * 사이트 정보
     */
    private String site;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EntryData {
        private Long id;
        private String name;
        private String content;
        private String color;
        private LocalDateTime createDate;
    }
}
