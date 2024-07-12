package com.hoooon22.devzip.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class IPController {

    @GetMapping("/api/ip")
    public String getClientIP(@RequestHeader(name = "X-Forwarded-For", required = false) String clientIP) {
        try {
            if (clientIP != null) {
                // IP 주소 가공 (xxx.xx 형식으로)
                String[] ipParts = clientIP.split("\\.");
                if (ipParts.length >= 2) {
                    return ipParts[0] + "." + ipParts[1];
                } else {
                    return "Unknown"; // 가공할 수 없는 경우 처리
                }
            } else {
                return "Unknown"; // X-Forwarded-For 헤더가 없는 경우 처리
            }
        } catch (Exception e) {
            // 예외가 발생할 경우 처리
            return "Error fetching IP: " + e.getMessage();
        }
    }
}
