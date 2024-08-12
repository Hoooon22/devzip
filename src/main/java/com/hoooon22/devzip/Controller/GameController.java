package com.hoooon22.devzip.Controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hoooon22.devzip.Model.GameRoom;
import com.hoooon22.devzip.Service.GameService;

import lombok.RequiredArgsConstructor;


@RequiredArgsConstructor
@RestController
@RequestMapping("/game")
public class GameController {
    
    private final GameService gameService;

    @PostMapping("/room")
    public GameRoom createRoom(@RequestParam String name) {
        return gameService.createRoom(name);
    }

    @GetMapping("/rooms")
    public List<GameRoom> findAllRooms() {
        return gameService.findAllRooms();
    }
    
}
