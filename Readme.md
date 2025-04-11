# TraceBoard

TraceBoard는 웹사이트에서 발생하는 사용자 행동 데이터를 실시간으로 수집하고, 이를 시각적으로 분석할 수 있는 로그 기반 대시보드 서비스입니다.

## 🧠 프로젝트 개요

TraceBoard는 Google Analytics처럼 과도하게 무겁고 복잡하지 않으면서, 자신의 웹사이트에서 발생하는 사용자 이벤트를 직접 추적/저장/분석하고 싶은 개발자 및 서비스 운영자들을 위한 맞춤형 로그 분석 플랫폼입니다.

## 👨‍💻 현재 진행 상황 (2025년 4월 업데이트)

### 1. 프론트엔드 개발 완료
- React 기반 대시보드 UI 구현
- 사용자 행동 분석을 위한 차트 컴포넌트 개발
  - 방문자 지표 (VisitorMetrics 컴포넌트)
  - 사용자 행동 차트 (UserBehaviorChart 컴포넌트)
  - 이벤트 로그 테이블 (EventLogTable 컴포넌트)
- React Router를 통한 SPA 라우팅 설정
- styled-components를 사용한 반응형 디자인 적용

### 2. 백엔드 연동 진행 중
- Spring Boot 컨트롤러에 SPA 라우팅 지원 추가
- 정적 리소스 설정 최적화
- 현재는 더미 데이터로 UI 테스트 중, 실제 API 연동 예정

### 3. 빌드 파이프라인 구축
- GitHub Actions를 통한 CI/CD 파이프라인 설정
- 자동 빌드 및 배포 프로세스 구현 중

### 4. 다음 단계 계획
- 백엔드 API 엔드포인트 구현 (이벤트 로그 저장 및 조회)
- 실제 데이터 수집 및 저장 로직 개발
- SDK 배포 및 테스트
- 사용자 인증 시스템 구현

## 🧩 주요 기능

### 1. 로그 수집 시스템
- 사용자의 웹사이트에 삽입된 JS 추적 코드가 이벤트 발생 시 서버로 전송
- 수집 이벤트: page_view, click, scroll, custom_event
- 이벤트 데이터: 시간, 경로, 디바이스, 브라우저 정보, 유저 식별 ID

### 2. 수집 API 서버
- 이벤트 수집을 위한 `/api/log/event` 엔드포인트
- Redis 기반 비동기 큐 처리로 고속 처리
- 유저 세션 구분을 위한 쿠키/헤더 기반 유저 추적

### 3. 데이터 저장 및 분석
- 시간순 시계열 DB 형태로 저장 (PostgreSQL)
- 통계 처리: 특정 시간대별 클릭 수, 평균 체류 시간, 이탈률 등

### 4. 관리자 대시보드
- 일/주/월별 방문자 수, 클릭 수, 이탈 페이지 등을 그래프/chart 형태로 표시
- 유입경로 분석, 사용자 경로 트래킹
- 필터: 특정 날짜, 특정 유저 ID, 디바이스 구분 등

### 5. CSV/JSON 내보내기
- 분석 데이터를 export 가능한 기능
- 백업 및 외부 분석에 활용 가능

### 6. 보안 및 익명 처리
- 개인 정보 수집 없음
- 사용자 식별은 UUID 기반 익명 처리
- 관리자 인증: JWT 기반 관리자 전용 로그인

## ⚙️ 기술 스택

| 분야 | 기술 |
|------|------|
| 백엔드 | Spring Boot 3.2.3, JPA, REST API |
| 비동기 처리 | Redis Streams |
| 데이터베이스 | PostgreSQL |
| 프론트엔드 | React 18, Recharts, Styled Components |
| 로그 수집 SDK | 순수 JavaScript |
| 인증 | JWT 기반 인증 |
| 배포 | Docker, AWS |

## 🔧 설치 및 실행 방법

### 백엔드

```bash
cd backend
./gradlew bootRun
```

### 프론트엔드

```bash
cd frontend
npm install
npm start
```

## 🔍 SDK 사용법

웹사이트에 TraceBoard SDK를 추가하는 방법:

```html
<!-- TraceBoard SDK 추가 -->
<script src="https://cdn.traceboard.io/sdk/traceboard.js"></script>
<script>
  // SDK 초기화
  TraceBoard.init({
    apiKey: 'YOUR_API_KEY',
    trackClicks: true,
    trackPageViews: true,
    trackScrollDepth: true
  });
  
  // 사용자 정의 이벤트 추적
  function onSubscribe() {
    TraceBoard.trackEvent('subscribe', { plan: 'pro', price: 99 });
  }
</script>
```

## 🏗️ 아키텍처

```
사용자 브라우저
     ↓ (JS SDK로 이벤트 발생)
Spring Boot 수집 서버 (/api/log/event)
     ↓ (비동기 큐에 저장)
Redis Stream
     ↓ (Consumer가 읽어옴)
DB 저장 (PostgreSQL)
     ↓
Spring Admin API → React 대시보드 시각화
```

## 💡 향후 개선 사항

- HeatMap 시각화: 페이지 내 클릭 위치 시각화 (좌표 기반)
- A/B 테스트 기능: 랜딩 페이지 효과 비교
- 실시간 방문자 보기: 웹소켓 기반 실시간 유저 모니터링
- Slack/Discord 알림 연동: 이탈률 급증 시 알림 전송

## 📝 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다. 자세한 내용은 LICENSE 파일을 참조하세요.