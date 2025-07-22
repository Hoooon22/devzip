package com.hoooon22.devzip.Config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableConfigurationProperties({TraceBoardProperties.class})
@EnableAsync
@RequiredArgsConstructor
public class TraceBoardConfig {

    private final TraceBoardProperties properties;

    /**
     * 비동기 작업을 위한 ThreadPoolTaskExecutor 설정
     */
    @Bean
    @Primary
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("TraceBoard-Async-");
        executor.setRejectedExecutionHandler((r, exec) -> {
            // 큐가 가득 찬 경우 호출한 스레드에서 직접 실행
            if (!exec.isShutdown()) {
                r.run();
            }
        });
        executor.initialize();
        return executor;
    }

    /**
     * CSV 내보내기 전용 TaskExecutor
     */
    @Bean("csvExportExecutor")
    public Executor csvExportExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("CSV-Export-");
        executor.initialize();
        return executor;
    }

    /**
     * 데이터 집계 작업 전용 TaskExecutor
     */
    @Bean("analyticsExecutor")
    public Executor analyticsExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(6);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("Analytics-");
        executor.initialize();
        return executor;
    }
}