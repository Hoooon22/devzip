package com.hoooon22.devzip.Controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.hoooon22.devzip.models.PostData;

@RestController
public class PostController {

    @PostMapping("/api/posts")
    public String createPost(@RequestBody PostData postData) {
        // 클라이언트 IP 주소와 함께 게시물 처리
        System.out.println("Client IP Address: " + postData.getIp());
        // 게시물 처리 로직

        return "Post created successfully";
    }
}
