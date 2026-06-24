# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project is a Dev + zip website containing web development ideas from the developer of hoooon22. It has developed the front end with React and the back end with Springboot, and is distributing it to an external Ubuntu server and distributing it to devzip.cloud.

## Architecture

### Multi-Language Stack
- **Backend**: Spring Boot 3.3.1 with Java 17
- **Frontend**: React 18 with Create React App
- **Database**: MySQL 8.0 with JPA/Hibernate
- **Additional**: Python scripts for trend processing

### Project Structure
```
src/main/
├── java/com/hoooon22/devzip/          # Spring Boot backend
│   ├── Controller/                    # REST API controllers
│   │   ├── livechat/ musicbox/ traceboard/   # domain-specific endpoints
│   ├── Service/                      # Business logic (mirrors domain subpackages)
│   ├── Repository/                   # Data access layer (mirrors domain subpackages)
│   ├── Model/                        # JPA entities (common/, livechat/, musicbox/, traceboard/)
│   ├── dto/                          # DTOs (livechat/, musicbox/, webhook/)
│   ├── Security/                     # JWT filter/provider + DataEncryptionUtil
│   ├── Config/                       # WebSecurity, WebSocket/STOMP, CORS, interceptors
│   ├── Exception/                    # Custom exceptions
│   └── metrics/  tip/                # system metrics + tip system
├── frontend/                         # React application
│   ├── src/components/               # Reusable UI components
│   ├── src/pages/                    # Route-specific pages
│   ├── src/services/                 # API client services
│   └── src/assets/                   # Static assets (CSS, images)
├── resources/
│   ├── application.properties        # Spring configuration
│   └── static/                       # Built React app (generated)
└── python/                          # Python utilities
    └── trends.py                    # Trend processing script
```

## Development Commands

### Backend Development
```bash
# Run Spring Boot application (includes frontend build)
./gradlew bootRun

# Run tests
./gradlew test

# Run a single test class (or method)
./gradlew test --tests com.hoooon22.devzip.DevzipApplicationTests
./gradlew test --tests "com.hoooon22.devzip.DevzipApplicationTests.contextLoads"

# Build JAR (includes frontend build)
./gradlew build

# Clean build
./gradlew clean build
```

### Frontend Development
```bash
# Navigate to frontend directory
cd src/main/frontend/

# Install dependencies
npm install --legacy-peer-deps

# Run development server (proxy to Spring Boot)
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Docker Development
```bash
# Run with Docker Compose (MySQL + App)
docker-compose up -d

# Build and run
docker-compose up --build
```

## Key Features & Components

### TraceBoard Analytics System
- **Event Collection**: `/api/traceboard/event` endpoint for collecting user interactions
- **Dashboard**: Real-time analytics dashboard with charts and metrics
- **SDK Integration**: JavaScript tracking code embedded in target websites
- **Data Export**: CSV export functionality for analytics data

### Core Components
- **EventLogController**: Main API for event collection and analytics
- **TraceBoard React Components**: 
  - `EventLogTable`: Event log display
  - `UserBehaviorChart`: User behavior visualization
  - `VisitorMetrics`: Visitor statistics
  - `RouteTracker`: Automatic route tracking

### Additional Features
- **Chat System**: WebSocket-based real-time chat with rooms
- **Guestbook**: Simple entry management system
- **Dashboard**: System monitoring with CPU, memory, network metrics
- **Trend Analysis**: Keyword trending system

## Configuration Notes

### Database Configuration
- Uses MySQL 8.0 with JPA auto-update (`spring.jpa.hibernate.ddl-auto=update`)
- Active profile resolves via `spring.profiles.include=${SPRING_PROFILES_ACTIVE:local}` in
  `application.properties` — defaults to the `local` profile (`application-local.properties`,
  H2 in-memory) when no env var is set. The Docker image runs `--spring.profiles.active=docker`.
  (There is no `application-aws.properties`; the `aws`/production config is supplied entirely
  through the env vars below.)
- Connection pooling and performance optimization enabled

### Security Configuration
- Spring Security enabled with CSRF protection
- JWT-based authentication for admin features
- CORS configuration for cross-origin requests

### Build Integration
- Gradle automatically builds React frontend during Spring Boot build
- Frontend build output copied to `src/main/resources/static/`
- No separate deployment needed - single JAR contains everything

### Environment Variables Required
```
MYSQL_ROOT_PASSWORD=your_password
MYSQL_DATABASE=devzip
MYSQL_USER=your_username
MYSQL_PASSWORD=your_password
SPRING_PROFILES_ACTIVE=aws
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/devzip
SPRING_DATASOURCE_USERNAME=your_username
SPRING_DATASOURCE_PASSWORD=your_password
# 보안 비밀키 (미설정 시 애플리케이션 기동 실패 - fail-fast)
# JWT 서명은 HS512 사용 -> 최소 64바이트(512비트) 이상의 강한 값 필요
JWT_SECRET=your_64byte_or_longer_random_secret
ENCRYPTION_SECRET=your_encryption_secret
ENCRYPTION_SALT=your_encryption_salt
```

## Development Guidelines

### Responsive Design
- Follow mobile-first approach as specified in `RESPONSIVE_GUIDELINES.md`
- Use breakpoints: 768px (tablet), 1024px (desktop), 1440px (large screens)
- Ensure 44x44px minimum touch targets for mobile devices
- Use relative units (rem, em, %) instead of fixed pixels

### Code Patterns
- **Backend**: Follow Spring Boot conventions with `@RestController`, `@Service`, `@Repository` layers
- **Frontend**: React functional components with hooks, styled-components for CSS
- **Database**: JPA entities with Lombok annotations for boilerplate reduction
- **API**: RESTful endpoints with consistent response format using `ApiResponse<T>` wrapper

### Project Card Convention (실험/프로젝트 카드)
When adding a new experiment/project to `src/main/frontend/src/data/projects.js`,
follow these rules so cards stay consistent:

- **영문명에는 한국어 부제(`subtitle`)를 붙인다.** 프로젝트 `name`이 영문이면
  `subtitle` 필드에 그 개념을 나타내는 짧은 한국어 부제를 추가한다. 카드/표 뷰 모두
  영문 제목 아래에 부제로 작게 표시된다(`pages/Main.js`의 `p.subtitle` → `.k-subtitle`,
  스타일은 `assets/css/Main.scss`).
  - ✅ `name: 'Mixture', subtitle: '전문가 혼합 (MoE)'`
  - 이름이 이미 한국어인 항목은 `subtitle`을 넣지 않는다(중복이므로 생략).
- **`description`(카드 부가설명)은 한 줄로 짧게 쓴다.** 긴 배경 설명·인사이트는
  카드에 넣지 말고 실험 페이지 본문에 둔다. 한 문장(대략 40자 내외) 분량을 목표로 한다.
  - ✅ `description: '토큰마다 어울리는 전문가 소수만 깨우는 희소 라우팅(MoE) 실험'`
  - ❌ 두세 문장에 걸친 장문 설명(`— ... 까지 직접 관찰` 식의 긴 서술)

### Frontend Lint Pitfalls (CRA / react-scripts build)
The Gradle `:buildFrontendReact` task runs `react-scripts build`, which treats ESLint
warnings as **build-breaking errors**. The same two rules keep failing the build —
check Main.js–style edits against this list **before** committing:

- **`react/jsx-no-comment-textnodes`** — Bare `//` or `/* … */` as a JSX text child
  looks like a JS comment to the linter, so the build fails even though it would
  render fine.
  - ❌ `<p className="pre">// developer hub</p>`
  - ✅ `<p className="pre">{'// developer hub'}</p>` (literal string)
  - ✅ `<p className="pre">{/* developer hub */}</p>` (real JSX comment, renders nothing)

