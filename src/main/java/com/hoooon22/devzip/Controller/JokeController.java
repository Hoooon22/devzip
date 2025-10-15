package com.hoooon22.devzip.Controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hoooon22.devzip.Model.TranslatedJoke;
import com.hoooon22.devzip.Service.JokeService;

/**
 * 농담 API 컨트롤러
 * - 외부 Joke API에서 영어 농담을 가져와서 한글로 번역하여 제공
 * - /api/joke/random: 매번 새로운 농담 (Joke 페이지)
 * - /api/joke/daily: 하루 동안 캐시된 농담 (Main 페이지)
 */
@RestController
@RequestMapping("/api/joke")
public class JokeController {

    private final JokeService jokeService;

    public JokeController(JokeService jokeService) {
        this.jokeService = jokeService;
    }

    /**
     * 오늘의 농담 조회 (캐싱 적용 - 자정에 초기화)
     * Main 페이지의 Daily Joke 섹션에서 사용
     * @return TranslatedJoke - 하루 동안 동일한 농담 반환
     */
    @GetMapping("/daily")
    public ResponseEntity<TranslatedJoke> getDailyJoke() {
        TranslatedJoke joke = jokeService.getDailyJoke();
        return ResponseEntity.ok(joke);
    }

    /**
     * 무작위 농담 조회 (캐싱 없음 - 매번 새로운 농담)
     * Joke 페이지에서 사용
     * @return TranslatedJoke - 원문과 번역된 농담
     */
    @GetMapping("/random")
    public ResponseEntity<TranslatedJoke> getRandomJoke() {
        TranslatedJoke joke = jokeService.getRandomJoke();
        return ResponseEntity.ok(joke);
    }

    /**
     * 기본 엔드포인트 (하위 호환성 유지)
     * 기존 클라이언트를 위해 /api/joke는 /random과 동일하게 동작
     * @deprecated /api/joke/random 또는 /api/joke/daily 사용 권장
     */
    @GetMapping
    @Deprecated
    public ResponseEntity<TranslatedJoke> getJoke() {
        TranslatedJoke joke = jokeService.getRandomJoke();
        return ResponseEntity.ok(joke);
    }
}
