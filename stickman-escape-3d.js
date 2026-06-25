(function () {
  'use strict';

  const SAVE_KEY = 'youooo_stickman_escape_3d_v2';
  const COIN_TOTAL = 24;
  const world = { startX: -21, endX: 54, floorY: 0 };
  const PLAYER_FOOT_OFFSET = 0.2;
  const controls = {
    maxSpeed: 8.4,
    groundAccel: 48,
    airAccel: 28,
    groundFriction: 34,
    gravity: 28,
    jumpVelocity: 10.2,
    coyoteTime: 0.16,
    jumpBuffer: 0.16,
    terminalVelocity: -26
  };

  const state = {
    started: false,
    complete: false,
    deaths: 0,
    coins: 0,
    startTime: 0,
    elapsed: 0,
    checkpointIndex: 0,
    checkpoint: { x: world.startX, y: 0.9, z: 0, label: 'Start' },
    velocity: { x: 0, y: 0, z: 0 },
    grounded: false,
    onPlatform: null,
    coyote: 0,
    jumpBuffer: 0,
    invincible: 0,
    landingSquash: 0,
    face: 1,
    keys: { left: false, right: false },
    collected: new Set(),
    bestTime: null,
    bestCoins: 0,
    muted: false,
    audioReady: false
  };

  const ui = {
    canvas: document.getElementById('escape3dCanvas'),
    viewport: document.getElementById('gameViewport'),
    startOverlay: document.getElementById('startOverlay'),
    completeOverlay: document.getElementById('completeOverlay'),
    startButton: document.getElementById('startButton'),
    playAgainButton: document.getElementById('playAgainButton'),
    resetButton: document.getElementById('resetButton'),
    muteButton: document.getElementById('muteButton'),
    coinReadout: document.getElementById('coinReadout'),
    deathReadout: document.getElementById('deathReadout'),
    timeReadout: document.getElementById('timeReadout'),
    checkpointReadout: document.getElementById('checkpointReadout'),
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
  let audioContext = null;
  const platforms = [];
  const coins = [];
  const spikes = [];
  const movers = [];
  const checkpoints = [];
  const particles = [];
  const decorative = [];
  let cameraTarget = null;
  let cameraLook = null;

  function showLoadError(message) {
    ui.loadError.textContent = message;
    ui.loadError.style.display = 'block';
  }

  function ensureGameReady() {
    if (renderer && scene && camera && player) return true;
    THREE_REF = window.THREE;
    if (!THREE_REF) {
      showLoadError('The 3D engine did not load yet. Please refresh the page and try again.');
      return false;
    }
    return initThree();
  }

  function loadSave() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      state.bestTime = typeof saved.bestTime === 'number' ? saved.bestTime : null;
      state.bestCoins = typeof saved.bestCoins === 'number' ? saved.bestCoins : 0;
      state.muted = saved.muted === true;
    } catch (error) {
      state.bestTime = null;
      state.bestCoins = 0;
      state.muted = false;
    }
  }

  function saveBest() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        bestTime: state.bestTime,
        bestCoins: state.bestCoins,
        muted: state.muted
      }));
    } catch (error) {
      /* localStorage can be unavailable; gameplay continues. */
    }
  }

  function unlockAudio() {
    if (state.audioReady || state.muted) return;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    audioContext = audioContext || new AudioCtor();
    if (audioContext.state === 'suspended') audioContext.resume();
    state.audioReady = true;
  }

  function playTone(type) {
    if (state.muted) return;
    unlockAudio();
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const master = audioContext.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.14, now + 0.015);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    master.connect(audioContext.destination);

    const patterns = {
      jump: [[260, 0, 0.08], [390, 0.05, 0.12]],
      coin: [[820, 0, 0.08], [1240, 0.07, 0.11]],
      hurt: [[180, 0, 0.1], [85, 0.09, 0.2]],
      checkpoint: [[410, 0, 0.12], [610, 0.12, 0.18]],
      complete: [[520, 0, 0.12], [660, 0.13, 0.14], [880, 0.28, 0.22]],
      button: [[260, 0, 0.04]]
    };
    (patterns[type] || patterns.button).forEach(([freq, delay, duration]) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = type === 'hurt' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      if (type === 'jump') osc.frequency.exponentialRampToValueAtTime(freq * 1.28, now + delay + duration);
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(type === 'coin' ? 0.22 : 0.16, now + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + delay);
      osc.stop(now + delay + duration + 0.03);
    });
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
    ui.checkpointReadout.textContent = state.checkpoint.label;
    ui.bestReadout.textContent = state.bestTime ? formatTime(state.bestTime) : '--';
    ui.bestCoinReadout.textContent = String(state.bestCoins);
    if (ui.muteButton) {
      ui.muteButton.textContent = state.muted ? 'Sound Off' : 'Sound On';
      ui.muteButton.setAttribute('aria-pressed', String(state.muted));
    }
  }

  function makeMaterial(color, options) {
    return new THREE_REF.MeshStandardMaterial(Object.assign({
      color,
      roughness: 0.68,
      metalness: 0.03
    }, options || {}));
  }

  function addPlatform(x, z, width, depth, height, color, y) {
    const geometry = new THREE_REF.BoxGeometry(width, height, depth);
    const mesh = new THREE_REF.Mesh(geometry, makeMaterial(color || 0x284466));
    mesh.position.set(x, (typeof y === 'number' ? y : height / 2 - 0.1), z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.userData.platform = { width, depth, height, lastX: mesh.position.x, lastY: mesh.position.y };
    scene.add(mesh);
    platforms.push(mesh);
    return mesh;
  }

  function addPlatformTrim(platform) {
    const data = platform.userData.platform;
    const trim = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(data.width + 0.08, 0.08, data.depth + 0.08),
      makeMaterial(0x5cdcff, { emissive: 0x0f5360, emissiveIntensity: 0.18 })
    );
    trim.position.set(platform.position.x, platform.position.y + data.height / 2 + 0.045, platform.position.z);
    trim.userData.followPlatform = platform;
    scene.add(trim);
    decorative.push(trim);
  }

  function addCoin(x, y, z) {
    const group = new THREE_REF.Group();
    const coin = new THREE_REF.Mesh(
      new THREE_REF.CylinderGeometry(0.34, 0.34, 0.08, 28),
      makeMaterial(0xffd85a, { emissive: 0x8b6500, emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.28 })
    );
    coin.rotation.x = Math.PI / 2;
    coin.castShadow = true;
    const ring = new THREE_REF.Mesh(
      new THREE_REF.TorusGeometry(0.43, 0.035, 8, 24),
      makeMaterial(0xffffff, { emissive: 0xffd85a, emissiveIntensity: 0.55 })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(coin, ring);
    group.position.set(x, y, z);
    group.userData.baseY = y;
    group.userData.spin = Math.random() * Math.PI * 2;
    scene.add(group);
    coins.push(group);
  }

  function addSpike(x, z, y) {
    const group = new THREE_REF.Group();
    const base = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(1.55, 0.12, 0.72),
      makeMaterial(0x76142e, { emissive: 0x390816, emissiveIntensity: 0.28 })
    );
    base.position.y = -0.04;
    group.add(base);
    for (let i = 0; i < 3; i += 1) {
      const spike = new THREE_REF.Mesh(
        new THREE_REF.ConeGeometry(0.32, 1.0, 4),
        makeMaterial(0xff2d6f, { emissive: 0x7d0928, emissiveIntensity: 0.58, roughness: 0.42 })
      );
      spike.position.set((i - 1) * 0.46, 0.44, 0);
      spike.rotation.y = Math.PI / 4;
      spike.castShadow = true;
      group.add(spike);
    }
    group.position.set(x, y || 0.42, z);
    group.userData.radius = 0.82;
    scene.add(group);
    spikes.push(group);
  }

  function addCheckpoint(x, label) {
    const group = new THREE_REF.Group();
    const pole = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.055, 0.055, 1.35, 12), makeMaterial(0xd7f9ff));
    pole.position.y = 0.85;
    const flag = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.75, 0.38, 0.045),
      makeMaterial(0x38e8ff, { emissive: 0x135b66, emissiveIntensity: 0.45 })
    );
    flag.position.set(0.36, 1.35, 0);
    group.add(pole, flag);
    group.position.set(x, 0.36, -1.65);
    group.userData = { label, active: false };
    scene.add(group);
    checkpoints.push(group);
  }

  function createStickman() {
    const group = new THREE_REF.Group();
    const black = makeMaterial(0x020307, { roughness: 0.52 });
    const cyan = makeMaterial(0x38e8ff, { emissive: 0x135b66, emissiveIntensity: 0.48 });

    const head = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(0.36, 24, 16), black);
    head.position.y = 2.28;
    const body = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.16, 0.2, 1.0, 16), black);
    body.position.y = 1.55;
    const chest = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.34, 0.04, 0.26), cyan);
    chest.position.set(0, 1.7, 0.18);
    const yMark = createYMark();
    yMark.position.set(0, 1.73, 0.33);
    group.add(head, body, chest, yMark);

    const leftArm = addLimb(group, black, -0.34, 1.55, 0, -0.82, 1.12, 0, 0.09);
    const rightArm = addLimb(group, black, 0.34, 1.55, 0, 0.82, 1.12, 0, 0.09);
    const leftLeg = addLimb(group, black, -0.12, 1.04, 0, -0.48, 0.2, 0, 0.11);
    const rightLeg = addLimb(group, black, 0.12, 1.04, 0, 0.48, 0.2, 0, 0.11);
    group.userData.parts = { head, body, chest, yMark, leftArm, rightArm, leftLeg, rightLeg };
    group.position.set(world.startX, 2.0, 0);
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
    return limb;
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
      new THREE_REF.TorusGeometry(1.0, 0.12, 16, 56),
      makeMaterial(0x38e8ff, { emissive: 0x38e8ff, emissiveIntensity: 1.0, metalness: 0.12 })
    );
    ring.rotation.x = Math.PI / 2;
    const glow = new THREE_REF.PointLight(0x38e8ff, 2.8, 12);
    glow.position.set(0, 1.6, 0);
    const core = new THREE_REF.Mesh(
      new THREE_REF.CircleGeometry(0.82, 56),
      new THREE_REF.MeshBasicMaterial({ color: 0x69f7ff, transparent: true, opacity: 0.3, side: THREE_REF.DoubleSide })
    );
    core.rotation.x = Math.PI / 2;
    group.add(ring, core, glow);
    group.position.set(world.endX, 1.65, 0);
    scene.add(group);
    for (let i = 0; i < 30; i += 1) spawnParticle(new THREE_REF.Vector3(world.endX, 1.65, 0), 0x38e8ff, true);
    return group;
  }

  function createTree(x, z, scale) {
    const trunk = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.12 * scale, 0.18 * scale, 1.2 * scale, 8), makeMaterial(0x76502e));
    trunk.position.set(x, 0.55 * scale, z);
    const leaves = new THREE_REF.Mesh(new THREE_REF.ConeGeometry(0.65 * scale, 1.2 * scale, 7), makeMaterial(0x2cc678, { roughness: 0.8 }));
    leaves.position.set(x, 1.45 * scale, z);
    trunk.castShadow = true;
    leaves.castShadow = true;
    scene.add(trunk, leaves);
    decorative.push(trunk, leaves);
  }

  function createCloud(x, y, z, scale) {
    const group = new THREE_REF.Group();
    const mat = new THREE_REF.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.78 });
    [-0.45, 0, 0.45, 0.82].forEach((offset, index) => {
      const puff = new THREE_REF.Mesh(new THREE_REF.SphereGeometry((index === 1 ? 0.42 : 0.3) * scale, 16, 10), mat);
      puff.position.x = offset * scale;
      group.add(puff);
    });
    group.position.set(x, y, z);
    scene.add(group);
    decorative.push(group);
  }

  function spawnParticle(position, color, longLife) {
    if (!THREE_REF || !scene) return;
    const mesh = new THREE_REF.Mesh(
      new THREE_REF.SphereGeometry(longLife ? 0.055 : 0.075, 8, 6),
      new THREE_REF.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
    );
    mesh.position.copy(position);
    mesh.userData.particle = {
      life: longLife ? 1.6 + Math.random() * 1.2 : 0.55,
      maxLife: longLife ? 2.4 : 0.55,
      velocity: new THREE_REF.Vector3((Math.random() - 0.5) * 1.8, Math.random() * 1.8 + 0.3, (Math.random() - 0.5) * 1.8)
    };
    scene.add(mesh);
    particles.push(mesh);
  }

  function buildWorld() {
    scene.background = new THREE_REF.Color(0xa9e7ff);
    scene.fog = new THREE_REF.Fog(0xa9e7ff, 26, 82);

    const hemi = new THREE_REF.HemisphereLight(0xd9f8ff, 0x755334, 1.9);
    scene.add(hemi);
    const sun = new THREE_REF.DirectionalLight(0xfff0b8, 3.0);
    sun.position.set(-10, 18, 11);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -35;
    sun.shadow.camera.right = 35;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -20;
    scene.add(sun);

    sunMoon = new THREE_REF.Mesh(
      new THREE_REF.SphereGeometry(2.0, 32, 18),
      new THREE_REF.MeshBasicMaterial({ color: 0xfff1a6 })
    );
    sunMoon.position.set(-18, 16, -28);
    scene.add(sunMoon);

    [
      [-17.0, 0, 14.0, 5.3, 0.8, 0x2b4e6e, 0.32],
      [-7.0, 0, 8.0, 4.8, 0.72, 0x315d76, 0.55],
      [-0.8, 0, 5.4, 4.2, 0.62, 0x426f82, 0.82],
      [5.8, 0, 7.2, 4.6, 0.7, 0x2f6177, 0.72],
      [13.7, 0, 7.6, 4.6, 0.7, 0x355c72, 1.0],
      [21.8, 0, 7.8, 4.8, 0.72, 0x284d69, 0.72],
      [30.4, 0, 8.2, 4.8, 0.72, 0x315a72, 0.96],
      [39.5, 0, 8.4, 4.9, 0.72, 0x315d76, 0.66],
      [49.4, 0, 13.0, 5.4, 0.82, 0x294c6d, 0.45]
    ].forEach((args) => addPlatform(...args));
    [
      [-12.0, 0, 4.8, 3.1, 0.22, 0x5b7890, 0.96],
      [-3.8, 0, 3.0, 3.0, 0.2, 0x6d849a, 1.06],
      [2.4, 0, 3.4, 3.0, 0.2, 0x6d849a, 1.18],
      [9.7, 0, 3.6, 3.0, 0.2, 0x6d849a, 1.2],
      [17.8, 0, 3.8, 3.1, 0.22, 0x6d849a, 1.08],
      [26.1, 0, 3.5, 3.0, 0.2, 0x6d849a, 1.24],
      [34.8, 0, 3.8, 3.0, 0.22, 0x6d849a, 1.12],
      [44.3, 0, 3.8, 3.0, 0.22, 0x6d849a, 0.95]
    ].forEach((args) => addPlatform(...args));
    platforms.forEach(addPlatformTrim);

    const movingA = addPlatform(1.1, 0, 3.2, 3.8, 0.5, 0x3a7d8d, 1.18);
    movingA.userData.move = { baseX: 1.1, baseY: 1.18, amplitudeX: 0.75, amplitudeY: 0, speed: 0.9, lastX: movingA.position.x, lastY: movingA.position.y };
    movers.push(movingA);
    const movingB = addPlatform(26.1, 0, 3.2, 3.6, 0.5, 0x3a7d8d, 1.22);
    movingB.userData.move = { baseX: 26.1, baseY: 1.22, amplitudeX: 0.65, amplitudeY: 0.35, speed: 1.05, lastX: movingB.position.x, lastY: movingB.position.y };
    movers.push(movingB);
    const movingC = addPlatform(44.2, 0, 3.5, 3.8, 0.5, 0x3a7d8d, 1.0);
    movingC.userData.move = { baseX: 44.2, baseY: 1.0, amplitudeX: 0.8, amplitudeY: 0.25, speed: 0.95, lastX: movingC.position.x, lastY: movingC.position.y };
    movers.push(movingC);
    movers.forEach(addPlatformTrim);

    [
      [-19.2, 1.65, -0.8], [-16.2, 1.72, 0], [-13.2, 1.82, 0.75],
      [-9.2, 1.92, -0.65], [-5.8, 2.05, 0.6], [-2.4, 2.16, 0],
      [1.1, 2.32, 0.7], [4.1, 2.12, -0.5], [7.2, 2.0, 0],
      [10.8, 2.34, 0.65], [14.0, 2.5, -0.65], [17.4, 2.32, 0],
      [20.8, 2.04, 0.75], [24.2, 2.26, -0.7], [27.6, 2.45, 0],
      [31.2, 2.34, 0.65], [34.8, 2.26, -0.65], [38.3, 2.0, 0],
      [41.6, 2.1, 0.75], [44.5, 2.25, -0.7], [47.6, 1.95, 0],
      [50.2, 1.78, 0.7], [52.8, 1.75, -0.6], [55.0, 1.9, 0]
    ].forEach(([x, y, z]) => addCoin(x, y, z));

    [-8.2, 12.7, 22.6, 36.8, 48.7].forEach((x, index) => addSpike(x, index % 2 ? 0.7 : -0.7));
    addCheckpoint(-1.6, 'Bridge');
    addCheckpoint(21.8, 'Ruins');
    addCheckpoint(39.8, 'Portal Run');

    [-18, -10, 9, 22, 38, 53].forEach((x, index) => createTree(x, index % 2 ? -2.9 : 2.75, 0.74 + index * 0.035));
    createCloud(-13, 12, -20, 1.5);
    createCloud(8, 13.2, -24, 1.05);
    createCloud(27, 11.5, -22, 1.25);
    createCloud(49, 12.8, -23, 1.1);

    const islandBottom = new THREE_REF.Mesh(
      new THREE_REF.ConeGeometry(38, 9, 8),
      makeMaterial(0x6c5439, { roughness: 0.85 })
    );
    islandBottom.position.set(16, -5.2, 0);
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
    renderer.outputEncoding = THREE_REF.sRGBEncoding;

    scene = new THREE_REF.Scene();
    camera = new THREE_REF.PerspectiveCamera(58, 16 / 9, 0.1, 140);
    cameraTarget = new THREE_REF.Vector3();
    cameraLook = new THREE_REF.Vector3();
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
    if (!ensureGameReady()) return;
    unlockAudio();
    playTone('button');
    state.started = true;
    state.complete = false;
    state.deaths = 0;
    state.coins = 0;
    state.elapsed = 0;
    state.velocity.x = 0;
    state.velocity.y = 0;
    state.velocity.z = 0;
    state.grounded = false;
    state.onPlatform = null;
    state.coyote = 0;
    state.jumpBuffer = 0;
    state.invincible = 0;
    state.checkpointIndex = 0;
    state.checkpoint = { x: world.startX, y: 0.9, z: 0, label: 'Start' };
    state.collected.clear();
    coins.forEach((coin) => {
      coin.visible = true;
      coin.scale.set(1, 1, 1);
    });
    checkpoints.forEach((checkpoint) => {
      checkpoint.userData.active = false;
    });
    resetPlayer(true);
    state.startTime = performance.now();
    ui.startOverlay.classList.remove('visible');
    ui.completeOverlay.classList.remove('visible');
    document.body.classList.add('playing');
    updateHud();
  }

  function resetPlayer(fresh) {
    player.position.set(state.checkpoint.x, state.checkpoint.y, state.checkpoint.z);
    player.rotation.y = Math.PI / 2;
    player.scale.set(1, 1, 1);
    state.face = 1;
    state.velocity.x = fresh ? 0 : 1.8;
    state.velocity.y = 0;
    state.velocity.z = 0;
    state.landingSquash = 0.12;
    state.invincible = fresh ? 0 : 0.75;
  }

  function die() {
    if (state.invincible > 0 || state.complete) return;
    state.deaths += 1;
    playTone('hurt');
    for (let i = 0; i < 16; i += 1) spawnParticle(player.position.clone().add(new THREE_REF.Vector3(0, 0.8, 0)), 0xff3d76, false);
    resetPlayer(false);
    updateHud();
  }

  function completeLevel() {
    if (state.complete) return;
    state.complete = true;
    state.started = false;
    document.body.classList.remove('playing');
    playTone('complete');
    for (let i = 0; i < 42; i += 1) spawnParticle(portal.position.clone(), 0x38e8ff, false);
    if (!state.bestTime || state.elapsed < state.bestTime) state.bestTime = state.elapsed;
    if (state.coins > state.bestCoins) state.bestCoins = state.coins;
    saveBest();
    ui.finalStats.innerHTML = [
      '<span class="victory-line">Tamer escaped the floating island.</span>',
      `<span>Time <strong>${formatTime(state.elapsed)}</strong></span>`,
      `<span>Best Time <strong>${state.bestTime ? formatTime(state.bestTime) : '--'}</strong></span>`,
      `<span>Coins <strong>${state.coins} / ${COIN_TOTAL}</strong></span>`,
      `<span>Deaths <strong>${state.deaths}</strong></span>`
    ].join('');
    ui.completeOverlay.classList.add('visible');
    updateHud();
  }

  function getPlatformAt(x, z, y, previousY) {
    let best = null;
    platforms.forEach((platform) => {
      const data = platform.userData.platform;
      const halfW = data.width / 2;
      const halfD = data.depth / 2;
      const top = platform.position.y + data.height / 2;
      const standY = top - PLAYER_FOOT_OFFSET;
      const edgeGrace = state.velocity.y <= 0 ? 0.34 : 0.08;
      const withinX = x >= platform.position.x - halfW - edgeGrace && x <= platform.position.x + halfW + edgeGrace;
      const withinZ = z >= platform.position.z - halfD - 0.24 && z <= platform.position.z + halfD + 0.24;
      const crossedTop = previousY >= standY - 0.24 && y <= standY + 0.82;
      if (withinX && withinZ && crossedTop) {
        if (!best || top > best.top) best = { mesh: platform, top, standY };
      }
    });
    return best;
  }

  function updateMovingPlatforms(elapsed) {
    movers.forEach((platform) => {
      const motion = platform.userData.move;
      motion.lastX = platform.position.x;
      motion.lastY = platform.position.y;
      platform.position.x = motion.baseX + Math.sin(elapsed * motion.speed) * motion.amplitudeX;
      platform.position.y = motion.baseY + Math.sin(elapsed * motion.speed + Math.PI / 3) * motion.amplitudeY;
      platform.userData.platform.deltaX = platform.position.x - motion.lastX;
      platform.userData.platform.deltaY = platform.position.y - motion.lastY;
    });
  }

  function updatePlayer(delta) {
    const wasGrounded = state.grounded;
    const input = (state.keys.right ? 1 : 0) - (state.keys.left ? 1 : 0);
    const accel = state.grounded ? controls.groundAccel : controls.airAccel;
    const targetSpeed = input * controls.maxSpeed;
    if (input !== 0) {
      state.velocity.x += (targetSpeed - state.velocity.x) * Math.min(1, accel * delta / Math.max(1, Math.abs(targetSpeed - state.velocity.x)));
      state.face = input > 0 ? 1 : -1;
    } else if (state.grounded) {
      const friction = controls.groundFriction * delta;
      if (Math.abs(state.velocity.x) <= friction) state.velocity.x = 0;
      else state.velocity.x -= Math.sign(state.velocity.x) * friction;
    } else {
      state.velocity.x *= 0.992;
    }

    state.velocity.z += (0 - player.position.z) * Math.min(1, delta * 2.5);
    state.velocity.y = Math.max(controls.terminalVelocity, state.velocity.y - controls.gravity * delta);
    state.jumpBuffer = Math.max(0, state.jumpBuffer - delta);
    state.coyote = state.grounded ? controls.coyoteTime : Math.max(0, state.coyote - delta);
    state.invincible = Math.max(0, state.invincible - delta);

    if (state.jumpBuffer > 0 && state.coyote > 0) {
      state.velocity.y = controls.jumpVelocity;
      state.grounded = false;
      state.onPlatform = null;
      state.coyote = 0;
      state.jumpBuffer = 0;
      playTone('jump');
    }

    const previousY = player.position.y;
    player.position.x += state.velocity.x * delta;
    player.position.y += state.velocity.y * delta;
    player.position.z += state.velocity.z * delta;
    player.position.z = Math.max(-1.35, Math.min(1.35, player.position.z));

    const platformHit = getPlatformAt(player.position.x, player.position.z, player.position.y, previousY);
    if (platformHit && state.velocity.y <= 0) {
      player.position.y = platformHit.standY;
      state.velocity.y = 0;
      state.grounded = true;
      state.onPlatform = platformHit.mesh;
      if (!wasGrounded) state.landingSquash = 0.18;
      const motion = platformHit.mesh.userData.platform;
      if (motion.deltaX) player.position.x += motion.deltaX;
      if (motion.deltaY) player.position.y += motion.deltaY;
    } else {
      state.grounded = false;
      state.onPlatform = null;
    }

    if (player.position.y < -8 || Math.abs(player.position.z) > 7) die();
    player.position.x = Math.max(world.startX - 5, Math.min(world.endX + 4, player.position.x));
  }

  function animateStickman(delta, elapsed) {
    const speed = Math.abs(state.velocity.x);
    const parts = player.userData.parts || {};
    const stride = elapsed * (speed > 5.8 ? 12.5 : 8.2);
    const walk = Math.sin(stride) * Math.min(0.8, speed / controls.maxSpeed);
    player.rotation.y += ((state.face > 0 ? Math.PI / 2 : -Math.PI / 2) - player.rotation.y) * Math.min(1, delta * 12);
    state.landingSquash = Math.max(0, state.landingSquash - delta);
    const squash = state.landingSquash > 0 ? Math.sin((state.landingSquash / 0.18) * Math.PI) : 0;
    const idleBounce = speed < 0.25 && state.grounded ? Math.sin(elapsed * 3.2) * 0.035 : 0;
    player.scale.set(1 + squash * 0.08, 1 - squash * 0.1 + (state.grounded ? Math.abs(walk) * 0.025 : -0.02), 1 + squash * 0.08);
    if (parts.head) parts.head.position.y = 2.28 + idleBounce + Math.sin(elapsed * 2.5) * (state.grounded ? 0.025 : 0.01);

    if (!state.grounded) {
      const falling = state.velocity.y < -1;
      if (parts.leftArm) parts.leftArm.rotation.z = falling ? 0.55 : -0.45;
      if (parts.rightArm) parts.rightArm.rotation.z = falling ? -0.55 : 0.45;
      if (parts.leftLeg) parts.leftLeg.rotation.z = falling ? -0.25 : 0.45;
      if (parts.rightLeg) parts.rightLeg.rotation.z = falling ? 0.25 : -0.45;
    } else if (speed > 0.25) {
      if (parts.leftArm) parts.leftArm.rotation.z = walk * 0.55;
      if (parts.rightArm) parts.rightArm.rotation.z = -walk * 0.55;
      if (parts.leftLeg) parts.leftLeg.rotation.z = -walk * 0.65;
      if (parts.rightLeg) parts.rightLeg.rotation.z = walk * 0.65;
    } else {
      if (parts.leftArm) parts.leftArm.rotation.z = Math.sin(elapsed * 1.8) * 0.08;
      if (parts.rightArm) parts.rightArm.rotation.z = -Math.sin(elapsed * 1.8) * 0.08;
      if (parts.leftLeg) parts.leftLeg.rotation.z = 0;
      if (parts.rightLeg) parts.rightLeg.rotation.z = 0;
    }

    player.visible = !(state.invincible > 0 && Math.floor(elapsed * 18) % 2 === 0);
  }

  function updateObjects(delta, elapsed) {
    updateMovingPlatforms(elapsed);

    decorative.forEach((item, index) => {
      if (item.userData.followPlatform) {
        const platform = item.userData.followPlatform;
        const data = platform.userData.platform;
        item.position.set(platform.position.x, platform.position.y + data.height / 2 + 0.045, platform.position.z);
      } else if (item.type === 'Group') {
        item.position.x += Math.sin(elapsed * 0.2 + index) * 0.0018;
      }
    });

    coins.forEach((coin, index) => {
      if (!coin.visible) return;
      coin.rotation.y += delta * 4.5;
      coin.position.y = coin.userData.baseY + Math.sin(elapsed * 3 + coin.userData.spin) * 0.16;
      coin.scale.setScalar(1 + Math.sin(elapsed * 5 + index) * 0.04);
      if (player.position.distanceTo(coin.position) < 1.32) {
        coin.visible = false;
        state.collected.add(index);
        state.coins = state.collected.size;
        playTone('coin');
        for (let i = 0; i < 9; i += 1) spawnParticle(coin.position.clone(), 0xffd85a, false);
        updateHud();
      }
    });

    checkpoints.forEach((checkpoint, index) => {
      checkpoint.children[1].rotation.y = Math.sin(elapsed * 2 + index) * 0.15;
      if (!checkpoint.userData.active && Math.abs(player.position.x - checkpoint.position.x) < 1.2 && player.position.y < 3.4) {
        checkpoint.userData.active = true;
        state.checkpointIndex = index + 1;
        state.checkpoint = { x: checkpoint.position.x, y: checkpoint.position.y + 0.55, z: 0, label: checkpoint.userData.label };
        checkpoint.children[1].material.emissiveIntensity = 0.9;
        playTone('checkpoint');
        for (let i = 0; i < 14; i += 1) spawnParticle(checkpoint.position.clone().add(new THREE_REF.Vector3(0, 1.2, 0)), 0x38e8ff, false);
        updateHud();
      }
    });

    spikes.forEach((spike) => {
      spike.rotation.y += delta * 0.9;
      if (player.position.distanceTo(spike.position) < spike.userData.radius && player.position.y < spike.position.y + 2.0) die();
    });

    if (portal) {
      portal.rotation.y += delta * 1.15;
      portal.children[0].rotation.z += delta * 2.4;
      portal.children[1].material.opacity = 0.23 + Math.sin(elapsed * 4) * 0.08;
      if (Math.random() < delta * 14) spawnParticle(portal.position.clone(), 0x38e8ff, true);
      if (player.position.distanceTo(portal.position) < 1.8) completeLevel();
    }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      const data = particle.userData.particle;
      data.life -= delta;
      particle.position.add(data.velocity.clone().multiplyScalar(delta));
      data.velocity.y -= delta * 0.65;
      const opacity = Math.max(0, data.life / data.maxLife);
      particle.material.opacity = opacity;
      particle.scale.setScalar(0.6 + opacity * 0.9);
      if (data.life <= 0) {
        scene.remove(particle);
        particles.splice(i, 1);
      }
    }
  }

  function updateCamera(delta) {
    const lookAhead = Math.max(-2.2, Math.min(3.2, state.velocity.x * 0.22));
    const behind = state.face > 0 ? -5.0 : 5.0;
    cameraTarget.set(player.position.x + behind + lookAhead, player.position.y + 3.25, 7.35);
    camera.position.lerp(cameraTarget, 1 - Math.exp(-delta * 5.2));
    cameraLook.set(player.position.x + lookAhead * 0.32, player.position.y + 1.05, 0);
    camera.lookAt(cameraLook);
    camera.rotation.z += ((state.face > 0 ? -0.025 : 0.025) - camera.rotation.z) * Math.min(1, delta * 3);
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

    animateStickman(delta, elapsed);
    updateObjects(delta, elapsed);
    updateCamera(delta);
    renderer.render(scene, camera);
  }

  function queueJump() {
    state.jumpBuffer = controls.jumpBuffer;
  }

  function bindKeyboard() {
    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (['arrowleft', 'arrowright', ' ', 'arrowup', 'a', 'd', 'w', 'm'].includes(key)) event.preventDefault();
      if (key === 'arrowleft' || key === 'a') state.keys.left = true;
      if (key === 'arrowright' || key === 'd') state.keys.right = true;
      if (key === ' ' || key === 'arrowup' || key === 'w') queueJump();
      if (key === 'm') toggleMute();
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
      unlockAudio();
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

  function toggleMute() {
    state.muted = !state.muted;
    saveBest();
    updateHud();
    if (!state.muted) playTone('button');
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
    if (ui.muteButton) ui.muteButton.addEventListener('click', toggleMute);
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
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
