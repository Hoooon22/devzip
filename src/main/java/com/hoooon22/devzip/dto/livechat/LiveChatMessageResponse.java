package com.hoooon22.devzip.dto.livechat;

import com.hoooon22.devzip.model.livechat.LiveChatMessage;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class LiveChatMessageResponse {
    private Long id;
    private String senderName;
    private String message;
    private LocalDateTime sentAt;

    public LiveChatMessageResponse(LiveChatMessage entity) {
        this.id = entity.getId();
        this.senderName = entity.getSenderName();
        this.message = entity.getMessage();
        this.sentAt = entity.getCreatedAt();
    }
}
