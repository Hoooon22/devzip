// EntryService.java
package com.hoooon22.devzip.Service;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hoooon22.devzip.Model.Entry;
import com.hoooon22.devzip.Repository.EntryRepository;

import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;

@Service
public class EntryService {

    private static final Logger logger = LoggerFactory.getLogger(EntryService.class);

    @Autowired
    private EntryRepository entryRepository;

    @Resource
    private HttpServletRequest request;

    @Transactional(readOnly = true)
    public List<Entry> getAllEntries() {
        logger.debug("Fetching all entries from the database");
        return entryRepository.findAll();
    }

    @Transactional
    public Entry addEntry(Entry entry) {
        String clientIp = getClientIp();
        entry.setIp(clientIp);

        logger.debug("Adding new entry: {}", entry);
        Entry savedEntry = entryRepository.save(entry);

        logger.debug("Entry added successfully: {}", savedEntry);
        return savedEntry;
    }

    private String getClientIp() {
        String xForwardedForHeader = request.getHeader("X-Forwarded-For");
        if (xForwardedForHeader != null && !xForwardedForHeader.isEmpty()) {
            return xForwardedForHeader.split(",")[0].trim();
        } else {
            return request.getRemoteAddr();
        }
    }
}
