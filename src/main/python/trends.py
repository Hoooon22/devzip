import json
import os
from pytrends.request import TrendReq

try:
    # 현재 파일이 위치한 경로 얻기
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # pytrends 초기화 및 한국 트렌드 검색
    pytrends = TrendReq(hl='ko', tz=540)
    kw_list = [""]
    pytrends.build_payload(kw_list, geo='KR', timeframe='now 1-d')
    trending_searches_df = pytrends.trending_searches(pn='south_korea')
    top_keywords = trending_searches_df[0].tolist()

    # 트렌드 목록을 JSON 형식으로 저장
    result = {"top_keywords": top_keywords}

    # 현재 파일이 있는 경로에 JSON 파일로 저장
    json_file_path = os.path.join(script_dir, 'trending_keywords.json')
    with open(json_file_path, 'w', encoding='utf-8') as json_file:
        json.dump(result, json_file, ensure_ascii=False, indent=2)

    print(f"트렌드 키워드가 '{json_file_path}' 파일로 저장되었습니다.")

except Exception as e:
    print(f"오류 발생: {e}")
