# Webhook Guide

DevZip 프로젝트의 웹훅 기능 가이드입니다.

## 기능 개요

### 1. 방명록(Entry) 웹훅
- **방명록 등록 이벤트**: 새로운 방명록이 등록되면 `entry.created` 이벤트 전송
- **방명록 삭제 이벤트**: 방명록이 삭제되면 `entry.deleted` 이벤트 전송
- **비동기 전송**: 웹훅 전송은 비동기로 처리되어 방명록 등록/삭제 성능에 영향을 주지 않음

### 2. GitHub Actions 웹훅
- **배포 성공 알림**: CI/CD 파이프라인 성공 시 자동 알림
- **배포 실패 알림**: CI/CD 파이프라인 실패 시 실패 원인과 함께 알림
- **실시간 모니터링**: 배포 상태를 실시간으로 추적

## 설정 방법

### 1. application.properties 설정

```properties
# 웹훅 활성화
webhook.entry.enabled=true

# 웹훅 URL 설정 (실제 수신할 URL로 변경)
webhook.entry.url=https://your-webhook-receiver.com/api/webhook
```

또는 환경 변수로 설정:

```bash
export WEBHOOK_ENTRY_ENABLED=true
export WEBHOOK_ENTRY_URL=https://your-webhook-receiver.com/api/webhook
```

### 2. 웹훅 페이로드 형식

#### entry.created (방명록 등록)

```json
{
  "eventType": "entry.created",
  "timestamp": "2024-01-15T10:30:00",
  "site": "devzip.cloud",
  "entry": {
    "id": 123,
    "name": "홍길동",
    "content": "안녕하세요!",
    "color": "#FF5733",
    "createDate": "2024-01-15T10:30:00"
  }
}
```

#### entry.deleted (방명록 삭제)

```json
{
  "eventType": "entry.deleted",
  "timestamp": "2024-01-15T10:35:00",
  "site": "devzip.cloud",
  "entry": {
    "id": 123
  }
}
```

## 테스트 방법

### 1. 내장 테스트 엔드포인트 사용

프로젝트에는 테스트용 웹훅 수신 엔드포인트가 포함되어 있습니다.

```properties
# application.properties에 설정
webhook.entry.enabled=true
webhook.entry.url=http://localhost:8080/api/webhook/test
```

### 2. 애플리케이션 실행

```bash
./gradlew bootRun
```

### 3. 방명록 등록 테스트

```bash
curl -X POST http://localhost:8080/api/entry \
  -H "Content-Type: application/json" \
  -d '{
    "name": "테스트 사용자",
    "content": "웹훅 테스트입니다",
    "color": "#FF5733"
  }'
```

### 4. 로그 확인

애플리케이션 로그에서 다음과 같은 메시지를 확인할 수 있습니다:

```
=== 웹훅 수신 시작 ===
이벤트 타입: entry.created
타임스탬프: 2024-01-15T10:30:00
사이트: devzip.cloud
방명록 ID: 123
작성자: 테스트 사용자
내용: 웹훅 테스트입니다
색상: #FF5733
작성일: 2024-01-15T10:30:00
=== 웹훅 수신 완료 ===
```

## 외부 웹훅 서비스 연동

### Webhook.site 사용

