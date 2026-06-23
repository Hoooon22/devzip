import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import '../../styles/BreakingPoint.css';
import '../../styles/MovementLab.css';

// ---------------------------------------------------------------------------
// 손맛 프리셋 — 같은 캐릭터라도 파라미터 조합이 장르를 만든다
// ---------------------------------------------------------------------------
const PRESETS = {
  platformer: {
    label: '플랫포머',
    cfg: { moveSpeed: 7, runMult: 1.5, accel: 18, airControl: 0.85, jumpHeight: 2.4, gravity: 26, maxJumps: 2, coyote: 0.12, buffer: 0.13 }
  },
  floaty: {
    label: '둥실',
    cfg: { moveSpeed: 5.5, runMult: 1.4, accel: 8, airControl: 0.6, jumpHeight: 3.2, gravity: 9, maxJumps: 2, coyote: 0.2, buffer: 0.18 }
  },
  realistic: {
    label: '리얼',
    cfg: { moveSpeed: 5, runMult: 1.8, accel: 10, airControl: 0.25, jumpHeight: 1.3, gravity: 22, maxJumps: 1, coyote: 0.05, buffer: 0.06 }
  }
};

const DEFAULT_CFG = { ...PRESETS.platformer.cfg };

// 캐릭터 충돌 구 반지름 (작은 계단은 굴러 넘는다)
const BODY_R = 0.6;
const SPAWN = new CANNON.Vec3(0, 2.2, 8);

// 전투 — 적을 쏟아부으며 타격하고 그동안 FPS를 본다
const MAX_ENEMIES = 400; // 브라우저 멈춤 방지 상한
const ENEMY_STEPS = [5, 20, 50]; // 한 번에 스폰하는 단위
const ENEMY_SPEED = 2.4; // 플레이어를 향해 다가오는 속도
const ATTACK_DUR = 0.36; // 검 한 번 휘두르는 시간(초)
const ATTACK_RANGE = 3.1; // 베기 도달 거리
const ATTACK_ARC = 0.42; // 정면 기준 히트 콘 (dot 임계값)

// 입력 코드 → 이동축
const KEY_AXIS = {
  KeyW: 'f', ArrowUp: 'f',
  KeyS: 'b', ArrowDown: 'b',
  KeyA: 'l', ArrowLeft: 'l',
  KeyD: 'r', ArrowRight: 'r'
};

