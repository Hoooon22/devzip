package com.hoooon22.devzip.Config;

import com.hoooon22.devzip.Security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // CSRF 보호 (SPA용으로 비활성화하되, 헤더 기반 검증 활성화)
            .csrf(csrf -> csrf
                .ignoringRequestMatchers("/api/traceboard/**", "/ws/**", "/api/entry/**", "/api/v1/entries/**",
                    "/api/chat/**", "/api/trendchat/**", "/api/joke/**", "/api/trend/**")
            )
            // 세션 관리 - JWT를 사용하므로 STATELESS
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            // 권한 설정
            .authorizeHttpRequests(auth -> auth
                // 공개 엔드포인트
                .requestMatchers("/", "/static/**", "/favicon.ico", "/manifest.json").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/ws/**").permitAll() // WebSocket 연결
                
                // Guestbook API (공개 API)
                .requestMatchers("/api/entry/**").permitAll()
                .requestMatchers("/api/v1/entries/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/entry").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/entry").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/entries").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/entries").permitAll()
                
                // Chat API (공개 API)
                .requestMatchers("/api/chat/**").permitAll()
                .requestMatchers("/api/trendchat/**").permitAll()
                
                // Joke API (공개 API) 
                .requestMatchers("/api/joke/**").permitAll()
                .requestMatchers("/api/trend/**").permitAll()
                
                // TraceBoard 이벤트 수집 API (공개 API - 임시)
                .requestMatchers(HttpMethod.POST, "/api/traceboard/event").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/traceboard/log/event").permitAll()
                
                // 대시보드 조회 API (인증 필요)
                .requestMatchers("/api/traceboard/dashboard/**").hasRole("API_CLIENT")
                .requestMatchers("/api/traceboard/events/**").hasRole("API_CLIENT")
                .requestMatchers("/api/traceboard/log/**").hasRole("API_CLIENT")
                
                // 기타 API (인증 필요)
                .requestMatchers("/api/**").hasRole("API_CLIENT")
                
                // 나머지 요청은 허용 (정적 파일, 프론트엔드 라우팅)
                .anyRequest().permitAll()
            )
            // 폼 로그인 비활성화
            .formLogin(form -> form.disable())
            // HTTP Basic 인증 비활성화
            .httpBasic(basic -> basic.disable())
            // JWT 필터 추가
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
            
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
