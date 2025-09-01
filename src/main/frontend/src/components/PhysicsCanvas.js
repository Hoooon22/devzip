import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Matter from 'matter-js';
import { simulationDefaults } from '../data/physicsQuestions';

const PhysicsCanvas = ({ simulation, isActive, onComplete }) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const renderRef = useRef(null);
  const runnerRef = useRef(null);
  const [isRunning, setIsRunning] = useState(false);

  // 시뮬레이션 초기 설정 및 렌더링을 위한 useEffect
  useEffect(() => {
    if (!simulation) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { Engine, Render, World } = Matter;

    const engine = Engine.create();
    engineRef.current = engine;

    const defaults = simulationDefaults[simulation.type];
    
    const render = Render.create({
      canvas: canvas,
      engine: engine,
      options: {
        width: defaults.width,
        height: defaults.height,
        wireframes: false,
        background: defaults.backgroundColor,
        showVelocity: false,
        showAngleIndicator: false
      }
    });
    renderRef.current = render;

    createSimulation(engine, simulation);

    Render.run(render);

    // 정리 함수
    return () => {
      if (renderRef.current) {
        Render.stop(renderRef.current);
        if (renderRef.current.canvas) {
          renderRef.current.canvas.remove();
        }
        renderRef.current.textures = {};
      }
      if (engineRef.current) {
        World.clear(engineRef.current.world);
        Engine.clear(engineRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulation]);

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

  const createSimulation = (engine, simulation) => {
    const { Bodies, World } = Matter;
    const { type, config } = simulation;

    switch (type) {
      case 'freefall':
        createFreefallSimulation(engine, config, Bodies, World);
        break;
      case 'projectile':
        createProjectileSimulation(engine, config, Bodies, World);
        break;
      case 'collision':
        createCollisionSimulation(engine, config, Bodies, World);
        break;
      case 'circular':
        createCircularSimulation(engine, config, Bodies, World);
        break;
      case 'pendulum':
        createPendulumSimulation(engine, config, Bodies, World);
        break;
      default:
        break;
    }
  };

  // 1. 자유낙하 시뮬레이션 (무거운 공 vs 가벼운 공)
  const createFreefallSimulation = (engine, config, Bodies, World) => {
    engine.world.gravity.y = config.gravity / 60;
    
    // 지면
    const ground = Bodies.rectangle(300, 380, 600, 40, {
      isStatic: true,
      render: { fillStyle: '#8B4513' }
    });

    if (config.showTwoBalls) {
      // 두 개의 공 (무거운 것과 가벼운 것)
      const heavyBall = Bodies.circle(250, 50, config.ballRadius, {
        render: { fillStyle: config.ballColor },
        restitution: 0.7,
        density: 0.01
      });
      
      const lightBall = Bodies.circle(350, 50, config.ballRadius * 0.8, {
        render: { fillStyle: '#4ECDC4' },
        restitution: 0.7,
        density: 0.001
      });

      World.add(engine.world, [ground, heavyBall, lightBall]);
    } else {
      const ball = Bodies.circle(300, 50, config.ballRadius, {
        render: { fillStyle: config.ballColor },
        restitution: 0.7
      });

      World.add(engine.world, [ground, ball]);
    }
  };

  // 2. 포물선 운동 시뮬레이션 (물총의 궤적)
  const createProjectileSimulation = (engine, config, Bodies, World) => {
    engine.world.gravity.y = config.gravity / 60;
    
    // 지면
    const ground = Bodies.rectangle(400, 380, 800, 40, {
      isStatic: true,
      render: { fillStyle: '#8B4513' }
    });

    // 발사대
    const launcher = Bodies.rectangle(50, 350 - config.initialHeight * 10, 20, 20, {
      isStatic: true,
      render: { fillStyle: '#666' }
    });

    // 목표물
    if (config.showTarget) {
      const target = Bodies.rectangle(650, 350, 30, 50, {
        isStatic: true,
        render: { fillStyle: '#FF6B6B' }
      });
      World.add(engine.world, [target]);
    }

    // 발사되는 공
    const ball = Bodies.circle(50, 350 - config.initialHeight * 10, config.ballRadius, {
      render: { fillStyle: config.ballColor }
    });

    // 초기 속도 설정 (Matter.js 단위로 조정)
    Matter.Body.setVelocity(ball, {
      x: config.initialVelocity.x / 10,
      y: -config.initialVelocity.y / 10  // y축은 위쪽이 음수
    });

    World.add(engine.world, [ground, launcher, ball]);
  };

  // 3. 충돌 시뮬레이션 (당구공의 충돌)
  const createCollisionSimulation = (engine, config, Bodies, World) => {
    engine.world.gravity.y = 0; // 수평면에서의 충돌
    
    // 벽들
    const leftWall = Bodies.rectangle(50, 150, 20, 300, { 
      isStatic: true, 
      render: { fillStyle: '#666' } 
    });
    const rightWall = Bodies.rectangle(750, 150, 20, 300, { 
      isStatic: true, 
      render: { fillStyle: '#666' } 
    });
    const ground = Bodies.rectangle(400, 280, 800, 20, { 
      isStatic: true, 
      render: { fillStyle: '#8B4513' } 
    });
    const ceiling = Bodies.rectangle(400, 20, 800, 20, { 
      isStatic: true, 
      render: { fillStyle: '#8B4513' } 
    });

    // 충돌하는 공들
    const ball1 = Bodies.circle(200, 150, config.ball1.radius, {
      render: { fillStyle: config.ball1.color },
      restitution: config.elasticity,
      density: config.ball1.mass / 100
    });

    const ball2 = Bodies.circle(500, 150, config.ball2.radius, {
      render: { fillStyle: config.ball2.color },
      restitution: config.elasticity,
      density: config.ball2.mass / 100
    });

    // 초기 속도 설정
    Matter.Body.setVelocity(ball1, { x: config.ball1.velocity / 10, y: 0 });
    Matter.Body.setVelocity(ball2, { x: config.ball2.velocity / 10, y: 0 });

    World.add(engine.world, [leftWall, rightWall, ground, ceiling, ball1, ball2]);
  };

  // 4. 원형 운동 시뮬레이션 (롤러코스터의 원형 구간)
  const createCircularSimulation = (engine, config, Bodies, World) => {
    engine.world.gravity.y = config.gravity ? config.gravity / 60 : 0.5; // 중력 설정
    
    // 원형 레일 구조 만들기
    const centerX = 250;
    const centerY = 250;
    const radius = config.radius * 50;

    // 원형 레일을 여러 개의 작은 세그먼트로 만들기
    const segments = 16;
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
        8,
        {
          isStatic: true,
          angle: segmentAngle,
          render: { fillStyle: '#333' }
        }
      );
      railBodies.push(segment);
    }

    // 롤러코스터 카트 (공)
    const cart = Bodies.circle(centerX + radius - 10, centerY, config.ballRadius, {
      render: { fillStyle: config.ballColor },
      restitution: 0.8
    });

    // 초기 속도 설정 (접선 방향)
    Matter.Body.setVelocity(cart, {
      x: 0,
      y: -config.velocity / 10
    });

    World.add(engine.world, [...railBodies, cart]);
  };

  // 5. 진자 운동 시뮬레이션 (그네의 비밀)
  const createPendulumSimulation = (engine, config, Bodies, World) => {
    engine.world.gravity.y = config.gravity / 60;
    
    // 고정점
    const anchor = Bodies.circle(300, 50, 5, {
      isStatic: true,
      render: { fillStyle: '#333' }
    });

    // 진자 추
    const pendulumLength = config.length * 200;
    const initialAngleRad = (config.initialAngle * Math.PI) / 180;
    const ball = Bodies.circle(
      300 + pendulumLength * Math.sin(initialAngleRad),
      50 + pendulumLength * Math.cos(initialAngleRad),
      config.ballRadius,
      {
        render: { fillStyle: config.ballColor },
        inertia: Infinity // 회전 방지
      }
    );

    // 진자 끈
    const constraint = Matter.Constraint.create({
      bodyA: anchor,
      bodyB: ball,
      length: pendulumLength,
      stiffness: 1,
      render: { visible: true, lineWidth: 3, strokeStyle: '#333' }
    });

    World.add(engine.world, [anchor, ball, constraint]);
  };

  return (
    <div className="physics-canvas-container">
      <canvas
        ref={canvasRef}
        style={{
          border: '2px solid #ddd',
          borderRadius: '8px',
          maxWidth: '100%',
          height: 'auto'
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