package com.hoooon22.devzip.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;

@RestController
public class IPController {
    @GetMapping("/api/ip")
    public String getClientIP(HttpServletRequest request) {
        // 클라이언트의 IP 주소 가져오기
        String ipAddress = request.getRemoteAddr();
        return "{\"ip\": \"" + ipAddress + "\"}"; // JSON 형식으로 IP 주소 반환
    }
}