package com.hoooon22.devzip.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import javax.servlet.http.HttpServletRequest;

@RestController
public class IPController {

    @GetMapping("/api/ip")
    public String getClientIP(HttpServletRequest request) {
        String clientIP = (String) request.getAttribute("clientIP");
        if (clientIP != null) {
            String[] ipParts = clientIP.split("\\.");
            if (ipParts.length >= 2) {
                return ipParts[0] + "." + ipParts[1];
            } else {
                return "Unknown"; // IP 주소 형식이 올바르지 않은 경우 처리
            }
        } else {
            return "Unknown"; // IP 주소를 가져올 수 없는 경우 처리
        }
    }
}
