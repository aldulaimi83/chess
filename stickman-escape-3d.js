(function () {
  'use strict';

  const SAVE_KEY = 'youooo_stickman_escape_3d_v1';
  const COIN_TOTAL = 12;
  const world = { startX: -18, endX: 36, floorY: 0 };
  const state = {
    started: false,
    complete: false,
    deaths: 0,
    coins: 0,
    startTime: 0,
    elapsed: 0,
    velocityY: 0,
    grounded: false,
    keys: { left: false, right: false, jump: false },
    jumpQueued: false,
    collected: new Set(),
    bestTime: null,
    bestCoins: 0
  };

  const ui = {
    canvas: document.getElementById('escape3dCanvas'),
    viewport: document.getElementById('gameViewport'),
    startOverlay: document.getElementById('startOverlay'),
    completeOverlay: document.getElementById('completeOverlay'),
    startButton: document.getElementById('startButton'),
    playAgainButton: document.getElementById('playAgainButton'),
    resetButton: document.getElementById('resetButton'),
    coinReadout: document.getElementById('coinReadout'),
    deathReadout: document.getElementById('deathReadout'),
    timeReadout: document.getElementById('timeReadout'),
    bestReadout: document.getElementById('bestReadout'),
    bestCoinReadout: document.getElementById('bestCoinReadout'),
    finalStats: document.getElementById('finalStats'),
    loadError: document.getElementById('loadError'),
    leftButton: document.getElementById('leftButton'),
    rightButton: document.getElementById('rightButton'),
    jumpButton: document.getElementById('jumpButton')
  };

  let THREE_REF = window.THREE;
  let renderer;
  let scene;
  let camera;
  let clock;
  let player;
  let portal;
  let sunMoon;
  let animationFrame = 0;
  const platforms = [];
  const coins = [];
  const spikes = [];
  const movers = [];
  const decorative = [];

  function showLoadError(message) {
    ui.loadError.textContent = message;
    ui.loadError.style.display = 'block';
  }

  function loadSave() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      state.bestTime = typeof saved.bestTime === 'number' ? saved.bestTime : null;
      state.bestCoins = typeof saved.bestCoins === 'number' ? saved.bestCoins : 0;
    } catch (error) {
      state.bestTime = null;
      state.bestCoins = 0;
    }
  }

  function saveBest() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        bestTime: state.bestTime,
        bestCoins: state.bestCoins
      }));
    } catch (error) {
      /* localStorage can be unavailable in private browsing; the game still plays. */
    }
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(total / 60).toString().padStart(2, '0');
    const secs = (total % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  function updateHud() {
    ui.coinReadout.textContent = `${state.coins} / ${COIN_TOTAL}`;
    ui.deathReadout.textContent = String(state.deaths);
    ui.timeReadout.textContent = formatTime(state.elapsed);
    ui.bestReadout.textContent = state.bestTime ? formatTime(state.bestTime) : '--';
    ui.bestCoinReadout.textContent = String(state.bestCoins);
  }

  function makeMaterial(color, options) {
    return new THREE_REF.MeshStandardMaterial(Object.assign({
      color,
      roughness: 0.72,
      metalness: 0.04
    }, options || {}));
  }

  function addPlatform(x, z, width, depth, height, color) {
    const geometry = new THREE_REF.BoxGeometry(width, height, depth);
    const mesh = new THREE_REF.Mesh(geometry, makeMaterial(color || 0x284466));
    mesh.position.set(x, height / 2 - 0.1, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.userData.platform = { width, depth, height };
    scene.add(mesh);
    platforms.push(mesh);
    return mesh;
  }

  function addCoin(x, y, z) {
    const group = new THREE_REF.Group();
    const coin = new THREE_REF.Mesh(
      new THREE_REF.CylinderGeometry(0.34, 0.34, 0.08, 24),
      makeMaterial(0xffd85a, { emissive: 0x6b4f00, metalness: 0.25, roughness: 0.35 })
    );
    coin.rotation.x = Math.PI / 2;
    coin.castShadow = true;
    const ring = new THREE_REF.Mesh(
      new THREE_REF.TorusGeometry(0.4, 0.035, 8, 24),
      makeMaterial(0xffffff, { emissive: 0xffd85a, emissiveIntensity: 0.35 })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(coin, ring);
    group.position.set(x, y, z);
    scene.add(group);
    coins.push(group);
  }

  function addSpike(x, z) {
    const spike = new THREE_REF.Mesh(
      new THREE_REF.ConeGeometry(0.45, 1.15, 4),
      makeMaterial(0xff3d76, { emissive: 0x5e0920, roughness: 0.48 })
    );
    spike.position.set(x, 0.52, z);
    spike.rotation.y = Math.PI / 4;
    spike.castShadow = true;
    scene.add(spike);
    spikes.push(spike);
  }

  function createStickman() {
    const group = new THREE_REF.Group();
    const black = makeMaterial(0x020307, { roughness: 0.55 });
    const cyan = makeMaterial(0x38e8ff, { emissive: 0x135b66, emissiveIntensity: 0.4 });

    const head = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(0.36, 24, 16), black);
    head.position.y = 2.28;
    const body = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.16, 0.2, 1.0, 16), black);
    body.position.y = 1.55;
    const chest = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.34, 0.04, 0.26), cyan);
    chest.position.set(0, 1.7, 0.18);

    const yMark = createYMark();
    yMark.position.set(0, 1.73, 0.33);

    group.add(head, body, chest, yMark);
    addLimb(group, black, -0.34, 1.55, 0, -0.82, 1.12, 0, 0.09);
    addLimb(group, black, 0.34, 1.55, 0, 0.82, 1.12, 0, 0.09);
    addLimb(group, black, -0.12, 1.04, 0, -0.48, 0.2, 0, 0.11);
    addLimb(group, black, 0.12, 1.04, 0, 0.48, 0.2, 0, 0.11);
    group.position.set(world.startX, 1.2, 0);
    scene.add(group);
    return group;
  }

  function addLimb(parent, material, x1, y1, z1, x2, y2, z2, radius) {
    const start = new THREE_REF.Vector3(x1, y1, z1);
    const end = new THREE_REF.Vector3(x2, y2, z2);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const direction = end.clone().sub(start);
    const limb = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(radius, radius, direction.length(), 12), material);
    limb.position.copy(mid);
    limb.quaternion.setFromUnitVectors(new THREE_REF.Vector3(0, 1, 0), direction.normalize());
    limb.castShadow = true;
    parent.add(limb);
  }

  function createYMark() {
    const group = new THREE_REF.Group();
    const mat = makeMaterial(0x07111f, { emissive: 0x000000 });
    const stem = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.055, 0.22, 0.035), mat);
    stem.position.y = -0.05;
    const left = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.055, 0.19, 0.035), mat);
    left.position.set(-0.055, 0.075, 0);
    left.rotation.z = -0.55;
    const right = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.055, 0.19, 0.035), mat);
    right.position.set(0.055, 0.075, 0);
    right.rotation.z = 0.55;
    group.add(stem, left, right);
    return group;
  }

  function createPortal() {
    const group = new THREE_REF.Group();
    const ring = new THREE_REF.Mesh(
      new THREE_REF.TorusGeometry(0.85, 0.11, 16, 48),
      makeMaterial(0x38e8ff, { emissive: 0x38e8ff, emissiveIntensity: 0.85 })
    );
    ring.rotation.x = Math.PI / 2;
    const glow = new THREE_REF.PointLight(0x38e8ff, 2.2, 9);
    glow.position.set(0, 1.6, 0);
    const core = new THREE_REF.Mesh(
      new THREE_REF.CircleGeometry(0.72, 48),
      new THREE_REF.MeshBasicMaterial({ color: 0x69f7ff, transparent: true, opacity: 0.25, side: THREE_REF.DoubleSide })
    );
    core.rotation.x = Math.PI / 2;
    group.add(ring, core, glow);
    group.position.set(world.endX, 1.55, 0);
    scene.add(group);
    return group;
  }

  function createTree(x, z, scale) {
    const trunk = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.12 * scale, 0.18 * scale, 1.2 * scale, 8), makeMaterial(0x6f4a2a));
    trunk.position.set(x, 0.55 * scale, z);
    const leaves = new THREE_REF.Mesh(new THREE_REF.ConeGeometry(0.65 * scale, 1.2 * scale, 7), makeMaterial(0x2cc678));
    leaves.position.set(x, 1.45 * scale, z);
    trunk.castShadow = true;
    leaves.castShadow = true;
    scene.add(trunk, leaves);
    decorative.push(trunk, leaves);
  }

  function createCloud(x, y, z, scale) {
    const group = new THREE_REF.Group();
    const mat = new THREE_REF.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.78 });
    [-0.45, 0, 0.45].forEach((offset, index) => {
      const puff = new THREE_REF.Mesh(new THREE_REF.SphereGeometry((index === 1 ? 0.42 : 0.32) * scale, 16, 10), mat);
      puff.position.x = offset * scale;
      group.add(puff);
    });
    group.position.set(x, y, z);
    scene.add(group);
    decorative.push(group);
  }

  function buildWorld() {
    scene.background = new THREE_REF.Color(0x8ed7f3);
    scene.fog = new THREE_REF.Fog(0x8ed7f3, 24, 76);

    const hemi = new THREE_REF.HemisphereLight(0xbfefff, 0x4f3722, 1.6);
    scene.add(hemi);
    const sun = new THREE_REF.DirectionalLight(0xfff2b8, 2.2);
    sun.position.set(-10, 18, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    scene.add(sun);

    sunMoon = new THREE_REF.Mesh(
      new THREE_REF.SphereGeometry(1.8, 32, 18),
      new THREE_REF.MeshBasicMaterial({ color: 0xfff1a6 })
    );
    sunMoon.position.set(-18, 15, -24);
    scene.add(sunMoon);

    addPlatform(-11, 0, 17, 4.8, 0.7, 0x2b4e6e);
    addPlatform(3.8, 0, 7.4, 4.5, 0.7, 0x315d76);
    addPlatform(12.5, 0.2, 7, 4.2, 0.7, 0x2a5368);
    addPlatform(22.8, -0.1, 8.2, 4.6, 0.7, 0x355c72);
    addPlatform(33.8, 0, 8.5, 5, 0.7, 0x294c6d);

    const moving = addPlatform(8.2, 0, 2.8, 3.8, 0.55, 0x3a6f84);
    moving.userData.move = { baseX: 8.2, amplitude: 1.7, speed: 1.2 };
    movers.push(moving);
    const moving2 = addPlatform(18.2, 0, 2.8, 3.6, 0.55, 0x3a6f84);
    moving2.userData.move = { baseX: 18.2, amplitude: 1.25, speed: 1.6 };
    movers.push(moving2);

    for (let i = 0; i < COIN_TOTAL; i += 1) {
      const x = -13 + i * 4.1 + (i % 2 ? 0.55 : -0.35);
      const y = i === 4 || i === 8 ? 2.8 : 1.75;
      const z = i % 3 === 0 ? -0.75 : i % 3 === 1 ? 0 : 0.75;
      addCoin(x, y, z);
    }

    [-4.5, 1.9, 14.8, 25.7, 29.2].forEach((x, index) => addSpike(x, index % 2 ? 0.62 : -0.58));
    [-15, -2, 16, 31].forEach((x, index) => createTree(x, index % 2 ? -2.6 : 2.55, 0.75 + index * 0.05));
    createCloud(-10, 11, -18, 1.4);
    createCloud(6, 12.5, -21, 1);
    createCloud(24, 10.5, -18, 1.15);

    const islandBottom = new THREE_REF.Mesh(
      new THREE_REF.ConeGeometry(22, 7, 7),
      makeMaterial(0x6c5439)
    );
    islandBottom.position.set(9, -4.1, 0);
    islandBottom.rotation.y = Math.PI / 7;
    scene.add(islandBottom);
    decorative.push(islandBottom);

    portal = createPortal();
  }

  function initThree() {
    if (!THREE_REF) {
      showLoadError('Three.js could not load. Please check your connection and refresh.');
      return false;
    }

    renderer = new THREE_REF.WebGLRenderer({ canvas: ui.canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE_REF.PCFSoftShadowMap;

    scene = new THREE_REF.Scene();
    camera = new THREE_REF.PerspectiveCamera(56, 16 / 9, 0.1, 120);
    clock = new THREE_REF.Clock();
    buildWorld();
    player = createStickman();
    resize();
    return true;
  }

  function resize() {
    if (!renderer || !camera) return;
    const rect = ui.viewport.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(260, Math.floor(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function startGame() {
    state.started = true;
    state.complete = false;
    state.deaths = 0;
    state.coins = 0;
    state.elapsed = 0;
    state.velocityY = 0;
    state.grounded = false;
    state.collected.clear();
    coins.forEach((coin) => {
      coin.visible = true;
    });
    resetPlayer();
    state.startTime = performance.now();
    ui.startOverlay.classList.remove('visible');
    ui.completeOverlay.classList.remove('visible');
    document.body.classList.add('playing');
    updateHud();
  }

  function resetPlayer() {
    player.position.set(world.startX, 1.2, 0);
    player.rotation.y = Math.PI / 2;
    state.velocityY = 0;
  }

  function die() {
    state.deaths += 1;
    resetPlayer();
    updateHud();
  }

  function completeLevel() {
    state.complete = true;
    state.started = false;
    document.body.classList.remove('playing');
    if (!state.bestTime || state.elapsed < state.bestTime) state.bestTime = state.elapsed;
    if (state.coins > state.bestCoins) state.bestCoins = state.coins;
    saveBest();
    ui.finalStats.innerHTML = [
      `<span>Time <strong>${formatTime(state.elapsed)}</strong></span>`,
      `<span>Best Time <strong>${state.bestTime ? formatTime(state.bestTime) : '--'}</strong></span>`,
      `<span>Coins <strong>${state.coins} / ${COIN_TOTAL}</strong></span>`,
      `<span>Deaths <strong>${state.deaths}</strong></span>`
    ].join('');
    ui.completeOverlay.classList.add('visible');
    updateHud();
  }

  function getPlatformTopAt(x, z) {
    let top = -Infinity;
    platforms.forEach((platform) => {
      const data = platform.userData.platform;
      const halfW = data.width / 2;
      const halfD = data.depth / 2;
      if (x >= platform.position.x - halfW && x <= platform.position.x + halfW && z >= platform.position.z - halfD && z <= platform.position.z + halfD) {
        top = Math.max(top, platform.position.y + data.height / 2);
      }
    });
    return top;
  }

  function updatePlayer(delta) {
    const move = (state.keys.right ? 1 : 0) - (state.keys.left ? 1 : 0);
    const speed = 7.2;
    player.position.x += move * speed * delta;
    if (move !== 0) player.rotation.y = move > 0 ? Math.PI / 2 : -Math.PI / 2;

    player.position.z += (0 - player.position.z) * Math.min(1, delta * 5);
    state.velocityY -= 18 * delta;

    if (state.jumpQueued && state.grounded) {
      state.velocityY = 8.6;
      state.grounded = false;
    }
    state.jumpQueued = false;

    player.position.y += state.velocityY * delta;
    const top = getPlatformTopAt(player.position.x, player.position.z);
    if (top > -Infinity && player.position.y <= top + 1.2 && state.velocityY <= 0) {
      player.position.y = top + 1.2;
      state.velocityY = 0;
      state.grounded = true;
    } else {
      state.grounded = false;
    }

    if (player.position.y < -8 || Math.abs(player.position.z) > 7) die();
    player.position.x = Math.max(world.startX - 4, Math.min(world.endX + 3, player.position.x));
  }

  function updateObjects(delta, elapsed) {
    movers.forEach((platform) => {
      const motion = platform.userData.move;
      platform.position.x = motion.baseX + Math.sin(elapsed * motion.speed) * motion.amplitude;
    });

    coins.forEach((coin, index) => {
      if (!coin.visible) return;
      coin.rotation.y += delta * 3;
      coin.position.y += Math.sin(elapsed * 3 + index) * 0.004;
      if (player.position.distanceTo(coin.position) < 1.25) {
        coin.visible = false;
        state.collected.add(index);
        state.coins = state.collected.size;
        updateHud();
      }
    });

    spikes.forEach((spike) => {
      spike.rotation.y += delta * 1.6;
      if (player.position.distanceTo(spike.position) < 0.95 && player.position.y < 1.95) die();
    });

    if (portal) {
      portal.rotation.y += delta * 1.3;
      portal.children[0].rotation.z += delta * 2.2;
      if (player.position.distanceTo(portal.position) < 1.55) completeLevel();
    }

    decorative.forEach((item, index) => {
      if (item.type === 'Group') item.position.x += Math.sin(elapsed * 0.2 + index) * 0.002;
    });
  }

  function updateCamera(delta) {
    const targetX = player.position.x - 6;
    const target = new THREE_REF.Vector3(targetX, player.position.y + 5.2, 10.5);
    camera.position.lerp(target, Math.min(1, delta * 4.5));
    camera.lookAt(player.position.x + 2.4, player.position.y + 1.2, 0);
  }

  function tick() {
    animationFrame = requestAnimationFrame(tick);
    if (!renderer || !scene || !camera || !player) return;
    const delta = Math.min(0.033, clock.getDelta());
    const elapsed = clock.elapsedTime;

    if (state.started && !state.complete) {
      state.elapsed = (performance.now() - state.startTime) / 1000;
      updatePlayer(delta);
      updateHud();
    }

    updateObjects(delta, elapsed);
    updateCamera(delta);
    renderer.render(scene, camera);
  }

  function queueJump() {
    state.jumpQueued = true;
  }

  function bindKeyboard() {
    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (['arrowleft', 'arrowright', ' ', 'arrowup', 'a', 'd', 'w'].includes(key)) event.preventDefault();
      if (key === 'arrowleft' || key === 'a') state.keys.left = true;
      if (key === 'arrowright' || key === 'd') state.keys.right = true;
      if (key === ' ' || key === 'arrowup' || key === 'w') queueJump();
    }, { passive: false });

    window.addEventListener('keyup', (event) => {
      const key = event.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') state.keys.left = false;
      if (key === 'arrowright' || key === 'd') state.keys.right = false;
    });
  }

  function bindTouchButton(button, onPress, onRelease) {
    const press = (event) => {
      event.preventDefault();
      button.classList.add('active');
      onPress();
    };
    const release = (event) => {
      if (event) event.preventDefault();
      button.classList.remove('active');
      if (onRelease) onRelease();
    };
    button.addEventListener('touchstart', press, { passive: false });
    button.addEventListener('touchend', release, { passive: false });
    button.addEventListener('touchcancel', release, { passive: false });
    button.addEventListener('mousedown', press);
    button.addEventListener('mouseup', release);
    button.addEventListener('mouseleave', release);
  }

  function bindControls() {
    bindKeyboard();
    bindTouchButton(ui.leftButton, () => { state.keys.left = true; }, () => { state.keys.left = false; });
    bindTouchButton(ui.rightButton, () => { state.keys.right = true; }, () => { state.keys.right = false; });
    bindTouchButton(ui.jumpButton, queueJump);
    ui.viewport.addEventListener('touchmove', (event) => event.preventDefault(), { passive: false });
    ui.startButton.addEventListener('click', startGame);
    ui.playAgainButton.addEventListener('click', startGame);
    ui.resetButton.addEventListener('click', startGame);
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 120));
  }

  function boot() {
    loadSave();
    updateHud();
    bindControls();
    if (!initThree()) return;
    tick();
  }

  window.addEventListener('beforeunload', () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
  });

  boot();
}());
