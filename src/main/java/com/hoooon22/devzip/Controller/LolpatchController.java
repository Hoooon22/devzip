package com.hoooon22.devzip.Controller;

import java.io.IOException;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hoooon22.devzip.Service.LolpatchService;

@RestController
public class LolpatchController {
    
    private final LolpatchService lolpatchService;

    public LolpatchController(LolpatchService lolpatchService) {
        this.lolpatchService = lolpatchService;
    }

    @GetMapping("/api/lolPatch")
    public String getLolPatch() throws IOException {
        return lolpatchService.getHTML();
    }
}
