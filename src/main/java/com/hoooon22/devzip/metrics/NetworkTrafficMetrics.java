package com.hoooon22.devzip.metrics;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;
import io.micrometer.core.instrument.MeterRegistry;
import java.io.BufferedReader;
import java.io.InputStreamReader;

@Component
public class NetworkTrafficMetrics {

    @Value("${network.interface}")
    private String networkInterface;

    @Bean
    public ApplicationRunner networkTrafficMetric(MeterRegistry meterRegistry) {
        return args -> {
            // 네트워크 트래픽 메트릭 등록
            meterRegistry.gauge("network.traffic.sent", this, n -> getSentNetworkBytes());
            meterRegistry.gauge("network.traffic.received", this, n -> getReceivedNetworkBytes());
        };
    }

    /**
     * 송신 트래픽 바이트 수 (단위: Byte)
     */
    private double getSentNetworkBytes() {
        try {
            String command = "cat /proc/net/dev | grep " + networkInterface;  // 리눅스에서 네트워크 인터페이스의 송수신 바이트 정보 읽기
            Process process = Runtime.getRuntime().exec(command);
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line = reader.readLine();
            if (line != null) {
                // 결과에서 송신 바이트 수 추출
                String[] parts = line.split("\\s+");
                return Double.parseDouble(parts[9]); // 송신 바이트는 10번째 필드에 위치
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return 0; // 오류 발생 시 0 반환
    }

    /**
     * 수신 트래픽 바이트 수 (단위: Byte)
     */
    private double getReceivedNetworkBytes() {
        try {
            String command = "cat /proc/net/dev | grep " + networkInterface;  // 리눅스에서 네트워크 인터페이스의 송수신 바이트 정보 읽기
            Process process = Runtime.getRuntime().exec(command);
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line = reader.readLine();
            if (line != null) {
                // 결과에서 수신 바이트 수 추출
                String[] parts = line.split("\\s+");
                return Double.parseDouble(parts[1]); // 수신 바이트는 2번째 필드에 위치
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return 0; // 오류 발생 시 0 반환
    }
}
