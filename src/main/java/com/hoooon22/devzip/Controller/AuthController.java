package com.hoooon22.devzip.Controller;

import com.hoooon22.devzip.Model.JwtResponse;
import com.hoooon22.devzip.Model.LoginRequest;
import com.hoooon22.devzip.Model.User;
import com.hoooon22.devzip.Repository.UserRepository;
import com.hoooon22.devzip.Service.JwtUtils;
import com.hoooon22.devzip.Service.UserDetailsServiceImpl;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    @Autowired
    AuthenticationManager authenticationManager;
    
    @Autowired
    UserRepository userRepository;
    
    @Autowired
    PasswordEncoder encoder;
    
    @Autowired
    JwtUtils jwtUtils;
    
    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));
        
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(loginRequest.getUsername(), 
            authentication.getAuthorities().iterator().next().getAuthority());
        
        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        
        return ResponseEntity.ok(new JwtResponse(jwt, 
                                               userPrincipal.getUsername(),
                                               userPrincipal.getEmail(),
                                               authentication.getAuthorities().iterator().next().getAuthority()));
    }
    
    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("오류: 사용자명이 이미 사용 중입니다!"));
        }
        
        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("오류: 이메일이 이미 사용 중입니다!"));
        }
        
        // 새 사용자 계정 생성
        User user = User.builder()
                .username(signUpRequest.getUsername())
                .email(signUpRequest.getEmail())
                .password(encoder.encode(signUpRequest.getPassword()))
                .role(User.Role.USER) // 기본값은 USER
                .active(true)
                .build();
        
        userRepository.save(user);
        
        return ResponseEntity.ok(new MessageResponse("사용자가 성공적으로 등록되었습니다!"));
    }
    
    @PostMapping("/admin/create-user")
    public ResponseEntity<?> createAdminUser(@Valid @RequestBody AdminCreateUserRequest request,
                                           @RequestHeader("Authorization") String token) {
        try {
            // JWT 토큰 검증 및 관리자 권한 확인
            if (!token.startsWith("Bearer ")) {
                return ResponseEntity.badRequest().body(new MessageResponse("유효하지 않은 토큰 형식입니다."));
            }
            
            String jwt = token.substring(7);
            if (!jwtUtils.validateJwtToken(jwt)) {
                return ResponseEntity.badRequest().body(new MessageResponse("유효하지 않은 토큰입니다."));
            }
            
            String role = jwtUtils.getRoleFromJwtToken(jwt);
            if (!"ROLE_ADMIN".equals(role)) {
                return ResponseEntity.badRequest().body(new MessageResponse("관리자 권한이 필요합니다."));
            }
            
            // 사용자명 및 이메일 중복 검사
            if (userRepository.existsByUsername(request.getUsername())) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("오류: 사용자명이 이미 사용 중입니다!"));
            }
            
            if (userRepository.existsByEmail(request.getEmail())) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("오류: 이메일이 이미 사용 중입니다!"));
            }
            
            // 새 사용자 계정 생성 (관리자가 지정한 역할로)
            User.Role userRole;
            try {
                userRole = User.Role.valueOf(request.getRole().toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("유효하지 않은 역할입니다. USER 또는 ADMIN을 사용하세요."));
            }
            
            User user = User.builder()
                    .username(request.getUsername())
                    .email(request.getEmail())
                    .password(encoder.encode(request.getPassword()))
                    .role(userRole)
                    .active(true)
                    .build();
            
            userRepository.save(user);
            
            return ResponseEntity.ok(new MessageResponse(
                String.format("%s 권한을 가진 사용자 '%s'가 성공적으로 생성되었습니다!", 
                    userRole.name(), request.getUsername())));
                    
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse("사용자 생성 중 오류가 발생했습니다."));
        }
    }

    @GetMapping("/validate")
    public ResponseEntity<?> validateToken(@RequestHeader("Authorization") String token) {
        try {
            if (token.startsWith("Bearer ")) {
                String jwt = token.substring(7);
                if (jwtUtils.validateJwtToken(jwt)) {
                    String username = jwtUtils.getUsernameFromJwtToken(jwt);
                    String role = jwtUtils.getRoleFromJwtToken(jwt);
                    return ResponseEntity.ok(new TokenValidationResponse(true, username, role));
                }
            }
            return ResponseEntity.ok(new TokenValidationResponse(false, null, null));
        } catch (Exception e) {
            return ResponseEntity.ok(new TokenValidationResponse(false, null, null));
        }
    }
    
    // Inner classes for DTOs
    public static class AdminCreateUserRequest {
        private String username;
        private String email;
        private String password;
        private String role; // USER 또는 ADMIN
        
        // getters and setters
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
    }
    
    public static class SignupRequest {
        private String username;
        private String email;
        private String password;
        
        // getters and setters
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }
    
    public static class MessageResponse {
        private String message;
        
        public MessageResponse(String message) {
            this.message = message;
        }
        
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }
    
    public static class TokenValidationResponse {
        private boolean valid;
        private String username;
        private String role;
        
        public TokenValidationResponse(boolean valid, String username, String role) {
            this.valid = valid;
            this.username = username;
            this.role = role;
        }
        
        // getters and setters
        public boolean isValid() { return valid; }
        public void setValid(boolean valid) { this.valid = valid; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
    }
}