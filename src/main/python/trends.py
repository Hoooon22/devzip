import json
import os
import sys
from pytrends.request import TrendReq
from datetime import datetime

try:
    print("트렌드 데이터 수집 시작...")
    
    # 현재 스크립트의 절대 경로 확인
    current_script_path = os.path.abspath(__file__)
    print(f"현재 스크립트 경로: {current_script_path}")
    
    # 프로젝트 루트 경로 찾기 (src/main/python 위의 디렉토리)
    project_root = os.path.abspath(os.path.join(os.path.dirname(current_script_path), '..', '..', '..'))
    print(f"프로젝트 루트 경로: {project_root}")

    # src/main/resources 경로 지정
    resources_dir = os.path.join(project_root, 'src', 'main', 'resources')
    print(f"리소스 디렉토리 경로: {resources_dir}")

    # 만약 src/main/resources가 없다면 디렉토리 생성
    if not os.path.exists(resources_dir):
        os.makedirs(resources_dir)
        print(f"리소스 디렉토리 생성: {resources_dir}")

    # pytrends 초기화 및 한국 트렌드 검색
    print("Google Trends API 요청 중...")
    pytrends = TrendReq(hl='ko', tz=540)
    kw_list = [""]
    pytrends.build_payload(kw_list, geo='KR', timeframe='now 1-d')
    trending_searches_df = pytrends.trending_searches(pn='south_korea')
    top_keywords = trending_searches_df[0].tolist()
    print(f"수집된 키워드 수: {len(top_keywords)}")
    print(f"첫 5개 키워드: {top_keywords[:5]}")

    # 갱신 날짜 및 트렌드 목록을 JSON 형식으로 저장
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    result = {
        "updated_at": current_time,  # 갱신 날짜 추가
        "top_keywords": top_keywords
    }

    # src/main/resources에 JSON 파일 저장
    json_file_path = os.path.join(resources_dir, 'trending_keywords.json')
    with open(json_file_path, 'w', encoding='utf-8') as json_file:
        json.dump(result, json_file, ensure_ascii=False, indent=2)

    print(f"트렌드 키워드와 갱신 날짜가 '{json_file_path}' 파일로 저장되었습니다.")
    print(f"업데이트 시간: {current_time}")
    print(f"총 {len(top_keywords)}개의 키워드가 저장되었습니다.")

except Exception as e:
    print(f"오류 발생: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("트렌드 데이터 수집 완료!")
