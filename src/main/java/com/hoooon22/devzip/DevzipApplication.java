package com.hoooon22.devzip;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;

import jakarta.annotation.PostConstruct;

@SpringBootApplication
@EnableJpaAuditing
@EnableAsync
public class DevzipApplication {

    // 서버(JVM) 기본 시간대를 한국 시간(KST)으로 고정한다.
    // 운영 서버(Ubuntu)의 기본 시간대가 UTC라서 @CreationTimestamp / LocalDateTime.now() 가
    // UTC로 기록되어 화면에 9시간 어긋나게 표시되던 문제를 해결한다.
    @PostConstruct
    public void setTimeZone() {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
    }

    public static void main(String[] args) {
        SpringApplication.run(DevzipApplication.class, args);
    }
}
