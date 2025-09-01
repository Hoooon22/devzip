// 물리 퀴즈 문제 데이터 구조

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
        initialVelocity: { x: 15, y: 8 },
        gravity: 9.8,
        ballRadius: 12,
        ballColor: "#4ECDC4",
        showTarget: true
      }
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
      }
    }
  },
  {
    id: 4,
    title: "롤러코스터의 원형 구간",
    question: "롤러코스터가 수직 원형 레일을 돌 때, 맨 위 지점에서 승객이 느끼는 힘은?",
    options: [
      { id: "A", text: "평소보다 더 무거워진다", correct: false },
      { id: "B", text: "평소와 같다", correct: false },
      { id: "C", text: "더 가벼워진다 (무중력 상태)", correct: true },
      { id: "D", text: "옆으로 밀려나는 힘을 느낀다", correct: false }
    ],
    explanation: "원형 운동에서 중심으로 향하는 구심력이 필요합니다. 맨 위에서는 중력이 구심력 역할을 하므로, 승객은 무중력 상태를 경험합니다. 이것이 롤러코스터의 스릴 포인트입니다!",
    simulation: {
      type: "circular",
      config: {
        radius: 1.5,
        velocity: 6,
        ballRadius: 18,
        ballColor: "#51CF66",
        showForces: true
      }
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
      }
    }
  },
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