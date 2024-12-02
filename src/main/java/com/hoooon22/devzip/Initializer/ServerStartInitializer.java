package com.hoooon22.devzip.Initializer;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.hoooon22.devzip.Model.ServerStart;
import com.hoooon22.devzip.Service.ServerStartService;

@Component
public class ServerStartInitializer implements ApplicationRunner {

    @Autowired
    private ServerStartService serverStartService;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        // 서버 실행 시 딱 한 번 호출
        ServerStart serverStart = new ServerStart();
        serverStartService.addServerStart(serverStart);
        System.out.println("addServerStart 메서드가 실행되었습니다.");
    }
}
