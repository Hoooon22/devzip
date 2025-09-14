package com.hoooon22.devzip.dto.livechat;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LiveChatMessageDTO {
    private Long id;
    private Long roomId;
    private String senderName;
    private String message;
    private LocalDateTime createdAt;
}
