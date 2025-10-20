package com.hoooon22.devzip.Controller.musicbox;

import com.hoooon22.devzip.Service.MusicBoxService;
import com.hoooon22.devzip.dto.musicbox.GridStateResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 뮤직박스 REST API 컨트롤러
 *
 * WebSocket이 아닌 HTTP 요청으로 그리드 상태를 조회하거나
 * 초기화할 때 사용합니다.
 */
@RestController
@RequestMapping("/api/musicbox")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class MusicBoxController {

    private final MusicBoxService musicBoxService;

    /**
     * 현재 그리드 상태 조회
     *
     * 새로운 사용자가 접속했을 때, 초기 그리드 상태를 받아오는 용도
     */
    @GetMapping("/grid")
    public ResponseEntity<GridStateResponse> getGridState() {
        log.info("GET /api/musicbox/grid - Fetching current grid state");

        GridStateResponse gridState = musicBoxService.getGridState();

        return ResponseEntity.ok(gridState);
    }

    /**
     * 특정 X 좌표의 활성화된 노트 조회 (재생 로직용)
     */
    @GetMapping("/notes/{x}")
    public ResponseEntity<List<Integer>> getActiveNotesAt(@PathVariable Integer x) {
        log.info("GET /api/musicbox/notes/{} - Fetching active notes", x);

        List<Integer> activeNotes = musicBoxService.getActiveNotesAtPosition(x);

        return ResponseEntity.ok(activeNotes);
    }

    /**
     * 그리드 전체 클리어 (HTTP 방식)
     */
    @DeleteMapping("/grid")
    public ResponseEntity<Void> clearGrid() {
        log.info("DELETE /api/musicbox/grid - Clearing all grid");

        musicBoxService.clearGrid();

        return ResponseEntity.ok().build();
    }
}
