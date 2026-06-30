const projects = [
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
