package com.hoooon22.devzip.tip;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDate;

@Service
public class TipService {

    private static final Logger logger = LoggerFactory.getLogger(TipService.class);

    @Value("${google.api.key}")
    private String apiKey;

    private String cachedTip;
    private LocalDate lastGeneratedDate;

    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    public String getDailyTip() {
        LocalDate today = LocalDate.now();
        if (cachedTip == null || lastGeneratedDate == null || !lastGeneratedDate.isEqual(today)) {
            try {
                cachedTip = generateNewTip();
                lastGeneratedDate = today;
            } catch (Exception e) {
                logger.error("Error generating new CS tip from Gemini API", e);
                // In case of API failure, return a default message
                return "CS 팁을 불러오는 데 실패했습니다. 내일 다시 시도해주세요!";
            }
        }
        return cachedTip;
    }

    private String generateNewTip() throws Exception {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String prompt = "Give me a single, interesting computer science or software engineering tip, in Korean. Start it with '알고 계셨나요?'. It should be concise and be easy to understand, like a loading screen tip in a game. For example: '알고 계셨나요? Java의 가비지 컬렉션은 더 이상 사용되지 않는 객체를 자동으로 메모리에서 해제하여 메모리 누수를 방지하는 프로세스입니다.'";

        String requestBody = "{\"contents\":[{\"parts\":[{\"text\":\"" + prompt + "\"}]}]}";

        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

        String response = restTemplate.postForObject(GEMINI_API_URL + "?key=" + apiKey, entity, String.class);

        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode rootNode = objectMapper.readTree(response);
        String tip = rootNode.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();

        return tip;
    }
}
