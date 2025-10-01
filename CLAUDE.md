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
│   │   └── traceboard/               # TraceBoard-specific endpoints
│   ├── Model/                        # JPA entities and DTOs
│   ├── Repository/                   # Data access layer
│   └── Service/                      # Business logic
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
- Environment-specific config in `application-aws.properties`
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

### Testing Strategy
- Backend: JUnit tests in `src/test/java/`
- Frontend: Jest/React Testing Library tests with `npm test`
- Integration: Docker Compose for full-stack testing

### Performance Considerations
- Frontend build optimizations configured in Gradle
- Database connection pooling enabled
- Static resource caching configured
- CSS/JS minification in production builds

### Claude Github
- Do not include commit message about Claude

### GitHub Actions CI/CD Pipeline
- Automated testing, building, deployment, and health checks
- JWT authentication system verification included
- Protected routes testing for dashboard and traceboard
- Comprehensive status reporting and monitoring

### Server Test
- Real Server is running on Desktop PC (Ubuntu)
- All functions of the server should work the same on devzip.cloud and 192.168.75.224 (same network).

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