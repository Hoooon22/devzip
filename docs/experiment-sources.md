# 실험 페이지 출처 기록

각 실험 페이지가 "어떤 자료/트렌드에 기반해" 만들어졌는지 남기는 로그다.
새 실험을 추가할 때마다 최신 항목을 위쪽에 덧붙인다.

기록 형식:
- **날짜 / 실험명 (라우트)**
- **선정 주제**: 한 줄 요약
- **선정 이유**: 왜 이 주제를 골랐는지
- **기반 자료**: 참고한 검색 결과·기사 링크 목록

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
