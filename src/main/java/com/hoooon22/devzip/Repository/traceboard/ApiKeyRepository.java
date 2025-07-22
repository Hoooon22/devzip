package com.hoooon22.devzip.Repository.traceboard;

import com.hoooon22.devzip.Model.traceboard.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {
    
    Optional<ApiKey> findByKeyValue(String keyValue);
    
    Optional<ApiKey> findByKeyValueAndIsActiveTrue(String keyValue);
    
    boolean existsByKeyValue(String keyValue);
}