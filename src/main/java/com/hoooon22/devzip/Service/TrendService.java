package com.hoooon22.devzip.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hoooon22.devzip.Model.TrendingKeywords;

@Service
public class TrendService {

    // JSON 파일에서 데이터를 읽어오는 메서드
    public TrendingKeywords getTrendingKeywords() throws IOException {
        // ClassPathResource를 사용하여 JSON 파일 읽기
        ClassPathResource resource = new ClassPathResource("trending_keywords.json");

        // InputStream을 얻어 JSON 파일 읽기
        InputStream inputStream = resource.getInputStream();

        // ObjectMapper로 JSON 파일을 Java 객체로 변환
        ObjectMapper objectMapper = new ObjectMapper();
        return objectMapper.readValue(inputStream, TrendingKeywords.class);
    }

    // 업데이트 시간만 반환하는 메서드
    public String getUpdatedAt() throws IOException {
        TrendingKeywords trendingKeywords = getTrendingKeywords();
        return trendingKeywords.getUpdatedAt();  // updated_at만 반환
    }

    // 키워드 목록만 반환하는 메서드
    public List<String> getTopKeywords() throws IOException {
        TrendingKeywords trendingKeywords = getTrendingKeywords();
        return trendingKeywords.getTopKeywords();  // top_keywords만 반환
    }
}
