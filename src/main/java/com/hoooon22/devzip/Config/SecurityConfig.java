package com.hoooon22.devzip.Config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringRequestMatchers("/api/v1/**") // API에 대해서만 CSRF 보호 비활성화
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/**").permitAll()  // /api/v1/** 경로는 모두 허용
                .anyRequest().authenticated()  // 나머지 경로는 인증 필요
            )
            .build();
    }
}
