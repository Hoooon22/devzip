package com.hoooon22.devzip.Repository;

import com.hoooon22.devzip.Model.musicbox.MusicGridCell;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 뮤직 그리드 셀 데이터 접근 레이어
 */
@Repository
public interface MusicGridCellRepository extends JpaRepository<MusicGridCell, Long> {

    /**
     * 특정 좌표의 셀 찾기
     */
    Optional<MusicGridCell> findByXAndY(Integer x, Integer y);

    /**
     * 활성화된 모든 셀 찾기
     */
    List<MusicGridCell> findByActiveTrue();

    /**
     * 특정 X 좌표의 모든 셀 찾기 (재생 시 필요)
     */
    List<MusicGridCell> findByX(Integer x);

    /**
     * 모든 셀 삭제
     */
    void deleteAll();
}
