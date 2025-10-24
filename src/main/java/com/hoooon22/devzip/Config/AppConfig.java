package com.hoooon22.devzip.Config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class AppConfig implements WebMvcConfigurer {

    @Autowired
    private AccessLogInterceptor accessLogInterceptor;

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
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