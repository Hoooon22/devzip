import json
import os
from pytrends.request import TrendReq
from datetime import datetime

try:
    # 현재 작업 디렉토리 경로 얻기 (프로젝트 루트 기준으로 변경)
    project_root = os.path.abspath(os.path.join(os.getcwd()))  # 프로젝트 루트 경로 찾기

    # src/main/resources 경로 지정
    resources_dir = os.path.join(project_root, 'src', 'main', 'resources')

    # 만약 src/main/resources가 없다면 디렉토리 생성
    if not os.path.exists(resources_dir):
        os.makedirs(resources_dir)

    # pytrends 초기화 및 한국 트렌드 검색
    pytrends = TrendReq(hl='ko', tz=540)
    kw_list = [""]
    pytrends.build_payload(kw_list, geo='KR', timeframe='now 1-d')
    trending_searches_df = pytrends.trending_searches(pn='south_korea')
    top_keywords = trending_searches_df[0].tolist()

    # 갱신 날짜 및 트렌드 목록을 JSON 형식으로 저장
    result = {
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),  # 갱신 날짜 추가
        "top_keywords": top_keywords
    }

    # src/main/resources에 JSON 파일 저장
    json_file_path = os.path.join(resources_dir, 'trending_keywords.json')  # src/main/resources 경로에 저장
    with open(json_file_path, 'w', encoding='utf-8') as json_file:
        json.dump(result, json_file, ensure_ascii=False, indent=2)

    print(f"트렌드 키워드와 갱신 날짜가 '{json_file_path}' 파일로 저장되었습니다.")

except Exception as e:
    print(f"오류 발생: {e}")
