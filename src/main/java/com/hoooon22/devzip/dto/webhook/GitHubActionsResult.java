package com.hoooon22.devzip.dto.webhook;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * GitHub Actions 워크플로우 실행 결과
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GitHubActionsResult {

    /**
     * 워크플로우 이름
     */
    @JsonProperty("workflow_name")
    private String workflowName;

    /**
     * 실행 상태 (success, failure, cancelled)
     */
    private String status;

    /**
     * 저장소 전체 이름 (예: "hoooon22/devzip")
     */
    @JsonProperty("repository")
    private String repository;

    /**
     * 브랜치 이름
     */
    private String branch;

    /**
     * 커밋 SHA (짧은 버전)
     */
    @JsonProperty("commit_sha")
    private String commitSha;

    /**
     * 커밋 메시지
     */
    @JsonProperty("commit_message")
    private String commitMessage;

    /**
     * 커밋 작성자
     */
    private String author;

    /**
     * 워크플로우 실행 번호
     */
    @JsonProperty("run_number")
    private String runNumber;

    /**
     * 워크플로우 실행 URL
     */
    @JsonProperty("run_url")
    private String runUrl;

    /**
     * 실패 이유 (실패한 경우에만)
     */
    @JsonProperty("failure_reason")
    private String failureReason;

    /**
     * 실패한 Job 이름 (실패한 경우에만)
     */
    @JsonProperty("failed_job")
    private String failedJob;

    /**
     * 이벤트 발생 시간
     */
    private LocalDateTime timestamp;

    /**
     * 배포 환경
     */
    private String environment;
}
