import React, { useRef, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import Matter from 'matter-js';
import { simulationDefaults } from '../data/physicsQuestions';

const PhysicsCanvas = ({ simulation, isActive, onComplete }) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const renderRef = useRef(null);
  const runnerRef = useRef(null);
  const worldRef = useRef(null);
  const [isRunning, setIsRunning] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });

  // 캔버스 크기 계산 함수
  const calculateCanvasSize = useCallback(() => {
    if (!simulation) return { width: 600, height: 400 };
    
    const defaults = simulationDefaults[simulation.type];
    const containerWidth = Math.min(defaults.width, window.innerWidth - 40);
    const aspectRatio = defaults.height / defaults.width;
    
    return {
      width: containerWidth,
      height: containerWidth * aspectRatio
    };
  }, [simulation]);

  // 반응형 캔버스 크기 조정
  useEffect(() => {
    const updateCanvasSize = () => {
      const newSize = calculateCanvasSize();
      setCanvasSize(newSize);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [calculateCanvasSize]);

  // Matter.js 정리 함수
  const cleanupMatter = useCallback(() => {
    if (runnerRef.current) {
      Matter.Runner.stop(runnerRef.current);
      runnerRef.current = null;
    }
    
    if (renderRef.current) {
      Matter.Render.stop(renderRef.current);
      renderRef.current = null;
    }
    
    if (worldRef.current) {
      Matter.World.clear(worldRef.current, false);
      worldRef.current = null;
    }
    
    if (engineRef.current) {
      Matter.Engine.clear(engineRef.current);
      engineRef.current = null;
    }
  }, []);

  // 시뮬레이션 초기 설정 및 렌더링을 위한 useEffect
  useEffect(() => {
    if (!simulation || !canvasRef.current) {
      return;
    }

    // 이전 상태 정리
    cleanupMatter();

    const { Engine, Render } = Matter;
    const canvas = canvasRef.current;

    // 새 엔진 생성
    const engine = Engine.create();
    engineRef.current = engine;
    worldRef.current = engine.world;

    // 렌더러 생성
    const render = Render.create({
      canvas: canvas,
      engine: engine,
      options: {
        width: canvasSize.width,
        height: canvasSize.height,
        wireframes: false,
        background: simulationDefaults[simulation.type]?.backgroundColor || '#F8F9FA',
        showVelocity: false,
        showAngleIndicator: false,
        showDebug: false,
        showBroadphase: false,
        showBounds: false,
        showIds: false,
        showVertexNumbers: false,
        showConvexHulls: false,
        showInternalEdges: false,
        showSeparations: false,
        showAxes: false,
        showPositions: false,
        showMousePosition: false
      }
    });
    renderRef.current = render;

    try {
      // 시뮬레이션 생성
      createSimulation(engine, simulation, canvasSize);

      // 렌더링 시작
      Render.run(render);
    } catch (error) {
      console.error('PhysicsCanvas: Error creating simulation', error);
    }

    return cleanupMatter;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulation, canvasSize]);

  // 물리 엔진 실행/중지를 위한 useEffect
  useEffect(() => {
    if (isActive && engineRef.current) {
      setIsRunning(true);
      const runner = Matter.Runner.create();
      runnerRef.current = runner;
      Matter.Runner.run(runner, engineRef.current);

      let completeTimer = null;
      if (onComplete) {
        completeTimer = setTimeout(() => {
          onComplete();
        }, 5000);
      }

      return () => {
        if (completeTimer) clearTimeout(completeTimer);
        if (runnerRef.current) {
          Matter.Runner.stop(runnerRef.current);
          runnerRef.current = null;
        }
      };
    } else {
      setIsRunning(false);
      if (runnerRef.current) {
        Matter.Runner.stop(runnerRef.current);
        runnerRef.current = null;
      }
    }
  }, [isActive, onComplete]);

  const createSimulation = (engine, simulation, canvasSize) => {
    const { Bodies, World } = Matter;
    const { type, config } = simulation;

    // 통일된 스케일링 팩터
    const scaleX = canvasSize.width / simulationDefaults[type].width;
    const scaleY = canvasSize.height / simulationDefaults[type].height;
    const scale = Math.min(scaleX, scaleY);

    switch (type) {
      case 'freefall':
        createFreefallSimulation(engine, config, Bodies, World, canvasSize, scale);
        break;
      case 'projectile':
        createProjectileSimulation(engine, config, Bodies, World, canvasSize, scale);
        break;
      case 'collision':
        createCollisionSimulation(engine, config, Bodies, World, canvasSize, scale);
        break;
      case 'circular':
        createCircularSimulation(engine, config, Bodies, World, canvasSize, scale);
        break;
      case 'pendulum':
        createPendulumSimulation(engine, config, Bodies, World, canvasSize, scale);
        break;
      case 'orbital':
        createOrbitalSimulation(engine, config, Bodies, World, canvasSize, scale);
        break;
      default:
        break;
    }
  };

  // 1. 자유낙하 시뮬레이션 (무거운 공 vs 가벼운 공)
  const createFreefallSimulation = (engine, config, Bodies, World, canvasSize, scale) => {
    engine.world.gravity.y = 0.8 * scale; // 통일된 중력
    
    // 지면
    const ground = Bodies.rectangle(
      canvasSize.width / 2, 
      canvasSize.height - 20 * scale, 
      canvasSize.width, 
      40 * scale, 
      {
        isStatic: true,
        render: { fillStyle: '#8B4513' }
      }
    );

    if (config.showTwoBalls) {
      // 두 개의 공 (무거운 것과 가벼운 것)
      const heavyBall = Bodies.circle(
        canvasSize.width * 0.4, 
        50 * scale, 
        config.ballRadius * scale, 
        {
          render: { fillStyle: config.ballColor },
          restitution: 0.7,
          density: 0.01
        }
      );
      
      const lightBall = Bodies.circle(
        canvasSize.width * 0.6, 
        50 * scale, 
        config.ballRadius * 0.8 * scale, 
        {
          render: { fillStyle: '#4ECDC4' },
          restitution: 0.7,
          density: 0.001
        }
      );

      World.add(engine.world, [ground, heavyBall, lightBall]);
    } else {
      const ball = Bodies.circle(
        canvasSize.width / 2, 
        50 * scale, 
        config.ballRadius * scale, 
        {
          render: { fillStyle: config.ballColor },
          restitution: 0.7
        }
      );

      World.add(engine.world, [ground, ball]);
    }
  };

  // 2. 포물선 운동 시뮬레이션 (물총의 궤적)
  const createProjectileSimulation = (engine, config, Bodies, World, canvasSize, scale) => {
    engine.world.gravity.y = 1.0 * scale; // 적절한 중력
    
    // 지면
    const ground = Bodies.rectangle(
      canvasSize.width / 2, 
      canvasSize.height - 20 * scale, 
      canvasSize.width, 
      40 * scale, 
      {
        isStatic: true,
        render: { fillStyle: '#8B4513' }
      }
    );

    // 발사 위치 계산
    const launchX = canvasSize.width * 0.15; // 왼쪽에서 15% 지점
    const launchY = canvasSize.height - 60 * scale; // 지면에서 적당한 높이

    // 발사대
    const launcher = Bodies.rectangle(
      launchX, 
      launchY, 
      25 * scale, 
      25 * scale, 
      {
        isStatic: true,
        render: { fillStyle: '#666' }
      }
    );

    // 목표물 - 더 멀리 배치
    if (config.showTarget) {
      const target = Bodies.rectangle(
        canvasSize.width * 0.85, // 오른쪽에서 15% 지점
        canvasSize.height - 80 * scale, 
        25 * scale, 
        60 * scale, 
        {
          isStatic: true,
          render: { fillStyle: '#FF6B6B' }
        }
      );
      World.add(engine.world, [target]);
    }

    // 발사되는 공
    const ballRadius = Math.min(config.ballRadius * scale, 15 * scale); // 크기 제한
    const ball = Bodies.circle(
      launchX, 
      launchY - ballRadius, // 발사대 위에 배치
      ballRadius, 
      {
        render: { fillStyle: config.ballColor },
        restitution: 0.7,
        frictionAir: 0.01 // 공기 저항 추가
      }
    );

    // 초기 속도 설정 - 각도와 힘을 기반으로 계산
    const angleRad = (config.angle * Math.PI) / 180; // 각도를 라디안으로 변환
    const power = config.power * scale * 0.9; // 기본 힘에 스케일 적용 (0.9는 미세조정된 값)

    const velocityX = Math.cos(angleRad) * power;
    const velocityY = -Math.sin(angleRad) * power; // Y축은 위쪽이 음수

    Matter.Body.setVelocity(ball, {
      x: velocityX,
      y: velocityY
    });


    World.add(engine.world, [ground, launcher, ball]);
  };

  // 3. 충돌 시뮬레이션 (당구공의 충돌)
  const createCollisionSimulation = (engine, config, Bodies, World, canvasSize, scale) => {
    engine.world.gravity.y = 0; // 수평면에서의 충돌
    
    // 벽들 - 더 두껍게
    const wallThickness = 30 * scale;
    const leftWall = Bodies.rectangle(wallThickness / 2, canvasSize.height / 2, wallThickness, canvasSize.height, { 
      isStatic: true, 
      render: { fillStyle: '#666' } 
    });
    const rightWall = Bodies.rectangle(canvasSize.width - wallThickness / 2, canvasSize.height / 2, wallThickness, canvasSize.height, { 
      isStatic: true, 
      render: { fillStyle: '#666' } 
    });
    const ground = Bodies.rectangle(canvasSize.width / 2, canvasSize.height - wallThickness / 2, canvasSize.width, wallThickness, { 
      isStatic: true, 
      render: { fillStyle: '#8B4513' } 
    });
    const ceiling = Bodies.rectangle(canvasSize.width / 2, wallThickness / 2, canvasSize.width, wallThickness, { 
      isStatic: true, 
      render: { fillStyle: '#8B4513' } 
    });

    // 충돌하는 공들 - 더 가깝게 배치하고 적절한 크기로
    const ballRadius = Math.min(config.ball1.radius * scale, 25 * scale); // 최대 크기 제한
    
    const ball1 = Bodies.circle(
      canvasSize.width * 0.3, // 더 가깝게
      canvasSize.height / 2, 
      ballRadius, 
      {
        render: { fillStyle: config.ball1.color },
        restitution: config.elasticity,
        density: 0.001, // 일정한 밀도로 통일
        frictionAir: 0.01, // 공기 저항 추가
        friction: 0.3 // 마찰력 추가
      }
    );

    const ball2 = Bodies.circle(
      canvasSize.width * 0.7, // 더 가깝게 
      canvasSize.height / 2, 
      ballRadius, 
      {
        render: { fillStyle: config.ball2.color },
        restitution: config.elasticity,
        density: 0.001, // 일정한 밀도로 통일
        frictionAir: 0.01, // 공기 저항 추가
        friction: 0.3 // 마찰력 추가
      }
    );

    // 초기 속도 설정 - 충돌이 잘 일어나도록 조정
    const velocityScale = scale * 0.5; // 속도를 적당히 조정
    Matter.Body.setVelocity(ball1, { 
      x: config.ball1.velocity * velocityScale, 
      y: 0 
    });
    Matter.Body.setVelocity(ball2, { 
      x: config.ball2.velocity * velocityScale, 
      y: 0 
    });


    World.add(engine.world, [leftWall, rightWall, ground, ceiling, ball1, ball2]);
  };

  // 4. 원형 운동 시뮬레이션 (롤러코스터의 원형 구간)
  const createCircularSimulation = (engine, config, Bodies, World, canvasSize, scale) => {
    engine.world.gravity.y = 1.0 * scale; // 적절한 중력으로 원형 운동 구현
    
    // 수직 원형 레일의 중심과 크기
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2; // 화면 중앙
    const radius = Math.min(config.radius * 80 * scale, Math.min(canvasSize.width, canvasSize.height) * 0.35);

    // 완전한 수직 원형 레일 구조
    const segments = 32; // 매우 부드러운 원형
    const railBodies = [];
    
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const nextAngle = ((i + 1) / segments) * 2 * Math.PI;
      const nextX = centerX + Math.cos(nextAngle) * radius;
      const nextY = centerY + Math.sin(nextAngle) * radius;
      
      const segmentLength = Math.sqrt((nextX - x) ** 2 + (nextY - y) ** 2);
      const segmentAngle = Math.atan2(nextY - y, nextX - x);
      
      const segment = Bodies.rectangle(
        (x + nextX) / 2, 
        (y + nextY) / 2, 
        segmentLength, 
        12 * scale, // 레일 두께
        {
          isStatic: true,
          angle: segmentAngle,
          render: { fillStyle: '#444' }
        }
      );
      railBodies.push(segment);
    }

    // 롤러코스터 카트 - 바닥 지점에서 시작 (6시 방향)
    const ballRadius = Math.min(config.ballRadius * scale, 15 * scale);
    const startX = centerX;
    const startY = centerY + radius - ballRadius * 1.5; // 레일 안쪽, 바닥에서 시작
    
    const cart = Bodies.circle(
      startX,
      startY, 
      ballRadius, 
      {
        render: { fillStyle: config.ballColor },
        restitution: 0.1, // 낮은 반발력
        frictionAir: 0.002, // 매우 적은 공기 저항
        friction: 0.001 // 매우 적은 마찰
      }
    );

    // 원형 운동이 가능한 최소 속도 계산: v = sqrt(g * r) (무중력 상태)
    // config.velocity_multiplier를 사용하여 최소 속도에 대한 배율 적용
    const minVelocityForWeightlessness = Math.sqrt(engine.world.gravity.y * radius);
    const initialSpeed = (minVelocityForWeightlessness * config.velocity_multiplier) / scale; // 스케일 조정
    
    // 초기 속도 - 오른쪽 방향으로 (시계방향 회전)
    Matter.Body.setVelocity(cart, {
      x: initialSpeed,
      y: 0
    });

    // 맨 위 지점 표시 (12시 방향)
    const topPoint = Bodies.circle(
      centerX,
      centerY - radius,
      5 * scale,
      {
        isStatic: true,
        render: { fillStyle: '#FF6B6B' },
        isSensor: true // 충돌하지 않는 센서
      }
    );

    // 설명을 위한 텍스트 표시점들 (시각적 참고용)
    const bottomPoint = Bodies.circle(
      centerX,
      centerY + radius,
      3 * scale,
      {
        isStatic: true,
        render: { fillStyle: '#4ECDC4' },
        isSensor: true
      }
    );


    World.add(engine.world, [...railBodies, cart, topPoint, bottomPoint]);
  };

  // 5. 진자 운동 시뮬레이션 (그네의 비밀)
  const createPendulumSimulation = (engine, config, Bodies, World, canvasSize, scale) => {
    engine.world.gravity.y = 1.0 * scale; // 진자 운동을 위한 적절한 중력
    
    // 고정점
    const anchorX = canvasSize.width / 2;
    const anchorY = 50 * scale;
    const anchor = Bodies.circle(
      anchorX, 
      anchorY, 
      8 * scale, // 더 큰 고정점
      {
        isStatic: true,
        render: { fillStyle: '#333' }
      }
    );

    // 진자 길이와 초기 각도 계산
    const pendulumLength = Math.min(config.length * 150 * scale, canvasSize.height * 0.7); // 적절한 길이
    const initialAngleRad = (config.initialAngle * Math.PI) / 180;
    
    // 진자 추 위치 계산
    const ballX = anchorX + pendulumLength * Math.sin(initialAngleRad);
    const ballY = anchorY + pendulumLength * Math.cos(initialAngleRad);
    
    const ballRadius = Math.min(config.ballRadius * scale, 25 * scale);
    const ball = Bodies.circle(
      ballX,
      ballY,
      ballRadius,
      {
        render: { fillStyle: config.ballColor },
        inertia: Infinity, // 회전 방지
        frictionAir: 0.001, // 공기 저항을 거의 제거하여 관성 증가
        mass: 1 // 질량 설정으로 관성 효과 강화
      }
    );

    // 진자 끈 - 더 강한 제약, 관성을 위해 감쇠 최소화
    const constraint = Matter.Constraint.create({
      bodyA: anchor,
      bodyB: ball,
      length: pendulumLength,
      stiffness: 1,
      damping: 0.001, // 감쇠를 거의 제거해서 관성 증가
      render: { 
        visible: true, 
        lineWidth: 4 * scale, 
        strokeStyle: '#8B4513',
        type: 'line'
      }
    });

    // 하단 지점 표시 (가장 낮은 지점 시각적 표시)
    const bottomIndicator = Bodies.rectangle(
      anchorX,
      anchorY + pendulumLength + ballRadius + 20 * scale,
      60 * scale,
      8 * scale,
      {
        isStatic: true,
        render: { 
          fillStyle: '#4ECDC4',
          strokeStyle: '#2E8B8B',
          lineWidth: 2
        },
        isSensor: true // 충돌하지 않음
      }
    );

    // 그네 펌핑 효과: 가장 낮은 지점을 지날 때 진행 방향으로 에너지를 더해 진폭을 키운다.
    // (그네에서 가장 낮은 지점에서 다리를 펴 무게중심을 올리는 동작을 단순화한 모델)
    let frame = 0;
    let lastBoostFrame = -999;
    let lowestY = ball.position.y; // 지금까지 관측한 가장 낮은 위치(Y가 클수록 아래)

    Matter.Events.on(engine, 'beforeUpdate', () => {
      frame++;
      const currentY = ball.position.y;
      if (currentY > lowestY) lowestY = currentY;

      const isAtBottom = Math.abs(currentY - lowestY) < ballRadius;
      const speed = Math.hypot(ball.velocity.x, ball.velocity.y);

      // 최저점을 빠르게 지날 때, 일정 간격으로만 진행 방향 가속
      if (isAtBottom && speed > 0.1 && frame - lastBoostFrame > 90) {
        lastBoostFrame = frame;
        const boostFactor = 1.15; // 매 통과 시 15%씩 가속해 점진적으로 진폭 증가
        Matter.Body.setVelocity(ball, {
          x: ball.velocity.x * boostFactor,
          y: ball.velocity.y * boostFactor
        });

        // 가속 순간 시각적 피드백
        ball.render.fillStyle = '#FF5C5C';
        bottomIndicator.render.fillStyle = '#FF5C5C';
        setTimeout(() => {
          ball.render.fillStyle = config.ballColor;
          bottomIndicator.render.fillStyle = '#4ECDC4';
        }, 250);
      }
    });

    // 설명 텍스트를 위한 표시점 (시각적 가이드)
    const leftIndicator = Bodies.circle(
      anchorX - pendulumLength * 0.8,
      anchorY + pendulumLength * 0.6,
      4 * scale,
      {
        isStatic: true,
        render: { fillStyle: '#FFB74D' },
        isSensor: true
      }
    );

    const rightIndicator = Bodies.circle(
      anchorX + pendulumLength * 0.8,
      anchorY + pendulumLength * 0.6,
      4 * scale,
      {
        isStatic: true,
        render: { fillStyle: '#FFB74D' },
        isSensor: true
      }
    );

    World.add(engine.world, [anchor, ball, constraint, bottomIndicator, leftIndicator, rightIndicator]);
  };

  // 6. 궤도 운동 시뮬레이션 (행성 주위의 위성)
  const createOrbitalSimulation = (engine, config, Bodies, World, canvasSize, scale) => {
    engine.world.gravity.y = 0; // 중력은 0으로 설정

    // 행성 (중심)
    const planetRadius = Math.min(config.planetRadius * scale, 35 * scale);
    const planet = Bodies.circle(
      canvasSize.width / 2,
      canvasSize.height / 2,
      planetRadius,
      {
        isStatic: true,
        render: { fillStyle: config.planetColor },
        label: 'planet'
      }
    );

    // 궤도 반지름과 위성 크기
    const orbitRadius = Math.min(config.initialOrbitRadius * scale, Math.min(canvasSize.width, canvasSize.height) * 0.32);
    const satelliteRadius = Math.min(config.satelliteRadius * scale, 6 * scale);
    
    // 위성을 행성 오른쪽에 배치
    const satellite = Bodies.circle(
      canvasSize.width / 2 + orbitRadius,
      canvasSize.height / 2,
      satelliteRadius,
      {
        render: { fillStyle: config.satelliteColor },
        frictionAir: 0,
        friction: 0,
        restitution: 0,
        label: 'satellite'
      }
    );

    // 수학적으로 정확한 원형 궤도 구현
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    const angularSpeed = 0.03 * config.initialVelocityFactor; // 각속도 (라디안/프레임)
    let currentAngle = 0; // 시작 각도 (오른쪽에서 시작하므로 0)

    // 물리 엔진을 사용하지 않고 수학적으로 위치 계산
    Matter.Events.on(engine, 'beforeUpdate', () => {
      // 각도 업데이트
      currentAngle += angularSpeed;

      // 원형 궤도 위치 계산
      const newX = centerX + Math.cos(currentAngle) * orbitRadius;
      const newY = centerY + Math.sin(currentAngle) * orbitRadius;

      // 위성 위치 직접 설정
      Matter.Body.setPosition(satellite, { x: newX, y: newY });

      // 궤도 방향 속도 설정 (시각적 효과를 위해)
      const velocityX = -Math.sin(currentAngle) * angularSpeed * orbitRadius;
      const velocityY = Math.cos(currentAngle) * angularSpeed * orbitRadius;
      
      Matter.Body.setVelocity(satellite, { x: velocityX, y: velocityY });
    });

    World.add(engine.world, [planet, satellite]);
  };

  return (
    <div className="physics-canvas-container">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          border: '2px solid #ddd',
          borderRadius: '8px',
          maxWidth: '100%',
          height: 'auto',
          display: 'block'
        }}
      />
      {isRunning && isActive && (
        <div className="simulation-status" style={{
          textAlign: 'center',
          marginTop: '10px',
          fontSize: '14px',
          color: '#666'
        }}>
          🎬 물리 시뮬레이션 실행 중...
        </div>
      )}
      {!isRunning && !isActive && (
        <div className="simulation-status" style={{
          textAlign: 'center',
          marginTop: '10px',
          fontSize: '14px',
          color: '#999'
        }}>
          🔬 초기 상태 - 정답을 선택하면 시뮬레이션이 시작됩니다
        </div>
      )}
    </div>
  );
};

PhysicsCanvas.propTypes = {
  simulation: PropTypes.shape({
    type: PropTypes.string.isRequired,
    config: PropTypes.object.isRequired
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  onComplete: PropTypes.func
};

PhysicsCanvas.defaultProps = {
  onComplete: null
};

export default PhysicsCanvas;