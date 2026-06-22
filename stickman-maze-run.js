(() => {
  "use strict";

  const canvas = document.getElementById("mazeCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const GROUND_Y = 472;
  const SAVE_KEY = "youooo_stickman_maze_run_v1";
  const PLAYER_W = 28;
  const PLAYER_H = 56;
  const RUN_SPEED = 255;
  const JUMP_SPEED = 590;
  const GRAVITY = 1550;
  const MAX_JUMP_GAP = 205;

  const dom = {
    level: document.getElementById("levelReadout"), coin: document.getElementById("coinReadout"),
    deaths: document.getElementById("deathReadout"), time: document.getElementById("timeReadout"),
    objective: document.getElementById("objectiveReadout"), startOverlay: document.getElementById("startOverlay"),
    pauseOverlay: document.getElementById("pauseOverlay"), completeOverlay: document.getElementById("completeOverlay"),
    start: document.getElementById("startButton"), pause: document.getElementById("pauseButton"),
    resume: document.getElementById("resumeButton"), restart: document.getElementById("restartButton"),
    next: document.getElementById("nextButton"), replay: document.getElementById("replayButton"),
    menuLevel: document.getElementById("menuLevel"), menuCoins: document.getElementById("menuCoins"),
    menuBest: document.getElementById("menuBest"), completeStats: document.getElementById("completeStats"),
    toast: document.getElementById("statusToast"), sound: document.getElementById("soundButton"),
    mobile: document.querySelector(".mobile-controls"), fullscreen: document.getElementById("fullscreenButton"),
    mobilePause: document.getElementById("mobilePauseButton"), hint: document.getElementById("hintButton"),
    jump: document.getElementById("jumpButton")
  };

  const input = { left: false, right: false, jumpBuffer: 0 };
  let save = loadSave();
  let mazeLevel = save.highestLevel;
  let player;
  let course;
  let cameraX = 0;
  let running = false;
  let paused = false;
  let completed = false;
  let elapsed = 0;
  let levelCoins = 0;
  let sessionDeaths = 0;
  let lastTime = 0;
  let toastTimer = 0;
  let hintTimer = 0;
  let hintCooldown = 0;
  let audioContext = null;
  let userInteracted = false;

  function loadSave() {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
      return {
        highestLevel: Math.max(1, Number(data.highestLevel) || 1),
        coins: Math.max(0, Number(data.coins) || 0),
        deaths: Math.max(0, Number(data.deaths) || 0),
        bestTimes: data.bestTimes && typeof data.bestTimes === "object" ? data.bestTimes : {},
        sound: data.sound !== false
      };
    } catch (_) {
      return { highestLevel: 1, coins: 0, deaths: 0, bestTimes: {}, sound: true };
    }
  }

  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {}
  }

  function formatTime(value) {
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function seeded(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function tone(frequency, duration = .08, type = "sine", endFrequency = frequency) {
    if (!save.sound || !userInteracted) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), now + duration);
      gain.gain.setValueAtTime(.045, now);
      gain.gain.exponentialRampToValueAtTime(.001, now + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (_) {}
  }

  function melody(notes) {
    notes.forEach(([frequency, delay, duration]) => setTimeout(() => tone(frequency, duration, "triangle"), delay * 1000));
  }

  function showToast(text, duration = 2) {
    dom.toast.textContent = text;
    dom.toast.classList.add("visible");
    toastTimer = duration;
  }

  function rect(x, y, w, h, type = "solid") { return { x, y, w, h, type }; }
  function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function center(item) { return { x: item.x + item.w / 2, y: item.y + item.h / 2 }; }

  function addGround(target, x, width) {
    if (width > 0) target.platforms.push(rect(x, GROUND_Y, width, H - GROUND_Y, "ground"));
  }

  function createCourse(level, seed) {
    const random = seeded(seed);
    const result = {
      seed, width: 700 + 7 * 590 + 700, platforms: [], route: [], spikes: [], hiddenSpikes: [], lasers: [],
      movingWalls: [], movingPlatforms: [], fakeFloors: [], movingHoles: [], coins: [],
      key: null, switch: null, checkpoint: null, door: null, portal: null
    };
    addGround(result, 0, 700);
    result.route.push({ x: 90, y: GROUND_Y, kind: "ground" });
    const patterns = [buildPit, buildSteps, buildMovingGap, buildTrapHall, buildHighRoad, buildShiftingFloor];
    let previous = -1;

    for (let section = 0; section < 7; section += 1) {
      const start = 620 + section * 590;
      let choice = Math.floor(random() * patterns.length);
      if (choice === previous) choice = (choice + 1 + Math.floor(random() * (patterns.length - 1))) % patterns.length;
      previous = choice;
      patterns[choice](result, start, section, random, level);
    }

    addGround(result, 620 + 7 * 590, 780);
    [4860, 5010, 5160].forEach(x => safeNode(result, x));
    const routeAt = ratio => result.route[Math.min(result.route.length - 2, Math.max(1, Math.floor(result.route.length * ratio)))];
    const keyNode = routeAt(.25);
    const checkpointNode = routeAt(.44);
    const switchNode = routeAt(.61);
    result.key = pickupAt(keyNode, "key");
    result.checkpoint = pickupAt(checkpointNode, "checkpoint");
    result.switch = pickupAt(switchNode, "switch");
    const doorX = Math.max(switchNode.x + 220, 620 + 5.2 * 590);
    result.door = rect(doorX, GROUND_Y - 132, 26, 132, "door");
    result.portal = { x: result.width - 165, y: GROUND_Y - 84, w: 52, h: 84 };
    result.route.push({ x: result.portal.x, y: GROUND_Y, kind: "portal" });

    const blocked = [result.key, result.checkpoint, result.switch, result.door, result.portal];
    result.coins = result.route.filter((_, index) => index % 2 === 1).slice(1, 20 + Math.min(level, 8)).map((node, index) => ({
      x: node.x + (index % 2 ? 22 : -18), y: node.y - 62 - (index % 3) * 8, w: 16, h: 16, collected: false
    })).filter(coin => !blocked.some(item => Math.abs(center(item).x - center(coin).x) < 55));

    result.valid = validateCourse(result);
    return result.valid ? result : createFallbackCourse(level, seed);
  }

  function pickupAt(node, type) {
    return { x: node.x - 14, y: node.y - 70, w: 28, h: 32, type, collected: false, active: false };
  }

  function safeNode(target, x, y = GROUND_Y, kind = "ground") {
    target.route.push({ x, y, kind });
  }

  function buildPit(target, x, section, random, level) {
    const gap = 115 + Math.floor(random() * 45);
    const left = 205 + Math.floor(random() * 35);
    addGround(target, x, left);
    addGround(target, x + left + gap, 590 - left - gap + 2);
    target.spikes.push({ x: x + left + 8, y: GROUND_Y + 18, w: gap - 16, h: 32 });
    safeNode(target, x + 90);
    safeNode(target, x + left - 28);
    safeNode(target, x + left + gap + 40);
    if (section > 1) target.hiddenSpikes.push({ x: x + 430, y: GROUND_Y - 2, w: 44, h: 24, reveal: 0 });
  }

  function buildSteps(target, x, section, random) {
    addGround(target, x, 590);
    const up = random() > .5;
    const heights = up ? [410, 350, 292, 350] : [390, 322, 376, 310];
    safeNode(target, x + 36);
    heights.forEach((y, index) => {
      const px = x + 95 + index * 112;
      target.platforms.push(rect(px, y, 90, 18));
      safeNode(target, px + 45, y, "platform");
    });
    target.spikes.push({ x: x + 205, y: GROUND_Y - 22, w: 66, h: 22 });
    target.spikes.push({ x: x + 430, y: GROUND_Y - 22, w: 58, h: 22 });
    safeNode(target, x + 554);
  }

  function buildMovingGap(target, x, section, random) {
    const left = 180;
    const gap = 190;
    addGround(target, x, left);
    addGround(target, x + left + gap, 590 - left - gap + 2);
    target.spikes.push({ x: x + left + 5, y: GROUND_Y + 12, w: gap - 10, h: 34 });
    target.movingPlatforms.push({ x: x + left + 32, baseX: x + left + 32, y: 406, baseY: 406, w: 112, h: 16, axis: "x", range: 28, speed: .85 + section * .03, phase: random() * 6.28, dx: 0, dy: 0 });
    safeNode(target, x + 80);
    safeNode(target, x + left - 25);
    safeNode(target, x + left + 88, 406, "moving");
    safeNode(target, x + left + gap + 40);
  }

  function buildTrapHall(target, x, section, random) {
    addGround(target, x, 590);
    target.platforms.push(rect(x + 82, 340, 130, 18));
    target.platforms.push(rect(x + 366, 322, 126, 18));
    target.lasers.push({ x: x + 270, y1: 252, y2: GROUND_Y, phase: random() * 4, cycle: 2.2 + random() * .5 });
    target.movingWalls.push({ x: x + 505, baseY: 282, y: 282, w: 24, h: 132, range: 76, speed: .85, phase: random() * 6.28 });
    target.hiddenSpikes.push({ x: x + 115, y: GROUND_Y - 2, w: 46, h: 24, reveal: 0 });
    if (section > 3) target.hiddenSpikes.push({ x: x + 390, y: GROUND_Y - 2, w: 40, h: 24, reveal: 0 });
    safeNode(target, x + 40);
    safeNode(target, x + 310);
    safeNode(target, x + 558);
  }

  function buildHighRoad(target, x, section, random) {
    addGround(target, x, 142);
    addGround(target, x + 458, 132);
    target.spikes.push({ x: x + 142, y: GROUND_Y + 12, w: 316, h: 34 });
    const ys = [404, 346, 294, 346, 402];
    safeNode(target, x + 44);
    ys.forEach((y, index) => {
      const px = x + 116 + index * 90;
      target.platforms.push(rect(px, y, 80, 17));
      safeNode(target, px + 40, y, "platform");
    });
    safeNode(target, x + 540);
    if (section > 2) target.lasers.push({ x: x + 327, y1: 205, y2: 346, phase: random() * 4, cycle: 2.7 });
  }

  function buildShiftingFloor(target, x, section, random) {
    addGround(target, x, 378);
    addGround(target, x + 470, 120);
    target.movingHoles.push({ baseX: x + 185, x: x + 185, y: GROUND_Y - 5, w: 82, h: 18, range: 72, speed: .7 + section * .03, phase: random() * 6.28 });
    target.fakeFloors.push({ x: x + 378, y: GROUND_Y - 10, w: 92, h: 18, timer: 0, fallen: false, baseY: GROUND_Y - 10 });
    target.platforms.push(rect(x + 340, 362, 168, 18));
    safeNode(target, x + 50);
    safeNode(target, x + 150);
    safeNode(target, x + 310);
    safeNode(target, x + 424, 362, "platform");
    safeNode(target, x + 548);
  }

  function validateCourse(target) {
    if (!target.route.length || !target.key || !target.switch || !target.checkpoint || !target.portal) return false;
    if (!(target.key.x < target.switch.x && target.switch.x < target.door.x && target.door.x < target.portal.x)) return false;
    for (let index = 1; index < target.route.length; index += 1) {
      const previous = target.route[index - 1];
      const current = target.route[index];
      const horizontal = Math.abs(current.x - previous.x);
      const upward = previous.y - current.y;
      const continuousGround = previous.kind === "ground" && current.kind === "ground" && previous.y === current.y;
      if ((!continuousGround && horizontal > MAX_JUMP_GAP) || (continuousGround && horizontal > 700) || upward > 115) return false;
    }
    return target.platforms.every(platform => platform.w >= 18 && platform.h > 0);
  }

  function createFallbackCourse(level, seed) {
    const target = { seed, width: 4830, platforms: [], route: [], spikes: [], hiddenSpikes: [], lasers: [], movingWalls: [], movingPlatforms: [], fakeFloors: [], movingHoles: [], coins: [] };
    addGround(target, 0, target.width);
    for (let x = 100; x < target.width - 250; x += 150) safeNode(target, x);
    [820, 1480, 2260, 3020, 3740].forEach((x, index) => target.spikes.push({ x, y: GROUND_Y - 22, w: 48 + index * 3, h: 22 }));
    target.key = pickupAt(target.route[7], "key");
    target.checkpoint = pickupAt(target.route[14], "checkpoint");
    target.switch = pickupAt(target.route[21], "switch");
    target.door = rect(3860, GROUND_Y - 132, 26, 132, "door");
    target.portal = { x: target.width - 165, y: GROUND_Y - 84, w: 52, h: 84 };
    target.coins = target.route.filter((_, index) => index % 2).slice(0, 18).map(node => ({ x: node.x, y: node.y - 70, w: 16, h: 16, collected: false }));
    target.valid = true;
    return target;
  }

  function buildRun(level, showMenu = false) {
    mazeLevel = Math.max(1, level);
    const seed = ((Date.now() & 0xfffffff) ^ Math.imul(mazeLevel, 2654435761)) >>> 0;
    course = createCourse(mazeLevel, seed);
    player = {
      x: 86, y: GROUND_Y - PLAYER_H, w: PLAYER_W, h: PLAYER_H, vx: 0, vy: 0,
      grounded: true, coyote: .1, facing: 1, invulnerable: 0, runTime: 0,
      spawnX: 86, spawnY: GROUND_Y - PLAYER_H, standingOn: null
    };
    cameraX = 0;
    elapsed = 0;
    levelCoins = 0;
    completed = false;
    paused = false;
    running = !showMenu;
    hintTimer = 0;
    hintCooldown = 0;
    input.left = false;
    input.right = false;
    input.jumpBuffer = 0;
    dom.startOverlay.classList.toggle("visible", showMenu);
    dom.pauseOverlay.classList.remove("visible");
    dom.completeOverlay.classList.remove("visible");
    document.body.classList.toggle("playing", !showMenu);
    updateHud();
    if (!showMenu) {
      canvas.focus();
      showToast(`Run ${mazeLevel} generated — the traps moved`, 2.5);
    }
  }

  function updateHud() {
    dom.level.textContent = mazeLevel;
    dom.coin.textContent = `${levelCoins} / ${course.coins.length}`;
    dom.deaths.textContent = sessionDeaths;
    dom.time.textContent = formatTime(elapsed);
    dom.objective.textContent = !course.key.collected ? "Find the key" : !course.switch.active ? "Find the switch" : "Reach the portal";
    dom.menuLevel.textContent = save.highestLevel;
    dom.menuCoins.textContent = save.coins;
    dom.menuBest.textContent = save.bestTimes[mazeLevel] ? formatTime(save.bestTimes[mazeLevel]) : "—";
    dom.start.textContent = `Start Run ${mazeLevel}`;
    dom.sound.textContent = save.sound ? "Sound: On" : "Sound: Off";
    dom.sound.setAttribute("aria-pressed", String(save.sound));
    dom.hint.disabled = hintCooldown > 0;
    dom.hint.textContent = hintCooldown > 0 ? `${Math.ceil(hintCooldown)}s` : "Hint";
  }

  function movingRects() {
    const platforms = course.movingPlatforms.map(item => rect(item.x, item.y, item.w, item.h, "moving"));
    const walls = course.movingWalls.map(item => rect(item.x, item.y, item.w, item.h, "wall"));
    const fakes = course.fakeFloors.filter(item => !item.fallen).map(item => rect(item.x, item.y, item.w, item.h, "fake"));
    return [...course.platforms, ...platforms, ...walls, ...fakes, ...(course.door.open ? [] : [course.door])];
  }

  function requestJump() {
    if (!running || paused || completed) return;
    input.jumpBuffer = .14;
  }

  function updateMovingObjects(time) {
    course.movingPlatforms.forEach(item => {
      const oldX = item.x;
      const oldY = item.y;
      if (item.axis === "x") item.x = item.baseX + Math.sin(time * item.speed + item.phase) * item.range;
      else item.y = item.baseY + Math.sin(time * item.speed + item.phase) * item.range;
      item.dx = item.x - oldX;
      item.dy = item.y - oldY;
    });
    course.movingWalls.forEach(item => { item.y = item.baseY + Math.sin(time * item.speed + item.phase) * item.range; });
    course.movingHoles.forEach(item => { item.x = item.baseX + Math.sin(time * item.speed + item.phase) * item.range; });
  }

  function updatePlayer(dt) {
    input.jumpBuffer = Math.max(0, input.jumpBuffer - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.coyote = player.grounded ? .1 : Math.max(0, player.coyote - dt);

    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const acceleration = player.grounded ? 2200 : 1350;
    const targetSpeed = direction * RUN_SPEED;
    if (direction) player.vx += Math.sign(targetSpeed - player.vx) * Math.min(Math.abs(targetSpeed - player.vx), acceleration * dt);
    else player.vx *= Math.pow(.001, dt);
    if (direction) player.facing = direction;

    if (input.jumpBuffer > 0 && player.coyote > 0) {
      player.vy = -JUMP_SPEED;
      player.grounded = false;
      player.coyote = 0;
      input.jumpBuffer = 0;
      tone(310, .09, "triangle", 540);
    }

    player.vy = Math.min(900, player.vy + GRAVITY * dt);
    const solids = movingRects();
    player.standingOn = null;

    player.x += player.vx * dt;
    solids.forEach(solid => {
      if (!overlaps(player, solid)) return;
      if (player.vx > 0) player.x = solid.x - player.w;
      else if (player.vx < 0) player.x = solid.x + solid.w;
      player.vx = 0;
    });

    const previousBottom = player.y + player.h;
    player.y += player.vy * dt;
    player.grounded = false;
    solids.forEach(solid => {
      if (!overlaps(player, solid)) return;
      if (player.vy >= 0 && previousBottom <= solid.y + 10) {
        player.y = solid.y - player.h;
        player.vy = 0;
        player.grounded = true;
        player.standingOn = solid;
      } else if (player.vy < 0) {
        player.y = solid.y + solid.h;
        player.vy = 0;
      }
    });

    if (player.standingOn?.type === "moving") {
      const source = course.movingPlatforms.find(item => Math.abs(item.x - player.standingOn.x) < 2 && Math.abs(item.y - player.standingOn.y) < 2);
      if (source) { player.x += source.dx; player.y += source.dy; }
    }

    player.x = Math.max(0, Math.min(course.width - player.w, player.x));
    if (Math.abs(player.vx) > 20 && player.grounded) player.runTime += Math.abs(player.vx) * dt / 52;
    if (player.y > H + 100) respawn("Tamer fell into the maze");
  }

  function touching(item, padding = 0) {
    return overlaps(player, { x: item.x - padding, y: item.y - padding, w: item.w + padding * 2, h: item.h + padding * 2 });
  }

  function respawn(message) {
    if (player.invulnerable > 0) return;
    sessionDeaths += 1;
    save.deaths += 1;
    writeSave();
    player.x = player.spawnX;
    player.y = player.spawnY;
    player.vx = 0;
    player.vy = 0;
    player.invulnerable = 1;
    course.fakeFloors.forEach(item => { item.timer = 0; item.fallen = false; item.y = item.baseY; });
    cameraX = Math.max(0, player.x - W * .28);
    showToast(message, 1.7);
    tone(180, .22, "sawtooth", 65);
  }

  function spikeHit(spike) {
    return overlaps(player, { x: spike.x + 4, y: spike.y, w: spike.w - 8, h: spike.h });
  }

  function updateObjects(dt, time) {
    if (!course.key.collected && touching(course.key, 6)) {
      course.key.collected = true;
      showToast("Key found — now activate the switch", 2.2);
      melody([[660, 0, .08], [880, .09, .12]]);
    }
    if (!course.checkpoint.active && touching(course.checkpoint, 7)) {
      course.checkpoint.active = true;
      player.spawnX = course.checkpoint.x - 8;
      player.spawnY = course.checkpoint.y + 14;
      showToast("Checkpoint activated", 1.8);
      melody([[480, 0, .1], [640, .1, .14]]);
    }
    if (!course.switch.active && touching(course.switch, 7)) {
      course.switch.active = true;
      showToast("Switch activated — the door opened", 2);
      melody([[520, 0, .08], [690, .1, .08], [820, .2, .14]]);
    }
    course.door.open = course.key.collected && course.switch.active;

    course.coins.forEach(coin => {
      if (!coin.collected && touching(coin, 5)) {
        coin.collected = true;
        levelCoins += 1;
        save.coins += 1;
        writeSave();
        tone(820, .08, "sine", 1260);
      }
    });

    course.hiddenSpikes.forEach(spike => {
      const distance = player.x + player.w - spike.x;
      if (distance > -105 && distance < spike.w + 100) spike.reveal = Math.min(1, spike.reveal + dt * 5);
      if (spike.reveal > .55 && spikeHit({ ...spike, y: spike.y - spike.h * spike.reveal })) respawn("Hidden spikes! Back to checkpoint");
    });

    if (player.invulnerable <= 0 && course.spikes.some(spikeHit)) respawn("Spikes! Back to checkpoint");
    if (player.invulnerable <= 0 && course.movingHoles.some(hole => player.grounded && player.y + player.h > GROUND_Y - 16 && overlaps(player, hole))) respawn("The ground shifted beneath Tamer");
    if (player.invulnerable <= 0 && course.lasers.some(laser => laserActive(laser, time) && player.x < laser.x + 5 && player.x + player.w > laser.x - 5 && player.y < laser.y2 && player.y + player.h > laser.y1)) respawn("Laser trap! Back to checkpoint");

    course.fakeFloors.forEach(floor => {
      if (floor.fallen) { floor.y += 360 * dt; return; }
      const standing = player.grounded && player.x + player.w > floor.x && player.x < floor.x + floor.w && Math.abs(player.y + player.h - floor.y) < 8;
      if (standing) floor.timer += dt;
      if (floor.timer > .48) {
        floor.fallen = true;
        showToast("Fake floor!", 1);
        tone(140, .14, "square", 70);
      }
    });

    if (touching(course.portal, 4)) {
      if (!course.key.collected) showToast("The portal needs the key", 1.3);
      else if (!course.switch.active) showToast("The exit door is still locked", 1.3);
      else finishRun();
    }
  }

  function laserActive(laser, time) { return ((time + laser.phase) % laser.cycle) < laser.cycle * .62; }

  function finishRun() {
    if (completed) return;
    completed = true;
    running = false;
    document.body.classList.remove("playing");
    save.highestLevel = Math.max(save.highestLevel, mazeLevel + 1);
    save.bestTimes[mazeLevel] = save.bestTimes[mazeLevel] ? Math.min(save.bestTimes[mazeLevel], elapsed) : elapsed;
    writeSave();
    dom.completeStats.innerHTML = `<span>Time <strong>${formatTime(elapsed)}</strong></span><span>Coins <strong>${levelCoins}/${course.coins.length}</strong></span><span>Deaths <strong>${sessionDeaths}</strong></span>`;
    dom.completeOverlay.classList.add("visible");
    melody([[660, 0, .12], [820, .13, .12], [990, .27, .28]]);
    updateHud();
  }

  function showHint() {
    if (!running || paused || completed || hintCooldown > 0) return;
    hintTimer = 2.8;
    hintCooldown = 7;
    showToast("Cyan markers reveal the safe route", 2);
    tone(600, .08, "triangle", 820);
  }

  function update(dt, time) {
    if (!running || paused || completed) return;
    elapsed += dt;
    hintTimer = Math.max(0, hintTimer - dt);
    hintCooldown = Math.max(0, hintCooldown - dt);
    toastTimer = Math.max(0, toastTimer - dt);
    if (!toastTimer) dom.toast.classList.remove("visible");
    updateMovingObjects(time);
    updatePlayer(dt);
    updateObjects(dt, time);
    const targetCamera = Math.max(0, Math.min(course.width - W, player.x - W * .32));
    cameraX += (targetCamera - cameraX) * Math.min(1, dt * 5.5);
    updateHud();
  }

  function worldX(x) { return x - cameraX; }

  function drawBackground(time) {
    const night = mazeLevel % 3 === 0;
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, night ? "#081329" : "#67b9db");
    gradient.addColorStop(.67, night ? "#31445c" : "#d9c989");
    gradient.addColorStop(1, night ? "#65574b" : "#d2a760");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    const orbX = 120 + (mazeLevel * 97) % 700;
    ctx.fillStyle = night ? "rgba(238,246,255,.82)" : "rgba(255,241,159,.88)";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 28;
    ctx.beginPath(); ctx.arc(orbX, 92, night ? 34 : 43, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = night ? "rgba(212,229,255,.4)" : "rgba(255,255,220,.42)";
    for (let index = 0; index < 28; index += 1) {
      const x = (index * 173 - cameraX * .08) % (W + 80);
      const y = 38 + (index * 71) % 190;
      ctx.fillRect(x, y, index % 3 ? 2 : 3, index % 3 ? 2 : 3);
    }
    drawHills(.12, 370, night ? "#263b49" : "#8b9877", 96);
    drawHills(.22, 425, night ? "#182f3c" : "#6f806b", 76);
    drawRuins();
    ctx.strokeStyle = night ? "rgba(93,166,202,.12)" : "rgba(45,105,125,.11)";
    ctx.lineWidth = 1;
    for (let x = -((cameraX * .3) % 80); x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 80; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }

  function drawHills(parallax, base, color, height) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = -120; x <= W + 180; x += 150) {
      const offset = -((cameraX * parallax) % 150);
      ctx.lineTo(x + offset, base);
      ctx.lineTo(x + 75 + offset, base - height - ((x / 150) % 2) * 24);
      ctx.lineTo(x + 150 + offset, base);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }

  function drawRuins() {
    const offset = -((cameraX * .17) % 1250);
    ctx.fillStyle = "rgba(34,61,58,.32)";
    for (let repeat = -1; repeat < 2; repeat += 1) {
      const base = offset + repeat * 1250 + 680;
      ctx.fillRect(base, 270, 250, 180);
      for (let step = 0; step < 4; step += 1) ctx.fillRect(base + 28 + step * 22, 250 - step * 18, 194 - step * 44, 18);
      for (let row = 0; row < 3; row += 1) for (let column = 0; column < 5; column += 1) ctx.clearRect(base + 24 + column * 44, 305 + row * 38, 18, 20);
      drawPalm(base - 90, 450); drawPalm(base + 330, 450);
    }
  }

  function drawPalm(x, y) {
    ctx.strokeStyle = "rgba(28,65,55,.38)"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 8, y - 70, x, y - 118); ctx.stroke();
    ctx.lineWidth = 5;
    [-1.2, -.6, 0, .6, 1.2].forEach(angle => { ctx.beginPath(); ctx.moveTo(x, y - 118); ctx.quadraticCurveTo(x + Math.sin(angle) * 36, y - 142, x + Math.sin(angle) * 62, y - 120 + Math.cos(angle) * 12); ctx.stroke(); });
  }

  function drawPlatform(platform) {
    const x = worldX(platform.x);
    if (x > W + 50 || x + platform.w < -50) return;
    const gradient = ctx.createLinearGradient(0, platform.y, 0, platform.y + platform.h);
    gradient.addColorStop(0, platform.type === "door" ? "#ff4f9a" : "#2b5575");
    gradient.addColorStop(1, platform.type === "door" ? "#78284d" : "#172d4c");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, platform.y, platform.w, platform.h);
    ctx.fillStyle = platform.type === "door" ? "#ff8abb" : "#36bde0";
    ctx.fillRect(x, platform.y, platform.w, Math.min(4, platform.h));
    if (platform.type === "fake") {
      ctx.strokeStyle = "rgba(255,213,74,.72)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 12, platform.y + 2); ctx.lineTo(x + 33, platform.y + 13); ctx.lineTo(x + 53, platform.y + 4); ctx.lineTo(x + 76, platform.y + 15); ctx.stroke();
    }
  }

  function drawSpikes(spike, hidden = false) {
    const x = worldX(spike.x);
    const rise = hidden ? spike.reveal : 1;
    const top = spike.y - (hidden ? spike.h * rise : 0);
    const count = Math.max(2, Math.floor(spike.w / 18));
    ctx.fillStyle = hidden ? "#ff7db4" : "#ff4f9a";
    for (let index = 0; index < count; index += 1) {
      const sx = x + index * (spike.w / count);
      ctx.beginPath(); ctx.moveTo(sx, spike.y + spike.h); ctx.lineTo(sx + spike.w / count / 2, top); ctx.lineTo(sx + spike.w / count, spike.y + spike.h); ctx.fill();
    }
  }

  function drawWorld(time) {
    drawBackground(time);
    course.platforms.forEach(drawPlatform);
    course.movingPlatforms.forEach(item => drawPlatform({ ...item, type: "moving" }));
    course.movingWalls.forEach(item => drawPlatform({ ...item, type: "wall" }));
    course.fakeFloors.filter(item => item.y < H + 60).forEach(item => drawPlatform({ ...item, type: "fake" }));
    if (!course.door.open) drawPlatform(course.door);

    course.movingHoles.forEach(hole => {
      const x = worldX(hole.x);
      const gradient = ctx.createRadialGradient(x + hole.w / 2, GROUND_Y, 2, x + hole.w / 2, GROUND_Y, hole.w / 2);
      gradient.addColorStop(0, "#000"); gradient.addColorStop(1, "rgba(0,0,0,.15)");
      ctx.fillStyle = gradient; ctx.beginPath(); ctx.ellipse(x + hole.w / 2, GROUND_Y + 2, hole.w / 2, 13, 0, 0, Math.PI * 2); ctx.fill();
    });
    course.spikes.forEach(spike => drawSpikes(spike));
    course.hiddenSpikes.forEach(spike => drawSpikes(spike, true));

    course.lasers.forEach(laser => {
      const x = worldX(laser.x);
      const active = laserActive(laser, time);
      ctx.strokeStyle = active ? "#ff315f" : "rgba(255,49,95,.2)";
      ctx.lineWidth = active ? 5 : 2;
      ctx.shadowColor = active ? "#ff315f" : "transparent"; ctx.shadowBlur = active ? 14 : 0;
      ctx.beginPath(); ctx.moveTo(x, laser.y1); ctx.lineTo(x, laser.y2); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = "#55233a"; ctx.fillRect(x - 9, laser.y1 - 10, 18, 12); ctx.fillRect(x - 9, laser.y2, 18, 12);
    });

    if (hintTimer > 0) {
      ctx.fillStyle = `rgba(54,229,255,${Math.min(.65, hintTimer / 2)})`;
      course.route.forEach(node => { const x = worldX(node.x); if (x > -20 && x < W + 20) { ctx.beginPath(); ctx.arc(x, node.y - 18, 6, 0, Math.PI * 2); ctx.fill(); } });
    }

    course.coins.forEach(coin => {
      if (coin.collected) return;
      const x = worldX(coin.x + coin.w / 2);
      ctx.fillStyle = "#ffd54a"; ctx.shadowColor = "#ffd54a"; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(x, coin.y + 8, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = "#8b6414"; ctx.font = "900 8px Orbitron"; ctx.textAlign = "center"; ctx.fillText("Y", x, coin.y + 11);
    });

    drawItem(course.key, "#ffd54a", "K", course.key.collected);
    drawItem(course.switch, course.switch.active ? "#b8ff57" : "#ff9f43", "S", false);
    drawCheckpoint();
    drawPortal(time);
  }

  function drawItem(item, color, label, hidden) {
    if (hidden) return;
    const x = worldX(item.x);
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.roundRect(x, item.y, item.w, item.h, 7); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = "#07111b"; ctx.font = "900 13px Orbitron"; ctx.textAlign = "center"; ctx.fillText(label, x + item.w / 2, item.y + 21);
  }

  function drawCheckpoint() {
    const item = course.checkpoint;
    const x = worldX(item.x + 14);
    ctx.strokeStyle = item.active ? "#b8ff57" : "#36e5ff"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, item.y + 34); ctx.lineTo(x, item.y - 22); ctx.stroke();
    ctx.fillStyle = item.active ? "#b8ff57" : "#36e5ff";
    ctx.beginPath(); ctx.moveTo(x + 2, item.y - 20); ctx.lineTo(x + 28, item.y - 10); ctx.lineTo(x + 2, item.y); ctx.closePath(); ctx.fill();
  }

  function drawPortal(time) {
    const portal = course.portal;
    const x = worldX(portal.x + portal.w / 2);
    const open = course.key.collected && course.switch.active;
    ctx.strokeStyle = open ? "#36e5ff" : "#61728a"; ctx.lineWidth = 6;
    ctx.shadowColor = open ? "#36e5ff" : "transparent"; ctx.shadowBlur = open ? 20 : 0;
    ctx.beginPath(); ctx.ellipse(x, portal.y + portal.h / 2, 23 + Math.sin(time * 3) * 2, 40, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = open ? "rgba(54,229,255,.18)" : "rgba(70,82,98,.14)"; ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = open ? "#eaffff" : "#61728a"; ctx.font = "900 13px Orbitron"; ctx.textAlign = "center"; ctx.fillText("Y", x, portal.y + 47);
  }

  function drawPlayer() {
    const x = player.x - cameraX + player.w / 2;
    const y = player.y;
    const moving = Math.abs(player.vx) > 20 && player.grounded;
    const swing = moving ? Math.sin(player.runTime * 5.5) * 11 : 0;
    const alpha = player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 ? .35 : 1;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
    ctx.strokeStyle = "rgba(80,220,255,.45)"; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.arc(0, 10, 9, 0, Math.PI * 2); ctx.moveTo(0,19); ctx.lineTo(0,39); ctx.moveTo(0,26); ctx.lineTo(-12 - swing*.25,35); ctx.moveTo(0,26); ctx.lineTo(12 + swing*.25,35); ctx.moveTo(0,39); ctx.lineTo(-9 + swing,55); ctx.moveTo(0,39); ctx.lineTo(9 - swing,55); ctx.stroke();
    ctx.strokeStyle = "#020308"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 10, 9, 0, Math.PI * 2); ctx.moveTo(0,19); ctx.lineTo(0,39); ctx.moveTo(0,26); ctx.lineTo(-12 - swing*.25,35); ctx.moveTo(0,26); ctx.lineTo(12 + swing*.25,35); ctx.moveTo(0,39); ctx.lineTo(-9 + swing,55); ctx.moveTo(0,39); ctx.lineTo(9 - swing,55); ctx.stroke();
    ctx.fillStyle = "#36e5ff"; ctx.font = "900 8px Orbitron"; ctx.textAlign = "center"; ctx.fillText("Y", 0, 33);
    ctx.restore();
  }

  function draw(time) {
    drawWorld(time);
    drawPlayer();
    ctx.fillStyle = "rgba(234,244,255,.8)"; ctx.font = "900 8px Orbitron"; ctx.textAlign = "center";
    ctx.fillText("TAMER", player.x - cameraX + player.w / 2, player.y - 8);
    const progress = Math.max(0, Math.min(1, player.x / (course.width - 200)));
    ctx.fillStyle = "rgba(5,10,20,.68)"; ctx.fillRect(20, H - 18, W - 40, 6);
    ctx.fillStyle = "#36e5ff"; ctx.fillRect(20, H - 18, (W - 40) * progress, 6);
  }

  function loop(timestamp) {
    const time = timestamp / 1000;
    const dt = Math.min(.033, (timestamp - lastTime) / 1000 || 0);
    lastTime = timestamp;
    update(dt, time);
    draw(time);
    requestAnimationFrame(loop);
  }

  function setPaused(value) {
    if (!running || completed) return;
    paused = value;
    dom.pauseOverlay.classList.toggle("visible", paused);
    dom.pause.textContent = paused ? "Resume" : "Pause";
    if (!paused) canvas.focus();
  }

  function bindHold(button, key) {
    let pointer = null;
    const press = event => {
      event.preventDefault();
      userInteracted = true;
      if (pointer !== null) return;
      pointer = event.pointerId;
      button.setPointerCapture?.(event.pointerId);
      button.classList.add("active");
      input[key] = true;
    };
    const release = event => {
      if (event.pointerId !== pointer) return;
      event.preventDefault();
      pointer = null;
      input[key] = false;
      button.classList.remove("active");
    };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  }

  function bindTap(button, action) {
    const press = event => {
      event.preventDefault();
      userInteracted = true;
      button.setPointerCapture?.(event.pointerId);
      button.classList.add("active");
      action();
    };
    const release = event => { event.preventDefault(); button.classList.remove("active"); };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  }

  async function toggleFullscreen() {
    userInteracted = true;
    const active = document.fullscreenElement || document.webkitFullscreenElement;
    try {
      if (active) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) await exit.call(document);
      } else {
        const target = document.querySelector(".maze-card");
        const enter = target.requestFullscreen || target.webkitRequestFullscreen;
        if (enter) await enter.call(target);
        else showToast("Rotate sideways for full-screen play", 3);
      }
    } catch (_) { showToast("Rotate sideways for full-screen play", 3); }
  }

  window.addEventListener("keydown", event => {
    userInteracted = true;
    const map = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
    if (map[event.code]) { event.preventDefault(); input[map[event.code]] = true; }
    if (["ArrowUp", "KeyW", "Space"].includes(event.code)) { event.preventDefault(); if (!event.repeat) requestJump(); }
    if (event.code === "KeyH" && !event.repeat) showHint();
    if (event.code === "KeyR" && !event.repeat) buildRun(mazeLevel);
    if (event.code === "KeyP" && !event.repeat) setPaused(!paused);
  });
  window.addEventListener("keyup", event => {
    const map = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
    if (map[event.code]) input[map[event.code]] = false;
    if (["ArrowUp", "KeyW", "Space"].includes(event.code) && player.vy < -180) player.vy *= .55;
  });
  window.addEventListener("blur", () => {
    input.left = false; input.right = false;
    if (running && !completed) setPaused(true);
  });

  bindHold(document.getElementById("leftButton"), "left");
  bindHold(document.getElementById("rightButton"), "right");
  bindTap(dom.jump, requestJump);
  bindTap(dom.hint, showHint);
  ["touchstart", "touchmove"].forEach(type => dom.mobile.addEventListener(type, event => event.preventDefault(), { passive: false }));

  dom.start.addEventListener("click", () => { userInteracted = true; buildRun(mazeLevel); });
  dom.pause.addEventListener("click", () => setPaused(!paused));
  dom.resume.addEventListener("click", () => setPaused(false));
  dom.restart.addEventListener("click", () => buildRun(mazeLevel));
  dom.next.addEventListener("click", () => buildRun(mazeLevel + 1));
  dom.replay.addEventListener("click", () => buildRun(mazeLevel));
  dom.mobilePause.addEventListener("click", () => setPaused(true));
  dom.fullscreen.addEventListener("click", toggleFullscreen);
  dom.sound.addEventListener("click", () => {
    userInteracted = true;
    save.sound = !save.sound;
    writeSave();
    updateHud();
    if (save.sound) tone(520, .08, "triangle", 720);
  });
  document.addEventListener("pointerdown", () => { userInteracted = true; }, { once: true });
  document.addEventListener("visibilitychange", () => { if (document.hidden && running && !completed) setPaused(true); });
  window.addEventListener("beforeunload", writeSave);

  buildRun(mazeLevel, true);
  requestAnimationFrame(loop);
})();
