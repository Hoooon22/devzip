package com.hoooon22.devzip.Config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.builders.WebSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authorizeRequests ->
                authorizeRequests
                    .requestMatchers("/game-chatting/**").permitAll() // WebSocket 핸들러 접근 허용
                    .anyRequest().authenticated() // 나머지 요청은 인증 필요
            )
            .csrf(csrf -> csrf.disable()) // CSRF 보호 비활성화
            .headers(headers -> headers.frameOptions().disable()); // H2 콘솔 사용 시 필요

        return http.build();
    }

    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.ignoring().requestMatchers("/resources/**"); // 정적 리소스 접근 허용
    }
}
