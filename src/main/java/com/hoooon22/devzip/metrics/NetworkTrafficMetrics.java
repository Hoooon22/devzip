package com.hoooon22.devzip.metrics;

import org.hyperic.sigar.NetInterfaceStat;
import org.hyperic.sigar.Sigar;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

import io.micrometer.core.instrument.MeterRegistry;

@Component
public class NetworkTrafficMetrics {

    // properties 파일에서 네트워크 인터페이스 이름을 가져옴
    @Value("${network.interface}")
    private String networkInterface;

    @Bean
    public ApplicationRunner networkTrafficMetric(MeterRegistry meterRegistry) {
        Sigar sigar = new Sigar();

        return args -> {
            // 네트워크 송신 트래픽 (sent) 메트릭 등록
            meterRegistry.gauge("network.traffic.sent", sigar, s -> getSentNetworkBytes(s));

            // 네트워크 수신 트래픽 (received) 메트릭 등록
            meterRegistry.gauge("network.traffic.received", sigar, s -> getReceivedNetworkBytes(s));
        };
    }

    /**
     * 송신 트래픽 바이트 수 (단위: Byte)
     */
    private double getSentNetworkBytes(Sigar sigar) {
        try {
            // 네트워크 인터페이스의 상태 정보 가져오기
            NetInterfaceStat stat = sigar.getNetInterfaceStat(networkInterface);
            return stat.getTxBytes(); // 송신 바이트 수 반환
        } catch (Exception e) {
            e.printStackTrace();
            return 0; // 오류 발생 시 0 반환
        }
    }

    /**
     * 수신 트래픽 바이트 수 (단위: Byte)
     */
    private double getReceivedNetworkBytes(Sigar sigar) {
        try {
            // 네트워크 인터페이스의 상태 정보 가져오기
            NetInterfaceStat stat = sigar.getNetInterfaceStat(networkInterface);
            return stat.getRxBytes(); // 수신 바이트 수 반환
        } catch (Exception e) {
            e.printStackTrace();
            return 0; // 오류 발생 시 0 반환
        }
    }
}
