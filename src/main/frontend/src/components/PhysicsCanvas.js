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
    console.log('PhysicsCanvas setup useEffect:', { simulation: simulation?.type });
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

    console.log('Creating simulation:', simulation.type);
    createSimulation(engine, simulation);

    Render.run(render);

    // 정리 함수
    return () => {
        console.log('Cleanup setup useEffect');
        if (renderRef.current) {
            Render.stop(renderRef.current);
            if(renderRef.current.canvas) {
                renderRef.current.canvas.remove();
            }
            renderRef.current.textures = {};
        }
        if (engineRef.current) {
            World.clear(engineRef.current.world);
            Engine.clear(engineRef.current);
        }
    };
  }, [simulation]); // simulation이 바뀔 때만 실행 (즉, 문제가 바뀔 때)

  // 물리 엔진 실행/중지를 위한 useEffect
  useEffect(() => {
    console.log('PhysicsCanvas activation useEffect:', { isActive });
    if (isActive) {
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
      }

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
        console.warn(`Unknown simulation type: ${type}`);
    }
  };

  const createFreefallSimulation = (engine, config, Bodies, World) => {
    engine.world.gravity.y = config.gravity / 60; // Matter.js 단위 조정
    
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
        density: 0.01 // 무거운 공
      });
      
      const lightBall = Bodies.circle(350, 50, config.ballRadius * 0.8, {
        render: { fillStyle: '#4ECDC4' },
        restitution: 0.7,
        density: 0.001 // 가벼운 공
      });

      World.add(engine.world, [ground, heavyBall, lightBall]);
    } else {
      // 떨어지는 공
      const ball = Bodies.circle(300, 50, config.ballRadius, {
        render: { fillStyle: config.ballColor },
        restitution: 0.7
      });

      World.add(engine.world, [ground, ball]);
    }
  };

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

    // 목표물 (옵션)
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
      y: -config.initialVelocity.y / 10 // y축은 위쪽이 음수
    });

    World.add(engine.world, [ground, launcher, ball]);
  };

  const createCollisionSimulation = (engine, config, Bodies, World) => {
    engine.world.gravity.y = 0; // 수평면에서의 충돌
    
    // 벽들
    const leftWall = Bodies.rectangle(50, 150, 20, 300, { isStatic: true, render: { fillStyle: '#666' } });
    const rightWall = Bodies.rectangle(750, 150, 20, 300, { isStatic: true, render: { fillStyle: '#666' } });
    const ground = Bodies.rectangle(400, 280, 800, 20, { isStatic: true, render: { fillStyle: '#8B4513' } });
    const ceiling = Bodies.rectangle(400, 20, 800, 20, { isStatic: true, render: { fillStyle: '#8B4513' } });

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

  const createCircularSimulation = (engine, config, Bodies, World) => {
    engine.world.gravity.y = 0; // 중력 제거
    
    // 중심점
    const center = Bodies.circle(250, 250, 5, {
      isStatic: true,
      render: { fillStyle: '#333' }
    });

    // 원운동하는 공
    const ball = Bodies.circle(250 + config.radius * 50, 250, config.ballRadius, {
      render: { fillStyle: config.ballColor }
    });

    // 구속 조건 (원운동을 위한 끈)
    const constraint = Matter.Constraint.create({
      bodyA: center,
      bodyB: ball,
      length: config.radius * 50,
      stiffness: 1,
      render: { visible: true, lineWidth: 2, strokeStyle: '#333' }
    });

    // 초기 접선 속도 설정
    Matter.Body.setVelocity(ball, {
      x: 0,
      y: -config.velocity / 10
    });

    World.add(engine.world, [center, ball, constraint]);
  };

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

    // 목표물 (옵션)
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
      y: config.initialVelocity.y / 10
    });

    World.add(engine.world, [ground, launcher, ball]);
  };

  const createCollisionSimulation = (engine, config, Bodies, World) => {
    engine.world.gravity.y = 0; // 수평면에서의 충돌
    
    // 벽들
    const leftWall = Bodies.rectangle(50, 150, 20, 300, { isStatic: true, render: { fillStyle: '#666' } });
    const rightWall = Bodies.rectangle(750, 150, 20, 300, { isStatic: true, render: { fillStyle: '#666' } });
    const ground = Bodies.rectangle(400, 280, 800, 20, { isStatic: true, render: { fillStyle: '#8B4513' } });
    const ceiling = Bodies.rectangle(400, 20, 800, 20, { isStatic: true, render: { fillStyle: '#8B4513' } });

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

  const createCircularSimulation = (engine, config, Bodies, World) => {
    engine.world.gravity.y = 0; // 중력 제거
    
    // 중심점
    const center = Bodies.circle(250, 250, 5, {
      isStatic: true,
      render: { fillStyle: '#333' }
    });

    // 원운동하는 공
    const ball = Bodies.circle(250 + config.radius * 50, 250, config.ballRadius, {
      render: { fillStyle: config.ballColor }
    });

    // 구속 조건 (원운동을 위한 끈)
    const constraint = Matter.Constraint.create({
      bodyA: center,
      bodyB: ball,
      length: config.radius * 50,
      stiffness: 1,
      render: { visible: true, lineWidth: 2, strokeStyle: '#333' }
    });

    // 초기 접선 속도 설정
    Matter.Body.setVelocity(ball, {
      x: 0,
      y: -config.velocity / 10
    });

    World.add(engine.world, [center, ball, constraint]);
  };

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