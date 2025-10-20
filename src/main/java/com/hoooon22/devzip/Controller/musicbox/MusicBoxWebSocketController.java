package com.hoooon22.devzip.Controller.musicbox;

import com.hoooon22.devzip.Service.MusicBoxService;
import com.hoooon22.devzip.dto.musicbox.GridCellMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

/**
 * 뮤직박스 WebSocket 메시지 핸들러
 *
 * 클라이언트가 /app/musicbox/toggle 로 메시지를 보내면,
 * 이 컨트롤러가 처리하고 /topic/musicbox/updates 를 구독 중인
 * 모든 클라이언트에게 브로드캐스트합니다.
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class MusicBoxWebSocketController {

    private final MusicBoxService musicBoxService;

    /**
     * 셀 토글 메시지 핸들러
     *
     * @MessageMapping: 클라이언트가 /app/musicbox/toggle 로 SEND
     * @SendTo: 처리 결과를 /topic/musicbox/updates 구독자 전원에게 브로드캐스트
     */
    @MessageMapping("/musicbox/toggle")
    @SendTo("/topic/musicbox/updates")
    public GridCellMessage handleToggle(GridCellMessage message) {
        log.info("Received toggle message: x={}, y={}, user={}",
                 message.getX(), message.getY(), message.getUsername());

        try {
            // 서비스 레이어에서 비즈니스 로직 처리 + DB 저장
            GridCellMessage response = musicBoxService.toggleCell(message);

            log.info("Broadcasting toggle result: x={}, y={}, active={}",
                     response.getX(), response.getY(), response.getActive());

            return response;

        } catch (IllegalArgumentException e) {
            log.error("Invalid coordinates received: {}", e.getMessage());

            // 에러 메시지 반환 (클라이언트가 처리할 수 있도록)
            return GridCellMessage.builder()
                    .x(message.getX())
                    .y(message.getY())
                    .active(false)
                    .username("SYSTEM")
                    .type(GridCellMessage.MessageType.TOGGLE)
                    .build();
        }
    }

    /**
     * 그리드 전체 클리어 메시지 핸들러
     */
    @MessageMapping("/musicbox/clear")
    @SendTo("/topic/musicbox/updates")
    public GridCellMessage handleClear(GridCellMessage message) {
        log.info("Received clear request from user: {}", message.getUsername());

        musicBoxService.clearGrid();

        return GridCellMessage.builder()
                .x(0)
                .y(0)
                .active(false)
                .username(message.getUsername())
                .type(GridCellMessage.MessageType.CLEAR)
                .build();
    }
}
