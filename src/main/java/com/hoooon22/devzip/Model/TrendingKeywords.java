package com.hoooon22.devzip.Model;

import java.util.List;

public class TrendingKeywords {
    
    private String updatedAt;
    private List<String> topKeywords;

    // 기본 생성자
    public TrendingKeywords() {}

    // Getter, Setter
    public String getUpdatedAt() {
        return updatedAt;
    }

    public void getUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<String> getKeywords() {
        return topKeywords;
    }
    
    public void setTopKeywords(List<String> topKeywords) {
        this.topKeywords = topKeywords;
    }
}
