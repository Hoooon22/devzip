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

    @Autowired(required = false)
    private EntryRepository entryRepository;

    @GetMapping
    public List<Entry> getEntries() {
        return entryRepository.findAll();
    }

    @PostMapping
    public Entry addEntry(@RequestBody Entry entry, HttpServletRequest request) {
        // Extracting client's real IP address from X-Forwarded-For header
        String clientIp = getClientIP(request);
        entry.setIp(clientIp);
        return entryRepository.save(entry);
    }

    // Method to extract client's real IP address from X-Forwarded-For header
    private String getClientIP(HttpServletRequest request) {
        String xForwardedForHeader = request.getHeader("X-Forwarded-For");
        if (xForwardedForHeader != null && !xForwardedForHeader.isEmpty()) {
            // The first IP in the header is the client's real IP
            return xForwardedForHeader.split(",")[0];
        }
        // If X-Forwarded-For header is not present, fall back to remote address
        return request.getRemoteAddr();
    }
}
