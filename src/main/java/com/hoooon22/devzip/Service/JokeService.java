package com.hoooon22.devzip.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hoooon22.devzip.Model.JokeResponse;
import com.hoooon22.devzip.Model.TranslatedJoke;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.Map;

@Service
public class JokeService {

    private static final Logger logger = LoggerFactory.getLogger(JokeService.class);
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${google.api.key}")
    private String googleApiKey;

    // 일일 농담 캐싱 필드
    private TranslatedJoke cachedDailyJoke;
    private LocalDate lastGeneratedDate;

    @Autowired
    public JokeService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * 오늘의 농담 가져오기 (캐싱 적용 - TipService 패턴)
     * 자정에 초기화되어 하루 동안 동일한 농담 반환
     * @return 캐시된 또는 새로 생성된 TranslatedJoke
     */
    public synchronized TranslatedJoke getDailyJoke() {
        LocalDate today = LocalDate.now();

        // 캐시된 농담이 오늘 날짜와 일치하면 재사용
        if (cachedDailyJoke == null || lastGeneratedDate == null || !lastGeneratedDate.isEqual(today)) {
            try {
                cachedDailyJoke = fetchAndTranslateJoke();
                lastGeneratedDate = today;
                logger.info("✅ Successfully generated new daily joke for {}", today);
            } catch (Exception e) {
                logger.error("❌ Error generating new daily joke", e);
                return createFallbackJoke();
            }
        } else {
            logger.debug("📦 Using cached daily joke for {}", today);
        }

        return cachedDailyJoke;
    }

    /**
     * 외부 API로부터 무작위 영어 농담을 가져오고 한글로 번역하여 반환
     * Joke 페이지에서 사용 (매번 새로운 농담)
     */
    public TranslatedJoke getRandomJoke() {
        try {
            return fetchAndTranslateJoke();
        } catch (Exception e) {
            logger.error("Error fetching or translating joke", e);
            return createFallbackJoke();
        }
    }

    /**
     * 외부 Joke API에서 농담을 가져와 번역하는 공통 로직
     */
    private TranslatedJoke fetchAndTranslateJoke() {
        // 1. 외부 Joke API 호출
        String jokeApiUrl = "https://official-joke-api.appspot.com/random_joke";
        JokeResponse jokeResponse = restTemplate.getForObject(jokeApiUrl, JokeResponse.class);

        if (jokeResponse == null || jokeResponse.getSetup() == null || jokeResponse.getPunchline() == null) {
            logger.error("Failed to fetch joke from external API");
            return createFallbackJoke();
        }

        logger.info("Fetched joke - Setup: {}, Punchline: {}", jokeResponse.getSetup(), jokeResponse.getPunchline());

        // 2. Gemini API를 통한 번역
        String translatedSetup = translateToKorean(jokeResponse.getSetup());
        String translatedPunchline = translateToKorean(jokeResponse.getPunchline());

        // 3. TranslatedJoke 객체 생성 및 반환
        return new TranslatedJoke(
                jokeResponse.getSetup(),
                jokeResponse.getPunchline(),
                translatedSetup,
                translatedPunchline,
                jokeResponse.getType()
        );
    }

    /**
     * Gemini API를 사용하여 영어 텍스트를 한국어로 번역
     */
    private String translateToKorean(String englishText) {
        try {
            if (googleApiKey == null || googleApiKey.isEmpty()) {
                logger.warn("Google API key is not configured");
                return "[번역 실패: API 키 없음] " + englishText;
            }

            String geminiUrlWithKey = GEMINI_API_URL + "?key=" + googleApiKey;

            // Gemini API 요청 바디 구성
            String prompt = "다음 영어 농담을 자연스러운 한국어로 번역해주세요. 농담의 뉘앙스와 유머를 최대한 살려서 번역해주세요. 번역만 출력하고 추가 설명은 하지 마세요:\n\n" + englishText;

            Map<String, Object> requestBody = Map.of(
                    "contents", new Object[]{
                            Map.of("parts", new Object[]{
                                    Map.of("text", prompt)
                            })
                    }
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            // API 호출
            ResponseEntity<String> response = restTemplate.exchange(
                    geminiUrlWithKey,
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            // 응답 파싱
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && candidates.size() > 0) {
                    JsonNode content = candidates.get(0).path("content");
                    JsonNode parts = content.path("parts");
                    if (parts.isArray() && parts.size() > 0) {
                        String translatedText = parts.get(0).path("text").asText();
                        return translatedText.trim();
                    }
                }
            }

            logger.error("Failed to parse Gemini API response");
            return "[번역 실패] " + englishText;

        } catch (Exception e) {
            logger.error("Error during translation", e);
            return "[번역 오류] " + englishText;
        }
    }

    /**
     * 에러 발생 시 반환할 기본 농담
     */
    private TranslatedJoke createFallbackJoke() {
        return new TranslatedJoke(
                "Why do programmers prefer dark mode?",
                "Because light attracts bugs!",
                "왜 프로그래머들은 다크 모드를 선호할까요?",
                "빛이 버그를 끌어들이기 때문이죠!",
                "programming"
        );
    }
}
