# DevZip - 개발 프로젝트 플랫폼

> DevZip은 제가 개발한 프로젝트들의 모음(Zip)입니다!

2024.01 ~ 현재 (개인 프로젝트)

실험적 아이디어부터 실용적인 실서비스까지, 다양한 프로젝트를 한곳에 모아 직접 구현하고 운영하는 개인 개발 플랫폼입니다.

## 🌟 프로젝트 개요

DevZip은 기획 → 개발 → 배포 → 운영까지 전 과정을 혼자 수행하며, 실제 서비스를 만들고 유지하는 역량을 갖추기 위한 프로젝트입니다. 각각의 서비스는 독립적으로 운영되며, 지속적으로 새로운 기능과 아이디어가 추가되고 있습니다.

### 주요 기능 바로가기

#### 🚀 실서비스

- 📋 [Command Stack](https://www.devzip.cloud/commandstack) - 개발자를 위한 개인 일정 관리 시스템
- 🔔 [Conflux](https://www.devzip.cloud/conflux) - 개발자를 위한 통합 알림 관제 센터

#### 🧪 실험적 프로젝트

- 🔬 [API 실험실](https://devzip.cloud/api-experiment) - REST, JSON, SOAP, gRPC, GraphQL 등 다양한 API 실험
- 🎵 [카오틱 뮤직박스](https://devzip.cloud/chaotic-music-box) - 실시간으로 함께 음악을 만드는 참여형 시퀀서
- 🤖 [Hopperbox](https://devzip.cloud/hopperbox) - AI 기반 생산성 도구
- 💬 [실시간 라이브 채팅](https://devzip.cloud/livechat) - 실시간 채팅 서비스
- 🖊️ [방명록](https://devzip.cloud/Guestbook) - 방문자 메시지 작성
- 📈 [트레이스보드](https://devzip.cloud/traceboard) - 웹사이트 사용자 행동 시각화 (관리자용)
- 📊 [대시보드](https://devzip.cloud/dashboard) - 서버 상태 및 정보 대시보드 (관리자용)
- 🔬 [물리 퀴즈](https://devzip.cloud/physics-quiz) - 물리 문제 풀이와 시뮬레이션
- 🔥 [트렌드챗](https://devzip.cloud/trendchat) - 실시간 트렌드 검색어 채팅
- 📚 [API 문서](https://devzip.cloud/apiPage) - DevZip API 목록
- 😄 [코딩 농담](https://devzip.cloud/Joke) - 코딩 관련 농담

## 🎯 주요 서비스

### 1. Command Stack

개발자를 위한 개인 일정 관리 시스템으로, 명령어로 빠르게 일정을 추가하고 관리할 수 있습니다.

**주요 기능:**

- 터미널 스타일의 직관적인 인터페이스
- 명령어 기반 빠른 일정 입력
- 개발자 친화적인 워크플로우

### 2. Conflux

개발자를 위한 통합 알림 관제 센터입니다. 모든 스트림이 하나로 합쳐지는 공간으로, 흩어진 개발 도구 알림을 효율적으로 관리합니다.

**주요 기능:**

- 다양한 개발 도구의 알림 통합
- 실시간 알림 모니터링
- 알림 우선순위 관리

### 3. API 실험실

REST, JSON, SOAP, gRPC, GraphQL 등 다양한 API를 실험해볼 수 있는 공간입니다.

### 4. 카오틱 뮤직박스

WebSocket 기반 실시간 참여형 시퀀서로, 여러 사용자가 함께 음악을 만들 수 있습니다.

**주요 기능:**

- 실시간 멀티유저 음악 제작
- WebSocket 기반 실시간 동기화
- 참여형 음악 협업 도구

### 5. Hopperbox

AI 기반 생산성 도구로, 생각한 아이디어를 일단 넣어볼 수 있는 공간입니다.

### 6. 트레이스보드 (TraceBoard)

웹사이트 사용자 행동을 시각화하는 로그 대시보드입니다.

**주요 기능:**

- 방문자 지표: 고유 방문자 수, 페이지뷰, 세션 지속 시간, 이탈률 등
- 사용자 행동 차트: 이벤트 유형별, 디바이스별 사용 분포 시각화
- 실시간 이벤트 로그: 사용자 활동을 시간순으로 확인
- 개인정보 보호: IP 주소 마스킹 처리

### 7. 트렌드챗 (TrendChat)

실시간 인기 검색어에 대해 소통할 수 있는 채팅 서비스입니다.

**주요 기능:**

- Python 스크립트를 이용한 트렌드 데이터 자동 수집
- 수집된 트렌드 정보를 REST API로 제공
- 실시간 트렌드 검색어 기반 채팅

**자동화:**

- GitHub Actions와 pm2를 활용한 데이터 수집 자동화

### 8. API 문서 페이지

DevZip에서 제공하는 모든 API 엔드포인트를 카테고리별로 정리한 페이지입니다.

**특징:**

- 반응형 디자인과 웹 접근성을 고려한 사용자 친화적 인터페이스
- 직관적인 HTTP 메서드 구분으로 빠른 API 이해 가능
- 카테고리별 API 목록 정리

## ⚙️ 기술 스택

### Frontend

- **프레임워크**: React, Next.js
- **스타일링**: CSS, Styled Components
- **기타**: 반응형 디자인, 웹 접근성

### Backend

- **주 프레임워크**: Spring Boot 3.2.3
- **부 프레임워크**: Node.js, Express
- **데이터베이스**: MySQL (AWS RDS)
- **인증**: JWT 기반 인증
- **API**: REST API, JPA
- **실시간 통신**: WebSocket

### Infrastructure

- **클라우드**: AWS EC2, AWS RDS
- **배포**: GitHub Actions (CI/CD)
- **프로세스 관리**: pm2
- **로드 밸런서**: AWS Load Balancer

### Tools & Scripts

- **자동화**: Python (트렌드 데이터 수집)
- **버전 관리**: Git, GitHub
- **컨테이너**: Docker

## 🔧 설치 및 실행 방법

### 사전 요구사항

- Java 17 이상
- Node.js 16 이상
- MySQL 8.0 이상
- Gradle

### 백엔드 실행

```bash
# 프로젝트 클론
git clone https://github.com/Hoooon22/devzip.git
cd devzip

# 환경 변수 설정
cp .env.example .env
# .env 파일에 필요한 정보 입력

# 애플리케이션 실행
./gradlew bootRun
```

서버는 기본적으로 `http://localhost:8080`에서 실행됩니다.

### 프론트엔드 실행

프론트엔드는 React/Next.js로 구성되어 있으며, 각 서비스별로 독립적으로 실행됩니다.

```bash
cd frontend
npm install
npm run dev
```

## 🛠️ 주요 도전 과제와 해결책

### 1. IP 주소 수집 이슈

**문제**: 로드 밸런서를 거쳐 들어오는 요청의 실제 IP 주소를 수집하지 못하는 문제  
**해결**: AWS 로드 밸런서 설정을 조정하고 `X-Forwarded-For` 헤더를 활용하여 실제 클라이언트 IP 주소 수집

### 2. 데이터 수집 자동화

**문제**: 트렌드 데이터를 수동으로 수집하는 비효율성  
**해결**: GitHub Actions와 pm2를 활용한 Python 스크립트 자동화로 주기적인 데이터 수집 구현

### 3. 배포 프로세스 안정성

**문제**: 배포 시 오류 발생 시 원인 파악이 어려움  
**해결**: 단일 작업에서 4단계 파이프라인(빌드 → 테스트 → 배포 → 검증)으로 개선하여 에러 추적 용이성 확보

### 4. 사용자 행동 추적과 개인정보 보호

**문제**: 사용자 행동 추적 시 개인정보 보호 이슈  
**해결**: IP 주소 마스킹 처리, 익명화된 사용자 식별 방식 도입

### 5. 실시간 협업 기능 구현

**문제**: 멀티유저 실시간 음악 제작에서 동기화 이슈  
**해결**: WebSocket 기반 실시간 통신으로 사용자 간 상태 동기화 구현

## 📊 프로젝트 구조

```
devzip/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/hoooon22/devzip/
│   │   │       ├── Config/          # 설정 파일
│   │   │       ├── Controller/      # REST API 컨트롤러
│   │   │       ├── Service/         # 비즈니스 로직
│   │   │       ├── Repository/      # 데이터 액세스
│   │   │       ├── Entity/          # JPA 엔티티
│   │   │       └── DTO/             # 데이터 전송 객체
│   │   └── resources/
│   │       ├── static/              # 정적 리소스
│   │       └── application.properties
│   └── test/                         # 테스트 코드
├── frontend/                         # React/Next.js 프론트엔드
├── scripts/                          # 자동화 스크립트
├── .github/
│   └── workflows/                    # GitHub Actions CI/CD
├── build.gradle                      # Gradle 설정
└── docker-compose.yml                # Docker 설정
```

## 🚀 배포

DevZip은 AWS 인프라에 배포되어 운영 중입니다.

- **웹사이트**: [https://devzip.cloud](https://devzip.cloud)
- **GitHub**: [https://github.com/Hoooon22/devzip](https://github.com/Hoooon22/devzip)

### CI/CD 파이프라인

GitHub Actions를 통한 자동 배포가 구성되어 있습니다:

1. **Build**: Gradle을 통한 애플리케이션 빌드
2. **Test**: 단위 테스트 및 통합 테스트 실행
3. **Deploy**: AWS EC2로 자동 배포
4. **Verify**: 배포 후 헬스 체크

## 💡 향후 계획

- [ ] 실시간 협업 도구 확장
- [ ] 모바일 앱 개발
- [ ] 더 많은 API 서비스 제공
- [ ] 사용자 대시보드 커스터마이징 기능
- [ ] 알림 시스템 고도화
- [ ] 성능 모니터링 및 최적화
- [ ] 다국어 지원
- [ ] AI 기능 강화

## 📝 라이선스

이 프로젝트는 개인 프로젝트로, 학습 및 포트폴리오 목적으로 제작되었습니다.

## 👤 개발자

**김지훈 (Hoooon22)**

- 포트폴리오: [https://hoooon22.github.io](https://hoooon22.github.io)
- GitHub: [https://github.com/Hoooon22](https://github.com/Hoooon22)
- Email: momo990305@gmail.com

## 🙏 문의 및 피드백

프로젝트에 대한 문의사항이나 피드백은 GitHub Issues 또는 이메일로 연락주세요!
