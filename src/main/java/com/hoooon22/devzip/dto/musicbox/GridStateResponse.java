package com.hoooon22.devzip.dto.musicbox;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 전체 그리드 상태를 반환하는 응답 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GridStateResponse {

    /**
     * 활성화된 셀들의 리스트
     */
    private List<CellInfo> activeCells;

    /**
     * 그리드 크기 정보
     */
    private Integer gridWidth;
    private Integer gridHeight;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CellInfo {
        private Integer x;
        private Integer y;
        private Boolean active;
    }
}