// ---------------------------------------------------------------------------
// 무브먼트 컨트롤러 — three.js(렌더) + cannon-es(물리) + 커스텀 캐릭터 로직
// ---------------------------------------------------------------------------
function createMovementLab(container, size) {
  let width = size.width;
  let height = size.height;

  const cfg = { ...DEFAULT_CFG };
  let jumpSpeed = Math.sqrt(2 * cfg.gravity * cfg.jumpHeight);

  // ── 씬 / 렌더러 ────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0B0E11');
  scene.fog = new THREE.Fog('#0B0E11', 55, 150);

  const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x0c1014, 0.95));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  dirLight.position.set(18, 30, 14);
  scene.add(dirLight);

  // ── 물리 월드 ──────────────────────────────────────────
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -cfg.gravity, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.defaultContactMaterial.friction = 0; // 수평 속도는 코드가 직접 제어 → 마찰 0
  const groundMat = new CANNON.Material('ground');
  const bodyMat = new CANNON.Material('body');
  world.addContactMaterial(new CANNON.ContactMaterial(groundMat, bodyMat, { friction: 0, restitution: 0 }));

  const disposables = [];
  const track = (geo, mat) => {
    if (geo) disposables.push(geo);
    if (mat) disposables.push(mat);
  };

  // 정적 박스: three 메시 + cannon 바디 동시 생성
  const addBox = (dim, pos, color, rotY = 0) => {
    const geo = new THREE.BoxGeometry(dim.x, dim.y, dim.z);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.03 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.rotation.y = rotY;
    scene.add(mesh);
    track(geo, mat);

    const body = new CANNON.Body({ mass: 0, material: groundMat });
    body.addShape(new CANNON.Box(new CANNON.Vec3(dim.x / 2, dim.y / 2, dim.z / 2)));
    body.position.set(pos.x, pos.y, pos.z);
    body.quaternion.setFromEuler(0, rotY, 0);
    world.addBody(body);
    return mesh;
  };

  // ── 월드 구성: 바닥·계단·경사로·공중 발판·벽 ──────────
  const ARENA = 30;
  addBox({ x: ARENA * 2, y: 1, z: ARENA * 2 }, { x: 0, y: -0.5, z: 0 }, '#161c23');

  const grid = new THREE.GridHelper(ARENA * 2, 30, 0x2a333d, 0x1b222a);
  grid.position.y = 0.02;
  scene.add(grid);

  // 스폰 패드
  const padGeo = new THREE.RingGeometry(1.1, 1.4, 32);
  const padMat = new THREE.MeshBasicMaterial({ color: '#5EC8FF', transparent: true, opacity: 0.5, side: THREE.DoubleSide });
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(SPAWN.x, 0.04, SPAWN.z);
  scene.add(pad);
  track(padGeo, padMat);

  // 계단 (한 칸 0.35 높이 → 충돌 구가 굴러 넘는 한계 실험)
  for (let i = 0; i < 7; i++) {
    addBox({ x: 5, y: 0.35 * (i + 1), z: 1.6 }, { x: -10, y: (0.35 * (i + 1)) / 2, z: -4 - i * 1.6 }, '#1d2630');
  }

  // 경사로
  addBox({ x: 6, y: 0.4, z: 11 }, { x: 9, y: 1.7, z: -6 }, '#24303b', 0).rotation.set(-0.32, 0, 0);
  // 경사로 물리 바디는 회전 포함이 필요 → 별도 추가
  {
    const ramp = new CANNON.Body({ mass: 0, material: groundMat });
    ramp.addShape(new CANNON.Box(new CANNON.Vec3(3, 0.2, 5.5)));
    ramp.position.set(9, 1.7, -6);
    ramp.quaternion.setFromEuler(-0.32, 0, 0);
    world.addBody(ramp);
  }

  // 공중 발판 — 점프 도달 한계를 눈으로 가늠
  const platSpecs = [
    { p: { x: 0, y: 1.6, z: -2 }, c: '#26323d' },
    { p: { x: 3.5, y: 3.0, z: -3 }, c: '#2a3744' },
    { p: { x: 7, y: 4.6, z: -4 }, c: '#2f3d4b' }
  ];
  platSpecs.forEach((s) => addBox({ x: 3, y: 0.5, z: 3 }, s.p, s.c));

  // 둘레 벽 (낮게 — 넘어 떨어지면 리스폰)
  const WT = 1;
  addBox({ x: ARENA * 2, y: 3, z: WT }, { x: 0, y: 1.5, z: -ARENA }, '#141a20');
  addBox({ x: ARENA * 2, y: 3, z: WT }, { x: 0, y: 1.5, z: ARENA }, '#141a20');
  addBox({ x: WT, y: 3, z: ARENA * 2 }, { x: -ARENA, y: 1.5, z: 0 }, '#141a20');
  addBox({ x: WT, y: 3, z: ARENA * 2 }, { x: ARENA, y: 1.5, z: 0 }, '#141a20');

  // ── 캐릭터 ─────────────────────────────────────────────
  const charBody = new CANNON.Body({ mass: 1, material: bodyMat });
  charBody.addShape(new CANNON.Sphere(BODY_R));
  charBody.position.copy(SPAWN);
  charBody.fixedRotation = true; // 굴러가지 않게
  charBody.updateMassProperties();
  charBody.linearDamping = 0; // 감속은 코드가 제어
  world.addBody(charBody);

  // 아바타(캡슐 + 바이저) — 그룹을 진행 방향으로 회전
  const avatar = new THREE.Group();
  const capGeo = new THREE.CapsuleGeometry(0.5, 0.7, 6, 14);
  const capMat = new THREE.MeshStandardMaterial({ color: '#5EC8FF', roughness: 0.4, metalness: 0.1 });
  const capsule = new THREE.Mesh(capGeo, capMat);
  capsule.position.y = 0.25; // 캡슐 밑면을 충돌 구 밑면에 맞춤
  avatar.add(capsule);
  const visorGeo = new THREE.BoxGeometry(0.5, 0.18, 0.22);
  const visorMat = new THREE.MeshStandardMaterial({ color: '#0B0E11', roughness: 0.3 });
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 0.5, 0.42);
  avatar.add(visor);
  scene.add(avatar);
  track(capGeo, capMat);
  track(visorGeo, visorMat);

  // 접지 표시 링
  const ringGeo = new THREE.RingGeometry(0.55, 0.72, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#36e27a', transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  track(ringGeo, ringMat);

  // 속도 벡터 화살표
  const velArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 1, 0xffd166, 0.4, 0.25);
  velArrow.visible = false;
  scene.add(velArrow);

  // ── 검 (아바타 그룹의 자식, 스윙 시 로컬 회전) ─────────
  const swordPivot = new THREE.Group();
  swordPivot.position.set(0.42, 0.35, 0.05); // 오른손 위치
  avatar.add(swordPivot);
  const bladeGeo = new THREE.BoxGeometry(0.1, 0.1, 1.5);
  const bladeMat = new THREE.MeshStandardMaterial({
    color: '#dfe9f2', metalness: 0.75, roughness: 0.22, emissive: '#26333d', emissiveIntensity: 0.35
  });
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  blade.position.set(0, 0, 0.78);
  swordPivot.add(blade);
  const hiltGeo = new THREE.BoxGeometry(0.36, 0.1, 0.1); // 가드
  const hiltMat = new THREE.MeshStandardMaterial({ color: '#9a7636', metalness: 0.5, roughness: 0.5 });
  const guard = new THREE.Mesh(hiltGeo, hiltMat);
  guard.position.set(0, 0, 0.04);
  swordPivot.add(guard);
  const gripGeo = new THREE.BoxGeometry(0.09, 0.09, 0.32);
  const grip = new THREE.Mesh(gripGeo, hiltMat);
  grip.position.set(0, 0, -0.16);
  swordPivot.add(grip);
  track(bladeGeo, bladeMat);
  track(hiltGeo, hiltMat);
  track(gripGeo, null);
  // 검 자세: p<0 이면 대기, 0..1 이면 스윙 진행
  const poseSword = (p) => {
    if (p < 0) {
      swordPivot.rotation.set(-0.15, -0.55, 0.12); // 오른쪽으로 내린 대기 자세
      return;
    }
    const yaw = 1.15 - 2.7 * p; // 오른쪽 뒤 → 왼쪽 앞으로 횡베기
    const pitch = -0.2 - Math.sin(p * Math.PI) * 0.7; // 중간에 아래로 찍는 호
    swordPivot.rotation.set(pitch, yaw, 0.12);
  };
  poseSword(-1);

  // ── 적 ─────────────────────────────────────────────────
  const enemyGeo = new THREE.BoxGeometry(0.9, 1.1, 0.9);
  const enemyMat = new THREE.MeshStandardMaterial({
    color: '#ff5468', roughness: 0.55, metalness: 0.05, emissive: '#5a0e18', emissiveIntensity: 0.55
  });
  const enemyDeadMat = new THREE.MeshStandardMaterial({
    color: '#ffb070', roughness: 0.7, metalness: 0.05, emissive: '#3a1e08', emissiveIntensity: 0.3
  });
  track(enemyGeo, enemyMat);
  track(null, enemyDeadMat);
  const enemies = []; // { body, mesh, dead, deadT }

  const spawnEnemy = () => {
    const ang = Math.random() * Math.PI * 2;
    const rad = 6 + Math.random() * (ARENA - 9);
    const mesh = new THREE.Mesh(enemyGeo, enemyMat);
    scene.add(mesh);
    const body = new CANNON.Body({ mass: 1.2, material: bodyMat });
    body.addShape(new CANNON.Box(new CANNON.Vec3(0.45, 0.55, 0.45)));
    body.position.set(Math.cos(ang) * rad, 1.1, Math.sin(ang) * rad);
    body.fixedRotation = true;
    body.updateMassProperties();
    body.linearDamping = 0.01;
    world.addBody(body);
    enemies.push({ body, mesh, dead: false, deadT: 0 });
  };

  // ── 입력 ───────────────────────────────────────────────
  const keys = new Set();
  let runHeld = false;
  let prevJump = false;
  let prevAttack = false;
  let jumpQueuedAt = -1;
  let attackTime = -1; // -1 = 대기, 0..ATTACK_DUR = 스윙 중
  const hitSet = new Set(); // 이번 스윙에서 이미 맞은 적 (중복 타격 방지)
  let facingYaw = Math.PI;

  const startAttack = () => {
    if (attackTime < 0) {
      attackTime = 0;
      hitSet.clear();
    }
  };

  const onKeyDown = (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') runHeld = true;
    keys.add(e.code);
  };
  const onKeyUp = (e) => {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') runHeld = false;
    keys.delete(e.code);
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // ── 카메라 (3인칭 궤도 + 추적) ─────────────────────────
  const cam = { dist: 13, yaw: Math.PI, pitch: 0.5 };
  const camTarget = new THREE.Vector3(SPAWN.x, SPAWN.y + 1, SPAWN.z);
  const el = renderer.domElement;
  let dragging = false;
  let lx = 0;
  let ly = 0;
  const onDown = (e) => {
    dragging = true;
    lx = e.clientX;
    ly = e.clientY;
  };
  const onMove = (e) => {
    if (!dragging) return;
    cam.yaw -= (e.clientX - lx) * 0.006;
    cam.pitch = Math.max(0.08, Math.min(1.25, cam.pitch - (e.clientY - ly) * 0.005));
    lx = e.clientX;
    ly = e.clientY;
  };
  const onUp = () => {
    dragging = false;
  };
  const onWheel = (e) => {
    e.preventDefault();
    cam.dist = Math.max(6, Math.min(28, cam.dist + e.deltaY * 0.02));
  };
  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  el.addEventListener('wheel', onWheel, { passive: false });

  // ── 접지 판정용 레이캐스트 ─────────────────────────────
  const rayFrom = new CANNON.Vec3();
  const rayTo = new CANNON.Vec3();
  const rayResult = new CANNON.RaycastResult();
  const isGrounded = () => {
    rayFrom.set(charBody.position.x, charBody.position.y, charBody.position.z);
    rayTo.set(charBody.position.x, charBody.position.y - (BODY_R + 0.25), charBody.position.z);
    rayResult.reset();
    world.raycastClosest(rayFrom, rayTo, { skipBackfaces: true, collisionFilterMask: -1 }, rayResult);
    return rayResult.hasHit && charBody.velocity.y <= 0.5;
  };

  // ── 통계 / 루프 ────────────────────────────────────────
  const stats = { fps: 60, frameMs: 16.7, speed: 0, vy: 0, grounded: true, jumps: 0, maxSpeed: 0, enemies: 0, kills: 0 };
  let emaMs = 16.7;
  let lastT = null;
  let paused = false;
  let raf = 0;
  let accumulator = 0;
  const STEP = 1 / 60;

  let jumpsUsed = 0;
  let timeSinceGround = 999;

  // three / cannon 임시 벡터
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const moveDir = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  const readMoveInput = () => {
    let f = 0;
    let s = 0;
    keys.forEach((code) => {
      const ax = KEY_AXIS[code];
      if (ax === 'f') f += 1;
      else if (ax === 'b') f -= 1;
      else if (ax === 'r') s += 1;
      else if (ax === 'l') s -= 1;
    });
    return { f, s };
  };

  const step = (dt) => {
    // 카메라 기준 전/우 방향 (지면 평면에 투영)
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    right.crossVectors(fwd, UP).normalize();

    const { f, s } = readMoveInput();
    moveDir.set(0, 0, 0).addScaledVector(fwd, f).addScaledVector(right, s);
    const moving = moveDir.lengthSq() > 0.0001;
    if (moving) moveDir.normalize();

    const grounded = isGrounded();
    if (grounded) {
      jumpsUsed = 0;
      timeSinceGround = 0;
    } else {
      timeSinceGround += dt;
    }

    // 목표 수평 속도
    const speedTarget = cfg.moveSpeed * (runHeld ? cfg.runMult : 1);
    const desiredVx = moving ? moveDir.x * speedTarget : 0;
    const desiredVz = moving ? moveDir.z * speedTarget : 0;

    // 가속/감속: 지상은 cfg.accel, 공중은 airControl 비율
    const control = grounded ? cfg.accel : cfg.accel * cfg.airControl;
    const k = 1 - Math.exp(-control * dt); // 프레임 독립 보간
    charBody.velocity.x += (desiredVx - charBody.velocity.x) * k;
    charBody.velocity.z += (desiredVz - charBody.velocity.z) * k;

    // 점프 (코요테 타임 + 점프 버퍼 + 다단 점프)
    if (jumpQueuedAt >= 0) {
      const coyoteOk = timeSinceGround <= cfg.coyote;
      // 첫 점프: 지면 위 또는 코요테 유예 안 / 공중 추가 점프: 남은 점프 횟수
      const canFirst = (grounded || coyoteOk) && jumpsUsed === 0;
      const canExtra = jumpsUsed >= 1 && jumpsUsed < cfg.maxJumps;
      // 코요테도 지나 떨어지는 중이면 첫 입력은 더블점프 1회를 소모
      const canFallDouble = !grounded && !coyoteOk && jumpsUsed === 0 && cfg.maxJumps > 1;
      if (canFirst || canExtra || canFallDouble) {
        charBody.velocity.y = jumpSpeed;
        jumpsUsed = canFallDouble ? 2 : jumpsUsed + 1;
        timeSinceGround = 999;
        jumpQueuedAt = -1;
      } else {
        jumpQueuedAt += dt;
        if (jumpQueuedAt > cfg.buffer) jumpQueuedAt = -1; // 버퍼 만료
      }
    }

    stats.grounded = grounded;
    stats.jumps = jumpsUsed;

    // 진행 방향으로 아바타 회전 (정지 중엔 마지막 방향 유지)
    if (moving) {
      facingYaw = Math.atan2(moveDir.x, moveDir.z);
    }

    // 적: 플레이어를 향해 수평 이동 (사망한 적은 물리에 맡김)
    const px = charBody.position.x;
    const pz = charBody.position.z;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.dead) {
        e.deadT += dt;
        continue;
      }
      const dx = px - e.body.position.x;
      const dz = pz - e.body.position.z;
      const d = Math.hypot(dx, dz) || 1;
      e.body.velocity.x = (dx / d) * ENEMY_SPEED;
      e.body.velocity.z = (dz / d) * ENEMY_SPEED;
    }

    // 검 스윙 + 히트 판정
    if (attackTime >= 0) {
      attackTime += dt;
      const p = attackTime / ATTACK_DUR;
      poseSword(Math.min(p, 1));
      // 액티브 윈도우(중반)에서만 정면 콘 안의 적을 벤다
      if (p >= 0.18 && p <= 0.62) {
        const fx = Math.sin(facingYaw);
        const fz = Math.cos(facingYaw);
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          if (e.dead || hitSet.has(e)) continue;
          const dx = e.body.position.x - px;
          const dz = e.body.position.z - pz;
          const dist = Math.hypot(dx, dz);
          if (dist > ATTACK_RANGE) continue;
          const facingDot = (dx * fx + dz * fz) / (dist || 1);
          if (facingDot < ATTACK_ARC) continue;
          // 명중 — 넉백 + 회전 + 사망 표시
          hitSet.add(e);
          e.dead = true;
          e.deadT = 0;
          e.mesh.material = enemyDeadMat;
          e.body.fixedRotation = false;
          e.body.updateMassProperties();
          const inv = 1 / (dist || 1);
          e.body.applyImpulse(new CANNON.Vec3(dx * inv * 9, 6.5, dz * inv * 9), e.body.position);
          e.body.angularVelocity.set(
            (Math.random() - 0.5) * 9,
            (Math.random() - 0.5) * 9,
            (Math.random() - 0.5) * 9
          );
          stats.kills += 1;
        }
      }
      if (attackTime > ATTACK_DUR) {
        attackTime = -1;
        hitSet.clear();
        poseSword(-1);
      }
    }
  };

  const loop = () => {
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    if (lastT != null) {
      const d = Math.min(now - lastT, 1000);
      emaMs = emaMs * 0.9 + d * 0.1;
    }
    lastT = now;
    stats.fps = 1000 / emaMs;
    stats.frameMs = emaMs;

    if (!paused) {
      // 점프 라이징 엣지 → 버퍼 시작
      const jumpNow = keys.has('Space');
      if (jumpNow && !prevJump) jumpQueuedAt = 0;
      prevJump = jumpNow;

      // 공격 라이징 엣지 → 스윙 시작
      const attackNow = keys.has('KeyJ');
      if (attackNow && !prevAttack) startAttack();
      prevAttack = attackNow;

      let dt = Math.min(emaMs / 1000, 0.05);
      accumulator += dt;
      while (accumulator >= STEP) {
        step(STEP);
        world.step(STEP);
        accumulator -= STEP;
      }

      // 추락 → 리스폰
      if (charBody.position.y < -15) doRespawn();

      // 적 메시 동기화 + 사망/추락 적 정리
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if ((e.dead && e.deadT > 0.7) || e.body.position.y < -15) {
          world.removeBody(e.body);
          scene.remove(e.mesh);
          enemies.splice(i, 1);
          continue;
        }
        e.mesh.position.copy(e.body.position);
        e.mesh.quaternion.copy(e.body.quaternion);
      }
      stats.enemies = enemies.length;

      // 메시 동기화
      avatar.position.copy(charBody.position);
      avatar.rotation.y += (facingYaw - avatar.rotation.y) * 0.2;
      ring.position.set(charBody.position.x, 0.05, charBody.position.z);
      ringMat.color.set(stats.grounded ? '#36e27a' : '#ffc24b');

      const vh = Math.hypot(charBody.velocity.x, charBody.velocity.z);
      stats.speed = vh;
      stats.vy = charBody.velocity.y;
      if (vh > stats.maxSpeed) stats.maxSpeed = vh;

      if (velArrow.visible) {
        velArrow.position.set(charBody.position.x, charBody.position.y, charBody.position.z);
        if (vh > 0.05) {
          velArrow.setDirection(new THREE.Vector3(charBody.velocity.x, 0, charBody.velocity.z).normalize());
          velArrow.setLength(Math.min(vh * 0.4, 6), 0.4, 0.25);
        }
      }
    }

    // 카메라 추적
    camTarget.lerp(new THREE.Vector3(charBody.position.x, charBody.position.y + 1, charBody.position.z), 0.12);
    camera.position.set(
      camTarget.x + cam.dist * Math.cos(cam.pitch) * Math.sin(cam.yaw),
      camTarget.y + cam.dist * Math.sin(cam.pitch),
      camTarget.z + cam.dist * Math.cos(cam.pitch) * Math.cos(cam.yaw)
    );
    camera.lookAt(camTarget);

    renderer.render(scene, camera);
  };

  function doRespawn() {
    charBody.position.copy(SPAWN);
    charBody.velocity.set(0, 0, 0);
    charBody.angularVelocity.set(0, 0, 0);
    jumpsUsed = 0;
    timeSinceGround = 999;
    stats.maxSpeed = 0;
  }

  loop();

  return {
    stats,
    setConfig(patch) {
      Object.assign(cfg, patch);
      if ('gravity' in patch) world.gravity.set(0, -cfg.gravity, 0);
      if ('gravity' in patch || 'jumpHeight' in patch) {
        jumpSpeed = Math.sqrt(2 * cfg.gravity * cfg.jumpHeight);
      }
    },
    respawn: doRespawn,
    setPaused(p) {
      paused = p;
    },
    setVelVisible(on) {
      velArrow.visible = on;
    },
    // 터치/가상 입력
    setVirtual(axis, down) {
      const code = { f: 'KeyW', b: 'KeyS', l: 'KeyA', r: 'KeyD' }[axis];
      if (!code) return;
      if (down) keys.add(code);
      else keys.delete(code);
    },
    setRun(down) {
      runHeld = down;
    },
    pressJump() {
      jumpQueuedAt = 0;
    },
    pressAttack() {
      startAttack();
    },
    addEnemies(n) {
      const room = MAX_ENEMIES - enemies.length;
      const count = Math.max(0, Math.min(n, room));
      for (let i = 0; i < count; i++) spawnEnemy();
      stats.enemies = enemies.length;
    },
    clearEnemies() {
      for (let i = enemies.length - 1; i >= 0; i--) {
        world.removeBody(enemies[i].body);
        scene.remove(enemies[i].mesh);
      }
      enemies.length = 0;
      stats.enemies = 0;
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
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('wheel', onWheel);
      for (let i = enemies.length - 1; i >= 0; i--) {
        world.removeBody(enemies[i].body);
        scene.remove(enemies[i].mesh);
      }
      enemies.length = 0;
      grid.geometry.dispose();
      grid.material.dispose();
      disposables.forEach((d) => d.dispose && d.dispose());
      renderer.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
    }
  };
}

