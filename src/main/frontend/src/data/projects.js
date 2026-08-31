const projects = [
    {
        id: 94,
        name: 'Cairn',
        subtitle: '등고선 지형 종주 (오리엔티어링)',
        description: '등고선을 읽어 돌탑을 30초 안에 잇는 시간 챌린지 — 언덕이 촘촘할수록 발이 느려진다',
        link: '/cairn',
        active: true,
        startDate: '2026-08-31',
        endDate: '',
        category: '실험/공간',
        isProduction: false, // 실험용
        thumbnail: '🧭'
    },
    {
        id: 93,
        name: 'Timbre',
        subtitle: '소리를 만지는 감각 유형',
        description: '실시간 합성한 여섯 음색을 듣고 둥글다·따뜻하다를 고르면 나오는 공감각 유형 테스트',
        link: '/timbre',
        active: true,
        startDate: '2026-08-28',
        endDate: '',
        category: '실험/감각',
        isProduction: false, // 실험용
        thumbnail: '🔊'
    },
    {
        id: 92,
        name: 'Slowlane',
        subtitle: '계산대 줄 고르기 (옆줄의 법칙)',
        description: '세 계산대 줄 중 먼저 끝날 줄을 고르는 오늘의 시드 미니게임 — 숨은 지연은 고른 뒤에야 튀어나온다',
        link: '/slowlane',
        active: true,
        startDate: '2026-08-27',
        endDate: '',
        category: '실험/일상',
        isProduction: false, // 실험용
        thumbnail: '🛒'
    },
    {
        id: 91,
        name: 'Coincide',
        subtitle: '생일이 겹치는 방 (생일 역설)',
        description: '방에 한 명씩 들일수록 같은 날 태어난 두 사람이 스물 몇 명에서 벌써 반반으로 나오는 아트 토이',
        link: '/coincide',
        active: true,
        startDate: '2026-08-26',
        endDate: '',
        category: '실험/확률',
        isProduction: false, // 실험용
        thumbnail: '🎂'
    },
    {
        id: 90,
        name: 'Crossbar',
        subtitle: '키보드로 놓는 사다리타기',
        description: '가로대를 키보드로 얹고 신호를 흘려 색 키캡마다 다른 칸에 배정하는 사다리타기 도구',
        link: '/crossbar',
        active: true,
        startDate: '2026-08-25',
        endDate: '',
        category: '실험/게임',
        isProduction: false, // 실험용
        thumbnail: '🪜'
    },
    {
        id: 88,
        name: 'Scotoma',
        subtitle: '눈 속의 맹점 찾기',
        description: '한쪽 눈을 가리고 점을 끌다 사라지는 순간 — 당신 눈에 뚫린 구멍을 손으로 찾는다',
        link: '/scotoma',
        active: true,
        startDate: '2026-08-25',
        endDate: '',
        category: '실험/인지',
        isProduction: false, // 실험용
        thumbnail: '👁'
    },
    {
        id: 89,
        name: 'Confound',
        subtitle: '상관과 인과 (교란·매개·충돌 변수)',
        description: '같은 산점도가 숨은 변수의 자리에 따라 다른 진실이 되는 실험',
        link: '/confound',
        active: true,
        startDate: '2026-08-24',
        endDate: '',
        category: '실험/통계',
        isProduction: false, // 실험용
        thumbnail: '🔀'
    },
    {
        id: 87,
        name: 'Swelter',
        subtitle: '잠 못 드는 열대야 (밤더위 뽑기)',
        description: '입추 지나도 안 식는 열대야 — 스윙 손잡이를 놓아 못 밭에 토큰을 떨어뜨려 오늘 밤 처방을 뽑는 파친코 생성기',
        link: '/swelter',
        active: true,
        startDate: '2026-08-24',
        endDate: '',
        category: '실험/게임',
        isProduction: false, // 실험용
        thumbnail: '🌃'
    },
    {
        id: 86,
        name: 'Stampede',
        subtitle: '재시도 폭주 (백오프·지터)',
        description: '원인이 사라져도 재시도가 스스로 붙잡는 준안정 실패 실험',
        link: '/stampede',
        active: true,
        startDate: '2026-08-23',
        endDate: '',
        category: '실험/네트워크',
        isProduction: false, // 실험용
        thumbnail: '🐘'
    },
    {
        id: 85,
        name: 'Airlock',
        subtitle: '에이전트 신뢰 경계',
        description: '비신뢰 입력·비밀·외부 통신이 겹칠 때 새는 에이전트 경계 실험',
        link: '/airlock',
        active: true,
        startDate: '2026-08-22',
        endDate: '',
        category: '실험/보안',
        isProduction: false, // 실험용
        thumbnail: '🛡️'
    },
    {
        id: 84,
        name: 'Blindtime',
        subtitle: '눈금 없이 시간 맞히기 (체내 시계)',
        description: '목표 노광 시간을 몸으로 재현하는 암실 챌린지 — 짧으면 허옇게, 길면 새카맣게 현상된다',
        link: '/blindtime',
        active: true,
        startDate: '2026-08-21',
        endDate: '',
        category: '실험/인지',
        isProduction: false, // 실험용
        thumbnail: '🎞'
    },
    {
        id: 83,
        name: 'Placebo',
        subtitle: '닫힘 버튼의 진실 (플라시보 버튼)',
        description: '연타로 자동 닫힘을 이기는 대결 — 매 판 진짜 버튼일지 가짜일지 눌러 봐야 안다',
        link: '/placebo',
        active: true,
        startDate: '2026-08-20',
        endDate: '',
        category: '실험/인지',
        isProduction: false, // 실험용
        thumbnail: '🛗'
    },
    {
        id: 82,
        name: 'Cardinal',
        subtitle: '길찾기 성향 (지도파 vs 랜드마크파)',
        description: '여섯 갈림길에서 방향을 골라 나침반 바늘을 기울이는 키보드 성향 테스트',
        link: '/cardinal',
        active: true,
        startDate: '2026-08-16',
        endDate: '',
        category: '실험/인지',
        isProduction: false, // 실험용
        thumbnail: '🧭'
    },
    {
        id: 81,
        name: 'Myriad',
        subtitle: '십의 거듭제곱을 손으로 켜기 (감이 안 오는 큰 수)',
        description: '위아래로 끌면 자릿수가 오르내리며 소리와 알갱이 무리로 큰 수를 느끼는 아트 토이',
        link: '/myriad',
        active: true,
        startDate: '2026-08-15',
        endDate: '',
        category: '실험/사운드',
        isProduction: false, // 실험용
        thumbnail: '🔟'
    },
    {
        id: 80,
        name: 'Monty Hall',
        subtitle: '문 바꾸기의 확률 (조건부 확률의 반직관)',
        description: '진행자가 꽝 문을 열어 준 뒤 바꾸면 2/3로 이기는 세 문의 확률 게임',
        link: '/montyhall',
        active: true,
        startDate: '2026-08-14',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🚪'
    },
    {
        id: 79,
        name: 'Steganos',
        subtitle: '픽셀에 숨긴 메시지 (LSB 스테가노그래피)',
        description: '똑같아 보이는 사진 속 최하위 비트에 문장을 숨기고 되읽는 은닉 실험',
        link: '/steganos',
        active: true,
        startDate: '2026-08-13',
        endDate: '',
        category: '실험/그래픽스',
        isProduction: false, // 실험용
        thumbnail: '🫥'
    },
    {
        id: 78,
        name: 'Pirouette',
        subtitle: '각운동량 보존 (팔을 당기면 빨라진다)',
        description: '돌아가는 질량을 축으로 당기면 ω가 튀고 L은 그대로인 회전 보존 실험',
        link: '/pirouette',
        active: true,
        startDate: '2026-08-12',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🌀'
    },
    {
        id: 77,
        name: 'Sandpile',
        subtitle: '자기조직화 임계 (모래더미 사태)',
        description: '한 알씩 쌓다 임계 밀도에 이르면 한 알이 격자를 휩쓰는 멱법칙 사태 실험',
        link: '/sandpile',
        active: true,
        startDate: '2026-08-11',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '⏳'
    },
    {
        id: 76,
        name: 'Wildcard',
        subtitle: '조별 3위 줄 세우기 (와일드카드 진출)',
        description: '서로 만난 적 없는 12개 조의 3위를 한 줄로 세워 8팀만 살리는 와일드카드 진출 실험',
        link: '/wildcard',
        active: true,
        startDate: '2026-08-10',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '⚽'
    },
    {
        id: 75,
        name: 'Drydown',
        subtitle: '향의 시간 전개 (탑·미들·베이스 노트)',
        description: '휘발 속도가 다른 향 분자가 시간에 따라 층층이 드러나는 잔향 전개 실험',
        link: '/drydown',
        active: true,
        startDate: '2026-08-07',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🌸'
    },
    {
        id: 74,
        name: 'Syzygy',
        subtitle: '식(蝕)의 그림자 기하 (엄브라·안텀브라)',
        description: '각지름이 맞으면 개기, 모자라면 금환 — 세 천체 정렬과 그림자 원뿔 실험',
        link: '/syzygy',
        active: true,
        startDate: '2026-08-06',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🌑'
    },
    {
        id: 73,
        name: 'Radiant',
        subtitle: '유성우의 복사점 (평행 유성의 원근 착시)',
        description: '나란히 떨어지는 유성이 하늘 한 점에서 뻗어 나오는 것처럼 보이는 복사점 실험',
        link: '/radiant',
        active: true,
        startDate: '2026-08-06',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '☄️'
    },
    {
        id: 72,
        name: 'Chora',
        subtitle: 'LLM 페르소나 GIS 시뮬레이션',
        description: '실제 지도로 만든 3D 도시에 LLM 페르소나 에이전트를 풀어 놓는 시뮬레이터',
        link: '/chora',
        active: true,
        wip: true, // 개발 중 — 소개 페이지는 열려 있으나 서비스는 아직 운영 전
        startDate: '2026-08-04',
        endDate: '',
        category: '프로젝트/시뮬레이션',
        isProduction: true, // 프로덕션
        techStack: ['Unity', 'FastAPI'],
        thumbnail: '🏙️'
    },
    {
        id: 71,
        name: 'Desalinate',
        subtitle: '역삼투압 담수화 (바닷물 → 식수)',
        description: '삼투압보다 세게 밀어 물만 막을 넘기고 소금은 튕겨내는 역삼투 담수화 실험',
        link: '/desalinate',
        active: true,
        startDate: '2026-08-04',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🧂'
    },
    {
        id: 70,
        name: 'Criticality',
        subtitle: '연쇄반응 제어 (지연 중성자 · 원자로 동역학)',
        description: '0.65%의 지연 중성자가 폭주하는 연쇄반응을 사람 손에 맡기는 원자로 제어 실험',
        link: '/criticality',
        active: true,
        startDate: '2026-08-03',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '☢️'
    },
    {
        id: 69,
        name: 'Deniable',
        subtitle: '그럴듯한 부인 (랜덤 응답 · ε-차등 프라이버시)',
        description: '각자 확률적으로 거짓말해도 집계는 되살아나는, 프라이버시와 정확도의 거래 실험',
        link: '/deniable',
        active: true,
        startDate: '2026-08-02',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🎲'
    },
    {
        id: 68,
        name: 'Bell',
        subtitle: '얽힘의 비국소 상관 (CHSH 게임)',
        description: '멀리 떨어진 두 사람이 고전 한계 0.75를 넘겨 이기는 벨 부등식 위반 게임',
        link: '/bell',
        active: true,
        startDate: '2026-07-31',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🪢'
    },
    {
        id: 67,
        name: 'Reverse Sprinkler',
        subtitle: '빨아들이는 스프링클러의 회전 (파인만 문제)',
        description: '물을 뿜을 때와 빨아들일 때 회전이 반대·50배 느린 파인만 스프링클러 실험',
        link: '/reverse-sprinkler',
        active: true,
        startDate: '2026-07-30',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '💧'
    },
    {
        id: 66,
        name: 'Sync',
        subtitle: '자발적 동기화 (쿠라모토 모형)',
        description: '결합만 세지면 흩어진 반딧불 무리가 툭 하고 한 박자로 잠기는 위상 전이 실험',
        link: '/sync',
        active: true,
        startDate: '2026-07-29',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '✨'
    },
    {
        id: 65,
        name: 'Slow Light',
        subtitle: '느린 빛 광버퍼 (군속도 제어)',
        description: '셀마다 빛의 속도를 늦춰 두 광펄스를 검출기에서 동시 도착시키는 광버퍼 실험',
        link: '/slow-light',
        active: true,
        startDate: '2026-07-28',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🐢'
    },
    {
        id: 64,
        name: 'Arago Spot',
        subtitle: '그림자 속 밝은 점 (프레넬 회절)',
        description: '원반 그림자 정중앙이 오히려 밝아지는 푸아송·아라고 점 실험',
        link: '/arago',
        active: true,
        startDate: '2026-07-28',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🔦'
    },
    {
        id: 63,
        name: 'Ergosphere',
        subtitle: '회전 블랙홀 에너지 추출 (펜로즈 과정)',
        description: '에르고권에서 입자를 쪼개 회전하는 블랙홀의 에너지를 뽑아내는 펜로즈 과정 실험',
        link: '/ergosphere',
        active: true,
        startDate: '2026-07-27',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🕳️'
    },
    {
        id: 62,
        name: 'Slime',
        subtitle: '점균 수송망 (스티그머지)',
        description: '뇌 없는 점균이 흔적만 따라 먹이 사이 최적 망을 스스로 그리는 자기조직화 실험',
        link: '/slime',
        active: true,
        startDate: '2026-07-24',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🟡'
    },
    {
        id: 61,
        name: 'Terraform',
        subtitle: '행성 기후 되먹임 (테라포밍)',
        description: '임계를 넘기면 CO₂ 되먹임이 스스로 굴러 폭주하는 행성 온난화 이중안정 실험',
        link: '/terraform',
        active: true,
        startDate: '2026-07-23',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🪐'
    },
    {
        id: 60,
        name: 'Biodegrade',
        subtitle: '효소 분해 캐스케이드 (생분해성 플라스틱)',
        description: '자르기만 하면 미세플라스틱, 끝을 갉아 모노머까지 풀어야 완전 분해되는 효소 협업 실험',
        link: '/biodegrade',
        active: true,
        startDate: '2026-07-22',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🦠'
    },
    {
        id: 59,
        name: 'Kalman',
        subtitle: '센서 융합 상태 추정 (칼만 필터)',
        description: '예측과 여러 잡음 센서를 불확실성으로 저울질해 진짜 위치를 추정하는 센서 융합 실험',
        link: '/kalman',
        active: true,
        startDate: '2026-07-21',
        endDate: '',
        category: '실험/AI',
        isProduction: false, // 실험용
        thumbnail: '🎯'
    },
    {
        id: 58,
        name: 'Kessler',
        subtitle: '궤도 파편 연쇄충돌 (케슬러 증후군)',
        description: '위성을 더 안 쏴도 파편이 스스로 파편을 낳는 저궤도 연쇄충돌 실험',
        link: '/kessler',
        active: true,
        startDate: '2026-07-20',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🛰️'
    },
    {
        id: 57,
        name: 'Bullwhip',
        subtitle: '채찍 효과 (공급망 수요 증폭)',
        description: '소비자의 작은 수요 변동이 상류로 갈수록 눈덩이처럼 커지는 공급망 채찍 효과 실험',
        link: '/bullwhip',
        active: true,
        startDate: '2026-07-19',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '📦'
    },
    {
        id: 56,
        name: 'Merkle',
        subtitle: '변조 감지 (해시 트리)',
        description: '블록 하나만 바뀌어도 루트 해시가 달라지는 변조 감지 트리 실험',
        link: '/merkle',
        active: true,
        startDate: '2026-07-16',
        endDate: '',
        category: '실험/시뮬레이션',
        isProduction: false, // 실험용
        thumbnail: '🌳'
    },
    {
        id: 55,
        name: 'Spiking',
        subtitle: '스파이킹 뉴런 (Leaky Integrate-and-Fire)',
        description: '문턱을 넘는 순간에만 한 번 쏘는 이벤트 구동 뉴로모픽 신경망 실험',
        link: '/spiking',
        active: true,
        startDate: '2026-07-15',
        endDate: '',
        category: '실험/AI',
        isProduction: false, // 실험용
        thumbnail: '🧠'
    },
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
