import React, { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';
import '../assets/css/PhysicsLab.css';

// 네오브루탈 아케이드 팔레트 (디자인 메모리 기준)
const INK = '#161310';
const PALETTE = ['#FFD23F', '#FF5C5C', '#4D7CFF', '#2FBF71', '#FF9F1C', '#B57BFF'];

// 씬(예제) 메타데이터 — 각 씬은 build(ctx)로 월드를 채운다
const SCENES = [
  {
    id: 'sandbox',
    name: '샌드박스',
    emoji: '🧱',
    hint: '빈 상자에 도형을 떨어뜨리고 마우스로 던져보세요.',
    build: ({ Bodies, Composite, world, W }) => {
      // 도형 몇 개를 초기 배치
      const shapes = [];
      for (let i = 0; i < 7; i++) {
        const x = 80 + i * ((W - 160) / 6);
        const r = 18 + (i % 3) * 8;
        const color = PALETTE[i % PALETTE.length];
        const body = i % 2 === 0
          ? Bodies.circle(x, 80 + (i % 3) * 40, r, bodyStyle(color))
          : Bodies.rectangle(x, 80 + (i % 3) * 40, r * 2, r * 2, bodyStyle(color));
        shapes.push(body);
      }
      Composite.add(world, shapes);
    }
  },
  {
    id: 'cradle',
    name: '뉴턴의 요람',
    emoji: '🪀',
    hint: '맨 끝 공을 끌어당겼다 놓으면 운동량이 반대편으로 전달됩니다.',
    build: ({ Composites, Composite, world, W, H }) => {
      const cradle = Composites.newtonsCradle(
        W / 2 - 100, 60, 5, 26, Math.min(180, H * 0.45)
      );
      // 첫 공을 옆으로 당겨놓아 시작하자마자 충돌이 보이게
      Matter.Body.translate(cradle.bodies[0], { x: -120, y: -60 });
      cradle.bodies.forEach((b, i) => {
        b.render.fillStyle = PALETTE[i % PALETTE.length];
        b.render.strokeStyle = INK;
        b.render.lineWidth = 2;
      });
      Composite.add(world, cradle);
    }
  },
  {
    id: 'dominoes',
    name: '도미노',
    emoji: '🁢',
    hint: '왼쪽 공을 굴려(드래그) 도미노를 무너뜨려 보세요.',
    build: ({ Bodies, Composite, world, W, H }) => {
      const items = [];
      const baseY = H - 60;
      const count = Math.floor((W - 200) / 46);
      for (let i = 0; i < count; i++) {
        const x = 140 + i * 46;
        items.push(Bodies.rectangle(x, baseY - 45, 14, 90, {
          ...bodyStyle(PALETTE[i % PALETTE.length]),
          friction: 0.5
        }));
      }
      // 굴릴 공
      const ball = Bodies.circle(70, baseY - 30, 24, {
        ...bodyStyle('#FF5C5C'),
        density: 0.05,
        restitution: 0.2
      });
      Matter.Body.setVelocity(ball, { x: 8, y: 0 });
      Composite.add(world, [...items, ball]);
    }
  },
  {
    id: 'pyramid',
    name: '피라미드 탑',
    emoji: '🔺',
    hint: '블록 탑을 마우스로 끌어 무너뜨려 보세요.',
    build: ({ Bodies, Composites, Composite, world, W, H }) => {
      const stack = Composites.pyramid(
        W / 2 - 150, H - 60 - 8 * 38, 8, 8, 0, 0,
        (x, y) => Bodies.rectangle(x, y, 36, 36, bodyStyle(
          PALETTE[Math.floor((x + y) / 36) % PALETTE.length]
        ))
      );
      Composite.add(world, stack);
    }
  },
  {
    id: 'chain',
    name: '체인',
    emoji: '⛓️',
    hint: '매달린 사슬을 잡고 흔들어 보세요.',
    build: ({ Bodies, Composites, Composite, Constraint, world, W }) => {
      const group = Matter.Body.nextGroup(true);
      const links = Composites.stack(W / 2 - 110, 60, 9, 1, 6, 6, (x, y) =>
        Bodies.rectangle(x, y, 44, 16, {
          ...bodyStyle('#4D7CFF'),
          collisionFilter: { group },
          chamfer: { radius: 4 }
        })
      );
      Composites.chain(links, 0.45, 0, -0.45, 0, {
        stiffness: 0.9,
        length: 2,
        render: { strokeStyle: INK, lineWidth: 2 }
      });
      // 한쪽 끝을 천장에 고정
      Composite.add(links, Constraint.create({
        bodyB: links.bodies[0],
        pointB: { x: -22, y: 0 },
        pointA: { x: links.bodies[0].position.x - 22, y: 50 },
        stiffness: 0.9,
        render: { strokeStyle: INK, lineWidth: 2 }
      }));
      Composite.add(world, links);
    }
  },
  {
    id: 'gravity-well',
    name: '중력 우물',
    emoji: '🌌',
    gravityOff: true, // 일반 중력 비활성, 중심으로 끌어당김
    hint: '중심의 별이 주변 입자를 끌어당깁니다. 입자를 던져 궤도를 만들어 보세요.',
    build: ({ Bodies, Composite, world, W, H, registerAttractor }) => {
      const cx = W / 2;
      const cy = H / 2;
      const star = Bodies.circle(cx, cy, 30, {
        isStatic: true,
        render: { fillStyle: '#FFD23F', strokeStyle: INK, lineWidth: 3 }
      });
      const particles = [];
      for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2;
        const dist = 150 + (i % 3) * 40;
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist;
        const p = Bodies.circle(px, py, 8, {
          ...bodyStyle(PALETTE[i % PALETTE.length]),
          frictionAir: 0
        });
        // 접선 방향 초기 속도로 궤도 형성
        const speed = 4;
        Matter.Body.setVelocity(p, {
          x: -Math.sin(angle) * speed,
          y: Math.cos(angle) * speed
        });
        particles.push(p);
      }
      Composite.add(world, [star, ...particles]);
      registerAttractor(star);
    }
  }
];

