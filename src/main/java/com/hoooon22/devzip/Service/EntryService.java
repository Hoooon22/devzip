package com.hoooon22.devzip.Service;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hoooon22.devzip.Model.Entry;
import com.hoooon22.devzip.Repository.EntryRepository;

import jakarta.servlet.http.HttpServletRequest;

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

        // isEmpty?
        if (entries.isEmpty()) {
            logger.info("No entries found");
        } else {
            logger.info("Found {} entries", entries.size());
        }

        // IP를 기반으로 색상 설정
        for (Entry entry : entries) {
            String color = getColorFromIp(entry.getIp());
            entry.setColor(color);
        }
        return entries;
    }

    @Transactional
    public Entry addEntry(Entry entry) {
        try {
            String clientIp = getClientIp();
            entry.setIp(clientIp);
            
            // IP를 기반으로 색상 설정
            String color = getColorFromIp(clientIp);
            entry.setColor(color);
            
            // 현재 날짜와 시간 설정
            entry.setCreateDate(LocalDateTime.now());

            logger.info("방명록 등록 시작 - 이름: {}, IP: {}, 색상: {}", entry.getName(), clientIp, color);
            Entry savedEntry = entryRepository.save(entry);

            logger.info("방명록 등록 성공 - ID: {}, 이름: {}, 시간: {}", 
                       savedEntry.getId(), savedEntry.getName(), savedEntry.getCreateDate());
            return savedEntry;
        } catch (Exception e) {
            logger.error("방명록 저장 중 데이터베이스 오류 발생 - 이름: {}, 내용: {}", 
                        entry.getName(), entry.getContent(), e);
            throw e; // 상위 컨트롤러에서 TraceBoardException으로 변환
        }
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
