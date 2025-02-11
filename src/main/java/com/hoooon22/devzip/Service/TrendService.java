package com.hoooon22.devzip.Service;

import java.io.File;
import java.io.IOException;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hoooon22.devzip.Model.TrendingKeywords;

@Service
public class TrendService {

    public TrendingKeywords getTrendingKeywords() throws IOException {
        // Json file
        String filePath = "src/main/resources/trending_keywords.json";

        // ObjectMapper로 Json 파일을 Java 객체로 변환
        ObjectMapper objectMapper = new ObjectMapper();
        return objectMapper.readValue(new File(filePath), TrendingKeywords.class);
    }
}
