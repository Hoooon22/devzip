package com.hoooon22.devzip.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.hoooon22.devzip.Model.Entry;

/**
 * 엔트리 레포지토리입니다.
 */
@Repository
public interface EntryRepository extends JpaRepository<Entry, Long> {
    // 추가적인 메서드 정의 가능
}