1. [https://webhook.site](https://webhook.site) 접속
2. 생성된 고유 URL 복사
3. application.properties에 설정:

```properties
webhook.entry.enabled=true
webhook.entry.url=https://webhook.site/your-unique-id
```

### Discord Webhook

1. Discord 서버 설정 > 연동 > 웹후크 생성
2. 웹후크 URL 복사
3. Discord 형식으로 변환하는 중간 서버 필요 (페이로드 형식이 다름)

### Slack Webhook

1. Slack App 생성 및 Incoming Webhook 활성화
2. Webhook URL 복사
3. Slack 형식으로 변환하는 중간 서버 필요

## API 엔드포인트

### 웹훅 테스트 엔드포인트

- **URL**: `POST /api/webhook/test`
- **설명**: 웹훅을 수신하여 로그로 출력하는 테스트용 엔드포인트
- **Content-Type**: `application/json`
- **인증**: 불필요 (테스트용)

## 보안 고려사항

현재 버전에서는 기본적인 웹훅 전송만 지원합니다. 프로덕션 환경에서는 다음 사항을 고려하세요:

1. **HTTPS 사용**: 웹훅 URL은 HTTPS를 사용하는 것을 권장
2. **인증 추가**: 향후 버전에서 HMAC 서명 또는 토큰 기반 인증 추가 예정
3. **재시도 로직**: 현재는 1회만 전송, 실패 시 재시도 없음
4. **Rate Limiting**: 과도한 웹훅 전송 방지 로직 추가 권장

## 로그 레벨 설정

웹훅 관련 로그를 자세히 보려면:

```properties
logging.level.com.hoooon22.devzip.Service.WebhookService=DEBUG
```

## 문제 해결

### 웹훅이 전송되지 않음

1. `webhook.entry.enabled=true` 설정 확인
2. `webhook.entry.url` 설정 확인
3. 애플리케이션 로그에서 오류 메시지 확인
4. 방화벽/네트워크 설정 확인

### 웹훅 수신 서버 응답 없음

1. 수신 서버가 정상 동작하는지 확인
2. URL이 올바른지 확인
3. CORS 설정 확인 (필요한 경우)

## 확장 방법

### 커스텀 웹훅 URL 추가

여러 웹훅 URL로 전송하려면 `WebhookService.java`를 수정하여 URL 목록을 관리할 수 있습니다.

### 웹훅 페이로드 커스터마이징

`WebhookEntryPayload.java`에서 필드를 추가/제거할 수 있습니다.

### 다른 이벤트 추가

다른 엔티티(예: 댓글, 좋아요)에 대한 웹훅도 동일한 패턴으로 추가할 수 있습니다.

---

## GitHub Actions 웹훅

### 개요

GitHub Actions 워크플로우가 완료되면 자동으로 배포 결과를 서버로 전송합니다.

### 페이로드 형식

#### 배포 성공

```json
{
  "workflow_name": "DevZip CI/CD Pipeline (Optimized)",
  "status": "success",
  "repository": "hoooon22/devzip",
  "branch": "master",
  "commit_sha": "abc1234",
  "commit_message": "Fix bug in authentication",
  "author": "hoooon22",
  "run_number": "123",
  "run_url": "https://github.com/hoooon22/devzip/actions/runs/12345",
  "timestamp": "2024-01-15T10:30:00",
  "environment": "production"
}
```

#### 배포 실패

```json
{
  "workflow_name": "DevZip CI/CD Pipeline (Optimized)",
  "status": "failure",
  "repository": "hoooon22/devzip",
  "branch": "master",
  "commit_sha": "abc1234",
  "commit_message": "Fix bug in authentication",
  "author": "hoooon22",
  "run_number": "123",
  "run_url": "https://github.com/hoooon22/devzip/actions/runs/12345",
  "failed_job": "Health Check & Verification",
  "failure_reason": "Health check or deployment verification failed",
  "timestamp": "2024-01-15T10:30:00",
  "environment": "production"
}
```

### 엔드포인트

- **URL**: `POST /api/webhook/github-actions`
- **Content-Type**: `application/json`
- **인증**: 불필요 (내부 시스템용)

### 구현 방식

GitHub Actions 워크플로우 파일(`.github/workflows/deploy.yml`)에서 직접 웹훅을 호출합니다:

```yaml
- name: Send Success Webhook
  if: success()
  run: |
    curl -X POST https://devzip.cloud/api/webhook/github-actions \
      -H "Content-Type: application/json" \
      -d '{...}'

- name: Send Failure Webhook
  if: failure()
  run: |
    curl -X POST https://devzip.cloud/api/webhook/github-actions \
      -H "Content-Type: application/json" \
      -d '{...}'
```

### 로그 확인

배포가 완료되면 애플리케이션 로그에서 다음과 같은 메시지를 확인할 수 있습니다:

#### 성공 시
```
=== GitHub Actions 웹훅 수신 시작 ===
워크플로우: DevZip CI/CD Pipeline (Optimized)
상태: success
저장소: hoooon22/devzip
브랜치: master
커밋 SHA: abc1234
커밋 메시지: Fix bug in authentication
작성자: hoooon22
실행 번호: 123
실행 URL: https://github.com/hoooon22/devzip/actions/runs/12345
환경: production
타임스탬프: 2024-01-15T10:30:00
✅ 배포 성공!
=== GitHub Actions 웹훅 수신 완료 ===
```

#### 실패 시
```
=== GitHub Actions 웹훅 수신 시작 ===
워크플로우: DevZip CI/CD Pipeline (Optimized)
상태: failure
저장소: hoooon22/devzip
브랜치: master
커밋 SHA: abc1234
커밋 메시지: Fix bug in authentication
작성자: hoooon22
실행 번호: 123
실행 URL: https://github.com/hoooon22/devzip/actions/runs/12345
환경: production
타임스탬프: 2024-01-15T10:30:00
❌ 배포 실패!
실패한 Job: Health Check & Verification
실패 이유: Health check or deployment verification failed
=== GitHub Actions 웹훅 수신 완료 ===
```

### 활용 방안

1. **Slack/Discord 연동**: 웹훅 수신 후 Slack/Discord로 알림 전송
2. **이메일 알림**: 배포 실패 시 개발팀에 이메일 전송
3. **모니터링 대시보드**: 배포 이력을 데이터베이스에 저장하여 대시보드에 표시
4. **자동 롤백**: 배포 실패 시 자동으로 이전 버전으로 롤백

### 문제 해결

#### 웹훅이 수신되지 않는 경우

1. GitHub Actions 로그에서 웹훅 호출 단계 확인
2. 서버가 정상 동작 중인지 확인 (`https://devzip.cloud/actuator/health`)
3. 방화벽 설정 확인
4. 로그 레벨을 DEBUG로 설정하여 상세 로그 확인:
   ```properties
   logging.level.com.hoooon22.devzip.Controller.WebhookTestController=DEBUG
   ```

---

## 참고 링크

### 엔드포인트
- 방명록 웹훅 테스트: `POST http://localhost:8080/api/webhook/test`
- GitHub Actions 웹훅: `POST http://localhost:8080/api/webhook/github-actions`
- 방명록 API: `http://localhost:8080/api/entry`

### 소스 코드
- `WebhookService.java` - 방명록 웹훅 전송 로직
- `WebhookEntryPayload.java` - 방명록 웹훅 페이로드 DTO
- `GitHubActionsResult.java` - GitHub Actions 웹훅 페이로드 DTO
- `EntryController.java` - 방명록 웹훅 트리거
- `WebhookTestController.java` - 웹훅 수신 엔드포인트
- `.github/workflows/deploy.yml` - GitHub Actions 워크플로우 (웹훅 호출 포함)
