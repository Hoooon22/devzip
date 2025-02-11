package com.hoooon22.devzip.Controller;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
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
    public String getTimestamp() throws IOException {
        return trendService.getUpdatedAt();  // TrendService에서 timestamp만 반환
    }

    // /api/trend/keywords - top_keywords 리스트 반환
    @GetMapping("/keywords")
    public List<String> getKeywords() throws IOException {
        return trendService.getTopKeywords();  // TrendService에서 키워드 목록만 반환
    }
}
