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
            .csrf(csrf -> csrf.disable()) // CSRF 토큰 비활성화
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/**").permitAll() // 특정 경로 허용
                .anyRequest().authenticated() // 나머지 요청은 인증 필요
            )
            .build();
    }
}
