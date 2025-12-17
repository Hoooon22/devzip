package com.hoooon22.devzip.tip;

import com.hoooon22.devzip.tip.dto.GeminiRequest;
import com.hoooon22.devzip.tip.dto.GeminiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

@Service
public class TipService {

    private static final Logger logger = LoggerFactory.getLogger(TipService.class);

    @Value("${google.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate;

    private String cachedTip;
    private LocalDate lastGeneratedDate;

    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
    public TipService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * 오늘의 CS 팁 가져오기 (동시성 안전)
     * @return CS 팁 문자열
     */
    public synchronized String getDailyTip() {
        LocalDate today = LocalDate.now();

        // 캐시된 팁이 오늘 날짜와 일치하면 재사용
        if (cachedTip == null || lastGeneratedDate == null || !lastGeneratedDate.isEqual(today)) {
            try {
                cachedTip = generateNewTip();
                lastGeneratedDate = today;
                logger.info("✅ Successfully generated new CS tip for {}", today);
            } catch (Exception e) {
                logger.error("❌ Error generating new CS tip from Gemini API", e);
                return "CS 팁을 불러오는 데 실패했습니다. (API 연결 오류)";
            }
        } else {
            logger.debug("📦 Using cached tip for {}", today);
        }

        return cachedTip;
    }

    /**
     * Gemini API를 호출하여 새로운 팁 생성 (DTO 기반)
     * @return 생성된 팁 문자열
     * @throws Exception API 호출 실패 시
     */
    private String generateNewTip() throws Exception {
        if (!StringUtils.hasText(apiKey)) {
            throw new IllegalStateException("Google API key is not configured");
        }

        // HTTP 헤더 설정
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // 프롬프트 정의
        String prompt = "Give me a single, practical tip about full-stack or backend/server development, in Korean. " +
                "Focus on topics like: REST API design, database optimization, Spring Boot best practices, " +
                "microservices architecture, caching strategies, server performance, security practices, " +
                "Docker/containerization, CI/CD, authentication/authorization, or scalability patterns. " +
                "Start with '알고 계셨나요?' followed by a natural statement or question that flows smoothly. " +
                "Keep it concise and actionable, like a loading screen tip in a game. " +
                "Make sure the sentence after '알고 계셨나요?' reads naturally - it should either be a complete statement " +
                "or a rhetorical question. Examples: " +
                "'알고 계셨나요? REST API에서 GET 요청은 멱등성을 보장해야 합니다!' " +
                "'알고 계셨나요? @Transactional 어노테이션은 기본적으로 RuntimeException에만 롤백됩니다.' " +
                "'알고 계셨나요? 데이터베이스 인덱스는 읽기 성능을 높이지만 쓰기 성능은 낮출 수 있습니다.'";

        // DTO를 사용한 요청 객체 생성
        GeminiRequest.Part part = new GeminiRequest.Part(prompt);
        GeminiRequest.Content content = new GeminiRequest.Content(Collections.singletonList(part));
        GeminiRequest request = new GeminiRequest(Collections.singletonList(content));

        // HTTP 요청 엔티티 생성
        HttpEntity<GeminiRequest> entity = new HttpEntity<>(request, headers);

        // API 호출
        logger.debug("🚀 Calling Gemini API: {}", GEMINI_API_URL);
        ResponseEntity<GeminiResponse> responseEntity = restTemplate.postForEntity(
                GEMINI_API_URL + "?key=" + apiKey,
                entity,
                GeminiResponse.class
        );

        // 응답 처리 (null 체크 포함)
        GeminiResponse response = responseEntity.getBody();
        if (response == null || response.getCandidates() == null || response.getCandidates().isEmpty()) {
            throw new RuntimeException("Empty response from Gemini API");
        }

        List<GeminiResponse.Candidate> candidates = response.getCandidates();
        if (candidates.get(0).getContent() == null ||
            candidates.get(0).getContent().getParts() == null ||
            candidates.get(0).getContent().getParts().isEmpty()) {
            throw new RuntimeException("Invalid response structure from Gemini API");
        }

        String tip = candidates.get(0).getContent().getParts().get(0).getText();

        if (tip == null || tip.trim().isEmpty()) {
            throw new RuntimeException("Empty tip text from Gemini API");
        }

        logger.debug("✨ Generated tip: {}", tip.substring(0, Math.min(50, tip.length())) + "...");
        return tip;
    }
}
