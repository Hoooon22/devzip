import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Matter from 'matter-js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import '../../styles/BreakingPoint.css';

// 입자 팔레트 — 그래파이트 배경 위에서 또렷한 차가운 색 (신호 3색과 겹치지 않게)
const PARTICLE = ['#5EC8FF', '#7C9CFF', '#9D7CFF', '#46E2C0', '#FFD166', '#FF8FA3'];

// 한 번에 쏟아붓는 단위 / 브라우저 멈춤 방지 상한
const LOAD_STEPS = [50, 200, 1000];
const MAX_BODIES = 8000;

const GRAVITY_PRESETS = [
  { label: '달', value: 0.16 },
  { label: '지구', value: 1.0 },
  { label: '목성', value: 2.5 },
  { label: '0g', value: 0 }
];

// 프레임 간격을 EMA로 평활화해 FPS/프레임타임 추정
function makeFpsMeter() {
  let last = null;
  let emaMs = 16.7;
  return {
    tick(now) {
      if (last != null) {
        const d = Math.min(now - last, 1000); // 탭 전환 점프 제거
        emaMs = emaMs * 0.9 + d * 0.1;
      }
      last = now;
      return { fps: 1000 / emaMs, frameMs: emaMs };
    },
    reset() {
      last = null;
      emaMs = 16.7;
    }
  };
}

function bodyFill(color) {
  return { restitution: 0.3, friction: 0.3, render: { fillStyle: color, lineWidth: 0 } };
}

// ---------------------------------------------------------------------------
// 2D 컨트롤러 — Matter.js
// ---------------------------------------------------------------------------
function createMatter2D(container, size) {
  let width = size.width;
  let height = size.height;
  const pr = Math.min(window.devicePixelRatio || 1, 2);

  const engine = Matter.Engine.create();
  engine.world.gravity.y = 1;

  const render = Matter.Render.create({
    element: container,
    engine,
    options: { width, height, wireframes: false, background: '#0B0E11', pixelRatio: pr }
  });
  Matter.Render.run(render);

  const runner = Matter.Runner.create();
  Matter.Runner.run(runner, engine);

  let walls = [];
  const buildWalls = () => {
    if (walls.length) Matter.Composite.remove(engine.world, walls);
    const t = 140;
    const opt = { isStatic: true, render: { fillStyle: '#171D24' } };
    walls = [
      Matter.Bodies.rectangle(width / 2, height + t / 2, width + t * 2, t, opt),
      Matter.Bodies.rectangle(-t / 2, height / 2, t, height + t * 2, opt),
      Matter.Bodies.rectangle(width + t / 2, height / 2, t, height + t * 2, opt)
    ];
    Matter.Composite.add(engine.world, walls);
  };
  buildWalls();

  const mouse = Matter.Mouse.create(render.canvas);
  // Windows 디스플레이 배율 등으로 devicePixelRatio가 소수면 Mouse.create가
  // data-pixel-ratio를 parseInt로 읽어 1로 잘려 좌표가 어긋난다 → 렌더와 같은 값으로 맞춘다
  mouse.pixelRatio = pr;
  const mouseConstraint = Matter.MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.2, render: { visible: false } }
  });
  Matter.Composite.add(engine.world, mouseConstraint);
  render.mouse = mouse;
  mouse.element.removeEventListener('wheel', mouse.mousewheel); // 휠은 페이지 스크롤에 양보

  const stats = { fps: 60, frameMs: 16.7, count: 0, breaking: 0 };
  const meter = makeFpsMeter();
  const onAfter = () => {
    const { fps, frameMs } = meter.tick(performance.now());
    stats.fps = fps;
    stats.frameMs = frameMs;
    if (stats.breaking === 0 && stats.count > 0 && fps < 30) stats.breaking = stats.count;
  };
  Matter.Events.on(render, 'afterRender', onAfter);

  const countDynamic = () =>
    Matter.Composite.allBodies(engine.world).filter((b) => !b.isStatic).length;

  return {
    stats,
    addBodies(n) {
      const batch = [];
      for (let i = 0; i < n; i++) {
        const x = 40 + Math.random() * (width - 80);
        const y = -20 - Math.random() * 260;
        const color = PARTICLE[(stats.count + i) % PARTICLE.length];
        const r = 7 + Math.random() * 9;
        const kind = (stats.count + i) % 3;
        let body;
        if (kind === 0) body = Matter.Bodies.circle(x, y, r, bodyFill(color));
        else if (kind === 1) body = Matter.Bodies.rectangle(x, y, r * 2, r * 2, bodyFill(color));
        else body = Matter.Bodies.polygon(x, y, 5, r + 2, bodyFill(color));
        batch.push(body);
      }
      Matter.Composite.add(engine.world, batch);
      stats.count = countDynamic();
    },
    reset() {
      Matter.Composite.allBodies(engine.world).forEach((b) => {
        if (!b.isStatic) Matter.Composite.remove(engine.world, b);
      });
      stats.count = 0;
      stats.breaking = 0;
      meter.reset();
    },
    setGravity(v) {
      engine.world.gravity.y = v;
    },
    setPaused(p) {
      runner.enabled = !p;
    },
    resize(w, h) {
      width = w;
      height = h;
      render.options.width = w;
      render.options.height = h;
      Matter.Render.setPixelRatio(render, pr);
      render.bounds.max.x = w;
      render.bounds.max.y = h;
      buildWalls();
    },
    destroy() {
      Matter.Events.off(render, 'afterRender', onAfter);
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
      if (render.canvas) render.canvas.remove();
      render.textures = {};
    }
  };
}

