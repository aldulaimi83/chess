(() => {
  "use strict";

  const SAVE_KEY = "youooo_stickman_smart_escape_v1";
  const W = 960;
  const H = 540;
  const GRAVITY = 1850;
  const MOVE_ACCEL = 3200;
  const GROUND_FRICTION = 2600;
  const AIR_ACCEL = 2100;
  const MAX_SPEED = 285;
  const JUMP_SPEED = 625;
  const COYOTE = 0.1;
  const JUMP_BUFFER = 0.12;
  const PLAYER_W = 26;
  const PLAYER_H = 58;
  const WHISTLE_COOLDOWN = 8.6;
  const WHISTLE_TRAP_PAUSE = 2.4;

  const $ = (id) => document.getElementById(id);
  const canvas = $("smartCanvas");
  const ctx = canvas.getContext("2d");
  const ui = {
    level: $("levelReadout"), keys: $("keyReadout"), coins: $("coinReadout"), deaths: $("deathReadout"), time: $("timeReadout"), hint: $("hintReadout"),
    menu: $("menuOverlay"), pause: $("pauseOverlay"), complete: $("completeOverlay"), levels: $("levelOverlay"), toast: $("toast"),
    menuUnlocked: $("menuUnlocked"), menuCoins: $("menuCoins"), menuDeaths: $("menuDeaths"), grid: $("levelGrid"), completeStats: $("completeStats"),
    start: $("startButton"), pauseButton: $("pauseButton"), resume: $("resumeButton"), restart: $("restartButton"), next: $("nextButton"), replay: $("replayButton"),
    sound: $("soundButton"), fullscreen: $("fullscreenButton"), whistleButton: $("whistleButton"), background: $("backgroundMode"), controls: $("controlReadout")
  };

  const input = { left: false, right: false, jump: false, yoyo: false, jumpPressed: false, yoyoPressed: false };
  const save = loadSave();
  let levelIndex = Math.min(save.lastLevel || 0, save.unlocked - 1);
  let state = "menu";
  let soundOn = true;
  let lastTime = 0;
  let toastTimer = 0;
  let whistleCooldown = 0;
  let audioCtx = null;
  let whistleBus = null;
  let run = null;

  function rect(x, y, w, h, type = "solid", extra = {}) { return { x, y, w, h, type, ...extra }; }
  function coin(x, y) { return { x, y, r: 9, taken: false }; }
  function key(x, y) { return { x, y, w: 22, h: 18, taken: false }; }
  function saw(x, y, r = 18, dx = 0, dy = 0, period = 2, phase = 0) { return { x, y, sx: x, sy: y, r, dx, dy, period, phase, angle: 0 }; }
  function spike(x, y, w, h = 24) { return { x, y, w, h }; }
  function hiddenSpike(x, y, w, trigger = 82) { return { x, y, w, h: 25, trigger, armed: false, rise: 0 }; }
  function anchor(x, y, range = 245) { return { x, y, range }; }
  function button(x, y, id, hold = false) { return { x, y, w: 42, h: 12, id, hold, pressed: false, timer: 0 }; }
  function door(x, y, h = 88, id = null, keyDoor = false, seconds = 4) { return { x, y, w: 34, h, id, keyDoor, seconds, open: false, timer: 0 }; }
  function checkpoint(x, y) { return { x, y, w: 26, h: 42, active: false }; }
  function rock(x, y, trigger = 105) { return { x, y, sy: y, r: 14, trigger, armed: false, warning: 0, falling: false, vy: 0, done: false }; }
  function fakeDoor(x, y, label = "FAKE") { return { x, y, w: 38, h: 76, label, sprung: false }; }
  function yoyoSwitch(x, y, id) { return { x, y, r: 15, id, pulled: false }; }

  const base = {
    platforms: [rect(0, 500, 220, 40), rect(260, 470, 160, 30), rect(460, 430, 150, 30), rect(660, 390, 210, 30), rect(880, 500, 80, 40)],
    spikes: [spike(220, 516, 42), spike(610, 446, 44)], coins: [coin(335, 435), coin(530, 394), coin(744, 352)], keys: [key(736, 354)],
    saws: [], hiddenSpikes: [hiddenSpike(390, 516, 58)], anchors: [anchor(565, 300)], buttons: [], doors: [door(846, 412, 88, null, true)], checkpoints: [checkpoint(455, 388)],
    start: { x: 50, y: 440 }, exit: { x: 900, y: 432 }, hint: "Get the key"
  };

  const LEVELS = Array.from({ length: 20 }, (_, i) => makeLevel(i));
  if (LEVELS.length !== 20) throw new Error("Stickman Smart Escape requires exactly 20 levels");
  const HERITAGE_BACKGROUNDS = {
    0: "ziggurat", 1: "ishtar", 2: "palms", 3: "walls", 4: "dunes",
    5: "cuneiform", 6: "palms", 7: "ziggurat", 8: "ishtar", 9: "walls",
    10: "dunes", 11: "cuneiform", 12: "palms", 13: "walls", 14: "ziggurat",
    15: "ishtar", 16: "dunes", 17: "cuneiform", 18: "palms", 19: "walls"
  };

  function makeLevel(i) {
    const n = i + 1;
    const l = clone(base);
    l.name = `Chamber ${n}`;
    l.rocks = [];
    l.fakeDoors = [];
    l.switches = [];
    l.hint = ["Get the key", "Use F for yo-yo", "Watch the timing", "Press the button", "Look for hidden traps"][i % 5];
    l.platforms = [
      rect(0, 500, 180, 40),
      rect(225, 472 - (i % 3) * 12, 130, 28),
      rect(402, 442 - (i % 4) * 10, 116, 28, i > 2 && i % 4 === 2 ? "fall" : "solid", { delay: 0.28, fallVy: 0 }),
      rect(566, 420 - (i % 3) * 16, 120, 28, i > 3 && i % 5 === 1 ? "vanish" : "solid", { phase: i * 0.3, on: 1.05, off: 1.15 }),
      rect(742, 392 - (i % 4) * 12, 108, 28),
      rect(890, 500, 70, 40)
    ];
    if (i > 1) l.platforms.push(rect(260, 345, 112, 24, "move", { sx: 260, sy: 345, dx: 80 + i * 4, dy: i % 2 ? 42 : 0, period: 2.8 }));
    if (i > 3) l.platforms.push(rect(650, 300, 112, 24, "move", { sx: 650, sy: 300, dx: i % 2 ? -95 : 0, dy: 64, period: 2.4 }));
    if (i > 8) l.platforms.push(rect(126, 392, 86, 22, "vanish", { phase: 0.6, on: 1.05, off: 0.95 }));
    if (i > 12) l.platforms.push(rect(500, 265, 95, 22, "fall", { delay: 0.28, fallVy: 0 }));
    l.platforms.push(rect(330 + (i % 2) * 90, 366 - (i % 3) * 18, 94, 22, "trapShift", { sx: 330 + (i % 2) * 90, sy: 366 - (i % 3) * 18, dx: i % 2 ? -105 : 105, trigger: 120, speed: 3.8, activated: false, offset: 0 }));
    if (i > 4) l.platforms.push(rect(708, 255 + (i % 3) * 16, 86, 22, "trapSink", { sx: 708, sy: 255 + (i % 3) * 16, sink: 82, trigger: 92, speed: 4.6, activated: false, offset: 0 }));
    l.spikes = [spike(182, 516, 92), spike(356, 516, 88), spike(518, 516, 104), spike(686, 516, 82)];
    if (i > 4) l.spikes.push(spike(805, 408 - (i % 4) * 12, 42));
    l.hiddenSpikes = [hiddenSpike(290 + (i % 3) * 72, 516, 58), hiddenSpike(620, 516, 52)];
    if (i > 5) l.hiddenSpikes.push(hiddenSpike(766, 408 - (i % 4) * 12, 46, 68));
    if (i > 11) l.hiddenSpikes.push(hiddenSpike(498, 286, 54, 70));
    l.saws = [saw(472, 395, 18, 0, 72, 2.5, i * 0.2)];
    if (i > 2) l.saws.push(saw(635, 350, 20, 92, 0, 2.2, 0.4));
    if (i > 7) l.saws.push(saw(288, 286, 17, 72, 52, 2.8, 0.2));
    if (i > 13) l.saws.push(saw(785, 235, 20, -82, 62, 2.1, 0.8));
    l.anchors = [anchor(535, 282, 260)];
    if (i > 5) l.anchors.push(anchor(760, 215, 250));
    if (i > 13) l.anchors.push(anchor(310, 236, 230));
    l.keys = [key(i % 2 ? 316 : 760, i % 2 ? 306 : 348)];
    if (i > 9) l.keys.push(key(570, 224));
    l.coins = [coin(246, 430), coin(474, 398), coin(622, 376), coin(790, 350)];
    if (i > 3) l.coins.push(coin(545, 246));
    if (i > 8) l.coins.push(coin(318, 265));
    if (i > 14) l.coins.push(coin(820, 205));
    l.checkpoints = [checkpoint(i > 9 ? 500 : 410, i > 9 ? 220 : 398), checkpoint(725, 348)];
    l.buttons = [];
    l.doors = [door(846, 412, 88, null, true)];
    if (i > 3) {
      l.buttons.push(button(432, 430 - (i % 4) * 10, "A", i % 3 === 0));
      l.doors.push(door(695, 332 - (i % 3) * 16, 88, "A", false, 3.3 + (i % 4) * 0.45));
      l.hint = i % 3 === 0 ? "Hold the button" : "Timed door";
    }
    if (i > 13) {
      l.buttons.push(button(120, 488, "B", false));
      l.doors.push(door(372, 254, 82, "B", false, 2.6));
    }
    tuneLevel(l, i);
    l.start = { x: 46, y: 440 };
    l.exit = { x: 904, y: 432 };
    return l;
  }

  function tuneLevel(l, i) {
    if (i === 0) {
      l.hint = "Get the key, then the door";
      l.platforms = [rect(0, 500, 260, 40), rect(320, 462, 150, 28), rect(540, 432, 150, 28), rect(740, 500, 220, 40)];
      l.spikes = [spike(485, 516, 44)];
      l.hiddenSpikes = [];
      l.saws = [];
      l.keys = [key(580, 394)];
      l.coins = [coin(360, 424), coin(515, 486), coin(805, 462)];
      l.doors = [door(845, 412, 88, null, true)];
      l.checkpoints = [checkpoint(520, 390)];
    } else if (i === 1) {
      l.hint = "Hidden spikes warn first";
      l.hiddenSpikes = [hiddenSpike(378, 516, 76, 95), hiddenSpike(655, 516, 60, 82)];
      l.spikes = [spike(520, 516, 52)];
      l.saws = [];
      l.keys = [key(760, 302)];
      l.coins = [coin(350, 470), coin(405, 470), coin(650, 470), coin(770, 264)];
      l.hint = "Hidden spikes warn first";
    } else if (i === 2) {
      l.hint = "Floor cracks before it falls";
      l.platforms.push(rect(455, 386, 120, 24, "fall", { delay: 0.18, fallVy: 0 }));
      l.rocks.push(rock(618, 78, 100));
      l.coins.push(coin(510, 348));
    } else if (i === 3) {
      l.hint = "Pull the switch with F";
      l.switches.push(yoyoSwitch(610, 300, "S1"));
      l.doors.push(door(690, 332, 88, "S1", false, 99));
      l.anchors.push(anchor(610, 300, 320));
      l.coins.push(coin(628, 264));
    } else if (i === 4) {
      l.hint = "Whistle reveals the path";
      l.platforms.push(rect(505, 335, 120, 22, "whistle", { revealed: false }));
      l.platforms.push(rect(650, 292, 100, 22, "whistle", { revealed: false }));
      l.fakeDoors.push(fakeDoor(838, 424, "FAKE"));
      l.doors = [door(888, 412, 88, null, true)];
      l.keys = [key(690, 252)];
    } else {
      if (i % 2 === 0) l.rocks.push(rock(420 + (i * 41) % 240, 70, 105));
      if (i % 3 === 0) l.fakeDoors.push(fakeDoor(820, 392 - (i % 4) * 12));
      if (i % 4 === 0) {
        l.platforms.push(rect(530, 315, 106, 22, "whistle", { revealed: false }));
        l.hint = "Whistle reveals secrets";
      }
      if (i % 5 === 0) {
        l.switches.push(yoyoSwitch(580, 275, `Y${i}`));
        l.doors.push(door(702, 318, 92, `Y${i}`, false, 99));
        l.hint = "Yo-yo switch first";
      }
    }
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function loadSave() {
    const fallback = { unlocked: 1, lastLevel: 0, deaths: 0, coins: 0, best: {}, levelCoins: {}, backgroundMode: "night", yoyoUnlocked: true };
    try {
      const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      const merged = { ...fallback, ...(parsed || {}), unlocked: Math.max(1, parsed?.unlocked || 1) };
      if (!["night", "day", "dynamic"].includes(merged.backgroundMode)) merged.backgroundMode = "night";
      merged.yoyoUnlocked = true;
      return merged;
    } catch (_) { return fallback; }
  }

  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {}
  }

  function newRun(index) {
    const level = clone(LEVELS[index]);
    level.platforms.forEach((p) => {
      if (p.type === "trapShift" && Math.random() < 0.45) p.dx *= -1;
      if ((p.type === "trapShift" || p.type === "trapSink") && Math.random() < 0.35) p.speed += 1.2;
      p.baseX = p.x; p.baseY = p.y; p.startY = p.y; p.fallTimer = 0; p.used = false; p.visible = p.type === "whistle" ? !!p.revealed : true; p.activated = p.activated || false; p.offset = p.offset || 0; p.prevX = p.x; p.prevY = p.y;
    });
    level.hiddenSpikes.forEach((s) => { s.trigger += Math.floor(Math.random() * 28) - 10; });
    (level.rocks || []).forEach((r) => { r.sy = r.y; r.warning = 0; r.falling = false; r.vy = 0; r.done = false; });
    run = {
      level, time: 0, levelCoins: 0, levelDeaths: 0, keys: 0, neededKeys: level.keys.length, won: false, pausedAt: 0, trapPause: 0, whistleReveal: 0,
      player: { x: level.start.x, y: level.start.y, vx: 0, vy: 0, facing: 1, grounded: false, coyote: 0, jumpBuffer: 0, jumpHeld: false, checkpoint: { ...level.start }, hurt: 0, runTime: 0 },
      yoyo: { active: false, anchor: null, t: 0 }
    };
    updateHud();
    toast(level.hint);
    whistleCooldown = 0;
    canvas.focus({ preventScroll: true });
  }

  function showOverlay(name) {
    [ui.menu, ui.pause, ui.complete, ui.levels].forEach((el) => el.classList.remove("visible"));
    if (name) ui[name].classList.add("visible");
  }

  function startLevel(index = levelIndex) {
    levelIndex = Math.max(0, Math.min(index, save.unlocked - 1, LEVELS.length - 1));
    save.lastLevel = levelIndex;
    writeSave();
    newRun(levelIndex);
    state = "playing";
    showOverlay(null);
  }

  function pauseGame() {
    if (state !== "playing") return;
    state = "paused";
    showOverlay("pause");
  }

  function resumeGame() {
    if (state !== "paused") return;
    state = "playing";
    showOverlay(null);
    canvas.focus({ preventScroll: true });
  }

  function die(reason = "Try again") {
    const p = run.player;
    if (p.hurt > 0 || run.won) return;
    p.hurt = 0.55;
    save.deaths += 1;
    run.levelDeaths += 1;
    writeSave();
    beep(110, 0.08, "sawtooth");
    toast(reason);
    setTimeout(() => respawn(), 180);
  }

  function respawn() {
    if (!run || run.won) return;
    const p = run.player;
    p.x = p.checkpoint.x;
    p.y = p.checkpoint.y;
    p.vx = 0; p.vy = 0; p.hurt = 0.25; p.grounded = false;
    run.yoyo.active = false;
    updateHud();
  }

  function completeLevel() {
    if (run.won) return;
    run.won = true;
    state = "complete";
    const elapsed = Math.floor(run.time * 1000);
    const best = save.best[levelIndex];
    if (!best || elapsed < best) save.best[levelIndex] = elapsed;
    if (!save.levelCoins[levelIndex]) save.levelCoins[levelIndex] = 0;
    save.levelCoins[levelIndex] = Math.max(save.levelCoins[levelIndex], run.levelCoins);
    save.coins = Object.values(save.levelCoins).reduce((sum, n) => sum + Number(n || 0), 0);
    if (levelIndex + 1 < LEVELS.length) save.unlocked = Math.max(save.unlocked, levelIndex + 2);
    writeSave();
    renderLevelGrid();
    updateMenuStats();
    ui.completeStats.innerHTML = `<span>Time <strong>${formatTime(run.time)}</strong></span><span>Coins <strong>${run.levelCoins}/${run.level.coins.length}</strong></span><span>Deaths <strong>${run.levelDeaths}</strong></span><span>Best <strong>${formatMs(save.best[levelIndex])}</strong></span>`;
    ui.next.textContent = levelIndex + 1 < LEVELS.length ? "Next Level" : "Replay Finale";
    beep(660, 0.08, "triangle");
    setTimeout(() => beep(880, 0.1, "triangle"), 90);
    showOverlay("complete");
  }

  function update(dt) {
    if (!run || state !== "playing") return;
    dt = Math.min(dt, 0.033);
    run.time += dt;
    whistleCooldown = Math.max(0, whistleCooldown - dt);
    run.trapPause = Math.max(0, run.trapPause - dt);
    run.whistleReveal = Math.max(0, run.whistleReveal - dt);
    toastTimer = Math.max(0, toastTimer - dt);
    if (toastTimer === 0) ui.toast.classList.remove("show");

    updateWorld(dt);
    updatePlayer(dt);
    updateCollectibles();
    updateHud();
  }

  function updateWorld(dt) {
    const t = run.time;
    run.level.platforms.forEach((p) => {
      p.prevX = p.x; p.prevY = p.y;
      if (p.type === "whistle") p.visible = !!p.revealed || run.whistleReveal > 0;
      if (p.type === "move") {
        const wave = Math.sin(((t / p.period) + (p.phase || 0)) * Math.PI * 2);
        p.x = p.sx + (p.dx || 0) * wave;
        p.y = p.sy + (p.dy || 0) * wave;
      }
      if (p.type === "vanish" && run.trapPause <= 0) {
        const cycle = (p.on || 1.3) + (p.off || 1);
        p.visible = ((t + (p.phase || 0)) % cycle) < (p.on || 1.3);
      }
      if (p.type === "fall" && p.used && run.trapPause <= 0) {
        p.fallTimer += dt;
        if (p.fallTimer > (p.delay || 0.35)) p.y += (p.fallVy += GRAVITY * dt * 0.5) * dt;
        if (p.y > H + 80) { p.y = p.startY; p.fallVy = 0; p.fallTimer = 0; p.used = false; }
      }
      if ((p.type === "trapShift" || p.type === "trapSink") && run.trapPause <= 0) {
        const px = run.player.x + PLAYER_W / 2;
        const py = run.player.y + PLAYER_H;
        const near = Math.abs(px - (p.x + p.w / 2)) < (p.trigger || 100) && Math.abs(py - p.y) < 88;
        const standing = run.player.x + PLAYER_W > p.x && run.player.x < p.x + p.w && Math.abs(py - p.y) < 10;
        if (near || standing) p.activated = true;
        p.offset = approach(p.offset || 0, p.activated ? 1 : 0, dt * (p.speed || 4));
        if (p.type === "trapShift") {
          const shake = p.activated && p.offset < 1 ? Math.sin(run.time * 48) * 2 : 0;
          p.x = p.sx + (p.dx || 0) * easeOutCubic(p.offset) + shake;
        } else {
          const shake = p.activated && p.offset < 1 ? Math.sin(run.time * 40) * 1.5 : 0;
          p.y = p.sy + (p.sink || 72) * easeOutCubic(p.offset) + shake;
        }
      }
    });
    run.level.saws.forEach((s) => {
      if (run.trapPause > 0) return;
      const wave = Math.sin(((t / s.period) + s.phase) * Math.PI * 2);
      s.x = s.sx + s.dx * wave;
      s.y = s.sy + s.dy * wave;
      s.angle += dt * 8;
    });
    run.level.hiddenSpikes.forEach((s) => {
      if (run.trapPause > 0) return;
      const px = run.player.x + PLAYER_W / 2;
      const py = run.player.y + PLAYER_H;
      const close = Math.abs(px - (s.x + s.w / 2)) < s.trigger && Math.abs(py - (s.y + s.h / 2)) < 96;
      s.armed = s.armed || close;
      s.rise = approach(s.rise || 0, s.armed ? 1 : 0, dt * 5.5);
    });
    run.level.rocks.forEach((r) => {
      if (r.done || run.trapPause > 0) return;
      const px = run.player.x + PLAYER_W / 2;
      if (!r.armed && Math.abs(px - r.x) < r.trigger) {
        r.armed = true;
        r.warning = 0.42;
        toast("Ceiling trap!");
      }
      if (r.armed && !r.falling) {
        r.warning -= dt;
        if (r.warning <= 0) r.falling = true;
      }
      if (r.falling) {
        r.vy += GRAVITY * dt * 0.55;
        r.y += r.vy * dt;
        if (r.y > H + 40) r.done = true;
      }
    });
    const p = run.player;
    run.level.buttons.forEach((b) => {
      const pressed = overlap(p, b);
      b.pressed = pressed || (!b.hold && b.timer > 0);
      if (pressed) b.timer = 1;
      else b.timer = Math.max(0, b.timer - dt);
    });
    run.level.doors.forEach((d) => {
      if (d.keyDoor) d.open = run.keys >= run.neededKeys;
      else {
        const linkedButton = run.level.buttons.find((b) => b.id === d.id);
        const linkedSwitch = run.level.switches.find((s) => s.id === d.id && s.pulled);
        if (linkedButton?.pressed || linkedSwitch) d.timer = d.seconds;
        else d.timer = Math.max(0, d.timer - dt);
        d.open = d.timer > 0;
      }
    });
  }

  function updatePlayer(dt) {
    const p = run.player;
    p.hurt = Math.max(0, p.hurt - dt);
    if (Math.abs(p.vx) > 20 && p.grounded) p.runTime += dt * Math.abs(p.vx) / 95;
    p.jumpBuffer = input.jumpPressed ? JUMP_BUFFER : Math.max(0, p.jumpBuffer - dt);
    input.jumpPressed = false;
    if (input.yoyoPressed) toggleYoyo();
    input.yoyoPressed = false;

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir) p.facing = dir;
    const accel = p.grounded ? MOVE_ACCEL : AIR_ACCEL;
    p.vx += dir * accel * dt;
    if (!dir && p.grounded) p.vx = approach(p.vx, 0, GROUND_FRICTION * dt);
    p.vx = clamp(p.vx, -MAX_SPEED, MAX_SPEED);

    if (run.yoyo.active && run.yoyo.anchor) {
      run.yoyo.t += dt;
      const a = run.yoyo.anchor;
      const cx = p.x + PLAYER_W / 2;
      const cy = p.y + 18;
      const dx = a.x - cx;
      const dy = a.y - cy;
      const dist = Math.max(1, Math.hypot(dx, dy));
      p.vx += (dx / dist) * 1320 * dt;
      p.vy += (dy / dist) * 1160 * dt;
      if (dist < 36 || run.yoyo.t > 0.95) run.yoyo.active = false;
    }

    if (p.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = -JUMP_SPEED;
      p.grounded = false;
      p.coyote = 0;
      p.jumpBuffer = 0;
      p.jumpHeld = true;
      beep(280, 0.035, "square");
    }
    if (!input.jump && p.jumpHeld && p.vy < -210) p.vy = -210;
    if (!input.jump) p.jumpHeld = false;

    p.vy += GRAVITY * dt;
    p.vy = Math.min(p.vy, 920);
    movePlayer(p, dt);
    p.coyote = p.grounded ? COYOTE : Math.max(0, p.coyote - dt);
    if (p.y > H + 70) die("Back to checkpoint");

    run.level.spikes.forEach((s) => { if (hitSpike(p, s)) die("Spikes punish rushing"); });
    run.level.hiddenSpikes.forEach((s) => { if (s.rise > 0.45 && hitSpike(p, { ...s, y: s.y + (1 - s.rise) * s.h })) die("Hidden trap sprung"); });
    run.level.saws.forEach((s) => { if (circleRect(s.x, s.y, s.r, p.x, p.y, PLAYER_W, PLAYER_H)) die("Watch the saw rhythm"); });
    run.level.rocks.forEach((r) => { if (!r.done && r.falling && circleRect(r.x, r.y, r.r, p.x, p.y, PLAYER_W, PLAYER_H)) die("Ceiling trap dropped"); });
    run.level.fakeDoors.forEach((f) => {
      if (!f.sprung && overlap(p, f)) {
        f.sprung = true;
        die("Fake door. Look for the real route.");
      }
    });
    run.level.doors.forEach((d) => { if (!d.open && overlap(p, d)) pushOutDoor(p, d); });
    run.level.checkpoints.forEach((c) => {
      if (!c.active && overlap(p, c)) {
        c.active = true;
        p.checkpoint = { x: c.x - 4, y: c.y - 8 };
        toast("Checkpoint");
        beep(520, 0.06, "triangle");
      }
    });
    if (overlap(p, { x: run.level.exit.x, y: run.level.exit.y - 70, w: 38, h: 76 }) && run.keys >= run.neededKeys) completeLevel();
  }

  function movePlayer(p, dt) {
    p.x += p.vx * dt;
    collideAxis(p, "x");
    p.y += p.vy * dt;
    p.grounded = false;
    collideAxis(p, "y");
    p.x = clamp(p.x, 0, W - PLAYER_W);
  }

  function collideAxis(p, axis) {
    for (const o of solidObjects()) {
      if (!overlap(p, o)) continue;
      if (axis === "x") {
        if (p.vx > 0) p.x = o.x - PLAYER_W;
        else if (p.vx < 0) p.x = o.x + o.w;
        p.vx = 0;
      } else {
        if (p.vy > 0) {
          p.y = o.y - PLAYER_H;
          p.vy = 0;
          p.grounded = true;
          if (o.type === "fall") o.used = true;
          if (o.type === "move" || o.type === "trapShift" || o.type === "trapSink") {
            p.x += (o.x - (o.prevX ?? o.x));
            p.y += (o.y - (o.prevY ?? o.y));
          }
        } else if (p.vy < 0) {
          p.y = o.y + o.h;
          p.vy = 0;
        }
      }
    }
  }

  function solidObjects() {
    const platforms = run.level.platforms.filter((p) => p.visible !== false && p.y < H + 60);
    const closedDoors = run.level.doors.filter((d) => !d.open).map((d) => ({ ...d, type: "door" }));
    return platforms.concat(closedDoors);
  }

  function updateCollectibles() {
    const p = run.player;
    run.level.coins.forEach((c) => {
      if (!c.taken && circleRect(c.x, c.y, c.r, p.x, p.y, PLAYER_W, PLAYER_H)) {
        c.taken = true;
        run.levelCoins += 1;
        beep(740, 0.035, "sine");
      }
    });
    run.level.keys.forEach((k) => {
      if (!k.taken && overlap(p, k)) {
        k.taken = true;
        run.keys += 1;
        toast(run.keys >= run.neededKeys ? "Exit door unlocked" : "Key collected");
        beep(920, 0.07, "triangle");
      }
    });
  }

  function toggleYoyo() {
    if (run.yoyo.active) { run.yoyo.active = false; return; }
    const p = run.player;
    const cx = p.x + PLAYER_W / 2;
    const cy = p.y + 18;
    let best = null;
    let bestScore = Infinity;
    run.level.anchors.forEach((a) => {
      const dx = a.x - cx;
      const dy = a.y - cy;
      const dist = Math.hypot(dx, dy);
      const facingOk = Math.sign(dx || p.facing) === p.facing || dist < 90;
      if (dist <= a.range && facingOk && dist < bestScore) { best = a; bestScore = dist; }
    });
    run.level.switches.forEach((s) => {
      if (s.pulled) return;
      const dx = s.x - cx;
      const dy = s.y - cy;
      const dist = Math.hypot(dx, dy);
      const facingOk = Math.sign(dx || p.facing) === p.facing || dist < 90;
      if (dist <= 340 && facingOk && dist < bestScore) { best = s; bestScore = dist; }
    });
    if (best) {
      if ("pulled" in best) {
        best.pulled = true;
        playSound("yoyoHook");
        toast("Yo-yo switch pulled");
        return;
      }
      run.yoyo.active = true;
      run.yoyo.anchor = best;
      run.yoyo.t = 0;
      playSound("yoyoThrow");
      setTimeout(() => { if (run?.yoyo?.active) playSound("yoyoHook"); }, 80);
    } else {
      toast("No yo-yo anchor in range");
    }
  }

  function yoyoAvailable() {
    return true;
  }

  function gameplayWhistle() {
    if (!run || state !== "playing" || whistleCooldown > 0) return;
    whistleCooldown = WHISTLE_COOLDOWN;
    run.trapPause = WHISTLE_TRAP_PAUSE;
    run.whistleReveal = WHISTLE_TRAP_PAUSE + 1.4;
    run.level.platforms.forEach((p) => { if (p.type === "whistle") p.revealed = true; });
    run.level.fakeDoors.forEach((d) => { d.revealed = true; });
    toast("Whistle reveals secrets and pauses traps");
    playSound("whistle");
    updateHud();
  }

  function pushOutDoor(p, d) {
    const left = p.x + PLAYER_W - d.x;
    const right = d.x + d.w - p.x;
    const top = p.y + PLAYER_H - d.y;
    const bottom = d.y + d.h - p.y;
    const min = Math.min(left, right, top, bottom);
    if (min === left) p.x = d.x - PLAYER_W;
    else if (min === right) p.x = d.x + d.w;
    else if (min === top) { p.y = d.y - PLAYER_H; p.vy = 0; p.grounded = true; }
    else { p.y = d.y + d.h; p.vy = Math.max(0, p.vy); }
    if (d.keyDoor && run.keys < run.neededKeys) toast("Need the key");
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    if (!run) newRun(levelIndex);
    const l = run.level;
    l.platforms.forEach(drawPlatform);
    l.hiddenSpikes.forEach(drawHiddenSpike);
    l.spikes.forEach(drawSpike);
    l.doors.forEach(drawDoor);
    l.fakeDoors.forEach(drawFakeDoor);
    l.buttons.forEach(drawButton);
    l.switches.forEach(drawYoyoSwitch);
    l.checkpoints.forEach(drawCheckpoint);
    l.anchors.forEach(drawAnchor);
    l.coins.forEach(drawCoin);
    l.keys.forEach(drawKey);
    drawExit(l.exit, run.keys >= run.neededKeys);
    l.saws.forEach(drawSaw);
    l.rocks.forEach(drawRock);
    drawPlayer();
    drawYoyo();
    drawTamerName();
    drawForeground();
  }

  function drawBackground() {
    const palette = backgroundPalette();
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, palette.top);
    gradient.addColorStop(0.62, palette.middle);
    gradient.addColorStop(1, palette.bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    if (save.backgroundMode === "day") {
      ctx.fillStyle = "rgba(255,243,177,.82)";
      ctx.shadowColor = "rgba(255,229,125,.7)";
      ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.arc(120, 100, 42, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(116,93,58,.14)";
      ctx.beginPath(); ctx.moveTo(0, 410); ctx.quadraticCurveTo(220, 320, 450, 410); ctx.quadraticCurveTo(690, 330, W, 405); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    } else if (save.backgroundMode === "night") {
      ctx.fillStyle = "rgba(228,241,255,.8)";
      ctx.shadowColor = "rgba(154,205,255,.65)";
      ctx.shadowBlur = 24;
      ctx.beginPath(); ctx.arc(120, 100, 35, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = palette.top;
      ctx.beginPath(); ctx.arc(137, 88, 34, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = `${palette.accent}55`;
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = 28;
      ctx.beginPath(); ctx.arc(120, 100, 31 + Math.sin(run.time * .7) * 4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.save();
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x < W + 80; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 60; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();

    if (save.backgroundMode === "dynamic") {
      for (let i = 0; i < 12; i += 1) {
        const x = (i * 179 + Math.sin(run.time * .13 + i) * 24) % (W + 120) - 30;
        const y = 70 + (i * 97 + levelIndex * 31) % 320;
        const size = 18 + (i * 7 + levelIndex * 3) % 42;
        ctx.save(); ctx.translate(x, y); ctx.rotate(run.time * .06 * (i % 2 ? 1 : -1) + i); ctx.globalAlpha = .09 + (i % 3) * .025; ctx.fillStyle = palette.accent;
        ctx.beginPath();
        if ((i + levelIndex) % 3 === 0) ctx.arc(0, 0, size, 0, Math.PI * 2);
        else if ((i + levelIndex) % 3 === 1) { ctx.moveTo(0, -size); ctx.lineTo(size, size); ctx.lineTo(-size, size); ctx.closePath(); }
        else { ctx.moveTo(0, -size); ctx.lineTo(size, 0); ctx.lineTo(0, size); ctx.lineTo(-size, 0); ctx.closePath(); }
        ctx.fill(); ctx.restore();
      }
    }

    for (let i = 0; i < 20; i += 1) {
      const x = (i * 157 + Math.sin(run.time * .05 + i) * 18) % (W + 120) - 60;
      const y = 45 + (i * 83) % 310;
      ctx.fillStyle = i % 3 ? palette.spark : "rgba(184,255,87,.18)";
      ctx.fillRect(x, y, 2, 2);
    }
    drawHeritageBackground(palette);
  }

  function backgroundPalette() {
    if (save.backgroundMode === "day") return { top: "#8fc9df", middle: "#e4ce96", bottom: "#987a52", grid: "rgba(91,76,48,.09)", spark: "rgba(255,248,198,.46)", accent: "#6d6247" };
    if (save.backgroundMode === "dynamic") {
      const palettes = [
        ["#30155a", "#11183d", "#07101f", "#b284ff"], ["#0b4553", "#102947", "#07121e", "#36e5ff"],
        ["#542039", "#251631", "#090c18", "#ff6b9f"], ["#384714", "#183126", "#07130f", "#b8ff57"]
      ];
      const palette = palettes[levelIndex % palettes.length];
      return { top: palette[0], middle: palette[1], bottom: palette[2], grid: "rgba(255,255,255,.055)", spark: `${palette[3]}66`, accent: palette[3] };
    }
    return { top: "#111b36", middle: "#091123", bottom: "#050912", grid: "rgba(54,229,255,.065)", spark: "rgba(54,229,255,.16)", accent: "#36e5ff" };
  }

  function drawPalm(x, groundY, scale, ink) {
    ctx.strokeStyle = ink; ctx.lineWidth = 7 * scale; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, groundY); ctx.quadraticCurveTo(x - 8 * scale, groundY - 55 * scale, x + 3 * scale, groundY - 112 * scale); ctx.stroke();
    for (let i = 0; i < 7; i += 1) {
      const angle = -Math.PI + i * Math.PI / 3;
      ctx.beginPath(); ctx.moveTo(x + 3 * scale, groundY - 112 * scale); ctx.quadraticCurveTo(x + Math.cos(angle) * 35 * scale, groundY - 128 * scale + Math.sin(angle) * 18 * scale, x + Math.cos(angle) * 53 * scale, groundY - 106 * scale + Math.sin(angle) * 24 * scale); ctx.stroke();
    }
  }

  function drawCuneiformStone(x, y, scale, ink) {
    ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(x - 34 * scale, y); ctx.lineTo(x - 27 * scale, y - 60 * scale); ctx.lineTo(x + 24 * scale, y - 68 * scale); ctx.lineTo(x + 35 * scale, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = save.backgroundMode === "day" ? "rgba(255,245,199,.55)" : "rgba(5,10,23,.55)"; ctx.lineWidth = 2;
    for (let row = 0; row < 4; row += 1) for (let mark = 0; mark < 3; mark += 1) {
      const px = x - 18 * scale + mark * 17 * scale;
      const py = y - 50 * scale + row * 12 * scale;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 7 * scale, py + 3 * scale); ctx.lineTo(px + 2 * scale, py + 7 * scale); ctx.stroke();
    }
  }

  function drawHeritageBackground(palette) {
    const scene = HERITAGE_BACKGROUNDS[levelIndex];
    if (!scene) return;
    const ink = save.backgroundMode === "day" ? "#6d6247" : palette.accent;
    const dark = save.backgroundMode === "day" ? "#8a7958" : "#10142a";
    ctx.save();
    ctx.globalAlpha = save.backgroundMode === "day" ? .18 : .16;
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(0, 420); ctx.quadraticCurveTo(150, 315, 330, 410); ctx.quadraticCurveTo(505, 325, 690, 412); ctx.quadraticCurveTo(830, 350, W, 414); ctx.lineTo(W, 450); ctx.lineTo(0, 450); ctx.closePath(); ctx.fill();
    ctx.globalAlpha *= .7;
    ctx.beginPath(); ctx.moveTo(0, 430); ctx.quadraticCurveTo(240, 370, 470, 425); ctx.quadraticCurveTo(720, 360, W, 428); ctx.lineTo(W, 460); ctx.lineTo(0, 460); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = save.backgroundMode === "day" ? .2 : .18;
    if (scene === "ziggurat" || scene === "cuneiform") {
      ctx.fillStyle = ink;
      for (let step = 0; step < 5; step += 1) ctx.fillRect(520 + step * 24, 388 - step * 43, 290 - step * 48, 43);
      ctx.fillRect(622, 174, 86, 42);
      drawPalm(450, 420, .85, ink); drawPalm(825, 420, .72, ink); drawCuneiformStone(875, 420, .78, ink);
      if (scene === "cuneiform") { drawCuneiformStone(150, 420, 1.15, ink); drawCuneiformStone(270, 420, .9, ink); }
    } else if (scene === "ishtar") {
      ctx.fillStyle = ink; ctx.fillRect(585, 270, 170, 150);
      for (let i = 0; i < 7; i += 1) ctx.fillRect(580 + i * 27, 251 + (i % 2) * 8, 18, 25);
      ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(670, 366, 38, Math.PI, 0); ctx.lineTo(708, 420); ctx.lineTo(632, 420); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 4;
      for (let row = 0; row < 3; row += 1) for (let col = 0; col < 5; col += 1) ctx.strokeRect(602 + col * 29, 290 + row * 31, 15, 11);
      drawPalm(500, 420, .62, ink); drawPalm(825, 420, .58, ink);
    } else if (scene === "palms") {
      drawPalm(180, 420, 1.05, ink); drawPalm(370, 420, .72, ink); drawPalm(650, 420, 1.12, ink); drawPalm(840, 420, .82, ink);
      ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(520, 420, 180, 18, 0, Math.PI, 0); ctx.fill(); drawCuneiformStone(510, 420, .7, ink);
    } else if (scene === "walls") {
      ctx.fillStyle = ink; ctx.fillRect(60, 330, 840, 90);
      for (let x = 60; x < 900; x += 58) ctx.fillRect(x, 304, 35, 34);
      ctx.strokeStyle = dark; ctx.lineWidth = 3;
      for (let row = 0; row < 3; row += 1) for (let x = 80 - row * 20; x < 890; x += 72) ctx.strokeRect(x, 344 + row * 25, 46, 15);
      drawCuneiformStone(770, 420, .8, ink);
    } else if (scene === "dunes") {
      drawPalm(180, 420, .55, ink); drawPalm(790, 420, .62, ink); drawCuneiformStone(680, 420, .76, ink);
    }
    ctx.restore();
  }

  function drawOldGridBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0e2131"); g.addColorStop(1, "#07110f");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,.055)"; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 20; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }

  function drawPlatform(p) {
    if (p.visible === false) {
      ctx.strokeStyle = "rgba(255,255,255,.12)";
      ctx.setLineDash([6, 8]); roundRect(p.x, p.y, p.w, p.h, 8, false, true); ctx.setLineDash([]);
      if (p.type === "whistle") {
        ctx.fillStyle = "rgba(178,132,255,.28)";
        ctx.font = "900 12px Orbitron";
        ctx.textAlign = "center";
        ctx.fillText("G", p.x + p.w / 2, p.y + 17);
      }
      return;
    }
    const color = p.type === "move" ? "#38bdf8" : p.type === "fall" ? "#f59e0b" : p.type === "vanish" || p.type === "whistle" ? "#a78bfa" : p.type === "trapShift" || p.type === "trapSink" ? "#ef4444" : "#263a58";
    ctx.fillStyle = color; roundRect(p.x, p.y, p.w, p.h, 8, true, false);
    ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(p.x + 8, p.y + 5, p.w - 16, 3);
    if (p.type === "trapShift" || p.type === "trapSink") {
      ctx.fillStyle = p.activated ? "rgba(255,255,255,.42)" : "rgba(255,213,74,.72)";
      for (let x = p.x + 10; x < p.x + p.w - 8; x += 22) {
        ctx.beginPath(); ctx.moveTo(x, p.y + p.h - 5); ctx.lineTo(x + 8, p.y + 7); ctx.lineTo(x + 16, p.y + p.h - 5); ctx.closePath(); ctx.fill();
      }
    }
  }

  function drawSpike(s) {
    ctx.fillStyle = "#fb7185";
    const count = Math.max(2, Math.floor(s.w / 18));
    for (let i = 0; i < count; i++) {
      const x = s.x + (i * s.w) / count;
      ctx.beginPath(); ctx.moveTo(x, s.y + s.h); ctx.lineTo(x + s.w / count / 2, s.y); ctx.lineTo(x + s.w / count, s.y + s.h); ctx.closePath(); ctx.fill();
    }
  }

  function drawHiddenSpike(s) {
    const rise = s.rise || 0;
    ctx.save();
    ctx.fillStyle = s.armed ? "rgba(251,113,133,.96)" : "rgba(251,191,36,.45)";
    ctx.strokeStyle = s.armed ? "rgba(255,255,255,.45)" : "rgba(251,191,36,.65)";
    ctx.lineWidth = 2;
    ctx.setLineDash(s.armed ? [] : [5, 5]);
    ctx.strokeRect(s.x + 4, s.y + 18, s.w - 8, 7);
    ctx.setLineDash([]);
    if (!s.armed) {
      ctx.font = "900 13px Orbitron";
      ctx.textAlign = "center";
      ctx.fillText("!", s.x + s.w / 2, s.y + 14);
      ctx.restore();
      return;
    }
    const y = s.y + (1 - rise) * s.h;
    const count = Math.max(2, Math.floor(s.w / 18));
    for (let i = 0; i < count; i++) {
      const x = s.x + (i * s.w) / count;
      ctx.beginPath(); ctx.moveTo(x, s.y + s.h); ctx.lineTo(x + s.w / count / 2, y); ctx.lineTo(x + s.w / count, s.y + s.h); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawSaw(s) {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.angle);
    ctx.fillStyle = "#e5e7eb";
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, -s.r - 7); ctx.lineTo(6, -s.r + 2); ctx.lineTo(-6, -s.r + 2); ctx.closePath(); ctx.fill(); }
    ctx.beginPath(); ctx.arc(0, 0, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(0, 0, s.r * 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawDoor(d) {
    ctx.save();
    ctx.globalAlpha = d.open ? 0.28 : 1;
    ctx.fillStyle = d.keyDoor ? "#22c55e" : "#38bdf8";
    roundRect(d.x, d.y, d.w, d.h, 10, true, false);
    ctx.fillStyle = "#07110f";
    ctx.fillRect(d.x + 8, d.y + 10, d.w - 16, d.h - 20);
    ctx.fillStyle = "#fff";
    ctx.font = "900 10px Orbitron";
    ctx.textAlign = "center";
    ctx.fillText(d.keyDoor ? "KEY" : Math.ceil(d.timer || d.seconds), d.x + d.w / 2, d.y + d.h / 2 + 4);
    ctx.restore();
  }

  function drawFakeDoor(d) {
    ctx.save();
    ctx.globalAlpha = d.sprung ? 0.35 : 1;
    ctx.fillStyle = d.revealed ? "#7c2d12" : "#334155";
    roundRect(d.x, d.y, d.w, d.h, 18, true, false);
    ctx.strokeStyle = d.revealed ? "#f97316" : "rgba(255,255,255,.22)";
    ctx.lineWidth = 3;
    roundRect(d.x + 3, d.y + 3, d.w - 6, d.h - 6, 15, false, true);
    ctx.fillStyle = "#eaffff";
    ctx.font = "900 9px Orbitron";
    ctx.textAlign = "center";
    ctx.fillText(d.revealed ? d.label : "Y", d.x + d.w / 2, d.y + 39);
    ctx.restore();
  }

  function drawYoyoSwitch(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.strokeStyle = s.pulled ? "#b8ff57" : "#ffd54a";
    ctx.fillStyle = s.pulled ? "rgba(184,255,87,.25)" : "rgba(255,213,74,.18)";
    ctx.lineWidth = 4;
    ctx.shadowColor = s.pulled ? "#b8ff57" : "#ffd54a";
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(0, 0, s.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#eaffff";
    ctx.font = "900 10px Orbitron";
    ctx.textAlign = "center";
    ctx.fillText("F", 0, 4);
    ctx.restore();
  }

  function drawRock(r) {
    if (r.done) return;
    ctx.save();
    if (r.armed && !r.falling) {
      ctx.strokeStyle = "rgba(255,213,74,.85)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(r.x - 18, r.sy + 24); ctx.lineTo(r.x, r.sy + 4); ctx.lineTo(r.x + 18, r.sy + 24); ctx.stroke();
    }
    ctx.fillStyle = "#8a7958";
    ctx.strokeStyle = "#e4ce96";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r.x - 14, r.y + 8);
    ctx.lineTo(r.x - 8, r.y - 12);
    ctx.lineTo(r.x + 10, r.y - 14);
    ctx.lineTo(r.x + 17, r.y + 4);
    ctx.lineTo(r.x + 4, r.y + 17);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawButton(b) {
    ctx.fillStyle = b.pressed ? "#4ade80" : "#f97316";
    roundRect(b.x, b.y + (b.pressed ? 5 : 0), b.w, b.h, 6, true, false);
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(b.x, b.y + b.h + 2, b.w, 5);
  }

  function drawCheckpoint(c) {
    ctx.strokeStyle = c.active ? "#4ade80" : "#cbd5e1";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(c.x, c.y + c.h); ctx.lineTo(c.x, c.y); ctx.lineTo(c.x + 24, c.y + 9); ctx.lineTo(c.x, c.y + 18); ctx.stroke();
  }

  function drawAnchor(a) {
    ctx.strokeStyle = "rgba(74,222,128,.34)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(a.x, a.y, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#4ade80"; ctx.beginPath(); ctx.arc(a.x, a.y, 5, 0, Math.PI * 2); ctx.fill();
  }

  function drawCoin(c) {
    if (c.taken) return;
    ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.fillRect(c.x - 2, c.y - 6, 4, 12);
  }

  function drawKey(k) {
    if (k.taken) return;
    ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(k.x + 7, k.y + 9, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(k.x + 14, k.y + 9); ctx.lineTo(k.x + 31, k.y + 9); ctx.lineTo(k.x + 31, k.y + 15); ctx.moveTo(k.x + 23, k.y + 9); ctx.lineTo(k.x + 23, k.y + 14); ctx.stroke();
  }

  function drawExit(e, unlocked) {
    ctx.fillStyle = unlocked ? "#22c55e" : "#334155";
    roundRect(e.x, e.y - 70, 40, 76, 18, true, false);
    ctx.fillStyle = "#07110f"; roundRect(e.x + 8, e.y - 58, 24, 52, 12, true, false);
    ctx.fillStyle = unlocked ? "#fff" : "#94a3b8"; ctx.font = "900 11px Orbitron"; ctx.textAlign = "center"; ctx.fillText("Y", e.x + 20, e.y - 28);
  }

  function drawYoyo() {
    const y = run.yoyo;
    const p = run.player;
    const hx = p.x + PLAYER_W / 2 + p.facing * 7;
    const hy = p.y + 19;
    const bob = Math.sin(run.time * 6) * 1.5;
    const readyX = hx + p.facing * 18;
    const readyY = hy + 8 + bob;
    ctx.save();
    ctx.strokeStyle = "rgba(234,244,255,.82)";
    ctx.lineWidth = 1.5;
    ctx.fillStyle = "#36e5ff";
    ctx.shadowColor = "#36e5ff";
    ctx.shadowBlur = 12;
    if (y.active && y.anchor) {
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(y.anchor.x, y.anchor.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(y.anchor.x, y.anchor.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#eaffff"; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(readyX, readyY); ctx.stroke();
      ctx.beginPath(); ctx.arc(readyX, readyY, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#eaffff"; ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlayer() {
    const p = run.player;
    const x = p.x + PLAYER_W / 2;
    const y = p.y;
    const moving = Math.abs(p.vx) > 20 && p.grounded;
    const swing = moving ? Math.sin(p.runTime * 5.5) * 11 : 0;
    ctx.save();
    if (p.hurt > 0) ctx.globalAlpha = 0.55 + Math.sin(run.time * 60) * 0.2;
    ctx.translate(x, y);
    ctx.strokeStyle = "rgba(80,220,255,.45)";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.arc(0, 10, 9, 0, Math.PI * 2);
    ctx.moveTo(0, 19); ctx.lineTo(0, 39);
    ctx.moveTo(0, 26); ctx.lineTo(-12 - swing * .25, 35);
    ctx.moveTo(0, 26); ctx.lineTo(12 + swing * .25, 35);
    ctx.moveTo(0, 39); ctx.lineTo(-9 + swing, 55);
    ctx.moveTo(0, 39); ctx.lineTo(9 - swing, 55);
    ctx.stroke();
    ctx.strokeStyle = "#020308";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 10, 9, 0, Math.PI * 2);
    ctx.moveTo(0, 19); ctx.lineTo(0, 39);
    ctx.moveTo(0, 26); ctx.lineTo(-12 - swing * .25, 35);
    ctx.moveTo(0, 26); ctx.lineTo(12 + swing * .25, 35);
    ctx.moveTo(0, 39); ctx.lineTo(-9 + swing, 55);
    ctx.moveTo(0, 39); ctx.lineTo(9 - swing, 55);
    ctx.stroke();
    ctx.fillStyle = "#36e5ff";
    ctx.font = "900 8px Orbitron";
    ctx.textAlign = "center";
    ctx.fillText("Y", 0, 33);
    ctx.restore();
  }

  function drawTamerName() {
    const p = run.player;
    ctx.fillStyle = "rgba(234,244,255,.78)";
    ctx.font = "900 9px Orbitron";
    ctx.textAlign = "center";
    ctx.fillText("TAMER", p.x + PLAYER_W / 2, p.y - 8);
  }

  function drawForeground() {
    ctx.fillStyle = "rgba(2,6,12,.72)";
    ctx.fillRect(0, 532, W, 8);
  }

  function roundRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function overlap(a, b) { return a.x < b.x + b.w && a.x + PLAYER_W > b.x && a.y < b.y + b.h && a.y + PLAYER_H > b.y; }
  function circleRect(cx, cy, r, x, y, w, h) {
    const nx = clamp(cx, x, x + w); const ny = clamp(cy, y, y + h);
    return Math.hypot(cx - nx, cy - ny) <= r;
  }
  function hitSpike(p, s) { return p.x < s.x + s.w - 5 && p.x + PLAYER_W > s.x + 5 && p.y + PLAYER_H > s.y + 7 && p.y + PLAYER_H < s.y + s.h + 18; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function approach(v, target, step) { return v < target ? Math.min(target, v + step) : Math.max(target, v - step); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - clamp(t, 0, 1), 3); }

  function updateHud() {
    if (!run) return;
    ui.level.textContent = `${levelIndex + 1}/20`;
    ui.keys.textContent = `${run.keys}/${run.neededKeys}`;
    ui.coins.textContent = `${run.levelCoins}/${run.level.coins.length}`;
    ui.deaths.textContent = String(save.deaths);
    ui.time.textContent = formatTime(run.time);
    ui.hint.textContent = run.level.hint;
    if (ui.controls) ui.controls.textContent = "F Yo-Yo · G Whistle";
    const yoyoButton = $("yoyoButton");
    if (yoyoButton) {
      yoyoButton.disabled = false;
      yoyoButton.textContent = "Yo-yo";
    }
    if (ui.whistleButton) {
      ui.whistleButton.disabled = whistleCooldown > 0;
      ui.whistleButton.textContent = whistleCooldown > 0 ? `${Math.ceil(whistleCooldown)}s` : "Whistle";
    }
  }

  function updateMenuStats() {
    if (ui.background) ui.background.value = save.backgroundMode;
    ui.menuUnlocked.textContent = `${save.unlocked}/20`;
    ui.menuCoins.textContent = String(save.coins || 0);
    ui.menuDeaths.textContent = String(save.deaths || 0);
    ui.start.textContent = `Start Level ${levelIndex + 1}`;
  }

  function renderLevelGrid() {
    ui.grid.innerHTML = "";
    LEVELS.forEach((level, i) => {
      const btn = document.createElement("button");
      const locked = i >= save.unlocked;
      btn.className = `${locked ? "locked" : ""} ${i === levelIndex ? "current" : ""}`;
      btn.disabled = locked;
      btn.innerHTML = `<strong>${i + 1}</strong><span>${locked ? "Locked" : formatMs(save.best[i])}</span>`;
      btn.addEventListener("click", () => { showOverlay(null); startLevel(i); });
      ui.grid.appendChild(btn);
    });
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }
  function formatMs(ms) { return ms ? formatTime(ms / 1000) : "No best"; }

  function toast(text) {
    ui.toast.textContent = text;
    ui.toast.classList.add("show");
    toastTimer = 1.45;
  }

  function beep(freq, dur, type) {
    if (!soundOn) return;
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.045, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + dur);
    } catch (_) {}
  }

  function getWhistleBus() {
    if (whistleBus) return whistleBus;
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const master = audioCtx.createGain();
    const reverb = audioCtx.createConvolver();
    const wet = audioCtx.createGain();
    const length = Math.floor(audioCtx.sampleRate * 1.15);
    const impulse = audioCtx.createBuffer(2, length, audioCtx.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2);
    }
    master.gain.value = .3;
    wet.gain.value = .14;
    reverb.buffer = impulse;
    reverb.connect(wet).connect(master);
    master.connect(audioCtx.destination);
    whistleBus = { dry: master, reverb };
    return whistleBus;
  }

  function scheduleWhistleNote(frequency, duration, volume, delay = 0) {
    if (!soundOn) return;
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      const start = audioCtx.currentTime + delay;
      const end = start + duration;
      const whistle = audioCtx.createOscillator();
      const harmonic = audioCtx.createOscillator();
      const harmonicGain = audioCtx.createGain();
      const envelope = audioCtx.createGain();
      const vibrato = audioCtx.createOscillator();
      const vibratoDepth = audioCtx.createGain();
      const bus = getWhistleBus();
      whistle.type = "sine";
      harmonic.type = "sine";
      vibrato.type = "sine";
      whistle.frequency.setValueAtTime(frequency * .985, start);
      whistle.frequency.exponentialRampToValueAtTime(frequency, start + Math.min(.09, duration * .3));
      harmonic.frequency.setValueAtTime(frequency * 2, start);
      harmonicGain.gain.setValueAtTime(.045, start);
      vibrato.frequency.setValueAtTime(5.1, start);
      vibratoDepth.gain.setValueAtTime(frequency * .007, start);
      envelope.gain.setValueAtTime(.0001, start);
      envelope.gain.exponentialRampToValueAtTime(volume, start + Math.min(.055, duration * .25));
      envelope.gain.setValueAtTime(volume * .88, Math.max(start + .06, end - .09));
      envelope.gain.exponentialRampToValueAtTime(.0001, end);
      vibrato.connect(vibratoDepth).connect(whistle.frequency);
      whistle.connect(envelope);
      harmonic.connect(harmonicGain).connect(envelope);
      envelope.connect(bus.dry);
      envelope.connect(bus.reverb);
      whistle.start(start); harmonic.start(start); vibrato.start(start);
      whistle.stop(end + .01); harmonic.stop(end + .01); vibrato.stop(end + .01);
    } catch (_) {}
  }

  function scheduleWhistleMelody(delay = 0) {
    const note = (frequency, duration, start, volume = .15) => scheduleWhistleNote(frequency, duration, volume, delay + start);
    note(659.25, .5, 0); note(783.99, .5, .5); note(880, 1, 1, .16);
    note(783.99, .5, 2); note(659.25, .5, 2.5); note(587.33, 1, 3, .14);
    note(659.25, .5, 4.5); note(783.99, .5, 5); note(987.77, 1, 5.5, .16);
    note(880, .5, 6.5); note(783.99, .5, 7); note(659.25, 1, 7.5, .145);
  }

  function playSound(name) {
    if (name === "yoyoThrow") beep(240, 0.05, "triangle"), setTimeout(() => beep(620, 0.09, "triangle"), 35);
    if (name === "yoyoHook") beep(520, 0.06, "sine"), setTimeout(() => beep(880, 0.1, "triangle"), 70);
    if (name === "whistle") scheduleWhistleMelody();
  }

  function bindKey(code, down, event) {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(code)) event.preventDefault();
    if (code === "ArrowLeft" || code === "KeyA") input.left = down;
    if (code === "ArrowRight" || code === "KeyD") input.right = down;
    if (code === "ArrowUp" || code === "KeyW" || code === "Space") {
      if (down && !input.jump) input.jumpPressed = true;
      input.jump = down;
    }
    if (code === "KeyF" || code === "ShiftLeft" || code === "ShiftRight" || code === "KeyX") {
      if (down) input.yoyoPressed = true;
      input.yoyo = down;
    }
  }

  function bindTouch(id, prop, pulse = false) {
    const el = $(id);
    if (!el) return;
    const on = (event) => { event.preventDefault(); if (pulse) input[`${prop}Pressed`] = true; input[prop] = true; };
    const off = (event) => { event.preventDefault(); input[prop] = false; };
    el.addEventListener("pointerdown", on);
    el.addEventListener("pointerup", off);
    el.addEventListener("pointercancel", off);
    el.addEventListener("pointerleave", off);
  }

  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyP") { state === "playing" ? pauseGame() : resumeGame(); return; }
    if (event.code === "KeyR" && run) { startLevel(levelIndex); return; }
    if (event.code === "KeyG" && !event.repeat) { gameplayWhistle(); return; }
    if (event.repeat && ["KeyF", "ShiftLeft", "ShiftRight", "KeyX"].includes(event.code)) return;
    bindKey(event.code, true, event);
  });
  window.addEventListener("keyup", (event) => bindKey(event.code, false, event));
  bindTouch("leftButton", "left");
  bindTouch("rightButton", "right");
  bindTouch("jumpButton", "jump", true);
  bindTouch("yoyoButton", "yoyo", true);
  ui.whistleButton?.addEventListener("click", () => gameplayWhistle());

  ui.start.addEventListener("click", () => startLevel(levelIndex));
  ui.pauseButton.addEventListener("click", pauseGame);
  $("mobilePauseButton")?.addEventListener("click", pauseGame);
  ui.resume.addEventListener("click", resumeGame);
  ui.restart.addEventListener("click", () => startLevel(levelIndex));
  ui.replay.addEventListener("click", () => startLevel(levelIndex));
  ui.next.addEventListener("click", () => startLevel(Math.min(levelIndex + 1, LEVELS.length - 1)));
  [ui.levels, ui.menu, ui.pause, ui.complete].forEach((el) => el.addEventListener("click", (event) => { if (event.target === el && el === ui.levels) showOverlay(state === "paused" ? "pause" : null); }));
  ["levelSelectButton", "menuLevelsButton", "pauseLevelsButton", "completeLevelsButton"].forEach((id) => $(id).addEventListener("click", () => { renderLevelGrid(); showOverlay("levels"); }));
  $("closeLevelsButton").addEventListener("click", () => showOverlay(state === "paused" ? "pause" : state === "complete" ? "complete" : state === "menu" ? "menu" : null));
  ui.sound.addEventListener("click", () => { soundOn = !soundOn; ui.sound.textContent = soundOn ? "Sound On" : "Sound Off"; ui.sound.setAttribute("aria-pressed", String(soundOn)); });
  ui.background?.addEventListener("change", () => {
    save.backgroundMode = ["night", "day", "dynamic"].includes(ui.background.value) ? ui.background.value : "night";
    writeSave();
    toast(`${ui.background.options[ui.background.selectedIndex].text} background`);
    canvas.focus({ preventScroll: true });
  });
  ui.fullscreen.addEventListener("click", () => { const el = document.documentElement; if (!document.fullscreenElement) el.requestFullscreen?.(); else document.exitFullscreen?.(); });

  function loop(now) {
    const dt = lastTime ? (now - lastTime) / 1000 : 0;
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  updateMenuStats();
  renderLevelGrid();
  newRun(levelIndex);
  showOverlay("menu");
  requestAnimationFrame(loop);
})();
