package com.hoooon22.devzip.Service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class JokeService {

    private final RestTemplate restTemplate;

    @Autowired
    public JokeService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String getRandomJoke() {
        String url = "https://official-joke-api.appspot.com/random_joke";
        return restTemplate.getForObject(url, String.class);
    }
}