- **`jsx-a11y/anchor-is-valid`** — `<a href="#">` and `<a href="javascript:void(0)">`
  are rejected. Anchors must point somewhere navigable; otherwise use a `<button>`
  styled as a link.
  - ❌ `<a href="#">홈</a>`
  - ✅ `<a href="/">홈</a>` (real route)
  - ✅ `<a href="#some-id">섹션 이동</a>` (in-page anchor with matching `id`)
  - ✅ `<button type="button" className="link-style" onClick={...}>홈</button>`
  - When there's no destination yet, **delete the link** — half-finished navigation
    is worse than no navigation.

Quick local check before pushing: `cd src/main/frontend && npm run build` reproduces
the same ESLint pass that Gradle runs.

### Testing Strategy
- Backend: JUnit tests in `src/test/java/` — currently only `DevzipApplicationTests.contextLoads()`
  (Spring context smoke test); there is no broader unit/integration suite yet
- Frontend: Jest/React Testing Library tests with `npm test`
- Integration: Docker Compose for full-stack testing
- CI builds with `./gradlew build -x test` (see `.github/workflows/deploy.yml`)

### Performance Considerations
- Frontend build optimizations configured in Gradle
- Database connection pooling enabled
- Static resource caching configured
- CSS/JS minification in production builds

### Claude Github
- Do not include commit message about Claude

### Communication Language
- **모든 사용자 응답은 한국어로 작성한다.** (All user-facing replies must be in Korean.)
- 코드 주석, 변수명, 파일명은 기존 코드베이스의 컨벤션을 따른다 (영어 우선).
- 인사이트(`★ Insight`) 블록과 Learn by Doing 요청도 한국어로 작성한다.
- 기술 용어(예: `useState`, `ESLint`, `props`)는 번역하지 않고 원어 그대로 사용한다.

### GitHub Actions CI/CD Pipeline
- Automated testing, building, deployment, and health checks
- JWT authentication system verification included
- Protected routes testing for dashboard and traceboard
- Comprehensive status reporting and monitoring

### Production Server
- **Live Server**: Running on external Ubuntu server
- **Domain**: devzip.cloud (production environment)
- **Local Network**: 192.168.75.224 (same network access)
- **SSH Access**: `ssh -p 3323 hoooon22@192.168.75.224`
- **Note**: All functions should work identically on both devzip.cloud and local network IP

### Rule: Run & Manage Backend Application
# When the user requests to run, test, or check logs for the backend server,
# automatically use the designated 'backend-test' agent.
- **When (Triggers):**
  - "Run backend"
  - "Execute the backend application"
  - "Run the server"
  - "Start the backend"
  - "Launch the Spring Boot application"
  - "Test the backend"
  - "Check backend logs"

- **Do (Action):**
  - Activate and delegate the task to the **`backend-test`**.

---

### Rule: Run & Manage Frontend Dev Server
# When the user requests to run, compile, or test the frontend development server,
# automatically use the designated 'frontend-test' agent.
- **When (Triggers):**
  - "Run frontend"
  - "Execute the frontend"
  - "Run the React app"
  - "Start the frontend"
  - "Launch the frontend dev server"
  - "Test the frontend"
  - "Compile the frontend"

- **Do (Action):**
  - Activate and delegate the task to the **`frontend-test`**.