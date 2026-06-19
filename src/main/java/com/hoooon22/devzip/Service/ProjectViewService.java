package com.hoooon22.devzip.Service;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hoooon22.devzip.Model.ProjectView;
import com.hoooon22.devzip.Repository.ProjectViewRepository;

/**
 * 프로젝트(카드)별 조회수 집계 서비스입니다.
 * 로그인 여부와 무관하게 동작합니다.
 */
@Service
public class ProjectViewService {

    private static final Logger logger = LoggerFactory.getLogger(ProjectViewService.class);

    private final ProjectViewRepository projectViewRepository;

    public ProjectViewService(ProjectViewRepository projectViewRepository) {
        this.projectViewRepository = projectViewRepository;
    }

    /**
     * 전체 프로젝트의 조회수를 { projectKey: viewCount } 형태로 반환합니다.
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getAllViewCounts() {
        Map<String, Long> result = new LinkedHashMap<>();
        for (ProjectView view : projectViewRepository.findAll()) {
            result.put(view.getProjectKey(), view.getViewCount());
        }
        return result;
    }

    /**
     * 해당 프로젝트의 조회수를 1 증가시키고 갱신된 값을 반환합니다.
     * 행이 없으면 새로 생성하며, 동시 생성 충돌은 재시도로 처리합니다.
     */
    @Transactional
    public long incrementAndGet(String projectKey) {
        int updated = projectViewRepository.incrementViewCount(projectKey);
        if (updated == 0) {
            try {
                projectViewRepository.save(new ProjectView(projectKey, 1L));
                return 1L;
            } catch (DataIntegrityViolationException e) {
                // 동시 요청이 먼저 행을 생성한 경우: 다시 증가시킨다.
                logger.debug("조회수 행 동시 생성 충돌, 재증가 처리: key={}", projectKey);
                projectViewRepository.incrementViewCount(projectKey);
            }
        }
        return projectViewRepository.findByProjectKey(projectKey)
                .map(ProjectView::getViewCount)
                .orElse(0L);
    }
}
