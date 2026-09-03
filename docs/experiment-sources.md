# 실험 페이지 출처 기록

각 실험 페이지가 "어떤 자료/트렌드에 기반해" 만들어졌는지 남기는 로그다.
새 실험을 추가할 때마다 최신 항목을 위쪽에 덧붙인다.

기록 형식:
- **날짜 / 실험명 (라우트)**
- **선정 주제**: 한 줄 요약
- **선정 이유**: 왜 이 주제를 골랐는지
- **기반 자료**: 참고한 검색 결과·기사 링크 목록

---

## 2026-09-03 / Denominator (`/denominator`)

- **선정 주제**: 지표 정의 — 인구를 고정해 두고 분자에 누구를 넣을지, 분모에 누구를 남길지만 고쳐 쓰며 같은 데이터에서 나오는 값이 어디까지 벌어지는지 관찰한다. 24개월 추이를 함께 그려 정의에 따라 수준뿐 아니라 추세의 방향까지 뒤집히는 지점을 본다.
- **선정 이유**: 개발자 커뮤니티 상단에 오른 "진짜 실업률"류 재계산 프로젝트(같은 원자료를 다른 셈법으로 다시 세어 보여 주는 도구)를 특정 국가·기관·공식 지표를 지목하지 않고 "비율 지표가 갖는 일반적인 정의 구조"로 일반화. 집단 토글·분모 모드 전환·인구 격자·추이 선이라는 인터랙티브 요소로 풀기 적합하고, 기존 Confound(상관과 인과)와는 층위가 다르다 — 관계를 따지기 전 단계인 "숫자가 만들어지는 정의"를 다룬다.
- **검증**: node로 합성 인구 1,000명 × 24개월을 돌려 확인 — 어느 달에도 여덟 칸의 합이 정확히 1,000명(비경제활동 60~112명 범위로 유지). 마지막 달 기준 좁은 정의 3.3% / 가장 넓은 정의 36.2%로 10.8배 차이. 추세는 좁은 정의 6.9% → 3.3%(하락), 확장 정의(불완전취업+주변 인구) 19.7% → 29.4%(상승)로 방향이 실제로 갈리는 것을 확인했다.
- **기반 자료**:
  - [2026-09-02 front — Hacker News](https://news.ycombinator.com/front) — "True Rate of Unemployment"이 프론트에 오름 (지표 재계산 도구)
  - [Top Tech Trends of 2026 — Capgemini](https://www.capgemini.com/insights/research-library/top-tech-trends-of-2026/)
  - [The trends that will shape AI and tech in 2026 — IBM](https://www.ibm.com/think/news/ai-tech-trends-predictions-2026)
  - [트렌드 코리아 2026 핵심 키워드 정리](https://brunch.co.kr/@21c17027d5aa456/33) — 측정·감각 지표에 대한 관심

---

## 2026-09-02 / Ruleset (`/ruleset`)

- **선정 주제**: 선언적 차단 규칙 vs 동적 검사. 한정된 규칙 예산 안에서 패턴 몇 줄만 골라 추적 요청을 거르고, 넓은 규칙이 부르는 파손과 좁은 규칙이 남기는 누출 사이를 손으로 저울질한다.
- **선정 이유**: 오늘 개발자 커뮤니티 상단을 차지한 이슈(브라우저 확장 플랫폼의 구 규격 스토어 철회로 요청 차단 방식이 선언적 규칙으로 전환된 건)를 특정 브라우저·확장·차단기 이름 없이 "표현력을 내주고 노출·지연을 0으로 사는 교환"이라는 보편 구조로 일반화할 수 있고, 규칙 팔레트 선택·예산 슬라이더·판정 표·흐름 애니메이션이라는 인터랙티브 요소로 풀기 적합. 기존 실험 중 Throttle(요청 속도 제한)과 인접하지만 다루는 층이 다르다(속도 vs 통과 판정).
- **검증**: 트래픽 240건(추적 110 / 정상 130)에 대해 전수 탐색으로 확인 — 파손 0으로 전량 차단하려면 정확히 5줄이 필요하고 4줄 이하로는 어떤 조합도 불가능. 3줄 최선은 파손 0 / 차단 74.5%. `*://cdn.*/*` 사용 시 정상 요청 26.2% 파손.
- **기반 자료**:
  - [2026-08-31 front — Hacker News](https://news.ycombinator.com/front) — 확장 플랫폼 구 규격 스토어 철회 이슈가 프론트 상단
  - [The 8 trends that will define web development in 2026 — LogRocket](https://blog.logrocket.com/8-trends-web-dev-2026/) — 엣지 인식·성능 제약을 프론트엔드 기본 역량으로 보는 흐름
  - [Top Tech Trends of 2026 — Capgemini](https://www.capgemini.com/insights/research-library/top-tech-trends-of-2026/)
  - [2026: The Year of AI-Assisted Attacks — The Hacker News](https://thehackernews.com/2026/05/2026-year-of-ai-assisted-attacks.html) — 필터링·공급망 계층에 대한 관심 고조

---

## 2026-09-01 / Zero Click (`/zero-click`)

- **선정 주제**: 제로 클릭 웹 — 요약 계층이 질의를 대신 끝내면서 원본으로 가던 방문이 끊기고, 방문으로 먹고사는 원본이 줄어들면 요약이 쓸 재료(코퍼스)도 같이 마르는 되먹임 고리. 커버리지·인용 클릭률·운영비를 손잡이로 두고, "원본이 마르면 요약도 얕아진다"는 자기 제동 되먹임을 켜고 끄며 축소 균형과 붕괴가 갈리는 지점을 관찰한다.
- **선정 이유**: 2026년 기술 트렌드 정리에서 반복 등장한 '제로 클릭'과 '에이전틱 AI'(사람 대신 웹을 훑고 요약해 오는 사용 방식)를 특정 검색 서비스·AI 제품·언론사를 지목하지 않고 '요약 계층과 원본 사이의 보편 되먹임'으로 일반화. 개별로는 전부 합리적인 선택이 모여 공유지를 고갈시키는 구조라 시뮬레이션·슬라이더·시계열로 풀기 적합하고, 기존 Feed Rank(무엇을 보여 줄지 정하는 랭킹 신호)·Ghost Feed(사람/봇 판별)와 층위가 달라 겹치지 않음. 디자인은 셸의 흑백 미니멀 팔레트 위 60-30-10(중립 패널 60 / 잉크·하어라인·격자 타일 30 / 삼켜진 방문의 앰버 10).
- **검증**: node로 120개월 × 시나리오별 수렴값을 확인 — 커버 0 → 38/40 생존, 커버 0.55·인용 0.12 → 27곳 축소 균형, 커버 0.9·인용 0.02 → 되먹임 ON 20곳 / OFF 0곳(전멸·흡수 상태). 커버 0.85 고정 인용 클릭률 스윕에서 0%→전멸, 5%→11곳, 10%→13곳, 30%→21곳, 50%→27곳으로 거의 비례 증가하는 것을 확인해 "가장 민감한 손잡이는 커버리지가 아니라 인용 클릭률"이라는 결론이 실제로 나오는지 검증했다.
- **기반 자료**:
  - [The 8 trends that will define web development in 2026 — LogRocket](https://blog.logrocket.com/8-trends-web-dev-2026/)
  - [Top Trending Topics in 2026 — ALM Corp](https://almcorp.com/blog/trending-topics/) — AI 가드레일·에이전틱 AI
  - [2026년 글로벌 트렌드 — KDI 경제교육·정보센터](https://eiec.kdi.re.kr/policy/domesticView.do?ac=0000201434) — '제로 클릭' 키워드
  - [Top Trending Topics (Aug 2026) — Exploding Topics](https://explodingtopics.com/blog/trending-topics)

---

## 2026-08-24 / Confound (`/confound`)

- **선정 주제**: 관찰 데이터의 기울기가 인과를 뜻하는가 — 숨은 변수 Z의 자리(교란 Z→X,Z→Y / 매개 X→Z→Y / 충돌 X→Z←Y)에 따라 "보정해야 하는가"의 답이 매번 뒤집히는 것을 같은 산점도 위에서 체험한다.
- **선정 이유**: 2026년 8월 화제가 된 "화면 사용 시간이 많았던 아이가 오히려 인지 처리가 더 좋았다"는 장기 추적 연구 보도처럼, 직관과 어긋나는 관찰연구 헤드라인이 곧바로 인과로 읽히는 현상이 시의성 높은 소재. 특정 연구·기관·인물을 겨냥하지 않고 "관찰 데이터에서 인과를 읽어내는 함정"이라는 보편 통계 개념으로 일반화했다. 특히 교란변수만 다루는 흔한 설명을 넘어 **충돌변수 편향**(보정하는 순간 없던 상관이 생기는 것)까지 다뤄 "보정하면 항상 나아진다"는 통념을 깨는 점이 신박. 기존 Monty Hall(조건부확률의 반직관)과 소재가 인접하지만, 이쪽은 "조건을 어디에 걸어야 하는가 자체가 데이터 밖의 가정"이라는 다른 층위를 다룬다.
- **검증**: 세 구조 × 파라미터 조합에 대해 node로 단순회귀 기울기·부분회귀계수·진짜 인과효과를 계산해, 구조별로 어느 추정치가 진실에 가까운지가 의도대로 나오는지 확인(200 seed × 4 beta, w≥0.6에서 100%, w=0.4에서 95.9%). 판정 배너는 하드코딩이 아니라 매 렌더 실제 데이터로 계산한다.
- **기반 자료**:
  - [Top Science News — ScienceDaily](https://www.sciencedaily.com/news/top/science/) — 스크린 타임과 청소년기 인지 처리에 관한 8년 추적 관찰연구 보도(2026-08)
  - [Latest science news, discoveries and analysis — Nature](https://www.nature.com/news)
  - [August 2026 — Science News](https://www.sciencenews.org/sn-magazine/august-2026)

---

## 2026-08-23 / Stampede (`/stampede`)

- **선정 주제**: 재시도 폭주(retry storm)와 준안정 실패(metastable failure) — 실패가 재시도를 낳고 재시도가 다시 실패를 낳아, 처음의 원인이 사라진 뒤에도 장애가 스스로를 지탱하는 상태. 장애를 직접 주입하고 재시도 정책(즉시/고정/지수 백오프/지수+지터)·서킷 브레이커·재시도 예산·최대 재시도 횟수를 바꿔 가며 회복 여부를 관찰한다.
- **선정 이유**: 2026년 8월 대형 개발 플랫폼의 반복 장애(한 달 십여 건, 7시간 이상 지속)와 에이전트 팬아웃이 만드는 기계 속도의 동기화 재시도가 화제가 된 것을 특정 서비스·사건을 지목하지 않고 '재시도 동역학'이라는 보편 개념으로 변환. 정책 선택·토글·슬라이더·실시간 막대 타임라인이라는 인터랙티브 요소로 풀기 적합하고, 기존 Throttle(서버 측 토큰 버킷 속도 제한)·Fan-Out(작업 DAG 병렬화 한계)과 다루는 층이 달라 겹치지 않음. 디자인은 셸의 흑백 미니멀 팔레트 위 60-30-10(중립 패널 60 / 잉크·하어라인·신규 트래픽 30 / 재시도 앰버 10).
- **기반 자료**:
  - [Exponential Backoff With Jitter: Retry Storms Explained — Webalert](https://web-alert.io/blog/retry-storms-exponential-backoff-jitter-explained) — 백오프는 빈도를, 지터는 동기화를 푼다
  - [The Thundering Herd Problem in Agentic AI — Cockroach Labs](https://www.cockroachlabs.com/blog/agentic-ai-thundering-herd-problem/) — 에이전트 팬아웃이 만드는 내부 동기화
  - [Retry Storm Anti-Pattern: Avoid Thundering Herd — Layrs](https://v0.layrs.me/course/hld/10-performance-monitoring/retry-storm) — 스스로 끝나지 않는 장애
  - [Retries, Backoff and Jitter — CodeReliant](https://www.codereliant.io/p/retries-backoff-jitter) — 재시도 예산·서킷 브레이커
  - [Top Tech News Today, August 21, 2026 — Tech Startups](https://techstartups.com/2026/08/21/top-tech-news-today-august-21-2026-anthropic-apple-broadcom-google-nvidia-openai-tesla-more/) — 8월 개발 플랫폼 장애 반복 보도

---

## 2026-08-22 / Airlock (`/airlock`)

- **선정 주제**: 자율 에이전트의 신뢰 경계. 언어모델의 컨텍스트에는 "주인의 지시"와 "바깥에서 읽어온 자료"를 나누는 구조가 없어 외부 문서 속 한 줄이 명령으로 승격될 수 있다. 다만 피해는 한 실행 안에서 ① 비신뢰 입력 ② 비밀 접근 ③ 외부 통신 세 다리가 모두 겹칠 때만 성립한다("삼중 위험"). 실행을 단계(요청→수집→해석→도구→에어록→결과)별로 따라가며 삼중 위험 성립 여부와 에어록 판정을 보고, 다섯 가지 방어(출처 태깅·컨텍스트 격벽·비밀 격리·전송 허용목록·사람 확인)를 켜고 끄면 즉시 200회 배치가 다시 돌아 유출률과 작업 완료율이 함께 움직인다.
- **선정 이유**: 2026년 에이전트형 AI가 메일·문서·웹을 직접 읽고 도구를 호출하게 되면서 간접 프롬프트 인젝션과 데이터 유출이 반복 화제가 된 흐름을, 특정 제품·업체의 취약점 사건을 겨냥하지 않고 '읽기·비밀·내보내기가 겹칠 때만 경로가 열린다'는 보편 구조로 변환. 토글·슬라이더·단계 애니메이션·200셀 배치 그리드로 인터랙티브하게 풀기 적합하고, 기존 실험 중 보안 계열인 Eavesdrop(BB84 양자 키 분배, 물리 계층 도청 탐지)과 층위가 명확히 다름. 핵심 인사이트는 "완벽한 탐지"가 아니라 세 다리 중 하나를 확실히 빼는 설계이며, 조일수록 완료율이 함께 떨어지는 맞교환. 디자인은 셸 팔레트 위 60-30-10(중립 패널/잉크·프레임 라인/유출 레드 강조)의 네오브루탈 콘솔.
- **기반 자료**:
  - [AI Security in 2026: Prompt Injection, the Lethal Trifecta, and How to Defend — Airia](https://airia.com/blog/ai-security-in-2026-prompt-injection-the-lethal-trifecta-and-how-to-defend/)
  - [The AI Agent Lethal Trifecta — Cloud Security Alliance Research Note](https://labs.cloudsecurityalliance.org/research/csa-research-note-ai-agent-lethal-trifecta-capability-securi/)
  - [AI Agent Security: The Lethal Trifecta Risk Explained — Kiteworks](https://www.kiteworks.com/cybersecurity-risk-management/ai-agent-security-lethal-trifecta/)
  - [The Comprehensive Guide to Prompt Injection Attacks in 2026 — Sysdig](https://www.sysdig.com/learn-cloud-native/prompt-injection)
  - [Hacker News Front Page Roundup — August 2026](https://duklee.net/blog/2026-08-01-hn-front-page-roundup/) — 에이전트 컨텍스트 경유 데이터 유출·공급망 침해가 반복 상단 노출
  - 표준 개념: lethal trifecta(private data / untrusted content / external communication), 간접 프롬프트 인젝션, 최소 권한, egress allowlist, human-in-the-loop 승인 피로

---

## 2026-07-04 / Quorum (`/quorum`)

- **선정 주제**: 분산 합의(consensus) — Raft의 리더 선출·정족수 투표·로그 복제/커밋. 5개 노드가 원형 클러스터를 이루고, 리더의 하트비트가 끊기면 팔로워의 선거 타이머가 만료되어 후보로 출마, 과반(N/2+1=3표)을 얻으면 새 임기(term)의 리더가 된다. 노드를 클릭해 장애/복구를 오가며(특히 리더를 죽여) 재선거가 도는 과정을 보고, "+ 기록 제안"으로 넣은 엔트리가 과반에 복제된 순간에만 확정(commit)되는 것을 로그 매트릭스로 체험한다.
- **선정 이유**: 2026년 AI 워크로드가 다수 노드로 분산되며 분산 시스템 합의(Raft/Paxos)가 개발자 학습 로드맵의 필수 관문으로 반복 회자되던 기술 트렌드를, 특정 서비스·장애 사건을 겨냥하지 않고 '중앙 조정자 없이 다수결로 대표와 확정 기록에 합의한다'는 보편 개념으로 변환. 노드 클릭(장애 주입)·재선거 관전·로그 복제 애니메이션·커밋 판정이라는 풍부한 인터랙티브 요소로 풀기 적합하고, 기존 실험 중 개념이 가장 가까운 Converge(CRDT, 리더 없는 최종 일관성)와도 명확히 구분(강한 합의·단일 리더·정족수)됨. 디자인은 셸 팔레트 위 60-30-10(중립 패널/잉크·프레임 라인/리더 골드 강조), 네오브루탈 그리드 링.
- **기반 자료**:
  - [Understanding Consensus Algorithms in Distributed Systems: A Deep Dive — DEV Community](https://dev.to/dhanush___b/understanding-consensus-algorithms-in-distributed-systems-a-deep-dive-4b70) — Paxos/Raft/BFT, 정족수 개념
  - [Why Distributed Systems Need Consensus Algorithms Like Raft — arpitbhayani.me](https://arpitbhayani.me/blogs/why-consensus/)
  - [Overcoming Distributed Systems Challenges for AI and Blockchain in 2026 — WebProNews](https://www.webpronews.com/overcoming-distributed-systems-challenges-for-ai-and-blockchain-in-2026/) — AI 워크로드로 분산 아키텍처 가속
  - [Consensus Algorithms | System Design — algomaster.io](https://algomaster.io/learn/system-design/consensus-algorithms)
  - 표준 개념: Raft(리더 선출, term, 랜덤 선거 타임아웃, 하트비트/AppendEntries, 과반 복제 후 commit, 로그 최신성 투표 제약)

---

## 2026-07-04 / Reality Gap (`/reality-gap`)

- **선정 주제**: sim-to-real 격차. 시뮬레이션(SIM)에선 노이즈가 0이라 완벽히 착륙하던 bang-bang 제어기가, 센서 노이즈·액추에이터 지연·외란(바람)이 더해진 현실(REAL)에선 과속 접지로 무너진다. 제어기 파라미터(제동 강도·목표 접지 속도·안전 여유 고도)와 현실 노이즈 슬라이더를 조절하고, 캔버스 라이브 착륙 + SIM vs REAL 25회 배치 성공률 비교로 "리얼리티 갭"을 체험한다. 안전 여유 고도를 키우면 격차가 좁혀지지만 보수적(느림)이 되는 강건성 트레이드오프가 핵심.
- **선정 이유**: 2026년 최대 기술 트렌드인 휴머노이드/Physical AI("로봇의 해", 공장 대량생산, "simulate-then-procure" 전환)를 특정 로봇·기업을 겨냥하지 않고 그 이면의 보편 개념 — '시뮬레이션에서 학습한 정책이 현실 노이즈에서 열화한다'는 sim-to-real 격차 — 로 변환. 슬라이더·캔버스 애니메이션·배치 시뮬레이션·성공률 막대라는 풍부한 인터랙티브 요소로 풀기 적합하고, 기존 실험(로봇 팔 IK Reach, 엣지 컴퓨팅 Edge Run, 에이전트 자율성, 진화 Evolve 등)과 주제가 겹치지 않음. 디자인은 미션 컨트롤 콘솔 톤의 네오브루탈 + 60-30-10(딥 차콜/스틸 패널/앰버, 녹·적은 상태 신호).
- **기반 자료**:
  - [Physical AI and humanoid robots — Deloitte Insights (Tech Trends 2026)](https://www.deloitte.com/us/en/insights/topics/technology-management/tech-trends/2026/physical-ai-humanoid-robots.html)
  - [Robotics Trends 2026: Physical AI, Humanoids & The "Simulate-then-Procure" Shift — dbr77](https://dbr77.com/industrial-robotics-trends-2026/) — 시뮬레이션 우선 학습·조달 전환
  - [National Robotics Week — Latest Physical AI Research — NVIDIA Blog](https://blogs.nvidia.com/blog/national-robotics-week-2026/) — 시뮬레이션 기반 force model, 일반목적 Physical AI
  - [Hardware First, Brains Later? The Great American Humanoid Scale-Up of 2026 — Humanoids Daily](https://www.humanoidsdaily.com/news/hardware-first-brains-later-the-great-american-humanoid-scale-up-of-2026)
  - 표준 제어 개념: bang-bang 제어, 센서 노이즈·액추에이터 지연·외란에 의한 sim-to-real reality gap, 안전 마진을 통한 강건성(robustness) 트레이드오프

---

## 2026-06-15 / 물리 엔진 놀이터 (`/physics-lab`) + 물리학 퀴즈 업그레이드 (`/physics-quiz`)

- **선정 주제**: 기존 "물리학 퀴즈"를 확장하는 작업. (1) Matter.js 물리 엔진을 전면에 둔 인터랙티브 샌드박스 신설 — 마우스로 물체를 잡아 던지고, 도형을 투하하고, 중력을 조절하며, 6종 예제(샌드박스·뉴턴의 요람·도미노·피라미드 탑·체인·중력 우물)를 직접 조작. (2) 퀴즈 페이지는 문제를 5→9개로 확장(롤러코스터 수직 루프=구심력, 최대 비거리 각도=45°, 진자 주기=√(L/g), 반발 계수/충돌 종류)하고, 정답 확인 후 슬라이더로 시뮬레이션 파라미터(각도·힘·반발 계수·줄 길이 등)를 바꿔 다시 재생하는 인터랙션 추가. 디자인은 네오브루탈 아케이드 톤으로 통일.
- **선정 이유**: 트렌드 기반이 아니라 사용자 직접 요청("물리학 퀴즈 페이지를 업그레이드, 다른 예제 추가, 물리 엔진 중점 제작"). 기존 PhysicsCanvas가 이미 Matter.js를 쓰지만 '정답 후 관람'에 그쳐 엔진의 인터랙티브 잠재력을 못 살림 → 엔진을 주인공으로 한 놀이터를 분리 신설하고 퀴즈도 '값을 바꿔 실험'하는 능동형으로 전환. 진자 시뮬레이션의 과도한 디버그 로그/부스트 핵 로직도 정리.
- **기반 자료**:
  - 사용자 요청 (세션 내 직접 지시)
  - [Matter.js 공식 사이트/예제](https://brm.io/matter-js/) — newtonsCradle·pyramid·chain·MouseConstraint API
  - 고전역학 표준 개념: 갈릴레이 낙하 법칙, 포물선 운동(R = v²sin2θ/g), 운동량·에너지 보존과 반발 계수, 단진자 주기 T = 2π√(L/g), 수직 원운동 최소 속도 v ≥ √(gr)

---

## 2026-06-15 / Uncanny Valley (`/uncanny-valley`)

- **선정 주제**: 불쾌한 골짜기(uncanny valley). 인간 유사도가 커질수록 호감도가 오르다가 '거의 사람' 구간에서 급락(골짜기)하고 실제 사람에서 급반등하는 곡선. 인간 유사도 슬라이더로 호감도 곡선 위 현재 위치를 이동하고, 그에 맞춰 모핑되는 SVG 얼굴(골짜기에서 칙칙한 올리브 톤·비대칭 눈·빗나간 시선)과 반응 라벨을 본다. '움직임' 토글을 켜면 골짜기가 더 깊어진다(정지보다 동작이 거부감을 키운다는 보편 관찰).
- **선정 이유**: 2026년 상반기 인터넷 화두인 "AI 합성 영상/밈이 현실과 구분되지 않는다 — 하이퍼리얼·언캐니 밸리 유머"를 특정 인물·제품을 겨냥하지 않고 '인간 유사도 ↔ 호감도'라는 보편 곡선(모리의 불쾌한 골짜기)으로 변환. 슬라이더·실시간 곡선 플롯·모핑 얼굴·움직임 토글이라는 풍부한 인터랙티브 요소로 풀기 적합하고, 기존 실험(향수 Nostalgia Engine, 기억 Context Window, 양자 Qubit Lab, 봇 판별 Ghost Feed, 확산 Tipping Point, 네트워크 Latency Arena, API 실험실)과 주제가 완전히 겹치지 않음. 디자인은 클리니컬 랩 무드의 네오브루탈 + 60-30-10(쿨 본화이트/잉크 차콜/애시드 그린).
- **기반 자료**:
  - [The trends that will shape AI and tech in 2026 — IBM](https://www.ibm.com/think/news/ai-tech-trends-predictions-2026)
  - [Humor and relatability drive 2026's biggest viral memes — MSN](https://www.msn.com/en-us/news/other/humor-and-relatability-drive-2026-s-biggest-viral-memes/gm-GMB097309C) — 접근성 높아진 AI 이미지·영상 도구가 만든 초현실·언캐니 밸리 유머의 부상
  - [The Most Viral Memes of 2026 — ViralTrench](https://viraltrench.com/most-viral-memes/) — 밈이 현실과 구분되지 않는 하이퍼리얼 AI 영상의 시대
  - 일반 개념: 모리 마사히로의 불쾌한 골짜기(uncanny valley) — 인간 유사도 대비 호감도 곡선, 움직임이 골짜기를 심화시킨다는 관찰

---

## 2026-06-15 / Latency Arena (`/latency-arena`)

- **선정 주제**: 네트워크 왕복 시간(RTT) 측정·비교. 같은 요청을 여러 엔드포인트에 반복 전송해 min/p50/p95/max 분포를 막대·스파크라인으로 비교하고, 첫 요청(DNS·TLS 핸드셰이크)이 왜 느린지, 왜 평균보다 p50(중앙값)이 체감 속도에 가까운지를 체험한다. 브라우저에서 `fetch(mode: 'no-cors')`로 응답 본문은 읽지 않고 왕복 시간만 측정한다.
- **선정 이유**: 트렌드 검색이 아니라 사이트의 기존 자산(`/api-experiment` API 실험실 — REST/JSON/SOAP/gRPC/GraphQL)을 직접 잇는 개발자 네트워킹 리터러시 실험으로 기획. 사용자 추천 작업("사이트 통합 기능 + 새 실험 페이지")의 '새 실험' 갈래로 선택됨. 백엔드 추가 없이 동작하고(동일 출처 `/api/hello` + 외부 공개 엔드포인트), p50/p95·꼬리 지연·핸드셰이크 비용 같은 실제 성능 개념을 인터랙티브하게 풀 수 있어 기존 실험과 주제가 겹치지 않음.
- **기반 자료**:
  - 신규 외부 검색 자료 없음 — 기존 API 실험실(`/api-experiment`)의 연장 및 일반적 네트워크 성능 개념(RTT, percentile latency, TCP/TLS handshake)에 기반.

---

## 2026-06-15 / Context Window (`/context-window`)

- **선정 주제**: 유한한 기억(컨텍스트 창)과 망각. 사실/잡담을 주입해 한정된 토큰 창을 채우면 오래된 기억부터 밀려나고(eviction), "압축(요약)"은 공간을 벌지만 디테일이 손실되어 회상이 흐릿해진다. 회상 테스트로 "또렷이 기억 / 요약에만 흐릿하게 / 완전히 망각" 3단계를 체험한다.
- **선정 이유**: 2026년 상반기 기술 화두인 'AI 에이전트 메모리 / 컨텍스트 창 / 메모리 감쇠(memory decay)·오염'을 특정 제품·기업을 겨냥하지 않고 '한정된 기억 용량과 망각'이라는 보편 개념으로 다룰 수 있어 적합. 토큰 미터·eviction·손실 압축·회상 판정이라는 풍부한 인터랙티브 요소로 풀 수 있고, 기존 실험(향수 사이클 Nostalgia Engine, 양자 Qubit Lab, 봇 판별 Ghost Feed, 확산 Tipping Point, API 실험실)과 주제가 완전히 겹치지 않음.
- **기반 자료**:
  - [State of AI Agent Memory 2026: Benchmarks, Architectures & Production Gaps — mem0.ai](https://mem0.ai/blog/state-of-ai-agent-memory-2026) — 메모리가 일급 아키텍처 요소로, 3계층 구조와 성능 격차
  - [Beyond the Context Window: The Rise of Persistent Memory — hyperight.com](https://hyperight.com/beyond-the-context-window-the-rise-of-persistent-memory-cognitive-capital/)
  - [Why AI Agents Forget: Memory Decay and Context Contamination Explained — DEV Community](https://dev.to/pickuma/why-ai-agents-forget-memory-decay-and-context-contamination-explained-44kd)
  - [Agent Context Windows in 2026: How to Stop Your AI from Forgetting Everything — sparkco.ai](https://sparkco.ai/blog/agent-context-windows-in-2026-how-to-stop-your-ai-from-forgetting-everything)

---

## 2026-06-15 / Nostalgia Engine (`/nostalgia-engine`)

- **선정 주제**: 향수 사이클(nostalgia cycle) — 현재는 늘 과거의 한 시대를 다시 불러내며, 그 주기(갭)는 한 세대(약 30년)에서 점점 짧아진다. 현재 연도·향수 갭 슬라이더, 시대축을 훑는 타임랩스, 소환되는 10년대 미감 카드로 체험한다.
- **선정 이유**: 2026년 1월부터 SNS를 휩쓴 "2026 is the new 2016" / "Great Meme Reset" 트렌드를 특정 인물·사건 없이 '문화가 일정 주기로 과거를 소환한다'는 보편 개념으로 변환. 슬라이더·프리셋·타임랩스 애니메이션·시대 미감 카드라는 인터랙티브 요소로 풀기 적합하고, 기존 실험(봇 판별 Ghost Feed, 확산 Tipping Point, 양자 Qubit Lab, API 실험실)과 주제가 겹치지 않음. 디자인은 레트로 미감에 맞춘 네오브루탈 + 60-30-10(웜크림/잉크블랙/버밀리언).
- **기반 자료**:
  - [2026 is the new 2016 — Wikipedia](https://en.wikipedia.org/wiki/2026_is_the_new_2016) — 10년 주기 디지털 향수 리셋
  - [Is 2026 the New 2016? Inside the Internet's 10-Year Nostalgia Reset — CEO Today](https://www.ceotodaymagazine.com/2026/01/is-2026-the-new-2016-nostalgia-trend/)
  - [2016 Trend / 2026 Is the New 2016 — Know Your Meme](https://knowyourmeme.com/memes/2016-trend-2026-is-the-new-2016) — Great Meme Reset의 기원
  - [The '2026 is the new 2016' trend is taking over social media — The Week](https://theweek.com/culture-life/nostalgia-2016-social-media-trend)

---

## 2026-06-11 / Qubit Lab (`/qubit-lab`)

- **선정 주제**: 양자 비트(큐비트)의 중첩과 측정 붕괴. 회전 게이트로 P(0)/P(1) 확률을 정하고, 단일 측정 시 하나의 값으로 붕괴하며 중첩이 사라지는 과정 + 1000회 반복 측정 분포를 체험한다.
- **선정 이유**: "2026년 양자 컴퓨터가 처음으로 고전 컴퓨터를 추월한다(IBM 예측)"는 시의성 높은 기술 트렌드를 특정 기업·사건 없이 '중첩·측정 붕괴'라는 보편 물리 개념으로 다룰 수 있고, 확률 다이얼·게이트(X/H)·단일 측정 붕괴·반복 측정 히스토그램이라는 풍부한 인터랙티브 요소로 풀기 적합. 기존 실험(확산 시뮬 Tipping Point, 봇 판별 Ghost Feed, API 실험실)과 주제가 완전히 겹치지 않음.
- **기반 자료**:
  - [The trends that will shape AI and tech in 2026 — IBM](https://www.ibm.com/think/news/ai-tech-trends-predictions-2026) — 2026년 양자 컴퓨터가 고전 컴퓨터를 첫 추월(양자 어드밴티지) 전망
  - [2026: 10 Things That Matter in AI Right Now — MIT Technology Review](https://www.technologyreview.com/2026/04/21/1135643/10-ai-artificial-intelligence-trends-technologies-research-2026/)
  - [What's next in AI: 7 trends to watch in 2026 — Microsoft](https://news.microsoft.com/source/features/ai/whats-next-in-ai-7-trends-to-watch-in-2026/)

---

## 2026-06-11 / Ghost Feed (`/ghost-feed`)

- **선정 주제**: 죽은 인터넷 이론(Dead Internet Theory) — 사람 글 vs 봇 글 판별 게임. 라운드가 깊어질수록 피드 내 AI 생성물 비중이 오르는 곡선을 체험한다.
- **선정 이유**: 'AI 콘텐츠가 인터넷을 잠식한다'는 시의성 높은 주제를 특정 인물·사건 없이 보편 개념으로 다룰 수 있고, 판별·점수·연속·AI 점유율 곡선이라는 인터랙티브 요소로 풀기 적합. 기존 실험(확산 시뮬 Tipping Point, API 실험실)과 주제가 겹치지 않음.
- **기반 자료**:
  - [The 8 trends that will define web development in 2026 — LogRocket](https://blog.logrocket.com/8-trends-web-dev-2026/) — Machine Experience(MX), 기계를 위한 웹
  - [12 Defining Web Development Trends for 2026 — Figma](https://www.figma.com/resource-library/web-development-trends/)
  - [Top Trending Memes on Social Media (June 2026) — NapoleonCat](https://napoleoncat.com/blog/trending-memes/) — 현실과 구별되지 않는 AI 밈, Great Meme Reset
  - [Web Design Trends 2026: AI, 3D, Ambient UI — Index.dev](https://www.index.dev/blog/web-design-trends)
