package com.hoooon22.devzip.Service.traceboard;

import com.hoooon22.devzip.Model.traceboard.ApiKey;
import com.hoooon22.devzip.Repository.traceboard.ApiKeyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ApiKeyService {

    private final ApiKeyRepository apiKeyRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public ApiKey generateApiKey(String keyName, String description) {
        String keyValue = generateSecureApiKey();
        
        ApiKey apiKey = ApiKey.builder()
                .keyValue(keyValue)
                .keyName(keyName)
                .description(description)
                .isActive(true)
                .requestsPerHour(1000)
                .requestsPerDay(10000)
                .build();

        return apiKeyRepository.save(apiKey);
    }

    public boolean validateApiKey(String keyValue) {
        Optional<ApiKey> apiKey = apiKeyRepository.findByKeyValueAndIsActiveTrue(keyValue);
        
        if (apiKey.isEmpty()) {
            log.warn("Invalid API key attempted: {}", keyValue.substring(0, Math.min(8, keyValue.length())) + "...");
            return false;
        }

        ApiKey key = apiKey.get();
        
        // 만료 시간 체크
        if (key.getExpiresAt() != null && key.getExpiresAt().isBefore(LocalDateTime.now())) {
            log.warn("Expired API key used: {}", key.getKeyName());
            return false;
        }

        // 사용량 체크 (간단한 버전, 실제로는 Redis 등을 사용해야 함)
        if (key.getCurrentHourlyRequests() >= key.getRequestsPerHour() || 
            key.getCurrentDailyRequests() >= key.getRequestsPerDay()) {
            log.warn("API key rate limit exceeded: {}", key.getKeyName());
            return false;
        }

        // 마지막 사용 시간 업데이트
        updateLastUsed(key);
        
        return true;
    }

    @Transactional
    public void updateLastUsed(ApiKey apiKey) {
        apiKey.setLastUsedAt(LocalDateTime.now());
        // 실제로는 사용량 카운터도 증가시켜야 함
        apiKeyRepository.save(apiKey);
    }

    private String generateSecureApiKey() {
        // 32바이트 랜덤 데이터 생성 후 Base64로 인코딩
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        return "tb_" + Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }
}