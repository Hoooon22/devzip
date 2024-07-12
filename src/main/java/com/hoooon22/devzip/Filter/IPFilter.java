package com.hoooon22.devzip.Filter;

import javax.servlet.*;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import java.io.IOException;

@WebFilter(filterName = "IPFilter", urlPatterns = "/*")
public class IPFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        String clientIP = httpRequest.getHeader("X-Forwarded-For");
        if (clientIP == null) {
            clientIP = httpRequest.getRemoteAddr(); // 백업 방법으로 IP 주소 추출
        }
        // 추출된 IP 주소를 필요한 곳에 활용
        // 예: 로깅, 인증, 권한 부여 등
        chain.doFilter(request, response);
    }

    // 다른 메소드들 (init, destroy) 필요에 따라 구현
}
