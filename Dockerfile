FROM openjdk:17

# curl 설치 (헬스체크용)
RUN microdnf update && microdnf install -y curl && microdnf clean all

ARG JAR_FILE=build/libs/*.jar
COPY ${JAR_FILE} app.jar

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java","-jar","/app.jar","--spring.profiles.active=docker"]