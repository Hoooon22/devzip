package com.hoooon22.devzip.Model.common;

import lombok.Builder;
import lombok.Getter;
import org.springframework.data.domain.Page;

/**
 * 페이징 정보
 */
@Getter
@Builder
public class PageInfo {
    
    /**
     * 현재 페이지 번호 (0부터 시작)
     */
    private final int page;
    
    /**
     * 페이지 크기
     */
    private final int size;
    
    /**
     * 전체 요소 수
     */
    private final long totalElements;
    
    /**
     * 전체 페이지 수
     */
    private final int totalPages;
    
    /**
     * 첫 번째 페이지 여부
     */
    private final boolean first;
    
    /**
     * 마지막 페이지 여부
     */
    private final boolean last;
    
    /**
     * 다음 페이지 존재 여부
     */
    private final boolean hasNext;
    
    /**
     * 이전 페이지 존재 여부
     */
    private final boolean hasPrevious;
    
    /**
     * Spring Data Page 객체에서 PageInfo 생성
     */
    public static PageInfo from(Page<?> page) {
        return PageInfo.builder()
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .hasNext(page.hasNext())
                .hasPrevious(page.hasPrevious())
                .build();
    }
}