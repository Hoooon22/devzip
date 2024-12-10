package com.hoooon22.devzip.metrics;
import java.lang.management.ManagementFactory;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

import com.sun.management.OperatingSystemMXBean;

import io.micrometer.core.instrument.MeterRegistry;

@Component
public class NetworkTrafficMetrics {

    // 애플리케이션이 시작될 때 커스텀 메트릭 등록
    @Bean
    public ApplicationRunner networkTrafficMetric(MeterRegistry meterRegistry) {
        OperatingSystemMXBean osBean = (OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();

        return args -> {
            // 네트워크 송신 트래픽 (sent) 메트릭 등록
            meterRegistry.gauge("network.traffic.sent", osBean, os -> getSentNetworkBytes(os));

            // 네트워크 수신 트래픽 (received) 메트릭 등록
            meterRegistry.gauge("network.traffic.received", osBean, os -> getReceivedNetworkBytes(os));
        };
    }

    /**
     * 송신 트래픽 바이트 수 (단위: Byte)
     */
    private double getSentNetworkBytes(OperatingSystemMXBean osBean) {
        // 💡 송신 바이트 정보를 가져오기 위한 로직 (OS 종속 API 필요)
        // 예시로 free memory를 사용 (운영체제에 따라 다르게 구현해야 함)
        return osBean.getTotalPhysicalMemorySize() - osBean.getFreePhysicalMemorySize();
    }

    /**
     * 수신 트래픽 바이트 수 (단위: Byte)
     */
    private double getReceivedNetworkBytes(OperatingSystemMXBean osBean) {
        // 💡 수신 바이트 정보를 가져오기 위한 로직 (OS 종속 API 필요)
        // 예시로 free memory를 사용 (운영체제에 따라 다르게 구현해야 함)
        return osBean.getTotalPhysicalMemorySize() - osBean.getFreePhysicalMemorySize();
    }
}
