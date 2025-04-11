#!/bin/bash

# 스크립트 시작 로그
echo "트렌드 데이터 업데이트 스크립트 시작: $(date)"

# 스크립트가 있는 디렉토리로 이동
cd "$(dirname "$0")"
cd ..

# 프로젝트 루트 디렉토리 경로 설정
PROJECT_ROOT="$(pwd)"
echo "프로젝트 루트: $PROJECT_ROOT"

# 필요한 Python 패키지 설치 (가상 환경이 없는 경우)
if [ ! -d "$PROJECT_ROOT/venv" ]; then
  echo "가상 환경 생성 중..."
  python3 -m venv "$PROJECT_ROOT/venv"
fi

# 가상 환경 활성화
source "$PROJECT_ROOT/venv/bin/activate"

# 필요한 패키지 설치
echo "필요한 패키지 설치 중..."
pip install pytrends requests

# JSON 파일 경로 설정
JSON_FILE="$PROJECT_ROOT/src/main/resources/trending_keywords.json"

# 트렌드 데이터 수집 스크립트 실행
echo "트렌드 데이터 수집 스크립트 실행 중..."
python3 "$PROJECT_ROOT/src/main/python/trends.py"

# Python 스크립트 실행 결과 확인
PYTHON_EXIT_CODE=$?
echo "Python 스크립트 종료 코드: $PYTHON_EXIT_CODE"

# 현재 시간 가져오기 (yyyy-MM-dd HH:mm:ss 형식)
CURRENT_TIME=$(date +"%Y-%m-%d %H:%M:%S")

# Python 스크립트 실행에 실패했거나 JSON 파일이 없는 경우를 대비해
# 직접 JSON 파일을 생성하거나 업데이트
if [ ! -f "$JSON_FILE" ] || [ ! -s "$JSON_FILE" ] || [ $PYTHON_EXIT_CODE -ne 0 ]; then
  echo "트렌드 JSON 파일이 존재하지 않거나 비어 있거나 Python 스크립트 실행에 실패했습니다. 수동으로 생성합니다."
  
  # 기본 트렌드 키워드 포함한 JSON 생성
  cat > "$JSON_FILE" << EOF
{
  "updated_at": "$CURRENT_TIME",
  "top_keywords": [
    "AI 기술",
    "클라우드 컴퓨팅",
    "블록체인",
    "빅데이터",
    "메타버스",
    "머신러닝",
    "개발자 커뮤니티",
    "IoT 기기",
    "웹 개발",
    "모바일 앱",
    "자바스크립트",
    "파이썬",
    "리액트",
    "스프링부트",
    "마이크로서비스",
    "도커",
    "쿠버네티스",
    "깃허브",
    "CI/CD",
    "DevOps"
  ]
}
EOF
  echo "기본 JSON 파일이 생성되었습니다."
else
  echo "트렌드 데이터가 Python 스크립트에 의해 갱신되었습니다."
  
  # 성공적으로 갱신된 경우에도 항상 updated_at 시간 업데이트
  # jq를 사용하여 JSON 파일의 updated_at 필드만 업데이트
  if command -v jq &> /dev/null; then
    echo "jq를 사용하여 updated_at 필드를 업데이트합니다..."
    TMP_FILE=$(mktemp)
    jq ".updated_at = \"$CURRENT_TIME\"" "$JSON_FILE" > "$TMP_FILE" && mv "$TMP_FILE" "$JSON_FILE"
  else
    echo "jq가 설치되어 있지 않습니다. 텍스트 처리로 시간 업데이트를 시도합니다..."
    # sed를 사용하여 업데이트 시간 변경
    sed -i.bak "s/\"updated_at\": \"[^\"]*\"/\"updated_at\": \"$CURRENT_TIME\"/" "$JSON_FILE" && rm -f "${JSON_FILE}.bak"
  fi
fi

# 가상 환경 비활성화
deactivate

echo "트렌드 데이터 업데이트 완료: $(date)"

# 업데이트된 파일 내용 출력
echo "업데이트된 JSON 파일 내용:"
cat "$JSON_FILE"

# Spring Boot 서버가 실행 중인지 확인 (배포 환경인 경우)
if pgrep -f "java.*devzip.*jar" > /dev/null; then
  echo "Spring Boot 서버가 실행 중입니다. 데이터가 자동으로 로드됩니다."
else
  echo "Spring Boot 서버가 실행 중이지 않습니다. 서버 재시작 후 새로운 데이터를 로드합니다."
fi 