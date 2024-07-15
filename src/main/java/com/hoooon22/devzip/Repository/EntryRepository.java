package com.hoooon22.devzip.Repository;

import com.hoooon22.devzip.Entity.Entry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EntryRepository extends JpaRepository<Entry, Long> {
    // 추가적인 메소드가 필요하다면 여기에 선언할 수 있습니다.
}
