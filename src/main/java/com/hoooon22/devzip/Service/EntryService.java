package com.hoooon22.devzip.Service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hoooon22.devzip.Model.Entry;
import com.hoooon22.devzip.Repository.EntryRepository; // Jakarta EE의 HttpServletRequest 임포트

import jakarta.annotation.Resource; // Jakarta EE의 @Resource 임포트
import jakarta.servlet.http.HttpServletRequest;

@Service
public class EntryService {

    @Autowired
    private EntryRepository entryRepository;

    @Resource
    private HttpServletRequest request; // Jakarta EE의 HttpServletRequest 주입

    @Transactional(readOnly = true)
    public List<Entry> getAllEntries() {
        return entryRepository.findAll();
    }

    @Transactional
    public Entry addEntry(Entry entry) {
        // 클라이언트의 실제 IP 가져오기
        String clientIp = getClientIp();
        
        // IP와 함께 엔트리에 저장
        entry.setIp(clientIp);

        return entryRepository.save(entry);
    }

    private String getClientIp() {
        String xForwardedForHeader = request.getHeader("X-Forwarded-For");
        if (xForwardedForHeader != null && !xForwardedForHeader.isEmpty()) {
            // X-Forwarded-For 헤더에서 실제 클라이언트 IP 추출
            return xForwardedForHeader.split(",")[0].trim();
        } else {
            // X-Forwarded-For 헤더가 없을 경우, 기본적으로 RemoteAddr 사용
            return request.getRemoteAddr();
        }
    }
}
