package com.hoooon22.devzip.Controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/system")
public class SystemMetricsController {

    @GetMapping("/cpu")
    public ResponseEntity<Map<String, Object>> getSystemCpuUsage() {
        Map<String, Object> response = new HashMap<>();

        try {
            double cpuUsage = getSystemCpuUsagePercent();
            response.put("success", true);
            response.put("cpuUsage", cpuUsage);
            response.put("timestamp", System.currentTimeMillis());
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("cpuUsage", 0.0);
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/memory")
    public ResponseEntity<Map<String, Object>> getSystemMemoryUsage() {
        Map<String, Object> response = new HashMap<>();

        try {
            Map<String, Object> memoryInfo = getSystemMemoryInfo();
            response.put("success", true);
            response.putAll(memoryInfo);
            response.put("timestamp", System.currentTimeMillis());
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
        }

        return ResponseEntity.ok(response);
    }

    private double getSystemCpuUsagePercent() {
        try {
            String os = System.getProperty("os.name").toLowerCase();

            if (os.contains("linux") || os.contains("unix")) {
                return getLinuxCpuUsage();
            } else if (os.contains("mac")) {
                return getMacCpuUsage();
            } else if (os.contains("windows")) {
                return getWindowsCpuUsage();
            } else {
                // 운영체제를 특정할 수 없는 경우 JVM CPU 사용량 반환
                return ((com.sun.management.OperatingSystemMXBean) ManagementFactory
                        .getOperatingSystemMXBean()).getCpuLoad() * 100;
            }
        } catch (Exception e) {
            throw new RuntimeException("CPU 사용량을 가져올 수 없습니다: " + e.getMessage());
        }
    }

    private double getLinuxCpuUsage() throws Exception {
        // top 명령어로 실시간 CPU 사용량 측정
        ProcessBuilder pb = new ProcessBuilder("bash", "-c",
            "top -bn1 | grep 'Cpu(s)' | awk '{for(i=1;i<=NF;i++) if($i ~ /[0-9.]+%us/) {gsub(/%us/,\"\",$i); print $i}}'");

        Process process = pb.start();
        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        String result = reader.readLine();
        process.waitFor();

        if (result != null && !result.isEmpty()) {
            return Double.parseDouble(result.trim());
        }

        // 대안: vmstat 명령어 사용 (더 정확함)
        pb = new ProcessBuilder("bash", "-c",
            "vmstat 1 2 | tail -1 | awk '{print 100-$15}'");

        process = pb.start();
        reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        result = reader.readLine();
        process.waitFor();

        if (result != null && !result.isEmpty()) {
            return Double.parseDouble(result.trim());
        }

        // 최종 대안: sar 명령어
        pb = new ProcessBuilder("bash", "-c",
            "sar -u 1 1 | grep -v '^$' | tail -1 | awk '{print 100-$8}'");

        process = pb.start();
        reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        result = reader.readLine();
        process.waitFor();

        return result != null ? Double.parseDouble(result.trim()) : 0.0;
    }

    private double getMacCpuUsage() throws Exception {
        ProcessBuilder pb = new ProcessBuilder("bash", "-c",
            "top -l 1 -n 0 | grep 'CPU usage' | awk '{print $3}' | sed 's/%//'");

        Process process = pb.start();
        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        String result = reader.readLine();
        process.waitFor();

        return result != null ? Double.parseDouble(result.trim()) : 0.0;
    }

    private double getWindowsCpuUsage() throws Exception {
        ProcessBuilder pb = new ProcessBuilder("wmic", "cpu", "get", "loadpercentage", "/value");
        Process process = pb.start();
        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));

        String line;
        while ((line = reader.readLine()) != null) {
            if (line.startsWith("LoadPercentage=")) {
                String value = line.split("=")[1].trim();
                return Double.parseDouble(value);
            }
        }
        process.waitFor();

        return 0.0;
    }

