package com.hoooon22.devzip.Model.livechat;

import com.hoooon22.devzip.Model.traceboard.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "live_chat_room")
public class LiveChatRoom extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "live_chat_room_id")
    private Long id;

    @Column(nullable = false)
    private String name;

    // TODO: 추후 Member 엔티티 생성 시 @ManyToOne 관계로 변경
    @Column(nullable = false)
    private String creatorName;

    @OneToMany(mappedBy = "liveChatRoom", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<LiveChatMessage> messages = new ArrayList<>();
}
