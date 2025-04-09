package com.hoooon22.devzip.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class WebController {
    
    // Frontend 프로젝트의 라우팅 처리 - 모든 경로를 인덱스 페이지로 포워드
    @GetMapping(value = {
        "/", 
        "/Guestbook", 
        "/Joke", 
        "/lolPatch", 
        "/apiPage", 
        "/dashboard", 
        "/trendchat", 
        "/traceboard/**", 
        "/chat/**",
        "/error"
    })
    public String index() {
        return "forward:/index.html";
    }
}
