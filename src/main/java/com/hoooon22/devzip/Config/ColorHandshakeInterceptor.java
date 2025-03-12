package com.hoooon22.devzip.Config;

import java.util.Map;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import jakarta.servlet.http.HttpServletRequest;

public class ColorHandshakeInterceptor implements HandshakeInterceptor {
    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, 
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
        if (request instanceof HttpServletRequest) {
            HttpServletRequest servletRequest = (HttpServletRequest) request;
            String ip = servletRequest.getHeader("X-Forwarded-For");
            if (ip == null || ip.isEmpty()) {
                ip = servletRequest.getRemoteAddr();
            }
            attributes.put("clientIp", ip);
            // 무작위 색상 생성 (각 클라이언트 고유)
            int red = (int)(Math.random() * 256);
            int green = (int)(Math.random() * 256);
            int blue = (int)(Math.random() * 256);
            String clientColor = String.format("#%02x%02x%02x", red, green, blue);
            attributes.put("clientColor", clientColor);
        }
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, 
                               WebSocketHandler wsHandler, Exception exception) {
        // no-op
    }
}
