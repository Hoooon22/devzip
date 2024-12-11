package com.hoooon22.devzip.metrics;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.InputStreamReader;

import org.springframework.stereotype.Component;

@Component
public class NetworkTrafficMetrics {

    // 송신 트래픽 (bytes)
    public long getSentBytes() {
        return getNetworkBytes("/sys/class/net/enX0/statistics/tx_bytes");
    }

    // 수신 트래픽 (bytes)
    public long getReceivedBytes() {
        return getNetworkBytes("/sys/class/net/enX0/statistics/rx_bytes");
    }

    // 네트워크 바이트를 가져오는 공통 메소드
    private long getNetworkBytes(String path) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(path)))) {
            String line = reader.readLine();
            return line != null ? Long.parseLong(line) : 0;
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }
}