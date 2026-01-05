const projects = [
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
