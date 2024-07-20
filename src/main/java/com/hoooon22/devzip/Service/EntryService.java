package com.hoooon22.devzip.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hoooon22.devzip.Model.Entry;
import com.hoooon22.devzip.Repository.EntryRepository;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class EntryService {

    private static final Logger logger = LoggerFactory.getLogger(EntryService.class);

    @Autowired
    private EntryRepository entryRepository;

    @Autowired
    private HttpServletRequest request;

    @Transactional(readOnly = true)
    public List<Entry> getAllEntries() {
        logger.debug("Fetching all entries from the database");
        List<Entry> entries = entryRepository.findAll();
        // IP를 기반으로 색상 설정
        for (Entry entry : entries) {
            String color = getColorFromIp(entry.getIp());
            entry.setColor(color);
        }
        return entries;
    }

    @Transactional
    public Entry addEntry(Entry entry) {
        String clientIp = getClientIp();
        entry.setIp(clientIp);
        // IP를 기반으로 색상 설정
        String color = getColorFromIp(clientIp);
        entry.setColor(color);
        
        // 현재 날짜와 시간 설정
        entry.setCreateDate(LocalDateTime.now());

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

    private String getColorFromIp(String ip) {
        // IP를 해시하여 색상 생성
        int hash = ip.hashCode();
        int red = (hash & 0xFF0000) >> 16;
        int green = (hash & 0x00FF00) >> 8;
        int blue = hash & 0x0000FF;
        return String.format("#%02x%02x%02x", red, green, blue);
    }
}
