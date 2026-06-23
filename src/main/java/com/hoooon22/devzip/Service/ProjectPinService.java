package com.hoooon22.devzip.Service;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hoooon22.devzip.Model.ProjectPin;
import com.hoooon22.devzip.Repository.ProjectPinRepository;

/**
 * 프로젝트(카드)별 고정(핀) 설정 서비스입니다.
 * 조회는 누구나 가능하며, 설정 변경은 관리자만 가능합니다(보안은 컨트롤러/시큐리티 계층에서 처리).
 */
@Service
public class ProjectPinService {

    private final ProjectPinRepository projectPinRepository;

    public ProjectPinService(ProjectPinRepository projectPinRepository) {
        this.projectPinRepository = projectPinRepository;
    }

    /**
     * 관리자가 설정한 고정 여부를 { projectKey: pinned } 형태로 반환합니다.
     * 행이 없는 프로젝트는 프론트에서 고정되지 않은 것으로 간주합니다.
     */
    @Transactional(readOnly = true)
    public Map<String, Boolean> getAllPins() {
        Map<String, Boolean> result = new LinkedHashMap<>();
        for (ProjectPin pin : projectPinRepository.findAll()) {
            result.put(pin.getProjectKey(), pin.isPinned());
        }
        return result;
    }

    /**
     * 해당 프로젝트의 고정 여부를 설정(upsert)하고 갱신된 값을 반환합니다.
     */
    @Transactional
    public boolean setPin(String projectKey, boolean pinned) {
        ProjectPin pin = projectPinRepository.findByProjectKey(projectKey)
                .orElseGet(() -> new ProjectPin(projectKey, pinned));
        pin.setPinned(pinned);
        projectPinRepository.save(pin);
        return pinned;
    }
}
