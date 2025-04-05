# DevZip

DevZip은 Spring Boot와 React를 활용한 웹 애플리케이션입니다.
개발자들을 위한 프로젝트 공유 및 실험적인 웹 서비스 플랫폼으로, [DevZip](https://devzip.site)에서 서비스되고 있습니다.

## 구현된 프로젝트

### 현재 운영 중인 프로젝트
1. **누구든지 흔적을 남기는 공간**
   - 방명록 서비스
   - 누구나 자유롭게 흔적을 남길 수 있는 공간
   - 운영 기간: 2024.07.10 ~ 2024.12.30

2. **코딩 농담 사전**
   - Jokes API를 활용한 코딩 관련 유머 번역 서비스
   - 개발자들을 위한 재미있는 코딩 관련 농담 제공
   - 운영 기간: 2024.09.05 ~ 2024.09.06

3. **API 개발 모음**
   - 다양한 API 서비스 제공
   - 사용법: `/api/{apiURL}`
   - 운영 시작: 2024.10.14

4. **DevZip 서버 대시보드**
   - 서버 정보 모니터링 대시보드
   - 실시간 서버 상태 확인
   - 운영 시작: 2024.11.26

5. **실시간 트렌드 검색어 채팅**
   - 실시간 인기 검색어 기반 채팅 서비스
   - 트렌드 키워드 중심의 실시간 소통
   - 운영 시작: 2025.02.11

### 이전 프로젝트
- **매거진 퐁당**
  - 꿈을 쫒는 청소년들을 위한 웹 매거진
  - 운영 기간: 2023.01.01 ~ 2023.06.30
  - 웹사이트: https://www.stoneinwell.com

## 기술 스택

### 백엔드
- Java 17
- Spring Boot 3.3.1
- Spring Data JPA
- Spring Security
- WebSocket
- MySQL / H2 Database

### 프론트엔드
- React
- Node.js
- npm

## 프로젝트 구조

```
src/
├── main/
│   ├── java/
│   │   └── com/hoooon22/devzip/
│   │       ├── Config/         # 설정 클래스
│   │       ├── Controller/     # API 엔드포인트
│   │       ├── Service/        # 비즈니스 로직
│   │       ├── Repository/     # 데이터 접근 계층
│   │       ├── Model/          # 도메인 모델
│   │       ├── Handler/        # 특수 처리기
│   │       ├── Exception/      # 예외 처리
│   │       ├── Initializer/    # 초기화 관련
│   │       └── metrics/        # 메트릭스
│   ├── frontend/              # React 프론트엔드
│   ├── python/               # Python 스크립트
│   └── resources/            # 설정 파일 및 리소스
└── test/                     # 테스트 코드
```

## 구현된 기능

### 1. 프로젝트 관리
- 프로젝트 업로드 및 관리
- 프로젝트 카테고리별 분류
- 프로젝트 검색 기능
- 프로젝트 상세 정보 조회

### 2. 사용자 기능
- 회원가입 및 로그인
- 프로필 관리
- 프로젝트 북마크
- 관심 프로젝트 팔로우

### 3. 커뮤니티 기능
- 프로젝트별 댓글 시스템
- 실시간 알림 기능
- 사용자간 메시지 교환
- 프로젝트 평가 및 리뷰

### 4. 대시보드
- 개인 프로젝트 관리
- 활동 통계 확인
- 팔로우/팔로워 관리
- 알림 센터

## 주요 기능
- Spring Security를 이용한 보안 기능
- WebSocket을 통한 실시간 통신
- JPA를 이용한 데이터베이스 연동
- Jsoup을 이용한 웹 크롤링
- Spring Actuator를 통한 모니터링

## 실행 방법

### 필수 요구사항
- Java 17 이상
- Node.js 및 npm
- MySQL (또는 H2 Database)

### 백엔드 실행
```bash
# Gradle 빌드
./gradlew build

# 애플리케이션 실행
./gradlew bootRun
```

### 프론트엔드 개발 모드 실행
```bash
# frontend 디렉토리로 이동
cd src/main/frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm start
```

### 전체 애플리케이션 빌드
```bash
./gradlew build
```
이 명령어는 다음 작업을 자동으로 수행합니다:
1. React 프론트엔드 빌드
2. 빌드된 프론트엔드 파일을 Spring Boot 정적 리소스로 복사
3. Spring Boot 애플리케이션 빌드

## 데이터베이스 설정

### MySQL 사용 시
`application.properties` 또는 `application.yml`에서 다음 설정을 확인하세요:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/your_database
spring.datasource.username=your_username
spring.datasource.password=your_password
```

### H2 Database 사용 시 (개발용)
```properties
spring.datasource.url=jdbc:h2:mem:testdb
spring.datasource.driverClassName=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.h2.console.enabled=true
```

## 모니터링
Spring Actuator 엔드포인트를 통해 애플리케이션 상태를 모니터링할 수 있습니다:
- Health check: `/actuator/health`
- Metrics: `/actuator/metrics`
- Info: `/actuator/info`

## 라이선스
이 프로젝트는 MIT 라이선스를 따릅니다.