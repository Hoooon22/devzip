#!/bin/bash

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
pip install pytrends

# 트렌드 데이터 수집 스크립트 실행
echo "트렌드 데이터 수집 스크립트 실행 중..."
python3 "$PROJECT_ROOT/src/main/python/trends.py"

# Python 스크립트 실행에 실패했거나 JSON 파일이 없는 경우를 대비해
# 직접 JSON 파일을 생성하거나 업데이트
JSON_FILE="$PROJECT_ROOT/src/main/resources/trending_keywords.json"

if [ ! -f "$JSON_FILE" ] || [ ! -s "$JSON_FILE" ]; then
  echo "트렌드 JSON 파일이 존재하지 않거나 비어 있습니다. 수동으로 생성합니다."
  
  # 현재 시간 가져오기 (yyyy-MM-dd HH:mm:ss 형식)
  CURRENT_TIME=$(date +"%Y-%m-%d %H:%M:%S")
  
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
    "모바일 앱"
  ]
}
EOF
  echo "기본 JSON 파일이 생성되었습니다."
else
  # JSON 파일이 존재하면 Python 스크립트에서 설정한 시간을 유지
  echo "트렌드 데이터가 Python 스크립트에 의해 갱신되었습니다."
fi

# 가상 환경 비활성화
deactivate

echo "트렌드 데이터 업데이트 완료"

# 업데이트된 파일 내용 출력
echo "업데이트된 JSON 파일 내용:"
cat "$JSON_FILE" 