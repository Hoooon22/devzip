package com.hoooon22.devzip.dto.musicbox;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * WebSocket을 통해 전송되는 그리드 셀 메시지
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GridCellMessage {

    /**
     * X 좌표 (0-15)
     */
    private Integer x;

    /**
     * Y 좌표 (0-7)
     */
    private Integer y;

    /**
     * 활성화 상태
     */
    private Boolean active;

    /**
     * 수정한 사용자 (익명 지원)
     */
    private String username;

    /**
     * 메시지 타입 (TOGGLE, CLEAR, SYNC 등)
     */
    private MessageType type;

    public enum MessageType {
        TOGGLE,  // 셀 토글
        CLEAR,   // 전체 클리어
        SYNC     // 동기화
    }
}
