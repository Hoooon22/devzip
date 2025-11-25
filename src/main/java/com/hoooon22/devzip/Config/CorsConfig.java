package com.hoooon22.devzip.Config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${app.cors.max-age:3600}")
    private long maxAge;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*") // allowCredentials=true일 때 allowedOriginPatterns 사용
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders(
                    "*" // 모든 헤더 허용 (개발 환경)
                )
                .exposedHeaders("X-Total-Count", "X-Page-Count")
                .allowCredentials(true)
                .maxAge(maxAge); // preflight 캐시 시간

        // WebSocket용 별도 설정
        registry.addMapping("/ws/**")
                .allowedOriginPatterns("*") // allowCredentials=true일 때 allowedOriginPatterns 사용
                .allowedMethods("GET", "POST")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}