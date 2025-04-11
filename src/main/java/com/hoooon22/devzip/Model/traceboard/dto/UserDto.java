package com.hoooon22.devzip.Model.traceboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDto {
    private Long id;
    
    private String email;
    
    private String name;
    
    private String role;
    
    // 회원가입/수정 시 비밀번호
    private String password;
} 