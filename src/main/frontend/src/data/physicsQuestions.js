// 물리 퀴즈 문제 데이터 구조
//
// 각 문제의 simulation.tunable 배열은 정답 확인 후 사용자가 직접 값을 바꿔
// 다시 재생할 수 있는 슬라이더를 정의한다.
//   { key, label, min, max, step, unit }
// key 는 config 내부 경로이며 점 표기(예: "ball1.velocity")로 중첩 값도 가리킬 수 있다.

export const physicsQuestions = [
  {
    id: 1,
    title: "무거운 공 vs 가벼운 공",
    question: "같은 높이에서 무거운 쇠구슬과 가벼운 탁구공을 동시에 떨어뜨리면 어떻게 될까요?",
    options: [
      { id: "A", text: "무거운 쇠구슬이 먼저 떨어진다", correct: false },
      { id: "B", text: "가벼운 탁구공이 먼저 떨어진다", correct: false },
      { id: "C", text: "거의 동시에 떨어진다", correct: true },
      { id: "D", text: "높이에 따라 다르다", correct: false }
    ],
    explanation: "갈릴레이의 낙하 법칙에 따라, 공기 저항이 무시될 때 모든 물체는 무게와 관계없이 같은 가속도로 떨어집니다. 중력 가속도는 질량과 무관하게 일정합니다!",
    simulation: {
      type: "freefall",
      config: {
        height: 8,
        gravity: 9.8,
        ballRadius: 20,
        ballColor: "#FF6B6B",
        showTwoBalls: true
      }
    }
  },
  {
    id: 2,
    title: "물총의 궤적",
    question: "물총으로 멀리 있는 목표물을 맞추려면 총구를 어느 방향으로 향해야 할까요?",
    options: [
      { id: "A", text: "목표물을 정확히 조준한다", correct: false },
      { id: "B", text: "목표물보다 위쪽을 조준한다", correct: true },
      { id: "C", text: "목표물보다 아래쪽을 조준한다", correct: false },
      { id: "D", text: "거리와 상관없이 수평으로 쏜다", correct: false }
    ],
    explanation: "물이나 공이 발사되면 중력의 영향으로 포물선 궤도를 그립니다. 따라서 중력에 의한 낙하를 고려해 목표물보다 위쪽을 조준해야 합니다. 이것이 포물선 운동의 핵심입니다!",
    simulation: {
      type: "projectile",
      config: {
        initialHeight: 3,
        angle: 30,
        power: 18,
        gravity: 9.8,
        ballRadius: 12,
        ballColor: "#4ECDC4",
        showTarget: true
      },
      tunable: [
        { key: "angle", label: "발사 각도", min: 10, max: 80, step: 1, unit: "°" },
        { key: "power", label: "발사 힘", min: 10, max: 26, step: 1, unit: "" }
      ]
    }
  },
  {
    id: 3,
    title: "당구공의 충돌",
    question: "움직이는 당구공이 정지해 있는 같은 크기의 당구공과 정면충돌하면 어떻게 될까요?",
    options: [
      { id: "A", text: "두 공이 함께 움직인다", correct: false },
      { id: "B", text: "움직이던 공이 정지하고, 정지했던 공이 움직인다", correct: true },
      { id: "C", text: "두 공이 모두 반대 방향으로 튕겨나간다", correct: false },
      { id: "D", text: "두 공이 모두 제자리에 정지한다", correct: false }
    ],
    explanation: "같은 질량의 물체가 탄성충돌하면 운동량과 에너지가 완전히 교환됩니다. 이는 운동량 보존 법칙과 에너지 보존 법칙 때문입니다. 당구나 뉴턴의 요람에서 볼 수 있는 현상입니다!",
    simulation: {
      type: "collision",
      config: {
        ball1: { mass: 5, velocity: 12, radius: 22, color: "#FF6B6B" },
        ball2: { mass: 5, velocity: 0, radius: 22, color: "#4DABF7" },
        elasticity: 1.0
      },
      tunable: [
        { key: "ball1.velocity", label: "공1 속도", min: 6, max: 18, step: 1, unit: "" },
        { key: "elasticity", label: "반발 계수", min: 0, max: 1, step: 0.1, unit: "" }
      ]
    }
  },
  {
    id: 4,
    title: "인공위성의 궤도",
    question: "지구 주위를 도는 인공위성이 떨어지지 않고 계속 궤도를 유지하는 이유는 무엇일까요?",
    options: [
      { id: "A", text: "지구의 자기장 때문", correct: false },
      { id: "B", text: "지구의 중력이 없기 때문", correct: false },
      { id: "C", text: "지구 중력과 위성의 속도가 균형을 이루기 때문", correct: true },
      { id: "D", text: "우주 공간에 공기가 없기 때문", correct: false }
    ],
    explanation: "인공위성은 지구의 중력에 의해 계속 지구 쪽으로 '떨어지고' 있지만, 동시에 엄청난 속도로 옆으로 움직이고 있어 지표면에 닿지 않고 계속 지구 주위를 돌게 됩니다. 중력과 위성의 속도가 완벽한 균형을 이루는 것이죠!",
    simulation: {
      type: "orbital",
      config: {
        planetRadius: 50,
        satelliteRadius: 8,
        initialOrbitRadius: 90,
        initialVelocityFactor: 1.0, // 원형 궤도 속도에 대한 배율
        planetColor: "#4DABF7",
        satelliteColor: "#FF6B6B",
        gravitationalConstant: 0.0008 // 구심력 상수
      },
      tunable: [
        { key: "initialVelocityFactor", label: "궤도 속도 배율", min: 0.6, max: 1.4, step: 0.05, unit: "x" }
      ]
    }
  },
  {
    id: 5,
    title: "그네의 비밀",
    question: "그네를 탈 때 더 높이 올라가려면 언제 다리를 구부려야 할까요?",
    options: [
      { id: "A", text: "가장 높은 지점에서", correct: false },
      { id: "B", text: "가장 낮은 지점에서", correct: true },
      { id: "C", text: "중간 지점에서", correct: false },
      { id: "D", text: "언제 해도 상관없다", correct: false }
    ],
    explanation: "그네의 가장 낮은 지점에서 다리를 구부려 몸의 중심을 높이면, 다음 올라갈 때 위치 에너지가 증가합니다. 이는 에너지 보존 법칙을 이용한 것으로, 진자 운동의 원리를 응용한 것입니다!",
    simulation: {
      type: "pendulum",
      config: {
        length: 1.2,
        initialAngle: 35,
        gravity: 9.8,
        ballRadius: 25,
        ballColor: "#FFD43B"
      },
      tunable: [
        { key: "initialAngle", label: "시작 각도", min: 10, max: 70, step: 1, unit: "°" },
        { key: "length", label: "줄 길이", min: 0.6, max: 1.8, step: 0.1, unit: "" }
      ]
    }
  },
  {
    id: 6,
    title: "롤러코스터의 수직 루프",
    question: "롤러코스터가 수직 원형 루프의 꼭대기에서 떨어지지 않으려면 무엇이 필요할까요?",
    options: [
      { id: "A", text: "꼭대기에서 충분히 빠른 속도", correct: true },
      { id: "B", text: "탑승객의 안전벨트만 있으면 된다", correct: false },
      { id: "C", text: "루프가 작을수록 천천히 가도 된다", correct: false },
      { id: "D", text: "속도와는 전혀 무관하다", correct: false }
    ],
    explanation: "루프 꼭대기에서는 중력이 구심력 역할을 합니다. 떨어지지 않으려면 원운동에 필요한 구심력(mv²/r)이 최소한 중력(mg)만큼은 되어야 하므로, 꼭대기 속도가 v ≥ √(gr) 를 만족해야 합니다. 속도가 부족하면 레일에서 이탈해 떨어집니다!",
    simulation: {
      type: "circular",
      config: {
        radius: 2.0,
        ballRadius: 14,
        ballColor: "#FF6B6B",
        velocity_multiplier: 1.25
      },
      tunable: [
        { key: "velocity_multiplier", label: "진입 속도 배율", min: 0.9, max: 1.8, step: 0.05, unit: "x" }
      ]
    }
  },
  {
    id: 7,
    title: "가장 멀리 던지는 각도",
    question: "공기 저항을 무시할 때, 같은 힘으로 공을 가장 멀리 던지려면 몇 도로 던져야 할까요?",
    options: [
      { id: "A", text: "30도", correct: false },
      { id: "B", text: "45도", correct: true },
      { id: "C", text: "60도", correct: false },
      { id: "D", text: "75도", correct: false }
    ],
    explanation: "수평 도달 거리는 R = v²·sin(2θ)/g 로 주어집니다. sin(2θ)가 최대가 되는 지점은 2θ = 90°, 즉 θ = 45°일 때입니다. 슬라이더로 각도를 바꿔 가며 비거리를 직접 비교해 보세요!",
    simulation: {
      type: "projectile",
      config: {
        initialHeight: 3,
        angle: 45,
        power: 20,
        gravity: 9.8,
        ballRadius: 12,
        ballColor: "#FF9F1C",
        showTarget: false
      },
      tunable: [
        { key: "angle", label: "발사 각도", min: 10, max: 80, step: 1, unit: "°" }
      ]
    }
  },
  {
    id: 8,
    title: "진자의 주기",
    question: "진자가 한 번 왕복하는 데 걸리는 시간(주기)을 결정하는 것은 무엇일까요?",
    options: [
      { id: "A", text: "추의 무게", correct: false },
      { id: "B", text: "흔드는 진폭(각도)", correct: false },
      { id: "C", text: "줄의 길이", correct: true },
      { id: "D", text: "추의 색깔", correct: false }
    ],
    explanation: "단진자의 주기는 T = 2π√(L/g) 로, 줄의 길이 L과 중력가속도 g에만 의존합니다. 작은 진폭에서는 추의 무게나 진폭과 무관하죠(진폭 등시성). 줄 길이 슬라이더를 바꾸면 주기가 달라지지만, 시작 각도를 바꿔도 주기는 거의 그대로인 것을 확인해 보세요!",
    simulation: {
      type: "pendulum",
      config: {
        length: 1.0,
        initialAngle: 30,
        gravity: 9.8,
        ballRadius: 22,
        ballColor: "#2FBF71"
      },
      tunable: [
        { key: "length", label: "줄 길이", min: 0.6, max: 1.8, step: 0.1, unit: "" },
        { key: "initialAngle", label: "시작 각도", min: 10, max: 70, step: 1, unit: "°" }
      ]
    }
  },
  {
    id: 9,
    title: "탄성충돌과 반발 계수",
    question: "두 공이 부딪힌 뒤 거의 멈춰서 함께 움직인다면, 이 충돌은 어떤 충돌에 가까울까요?",
    options: [
      { id: "A", text: "완전 탄성충돌", correct: false },
      { id: "B", text: "완전 비탄성충돌", correct: true },
      { id: "C", text: "충돌이 일어나지 않은 것", correct: false },
      { id: "D", text: "운동량이 사라진 것", correct: false }
    ],
    explanation: "반발 계수(e)가 1이면 완전 탄성충돌로 운동에너지가 보존되고, 0이면 완전 비탄성충돌로 두 물체가 붙어 함께 움직입니다. 어느 경우든 운동량은 항상 보존됩니다. 반발 계수 슬라이더를 0과 1 사이에서 바꿔 충돌 후 모습을 비교해 보세요!",
    simulation: {
      type: "collision",
      config: {
        ball1: { mass: 5, velocity: 12, radius: 22, color: "#B57BFF" },
        ball2: { mass: 5, velocity: 0, radius: 22, color: "#4DABF7" },
        elasticity: 0.2
      },
      tunable: [
        { key: "elasticity", label: "반발 계수", min: 0, max: 1, step: 0.1, unit: "" }
      ]
    }
  }
];

// 시뮬레이션 타입별 기본 설정
export const simulationDefaults = {
  freefall: {
    width: 600,
    height: 400,
    backgroundColor: "#F8F9FA"
  },
  projectile: {
    width: 800,
    height: 400,
    backgroundColor: "#F8F9FA"
  },
  collision: {
    width: 800,
    height: 300,
    backgroundColor: "#F8F9FA"
  },
  circular: {
    width: 500,
    height: 500,
    backgroundColor: "#F8F9FA"
  },
  pendulum: {
    width: 600,
    height: 500,
    backgroundColor: "#F8F9FA"
  },
  orbital: {
    width: 600,
    height: 600,
    backgroundColor: "#0D1B2A"
  }
};
