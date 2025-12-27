package com.hoooon22.devzip.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

import com.hoooon22.devzip.Exception.ErrorCode;
import com.hoooon22.devzip.Exception.TraceBoardException;
import com.hoooon22.devzip.Model.Entry;
import com.hoooon22.devzip.Model.common.ApiResponse;
import com.hoooon22.devzip.Service.EntryService;
import com.hoooon22.devzip.Service.WebhookService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080", "https://192.168.75.224", "http://192.168.75.224", "http://192.168.75.224:8080", "https://devzip.cloud", "http://devzip.cloud"})
@Slf4j
@RestController
@RequestMapping({"/api/entry", "/api/v1/entries"})
public class EntryController {

    @Autowired
    private EntryService entryService;

    @Autowired
    private WebhookService webhookService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Entry>>> getAllEntries() {
        try {
            List<Entry> entries = entryService.getAllEntries();
            log.info("방명록 전체 조회: {} 개", entries.size());
            return ResponseEntity.ok(ApiResponse.success(entries));
        } catch (Exception e) {
            log.error("방명록 전체 조회 중 오류 발생", e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "방명록 조회 중 오류가 발생했습니다", e);
        }
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Entry>> addEntry(@Valid @RequestBody Entry entry) {
        try {
            // 입력 데이터 검증
            if (entry.getName() == null || entry.getName().trim().isEmpty()) {
                log.warn("방명록 등록 실패: 이름이 비어있음");
                throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "이름을 입력해주세요");
            }
            
            if (entry.getContent() == null || entry.getContent().trim().isEmpty()) {
                log.warn("방명록 등록 실패: 내용이 비어있음");
                throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "내용을 입력해주세요");
            }
            
            if (entry.getName().length() > 100) {
                log.warn("방명록 등록 실패: 이름이 너무 김 - {} 글자", entry.getName().length());
                throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "이름은 100자 이하로 입력해주세요");
            }
            
            if (entry.getContent().length() > 1000) {
                log.warn("방명록 등록 실패: 내용이 너무 김 - {} 글자", entry.getContent().length());
                throw new TraceBoardException(ErrorCode.INVALID_INPUT_VALUE, "내용은 1000자 이하로 입력해주세요");
            }
            
            Entry savedEntry = entryService.addEntry(entry);
            log.info("방명록 등록 성공: ID={}, 이름={}", savedEntry.getId(), savedEntry.getName());

            // 웹훅 전송 (비동기)
            webhookService.sendEntryCreatedWebhook(savedEntry);

            return ResponseEntity.ok(ApiResponse.success(savedEntry));
        } catch (TraceBoardException e) {
            throw e; // TraceBoardException은 GlobalExceptionHandler에서 처리
        } catch (Exception e) {
            log.error("방명록 등록 중 오류 발생: name={}, content={}", 
                     entry != null ? entry.getName() : "null", 
                     entry != null ? entry.getContent() : "null", e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "방명록 저장 중 오류가 발생했습니다", e);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteEntry(@PathVariable Long id) {
        try {
            boolean deleted = entryService.deleteEntry(id);
            if (deleted) {
                log.info("방명록 삭제 성공: ID={}", id);

                // 웹훅 전송 (비동기)
                webhookService.sendEntryDeletedWebhook(id);

                return ResponseEntity.ok(ApiResponse.success("방명록이 삭제되었습니다"));
            } else {
                log.warn("방명록 삭제 실패: 권한 없음 또는 존재하지 않는 게시글 - ID={}", id);
                throw new TraceBoardException(ErrorCode.INSUFFICIENT_PERMISSIONS, "삭제 권한이 없거나 존재하지 않는 게시글입니다");
            }
        } catch (TraceBoardException e) {
            throw e;
        } catch (Exception e) {
            log.error("방명록 삭제 중 오류 발생: ID={}", id, e);
            throw new TraceBoardException(ErrorCode.INTERNAL_SERVER_ERROR, "방명록 삭제 중 오류가 발생했습니다", e);
        }
    }
}
