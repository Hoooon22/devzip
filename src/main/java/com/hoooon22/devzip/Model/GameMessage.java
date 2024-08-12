package com.hoooon22.devzip.Model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

@Builder
@Getter
@Setter
@RequiredArgsConstructor
@AllArgsConstructor
public class GameMessage {
    private MessageType type;
    private String roomId;
    private String sender;
    private String content;
    private String action;  // 예: 이동, 공격, 아이템 사용 등

    public enum MessageType {
        ENTER, TALK, MOVE, ATTACK, ITEM_USE
    }
}