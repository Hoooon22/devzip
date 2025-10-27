package com.hoooon22.devzip.Service.traceboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * GeoIP 서비스
 * IP 주소로부터 국가 정보를 조회하는 서비스
 *
 * 사용 API: ip-api.com (무료, 45 req/min 제한)
 * - 프로덕션 환경에서는 MaxMind GeoIP2 같은 로컬 DB 사용 권장
 */
@Service
@Slf4j
public class GeoIPService {

    private final RestTemplate restTemplate;
    private final Map<String, GeoLocation> cache = new ConcurrentHashMap<>();

    private static final String GEO_API_URL = "http://ip-api.com/json/";
    private static final String FIELDS = "?fields=status,message,country,countryCode";

    public GeoIPService() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * IP 주소로부터 국가 정보 조회
     *
     * @param ipAddress IP 주소
     * @return GeoLocation (국가 코드 및 이름)
     */
    public GeoLocation getCountryInfo(String ipAddress) {
        if (ipAddress == null || ipAddress.isEmpty()) {
            return getDefaultLocation();
        }

        // 로컬 IP 처리
        if (isPrivateOrLocalIP(ipAddress)) {
            log.debug("로컬 IP 주소: {}", ipAddress);
            return getDefaultLocation();
        }

        // 캐시 확인
        if (cache.containsKey(ipAddress)) {
            return cache.get(ipAddress);
        }

        try {
            String url = GEO_API_URL + ipAddress + FIELDS;
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            if (response != null && "success".equals(response.get("status"))) {
                String countryCode = (String) response.get("countryCode");
                String countryName = (String) response.get("country");

                GeoLocation location = new GeoLocation(countryCode, countryName);

                // 캐시에 저장 (메모리 누수 방지를 위해 최대 10,000개까지만)
                if (cache.size() < 10000) {
                    cache.put(ipAddress, location);
                }

                return location;
            } else {
                log.warn("GeoIP 조회 실패: {}, 응답: {}", ipAddress, response);
                return getDefaultLocation();
            }

        } catch (Exception e) {
            log.error("GeoIP API 호출 중 오류 발생: {}", ipAddress, e);
            return getDefaultLocation();
        }
    }

    /**
     * 사설 IP 또는 로컬 IP 여부 확인
     */
    private boolean isPrivateOrLocalIP(String ip) {
        return ip.startsWith("127.") ||
               ip.startsWith("192.168.") ||
               ip.startsWith("10.") ||
               ip.startsWith("172.16.") ||
               ip.startsWith("172.17.") ||
               ip.startsWith("172.18.") ||
               ip.startsWith("172.19.") ||
               ip.startsWith("172.20.") ||
               ip.startsWith("172.21.") ||
               ip.startsWith("172.22.") ||
               ip.startsWith("172.23.") ||
               ip.startsWith("172.24.") ||
               ip.startsWith("172.25.") ||
               ip.startsWith("172.26.") ||
               ip.startsWith("172.27.") ||
               ip.startsWith("172.28.") ||
               ip.startsWith("172.29.") ||
               ip.startsWith("172.30.") ||
               ip.startsWith("172.31.") ||
               ip.equals("0:0:0:0:0:0:0:1") ||
               ip.equals("::1");
    }

    /**
     * 기본 위치 정보 반환 (조회 실패 시)
     */
    private GeoLocation getDefaultLocation() {
        return new GeoLocation("XX", "Unknown");
    }

    /**
     * 캐시 크기 조회 (모니터링용)
     */
    public int getCacheSize() {
        return cache.size();
    }

    /**
     * 캐시 초기화 (관리용)
     */
    public void clearCache() {
        cache.clear();
        log.info("GeoIP 캐시 초기화 완료");
    }

    /**
     * 국가 위치 정보 DTO
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GeoLocation {
        private String countryCode; // ISO 3166-1 alpha-2 (예: KR, US, JP)
        private String countryName;  // 국가 이름 (예: South Korea, United States)
    }
}
