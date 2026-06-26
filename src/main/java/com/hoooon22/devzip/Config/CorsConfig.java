package com.hoooon22.devzip.Config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${app.cors.max-age:3600}")
    private long maxAge;

    // 자격증명을 허용하는 CORS 는 명시적 허용 출처에만 적용한다. (와일드카드 + credentials 금지)
    @Value("${app.cors.allowed-origins}")
    private String[] allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // 공개 이벤트 수집 엔드포인트: 외부 사이트의 SDK가 호출할 수 있도록 모든 출처를 허용하되,
        // 자격증명(쿠키/인증헤더)은 전송받지 않는다. credentials=false 이므로 와일드카드 출처가 안전하다.
        registry.addMapping("/api/traceboard/event")
                .allowedOrigins("*")
                .allowedMethods("POST", "OPTIONS")
                .allowedHeaders("Content-Type")
                .allowCredentials(false)
                .maxAge(maxAge);

        // 그 외 API: 명시적 허용 출처에서만 자격증명 포함 요청을 허용한다.
        registry.addMapping("/api/**")
                .allowedOriginPatterns(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("X-Total-Count", "X-Page-Count")
                .allowCredentials(true)
                .maxAge(maxAge); // preflight 캐시 시간

        // WebSocket용 별도 설정
        registry.addMapping("/ws/**")
                .allowedOriginPatterns(allowedOrigins)
                .allowedMethods("GET", "POST")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}