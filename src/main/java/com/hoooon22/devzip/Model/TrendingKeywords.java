package com.hoooon22.devzip.Model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public class TrendingKeywords {
    
    @JsonProperty("updated_at")
    private String updatedAt;

    @JsonProperty("top_keywords")
    private List<String> topKeywords;

    // 기본 생성자
    public TrendingKeywords() {}

    // Getter, Setter
    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<String> getTopKeywords() {
        return topKeywords;
    }

    public void setTopKeywords(List<String> topKeywords) {
        this.topKeywords = topKeywords;
    }
}
