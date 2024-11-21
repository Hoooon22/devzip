package com.hoooon22.devzip.Config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/v1/**")  // 모든 엔드포인트에 대해 CORS 설정 적용
                .allowedOrigins(
                    "https://devzip.site",  // 허용할 출처
                    "http://localhost:3000"  // 로컬 개발 환경에서의 출처 추가 (필요 시)
                )  
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH")  // 필요한 HTTP 메서드 추가
                .allowedHeaders("*")  // 모든 헤더 허용
                .allowCredentials(true);  // 자격 증명 허용
    }
}
