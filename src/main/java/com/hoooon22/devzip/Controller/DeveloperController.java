package com.hoooon22.devzip.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api/developer")
public class DeveloperController {
    
    @GetMapping("/emotion")
    public String getMethodName(@RequestParam String param) {
        return new String("Not Bad :/");
    }
    
}
