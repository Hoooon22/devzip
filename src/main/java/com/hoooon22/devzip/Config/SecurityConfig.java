package com.hoooon22.devzip.Config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // CSRF 완전 비활성화 (SPA 및 API 사용을 위해)
            .csrf(csrf -> csrf.disable())
            // CORS 설정 활성화
            .cors(cors -> cors.configurationSource(request -> {
                var corsConfiguration = new org.springframework.web.cors.CorsConfiguration();
                corsConfiguration.setAllowedOriginPatterns(java.util.List.of(
                    "http://localhost:*", 
                    "https://192.168.75.224:*", 
                    "http://192.168.75.224:*",
                    "https://devzip.cloud", 
                    "http://devzip.cloud"
                ));
                corsConfiguration.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
                corsConfiguration.setAllowedHeaders(java.util.List.of("*"));
                corsConfiguration.setAllowCredentials(true);
                corsConfiguration.setMaxAge(3600L);
                return corsConfiguration;
            }))
            // 세션 관리 - JWT를 사용하므로 STATELESS
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            // 권한 설정 - 임시로 모든 API를 공개로 설정
            .authorizeHttpRequests(auth -> auth
                // 모든 요청 허용 (디버깅을 위한 임시 설정)
                .anyRequest().permitAll()
            )
            // 폼 로그인 비활성화
            .formLogin(form -> form.disable())
            // HTTP Basic 인증 비활성화
            .httpBasic(basic -> basic.disable());
            
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
