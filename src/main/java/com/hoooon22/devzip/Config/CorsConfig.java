package com.hoooon22.devzip.Config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")  // 특정 엔드포인트 패턴에 대해 CORS 설정 적용
                .allowedOrigins(
                    "https://devzip.site",  // 프로덕션 출처
                    "http://localhost:3000"  // 개발 환경 출처
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS") // OPTIONS 추가
                .allowedHeaders("Content-Type", "Authorization", "X-CSRF-Token", "X-Requested-With") // 필요한 헤더 명시
                .exposedHeaders("X-CSRF-Token")  // 클라이언트가 접근 가능한 헤더
                .allowCredentials(true)  // 쿠키 기반 인증 허용
                .maxAge(3600);  // 프리플라이트 요청 캐시 시간 (초 단위)
    }
}
