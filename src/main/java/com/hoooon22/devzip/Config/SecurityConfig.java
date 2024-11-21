package com.hoooon22.devzip.Config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.StaticHeadersWriter;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .headers(headers -> headers
                .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy",
                    "geolocation=(), microphone=()"))  // 불필요한 기능 비활성화
            );
        return http.build();
    }

    // @Bean
    // protected SecurityFilterChain webSecurityFilterChain(HttpSecurity http) throws Exception {
    
    //     //CSRF 토큰
    //     http.csrf((csrf) -> csrf.disable());
    //     return http.build();
    // }
}
