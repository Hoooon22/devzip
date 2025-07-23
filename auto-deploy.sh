#!/bin/bash

cd ~/project/devzip
# Git 설정 및 최신 코드 가져오기
git config pull.rebase false
git pull origin master

# Gradle 빌드 및 Docker 작업 실행
if [ $? -eq 0 ]; then
  # 실행 권한 부여
  chmod +x gradlew
  # Spring Boot 애플리케이션 빌드 (프론트엔드 포함)
  ./gradlew clean build -x test
  # Docker 재시작
  docker compose down
  docker compose build
  docker compose up -d
else
  echo "Git pull failed. Deployment stopped."
  exit 1
fi
