package com.hoooon22.devzip.Security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class DataEncryptionUtil {
    
    private static final Logger log = LoggerFactory.getLogger(DataEncryptionUtil.class);

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 16;

    @Value("${app.encryption.secret-key:MySecretKey123456789012345678901234567890}")
    private String secretKey;

    @Value("${app.encryption.salt:TraceBoard2024Salt}")
    private String salt;

    /**
     * IP 주소를 SHA-256으로 해싱 (단방향)
     */
    public String hashIpAddress(String ipAddress) {
        if (ipAddress == null || ipAddress.trim().isEmpty()) {
            return "unknown";
        }

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String saltedIp = ipAddress + salt;
            byte[] hash = digest.digest(saltedIp.getBytes(StandardCharsets.UTF_8));
            
            // 해시값의 앞 8바이트만 사용하여 짧은 해시 생성
            byte[] shortHash = new byte[8];
            System.arraycopy(hash, 0, shortHash, 0, 8);
            
            return Base64.getUrlEncoder().withoutPadding().encodeToString(shortHash);
        } catch (Exception e) {
            log.error("IP 주소 해싱 중 오류 발생", e);
            return "hash_error";
        }
    }

    /**
     * 사용자 에이전트 정보를 암호화 (양방향, 필요시 복호화 가능)
     */
    public String encryptUserAgent(String userAgent) {
        if (userAgent == null || userAgent.trim().isEmpty()) {
            return null;
        }

        try {
            SecretKeySpec keySpec = new SecretKeySpec(
                getAESKey(secretKey.getBytes(StandardCharsets.UTF_8)), ALGORITHM);
            
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            
            // IV 생성
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH * 8, iv);
            
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, parameterSpec);
            
            byte[] encryptedData = cipher.doFinal(userAgent.getBytes(StandardCharsets.UTF_8));
            
            // IV + 암호화된 데이터를 함께 저장
            byte[] encryptedWithIv = new byte[GCM_IV_LENGTH + encryptedData.length];
            System.arraycopy(iv, 0, encryptedWithIv, 0, GCM_IV_LENGTH);
            System.arraycopy(encryptedData, 0, encryptedWithIv, GCM_IV_LENGTH, encryptedData.length);
            
            return Base64.getEncoder().encodeToString(encryptedWithIv);
        } catch (Exception e) {
            log.error("사용자 에이전트 암호화 중 오류 발생", e);
            return userAgent; // 암호화 실패 시 원본 반환 (임시)
        }
    }

    /**
     * 암호화된 사용자 에이전트 복호화
     */
    public String decryptUserAgent(String encryptedUserAgent) {
        if (encryptedUserAgent == null || encryptedUserAgent.trim().isEmpty()) {
            return null;
        }

        try {
            byte[] encryptedWithIv = Base64.getDecoder().decode(encryptedUserAgent);
            
            // IV 추출
            byte[] iv = new byte[GCM_IV_LENGTH];
            System.arraycopy(encryptedWithIv, 0, iv, 0, GCM_IV_LENGTH);
            
            // 암호화된 데이터 추출
            byte[] encryptedData = new byte[encryptedWithIv.length - GCM_IV_LENGTH];
            System.arraycopy(encryptedWithIv, GCM_IV_LENGTH, encryptedData, 0, encryptedData.length);
            
            SecretKeySpec keySpec = new SecretKeySpec(
                getAESKey(secretKey.getBytes(StandardCharsets.UTF_8)), ALGORITHM);
            
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH * 8, iv);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, parameterSpec);
            
            byte[] decryptedData = cipher.doFinal(encryptedData);
            return new String(decryptedData, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("사용자 에이전트 복호화 중 오류 발생", e);
            return encryptedUserAgent; // 복호화 실패 시 원본 반환
        }
    }

    /**
     * 사용자 ID를 부분적으로 마스킹 (표시용)
     */
    public String maskUserId(String userId) {
        if (userId == null || userId.trim().isEmpty() || "anonymous".equals(userId)) {
            return "anonymous";
        }

        if (userId.length() <= 3) {
            return "*".repeat(userId.length());
        }

        // 앞 2자리 + 마스킹 + 뒤 1자리
        String prefix = userId.substring(0, 2);
        String suffix = userId.substring(userId.length() - 1);
        int maskLength = Math.min(userId.length() - 3, 8); // 최대 8자리 마스킹
        
        return prefix + "*".repeat(maskLength) + suffix;
    }

    /**
     * 32바이트 AES 키 생성
     */
    private byte[] getAESKey(byte[] key) throws Exception {
        MessageDigest sha = MessageDigest.getInstance("SHA-256");
        return sha.digest(key);
    }
}