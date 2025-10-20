package com.hoooon22.devzip.Service;

import com.hoooon22.devzip.Model.musicbox.MusicGridCell;
import com.hoooon22.devzip.Repository.MusicGridCellRepository;
import com.hoooon22.devzip.dto.musicbox.GridCellMessage;
import com.hoooon22.devzip.dto.musicbox.GridStateResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 뮤직박스 비즈니스 로직 서비스
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MusicBoxService {

    private final MusicGridCellRepository repository;

    // 그리드 크기 상수
    private static final int GRID_WIDTH = 16;
    private static final int GRID_HEIGHT = 8;

    /**
     * 셀 상태 토글 (활성화/비활성화)
     */
    @Transactional
    public GridCellMessage toggleCell(GridCellMessage message) {
        log.info("Toggling cell at ({}, {}) by user: {}",
                 message.getX(), message.getY(), message.getUsername());

        // 좌표 유효성 검증
        validateCoordinates(message.getX(), message.getY());

        // 기존 셀 찾기
        Optional<MusicGridCell> existingCell = repository.findByXAndY(message.getX(), message.getY());

        boolean newActiveState;

        if (existingCell.isPresent()) {
            // 기존 셀이 있으면 토글
            MusicGridCell cell = existingCell.get();
            newActiveState = !cell.getActive();

            if (newActiveState) {
                // 활성화: DB에 저장
                cell.setActive(true);
                cell.setModifiedBy(message.getUsername());
                repository.save(cell);
                log.info("Cell activated and saved: ({}, {})", message.getX(), message.getY());
            } else {
                // 비활성화: DB에서 삭제 (불필요한 데이터 방지)
                repository.delete(cell);
                log.info("Cell deactivated and deleted: ({}, {})", message.getX(), message.getY());
            }
        } else {
            // 새 셀: 활성화 상태로 저장
            MusicGridCell newCell = MusicGridCell.builder()
                    .x(message.getX())
                    .y(message.getY())
                    .active(true)
                    .modifiedBy(message.getUsername())
                    .build();
            repository.save(newCell);
            newActiveState = true;
            log.info("New cell created and saved: ({}, {})", message.getX(), message.getY());
        }

        // 응답 메시지 구성
        return GridCellMessage.builder()
                .x(message.getX())
                .y(message.getY())
                .active(newActiveState)
                .username(message.getUsername())
                .type(GridCellMessage.MessageType.TOGGLE)
                .build();
    }

    /**
     * 전체 그리드 상태 조회
     */
    @Transactional(readOnly = true)
    public GridStateResponse getGridState() {
        log.info("Fetching current grid state");

        List<MusicGridCell> activeCells = repository.findByActiveTrue();

        List<GridStateResponse.CellInfo> cellInfos = activeCells.stream()
                .map(cell -> GridStateResponse.CellInfo.builder()
                        .x(cell.getX())
                        .y(cell.getY())
                        .active(cell.getActive())
                        .build())
                .collect(Collectors.toList());

        return GridStateResponse.builder()
                .activeCells(cellInfos)
                .gridWidth(GRID_WIDTH)
                .gridHeight(GRID_HEIGHT)
                .build();
    }

    /**
     * 전체 그리드 클리어
     */
    @Transactional
    public void clearGrid() {
        log.info("Clearing all grid cells");
        repository.deleteAll();
    }

    /**
     * 좌표 유효성 검증
     */
    private void validateCoordinates(Integer x, Integer y) {
        if (x == null || y == null) {
            throw new IllegalArgumentException("Coordinates cannot be null");
        }
        if (x < 0 || x >= GRID_WIDTH) {
            throw new IllegalArgumentException(
                    String.format("X coordinate must be between 0 and %d", GRID_WIDTH - 1));
        }
        if (y < 0 || y >= GRID_HEIGHT) {
            throw new IllegalArgumentException(
                    String.format("Y coordinate must be between 0 and %d", GRID_HEIGHT - 1));
        }
    }

    /**
     * 특정 X 좌표의 활성화된 셀들 조회 (재생 로직용)
     */
    @Transactional(readOnly = true)
    public List<Integer> getActiveNotesAtPosition(Integer x) {
        return repository.findByX(x).stream()
                .filter(MusicGridCell::getActive)
                .map(MusicGridCell::getY)
                .collect(Collectors.toList());
    }
}