// ---------------------------------------------------------------------------
// 3D 컨트롤러 — three.js (렌더) + cannon-es (물리)
// ---------------------------------------------------------------------------
function createThree3D(container, size) {
  let width = size.width;
  let height = size.height;

  const ROOM = 16;
  const WALL_H = 18;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0B0E11');
  scene.fog = new THREE.Fog('#0B0E11', 60, 130);

  const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x0c1014, 0.95));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.75);
  dirLight.position.set(14, 26, 12);
  scene.add(dirLight);

  const groundMat = new THREE.MeshStandardMaterial({ color: '#141a20', roughness: 1 });
  const ground = new THREE.Mesh(new THREE.BoxGeometry(ROOM * 2, 1, ROOM * 2), groundMat);
  ground.position.y = -0.5;
  scene.add(ground);

  const grid = new THREE.GridHelper(ROOM * 2, 16, 0x2a333d, 0x1b222a);
  grid.position.y = 0.01;
  scene.add(grid);

  const boxEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(ROOM * 2, WALL_H, ROOM * 2)),
    new THREE.LineBasicMaterial({ color: '#2a333d' })
  );
  boxEdges.position.y = WALL_H / 2 - 0.5;
  scene.add(boxEdges);

  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  const physMat = new CANNON.Material('def');
  world.addContactMaterial(
    new CANNON.ContactMaterial(physMat, physMat, { friction: 0.3, restitution: 0.3 })
  );

  const addStaticBox = (hx, hy, hz, x, y, z) => {
    const body = new CANNON.Body({ mass: 0, material: physMat });
    body.addShape(new CANNON.Box(new CANNON.Vec3(hx, hy, hz)));
    body.position.set(x, y, z);
    world.addBody(body);
  };
  addStaticBox(ROOM, 0.5, ROOM, 0, -0.5, 0);
  addStaticBox(0.5, WALL_H, ROOM, -ROOM, WALL_H / 2, 0);
  addStaticBox(0.5, WALL_H, ROOM, ROOM, WALL_H / 2, 0);
  addStaticBox(ROOM, WALL_H, 0.5, 0, WALL_H / 2, -ROOM);
  addStaticBox(ROOM, WALL_H, 0.5, 0, WALL_H / 2, ROOM);

  const sphereGeo = new THREE.SphereGeometry(1, 12, 10);
  const boxGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
  const mats = PARTICLE.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.05 })
  );

  const dynamic = [];

  const cam = { radius: 46, theta: Math.PI * 0.25, phi: Math.PI * 0.36, auto: true };
  const target = new THREE.Vector3(0, 4, 0);
  const applyCam = () => {
    const r = cam.radius;
    camera.position.set(
      target.x + r * Math.sin(cam.phi) * Math.cos(cam.theta),
      target.y + r * Math.cos(cam.phi),
      target.z + r * Math.sin(cam.phi) * Math.sin(cam.theta)
    );
    camera.lookAt(target);
  };
  applyCam();

  let dragging = false;
  let lx = 0;
  let ly = 0;
  const el = renderer.domElement;
  const onDown = (e) => {
    dragging = true;
    cam.auto = false;
    lx = e.clientX;
    ly = e.clientY;
  };
  const onMove = (e) => {
    if (!dragging) return;
    cam.theta -= (e.clientX - lx) * 0.008;
    cam.phi = Math.max(0.15, Math.min(Math.PI * 0.49, cam.phi - (e.clientY - ly) * 0.006));
    lx = e.clientX;
    ly = e.clientY;
    applyCam();
  };
  const onUp = () => {
    dragging = false;
  };
  const onWheel = (e) => {
    e.preventDefault();
    cam.radius = Math.max(18, Math.min(100, cam.radius + e.deltaY * 0.03));
    applyCam();
  };
  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  el.addEventListener('wheel', onWheel, { passive: false });

  const stats = { fps: 60, frameMs: 16.7, count: 0, breaking: 0 };
  const meter = makeFpsMeter();
  let paused = false;
  let raf = 0;
  const fixedStep = 1 / 60;

  const loop = () => {
    raf = requestAnimationFrame(loop);
    const { fps, frameMs } = meter.tick(performance.now());
    stats.fps = fps;
    stats.frameMs = frameMs;
    if (stats.breaking === 0 && stats.count > 0 && fps < 30) stats.breaking = stats.count;

    if (!paused) {
      world.step(fixedStep, Math.min(frameMs / 1000, 0.05), 3);
      for (let i = 0; i < dynamic.length; i++) {
        const d = dynamic[i];
        d.mesh.position.copy(d.body.position);
        d.mesh.quaternion.copy(d.body.quaternion);
      }
    }
    if (cam.auto) {
      cam.theta += 0.0015;
      applyCam();
    }
    renderer.render(scene, camera);
  };
  loop();

  return {
    stats,
    addBodies(n) {
      for (let i = 0; i < n; i++) {
        const idx = stats.count + i;
        const isBox = idx % 3 === 0;
        const s = 0.7 + Math.random() * 0.8;
        const mesh = new THREE.Mesh(isBox ? boxGeo : sphereGeo, mats[idx % mats.length]);
        mesh.scale.setScalar(s);
        scene.add(mesh);

        const body = new CANNON.Body({ mass: 1, material: physMat });
        if (isBox) body.addShape(new CANNON.Box(new CANNON.Vec3(0.8 * s, 0.8 * s, 0.8 * s)));
        else body.addShape(new CANNON.Sphere(s));
        body.position.set(
          (Math.random() - 0.5) * ROOM * 1.6,
          WALL_H + Math.random() * 12,
          (Math.random() - 0.5) * ROOM * 1.6
        );
        body.sleepSpeedLimit = 0.6;
        world.addBody(body);
        dynamic.push({ body, mesh });
      }
      stats.count = dynamic.length;
    },
    reset() {
      dynamic.forEach((d) => {
        world.removeBody(d.body);
        scene.remove(d.mesh);
      });
      dynamic.length = 0;
      stats.count = 0;
      stats.breaking = 0;
      meter.reset();
    },
    setGravity(v) {
      world.gravity.set(0, -9.82 * v, 0);
    },
    setPaused(p) {
      paused = p;
    },
    resize(w, h) {
      width = w;
      height = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    },
    destroy() {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('wheel', onWheel);
      dynamic.forEach((d) => scene.remove(d.mesh));
      dynamic.length = 0;
      sphereGeo.dispose();
      boxGeo.dispose();
      mats.forEach((m) => m.dispose());
      ground.geometry.dispose();
      groundMat.dispose();
      grid.geometry.dispose();
      grid.material.dispose();
      boxEdges.geometry.dispose();
      boxEdges.material.dispose();
      renderer.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
    }
  };
}

