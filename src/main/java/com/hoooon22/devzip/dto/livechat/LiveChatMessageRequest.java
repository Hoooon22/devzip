package com.hoooon22.devzip.dto.livechat;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LiveChatMessageRequest {
    private Long roomId;
    private String senderName;
    private String message;
}
