const projects = [
    {
        id: 31,
        name: 'Diffusion',
        description: '생성 AI는 어떻게 노이즈에서 그림을 만드는가 — 순수 노이즈를 한 스텝씩 되감아 형태가 떠오르는 역확산(denoising)을 직접 스크럽하는 생성 모델 실험. 끝까지 걷지 않으면 남는 거친 입자가 곧 요즘 인터넷의 그 어설픈 AI 이미지 질감이다',
        link: '/diffusion',
        active: true,
        startDate: '2026-06-23',
        endDate: '',
        pinned: true,
        category: '실험/AI',
        isProduction: false, // 실험용
        thumbnail: '🌫️'
    },
    {
        id: 30,
        name: 'Movement Lab',
        description: '3D 게임 캐릭터의 움직임은 어떻게 손맛이 되는가 — 이동·가속·점프·공중 제어부터 코요테 타임·점프 버퍼까지, 캐릭터 컨트롤러를 직접 튜닝하며 계단·경사로·공중 발판을 누비는 무브먼트 실험실',
        link: '/movement-lab',
        active: true,
        startDate: '2026-06-23',
        endDate: '',
        pinned: true,
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🎮'
    },
    {
        id: 29,
        name: 'Breaking Point',
        description: '웹 물리엔진은 어디서 무너지는가 — 물체를 쏟아부으며 FPS가 붕괴하는 한계점을 찾는 스트레스 테스트. 2D(Matter.js)와 3D(three.js+cannon-es)의 한계를 직접 비교',
        link: '/breaking-point',
        active: true,
        startDate: '2026-06-22',
        endDate: '',
        pinned: true,
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🧨'
    },
    {
        id: 28,
        name: 'Tokenizer',
        description: 'AI는 글을 글자가 아니라 토큰으로 읽는다 — 입력한 문장이 토큰으로 쪼개지는 과정과 그 비용·언어별 효율 차이를 실시간으로 보는 토큰 경제 실험',
        link: '/tokenizer',
        active: true,
        startDate: '2026-06-22',
        endDate: '',
        pinned: true,
        category: '실험/AI',
        isProduction: false, // 실험용
        thumbnail: '🔡'
    },
    {
        id: 27,
        name: 'Fan-Out',
        description: '일꾼을 늘려도 깰 수 없는 벽 — 하나의 목표를 여러 에이전트에 분산할 때 의존성 사슬(임계 경로)이 만드는 속도 한계를 체험하는 병렬 스케줄링 실험',
        link: '/fan-out',
        active: true,
        startDate: '2026-06-19',
        endDate: '',
        pinned: true,
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🕸️'
    },
    {
        id: 26,
        name: 'Lossy',
        description: '압축은 버리는 기술이다 — 해상도·색 심도를 줄여 데이터량과 화질의 거래를 직접 체험하는 손실 압축 실험',
        link: '/lossy',
        active: true,
        startDate: '2026-06-18',
        endDate: '',
        pinned: true,
        category: '실험/그래픽스',
        isProduction: false, // 실험용
        thumbnail: '🗜️'
    },
    {
        id: 25,
        name: 'Edge Run',
        description: '거리가 곧 지연이다 — 연산을 사용자 가까이의 엣지 노드로 분산해 왕복 지연이 줄어드는 과정을 보는 엣지 컴퓨팅 실험',
        link: '/edge-run',
        active: true,
        startDate: '2026-06-18',
        endDate: '',
        pinned: true,
        category: '실험/네트워크',
        isProduction: false, // 실험용
        thumbnail: '🛰️'
    },
    {
        id: 24,
        name: 'Rubber Band',
        description: '게임은 당신이 이기길 바라지 않는다 — 보이지 않는 손이 난이도를 당겨 늘 아슬아슬한 승률에 묶어두는 동적 난이도(DDA) 실험',
        link: '/rubber-band',
        active: true,
        startDate: '2026-06-17',
        endDate: '',
        pinned: true,
        category: '실험/게임',
        isProduction: false, // 실험용
        thumbnail: '🎮'
    },
    {
        id: 23,
        name: 'Murmuration',
        description: '우두머리도 설계도도 없이 세 줄의 규칙(분리·정렬·응집)만으로 하늘을 뒤덮는 군무가 태어나는 창발 실험실',
        link: '/murmuration',
        active: true,
        startDate: '2026-06-17',
        endDate: '',
        pinned: true,
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🐦'
    },
    {
        id: 22,
        name: '물리 엔진 놀이터',
        description: 'Matter.js 위에서 직접 굴리고 쌓고 무너뜨리는 인터랙티브 샌드박스 — 뉴턴의 요람·도미노·중력 우물 등',
        link: '/physics-lab',
        active: true,
        startDate: '2026-06-15',
        endDate: '',
        pinned: true,
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🧪'
    },
    {
        id: 21,
        name: 'Uncanny Valley',
        description: '거의 사람일수록 더 친근할까 — 인간 유사도와 호감도의 골짜기를 그려보는 실험',
        link: '/uncanny-valley',
        active: true,
        startDate: '2026-06-15',
        endDate: '',
        pinned: true,
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🎭'
    },
    {
        id: 20,
        name: 'Latency Arena',
        description: '같은 요청을 여러 엔드포인트에 반복해 왕복 시간(RTT)을 측정·비교하는 실험',
        link: '/latency-arena',
        active: true,
        startDate: '2026-06-15',
        endDate: '',
        pinned: true,
        category: '실험/네트워크',
        isProduction: false, // 실험용
        thumbnail: '📡'
    },
    {
        id: 19,
        name: 'Context Window',
        description: '기억은 무한하지 않다 — 컨텍스트 창이 차면 오래된 기억부터 밀려나는 망각 시뮬레이터',
        link: '/context-window',
        active: true,
        startDate: '2026-06-15',
        endDate: '',
        pinned: true,
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🧠'
    },
    {
        id: 18,
        name: 'Nostalgia Engine',
        description: '현재는 늘 과거의 한 시대를 소환한다 — 점점 짧아지는 향수 사이클 시뮬레이터',
        link: '/nostalgia-engine',
        active: true,
        startDate: '2026-06-15',
        endDate: '',
        pinned: true,
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '📼'
    },
    {
        id: 17,
        name: 'Qubit Lab',
        description: '관측 전까지 답은 정해져 있지 않다 — 양자 중첩·측정 붕괴 실험실',
        link: '/qubit-lab',
        active: true,
        startDate: '2026-06-11',
        endDate: '',
        pinned: true,
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '⚛️'
    },
    {
        id: 16,
        name: 'Ghost Feed',
        description: '이 글, 사람일까 봇일까 — 죽은 인터넷 이론 판별 게임',
        link: '/ghost-feed',
        active: true,
        startDate: '2026-06-11',
        endDate: '',
        pinned: true,
        category: '실험/게임',
        isProduction: false, // 실험용
        thumbnail: '👻'
    },
    {
        id: 15,
        name: 'Tipping Point',
        description: '하나의 신호가 어떻게 모두에게 번지는가 — 확산 메커니즘 시뮬레이터',
        link: '/tipping-point',
        active: true,
        startDate: '2026-06-11',
        endDate: '',
        pinned: true,
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '💥'
    },
    {
        id: 14,
        name: 'API 실험실',
        description: 'REST, JSON, SOAP, gRPC, GraphQL 등 다양한 API를 실험해볼 수 있는 공간',
        link: '/api-experiment',
        active: true,
        startDate: '2026-01-06',
        endDate: '',
        pinned: true,
        category: '프로젝트/개발도구',
        isProduction: false, // 실험용
        thumbnail: '🧪'
    },
    {
        id: 13,
        name: 'Command Stack',
        description: '개발자를 위한 개인 일정 관리 시스템 - 명령어로 빠르게 일정 추가 및 관리',
        link: '/commandstack',
        active: true,
        startDate: '2026-01-05',
        endDate: '',
        pinned: true,
        category: '프로젝트/생산성도구',
        isProduction: true, // 프로덕션
        thumbnail: '⚡'
    },
    {
        id: 12,
        name: 'Conflux',
        description: '개발자를 위한 통합 알림 관제 센터 - 모든 스트림이 하나로 합쳐지는 곳',
        link: '/conflux',
        active: true,
        startDate: '2025-12-28',
        endDate: '',
        pinned: true,
        category: '프로젝트/개발도구',
        isProduction: true, // 프로덕션
        thumbnail: '🌊'
    },
    {
        id: 11,
        name: '카오틱 뮤직박스',
        description: '실시간으로 함께 음악을 만드는 참여형 시퀀서 (WebSocket, gridRef)',
        link: '/chaotic-music-box',
        active: true,
        startDate: '2025-10-20',
        endDate: '',
        pinned: true,
        category: '음악/협업',
        requiresLogin: true,
        isProduction: false, // 실험용
        thumbnail: '🎵'
    },
    {
        id: 10,
        name: 'Hopperbox',
        description: '생각한 무언가를 일단 넣어보세요! (응답속도 및 응답로직 개선 필요)',
        link: '/hopperbox',
        active: true,
        startDate: '2025-09-30',
        endDate: '',
        pinned: true,
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
        pinned: true,
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
        pinned: true,
        isProduction: false, // 실험용
        thumbnail: '📝'
    },
    {
        id: 7,
        name: 'TraceBoard',
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
