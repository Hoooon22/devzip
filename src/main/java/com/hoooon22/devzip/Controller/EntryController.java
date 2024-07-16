// EntryController.java
package com.hoooon22.devzip.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hoooon22.devzip.Model.Entry;
import com.hoooon22.devzip.Service.EntryService;

@RestController
@RequestMapping("/api/v1/entries")
public class EntryController {

    @Autowired
    private EntryService entryService;

    @GetMapping
    public ResponseEntity<List<Entry>> getAllEntries() {
        List<Entry> entries = entryService.getAllEntries();
        return ResponseEntity.ok(entries);
    }

    @PostMapping
    public ResponseEntity<Entry> addEntry(@RequestBody Entry entry) {
        Entry savedEntry = entryService.addEntry(entry);
        return ResponseEntity.ok(savedEntry);
    }
}
