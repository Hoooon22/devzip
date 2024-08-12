package com.hoooon22.devzip.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class WebController {
    @GetMapping(value = {"/", "/Guestbook", "Game", "/error"})
    public String index() {
        return "forward:/index.html";
    }
}