// ---------------------------------------------------------------------------
// 오실로스코프 FPS 트레이스
// ---------------------------------------------------------------------------
const SCOPE_W = 300;
const SCOPE_H = 78;
const SCOPE_MAX = 75;
const scopeY = (v) => SCOPE_H - (Math.min(Math.max(v, 0), SCOPE_MAX) / SCOPE_MAX) * SCOPE_H;

function renderScope(history) {
  const xAt = (i) => (i / Math.max(history.length - 1, 1)) * SCOPE_W;
  const line =
    history.length >= 2
      ? history.map((v, i) => `${xAt(i).toFixed(1)},${scopeY(v).toFixed(1)}`).join(' ')
      : '';
  const area =
    history.length >= 2
      ? `M ${xAt(0).toFixed(1)},${SCOPE_H} ` +
        history.map((v, i) => `L ${xAt(i).toFixed(1)},${scopeY(v).toFixed(1)}`).join(' ') +
        ` L ${xAt(history.length - 1).toFixed(1)},${SCOPE_H} Z`
      : '';
  return (
    <svg className="bp-scope" viewBox={`0 0 ${SCOPE_W} ${SCOPE_H}`} preserveAspectRatio="none">
      <line className="bp-scope-grid" x1="0" y1={scopeY(60)} x2={SCOPE_W} y2={scopeY(60)} />
      <line className="bp-scope-grid" x1="0" y1={scopeY(30)} x2={SCOPE_W} y2={scopeY(30)} />
      <text className="bp-scope-tick" x="2" y={scopeY(60) - 2}>60</text>
      <text className="bp-scope-tick" x="2" y={scopeY(30) - 2}>30</text>
      {area && <path className="bp-scope-area" d={area} />}
      {line && <polyline className="bp-scope-line" points={line} />}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 페이지
// ---------------------------------------------------------------------------
const BreakingPoint = () => {
  const viewportRef = useRef(null);
  const stageRef = useRef(null);
  const ctrlRef = useRef(null);
  const gravityRef = useRef(1);
  const pausedRef = useRef(false);

  const [mode, setMode] = useState('2d');
  const [gravity, setGravity] = useState(1);
  const [paused, setPaused] = useState(false);
  const [ui, setUi] = useState({ fps: 60, frameMs: 16.7, count: 0, breaking: 0 });
  const [history, setHistory] = useState([]);

  // 모드 전환 시 컨트롤러 재생성 (뷰포트 실측 크기로)
  useEffect(() => {
    const vp = viewportRef.current;
    const stage = stageRef.current;
    if (!vp || !stage) return undefined;
    stage.innerHTML = '';
    const w = Math.max(1, vp.clientWidth);
    const h = Math.max(1, vp.clientHeight);
    const ctrl = mode === '3d'
      ? createThree3D(stage, { width: w, height: h })
      : createMatter2D(stage, { width: w, height: h });
    ctrlRef.current = ctrl;
    ctrl.setGravity(gravityRef.current);
    ctrl.setPaused(pausedRef.current);
    setHistory([]);
    setUi({ fps: 60, frameMs: 16.7, count: 0, breaking: 0 });
    return () => {
      ctrl.destroy();
      ctrlRef.current = null;
    };
  }, [mode]);

  // 뷰포트 리사이즈 → 현재 컨트롤러 크기 반영
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || typeof ResizeObserver === 'undefined') return undefined;
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const c = ctrlRef.current;
        if (c && c.resize) c.resize(Math.max(1, vp.clientWidth), Math.max(1, vp.clientHeight));
      });
    });
    ro.observe(vp);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  // 통계 폴링 (렌더 루프와 React 리렌더 분리)
  useEffect(() => {
    const id = setInterval(() => {
      const c = ctrlRef.current;
      if (!c) return;
      const s = c.stats;
      setUi({ fps: s.fps, frameMs: s.frameMs, count: s.count, breaking: s.breaking });
      setHistory((prev) => {
        const next = prev.concat(Math.max(0, s.fps));
        return next.length > 90 ? next.slice(next.length - 90) : next;
      });
    }, 200);
    return () => clearInterval(id);
  }, []);

  const addBodies = (n) => {
    const c = ctrlRef.current;
    if (!c || c.stats.count >= MAX_BODIES) return;
    c.addBodies(Math.min(n, MAX_BODIES - c.stats.count));
  };

  const handleReset = () => {
    const c = ctrlRef.current;
    if (c) {
      c.reset();
      setHistory([]);
    }
  };

  const applyGravity = (v) => {
    setGravity(v);
    gravityRef.current = v;
    if (ctrlRef.current) ctrlRef.current.setGravity(v);
  };

  const togglePause = () => {
    setPaused((p) => {
      const next = !p;
      pausedRef.current = next;
      if (ctrlRef.current) ctrlRef.current.setPaused(next);
      return next;
    });
  };

  const fps = ui.fps;
  const health = fps >= 50 ? 'ok' : fps >= 30 ? 'warn' : 'crit';
  const healthLabel = health === 'ok' ? 'STABLE' : health === 'warn' ? 'STRAINED' : 'BREAKING';
  const capReached = ui.count >= MAX_BODIES;
  // 16.7ms(60fps 예산) 대비 프레임타임 — 33.4ms에서 막대 가득
  const budgetPct = Math.min(100, (ui.frameMs / 33.4) * 100);

  return (
    <div className="bp-bench" data-health={health}>
      <div className="bp-tool">
      <header className="bp-rail">
        <Link to="/" className="bp-exit">◂ EXIT</Link>
        <div className="bp-id">
          <span className="bp-id-name">BREAKING&nbsp;POINT</span>
          <span className="bp-id-desc">physics engine test bench</span>
        </div>
        <div className="bp-engine" role="group" aria-label="물리 엔진 선택">
          <button
            type="button"
            className={`bp-engine-btn ${mode === '2d' ? 'on' : ''}`}
            onClick={() => setMode('2d')}
            aria-pressed={mode === '2d'}
          >
            <b>2D</b>
            <span>Matter.js</span>
          </button>
          <button
            type="button"
            className={`bp-engine-btn ${mode === '3d' ? 'on' : ''}`}
            onClick={() => setMode('3d')}
            aria-pressed={mode === '3d'}
          >
            <b>3D</b>
            <span>cannon-es</span>
          </button>
        </div>
      </header>

      <div className="bp-viewport" ref={viewportRef}>
        <div className="bp-stage" ref={stageRef} />
        <div className="bp-scanlines" aria-hidden="true" />

        {/* 좌상단: FPS 텔레메트리 */}
        <div className="bp-hud bp-hud-tl">
          <div className="bp-fps-block">
            <span className="bp-fps-val">{Math.round(fps)}</span>
            <span className="bp-fps-side">
              <span className="bp-fps-unit">FPS</span>
              <span className="bp-fps-state">{healthLabel}</span>
            </span>
          </div>
          {renderScope(history)}
          <div className="bp-budget">
            <div className="bp-budget-row">
              <span>FRAME</span>
              <span className="bp-budget-ms">{ui.frameMs.toFixed(1)}ms</span>
            </div>
            <div className="bp-budget-track">
              <div className="bp-budget-fill" style={{ width: `${budgetPct}%` }} />
              <div className="bp-budget-mark" title="16.7ms · 60fps 예산" />
            </div>
          </div>
        </div>

        {/* 우상단: 부하/한계 */}
        <div className="bp-hud bp-hud-tr">
          <div className="bp-count">
            <span className="bp-count-val">{ui.count.toLocaleString()}</span>
            <span className="bp-count-label">BODIES&nbsp;/&nbsp;{MAX_BODIES.toLocaleString()}</span>
          </div>
          <div className={`bp-break ${ui.breaking ? 'hit' : ''}`}>
            <span className="bp-break-label">BREAKING POINT</span>
            <span className="bp-break-val">
              {ui.breaking ? `≈ ${ui.breaking.toLocaleString()} bodies` : 'not reached'}
            </span>
          </div>
        </div>

        {/* 좌하단: 모드 안내 */}
        <div className="bp-hud bp-hud-bl">
          <span className="bp-rec" data-paused={paused} />
          <span className="bp-hint">
            {mode === '3d' ? '드래그 회전 · 휠 줌' : '물체를 마우스로 잡아 던지기'}
          </span>
        </div>
      </div>

      <footer className="bp-dock">
        <div className="bp-dock-group">
          <span className="bp-dock-label">LOAD</span>
          <div className="bp-btns">
            {LOAD_STEPS.map((n) => (
              <button
                key={n}
                type="button"
                className="bp-btn bp-btn-load"
                disabled={capReached}
                onClick={() => addBodies(n)}
              >
                +{n}
              </button>
            ))}
          </div>
        </div>

        <div className="bp-dock-group bp-dock-grav">
          <span className="bp-dock-label">GRAVITY</span>
          <input
            type="range"
            min="0"
            max="3"
            step="0.01"
            value={gravity}
            aria-label="중력"
            onChange={(e) => applyGravity(parseFloat(e.target.value))}
          />
          <span className="bp-grav-val">{gravity.toFixed(2)}g</span>
          <div className="bp-btns">
            {GRAVITY_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="bp-btn bp-btn-ghost"
                onClick={() => applyGravity(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bp-dock-group bp-dock-actions">
          <button type="button" className="bp-btn" onClick={togglePause}>
            {paused ? '▶ RUN' : '❚❚ HOLD'}
          </button>
          <button type="button" className="bp-btn bp-btn-purge" onClick={handleReset}>
            ↻ PURGE
          </button>
        </div>
      </footer>

      {capReached && (
        <div className="bp-cap">안전 상한 {MAX_BODIES.toLocaleString()} bodies에 도달했습니다 — PURGE로 비우세요.</div>
      )}
      </div>

      <section className="bp-notes">
        <h2 className="bp-notes-title">왜 무너지는가</h2>
        <p>
          {'브라우저의 물리 시뮬레이션은 대부분 '}<b>단일 스레드 자바스크립트</b>{' 위에서 돈다. '}
          {'매 프레임마다 모든 물체의 충돌을 검사하고 위치를 갱신하는데, 한 프레임에 주어진 예산은 '}
          {'60fps 기준 '}<b>약 16.7ms</b>{'뿐이다. 물체가 늘수록 충돌 쌍이 급격히 많아져 이 예산을 넘기는 순간 '}
          {'프레임이 밀리고 화면이 끊긴다 — 그 지점이 위 계기판의 '}<b>BREAKING POINT</b>{'다.'}
        </p>
        <p>
          {'2D(Matter.js)와 3D(cannon-es)를 같은 방식으로 몰아붙여 보면, 3D가 같은 물체 수에서 훨씬 빨리 무너진다 '}
          {'— 충돌 형상도, 렌더링 비용도 더 비싸기 때문이다. 이 벽을 넘는 길은 보통 '}
          <b>WASM 물리엔진(Rapier 등)·Web Worker 분리·인스턴싱·GPU 활용</b>{'으로 이어진다.'}
        </p>
        <p className="bp-notes-dim">
          {'* FPS는 기기 성능에 따라 다릅니다. BREAKING POINT는 절대값이 아니라 이 페이지를 여는 기기의 상대적 한계입니다.'}
        </p>
      </section>
    </div>
  );
};

export default BreakingPoint;
