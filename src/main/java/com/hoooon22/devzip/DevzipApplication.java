package com.hoooon22.devzip;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories(basePackages = "com.hoooon22.devzip.Repository")
public class DevzipApplication {

	public static void main(String[] args) {
		SpringApplication.run(DevzipApplication.class, args);
	}
}
