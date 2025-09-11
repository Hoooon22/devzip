package com.hoooon22.devzip.dto.livechat;

import com.hoooon22.devzip.Model.livechat.LiveChatRoom;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class LiveChatRoomResponse {
    private Long id;
    private String name;
    private String creatorName;
    private LocalDateTime createdAt;

    public LiveChatRoomResponse(LiveChatRoom entity) {
        this.id = entity.getId();
        this.name = entity.getName();
        this.creatorName = entity.getCreatorName();
        this.createdAt = entity.getCreatedAt();
    }
}
