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

# 가상 환경 비활성화
deactivate

echo "트렌드 데이터 업데이트 완료" 