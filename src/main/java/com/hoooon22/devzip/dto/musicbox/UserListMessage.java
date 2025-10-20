package com.hoooon22.devzip.dto.musicbox;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 활성 사용자 목록 메시지 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserListMessage {

    /**
     * 활성 사용자명 목록
     */
    private List<String> users;

    /**
     * 총 사용자 수
     */
    private Integer totalCount;
}
