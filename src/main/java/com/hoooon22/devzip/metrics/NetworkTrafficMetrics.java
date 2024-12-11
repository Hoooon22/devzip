package com.hoooon22.devzip.metrics;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@Component
public class NetworkTrafficMetrics {

    @Value("${network.metrics.sent.url}")
    private String sentUrl;

    @Value("${network.metrics.received.url}")
    private String receivedUrl;

    private double sentBytes = 0;
    private double receivedBytes = 0;

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

        @GetMapping("/actuator/metrics/network.traffic.sent")
        public Map<String, Double> getSentTraffic() {
            return networkTrafficMetrics.getTrafficData();
        }

        @GetMapping("/actuator/metrics/network.traffic.received")
        public Map<String, Double> getReceivedTraffic() {
            return networkTrafficMetrics.getTrafficData();
        }
    }
}
