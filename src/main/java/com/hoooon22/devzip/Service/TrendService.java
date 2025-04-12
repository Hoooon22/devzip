package com.hoooon22.devzip.Service;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hoooon22.devzip.Model.TrendingKeywords;

@Service
public class TrendService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    // JSON 파일에서 데이터를 읽어오는 메서드
    public TrendingKeywords getTrendingKeywords() throws IOException {
        try {
            // ClassPathResource를 사용하여 JSON 파일 읽기
            ClassPathResource resource = new ClassPathResource("trending_keywords.json");

            // InputStream을 얻어 JSON 파일 읽기
            InputStream inputStream = resource.getInputStream();

            // ObjectMapper로 JSON 파일을 Java 객체로 변환
            ObjectMapper objectMapper = new ObjectMapper();
            return objectMapper.readValue(inputStream, TrendingKeywords.class);
        } catch (IOException e) {
            System.err.println("트렌드 키워드 JSON 파일을 읽는 데 실패했습니다: " + e.getMessage());
            // 예외 발생 시 빈 객체 반환 대신 재발생하여 상위 메서드에서 처리
            throw e;
        }
    }

    // 업데이트 시간만 반환하는 메서드
    public String getUpdatedAt() {
        try {
            TrendingKeywords trendingKeywords = getTrendingKeywords();
            String updatedAt = trendingKeywords.getUpdatedAt();
            
            // 업데이트 시간이 없거나 비어있는 경우 현재 시간 반환
            if (updatedAt == null || updatedAt.trim().isEmpty()) {
                return getCurrentFormattedTime();
            }
            
            return updatedAt;  // updated_at 반환
        } catch (IOException e) {
            // JSON 파일을 읽는 데 실패한 경우 현재 시간 반환
            System.err.println("업데이트 시간을 가져오는 데 실패했습니다, 현재 시간을 반환합니다: " + e.getMessage());
            return getCurrentFormattedTime();
        }
    }

    // 키워드 목록만 반환하는 메서드
    public List<String> getTopKeywords() {
        try {
            TrendingKeywords trendingKeywords = getTrendingKeywords();
            return trendingKeywords.getTopKeywords();  // top_keywords만 반환
        } catch (IOException e) {
            // JSON 파일을 읽는 데 실패한 경우 빈 리스트 반환
            System.err.println("트렌드 키워드를 가져오는 데 실패했습니다, 빈 리스트를 반환합니다: " + e.getMessage());
            return getSampleKeywords();
        }
    }
    
    // 현재 시간을 포맷에 맞게 반환하는 도우미 메서드
    private String getCurrentFormattedTime() {
        return LocalDateTime.now().format(DATE_FORMATTER);
    }
    
    // JSON 파일 읽기 실패 시 반환할 샘플 키워드 목록
    private List<String> getSampleKeywords() {
        List<String> sampleKeywords = new ArrayList<>();
        sampleKeywords.add("프로그래밍");
        sampleKeywords.add("자바스크립트");
        sampleKeywords.add("파이썬");
        sampleKeywords.add("리액트");
        sampleKeywords.add("스프링부트");
        sampleKeywords.add("알고리즘");
        sampleKeywords.add("머신러닝");
        sampleKeywords.add("웹개발");
        sampleKeywords.add("데이터분석");
        sampleKeywords.add("클라우드");
        return sampleKeywords;
    }
}
