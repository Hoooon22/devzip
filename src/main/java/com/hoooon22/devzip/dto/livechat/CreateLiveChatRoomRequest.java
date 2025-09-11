package com.hoooon22.devzip.dto.livechat;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateLiveChatRoomRequest {
    private String name;
    // In a real scenario, creatorName would be derived from the authenticated user's token
    private String creatorName;
}
