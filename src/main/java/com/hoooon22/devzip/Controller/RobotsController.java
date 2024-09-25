package com.hoooon22.devzip.Controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RobotsController {

    @GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    public String getRobots() {
        return "User-agent: *\n" +
               "Allow: /\n" +
               "Sitemap: https://devzip.site/sitemap.xml";
    }
}