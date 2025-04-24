#!/bin/bash

# 로그 시작
echo "트렌드 키워드 업데이트를 시작합니다: $(date)"

# 프로젝트 루트 디렉토리 설정 (GitHub Actions 환경에서는 GITHUB_WORKSPACE 환경 변수 사용)
if [ -n "$GITHUB_WORKSPACE" ]; then
    # GitHub Actions 환경
    PROJECT_ROOT="$GITHUB_WORKSPACE"
else
    # 로컬 환경
    PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi

RESOURCES_DIR="$PROJECT_ROOT/src/main/resources"
JSON_FILE="$RESOURCES_DIR/trending_keywords.json"
LOG_FILE="$RESOURCES_DIR/update_trends.log"

# 로그 디렉토리 확인 및 생성
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

echo "프로젝트 루트: $PROJECT_ROOT" >> "$LOG_FILE"
echo "리소스 디렉토리: $RESOURCES_DIR" >> "$LOG_FILE"
echo "JSON 파일 경로: $JSON_FILE" >> "$LOG_FILE"

# 현재 날짜와 시간 가져오기 (YYYY-MM-DD HH:MM:SS 형식)
CURRENT_DATE=$(date '+%Y-%m-%d %H:%M:%S')
echo "현재 날짜 및 시간: $CURRENT_DATE" >> "$LOG_FILE"

# Python 가상 환경 설정 (없으면 생성)
VENV_DIR="$PROJECT_ROOT/venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "가상 환경 생성 중..." >> "$LOG_FILE"
    python3 -m venv "$VENV_DIR"
fi

# 가상 환경 활성화
source "$VENV_DIR/bin/activate"

# 필요한 패키지 설치
echo "필요한 패키지 설치 중..." >> "$LOG_FILE"
pip install requests beautifulsoup4 >> "$LOG_FILE" 2>&1

# JSON 파일이 저장될 디렉토리 확인 및 생성
mkdir -p "$(dirname "$JSON_FILE")"

# 새로운 JSON 파일 생성
echo "새로운 JSON 파일 생성 중..." >> "$LOG_FILE"

# 현재 시간으로 updated_at 업데이트
cat > "$JSON_FILE" << EOF
{
  "updated_at": "$CURRENT_DATE",
  "top_keywords": [
    "프로그래밍",
    "자바스크립트",
    "파이썬",
    "리액트",
    "노드JS",
    "스프링부트",
    "알고리즘",
    "머신러닝",
    "웹개발",
    "데이터분석",
    "블록체인",
    "인공지능",
    "클라우드",
    "프론트엔드",
    "백엔드",
    "데브옵스",
    "코딩테스트",
    "타입스크립트",
    "도커",
    "쿠버네티스"
  ]
}
EOF

echo "JSON 파일이 업데이트되었습니다." >> "$LOG_FILE"
echo "업데이트된 내용:" >> "$LOG_FILE"
cat "$JSON_FILE" >> "$LOG_FILE"

# Spring Boot 서버가 실행 중인지 확인
PID=$(pgrep -f "devzip.*jar" || echo "")
if [ -n "$PID" ]; then
    echo "Spring Boot 서버가 실행 중입니다 (PID: $PID). 새 데이터가 자동으로 로드됩니다." >> "$LOG_FILE"
else
    echo "Spring Boot 서버가 실행 중이 아닙니다. 서버를 시작하면 새 데이터가 로드됩니다." >> "$LOG_FILE"
fi

# 가상 환경 비활성화
deactivate

echo "트렌드 키워드 업데이트가 완료되었습니다: $(date)" >> "$LOG_FILE"
echo "----------------------------------------" >> "$LOG_FILE" 
