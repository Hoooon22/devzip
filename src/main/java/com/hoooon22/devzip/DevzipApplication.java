package com.hoooon22.devzip;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = { "com.hoooon22.devzip", "com.hoooon22.devzip.Repository" })
public class DevzipApplication {

	public static void main(String[] args) {
		SpringApplication.run(DevzipApplication.class, args);
	}

}
