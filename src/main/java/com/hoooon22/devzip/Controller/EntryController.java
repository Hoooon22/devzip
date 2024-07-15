package com.hoooon22.devzip.Controller;

import com.hoooon22.devzip.Entity.Entry;
import com.hoooon22.devzip.Repository.EntryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.List;

@RestController
@RequestMapping("/api/entries")
public class EntryController {

    @Autowired
    private EntryRepository entryRepository;

    @GetMapping
    public List<Entry> getEntries() {
        return entryRepository.findAll();
    }

    @PostMapping
    public Entry addEntry(@RequestBody Entry entry, HttpServletRequest request) {
        String clientIp = request.getRemoteAddr();
        entry.setIp(clientIp);
        return entryRepository.save(entry);
    }
}
