package com.hoooon22.devzip.Controller;

// WebController
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class WebController implements ErrorController {
    @GetMapping({"/", "/error"})
    public String index() {
        return "index.html";
    }
    
    @GetMapping("/Guestbook")
    public String guestbookPage() {
        return "guestbook"; // guestbook.html과 같은 뷰 템플릿을 반환
    }
}