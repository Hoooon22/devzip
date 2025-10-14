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
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

@Service
public class TipService {

    private static final Logger logger = LoggerFactory.getLogger(TipService.class);

    @Value("${google.api.key}")
    private String apiKey;

    private String cachedTip;
    private LocalDate lastGeneratedDate;

    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

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
                return "CS 팁을 불러오는 데 실패했습니다. 내일 다시 시도해주세요!";
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
        RestTemplate restTemplate = new RestTemplate();

        // HTTP 헤더 설정
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // 프롬프트 정의
        String prompt = "Give me a single, interesting computer science or software engineering tip, in Korean. " +
                "Start it with '알고 계셨나요?'. It should be concise and be easy to understand, " +
                "like a loading screen tip in a game. For example: '알고 계셨나요? Java의 가비지 컬렉션은 " +
                "더 이상 사용되지 않는 객체를 자동으로 메모리에서 해제하여 메모리 누수를 방지하는 프로세스입니다.'";

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
