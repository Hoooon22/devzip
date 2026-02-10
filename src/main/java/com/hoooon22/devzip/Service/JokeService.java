package com.hoooon22.devzip.Service;

import com.hoooon22.devzip.Model.JokeResponse;
import com.hoooon22.devzip.Model.TranslatedJoke;
import com.hoooon22.devzip.tip.dto.GeminiRequest;
import com.hoooon22.devzip.tip.dto.GeminiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

@Service
public class JokeService {

    private static final Logger logger = LoggerFactory.getLogger(JokeService.class);
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    private final RestTemplate restTemplate;

    @Value("${google.api.key:}")
    private String googleApiKey;

    // 일일 농담 캐싱 필드
    private TranslatedJoke cachedDailyJoke;
    private LocalDate lastGeneratedDate;

    @Autowired
    public JokeService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * 오늘의 농담 가져오기 (캐싱 적용 - TipService 패턴)
     * 자정에 초기화되어 하루 동안 동일한 농담 반환
     * 
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
                jokeResponse.getType());
    }

    /**
     * Gemini API를 사용하여 영어 텍스트를 한국어로 번역
     */
    private String translateToKorean(String englishText) {
        if (!StringUtils.hasText(googleApiKey)) {
            logger.warn("Google API key is not configured. Returning original text.");
            return englishText;
        }

        String geminiUrlWithKey = GEMINI_API_URL + "?key=" + googleApiKey;

        // Gemini API 요청 바디 구성 (TipService와 동일한 DTO 사용)
        String prompt = "Translate the following joke into natural Korean. Output ONLY the translated text. Do not include any internal thoughts, explanations, or [THOUGHT] blocks. Just the translation:\n\n"
                + englishText;
        GeminiRequest.Part part = new GeminiRequest.Part(prompt);
        GeminiRequest.Content content = new GeminiRequest.Content(Collections.singletonList(part));
        GeminiRequest request = new GeminiRequest(Collections.singletonList(content));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<GeminiRequest> entity = new HttpEntity<>(request, headers);

        // 잠깐의 네트워크 오류를 흡수하기 위해 2회까지 재시도
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                ResponseEntity<GeminiResponse> response = restTemplate.exchange(
                        geminiUrlWithKey,
                        HttpMethod.POST,
                        entity,
                        GeminiResponse.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    String translatedText = extractTextFromGeminiResponse(response.getBody());
                    if (StringUtils.hasText(translatedText)) {
                        // [THOUGHT] 블록이 포함된 경우 제거
                        String cleanedText = translatedText.replaceAll("\\[THOUGHT\\][\\s\\S]*?(\n\n|\n|$)", "").trim();
                        // 만약 제거 후에도 [THOUGHT]가 남아있거나 빈 문자열이면 원문 반환 고려 (여기선 빈 문자열 체크만)
                        if (StringUtils.hasText(cleanedText)) {
                            return cleanedText;
                        }
                    }
                    logger.warn("Gemini translation attempt {} returned empty or invalid text", attempt);
                } else {
                    logger.warn("Gemini translation attempt {} failed with status {}", attempt,
                            response.getStatusCode());
                }
            } catch (Exception e) {
                logger.warn("Gemini translation attempt {} failed: {}", attempt, e.getMessage());
            }
        }

        logger.warn("Gemini translation failed; returning original text");
        return englishText;
    }

    /**
     * Gemini API 응답에서 번역 텍스트 추출
     */
    private String extractTextFromGeminiResponse(GeminiResponse response) {
        List<GeminiResponse.Candidate> candidates = response.getCandidates();
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }

        GeminiResponse.Candidate candidate = candidates.get(0);
        if (candidate.getContent() == null ||
                candidate.getContent().getParts() == null ||
                candidate.getContent().getParts().isEmpty()) {
            return null;
        }

        return candidate.getContent().getParts().get(0).getText();
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
                "programming");
    }
}
