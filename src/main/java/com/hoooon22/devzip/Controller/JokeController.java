package com.hoooon22.devzip.Controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hoooon22.devzip.Model.TranslatedJoke;
import com.hoooon22.devzip.Service.JokeService;

/**
 * 농담 API 컨트롤러
 * - 외부 Joke API에서 영어 농담을 가져와서 한글로 번역하여 제공
 */
@RestController
public class JokeController {

    private final JokeService jokeService;

    public JokeController(JokeService jokeService) {
        this.jokeService = jokeService;
    }

    /**
     * 번역된 농담 조회
     * @return TranslatedJoke - 원문과 번역된 농담
     */
    @GetMapping("/api/joke")
    public ResponseEntity<TranslatedJoke> getJoke() {
        TranslatedJoke joke = jokeService.getRandomJoke();
        return ResponseEntity.ok(joke);
    }
}
