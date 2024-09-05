package com.hoooon22.devzip.Config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")  // 모든 엔드포인트에 대해 CORS 설정 적용
                .allowedOrigins("https://devzip.site")  // 허용할 출처
                .allowedMethods("GET", "POST", "PUT", "DELETE")  // 허용할 HTTP 메서드
                .allowedHeaders("Authorization", "Content-Type")
                .allowCredentials(true);  // 자격 증명(쿠키, 인증 헤더 등) 허용
    }
}
