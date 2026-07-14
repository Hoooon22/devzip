const projects = [
    {
        id: 54,
        name: 'Crossflow',
        subtitle: '무신호 교차로 예약 통행 (자율주행 협조)',
        description: '신호등 대신 교차로 슬롯을 예약해 틈마다 끼어드는 자율주행 협조(AIM) 실험',
        link: '/crossflow',
        active: true,
        startDate: '2026-07-14',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🛣️'
    },
    {
        id: 53,
        name: 'Grid',
        subtitle: '실시간 수급 균형 (계통 주파수)',
        description: '전기는 저장되지 않는다 — 폭염 부하 급증에 발전을 맞춰 60Hz를 지키는 계통 제어 실험',
        link: '/grid',
        active: true,
        startDate: '2026-07-13',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '⚡'
    },
    {
        id: 52,
        name: 'Thermal',
        subtitle: '열 확산과 라우팅 (열방정식)',
        description: '재료를 칠해 열이 흐르는 길을 직접 설계하는 열 확산 실험',
        link: '/thermal',
        active: true,
        startDate: '2026-07-10',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🌡️'
    },
    {
        id: 51,
        name: 'Lotto',
        subtitle: '로또 1등 확률 (8,145,060분의 1)',
        description: '번호를 계속 사도 1등은 오지 않는 로또 1/814만 확률을 눈으로 체감하는 실험',
        link: '/lotto',
        active: true,
        startDate: '2026-07-08',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🎰'
    },
    {
        id: 50,
        name: 'Bracket',
        subtitle: '단판 토너먼트의 운',
        description: '최강팀도 자주 지는 단판 승부 — 운과 대진 크기로 우승 분포가 어떻게 흔들리는지 보는 실험',
        link: '/bracket',
        active: true,
        startDate: '2026-07-08',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🏆'
    },
    {
        id: 49,
        name: 'Pathfind',
        subtitle: '최단 경로 탐색 (A*)',
        description: '벽을 그리고 시작·목표를 끌어 A*·Dijkstra·Greedy가 헤매는 넓이를 비교하는 실험',
        link: '/pathfind',
        active: true,
        startDate: '2026-07-07',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🧭'
    },
    {
        id: 48,
        name: 'Attention',
        subtitle: '어텐션 메커니즘 (self-attention)',
        description: '토큰마다 다른 토큰을 얼마나 볼지 정하는 softmax 가중치를 행렬로 체험하는 실험',
        link: '/attention',
        active: true,
        startDate: '2026-07-07',
        endDate: '',
        category: '실험/AI',
        isProduction: false, // 실험용
        thumbnail: '👁️'
    },
    {
        id: 47,
        name: 'Retrieval',
        subtitle: '벡터 검색 (의미 최근접 이웃)',
        description: '쿼리와 가장 가까운 벡터를 골라 context로 삼는 RAG 검색을 드래그로 체험하는 실험',
        link: '/retrieval',
        active: true,
        startDate: '2026-07-06',
        endDate: '',
        category: '실험/AI',
        isProduction: false, // 실험용
        thumbnail: '🧲'
    },
    {
        id: 46,
        name: 'Consistent Hash',
        subtitle: '일관성 해싱 (해시 링)',
        description: '노드가 드나들어도 몇몇 키만 옮겨지는 해시 링으로 캐시 붕괴를 막는 실험',
        link: '/consistent-hash',
        active: true,
        startDate: '2026-07-05',
        endDate: '',
        category: '실험/네트워크',
        isProduction: false, // 실험용
        thumbnail: '💍'
    },
    {
        id: 45,
        name: 'Quorum',
        subtitle: '합의 알고리즘 (리더 선출)',
        description: '중앙 조정자 없이 다수결로 리더를 뽑고 기록을 확정하는 Raft 합의 실험',
        link: '/quorum',
        active: true,
        startDate: '2026-07-04',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🏛️'
    },
    {
        id: 44,
        name: 'Reality Gap',
        subtitle: 'sim-to-real 격차',
        description: '시뮬레이션에선 완벽하던 제어기가 노이즈·지연·외란이 있는 현실로 나오면 무너지는 sim-to-real 격차를 착륙 시뮬레이터로 체험하는 실험',
        link: '/reality-gap',
        active: true,
        startDate: '2026-07-04',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🚀'
    },
    {
        id: 43,
        name: 'Evolve',
        subtitle: '진화 알고리즘 (유전 알고리즘)',
        description: '변이와 선택만 반복해 잡음에서 목표 패턴을 길러내는 유전 알고리즘 실험',
        link: '/evolve',
        active: true,
        startDate: '2026-07-03',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🧫'
    },
    {
        id: 42,
        name: 'Throttle',
        subtitle: '요청 속도 제한 (토큰 버킷)',
        description: '요청 폭주를 다스리며 평균은 묶고 순간 폭주는 받아내는 토큰 버킷 실험',
        link: '/throttle',
        active: true,
        startDate: '2026-07-02',
        endDate: '',
        category: '실험/네트워크',
        isProduction: false, // 실험용
        thumbnail: '🚦'
    },
    {
        id: 41,
        name: 'Converge',
        subtitle: '충돌 없는 병합 (CRDT)',
        description: '따로 편집해도 다툼 없이 같은 결과로 수렴하는 CRDT 실험',
        link: '/converge',
        active: true,
        startDate: '2026-07-01',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🔗'
    },
    {
        id: 40,
        name: 'Islands',
        subtitle: '섬 아키텍처 (부분 하이드레이션)',
        description: '상호작용이 일어나는 위젯에만 JS를 실어보내는 부분 하이드레이션 실험',
        link: '/islands',
        active: true,
        startDate: '2026-07-01',
        endDate: '',
        category: '실험/웹',
        isProduction: false, // 실험용
        thumbnail: '🏝️'
    },
    {
        id: 39,
        name: 'Synthetic',
        subtitle: '합성 데이터 생성',
        description: '원본을 베끼지 않고 분포만 닮게 만드는 합성 데이터 실험',
        link: '/synthetic',
        active: true,
        startDate: '2026-06-30',
        endDate: '',
        category: '실험/AI',
        isProduction: false, // 실험용
        thumbnail: '🧬'
    },
    {
        id: 38,
        name: 'Reach',
        subtitle: '로봇 팔 역기구학',
        description: '목표점을 향해 관절 각도를 거꾸로 푸는 로봇 팔 역기구학(IK) 실험',
        link: '/reach',
        active: true,
        startDate: '2026-06-29',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🦾'
    },
    {
        id: 37,
        name: 'Quantize',
        subtitle: '가중치 양자화',
        description: '정밀도를 깎아 거대한 모델을 손바닥 위로 올리는 양자화 실험',
        link: '/quantize',
        active: true,
        startDate: '2026-06-29',
        endDate: '',
        category: '실험/AI',
        isProduction: false, // 실험용
        thumbnail: '🪙'
    },
    {
        id: 36,
        name: 'Feed Rank',
        subtitle: '추천 랭킹 신호',
        description: '팔로우가 아니라 참여 신호가 피드를 정하고 필터 버블을 만드는 추천 랭킹 실험',
        link: '/feed-rank',
        active: true,
        startDate: '2026-06-26',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '📲'
    },
    {
        id: 35,
        name: 'Eavesdrop',
        subtitle: '양자 키 분배 (BB84)',
        description: '광자를 엿보면 흔적이 남아 도청이 들통나는 양자 키 분배 실험',
        link: '/eavesdrop',
        active: true,
        startDate: '2026-06-25',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🔑'
    },
    {
        id: 34,
        name: 'Speculative',
        subtitle: '추측 디코딩',
        description: '작은 모델이 미리 찍고 큰 모델이 한 번에 검증하는 추론 가속 실험',
        link: '/speculative',
        active: true,
        startDate: '2026-06-25',
        endDate: '',
        category: '실험/AI',
        isProduction: false, // 실험용
        thumbnail: '⏩'
    },
    {
        id: 33,
        name: 'Interpolate',
        subtitle: '공간 보간',
        description: '흩어진 관측점 사이의 빈 공간을 채워 연속 표면을 추정하는 GIS 보간 실험',
        link: '/interpolate',
        active: true,
        startDate: '2026-06-24',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🗺️'
    },
    {
        id: 32,
        name: 'Mixture',
        subtitle: '전문가 혼합 (MoE)',
        description: '토큰마다 어울리는 전문가 소수만 깨우는 희소 라우팅(MoE) 실험',
        link: '/mixture',
        active: true,
        startDate: '2026-06-24',
        endDate: '',
        category: '실험/AI',
        isProduction: false, // 실험용
        thumbnail: '🔀'
    },
    {
        id: 31,
        name: 'Diffusion',
        subtitle: '확산 생성 모델',
        description: '순수 노이즈를 한 스텝씩 되감아 형태를 만드는 역확산 생성 실험',
        link: '/diffusion',
        active: true,
        startDate: '2026-06-23',
        endDate: '',
        category: '실험/AI',
        isProduction: false, // 실험용
        thumbnail: '🌫️'
    },
    {
        id: 30,
        name: 'Movement Lab',
        subtitle: '무브먼트 실험실',
        description: '3D 캐릭터 컨트롤러를 직접 튜닝하는 게임 무브먼트 실험',
        link: '/movement-lab',
        active: true,
        startDate: '2026-06-23',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🎮'
    },
    {
        id: 29,
        name: 'Breaking Point',
        subtitle: '물리엔진 한계 시험',
        description: '물체를 쏟아부으며 FPS가 붕괴하는 한계점을 찾는 스트레스 테스트',
        link: '/breaking-point',
        active: true,
        startDate: '2026-06-22',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🧨'
    },
    {
        id: 28,
        name: 'Tokenizer',
        subtitle: '토큰 경제',
        description: '문장이 토큰으로 쪼개지는 과정과 언어별 비용 차이를 보는 실험',
        link: '/tokenizer',
        active: true,
        startDate: '2026-06-22',
        endDate: '',
        category: '실험/AI',
        isProduction: false, // 실험용
        thumbnail: '🔡'
    },
    {
        id: 27,
        name: 'Fan-Out',
        subtitle: '병렬 분산의 한계',
        description: '하나의 목표를 여러 에이전트에 나눌 때 생기는 속도 한계 실험',
        link: '/fan-out',
        active: true,
        startDate: '2026-06-19',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🕸️'
    },
    {
        id: 26,
        name: 'Lossy',
        subtitle: '손실 압축',
        description: '해상도·색 심도를 줄여 데이터량과 화질의 거래를 보는 압축 실험',
        link: '/lossy',
        active: true,
        startDate: '2026-06-18',
        endDate: '',
        category: '실험/그래픽스',
        isProduction: false, // 실험용
        thumbnail: '🗜️'
    },
    {
        id: 25,
        name: 'Edge Run',
        subtitle: '엣지 컴퓨팅',
        description: '연산을 사용자 가까운 엣지 노드로 분산해 지연을 줄이는 실험',
        link: '/edge-run',
        active: true,
        startDate: '2026-06-18',
        endDate: '',
        category: '실험/네트워크',
        isProduction: false, // 실험용
        thumbnail: '🛰️'
    },
    {
        id: 24,
        name: 'Rubber Band',
        subtitle: '고무줄 난이도',
        description: '보이지 않게 난이도를 조절해 승률을 묶어두는 동적 난이도(DDA) 실험',
        link: '/rubber-band',
        active: true,
        startDate: '2026-06-17',
        endDate: '',
        category: '실험/게임',
        isProduction: false, // 실험용
        thumbnail: '🎮'
    },
    {
        id: 23,
        name: 'Murmuration',
        subtitle: '새 떼의 군무',
        description: '세 줄의 규칙만으로 하늘을 뒤덮는 군무가 태어나는 창발 실험',
        link: '/murmuration',
        active: true,
        startDate: '2026-06-17',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🐦'
    },
    {
        id: 22,
        name: '물리 엔진 놀이터',
        description: 'Matter.js로 직접 굴리고 쌓고 무너뜨리는 인터랙티브 샌드박스',
        link: '/physics-lab',
        active: true,
        startDate: '2026-06-15',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🧪'
    },
    {
        id: 21,
        name: 'Uncanny Valley',
        subtitle: '불쾌한 골짜기',
        description: '인간 유사도와 호감도 사이의 골짜기를 그려보는 실험',
        link: '/uncanny-valley',
        active: true,
        startDate: '2026-06-15',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🎭'
    },
    {
        id: 20,
        name: 'Latency Arena',
        subtitle: '지연 시간 경기장',
        description: '같은 요청을 여러 엔드포인트에 보내 왕복 시간(RTT)을 비교하는 실험',
        link: '/latency-arena',
        active: true,
        startDate: '2026-06-15',
        endDate: '',
        category: '실험/네트워크',
        isProduction: false, // 실험용
        thumbnail: '📡'
    },
    {
        id: 19,
        name: 'Context Window',
        subtitle: '기억의 한계',
        description: '창이 차면 오래된 기억부터 밀려나는 컨텍스트 망각 시뮬레이터',
        link: '/context-window',
        active: true,
        startDate: '2026-06-15',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🧠'
    },
    {
        id: 18,
        name: 'Nostalgia Engine',
        subtitle: '향수 사이클',
        description: '점점 짧아지는 향수 사이클을 보여주는 시뮬레이터',
        link: '/nostalgia-engine',
        active: true,
        startDate: '2026-06-15',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '📼'
    },
    {
        id: 17,
        name: 'Qubit Lab',
        subtitle: '양자 중첩 실험실',
        description: '관측 전까지 답이 정해지지 않는 양자 중첩·측정 붕괴 실험',
        link: '/qubit-lab',
        active: true,
        startDate: '2026-06-11',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '⚛️'
    },
    {
        id: 16,
        name: 'Ghost Feed',
        subtitle: '죽은 인터넷 판별',
        description: '이 글이 사람일까 봇일까 — 죽은 인터넷 이론 판별 게임',
        link: '/ghost-feed',
        active: true,
        startDate: '2026-06-11',
        endDate: '',
        category: '실험/게임',
        isProduction: false, // 실험용
        thumbnail: '👻'
    },
    {
        id: 15,
        name: 'Tipping Point',
        subtitle: '확산의 임계점',
        description: '하나의 신호가 모두에게 번지는 과정을 보는 확산 시뮬레이터',
        link: '/tipping-point',
        active: true,
        startDate: '2026-06-11',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '💥'
    },
    {
        id: 14,
        name: 'API 실험실',
        description: 'REST·JSON·SOAP·gRPC·GraphQL 등 다양한 API를 실험하는 공간',
        link: '/api-experiment',
        active: true,
        startDate: '2026-01-06',
        endDate: '',
        category: '프로젝트/개발도구',
        isProduction: false, // 실험용
        thumbnail: '🧪'
    },
    {
        id: 13,
        name: 'Command Stack',
        subtitle: '명령어 일정 관리',
        description: '명령어로 빠르게 일정을 추가·관리하는 개인 일정 시스템',
        link: '/commandstack',
        active: true,
        startDate: '2026-01-05',
        endDate: '',
        category: '프로젝트/생산성도구',
        isProduction: true, // 프로덕션
        thumbnail: '⚡'
    },
    {
        id: 12,
        name: 'Conflux',
        subtitle: '알림 관제 센터',
        description: '모든 알림 스트림을 하나로 모으는 통합 관제 센터',
        link: '/conflux',
        active: true,
        startDate: '2025-12-28',
        endDate: '',
        category: '프로젝트/개발도구',
        isProduction: true, // 프로덕션
        thumbnail: '🌊'
    },
    {
        id: 11,
        name: '카오틱 뮤직박스',
        description: '실시간으로 함께 음악을 만드는 참여형 시퀀서',
        link: '/chaotic-music-box',
        active: true,
        startDate: '2025-10-20',
        endDate: '',
        category: '음악/협업',
        requiresLogin: true,
        isProduction: false, // 실험용
        thumbnail: '🎵'
    },
    {
        id: 10,
        name: 'Hopperbox',
        subtitle: '생각 정리함',
        description: '생각한 무언가를 일단 넣어보는 AI 메모함',
        link: '/hopperbox',
        active: true,
        startDate: '2025-09-30',
        endDate: '',
        category: '생산성/AI',
        isProduction: false, // 실험용
        thumbnail: '🤖'
    },
    {
        id: 9,
        name: '실시간 라이브 채팅',
        description: '다른 사람들과 실시간으로 대화하세요!',
        link: '/livechat',
        active: true,
        startDate: '2025-09-12',
        endDate: '2025-09-25',
        isProduction: false, // 실험용
        thumbnail: '💬'
    },
    {
        id: 5,
        name: 'devzip 서버 대시보드',
        description: '서버의 정보를 표시하는 대시보드',
        link: '/dashboard',
        active: true,
        startDate: '2024-11-26',
        endDate: '',
        category: '프로젝트/관리자용',
        requiresAdmin: true,
        isProduction: false, // 실험용
        thumbnail: '📊'
    },
    {
        id: 2,
        name: '누구든지 흔적을 남기는 공간',
        description: '들어와서 흔적을 남기세요.',
        link: '/Guestbook',
        active: true,
        startDate: '2024-07-10',
        endDate: '2024-12-30',
        isProduction: false, // 실험용
        thumbnail: '📝'
    },
    {
        id: 7,
        name: 'TraceBoard',
        subtitle: '행동 로그 대시보드',
        description: '웹사이트 사용자 행동을 시각화하는 로그 대시보드',
        link: '/traceboard',
        active: true,
        startDate: '2025-04-09',
        endDate: '',
        category: '프로젝트/관리자용',
        requiresAdmin: true,
        isProduction: false, // 실험용
        thumbnail: '📈'
    },
    {
        id: 3,
        name: '코딩 농담 사전',
        description: 'Jokes API를 이용한 코딩 Joke 번역',
        link: '/Joke',
        active: true,
        startDate: '2024-09-05',
        endDate: '2024-09-06',
        isProduction: false, // 실험용
        thumbnail: '😂'
    },
    {
        id: 4,
        name: 'DevZip API 목록',
        description: 'DevZip에서 제공하는 모든 API 엔드포인트와 사용법 소개',
        link: '/apiPage',
        active: true,
        startDate: '2024-10-14',
        endDate: '',
        isProduction: false, // 실험용
        thumbnail: '🔌'
    },
    {
        id: 6,
        name: '실시간 트렌드 검색어 채팅',
        description: '실시간 인기 검색어에 대한 소통을 위한!',
        link: '/trendchat',
        active: true,
        startDate: '2025-02-11',
        endDate: '',
        isProduction: false, // 실험용
        thumbnail: '🔥'
    },
    {
        id: 8,
        name: '물리학 퀴즈',
        description: '물리 문제를 풀고 실제 물리 현상을 시뮬레이션으로 확인해보세요!',
        link: '/physics-quiz',
        active: true,
        startDate: '2025-09-01',
        endDate: '',
        category: '교육/게임',
        isProduction: false, // 실험용
        thumbnail: '🔬'
    },
    {
        id: 1,
        name: '매거진 퐁당',
        description: '꿈을 쫒는 청소년들을 위한 웹 매거진',
        link: 'https://www.stoneinwell.com',
        active: false,
        startDate: '2023-01-01',
        endDate: '2023-06-30',
        isProduction: false, // 실험용
        thumbnail: '📰'
    },
    // {
    //     id: 4,
    //     name: '리그오브레전드 패치노트',
    //     description: '패치노트를 보다 간편하고 빠르게! (개발 일시정지)',
    //     link: '/lolPatch',
    //     active: true,
    //     startDate: '2024-09-07',
    //     endDate: ''
    // },
    // {
    //     id: 5,
    //     name: '서버 성능 지표기',
    //     description: '실시간 서버 성능 지표기 (자/타 사이트)',
    //     link: '/serverMonit',
    //     active: true,
    //     startDate: '2024-09-25',
    //     endDate: ''
    // },
    // {
    //     id: 3,
    //     name: '타임 킬링용 게임',
    //     description: '...',
    //     link: '',
    //     active: false,
    //     startDate: '2024-07-01',
    //     endDate: ''
    // },
    // {
    //     id: 4,
    //     name: '스토리 있는 로그라이크',
    //     description: '...',
    //     link: '',
    //     active: false,
    //     startDate: '',
    //     endDate: '2023-09-30'
    // },
    // {
    //     id: 5,
    //     name: '피드백 게임',
    //     description: '플레이어의 피드백을 직접 소통받으면서 실시간 업데이트를 진행하는 게임',
    //     link: '/Guestbook',
    //     active: false,
    //     startDate: '',
    //     endDate: '2023-09-30'
    // },
    // {
    //     id: 6,
    //     name: '치료 목적 게임',
    //     description: '...',
    //     link: '/Guestbook',
    //     active: false,
    //     startDate: '',
    //     endDate: '2023-09-30'
    // },
    // 추가 프로젝트들...
];

export default projects;
