package com.hoooon22.devzip.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class IPController {

    @GetMapping("/api/ip")
    public String getClientIP(@RequestHeader(name = "X-Forwarded-For", required = false) String clientIP) {
        if (clientIP != null && !clientIP.isBlank()) {
            // X-Forwarded-For 헤더에서 IP 주소 추출
            String[] ipParts = clientIP.split(",");
            String firstIPAddress = ipParts[0].trim(); // 첫 번째 IP 주소 추출

            // IP 주소 가공 (xxx.xx 형식으로)
            String[] firstIPSegments = firstIPAddress.split("\\.");
            if (firstIPSegments.length >= 2) {
                return firstIPSegments[0] + "." + firstIPSegments[1];
            } else {
                return "Unknown"; // IP 주소 가공 실패 시 처리
            }
        } else {
            return "Unknown"; // X-Forwarded-For 헤더가 없는 경우 처리
        }
    }
}
