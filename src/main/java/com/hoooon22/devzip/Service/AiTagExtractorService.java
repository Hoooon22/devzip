package com.hoooon22.devzip.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AiTagExtractorService {

    @Value("${google.api.key:}")
    private String googleApiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public AiTagExtractorService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Google Gemini API를 사용하여 텍스트에서 태그 추출 (기본 버전 - 기존 태그 없음)
     */
    public List<String> extractTags(String content) {
        return extractTags(content, new ArrayList<>());
    }

    /**
     * Google Gemini API를 사용하여 텍스트에서 태그 추출 (기존 태그 참조)
     * @param content 태그를 추출할 텍스트
     * @param existingTags 기존에 사용된 태그 목록 (일관성 유지를 위해)
     */
    public List<String> extractTags(String content, List<String> existingTags) {
        // API 키가 설정되지 않은 경우 기본 태그 추출 방식 사용
        if (googleApiKey == null || googleApiKey.trim().isEmpty()) {
            log.warn("Google API key is not configured. Using fallback tag extraction.");
            return extractTagsFallback(content);
        }

        try {
            String apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + googleApiKey;

            // 프롬프트 작성 - 기존 태그 참조
            StringBuilder prompt = new StringBuilder();
            prompt.append("다음 텍스트에서 핵심 키워드를 3-5개 추출해주세요.\n\n");

            // 기존 태그가 있으면 우선 참조하도록 지시
            if (existingTags != null && !existingTags.isEmpty()) {
                prompt.append("### 중요: 기존 태그 우선 사용\n");
                prompt.append("아래 기존 태그 목록을 먼저 확인하고, 새 텍스트와 관련 있는 태그가 있으면 반드시 그 태그를 재사용하세요.\n");
                prompt.append("새로운 태그는 기존 태그로 표현할 수 없을 때만 추가하세요.\n\n");
                prompt.append("기존 태그 목록: ");
                prompt.append(String.join(", ", existingTags));
                prompt.append("\n\n");
            }

            prompt.append("텍스트: ").append(content).append("\n\n");
            prompt.append("규칙:\n");
            prompt.append("1. 기존 태그 목록에 적합한 태그가 있으면 반드시 재사용\n");
            prompt.append("2. 키워드는 쉼표로 구분\n");
            prompt.append("3. 한글 또는 영어로 작성\n");
            prompt.append("4. 키워드만 출력하고 다른 설명 금지\n\n");
            prompt.append("키워드:");

            // 요청 바디 생성
            Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                    Map.of(
                        "parts", List.of(
                            Map.of("text", prompt.toString())
                        )
                    )
                )
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            // API 호출
            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl,
                HttpMethod.POST,
                request,
                String.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return parseGeminiResponse(response.getBody());
            } else {
                log.error("Failed to call Gemini API. Status: {}", response.getStatusCode());
                return extractTagsFallback(content);
            }

        } catch (Exception e) {
            log.error("Error extracting tags with AI: {}", e.getMessage(), e);
            return extractTagsFallback(content);
        }
    }

    /**
     * Gemini API 응답에서 태그 파싱
     */
    private List<String> parseGeminiResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");

            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode firstCandidate = candidates.get(0);
                JsonNode content = firstCandidate.path("content");
                JsonNode parts = content.path("parts");

                if (parts.isArray() && parts.size() > 0) {
                    String text = parts.get(0).path("text").asText();

                    // 쉼표로 구분된 태그 추출
                    return Arrays.stream(text.split("[,\n]"))
                        .map(String::trim)
                        .filter(tag -> !tag.isEmpty())
                        .limit(5)
                        .collect(Collectors.toList());
                }
            }
        } catch (Exception e) {
            log.error("Error parsing Gemini response: {}", e.getMessage());
        }

        return new ArrayList<>();
    }

    /**
     * AI API 실패 시 사용할 폴백 태그 추출 방법
     * 간단한 키워드 추출 알고리즘
     */
    private List<String> extractTagsFallback(String content) {
        // 공백과 특수문자로 단어 분리
        String[] words = content.split("[\\s\\p{Punct}]+");

        // 3글자 이상의 의미있는 단어만 추출
        List<String> tags = Arrays.stream(words)
            .filter(word -> word.length() >= 3)
            .map(String::toLowerCase)
            .distinct()
            .limit(5)
            .collect(Collectors.toList());

        // 태그가 없으면 기본 태그 추가
        if (tags.isEmpty()) {
            tags.add("생각");
            log.info("No tags extracted, added default tag: 생각");
        }

        return tags;
    }
}