package com.hoooon22.devzip.Model.musicbox;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 뮤직 그리드의 각 셀을 나타내는 엔티티
 * x, y 좌표와 활성화 상태를 저장합니다.
 */
@Entity
@Table(name = "music_grid_cells",
       uniqueConstraints = @UniqueConstraint(columnNames = {"x_position", "y_position"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MusicGridCell {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * X 좌표 (0-15: 16비트 그리드)
     */
    @Column(name = "x_position", nullable = false)
    private Integer x;

    /**
     * Y 좌표 (0-7: 8개 음계)
     */
    @Column(name = "y_position", nullable = false)
    private Integer y;

    /**
     * 활성화 상태 (true: 노트 있음, false: 빈 셀)
     */
    @Column(nullable = false)
    private Boolean active;

    /**
     * 마지막 수정 시각
     */
    @Column(name = "last_modified")
    private LocalDateTime lastModified;

    /**
     * 마지막 수정한 사용자 (익명 지원)
     */
    @Column(name = "modified_by")
    private String modifiedBy;

    @PrePersist
    @PreUpdate
    public void updateTimestamp() {
        this.lastModified = LocalDateTime.now();
    }
}
