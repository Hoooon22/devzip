package com.hoooon22.devzip.Config;

import com.hoooon22.devzip.Model.User;
import com.hoooon22.devzip.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * 애플리케이션 시작 시 기본 데이터를 초기화하는 컴포넌트
 * 보안을 위해 환경변수로 관리자 정보를 설정할 수 있음
 */
@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // 환경변수에서 관리자 정보를 가져옴 (없으면 기본값 사용)
    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.email:admin@devzip.site}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    @Value("${app.admin.auto-create:true}")
    private boolean autoCreateAdmin;

    @Override
    public void run(String... args) throws Exception {
        if (autoCreateAdmin) {
            createDefaultAdminIfNotExists();
        }
    }

    private void createDefaultAdminIfNotExists() {
        // 관리자 계정이 이미 존재하는지 확인
        if (userRepository.existsByUsername(adminUsername)) {
            // 기존 admin 계정 비밀번호 업데이트
            updateAdminPasswordIfNeeded();
            return;
        }

        // ADMIN 역할을 가진 사용자가 있는지 확인
        if (userRepository.existsByRole(User.Role.ADMIN)) {
            System.out.println("✅ 다른 관리자 계정이 이미 존재합니다.");
            return;
        }

        String finalPassword;
        boolean isGeneratedPassword = false;

        // 비밀번호가 환경변수에 설정되지 않은 경우 임시 비밀번호 생성
        if (adminPassword == null || adminPassword.trim().isEmpty()) {
            finalPassword = generateSecurePassword();
            isGeneratedPassword = true;
        } else {
            finalPassword = adminPassword;
        }

        try {
            // 관리자 계정 생성
            User admin = new User();
            admin.setUsername(adminUsername);
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode(finalPassword));
            admin.setRole(User.Role.ADMIN);
            admin.setActive(true);
            
            userRepository.save(admin);
            
            System.out.println("🎉 기본 관리자 계정이 생성되었습니다!");
            System.out.println("📧 이메일: " + adminEmail);
            System.out.println("👤 사용자명: " + adminUsername);
            
            if (isGeneratedPassword) {
                System.out.println("🔑 임시 비밀번호: " + finalPassword);
                System.out.println("⚠️  보안을 위해 첫 로그인 후 반드시 비밀번호를 변경하세요!");
                System.out.println("💡 환경변수를 설정하여 원하는 비밀번호를 사용할 수 있습니다:");
                System.out.println("   APP_ADMIN_USERNAME=원하는사용자명");
                System.out.println("   APP_ADMIN_PASSWORD=원하는비밀번호");
                System.out.println("   APP_ADMIN_EMAIL=이메일주소");
            } else {
                System.out.println("🔑 환경변수로 설정된 비밀번호가 사용되었습니다.");
            }
            
        } catch (Exception e) {
            System.err.println("❌ 관리자 계정 생성 실패: " + e.getMessage());
        }
    }

    /**
     * 보안이 강화된 임시 비밀번호 생성
     * 대소문자, 숫자, 특수문자를 포함한 12자리 비밀번호
     */
    private String generateSecurePassword() {
        String uuid = UUID.randomUUID().toString().replace("-", "");
        StringBuilder password = new StringBuilder();
        
        // 각 카테고리에서 최소 하나씩 포함하여 보안 강화
        password.append("Admin"); // 대문자 시작
        password.append(uuid.substring(0, 4)); // 소문자+숫자 혼합
        password.append("@"); // 특수문자
        password.append(uuid.substring(4, 6).toUpperCase()); // 대문자
        password.append("!"); // 특수문자
        
        return password.toString();
    }

    /**
     * 기존 admin 계정의 비밀번호를 환경변수 설정에 따라 업데이트
     */
    private void updateAdminPasswordIfNeeded() {
        // 환경변수에 비밀번호가 명시적으로 설정된 경우에만 업데이트
        if (adminPassword != null && !adminPassword.trim().isEmpty()) {
            try {
                Optional<User> adminOpt = userRepository.findByUsername(adminUsername);
                if (adminOpt.isPresent()) {
                    User admin = adminOpt.get();
                    String encodedPassword = passwordEncoder.encode(adminPassword);
                    admin.setPassword(encodedPassword);
                    userRepository.save(admin);
                    System.out.println("🔄 관리자 계정 비밀번호가 업데이트되었습니다: " + adminUsername);
                }
            } catch (Exception e) {
                System.err.println("❌ 관리자 계정 비밀번호 업데이트 실패: " + e.getMessage());
            }
        } else {
            System.out.println("✅ 관리자 계정이 이미 존재합니다: " + adminUsername);
        }
    }
}