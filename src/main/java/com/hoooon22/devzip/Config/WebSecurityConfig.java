package com.hoooon22.devzip.Config;

import com.hoooon22.devzip.Service.AuthTokenFilter;
import com.hoooon22.devzip.Service.UserDetailsServiceImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class WebSecurityConfig {

    private final UserDetailsServiceImpl userDetailsService;
    private final AuthEntryPointJwt unauthorizedHandler;
    private final AuthTokenFilter authTokenFilter;

    // 자격증명 허용 CORS 의 허용 출처 (application.properties: app.cors.allowed-origins)
    @Value("${app.cors.allowed-origins}")
    private String[] allowedOrigins;

    public WebSecurityConfig(UserDetailsServiceImpl userDetailsService,
            AuthEntryPointJwt unauthorizedHandler,
            AuthTokenFilter authTokenFilter) {
        this.userDetailsService = userDetailsService;
        this.unauthorizedHandler = unauthorizedHandler;
        this.authTokenFilter = authTokenFilter;
    }

    @Bean
    @Order(1)
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());

        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authz -> authz
                        .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll() // 모든 OPTIONS
                                                                                                         // 요청 허용
                        .requestMatchers("/api/traceboard/event").permitAll() // 이벤트 수집은 공개 (더 구체적인 패턴을 위로)
                        .requestMatchers("/api/auth/signin", "/api/auth/signup", "/api/auth/validate").permitAll()
                        .requestMatchers("/api/auth/admin/**").hasRole("ADMIN")
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/actuator/**").hasRole("ADMIN")
                        .requestMatchers("/api/system/**").permitAll()
                        .requestMatchers("/api/v1/serverstarts/**").permitAll()
                        .requestMatchers("/metrics/**").permitAll()
                        .requestMatchers("/api/traceboard/**").hasRole("ADMIN") // 나머지 트레이스보드 API는 관리자만
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/pins").hasRole("ADMIN") // 프로젝트 고정 설정은 관리자만 (조회는 공개)
                        .requestMatchers("/api/livechat/**").authenticated() // 실시간 채팅 API는 인증된 사용자만
                        // 페이지 라우팅은 React에서 ProtectedRoute로 보호됨
                        .requestMatchers("/", "/static/**", "/manifest.json", "/favicon.ico").permitAll()
                        .requestMatchers("/Guestbook", "/Joke", "/apiPage", "/trendchat").permitAll()
                        .anyRequest().permitAll());

        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(authTokenFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

        // 자격증명 포함 요청은 명시적 허용 출처에서만 가능 (와일드카드 + credentials 금지)
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList(allowedOrigins));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        // 공개 이벤트 수집 엔드포인트: 외부 SDK 호출을 위해 모든 출처 허용하되 자격증명은 받지 않음
        CorsConfiguration publicEvent = new CorsConfiguration();
        publicEvent.setAllowedOrigins(Arrays.asList("*"));
        publicEvent.setAllowedMethods(Arrays.asList("POST", "OPTIONS"));
        publicEvent.setAllowedHeaders(Arrays.asList("Content-Type"));
        publicEvent.setAllowCredentials(false);
        publicEvent.setMaxAge(3600L);

        source.registerCorsConfiguration("/api/traceboard/event", publicEvent);
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
