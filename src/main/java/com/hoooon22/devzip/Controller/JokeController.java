package com.hoooon22.devzip.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hoooon22.devzip.Service.JokeService;

@RestController
@RequestMapping("/api/Joke")
public class JokeController {

    private final JokeService jokeService;

    public JokeController(JokeService jokeService) {
        this.jokeService = jokeService;
    }

    @GetMapping("/api/joke")
    public String getJoke() {
        return jokeService.getRandomJoke();
    }
}
