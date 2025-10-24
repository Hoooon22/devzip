package com.hoooon22.devzip.Config;

import com.hoooon22.devzip.Model.traceboard.AccessLog;
import com.hoooon22.devzip.Service.JwtUtils;
import com.hoooon22.devzip.Service.traceboard.AccessLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.LocalDateTime;

/**
 * 모든 HTTP 요청을 로깅하는 Interceptor
 *
 * 주의사항:
 * - 원본 IP 주소를 저장하므로 개인정보 보호 정책 준수 필요
 * - 성능 영향을 최소화하기 위해 비동기 처리 권장
 * - 정적 리소스는 로깅에서 제외
 */
@Component
@Slf4j
public class AccessLogInterceptor implements HandlerInterceptor {

    @Autowired
    private AccessLogService accessLogService;

    @Autowired(required = false)
    private JwtUtils jwtUtils;

    private static final ThreadLocal<Long> REQUEST_START_TIME = new ThreadLocal<>();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // 요청 시작 시간 기록
        REQUEST_START_TIME.set(System.currentTimeMillis());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        try {
            // 정적 리소스 및 특정 경로 제외
            String requestUri = request.getRequestURI();
            if (shouldSkipLogging(requestUri)) {
                return;
            }

            // 응답 시간 계산
            Long startTime = REQUEST_START_TIME.get();
            long responseTime = (startTime != null) ? System.currentTimeMillis() - startTime : 0;

            // 접근 로그 생성
            AccessLog accessLog = AccessLog.builder()
                .ipAddress(getClientIp(request))
                .username(getCurrentUsername(request))
                .userRole(getCurrentUserRole(request))
                .requestMethod(request.getMethod())
                .requestUri(requestUri)
                .queryString(request.getQueryString())
                .httpStatus(response.getStatus())
                .userAgent(request.getHeader("User-Agent"))
                .referer(request.getHeader("Referer"))
                .sessionId(request.getSession(false) != null ? request.getSession().getId() : null)
                .responseTimeMs(responseTime)
                .accessTime(LocalDateTime.now())
                .errorMessage(ex != null ? ex.getMessage() : null)
                .build();

            // 비동기로 로그 저장 (성능 영향 최소화)
            saveAccessLogAsync(accessLog);

        } catch (Exception e) {
            log.error("접근 로그 저장 중 오류 발생", e);
        } finally {
            REQUEST_START_TIME.remove();
        }
    }

    /**
     * 클라이언트 IP 주소 추출 (프록시 고려)
     */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }

        // X-Forwarded-For는 쉼표로 구분된 IP 리스트일 수 있음 (첫 번째가 실제 클라이언트 IP)
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }

        return ip;
    }

    /**
     * 현재 인증된 사용자 이름 추출
     */
    private String getCurrentUsername(HttpServletRequest request) {
        try {
            // Spring Security Context에서 추출
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal())) {
                return authentication.getName();
            }

            // JWT 토큰에서 추출 (fallback)
            if (jwtUtils != null) {
                String token = request.getHeader("Authorization");
                if (token != null && token.startsWith("Bearer ")) {
                    String jwt = token.substring(7);
                    if (jwtUtils.validateJwtToken(jwt)) {
                        return jwtUtils.getUsernameFromJwtToken(jwt);
                    }
                }
            }
        } catch (Exception e) {
            log.debug("사용자 이름 추출 중 오류 (인증되지 않은 요청일 수 있음)", e);
        }
        return null;
    }

    /**
     * 현재 사용자 역할 추출
     */
    private String getCurrentUserRole(HttpServletRequest request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getAuthorities() != null
                && !authentication.getAuthorities().isEmpty()) {
                return authentication.getAuthorities().iterator().next().getAuthority();
            }

            // JWT 토큰에서 추출 (fallback)
            if (jwtUtils != null) {
                String token = request.getHeader("Authorization");
                if (token != null && token.startsWith("Bearer ")) {
                    String jwt = token.substring(7);
                    if (jwtUtils.validateJwtToken(jwt)) {
                        return jwtUtils.getRoleFromJwtToken(jwt);
                    }
                }
            }
        } catch (Exception e) {
            log.debug("사용자 역할 추출 중 오류", e);
        }
        return null;
    }

    /**
     * 로깅에서 제외할 경로 판별
     */
    private boolean shouldSkipLogging(String requestUri) {
        // 정적 리소스 제외
        if (requestUri.matches(".+\\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$")) {
            return true;
        }

        // Health check 및 actuator 제외
        if (requestUri.startsWith("/actuator") || requestUri.equals("/health")) {
            return true;
        }

        // 접근 로그 API 자체 제외 (무한 루프 방지)
        if (requestUri.startsWith("/api/traceboard/access-logs")) {
            return true;
        }

        return false;
    }

    /**
     * 비동기로 접근 로그 저장 (CompletableFuture 사용)
     */
    private void saveAccessLogAsync(AccessLog accessLog) {
        // 별도 스레드에서 실행하여 응답 시간에 영향 최소화
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                accessLogService.saveAccessLog(accessLog);
            } catch (Exception e) {
                log.error("비동기 접근 로그 저장 실패", e);
            }
        });
    }
}
