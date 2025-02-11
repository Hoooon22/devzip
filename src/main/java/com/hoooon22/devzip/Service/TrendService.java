package com.hoooon22.devzip.Service;

import java.io.IOException;
import java.io.InputStream;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hoooon22.devzip.Model.TrendingKeywords;

@Service
public class TrendService {

    public TrendingKeywords getTrendingKeywords() throws IOException {
        // ClassPathResource를 사용하여 JSON 파일 읽기
        ClassPathResource resource = new ClassPathResource("trending_keywords.json");

        // InputStream을 얻어 JSON 파일 읽기
        InputStream inputStream = resource.getInputStream();

        // ObjectMapper로 JSON 파일을 Java 객체로 변환
        ObjectMapper objectMapper = new ObjectMapper();
        return objectMapper.readValue(inputStream, TrendingKeywords.class);
    }
}
