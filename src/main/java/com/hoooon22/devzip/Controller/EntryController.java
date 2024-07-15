package com.hoooon22.devzip.Controller;

import com.hoooon22.devzip.Entity.Entry;
import com.hoooon22.devzip.Service.EntryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class EntryController {

    private final EntryService entryService;

    @GetMapping("/entries")
    public ResponseEntity<List<Entry>> getAllEntries() {
        try {
            List<Entry> entries = entryService.getAllEntries();
            return ResponseEntity.ok(entries);
        } catch (Exception e) {
            e.printStackTrace(); // 서버 로그에 오류 메시지 출력
            return ResponseEntity.status(500).body(null);
        }
    }

    @PostMapping("/entries")
    public ResponseEntity<Entry> addEntry(@RequestBody Entry entry) {
        try {
            Entry savedEntry = entryService.addEntry(entry);
            return ResponseEntity.ok(savedEntry);
        } catch (Exception e) {
            e.printStackTrace(); // 서버 로그에 오류 메시지 출력
            return ResponseEntity.status(500).body(null);
        }
    }
}
