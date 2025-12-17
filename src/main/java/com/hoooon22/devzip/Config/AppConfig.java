package com.hoooon22.devzip.Config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.time.Duration;

@Configuration
public class AppConfig implements WebMvcConfigurer {

    @Autowired
    private AccessLogInterceptor accessLogInterceptor;

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        // 외부 API 호출에 대한 타임아웃을 지정해 과도한 대기 방지
        return builder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(10))
                .build();
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 접근 로그 인터셉터 등록
        registry.addInterceptor(accessLogInterceptor)
                .addPathPatterns("/**")  // 모든 경로
                .excludePathPatterns(
                    "/static/**",        // 정적 리소스 제외
                    "/css/**",
                    "/js/**",
                    "/images/**",
                    "/favicon.ico",
                    "/actuator/**",      // Actuator 제외
                    "/error"             // 에러 페이지 제외
                );
    }
}