    private Map<String, Object> getSystemMemoryInfo() throws Exception {
        Map<String, Object> memoryInfo = new HashMap<>();

        String os = System.getProperty("os.name").toLowerCase();

        if (os.contains("linux") || os.contains("unix")) {
            return getLinuxMemoryInfo();
        } else if (os.contains("mac")) {
            return getMacMemoryInfo();
        } else if (os.contains("windows")) {
            return getWindowsMemoryInfo();
        } else {
            // JVM 메모리 정보
            Runtime runtime = Runtime.getRuntime();
            long totalMemory = runtime.totalMemory();
            long freeMemory = runtime.freeMemory();
            long usedMemory = totalMemory - freeMemory;

            memoryInfo.put("totalMemory", totalMemory);
            memoryInfo.put("usedMemory", usedMemory);
            memoryInfo.put("freeMemory", freeMemory);
            memoryInfo.put("memoryUsage", (double) usedMemory / totalMemory * 100);

            return memoryInfo;
        }
    }

    private Map<String, Object> getLinuxMemoryInfo() throws Exception {
        Map<String, Object> memoryInfo = new HashMap<>();

        ProcessBuilder pb = new ProcessBuilder("bash", "-c",
            "free -b | grep '^Mem:' | awk '{print $2,$3,$7}'");

        Process process = pb.start();
        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        String result = reader.readLine();
        process.waitFor();

        if (result != null) {
            String[] parts = result.trim().split("\\s+");
            long total = Long.parseLong(parts[0]);
            long used = Long.parseLong(parts[1]);
            long available = Long.parseLong(parts[2]);

            memoryInfo.put("totalMemory", total);
            memoryInfo.put("usedMemory", used);
            memoryInfo.put("availableMemory", available);
            memoryInfo.put("memoryUsage", (double) used / total * 100);
        }

        return memoryInfo;
    }

    private Map<String, Object> getMacMemoryInfo() throws Exception {
        Map<String, Object> memoryInfo = new HashMap<>();

        // macOS의 경우 vm_stat 명령어 사용
        ProcessBuilder pb = new ProcessBuilder("bash", "-c",
            "vm_stat | grep -E '(Pages free|Pages active|Pages inactive|Pages speculative|Pages wired down)' | awk '{print $3}' | sed 's/\\.//'");

        Process process = pb.start();
        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));

        // 간단한 메모리 정보 (실제로는 더 복잡한 계산이 필요)
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;

        memoryInfo.put("totalMemory", totalMemory);
        memoryInfo.put("usedMemory", usedMemory);
        memoryInfo.put("freeMemory", freeMemory);
        memoryInfo.put("memoryUsage", (double) usedMemory / totalMemory * 100);

        return memoryInfo;
    }

    private Map<String, Object> getWindowsMemoryInfo() throws Exception {
        Map<String, Object> memoryInfo = new HashMap<>();

        // Windows의 경우 wmic 명령어 사용
        ProcessBuilder pb = new ProcessBuilder("wmic", "OS", "get", "TotalVisibleMemorySize,FreePhysicalMemory", "/value");
        Process process = pb.start();
        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));

        long totalMemory = 0;
        long freeMemory = 0;

        String line;
        while ((line = reader.readLine()) != null) {
            if (line.startsWith("TotalVisibleMemorySize=")) {
                totalMemory = Long.parseLong(line.split("=")[1].trim()) * 1024; // KB to Bytes
            } else if (line.startsWith("FreePhysicalMemory=")) {
                freeMemory = Long.parseLong(line.split("=")[1].trim()) * 1024; // KB to Bytes
            }
        }
        process.waitFor();

        long usedMemory = totalMemory - freeMemory;

        memoryInfo.put("totalMemory", totalMemory);
        memoryInfo.put("usedMemory", usedMemory);
        memoryInfo.put("freeMemory", freeMemory);
        memoryInfo.put("memoryUsage", totalMemory > 0 ? (double) usedMemory / totalMemory * 100 : 0);

        return memoryInfo;
    }
}