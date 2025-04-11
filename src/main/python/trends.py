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
    
    # 실시간 트렌드 검색 (realtime_trending_searches 메서드 사용)
    try:
        trending_data = pytrends.realtime_trending_searches(pn='KR')
        # 트렌드 데이터 처리
        if trending_data is not None and not trending_data.empty:
            # 'title' 컬럼에서 상위 20개 항목 추출
            if 'title' in trending_data.columns:
                top_keywords = trending_data['title'].unique().tolist()[:20]
            # 'title' 컬럼이 없는 경우 첫 번째 컬럼에서 추출
            else:
                top_keywords = trending_data.iloc[:, 0].unique().tolist()[:20]
            
            print(f"수집된 키워드 수: {len(top_keywords)}")
            print(f"첫 5개 키워드: {top_keywords[:5]}")
        else:
            print("트렌드 데이터를 가져오지 못했습니다. 대체 키워드를 사용합니다.")
            top_keywords = [
                "AI 기술",
                "개발자 채용",
                "코딩 교육",
                "클라우드 컴퓨팅",
                "블록체인",
                "빅데이터",
                "메타버스",
                "머신러닝",
                "개발자 커뮤니티",
                "IoT 기기",
                "웹 개발",
                "모바일 앱",
                "가상현실",
                "디지털 트랜스포메이션",
                "사이버 보안",
                "프로그래밍 언어",
                "오픈소스",
                "깃허브",
                "소프트웨어 개발",
                "인공지능"
            ]
    except Exception as trend_error:
        print(f"트렌드 데이터 수집 중 오류: {trend_error}")
        # 예외 발생 시 기본 키워드 목록 사용
        top_keywords = [
            "프로그래밍",
            "개발자 커리어",
            "소프트웨어 개발",
            "코딩 교육",
            "기술 트렌드",
            "웹 개발",
            "모바일 앱 개발",
            "API 통합",
            "클라우드 서비스",
            "프론트엔드 개발",
            "백엔드 개발",
            "데브옵스",
            "가상화 기술",
            "컨테이너화",
            "마이크로서비스",
            "CI/CD 파이프라인",
            "버전 관리",
            "테스트 자동화",
            "코드 리뷰",
            "애자일 방법론"
        ]

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
