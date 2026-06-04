FROM eclipse-temurin:17-jre

# curl 설치 (헬스체크용)
# apt 미러가 동기화 중이면 update가 일시적으로 실패할 수 있어 재시도 루프로 감싼다.
RUN set -eux; \
    for i in 1 2 3 4 5; do \
      apt-get update -o Acquire::Retries=3 && break; \
      echo "apt-get update 실패 (시도 $i/5) — 10초 후 재시도"; \
      sleep 10; \
    done; \
    apt-get install -y --no-install-recommends curl; \
    rm -rf /var/lib/apt/lists/*

ARG JAR_FILE=build/libs/*.jar
COPY ${JAR_FILE} app.jar

# 헬스체크 추가 (start-period를 180s로 증가)
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java","-jar","/app.jar","--spring.profiles.active=docker"]