// ---------------------------------------------------------------------------
// 속도 오실로스코프
// ---------------------------------------------------------------------------
const SCOPE_W = 300;
const SCOPE_H = 56;
const SCOPE_MAX = 75;
const scopeY = (v) => SCOPE_H - (Math.min(Math.max(v, 0), SCOPE_MAX) / SCOPE_MAX) * SCOPE_H;

function renderScope(history) {
  const xAt = (i) => (i / Math.max(history.length - 1, 1)) * SCOPE_W;
  const line =
    history.length >= 2 ? history.map((v, i) => `${xAt(i).toFixed(1)},${scopeY(v).toFixed(1)}`).join(' ') : '';
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

// 슬라이더 한 줄
const Slider = ({ label, value, min, max, step, suffix, onChange }) => (
  <div className="bp-field">
    <span className="bp-field-row">
      <span>{label}</span>
      <b>
        {value.toFixed(step < 0.1 ? 2 : value % 1 === 0 ? 0 : 1)}
        {suffix}
      </b>
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  </div>
);
Slider.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  step: PropTypes.number.isRequired,
  suffix: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
};

// ---------------------------------------------------------------------------
// 페이지
// ---------------------------------------------------------------------------
const MovementLab = () => {
  const viewportRef = useRef(null);
  const stageRef = useRef(null);
  const ctrlRef = useRef(null);

  const [cfg, setCfg] = useState({ ...DEFAULT_CFG });
  const [paused, setPaused] = useState(false);
  const [showVel, setShowVel] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [preset, setPreset] = useState('platformer');
  const [ui, setUi] = useState({ fps: 60, frameMs: 16.7, speed: 0, vy: 0, grounded: true, jumps: 0, maxSpeed: 0, enemies: 0, kills: 0 });
  const [history, setHistory] = useState([]);

  // 컨트롤러 1회 생성
  useEffect(() => {
    const vp = viewportRef.current;
    const stage = stageRef.current;
    if (!vp || !stage) return undefined;
    stage.innerHTML = '';
    const w = Math.max(1, vp.clientWidth);
    const h = Math.max(1, vp.clientHeight);
    const ctrl = createMovementLab(stage, { width: w, height: h });
    ctrlRef.current = ctrl;
    ctrl.setConfig(DEFAULT_CFG);
    return () => {
      ctrl.destroy();
      ctrlRef.current = null;
    };
  }, []);

  // 리사이즈
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

  // 통계 폴링
  useEffect(() => {
    const id = setInterval(() => {
      const c = ctrlRef.current;
      if (!c) return;
      const s = c.stats;
      setUi({ fps: s.fps, frameMs: s.frameMs, speed: s.speed, vy: s.vy, grounded: s.grounded, jumps: s.jumps, maxSpeed: s.maxSpeed, enemies: s.enemies, kills: s.kills });
      setHistory((prev) => {
        const next = prev.concat(Math.max(0, s.fps));
        return next.length > 90 ? next.slice(next.length - 90) : next;
      });
    }, 120);
    return () => clearInterval(id);
  }, []);

  const apply = (patch) => {
    setCfg((prev) => {
      const next = { ...prev, ...patch };
      if (ctrlRef.current) ctrlRef.current.setConfig(patch);
      return next;
    });
    setPreset('custom');
  };

  const applyPreset = (key) => {
    const p = PRESETS[key];
    if (!p) return;
    setCfg({ ...p.cfg });
    setPreset(key);
    if (ctrlRef.current) ctrlRef.current.setConfig(p.cfg);
  };

  const togglePause = () => {
    setPaused((p) => {
      const next = !p;
      if (ctrlRef.current) ctrlRef.current.setPaused(next);
      return next;
    });
  };
  const toggleVel = () => {
    setShowVel((v) => {
      const next = !v;
      if (ctrlRef.current) ctrlRef.current.setVelVisible(next);
      return next;
    });
  };
  const respawn = () => {
    if (ctrlRef.current) ctrlRef.current.respawn();
  };
  const addEnemies = (n) => {
    if (ctrlRef.current) ctrlRef.current.addEnemies(n);
  };
  const clearEnemies = () => {
    if (ctrlRef.current) ctrlRef.current.clearEnemies();
  };

  // 터치 입력 바인딩
  const touchAxis = (axis) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      if (ctrlRef.current) ctrlRef.current.setVirtual(axis, true);
    },
    onPointerUp: () => ctrlRef.current && ctrlRef.current.setVirtual(axis, false),
    onPointerLeave: () => ctrlRef.current && ctrlRef.current.setVirtual(axis, false),
    onPointerCancel: () => ctrlRef.current && ctrlRef.current.setVirtual(axis, false)
  });

  const health = ui.fps >= 50 ? 'ok' : ui.fps >= 30 ? 'warn' : 'crit';
  const fpsLabel = health === 'ok' ? 'SMOOTH' : health === 'warn' ? 'STRAINED' : 'STUTTER';
  const stateLabel = ui.grounded ? 'GROUNDED' : 'AIRBORNE';
  const budgetPct = Math.min(100, (ui.frameMs / 33.4) * 100);
  const enemyCapReached = ui.enemies >= MAX_ENEMIES;

  return (
    <div className="bp-bench" data-health={health}>
      <div className="bp-tool">
        <header className="bp-rail">
          <Link to="/" className="bp-exit">◂ EXIT</Link>
          <div className="bp-id">
            <span className="bp-id-name">MOVEMENT&nbsp;LAB</span>
            <span className="bp-id-desc">character controller test bench</span>
          </div>
          <button
            type="button"
            className={`bp-params-toggle ${drawerOpen ? 'on' : ''}`}
            onClick={() => setDrawerOpen((o) => !o)}
            aria-pressed={drawerOpen}
          >
            ⚙ TUNING
          </button>
          <div className="bp-engine ml-presets" role="group" aria-label="손맛 프리셋">
            {Object.entries(PRESETS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                className={`bp-engine-btn ${preset === key ? 'on' : ''}`}
                onClick={() => applyPreset(key)}
                aria-pressed={preset === key}
              >
                <b>{p.label}</b>
                <span>preset</span>
              </button>
            ))}
          </div>
        </header>

        <div className="bp-viewport" ref={viewportRef}>
          <div className="bp-stage" ref={stageRef} />
          <div className="bp-scanlines" aria-hidden="true" />

          {/* 좌상단: 성능 텔레메트리 (FPS · 프레임타임) */}
          <div className="bp-hud bp-hud-tl">
            <div className="bp-fps-block">
              <span className="bp-fps-val">{Math.round(ui.fps)}</span>
              <span className="bp-fps-side">
                <span className="bp-fps-unit">FPS</span>
                <span className="bp-fps-state">{fpsLabel}</span>
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

          {/* 우상단: 전투 + 무브먼트 지표 (작게) */}
          <div className="bp-hud bp-hud-tr">
            <div className="bp-count">
              <span className="bp-count-val">{ui.enemies}</span>
              <span className="bp-count-label">ENEMIES&nbsp;·&nbsp;KILL&nbsp;{ui.kills}</span>
            </div>
            <div className="ml-readout">
              <div className="ml-readout-row"><span>SPEED</span><b>{ui.speed.toFixed(1)} m/s</b></div>
              <div className="ml-readout-row"><span>STATE</span><b>{stateLabel}</b></div>
              <div className="ml-readout-row"><span>VERTICAL</span><b>{ui.vy >= 0 ? '+' : ''}{ui.vy.toFixed(1)}</b></div>
              <div className="ml-readout-row"><span>MAX SPEED</span><b>{ui.maxSpeed.toFixed(1)}</b></div>
              <div className="ml-readout-row"><span>JUMPS</span><b>{ui.jumps}/{cfg.maxJumps}</b></div>
            </div>
          </div>

          {/* 좌하단: 조작 힌트 */}
          <div className="bp-hud bp-hud-bl">
            <span className="bp-rec" data-paused={paused} />
            <span className="ml-keys">
              <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 이동
              <kbd className="ml-wide">SPACE</kbd> 점프
              <kbd className="ml-wide">SHIFT</kbd> 달리기
              <kbd>J</kbd> 공격
              <span className="ml-keys-sep">· 드래그 회전 · 휠 줌</span>
            </span>
          </div>

          {/* 모바일 터치 컨트롤 */}
          <div className="ml-touch ml-touch-move" aria-hidden="true">
            <button type="button" className="ml-pad ml-pad-f" {...touchAxis('f')}>▲</button>
            <button type="button" className="ml-pad ml-pad-l" {...touchAxis('l')}>◀</button>
            <button type="button" className="ml-pad ml-pad-r" {...touchAxis('r')}>▶</button>
            <button type="button" className="ml-pad ml-pad-b" {...touchAxis('b')}>▼</button>
          </div>
          <div className="ml-touch ml-touch-act" aria-hidden="true">
            <button
              type="button"
              className="ml-attack"
              onPointerDown={(e) => { e.preventDefault(); if (ctrlRef.current) ctrlRef.current.pressAttack(); }}
            >
              ⚔
            </button>
            <button
              type="button"
              className="ml-jump"
              onPointerDown={(e) => { e.preventDefault(); if (ctrlRef.current) ctrlRef.current.pressJump(); }}
            >
              JUMP
            </button>
          </div>

          {/* 튜닝 드로어 */}
          <aside className={`bp-drawer ${drawerOpen ? 'open' : ''}`} aria-hidden={!drawerOpen}>
            <div className="bp-drawer-head">
              <span>MOVEMENT&nbsp;TUNING</span>
              <button type="button" className="bp-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="패널 닫기">✕</button>
            </div>

            <div className="bp-sec">
              <span className="bp-sec-title">이동 · LOCOMOTION</span>
              <Slider label="이동 속도" value={cfg.moveSpeed} min={1} max={12} step={0.5} suffix=" m/s" onChange={(v) => apply({ moveSpeed: v })} />
              <Slider label="달리기 배수" value={cfg.runMult} min={1} max={2.5} step={0.1} suffix="x" onChange={(v) => apply({ runMult: v })} />
              <Slider label="가속 (반응성)" value={cfg.accel} min={2} max={30} step={1} suffix="" onChange={(v) => apply({ accel: v })} />
              <Slider label="공중 제어" value={cfg.airControl} min={0} max={1} step={0.05} suffix="" onChange={(v) => apply({ airControl: v })} />
            </div>

            <div className="bp-sec">
              <span className="bp-sec-title">점프 · JUMP</span>
              <Slider label="점프 높이" value={cfg.jumpHeight} min={0.5} max={4} step={0.1} suffix=" m" onChange={(v) => apply({ jumpHeight: v })} />
              <Slider label="중력" value={cfg.gravity} min={5} max={32} step={1} suffix=" m/s²" onChange={(v) => apply({ gravity: v })} />
              <span className="bp-sec-title" style={{ marginTop: '0.6rem' }}>다단 점프</span>
              <div className="bp-chiprow">
                {[1, 2, 3].map((n) => (
                  <button key={n} type="button" className={`bp-chip ${cfg.maxJumps === n ? 'on' : ''}`} onClick={() => apply({ maxJumps: n })}>
                    {n === 1 ? '단일' : n === 2 ? '더블' : '트리플'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bp-sec">
              <span className="bp-sec-title">손맛 · GAME FEEL</span>
              <Slider label="코요테 타임" value={cfg.coyote * 1000} min={0} max={300} step={10} suffix=" ms" onChange={(v) => apply({ coyote: v / 1000 })} />
              <Slider label="점프 버퍼" value={cfg.buffer * 1000} min={0} max={300} step={10} suffix=" ms" onChange={(v) => apply({ buffer: v / 1000 })} />
              <p className="bp-sec-note">
                코요테 타임: 발판을 벗어난 직후에도 잠깐 점프 허용 · 점프 버퍼: 착지 직전에 누른 점프를 기억
              </p>
            </div>

            <div className="bp-sec">
              <span className="bp-sec-title">관측 · INSPECT</span>
              <div className="bp-chiprow">
                <button type="button" className={`bp-chip ${showVel ? 'on' : ''}`} onClick={toggleVel}>속도 벡터</button>
              </div>
            </div>
          </aside>
        </div>

        <footer className="bp-dock">
          <div className="bp-dock-group">
            <span className="bp-dock-label">SPEED</span>
            <input
              type="range"
              min="1"
              max="12"
              step="0.5"
              value={cfg.moveSpeed}
              aria-label="이동 속도"
              onChange={(e) => apply({ moveSpeed: parseFloat(e.target.value) })}
              style={{ width: 160, accentColor: 'var(--trace)' }}
            />
            <span className="bp-grav-val">{cfg.moveSpeed.toFixed(1)} m/s</span>
          </div>

          <div className="bp-dock-group">
            <span className="bp-dock-label">JUMP</span>
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.1"
              value={cfg.jumpHeight}
              aria-label="점프 높이"
              onChange={(e) => apply({ jumpHeight: parseFloat(e.target.value) })}
              style={{ width: 140, accentColor: 'var(--trace)' }}
            />
            <span className="bp-grav-val">{cfg.jumpHeight.toFixed(1)} m</span>
          </div>

          <div className="bp-dock-group">
            <span className="bp-dock-label">ENEMIES</span>
            <div className="bp-btns">
              {ENEMY_STEPS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="bp-btn bp-btn-load"
                  disabled={enemyCapReached}
                  onClick={() => addEnemies(n)}
                >
                  +{n}
                </button>
              ))}
              <button type="button" className="bp-btn bp-btn-ghost" onClick={clearEnemies}>
                정리
              </button>
            </div>
          </div>

          <div className="bp-dock-group bp-dock-actions">
            <button type="button" className="bp-btn" onClick={togglePause}>
              {paused ? '▶ RUN' : '❚❚ HOLD'}
            </button>
            <button type="button" className="bp-btn bp-btn-purge" onClick={respawn}>
              ↻ RESPAWN
            </button>
          </div>
        </footer>

        {enemyCapReached && (
          <div className="bp-cap">적 상한 {MAX_ENEMIES.toLocaleString()}에 도달했습니다 — 정리로 비우세요.</div>
        )}
      </div>

      <section className="bp-notes">
        <h2 className="bp-notes-title">{"움직임이 '손맛'이 되는 순간"}</h2>
        <p>
          {'게임 캐릭터의 움직임은 물리 엔진에 그냥 맡기지 않는다. 현실의 마찰·관성을 그대로 쓰면 '}
          {'조작이 미끄럽고 둔하게 느껴지기 때문이다. 그래서 대부분의 게임은 '}
          <b>수평 속도를 코드가 직접 제어</b>{'한다 — 이 실험실도 입력을 받으면 목표 속도를 정하고 '}
          <b>가속(반응성)</b>{' 값으로 그 속도까지 끌어올린다. 가속을 높이면 칼같이 멈추는 플랫포머 감각이, '}
          {'낮추면 얼음판 위를 미끄러지는 감각이 난다.'}
        </p>
        <p>
          {'점프는 '}<b>점프 높이</b>{'와 '}<b>중력</b>{'으로 정해진다. 점프 속도는 v = √(2·g·h)로 계산되므로, '}
          {'같은 높이라도 중력이 세면 더 빠르게 솟구쳤다 떨어져 '}<b>스냅감</b>{'이 살고, 중력이 약하면 '}
          {'달에서처럼 둥실 떠오른다. '}<b>공중 제어</b>{'는 공중에서 방향을 얼마나 바꿀 수 있는지를 정한다 — '}
          {'0이면 점프 궤적이 고정, 1이면 공중에서도 지상처럼 자유롭게 움직인다.'}
        </p>
        <p>
          {'진짜 차이를 만드는 건 두 가지 작은 장치다. '}<b>코요테 타임</b>{'은 발판 끝을 살짝 지나친 뒤에도 '}
          {'몇 십 밀리초 동안 점프를 허용해, "분명 눌렀는데 안 뛰었어"를 없앤다. '}<b>점프 버퍼</b>{'는 착지 '}
          {'직전에 누른 점프를 기억해 두었다가 닿는 순간 실행한다. 둘 다 0으로 내려 보면 갑자기 조작이 '}
          {'"빡빡하게" 느껴지는데, 그 미세한 관용이 바로 좋은 손맛의 정체다.'}
        </p>
        <p>
          {'⚙ TUNING 패널에서 값을 바꿔가며 계단을 오르고, 경사로를 뛰고, 공중 발판 사이를 건너 보자. '}
          {'더블 점프를 켜면 닿지 않던 높은 발판에 오를 수 있고, 공중 제어를 0으로 내리면 같은 점프도 '}
          {'완전히 다른 게임처럼 느껴진다.'}
        </p>
        <p>
          {'하단 '}<b>ENEMIES</b>{' 버튼으로 적을 쏟아붓고 '}<kbd className="ml-kbd-inline">J</kbd>{' 키로 검을 휘둘러 보자. '}
          {'적은 매 프레임 플레이어를 향해 다가오고(추적 연산), 검은 정면 '}<b>콘(부채꼴) 범위</b>{' 안의 적만 '}
          {'베어 넉백시킨다 — 정밀한 칼날 충돌 대신 거리·각도 판정을 쓰는 건, 적이 수백이어도 버티게 하려는 '}
          {'게임의 전형적인 타협이다. 적이 늘수록 '}<b>물리 바디 수·충돌 검사·추적 루프·드로우콜</b>{'이 함께 '}
          {'불어나 좌측 '}<b>FPS 계기판</b>{'이 60 → 30으로 무너지는 지점이 보인다. 타격하면서 그 그래프가 '}
          {'어디서 꺾이는지를 실시간으로 지켜보는 것이 이 모드의 핵심이다.'}
        </p>
        <p className="bp-notes-dim">
          {'* 캐릭터·적 충돌은 단순화를 위해 각각 구(sphere)·박스로 처리됩니다. FPS는 기기 성능에 따라 다르며, '}
          {'한계점은 절대값이 아니라 이 페이지를 여는 기기의 상대적 부하 한계입니다.'}
        </p>
      </section>
    </div>
  );
};

export default MovementLab;
