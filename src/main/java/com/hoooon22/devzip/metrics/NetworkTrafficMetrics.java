package com.hoooon22.devzip.metrics;

import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@Component
public class NetworkTrafficMetrics {

    private double sentBytes = 0;
    private double receivedBytes = 0;

    // 네트워크 트래픽 데이터를 반환하는 메소드
    public Map<String, Double> getTrafficData() {
        Map<String, Double> trafficData = new HashMap<>();
        trafficData.put("sent", sentBytes);
        trafficData.put("received", receivedBytes);
        return trafficData;
    }

    // 네트워크 트래픽 데이터 갱신을 위한 메소드 (예: HTTP 요청으로부터 실제 트래픽 데이터 받아오는 로직 추가 가능)
    public void updateTrafficData(double sent, double received) {
        this.sentBytes = sent;
        this.receivedBytes = received;
    }

    // @RestController 클래스를 내부에 두어 API 요청을 처리하도록 구성
    @RestController
    public static class NetworkTrafficController {

        private final NetworkTrafficMetrics networkTrafficMetrics;

        // NetworkTrafficMetrics를 생성자 주입 방식으로 의존성 주입
        public NetworkTrafficController(NetworkTrafficMetrics networkTrafficMetrics) {
            this.networkTrafficMetrics = networkTrafficMetrics;
        }

        // 'GET /actuator/metrics/network.traffic.sent'로 보내는 요청에 대한 응답
        @GetMapping("/metrics/network.traffic.sent")
        public Map<String, Double> getSentTraffic() {
            return networkTrafficMetrics.getTrafficData();
        }

        // 'GET /actuator/metrics/network.traffic.received'로 보내는 요청에 대한 응답
        @GetMapping("/metrics/network.traffic.received")
        public Map<String, Double> getReceivedTraffic() {
            return networkTrafficMetrics.getTrafficData();
        }
    }
}
