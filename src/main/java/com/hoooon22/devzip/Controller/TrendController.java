package com.hoooon22.devzip.Controller;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hoooon22.devzip.Model.TrendingKeywords;
import com.hoooon22.devzip.Service.TrendService;

@RestController
public class TrendController {
    
    @Autowired
    private TrendService trendService;

    @GetMapping("/api/trendingkeywords")
    public TrendingKeywords getTrendingKeywords() {
        try {
            return trendService.getTrendingKeywords();
        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }
    }
}