// 네오브루탈 공통 바디 스타일
function bodyStyle(color) {
  return {
    restitution: 0.5,
    friction: 0.2,
    render: { fillStyle: color, strokeStyle: INK, lineWidth: 2 }
  };
}

const GRAVITY_PRESETS = [
  { label: '달', value: 0.16 },
  { label: '지구', value: 1.0 },
  { label: '목성', value: 2.5 },
  { label: '무중력', value: 0 }
];

const PhysicsLab = () => {
  const sceneRef = useRef(null);
  const engineRef = useRef(null);
  const renderRef = useRef(null);
  const runnerRef = useRef(null);
  const mouseConstraintRef = useRef(null);
  const attractorRef = useRef(null);
  const gravityRef = useRef(1.0);

  const [sceneId, setSceneId] = useState('sandbox');
  const [gravity, setGravity] = useState(1.0);
  const [paused, setPaused] = useState(false);
  const [bodyCount, setBodyCount] = useState(0);

  const activeScene = SCENES.find((s) => s.id === sceneId) || SCENES[0];

  // 월드 바디 수 갱신
  const refreshCount = useCallback(() => {
    if (!engineRef.current) return;
    const all = Matter.Composite.allBodies(engineRef.current.world);
    // 정적 벽(4개)은 제외하고 카운트
    setBodyCount(all.filter((b) => !b.isStatic).length);
  }, []);

  // 씬 구성 (벽 + 선택된 예제)
  const buildScene = useCallback((scene) => {
    const engine = engineRef.current;
    if (!engine) return;
    const { Composite, Bodies } = Matter;
    Composite.clear(engine.world, false);
    attractorRef.current = null;

    const W = renderRef.current.options.width;
    const H = renderRef.current.options.height;
    const t = 60; // 벽 두께 (충분히 두껍게 해 빠른 물체가 빠져나가지 않게)
    const wallOpt = { isStatic: true, render: { fillStyle: INK } };
    Composite.add(engine.world, [
      Bodies.rectangle(W / 2, -t / 2, W + t * 2, t, wallOpt),      // 천장
      Bodies.rectangle(W / 2, H + t / 2, W + t * 2, t, wallOpt),   // 바닥
      Bodies.rectangle(-t / 2, H / 2, t, H + t * 2, wallOpt),      // 좌
      Bodies.rectangle(W + t / 2, H / 2, t, H + t * 2, wallOpt)    // 우
    ]);

    // 중력 설정
    const g = scene.gravityOff ? 0 : gravityRef.current;
    engine.world.gravity.y = g;

    scene.build({
      ...Matter,
      world: engine.world,
      W,
      H,
      registerAttractor: (body) => { attractorRef.current = body; }
    });
    refreshCount();
  }, [refreshCount]);

  // 엔진/렌더러 1회 초기화
  useEffect(() => {
    const container = sceneRef.current;
    if (!container) return;

    const width = Math.min(900, container.clientWidth);
    const height = Math.round(width * 0.6);

    const engine = Matter.Engine.create();
    engineRef.current = engine;

    const render = Matter.Render.create({
      element: container,
      engine,
      options: {
        width,
        height,
        wireframes: false,
        background: '#FBF3E4',
        pixelRatio: window.devicePixelRatio || 1
      }
    });
    renderRef.current = render;
    Matter.Render.run(render);

    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    // 마우스 드래그 상호작용
    const mouse = Matter.Mouse.create(render.canvas);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } }
    });
    mouseConstraintRef.current = mouseConstraint;
    Matter.Composite.add(engine.world, mouseConstraint);
    render.mouse = mouse;
    // 캔버스 위 스크롤은 페이지에 양보
    mouse.element.removeEventListener('wheel', mouse.mousewheel);

    // 중력 우물: 매 프레임 중심 인력 적용
    Matter.Events.on(engine, 'beforeUpdate', () => {
      const star = attractorRef.current;
      if (!star) return;
      const bodies = Matter.Composite.allBodies(engine.world);
      bodies.forEach((b) => {
        if (b.isStatic || b === star) return;
        const dx = star.position.x - b.position.x;
        const dy = star.position.y - b.position.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;
        const force = 0.0009 * b.mass / Math.max(distSq, 1500);
        Matter.Body.applyForce(b, b.position, {
          x: (dx / dist) * force * 1000,
          y: (dy / dist) * force * 1000
        });
      });
    });

    return () => {
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
      if (render.canvas) render.canvas.remove();
      render.textures = {};
      engineRef.current = null;
      renderRef.current = null;
      runnerRef.current = null;
    };
  }, []);

  // 씬 변경 시 재구성
  useEffect(() => {
    if (!engineRef.current) return;
    setGravity((prev) => {
      const next = activeScene.gravityOff ? 0 : (prev === 0 && !activeScene.gravityOff ? 1.0 : prev);
      gravityRef.current = next;
      return next;
    });
    buildScene(activeScene);
    setPaused(false);
    if (runnerRef.current) runnerRef.current.enabled = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId]);

  // 중력 슬라이더/프리셋 반영
  const applyGravity = (value) => {
    setGravity(value);
    gravityRef.current = value;
    if (engineRef.current && !activeScene.gravityOff) {
      engineRef.current.world.gravity.y = value;
    }
  };

  const handleReset = () => {
    buildScene(activeScene);
    setPaused(false);
    if (runnerRef.current) runnerRef.current.enabled = true;
  };

  const handlePauseToggle = () => {
    setPaused((p) => {
      const next = !p;
      if (runnerRef.current) runnerRef.current.enabled = !next;
      return next;
    });
  };

  // 클릭 위치(또는 상단 중앙)에 무작위 도형 투하
  const handleSpawn = () => {
    const engine = engineRef.current;
    const render = renderRef.current;
    if (!engine || !render) return;
    const W = render.options.width;
    const { Bodies, Composite } = Matter;
    const batch = [];
    for (let i = 0; i < 5; i++) {
      const x = 80 + Math.floor((W - 160) * ((i + 0.5) / 5));
      const color = PALETTE[(i + bodyCount) % PALETTE.length];
      const kind = (i + bodyCount) % 3;
      let body;
      if (kind === 0) body = Bodies.circle(x, 40, 16 + (i % 2) * 8, bodyStyle(color));
      else if (kind === 1) body = Bodies.rectangle(x, 40, 34, 34, bodyStyle(color));
      else body = Bodies.polygon(x, 40, 3 + (i % 4), 22, bodyStyle(color));
      batch.push(body);
    }
    Composite.add(engine.world, batch);
    refreshCount();
  };

  return (
    <div className="lab-wrap">
      <header className="lab-header">
        <span className="lab-tag">{'// physics engine'}</span>
        <h1>물리 엔진 놀이터</h1>
        <p>Matter.js 위에서 직접 굴리고, 쌓고, 무너뜨리는 인터랙티브 샌드박스. 캔버스 안의 물체를 마우스로 잡아 던질 수 있어요.</p>
      </header>

      <div className="lab-grid">
        {/* 씬 선택 */}
        <aside className="lab-scenes">
          <h2 className="panel-label">예제 선택</h2>
          {SCENES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`scene-btn ${s.id === sceneId ? 'active' : ''}`}
              onClick={() => setSceneId(s.id)}
            >
              <span className="scene-emoji">{s.emoji}</span>
              <span className="scene-name">{s.name}</span>
            </button>
          ))}
        </aside>

        {/* 캔버스 */}
        <section className="lab-stage">
          <div className="stage-canvas" ref={sceneRef} />
          <p className="stage-hint">{activeScene.emoji} {activeScene.hint}</p>
        </section>

        {/* 컨트롤 */}
        <aside className="lab-controls">
          <h2 className="panel-label">컨트롤</h2>

          <div className="control-group">
            <div className="control-row">
              <span>중력</span>
              <span className="control-value">{gravity.toFixed(2)} g</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              step="0.01"
              value={gravity}
              disabled={activeScene.gravityOff}
              onChange={(e) => applyGravity(parseFloat(e.target.value))}
            />
            <div className="preset-row">
              {GRAVITY_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="preset-btn"
                  disabled={activeScene.gravityOff}
                  onClick={() => applyGravity(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {activeScene.gravityOff && (
              <p className="control-note">이 예제는 중심 인력을 사용해 일반 중력이 꺼져 있어요.</p>
            )}
          </div>

          <div className="control-group">
            <button type="button" className="action-btn spawn" onClick={handleSpawn}>
              ⬇ 도형 투하
            </button>
            <button type="button" className="action-btn" onClick={handlePauseToggle}>
              {paused ? '▶ 재생' : '⏸ 일시정지'}
            </button>
            <button type="button" className="action-btn reset" onClick={handleReset}>
              ↻ 초기화
            </button>
          </div>

          <div className="control-group stats">
            <div className="stat-line">
              <span>움직이는 물체</span>
              <strong>{bodyCount}</strong>
            </div>
            <div className="stat-line">
              <span>엔진</span>
              <strong>Matter.js</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PhysicsLab;
