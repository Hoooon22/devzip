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

const TIME_PRESETS = [
  { label: '0.25x', value: 0.25 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 }
];

const GRAV_DIRS = [
  { dir: 'up', label: '↑' },
  { dir: 'left', label: '←' },
  { dir: 'down', label: '↓' },
  { dir: 'right', label: '→' }
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

// 중력 방향 → 단위 벡터
function dirVec(dir) {
  if (dir === 'up') return { x: 0, y: -1 };
  if (dir === 'left') return { x: -1, y: 0 };
  if (dir === 'right') return { x: 1, y: 0 };
  return { x: 0, y: 1 }; // down
}

// ---------------------------------------------------------------------------
// 2D 컨트롤러 — Matter.js
// ---------------------------------------------------------------------------
function createMatter2D(container, size) {
  let width = size.width;
  let height = size.height;
  const pr = Math.min(window.devicePixelRatio || 1, 2);

  // 실험 파라미터 (런타임에 갱신)
  const cfg = { rest: 0.3, fric: 0.3, shape: 'mix', size: 1, gravMag: 1, gravDir: 'down' };

  const engine = Matter.Engine.create();

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

  const applyGravity = () => {
    const v = dirVec(cfg.gravDir);
    engine.world.gravity.x = v.x * cfg.gravMag;
    engine.world.gravity.y = v.y * cfg.gravMag;
  };
  applyGravity();

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

  const makeBody = (x, y, idx) => {
    const color = PARTICLE[idx % PARTICLE.length];
    const r = (7 + Math.random() * 9) * cfg.size;
    const opt = { restitution: cfg.rest, friction: cfg.fric, render: { fillStyle: color, lineWidth: 0 } };
    const kind = cfg.shape === 'mix' ? idx % 3 : cfg.shape === 'circle' ? 0 : cfg.shape === 'box' ? 1 : 2;
    if (kind === 0) return Matter.Bodies.circle(x, y, r, opt);
    if (kind === 1) return Matter.Bodies.rectangle(x, y, r * 2, r * 2, opt);
    return Matter.Bodies.polygon(x, y, 5, r + 2, opt);
  };

  return {
    stats,
    addBodies(n) {
      const batch = [];
      for (let i = 0; i < n; i++) {
        const x = 40 + Math.random() * (width - 80);
        const y = -20 - Math.random() * 260;
        batch.push(makeBody(x, y, stats.count + i));
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
    setGravity(mag) {
      cfg.gravMag = mag;
      applyGravity();
    },
    setGravityDir(dir) {
      cfg.gravDir = dir;
      applyGravity();
    },
    setMaterial(rest, fric) {
      cfg.rest = rest;
      cfg.fric = fric;
      Matter.Composite.allBodies(engine.world).forEach((b) => {
        if (!b.isStatic) {
          b.restitution = rest;
          b.friction = fric;
        }
      });
    },
    setTimeScale(s) {
      engine.timing.timeScale = s;
    },
    setSpawn(shape, sz) {
      cfg.shape = shape;
      cfg.size = sz;
    },
    explode(sign) {
      const cx = width / 2;
      const cy = height / 2;
      const speed = 14;
      Matter.Composite.allBodies(engine.world).forEach((b) => {
        if (b.isStatic) return;
        const dx = b.position.x - cx;
        const dy = b.position.y - cy;
        const d = Math.hypot(dx, dy) || 1;
        Matter.Body.setVelocity(b, { x: (dx / d) * speed * sign, y: (dy / d) * speed * sign });
      });
    },
    setRenderFlag(flag, on) {
      render.options[flag] = on;
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
      mouse.pixelRatio = pr;
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

  const cfg = { rest: 0.3, fric: 0.3, shape: 'mix', size: 1, gravMag: 1, gravDir: 'down', timeScale: 1 };

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
  const contact = new CANNON.ContactMaterial(physMat, physMat, { friction: 0.3, restitution: 0.3 });
  world.addContactMaterial(contact);

  const applyGravity = () => {
    const v = dirVec(cfg.gravDir);
    world.gravity.set(v.x * cfg.gravMag * 9.82, v.y * -1 * cfg.gravMag * 9.82, 0);
  };
  applyGravity();

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
      world.step(fixedStep, Math.min(frameMs / 1000, 0.05) * cfg.timeScale, 3);
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
        const isBox = cfg.shape === 'mix' ? idx % 3 === 0 : cfg.shape === 'box';
        const s = (0.7 + Math.random() * 0.8) * cfg.size;
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
    setGravity(mag) {
      cfg.gravMag = mag;
      applyGravity();
    },
    setGravityDir(dir) {
      cfg.gravDir = dir;
      applyGravity();
    },
    setMaterial(rest, fric) {
      cfg.rest = rest;
      cfg.fric = fric;
      contact.restitution = rest;
      contact.friction = fric;
      dynamic.forEach((d) => d.body.wakeUp());
    },
    setTimeScale(s) {
      cfg.timeScale = s;
    },
    setSpawn(shape, sz) {
      cfg.shape = shape;
      cfg.size = sz;
    },
    explode(sign) {
      const c = new CANNON.Vec3(0, 6, 0);
      dynamic.forEach((d) => {
        const p = d.body.position;
        const dx = p.x - c.x;
        const dy = p.y - c.y;
        const dz = p.z - c.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        const k = (10 * sign) / dist;
        const up = sign > 0 ? 3 : 0; // 폭발엔 살짝 띄우는 성분
        d.body.wakeUp();
        d.body.applyImpulse(new CANNON.Vec3(dx * k, dy * k + up, dz * k), p);
      });
    },
    setRenderFlag() {
      /* 3D는 디버그 오버레이 미지원 */
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

  // 모드 전환/리사이즈 후에도 유지할 실험 설정
  const gravityRef = useRef(1);
  const gravDirRef = useRef('down');
  const pausedRef = useRef(false);
  const matRef = useRef({ bounce: 0.3, friction: 0.3 });
  const timeRef = useRef(1);
  const spawnRef = useRef({ shape: 'mix', size: 1 });
  const flagsRef = useRef({ wireframes: false, velocity: false, collisions: false });

  const [mode, setMode] = useState('2d');
  const [gravity, setGravity] = useState(1);
  const [gravDir, setGravDir] = useState('down');
  const [paused, setPaused] = useState(false);
  const [bounce, setBounce] = useState(0.3);
  const [friction, setFriction] = useState(0.3);
  const [timeScale, setTimeScale] = useState(1);
  const [shape, setShape] = useState('mix');
  const [spawnSize, setSpawnSize] = useState(1);
  const [flags, setFlags] = useState({ wireframes: false, velocity: false, collisions: false });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ui, setUi] = useState({ fps: 60, frameMs: 16.7, count: 0, breaking: 0 });
  const [history, setHistory] = useState([]);

  // 모드 전환 시 컨트롤러 재생성 (뷰포트 실측 크기로) + 현재 설정 재적용
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
    ctrl.setGravityDir(gravDirRef.current);
    ctrl.setGravity(gravityRef.current);
    ctrl.setMaterial(matRef.current.bounce, matRef.current.friction);
    ctrl.setTimeScale(timeRef.current);
    ctrl.setSpawn(spawnRef.current.shape, spawnRef.current.size);
    ctrl.setPaused(pausedRef.current);
    if (mode === '2d') {
      ctrl.setRenderFlag('wireframes', flagsRef.current.wireframes);
      ctrl.setRenderFlag('showVelocity', flagsRef.current.velocity);
      ctrl.setRenderFlag('showCollisions', flagsRef.current.collisions);
    }
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

  const applyGravDir = (dir) => {
    setGravDir(dir);
    gravDirRef.current = dir;
    if (ctrlRef.current) ctrlRef.current.setGravityDir(dir);
  };

  const togglePause = () => {
    setPaused((p) => {
      const next = !p;
      pausedRef.current = next;
      if (ctrlRef.current) ctrlRef.current.setPaused(next);
      return next;
    });
  };

  const applyBounce = (v) => {
    setBounce(v);
    matRef.current = { ...matRef.current, bounce: v };
    if (ctrlRef.current) ctrlRef.current.setMaterial(v, matRef.current.friction);
  };
  const applyFriction = (v) => {
    setFriction(v);
    matRef.current = { ...matRef.current, friction: v };
    if (ctrlRef.current) ctrlRef.current.setMaterial(matRef.current.bounce, v);
  };
  const applyTime = (v) => {
    setTimeScale(v);
    timeRef.current = v;
    if (ctrlRef.current) ctrlRef.current.setTimeScale(v);
  };
  const applyShape = (s) => {
    setShape(s);
    spawnRef.current = { ...spawnRef.current, shape: s };
    if (ctrlRef.current) ctrlRef.current.setSpawn(s, spawnRef.current.size);
  };
  const applySize = (sz) => {
    setSpawnSize(sz);
    spawnRef.current = { ...spawnRef.current, size: sz };
    if (ctrlRef.current) ctrlRef.current.setSpawn(spawnRef.current.shape, sz);
  };
  const doExplode = (sign) => {
    if (ctrlRef.current) ctrlRef.current.explode(sign);
  };
  const toggleFlag = (key, matterName) => {
    setFlags((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      flagsRef.current = next;
      if (ctrlRef.current) ctrlRef.current.setRenderFlag(matterName, next[key]);
      return next;
    });
  };

  const fps = ui.fps;
  const health = fps >= 50 ? 'ok' : fps >= 30 ? 'warn' : 'crit';
  const healthLabel = health === 'ok' ? 'STABLE' : health === 'warn' ? 'STRAINED' : 'BREAKING';
  const capReached = ui.count >= MAX_BODIES;
  const budgetPct = Math.min(100, (ui.frameMs / 33.4) * 100);

  const shapeOptions =
    mode === '3d'
      ? [{ k: 'mix', t: 'MIX' }, { k: 'circle', t: '● 구' }, { k: 'box', t: '■ 박스' }]
      : [{ k: 'mix', t: 'MIX' }, { k: 'circle', t: '● 원' }, { k: 'box', t: '■ 박스' }, { k: 'poly', t: '⬟ 다각형' }];

  return (
    <div className="bp-bench" data-health={health}>
      <div className="bp-tool">
        <header className="bp-rail">
          <Link to="/" className="bp-exit">◂ EXIT</Link>
          <div className="bp-id">
            <span className="bp-id-name">BREAKING&nbsp;POINT</span>
            <span className="bp-id-desc">physics engine test bench</span>
          </div>
          <button
            type="button"
            className={`bp-params-toggle ${drawerOpen ? 'on' : ''}`}
            onClick={() => setDrawerOpen((o) => !o)}
            aria-pressed={drawerOpen}
          >
            ⚙ PARAMS
          </button>
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

          {/* 실험 파라미터 드로어 */}
          <aside className={`bp-drawer ${drawerOpen ? 'open' : ''}`} aria-hidden={!drawerOpen}>
            <div className="bp-drawer-head">
              <span>EXPERIMENT&nbsp;LAB</span>
              <button type="button" className="bp-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="패널 닫기">✕</button>
            </div>

            <div className="bp-sec">
              <span className="bp-sec-title">재질 · MATERIAL</span>
              <div className="bp-field">
                <span className="bp-field-row"><span>반발 (탄성)</span><b>{bounce.toFixed(2)}</b></span>
                <input type="range" min="0" max="1" step="0.01" value={bounce} aria-label="반발 탄성"
                  onChange={(e) => applyBounce(parseFloat(e.target.value))} />
              </div>
              <div className="bp-field">
                <span className="bp-field-row"><span>마찰</span><b>{friction.toFixed(2)}</b></span>
                <input type="range" min="0" max="1" step="0.01" value={friction} aria-label="마찰"
                  onChange={(e) => applyFriction(parseFloat(e.target.value))} />
              </div>
            </div>

            <div className="bp-sec">
              <span className="bp-sec-title">시간 · TIME SCALE</span>
              <div className="bp-field">
                <span className="bp-field-row"><span>배율</span><b>{timeScale.toFixed(2)}x</b></span>
                <input type="range" min="0.1" max="2" step="0.05" value={timeScale} aria-label="시간 배율"
                  onChange={(e) => applyTime(parseFloat(e.target.value))} />
              </div>
              <div className="bp-chiprow">
                {TIME_PRESETS.map((t) => (
                  <button key={t.label} type="button"
                    className={`bp-chip ${timeScale === t.value ? 'on' : ''}`}
                    onClick={() => applyTime(t.value)}>{t.label}</button>
                ))}
              </div>
            </div>

            <div className="bp-sec">
              <span className="bp-sec-title">스폰 · SPAWN</span>
              <div className="bp-chiprow">
                {shapeOptions.map((s) => (
                  <button key={s.k} type="button"
                    className={`bp-chip ${shape === s.k ? 'on' : ''}`}
                    onClick={() => applyShape(s.k)}>{s.t}</button>
                ))}
              </div>
              <div className="bp-field">
                <span className="bp-field-row"><span>크기</span><b>{spawnSize.toFixed(1)}x</b></span>
                <input type="range" min="0.5" max="2.5" step="0.1" value={spawnSize} aria-label="스폰 크기"
                  onChange={(e) => applySize(parseFloat(e.target.value))} />
              </div>
            </div>

            <div className="bp-sec">
              <span className="bp-sec-title">중력 방향 · DIRECTION</span>
              <div className="bp-dirpad">
                {GRAV_DIRS.map((g) => (
                  <button key={g.dir} type="button"
                    className={`bp-dir ${gravDir === g.dir ? 'on' : ''} bp-dir-${g.dir}`}
                    onClick={() => applyGravDir(g.dir)} aria-label={`중력 ${g.dir}`}>{g.label}</button>
                ))}
                <span className="bp-dir-center" aria-hidden="true" />
              </div>
            </div>

            <div className="bp-sec">
              <span className="bp-sec-title">힘 · FORCE</span>
              <div className="bp-chiprow">
                <button type="button" className="bp-chip bp-chip-act" onClick={() => doExplode(1)}>💥 폭발</button>
                <button type="button" className="bp-chip bp-chip-act" onClick={() => doExplode(-1)}>🧲 응집</button>
              </div>
            </div>

            <div className="bp-sec">
              <span className="bp-sec-title">관측 · INSPECT (2D)</span>
              {mode === '2d' ? (
                <div className="bp-chiprow">
                  <button type="button" className={`bp-chip ${flags.wireframes ? 'on' : ''}`}
                    onClick={() => toggleFlag('wireframes', 'wireframes')}>와이어프레임</button>
                  <button type="button" className={`bp-chip ${flags.velocity ? 'on' : ''}`}
                    onClick={() => toggleFlag('velocity', 'showVelocity')}>속도 벡터</button>
                  <button type="button" className={`bp-chip ${flags.collisions ? 'on' : ''}`}
                    onClick={() => toggleFlag('collisions', 'showCollisions')}>충돌점</button>
                </div>
              ) : (
                <p className="bp-sec-note">디버그 오버레이는 2D 모드에서만 지원됩니다.</p>
              )}
            </div>
          </aside>
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
          {'⚙ PARAMS 패널에서 '}<b>반발·마찰·시간 배율·스폰 모양/크기·중력 방향·폭발/응집</b>{'을 바꿔가며 '}
          {'같은 물체 수라도 조건에 따라 한계점이 어떻게 달라지는지 실험해 보자. '}
          {'2D에서는 와이어프레임·속도 벡터·충돌점을 켜 엔진이 실제로 무엇을 계산하는지 들여다볼 수 있다.'}
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
