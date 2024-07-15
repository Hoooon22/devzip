package com.hoooon22.devzip.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.hoooon22.devzip.model.Entry;

@Repository
public interface EntryRepository extends JpaRepository<Entry, Long> {
    // 추가적인 메소드가 필요하다면 여기에 선언할 수 있습니다.
}