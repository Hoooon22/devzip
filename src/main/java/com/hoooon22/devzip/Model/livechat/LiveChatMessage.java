package com.hoooon22.devzip.model.livechat;

import com.hoooon22.devzip.model.traceboard.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "live_chat_message")
public class LiveChatMessage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "live_chat_message_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "live_chat_room_id", nullable = false)
    private LiveChatRoom liveChatRoom;

    // TODO: 추후 Member 엔티티 생성 시 @ManyToOne 관계로 변경
    @Column(nullable = false)
    private String senderName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;
}
