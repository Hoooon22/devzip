package com.hoooon22.devzip.Config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())  // CSRF 보호 비활성화 (토큰 기반 인증을 위한 처리)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/**").authenticated()  // /api/v1/** 경로는 인증 필요
                .anyRequest().permitAll()  // 나머지 경로는 인증 없이 접근 가능
            )
            .build();
    }
}
