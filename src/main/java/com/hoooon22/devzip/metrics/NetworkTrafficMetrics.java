package com.hoooon22.devzip.metrics;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

@Component
public class NetworkTrafficMetrics {

    @Value("${network.metrics.sent.url}")
    private String sentUrl;

    @Value("${network.metrics.received.url}")
    private String receivedUrl;

    private double sentBytes = 0;
    private double receivedBytes = 0;

    private final RestTemplate restTemplate;

    public NetworkTrafficMetrics(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public void updateTrafficData() {
        try {
            // 송신 데이터 가져오기 (실제 API 호출 필요)
            sentBytes = restTemplate.getForObject(sentUrl, Double.class); // API 호출 및 응답 처리

            // 수신 데이터 가져오기 (실제 API 호출 필요)
            receivedBytes = restTemplate.getForObject(receivedUrl, Double.class); // API 호출 및 응답 처리
        } catch (Exception e) {
            // API 호출 실패 시 기본값 사용
            sentBytes = 0;
            receivedBytes = 0;
        }
    }

    public Map<String, Double> getTrafficData() {
        Map<String, Double> trafficData = new HashMap<>();
        trafficData.put("sent", sentBytes);
        trafficData.put("received", receivedBytes);
        return trafficData;
    }

    @RestController
    public static class NetworkTrafficController {

        private final NetworkTrafficMetrics networkTrafficMetrics;

        public NetworkTrafficController(NetworkTrafficMetrics networkTrafficMetrics) {
            this.networkTrafficMetrics = networkTrafficMetrics;
        }

        // 송신 트래픽 정보
        @GetMapping("/actuator/metrics/network.traffic.sent")
        public Map<String, Double> getSentTraffic() {
            networkTrafficMetrics.updateTrafficData(); // 데이터 갱신
            return networkTrafficMetrics.getTrafficData();
        }

        // 수신 트래픽 정보
        @GetMapping("/actuator/metrics/network.traffic.received")
        public Map<String, Double> getReceivedTraffic() {
            networkTrafficMetrics.updateTrafficData(); // 데이터 갱신
            return networkTrafficMetrics.getTrafficData();
        }
    }
}
