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
  const WHISTLE_COOLDOWN = 5;

  const $ = (id) => document.getElementById(id);
  const canvas = $("smartCanvas");
  const ctx = canvas.getContext("2d");
  const ui = {
    level: $("levelReadout"), keys: $("keyReadout"), coins: $("coinReadout"), deaths: $("deathReadout"), time: $("timeReadout"), hint: $("hintReadout"),
    menu: $("menuOverlay"), pause: $("pauseOverlay"), complete: $("completeOverlay"), levels: $("levelOverlay"), toast: $("toast"),
    menuUnlocked: $("menuUnlocked"), menuCoins: $("menuCoins"), menuDeaths: $("menuDeaths"), grid: $("levelGrid"), completeStats: $("completeStats"),
    start: $("startButton"), pauseButton: $("pauseButton"), resume: $("resumeButton"), restart: $("restartButton"), next: $("nextButton"), replay: $("replayButton"),
    sound: $("soundButton"), fullscreen: $("fullscreenButton"), whistleButton: $("whistleButton")
  };

  const input = { left: false, right: false, jump: false, yoyo: false, jumpPressed: false, yoyoPressed: false };
  const save = loadSave();
  let levelIndex = Math.min(save.lastLevel || 0, save.unlocked - 1);
  let state = "menu";
  let soundOn = true;
  let lastTime = 0;
  let toastTimer = 0;
  let whistleCooldown = 0;
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

  const base = {
    platforms: [rect(0, 500, 220, 40), rect(260, 470, 160, 30), rect(460, 430, 150, 30), rect(660, 390, 210, 30), rect(880, 500, 80, 40)],
    spikes: [spike(220, 516, 42), spike(610, 446, 44)], coins: [coin(335, 435), coin(530, 394), coin(744, 352)], keys: [key(736, 354)],
    saws: [], hiddenSpikes: [hiddenSpike(390, 516, 58)], anchors: [anchor(565, 300)], buttons: [], doors: [door(846, 412, 88, null, true)], checkpoints: [checkpoint(455, 388)],
    start: { x: 50, y: 440 }, exit: { x: 900, y: 432 }, hint: "Get the key"
  };

  const LEVELS = Array.from({ length: 20 }, (_, i) => makeLevel(i));
  if (LEVELS.length !== 20) throw new Error("Stickman Smart Escape requires exactly 20 levels");

  function makeLevel(i) {
    const n = i + 1;
    const l = clone(base);
    l.name = `Chamber ${n}`;
    l.hint = ["Get the key", "Use F for yo-yo", "Watch the timing", "Press the button", "Look for hidden traps"][i % 5];
    l.platforms = [
      rect(0, 500, 180, 40),
      rect(225, 472 - (i % 3) * 12, 130, 28),
      rect(402, 442 - (i % 4) * 10, 116, 28, i > 5 && i % 4 === 2 ? "fall" : "solid", { delay: 0.35, fallVy: 0 }),
      rect(566, 420 - (i % 3) * 16, 120, 28, i > 6 && i % 5 === 1 ? "vanish" : "solid", { phase: i * 0.3, on: 1.4, off: 1 }),
      rect(742, 392 - (i % 4) * 12, 108, 28),
      rect(890, 500, 70, 40)
    ];
    if (i > 1) l.platforms.push(rect(260, 345, 112, 24, "move", { sx: 260, sy: 345, dx: 80 + i * 4, dy: i % 2 ? 42 : 0, period: 2.8 }));
    if (i > 3) l.platforms.push(rect(650, 300, 112, 24, "move", { sx: 650, sy: 300, dx: i % 2 ? -95 : 0, dy: 64, period: 2.4 }));
    if (i > 8) l.platforms.push(rect(126, 392, 86, 22, "vanish", { phase: 0.6, on: 1.05, off: 0.95 }));
    if (i > 12) l.platforms.push(rect(500, 265, 95, 22, "fall", { delay: 0.28, fallVy: 0 }));
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
    l.start = { x: 46, y: 440 };
    l.exit = { x: 904, y: 432 };
    return l;
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function loadSave() {
    const fallback = { unlocked: 1, lastLevel: 0, deaths: 0, coins: 0, best: {}, levelCoins: {} };
    try {
      const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      return { ...fallback, ...(parsed || {}), unlocked: Math.max(1, parsed?.unlocked || 1) };
    } catch (_) { return fallback; }
  }

  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {}
  }

  function newRun(index) {
    const level = clone(LEVELS[index]);
    level.platforms.forEach((p) => { p.baseX = p.x; p.baseY = p.y; p.startY = p.y; p.fallTimer = 0; p.used = false; p.visible = true; });
    run = {
      level, time: 0, levelCoins: 0, levelDeaths: 0, keys: 0, neededKeys: level.keys.length, won: false, pausedAt: 0,
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
      if (p.type === "move") {
        const wave = Math.sin(((t / p.period) + (p.phase || 0)) * Math.PI * 2);
        p.x = p.sx + (p.dx || 0) * wave;
        p.y = p.sy + (p.dy || 0) * wave;
      }
      if (p.type === "vanish") {
        const cycle = (p.on || 1.3) + (p.off || 1);
        p.visible = ((t + (p.phase || 0)) % cycle) < (p.on || 1.3);
      }
      if (p.type === "fall" && p.used) {
        p.fallTimer += dt;
        if (p.fallTimer > (p.delay || 0.35)) p.y += (p.fallVy += GRAVITY * dt * 0.5) * dt;
        if (p.y > H + 80) { p.y = p.startY; p.fallVy = 0; p.fallTimer = 0; p.used = false; }
      }
    });
    run.level.saws.forEach((s) => {
      const wave = Math.sin(((t / s.period) + s.phase) * Math.PI * 2);
      s.x = s.sx + s.dx * wave;
      s.y = s.sy + s.dy * wave;
      s.angle += dt * 8;
    });
    run.level.hiddenSpikes.forEach((s) => {
      const px = run.player.x + PLAYER_W / 2;
      const py = run.player.y + PLAYER_H;
      const close = Math.abs(px - (s.x + s.w / 2)) < s.trigger && Math.abs(py - (s.y + s.h / 2)) < 96;
      s.armed = s.armed || close;
      s.rise = approach(s.rise || 0, s.armed ? 1 : 0, dt * 5.5);
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
        const linked = run.level.buttons.find((b) => b.id === d.id);
        if (linked?.pressed) d.timer = d.seconds;
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
          if (o.type === "move") {
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
    if (best) {
      run.yoyo.active = true;
      run.yoyo.anchor = best;
      run.yoyo.t = 0;
      playSound("yoyoThrow");
      setTimeout(() => { if (run?.yoyo?.active) playSound("yoyoHook"); }, 80);
    } else {
      toast("No yo-yo anchor in range");
    }
  }

  function gameplayWhistle() {
    if (!run || state !== "playing" || whistleCooldown > 0) return;
    whistleCooldown = WHISTLE_COOLDOWN;
    toast("Tamer whistles...");
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
    l.buttons.forEach(drawButton);
    l.checkpoints.forEach(drawCheckpoint);
    l.anchors.forEach(drawAnchor);
    l.coins.forEach(drawCoin);
    l.keys.forEach(drawKey);
    drawExit(l.exit, run.keys >= run.neededKeys);
    l.saws.forEach(drawSaw);
    drawYoyo();
    drawPlayer();
    drawTamerName();
    drawForeground();
  }

  function drawBackground() {
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
      return;
    }
    const color = p.type === "move" ? "#38bdf8" : p.type === "fall" ? "#f59e0b" : p.type === "vanish" ? "#a78bfa" : "#1f3940";
    ctx.fillStyle = color; roundRect(p.x, p.y, p.w, p.h, 8, true, false);
    ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(p.x + 8, p.y + 5, p.w - 16, 3);
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
    if (!y.active || !y.anchor) return;
    const p = run.player;
    const hx = p.x + PLAYER_W / 2 + p.facing * 7;
    const hy = p.y + 19;
    ctx.strokeStyle = "#4ade80"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(y.anchor.x, y.anchor.y); ctx.stroke();
    ctx.fillStyle = "#0f172a"; ctx.strokeStyle = "#4ade80"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(y.anchor.x, y.anchor.y, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
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

  function updateHud() {
    if (!run) return;
    ui.level.textContent = `${levelIndex + 1}/20`;
    ui.keys.textContent = `${run.keys}/${run.neededKeys}`;
    ui.coins.textContent = `${run.levelCoins}/${run.level.coins.length}`;
    ui.deaths.textContent = String(save.deaths);
    ui.time.textContent = formatTime(run.time);
    ui.hint.textContent = run.level.hint;
    if (ui.whistleButton) {
      ui.whistleButton.disabled = whistleCooldown > 0;
      ui.whistleButton.textContent = whistleCooldown > 0 ? `${Math.ceil(whistleCooldown)}s` : "Whistle";
    }
  }

  function updateMenuStats() {
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

  let audioCtx = null;
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

  function playSound(name) {
    if (name === "yoyoThrow") beep(240, 0.05, "triangle"), setTimeout(() => beep(620, 0.09, "triangle"), 35);
    if (name === "yoyoHook") beep(520, 0.06, "sine"), setTimeout(() => beep(880, 0.1, "triangle"), 70);
    if (name === "whistle") {
      [880, 988, 1175, 988, 1319].forEach((freq, i) => setTimeout(() => beep(freq, i === 4 ? 0.18 : 0.1, "sine"), i * 105));
    }
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
