package com.hoooon22.devzip.Controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hoooon22.devzip.metrics.NetworkTrafficMetrics;

@RestController
public class NetworkTrafficController {

    private final NetworkTrafficMetrics networkTrafficMetrics;

    @Autowired
    public NetworkTrafficController(NetworkTrafficMetrics networkTrafficMetrics) {
        this.networkTrafficMetrics = networkTrafficMetrics;
    }

    @GetMapping("/metrics/network.traffic.sent")
    public long getSentTraffic() {
        return networkTrafficMetrics.getSentBytes();
    }

    @GetMapping("/metrics/network.traffic.received")
    public long getReceivedTraffic() {
        return networkTrafficMetrics.getReceivedBytes();
    }
}