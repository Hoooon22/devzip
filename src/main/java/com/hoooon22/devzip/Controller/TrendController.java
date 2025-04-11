package com.hoooon22.devzip.Controller;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hoooon22.devzip.Service.TrendService;

@RestController
@RequestMapping("/api/trend")
public class TrendController {

    @Autowired
    private TrendService trendService;

    // /api/trend/timestamp - updated_at 시간 반환
    @GetMapping("/timestamp")
    public ResponseEntity<?> getTimestamp() {
        try {
            String timestamp = trendService.getUpdatedAt();
            return ResponseEntity.ok(timestamp);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                 .body("트렌드 정보 타임스탬프를 불러오는 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    // /api/trend/keywords - top_keywords 리스트 반환
    @GetMapping("/keywords")
    public ResponseEntity<?> getKeywords() {
        try {
            List<String> keywords = trendService.getTopKeywords();
            return ResponseEntity.ok(keywords);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                 .body("트렌드 키워드를 불러오는 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
}
