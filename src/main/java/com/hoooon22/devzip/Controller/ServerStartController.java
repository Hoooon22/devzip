package com.hoooon22.devzip.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hoooon22.devzip.Model.ServerStart;
import com.hoooon22.devzip.Service.ServerStartService;



@RestController
@RequestMapping("/api/v1/serverstarts")
public class ServerStartController {
    
    @Autowired
    private ServerStartService serverStartService;

    @GetMapping
    public ResponseEntity<List<ServerStart>> getAllServerStarts() {
        List<ServerStart> serverStarts = serverStartService.getAllServerStarts();
        return ResponseEntity.ok(serverStarts);
    }
    
    @PostMapping
    public ResponseEntity<ServerStart> addServerStart(@RequestBody ServerStart serverStart) {
        ServerStart savedServerStart = serverStartService.addServerStart(serverStart);
        return ResponseEntity.ok(savedServerStart);
    }
}
