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
      console.log('PhysicsCanvas: Missing simulation or canvas ref', { simulation, canvas: canvasRef.current });
      return;
    }

    console.log('PhysicsCanvas: Initializing simulation', {
      type: simulation.type,
      canvasSize,
      config: simulation.config
    });

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
      console.log('PhysicsCanvas: Simulation created successfully');

      // 렌더링 시작
      Render.run(render);
      console.log('PhysicsCanvas: Render started');
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

    // 초기 속도 설정 - 포물선이 잘 보이도록 조정
    const velocityX = config.initialVelocity.x * scale * 0.3; // 수평 속도
    const velocityY = -config.initialVelocity.y * scale * 0.3; // 수직 속도 (위쪽)
    
    Matter.Body.setVelocity(ball, {
      x: velocityX,
      y: velocityY
    });

    console.log('Projectile simulation created:', {
      launchPosition: { x: launchX, y: launchY },
      ballRadius,
      initialVelocity: { x: velocityX, y: velocityY },
      canvasSize
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

    console.log('Collision simulation created:', {
      ball1Position: { x: canvasSize.width * 0.3, y: canvasSize.height / 2 },
      ball2Position: { x: canvasSize.width * 0.7, y: canvasSize.height / 2 },
      ball1Velocity: { x: config.ball1.velocity * velocityScale, y: 0 },
      ballRadius,
      canvasSize
    });

    World.add(engine.world, [leftWall, rightWall, ground, ceiling, ball1, ball2]);
  };

  // 4. 원형 운동 시뮬레이션 (롤러코스터의 원형 구간)
  const createCircularSimulation = (engine, config, Bodies, World, canvasSize, scale) => {
    engine.world.gravity.y = 1.2 * scale; // 원형 운동을 위한 적절한 중력
    
    // 원형 레일 구조 만들기
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height * 0.6; // 중심을 약간 아래로
    const radius = Math.min(config.radius * 60 * scale, canvasSize.height * 0.3); // 적절한 크기

    // 원형 레일을 여러 개의 작은 세그먼트로 만들기
    const segments = 24; // 더 부드러운 곡선
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
        10 * scale, // 레일 두께
        {
          isStatic: true,
          angle: segmentAngle,
          render: { fillStyle: '#333' }
        }
      );
      railBodies.push(segment);
    }

    // 롤러코스터 카트 (공) - 바닥에서 시작해서 충분한 속도로
    const ballRadius = Math.min(config.ballRadius * scale, 20 * scale);
    const cart = Bodies.circle(
      centerX + radius - ballRadius * 2, // 레일 안쪽에서 시작
      centerY, 
      ballRadius, 
      {
        render: { fillStyle: config.ballColor },
        restitution: 0.8,
        frictionAir: 0.005 // 약간의 공기 저항
      }
    );

    // 초기 속도 설정 - 원형 운동이 가능한 충분한 속도
    const initialSpeed = config.velocity * scale * 0.4; // 적절한 속도
    Matter.Body.setVelocity(cart, {
      x: 0,
      y: -initialSpeed // 위쪽으로 시작
    });

    console.log('Circular simulation created:', {
      center: { x: centerX, y: centerY },
      radius,
      ballRadius,
      initialSpeed,
      canvasSize
    });

    World.add(engine.world, [...railBodies, cart]);
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
        frictionAir: 0.01 // 약간의 공기 저항
      }
    );

    // 진자 끈 - 더 강한 제약
    const constraint = Matter.Constraint.create({
      bodyA: anchor,
      bodyB: ball,
      length: pendulumLength,
      stiffness: 1,
      damping: 0.01, // 약간의 감쇠
      render: { 
        visible: true, 
        lineWidth: 4 * scale, 
        strokeStyle: '#8B4513',
        type: 'line'
      }
    });

    console.log('Pendulum simulation created:', {
      anchorPosition: { x: anchorX, y: anchorY },
      ballPosition: { x: ballX, y: ballY },
      pendulumLength,
      initialAngle: config.initialAngle,
      ballRadius,
      canvasSize
    });

    World.add(engine.world, [anchor, ball, constraint]);
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