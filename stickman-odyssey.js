(() => {
  "use strict";

  const SAVE_KEY = "youooo_stickman_odyssey_v1";
  const W = 960, H = 540, WORLD_W = 3600;
  const GRAVITY = 1850, MOVE = 3000, FRICTION = 2400, MAX = 280, JUMP = 625;
  const PLAYER_W = 26, PLAYER_H = 58, COYOTE = .1, JUMP_BUFFER = .12;
  const WHISTLE_COOLDOWN = 8.6;
  const $ = (id) => document.getElementById(id);
  const canvas = $("odysseyCanvas");
  const ctx = canvas.getContext("2d");
  const ui = {
    area: $("areaReadout"), coins: $("coinReadout"), artifacts: $("artifactReadout"), keys: $("keyReadout"), deaths: $("deathReadout"), time: $("timeReadout"),
    toast: $("toast"), menu: $("menuOverlay"), pause: $("pauseOverlay"), complete: $("completeOverlay"), completeStats: $("completeStats"), map: $("miniMap"),
    start: $("startButton"), cont: $("continueButton"), pauseBtn: $("pauseButton"), resume: $("resumeButton"), restart: $("restartButton"),
    replay: $("replayButton"), sound: $("soundButton"), mapButton: $("mapButton"), pauseMap: $("pauseMapButton"), fullscreen: $("fullscreenButton")
  };

  const areas = [
    { name: "Jungle Entrance", x: 0, color: "#91b86b" },
    { name: "Ancient Ruins", x: 720, color: "#b99b66" },
    { name: "Cave Path", x: 1480, color: "#4b3b30" },
    { name: "Temple Gate", x: 2240, color: "#9f7a49" },
    { name: "Hidden Treasure Room", x: 3020, color: "#c28b3c" }
  ];
  const input = { left: false, right: false, jump: false, jumpPressed: false, yoyoPressed: false };
  let save = loadSave();
  let state = "menu", run = null, last = 0, camera = 0, toastTimer = 0, soundOn = true, audio = null, whistleBus = null, whistleCooldown = 0;

  const rect = (x, y, w, h, type = "solid", extra = {}) => ({ x, y, w, h, type, ...extra });
  const coin = (x, y, secret = false) => ({ x, y, r: 9, taken: false, secret });
  const artifact = (x, y, name) => ({ x, y, r: 12, name, taken: false });
  const key = (x, y, id) => ({ x, y, w: 28, h: 18, id, taken: false });
  const checkpoint = (x, y, id) => ({ x, y, w: 28, h: 44, id, active: false });
  const hook = (x, y, range = 270) => ({ x, y, range });
  const yoyoSwitch = (x, y, id) => ({ x, y, r: 15, id, pulled: false });

  const baseWorld = {
    start: { x: 44, y: 380 },
    platforms: [
      rect(0, 470, 420, 70, "dirt"), rect(470, 438, 240, 32, "wood"), rect(760, 470, 420, 70, "stone"),
      rect(1215, 420, 170, 28, "stone"), rect(1430, 470, 520, 70, "cave"), rect(2020, 430, 180, 30, "move", { sx: 2020, sy: 430, dx: 150, period: 3 }),
      rect(2280, 470, 420, 70, "stone"), rect(2740, 420, 120, 24, "crumble", { timer: 0, used: false }),
      rect(2920, 470, 680, 70, "treasure"), rect(880, 382, 170, 24, "hidden", { revealed: false }), rect(3180, 382, 170, 24, "hidden", { revealed: false })
    ],
    spikes: [rect(420, 500, 50, 28), rect(1180, 500, 70, 28), rect(2700, 500, 70, 28)],
    axes: [{ x: 1690, y: 245, len: 112, angle: 0, speed: 1.5 }],
    rocks: [{ x: 1520, y: 120, r: 16, armed: false, vy: 0 }, { x: 2380, y: 120, r: 18, armed: false, vy: 0 }],
    boulders: [{ x: 2460, y: 430, r: 22, vx: 0, armed: false }],
    doors: [rect(2845, 350, 42, 120, "door", { id: "temple", open: false })],
    plates: [rect(2365, 458, 54, 12, "plate", { id: "temple", pressed: false, timer: 0 })],
    coins: [coin(160, 420), coin(535, 398), coin(845, 430), coin(985, 310, true), coin(1320, 376), coin(1815, 400), coin(2140, 384), coin(2765, 384), coin(3210, 292, true), coin(3440, 428)],
    artifacts: [artifact(1015, 342, "Sun Tablet"), artifact(1855, 390, "Cave Idol"), artifact(3310, 342, "Golden Leaf")],
    keys: [key(2305, 388, "temple")],
    checkpoints: [checkpoint(40, 426, "start"), checkpoint(920, 426, "ruins"), checkpoint(1650, 426, "cave"), checkpoint(2350, 426, "temple")],
    hooks: [hook(610, 300), hook(1360, 300), hook(2100, 300), hook(2810, 290)],
    switches: [yoyoSwitch(1960, 330, "bridge"), yoyoSwitch(2520, 320, "temple")],
    signs: [
      { x: 120, y: 420, text: "Coins mark the path" },
      { x: 820, y: 420, text: "F catches hooks" },
      { x: 1510, y: 420, text: "G reveals cave paths" },
      { x: 2320, y: 420, text: "Step plates wake doors" },
      { x: 3110, y: 420, text: "Find all artifacts" }
    ],
    leaves: []
  };

  function loadSave() {
    const fallback = { checkpoint: { x: 44, y: 380 }, coins: [], artifacts: [], keys: [], switches: [], deaths: 0, best: null, complete: false };
    try { return { ...fallback, ...(JSON.parse(localStorage.getItem(SAVE_KEY) || "null") || {}) }; } catch (_) { return fallback; }
  }
  function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function buildWorld() {
    const world = clone(baseWorld);
    world.coins.forEach((c, i) => { c.id = i; c.taken = save.coins.includes(i); });
    world.artifacts.forEach((a, i) => { a.id = i; a.taken = save.artifacts.includes(i); });
    world.keys.forEach((k) => { k.taken = save.keys.includes(k.id); });
    world.switches.forEach((s) => { s.pulled = save.switches.includes(s.id); });
    return world;
  }

  function newRun(fresh = false) {
    if (fresh) {
      save = { checkpoint: { x: 44, y: 380 }, coins: [], artifacts: [], keys: [], switches: [], deaths: 0, best: save.best || null, complete: false };
      writeSave();
    }
    const world = buildWorld();
    run = {
      world, time: 0, keys: new Set(save.keys), dead: false, won: false, dust: [], particles: [], pieces: [], waves: [], whistle: 0, shake: 0, areaName: "",
      player: { x: save.checkpoint.x, y: save.checkpoint.y, vx: 0, vy: 0, facing: 1, grounded: false, coyote: 0, jumpBuffer: 0, jumpHeld: false, runTime: 0, pose: "idle", checkpoint: { ...save.checkpoint }, invuln: 1 },
      yoyo: { state: "ready", x: 0, y: 0, vx: 0, vy: 0, distance: 0, hook: null, target: null, kind: null, t: 0 }
    };
    applySwitches();
    state = "playing";
    showOverlay(null);
    toast("Checkpoint loaded");
    canvas.focus({ preventScroll: true });
  }

  function applySwitches() {
    const bridge = run.world.platforms.find((p) => p.id === "bridge");
    if (!bridge) run.world.platforms.push(rect(1900, 385, 250, 24, "wood", { id: "bridge", visible: run.world.switches.find((s) => s.id === "bridge")?.pulled }));
    const temple = run.world.switches.find((s) => s.id === "temple")?.pulled;
    run.world.doors.forEach((d) => { if (d.id === "temple") d.open = temple || run.keys.has("temple"); });
  }

  function resetLocalHazards() {
    if (!run) return;
    const old = run.world;
    run.world = buildWorld();
    applySwitches();
    run.world.platforms.forEach((p) => {
      const previous = old.platforms.find((item) => item.id && item.id === p.id);
      if (previous?.revealed) { p.revealed = true; p.visible = true; }
    });
    run.whistle = 0;
    run.world.leaves = [];
    run.waves = [];
    run.dust = [];
    run.particles = [];
    run.shake = 0;
  }

  function update(dt) {
    if (!run || state !== "playing") return;
    dt = Math.min(dt, .033);
    run.time += dt;
    whistleCooldown = Math.max(0, whistleCooldown - dt);
    run.shake = Math.max(0, run.shake - dt);
    toastTimer = Math.max(0, toastTimer - dt);
    if (toastTimer === 0) ui.toast.classList.remove("show");
    if (run.dead) { updateDeath(dt); updateHud(); return; }
    updateWorld(dt);
    updateArea();
    updatePlayer(dt);
    updateCollectibles();
    updateCamera();
    updateHud();
  }

  function updateWorld(dt) {
    run.whistle = Math.max(0, run.whistle - dt);
    run.world.leaves.forEach((l) => { l.x += l.vx * dt; l.y += l.vy * dt; l.life -= dt; });
    run.world.leaves = run.world.leaves.filter((l) => l.life > 0);
    run.dust.forEach((d) => { d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt; });
    run.dust = run.dust.filter((d) => d.life > 0);
    run.particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += GRAVITY * .22 * dt; p.life -= dt; });
    run.particles = run.particles.filter((p) => p.life > 0);
    run.world.platforms.forEach((p) => {
      p.prevX = p.x; p.prevY = p.y;
      if (p.type === "move") p.x = p.sx + Math.sin(run.time / p.period * Math.PI * 2) * p.dx;
      if (p.type === "crumble" && p.used) {
        p.timer += dt;
        if (p.timer > .35) p.y += (p.fallVy = (p.fallVy || 0) + GRAVITY * .5 * dt) * dt;
      }
      if (p.type === "hidden") p.visible = !!p.revealed || run.whistle > 0;
    });
    run.world.axes.forEach((a) => { if (run.whistle <= 0) a.angle = Math.sin(run.time * a.speed) * .9; });
    const canArmHazards = run.player.invuln <= 0;
    run.world.rocks.forEach((r) => {
      if (canArmHazards && !r.armed && Math.abs(run.player.x - r.x) < 90) { r.armed = true; toast("Falling rock"); }
      if (r.armed && run.whistle <= 0) {
        r.vy += GRAVITY * .55 * dt;
        r.y += r.vy * dt;
        if (r.y > 470) {
          if (!r.hitGround) { triggerShake(.28); play("trap"); }
          r.hitGround = true;
          r.y = 470; r.vy *= -.25;
        }
      }
    });
    run.world.boulders.forEach((b) => {
      if (canArmHazards && !b.armed && run.player.x > 2320) { b.armed = true; b.vx = 130; toast("Rolling boulder"); }
      if (b.armed && run.whistle <= 0) { b.x += b.vx * dt; if (b.x > 2780 || b.x < 2460) b.vx *= -1; }
    });
    run.world.plates.forEach((plate) => {
      plate.pressed = overlap(run.player, plate);
      if (plate.pressed) {
        plate.timer = 2.7;
        run.world.doors.forEach((d) => { if (d.id === plate.id) d.open = true; });
      } else {
        plate.timer = Math.max(0, plate.timer - dt);
        if (plate.timer <= 0 && !run.keys.has(plate.id)) run.world.doors.forEach((d) => { if (d.id === plate.id) d.open = false; });
      }
    });
  }

  function updatePlayer(dt) {
    const p = run.player;
    p.invuln = Math.max(0, (p.invuln || 0) - dt);
    p.jumpBuffer = input.jumpPressed ? JUMP_BUFFER : Math.max(0, p.jumpBuffer - dt);
    input.jumpPressed = false;
    if (input.yoyoPressed) throwYoyo();
    input.yoyoPressed = false;
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir) p.facing = dir;
    p.vx += dir * MOVE * dt;
    if (!dir && p.grounded) p.vx = approach(p.vx, 0, FRICTION * dt);
    p.vx = clamp(p.vx, -MAX, MAX);
    updateYoyo(dt);
    if (run.yoyo.state === "hooked" && run.yoyo.hook) {
      run.yoyo.t += dt;
      const cx = p.x + PLAYER_W / 2, cy = p.y + 24;
      const dx = run.yoyo.hook.x - cx, dy = run.yoyo.hook.y - cy, dist = Math.max(1, Math.hypot(dx, dy));
      p.vx += dx / dist * 1150 * dt; p.vy += dy / dist * 1050 * dt;
      if (dist < 35 || run.yoyo.t > .9) returnYoyo();
    }
    if (p.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = -JUMP; p.grounded = false; p.coyote = 0; p.jumpBuffer = 0; p.jumpHeld = true; puff(p.x + 13, p.y + 58); beep(260, .035, "square");
    }
    if (!input.jump && p.jumpHeld && p.vy < -215) p.vy = -215;
    if (!input.jump) p.jumpHeld = false;
    p.vy = Math.min(p.vy + GRAVITY * dt, 930);
    move(p, dt);
    p.coyote = p.grounded ? COYOTE : Math.max(0, p.coyote - dt);
    p.pose = !p.grounded ? (p.vy < 0 ? "jump" : "fall") : Math.abs(p.vx) > 25 ? "walk" : "idle";
    if (p.y > H + 130) die("Back to checkpoint");
    checkHazards();
  }

  function move(p, dt) {
    p.x += p.vx * dt; collide(p, "x");
    p.y += p.vy * dt; p.grounded = false; collide(p, "y");
    p.x = clamp(p.x, 0, WORLD_W - PLAYER_W);
  }

  function collide(p, axis) {
    for (const o of solids()) {
      if (!overlap(p, o)) continue;
      if (axis === "x") { if (p.vx > 0) p.x = o.x - PLAYER_W; else if (p.vx < 0) p.x = o.x + o.w; p.vx = 0; }
      else {
        if (p.vy > 0) {
          p.y = o.y - PLAYER_H; p.vy = 0; p.grounded = true;
          if (o.type === "move") p.x += o.x - (o.prevX ?? o.x);
          if (o.type === "crumble") { o.used = true; toast("Bridge crumbling"); }
        } else if (p.vy < 0) { p.y = o.y + o.h; p.vy = 0; }
      }
    }
  }

  function solids() {
    const platforms = run.world.platforms.filter((p) => p.visible !== false && p.y < H + 100);
    const doors = run.world.doors.filter((d) => !d.open);
    return platforms.concat(doors);
  }

  function checkHazards() {
    if (run.player.invuln > 0) return;
    const p = run.player;
    run.world.spikes.forEach((s) => { if (overlap(p, s)) die("Spike pit"); });
    run.world.axes.forEach((a) => {
      const ax = a.x + Math.sin(a.angle) * a.len, ay = a.y + Math.cos(a.angle) * a.len;
      if (circleRect(ax, ay, 18, p.x, p.y, PLAYER_W, PLAYER_H)) die("Swinging axe");
    });
    run.world.rocks.forEach((r) => { if (circleRect(r.x, r.y, r.r, p.x, p.y, PLAYER_W, PLAYER_H)) die("Falling rock"); });
    run.world.boulders.forEach((b) => { if (circleRect(b.x, b.y, b.r, p.x, p.y, PLAYER_W, PLAYER_H)) die("Rolling boulder"); });
    if (p.x > 3480 && run.world.artifacts.every((a) => a.taken || save.artifacts.includes(a.id))) completeGame();
  }

  function updateCollectibles() {
    const p = run.player;
    run.world.coins.forEach((c) => {
      if (!c.taken && circleRect(c.x, c.y, c.r, p.x, p.y, PLAYER_W, PLAYER_H)) collectCoin(c);
    });
    run.world.artifacts.forEach((a) => {
      if (!a.taken && circleRect(a.x, a.y, a.r, p.x, p.y, PLAYER_W, PLAYER_H)) {
        a.taken = true; if (!save.artifacts.includes(a.id)) save.artifacts.push(a.id);
        toast(`Artifact found: ${a.name}`); play("artifact"); writeSave();
      }
    });
    run.world.keys.forEach((k) => {
      if (!k.taken && overlap(p, k)) {
        k.taken = true; run.keys.add(k.id); if (!save.keys.includes(k.id)) save.keys.push(k.id);
        run.world.doors.forEach((d) => { if (d.id === k.id) d.open = true; });
        toast("Temple key collected"); play("key"); writeSave();
      }
    });
    run.world.checkpoints.forEach((c) => {
      if (!c.active && overlap(p, c)) {
        run.world.checkpoints.forEach((point) => { point.active = false; });
        c.active = true; p.checkpoint = { x: c.x, y: c.y - 44 }; save.checkpoint = { ...p.checkpoint };
        toast("Checkpoint saved"); play("checkpoint"); writeSave();
      }
    });
  }

  function collectCoin(c) {
    c.taken = true;
    if (!save.coins.includes(c.id)) save.coins.push(c.id);
    for (let i = 0; i < 7; i += 1) run.particles.push({ x: c.x, y: c.y, vx: (Math.random() - .5) * 130, vy: -80 - Math.random() * 90, life: .45 });
    play("coin"); writeSave();
  }

  function throwYoyo() {
    const y = run.yoyo;
    if (y.state !== "ready") { returnYoyo(); return; }
    const hand = yoyoHand();
    let best = null, kind = null, score = Infinity;
    const consider = (obj, type, range) => {
      const dx = obj.x - hand.x, dy = obj.y - hand.y, dist = Math.hypot(dx, dy);
      const facing = Math.sign(dx || run.player.facing) === run.player.facing || dist < 85;
      if (dist < range && facing && dist < score) { best = obj; kind = type; score = dist; }
    };
    run.world.hooks.forEach((h) => consider(h, "hook", h.range));
    run.world.switches.filter((s) => !s.pulled).forEach((s) => consider(s, "switch", 330));
    run.world.coins.filter((c) => !c.taken).forEach((c) => consider(c, "coin", 260));
    run.world.keys.filter((k) => !k.taken).forEach((k) => consider({ ...k, x: k.x + 14, y: k.y + 8, key: k }, "key", 260));
    const dx = best ? best.x - hand.x : run.player.facing, dy = best ? best.y - hand.y : 0, len = Math.max(1, Math.hypot(dx, dy));
    Object.assign(y, { state: "out", x: hand.x, y: hand.y, vx: dx / len * 850, vy: dy / len * 850, distance: 0, target: best, kind, hook: null, t: 0 });
    play("yoyo");
  }

  function updateYoyo(dt) {
    const y = run.yoyo, hand = yoyoHand();
    if (y.state === "ready") { y.x = hand.x; y.y = hand.y; return; }
    if (y.state === "out") {
      const sx = y.vx * dt, sy = y.vy * dt; y.x += sx; y.y += sy; y.distance += Math.hypot(sx, sy);
      run.world.platforms.forEach((p) => { if (p.type === "hidden" && circleRect(y.x, y.y, 8, p.x, p.y, p.w, p.h)) { p.revealed = true; p.visible = true; toast("Yo-yo revealed a ledge"); } });
      if (y.target && Math.hypot(y.x - y.target.x, y.y - y.target.y) < 26) {
        if (y.kind === "hook") { y.state = "hooked"; y.hook = y.target; y.t = 0; toast("Yo-yo attached"); play("hook"); }
        if (y.kind === "switch") pullSwitch(y.target);
        if (y.kind === "coin") { collectCoin(y.target); returnYoyo(); }
        if (y.kind === "key") { y.target.key.x = run.player.x + 8; y.target.key.y = run.player.y + 24; returnYoyo(); toast("Yo-yo pulled the key"); }
      }
      if (y.distance > 390) {
        if (!y.target) toast("No grip ahead");
        returnYoyo();
      }
    } else if (y.state === "return") {
      const dx = hand.x - y.x, dy = hand.y - y.y, dist = Math.hypot(dx, dy);
      if (dist < 14) y.state = "ready"; else { const step = Math.min(980 * dt, dist); y.x += dx / dist * step; y.y += dy / dist * step; }
    } else if (y.state === "hooked" && y.hook) { y.x = y.hook.x; y.y = y.hook.y; }
  }

  function pullSwitch(s) {
    s.pulled = true;
    if (!save.switches.includes(s.id)) save.switches.push(s.id);
    if (s.id === "bridge") toast("Old bridge mechanism woke up");
    if (s.id === "temple") { run.keys.add("temple"); save.keys.push("temple"); toast("Temple door unlocked"); }
    applySwitches(); play("hook"); writeSave(); returnYoyo();
  }

  function returnYoyo() { if (run.yoyo.state !== "ready") run.yoyo.state = "return"; run.yoyo.hook = null; }
  function yoyoHand() { const p = run.player; return { x: p.x + PLAYER_W / 2 + p.facing * 12, y: p.y + 35 }; }

  function whistle() {
    if (!run || state !== "playing" || run.dead || whistleCooldown > 0) return;
    whistleCooldown = WHISTLE_COOLDOWN;
    run.whistle = 2.8;
    run.world.platforms.forEach((p) => { if (p.type === "hidden" && Math.abs(p.x - run.player.x) < 520) p.revealed = true; });
    for (let i = 0; i < 22; i += 1) run.world.leaves.push({ x: run.player.x + 12, y: run.player.y + 22, vx: 100 + Math.random() * 180, vy: -80 + Math.random() * 130, life: .6 + Math.random() * .6 });
    run.waves.push({ x: run.player.x + 13, y: run.player.y + 24, r: 10, life: .55 });
    toast("Whistle revealed old paths and paused traps"); play("whistle");
  }

  function die(reason) {
    if (run.dead || run.won) return;
    run.dead = true; save.deaths += 1; writeSave(); toast(reason); play("death");
    const p = run.player, cx = p.x + 13, cy = p.y;
    run.pieces = [
      { kind: "head", x: cx, y: cy + 10, vx: -80, vy: -430, a: 0, va: 7, len: 9 },
      { kind: "line", x: cx, y: cy + 30, vx: 20, vy: -330, a: 1.57, va: -5, len: 23 },
      { kind: "line", x: cx - 9, y: cy + 32, vx: -180, vy: -260, a: -.7, va: -8, len: 22 },
      { kind: "line", x: cx + 9, y: cy + 32, vx: 180, vy: -260, a: .7, va: 8, len: 22 },
      { kind: "line", x: cx - 7, y: cy + 48, vx: -150, vy: -210, a: -1, va: -7, len: 24 },
      { kind: "line", x: cx + 7, y: cy + 48, vx: 150, vy: -210, a: 1, va: 7, len: 24 }
    ];
    setTimeout(respawn, 760);
  }

  function updateDeath(dt) {
    run.pieces.forEach((p) => { p.vy += GRAVITY * .7 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * dt; if (p.y > 500) { p.y = 500; p.vy *= -.35; p.vx *= .7; } });
  }

  function respawn() {
    if (!run) return;
    const cp = run.player.checkpoint;
    resetLocalHazards();
    run.dead = false;
    run.pieces = [];
    run.player.x = cp.x;
    run.player.y = cp.y;
    run.player.vx = 0;
    run.player.vy = 0;
    run.player.invuln = 1.15;
    run.yoyo.state = "ready";
    run.yoyo.hook = null;
    updateCamera();
    toast("Checkpoint safe");
  }

  function completeGame() {
    if (run.won) return;
    run.won = true; state = "complete"; save.complete = true;
    const elapsed = Math.floor(run.time * 1000);
    if (!save.best || elapsed < save.best) save.best = elapsed;
    writeSave();
    ui.completeStats.innerHTML = `<span>Coins <strong>${save.coins.length}/${run.world.coins.length}</strong></span><span>Artifacts <strong>${save.artifacts.length}/${run.world.artifacts.length}</strong></span><span>Deaths <strong>${save.deaths}</strong></span><span>Best <strong>${formatTime((save.best || elapsed) / 1000)}</strong></span>`;
    showOverlay("complete"); play("artifact");
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (!run) newRun(false);
    drawBackground();
    ctx.save();
    if (run.shake > 0) ctx.translate((Math.random() - .5) * run.shake * 16, (Math.random() - .5) * run.shake * 12);
    ctx.translate(-camera, 0);
    drawWorld();
    drawItems();
    drawTamer();
    drawYoyo();
    drawEffects();
    ctx.restore();
  }

  function drawBackground() {
    const area = currentArea();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    if (area.name === "Cave Path") { grad.addColorStop(0, "#2f2a25"); grad.addColorStop(1, "#21170f"); }
    else { grad.addColorStop(0, "#e7a95c"); grad.addColorStop(.55, "#d7b26c"); grad.addColorStop(1, area.color); }
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = area.name === "Cave Path" ? "rgba(0,0,0,.22)" : "rgba(62,80,42,.18)";
    for (let i = -1; i < 9; i += 1) {
      const x = (i * 220 - camera * .2) % (W + 240);
      ctx.beginPath(); ctx.moveTo(x, 470); ctx.quadraticCurveTo(x + 120, 360, x + 260, 470); ctx.fill();
    }
  }

  function drawWorld() {
    run.world.platforms.forEach((p) => { if (p.visible === false) return; drawPlatform(p); });
    run.world.spikes.forEach(drawSpikes);
    run.world.doors.forEach(drawDoor);
    run.world.hooks.forEach((h) => drawHook(h));
    run.world.switches.forEach(drawSwitch);
    run.world.checkpoints.forEach(drawCheckpoint);
    run.world.plates.forEach(drawPlate);
    run.world.axes.forEach(drawAxe);
    run.world.rocks.forEach(drawRock);
    run.world.boulders.forEach(drawBoulder);
    drawRuins();
    run.world.signs.forEach(drawSign);
  }

  function drawPlatform(p) {
    ctx.fillStyle = p.type === "wood" ? "#7b4f2b" : p.type === "stone" ? "#a4895f" : p.type === "cave" ? "#3b3129" : p.type === "treasure" ? "#8d6630" : p.type === "hidden" ? "rgba(205,176,111,.82)" : "#6f4d2c";
    roundRect(p.x, p.y, p.w, p.h, 6, true, false);
    ctx.fillStyle = "rgba(255,242,196,.24)";
    if (p.type === "wood") for (let x = p.x + 10; x < p.x + p.w; x += 28) ctx.fillRect(x, p.y + 4, 4, p.h - 8);
    else for (let x = p.x + 10; x < p.x + p.w - 10; x += 54) ctx.fillRect(x, p.y + 6, 36, 4);
    if (p.type === "hidden" && p.revealed) { ctx.fillStyle = "#f7d98a"; ctx.font = "900 10px Orbitron"; ctx.textAlign = "center"; ctx.fillText("SECRET", p.x + p.w / 2, p.y - 7); }
  }

  function drawItems() {
    run.world.coins.forEach((c) => { if (c.taken) return; ctx.fillStyle = c.secret ? "#f0c36a" : "#d99a2b"; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fff4be"; ctx.fillRect(c.x - 2, c.y - 6, 4, 12); });
    run.world.artifacts.forEach((a) => { if (a.taken) return; ctx.fillStyle = "#f2c45e"; ctx.beginPath(); ctx.moveTo(a.x, a.y - 14); ctx.lineTo(a.x + 12, a.y); ctx.lineTo(a.x, a.y + 14); ctx.lineTo(a.x - 12, a.y); ctx.closePath(); ctx.fill(); });
    run.world.keys.forEach((k) => { if (k.taken) return; ctx.strokeStyle = "#f6d66f"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(k.x + 7, k.y + 9, 7, 0, Math.PI * 2); ctx.moveTo(k.x + 14, k.y + 9); ctx.lineTo(k.x + 30, k.y + 9); ctx.lineTo(k.x + 30, k.y + 15); ctx.stroke(); });
  }

  function drawTamer() {
    if (run.dead) { drawPieces(); return; }
    const p = run.player, x = p.x + PLAYER_W / 2, y = p.y;
    const swing = p.pose === "walk" ? Math.sin(p.runTime += .16) * 10 : 0;
    if (p.pose === "whistle") {}
    ctx.save();
    if (p.invuln > 0) ctx.globalAlpha = .55 + Math.sin(run.time * 28) * .22;
    ctx.translate(x, y); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255,248,219,.38)"; ctx.lineWidth = 8;
    tamerPath(swing); ctx.stroke();
    ctx.strokeStyle = "#050403"; ctx.lineWidth = 5;
    tamerPath(swing); ctx.stroke();
    ctx.fillStyle = "#f0c36a"; ctx.font = "900 8px Orbitron"; ctx.textAlign = "center"; ctx.fillText("Y", 0, 33);
    ctx.restore();
  }

  function tamerPath(swing) {
    ctx.beginPath(); ctx.arc(0, 10, 9, 0, Math.PI * 2); ctx.moveTo(0, 19); ctx.lineTo(0, 39);
    ctx.moveTo(0, 26); ctx.lineTo(-12 - swing * .25, 35); ctx.moveTo(0, 26); ctx.lineTo(12 + swing * .25, 35);
    ctx.moveTo(0, 39); ctx.lineTo(-9 + swing, 55); ctx.moveTo(0, 39); ctx.lineTo(9 - swing, 55);
  }

  function drawYoyo() {
    if (run.dead) return;
    const y = run.yoyo, hand = yoyoHand();
    ctx.save(); ctx.strokeStyle = "rgba(255,248,219,.85)"; ctx.lineWidth = 1.5; ctx.fillStyle = "#d99a2b";
    if (y.state !== "ready") { ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(y.x, y.y); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(y.x, y.y, y.state === "ready" ? 7 : 9, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#fff4be"; ctx.stroke(); ctx.restore();
  }

  function drawEffects() {
    run.waves.forEach((w) => { w.r += 3; w.life -= .03; ctx.strokeStyle = `rgba(255,244,190,${Math.max(0, w.life)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2); ctx.stroke(); });
    run.waves = run.waves.filter((w) => w.life > 0);
    run.world.leaves.forEach((l) => { ctx.fillStyle = "rgba(55,93,45,.72)"; ctx.beginPath(); ctx.ellipse(l.x, l.y, 7, 3, .7, 0, Math.PI * 2); ctx.fill(); });
    run.dust.forEach((d) => { ctx.globalAlpha = Math.max(0, d.life * 2.5); ctx.fillStyle = "#d2ad70"; ctx.beginPath(); ctx.arc(d.x, d.y, 3 + d.life * 6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; });
    run.particles.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life * 2); ctx.fillStyle = "#f0c36a"; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; });
  }

  function drawPieces() {
    run.pieces.forEach((p) => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.strokeStyle = "#050403"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); if (p.kind === "head") ctx.arc(0, 0, p.len, 0, Math.PI * 2); else { ctx.moveTo(-p.len / 2, 0); ctx.lineTo(p.len / 2, 0); } ctx.stroke(); ctx.restore(); });
  }

  function drawSpikes(s) { ctx.fillStyle = "#5d2d20"; for (let x = s.x; x < s.x + s.w; x += 18) { ctx.beginPath(); ctx.moveTo(x, s.y + s.h); ctx.lineTo(x + 9, s.y); ctx.lineTo(x + 18, s.y + s.h); ctx.fill(); } }
  function drawDoor(d) { ctx.globalAlpha = d.open ? .3 : 1; ctx.fillStyle = "#6a4a2f"; roundRect(d.x, d.y, d.w, d.h, 8, true, false); ctx.fillStyle = "#2a1b10"; ctx.fillRect(d.x + 8, d.y + 12, d.w - 16, d.h - 20); ctx.fillStyle = "#f0c36a"; ctx.font = "900 9px Orbitron"; ctx.textAlign = "center"; ctx.fillText(d.open ? "OPEN" : "LOCK", d.x + d.w / 2, d.y - 8); ctx.globalAlpha = 1; }
  function drawHook(h) { ctx.strokeStyle = "rgba(72,50,27,.62)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x, h.y, 15, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = "#4b3320"; ctx.beginPath(); ctx.arc(h.x, h.y, 5, 0, Math.PI * 2); ctx.fill(); }
  function drawSwitch(s) { ctx.save(); ctx.translate(s.x, s.y); ctx.strokeStyle = s.pulled ? "#6f8f68" : "#f0c36a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, s.r, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = "#fff7dc"; ctx.font = "900 10px Orbitron"; ctx.textAlign = "center"; ctx.fillText("F", 0, 4); ctx.restore(); }
  function drawCheckpoint(c) { ctx.strokeStyle = c.active ? "#6f8f68" : "#fff7dc"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(c.x, c.y + c.h); ctx.lineTo(c.x, c.y); ctx.lineTo(c.x + 25, c.y + 10); ctx.lineTo(c.x, c.y + 20); ctx.stroke(); }
  function drawPlate(p) { ctx.fillStyle = p.pressed ? "#6f8f68" : "#9a7548"; roundRect(p.x, p.y, p.w, p.h, 5, true, false); ctx.fillStyle = "#fff2bf"; ctx.font = "900 9px Orbitron"; ctx.textAlign = "center"; ctx.fillText("STEP", p.x + p.w / 2, p.y - 6); }
  function drawAxe(a) { const ax = a.x + Math.sin(a.angle) * a.len, ay = a.y + Math.cos(a.angle) * a.len; ctx.strokeStyle = "#44301e"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(ax, ay); ctx.stroke(); ctx.fillStyle = "#8b8b7a"; ctx.beginPath(); ctx.ellipse(ax, ay, 20, 11, a.angle, 0, Math.PI * 2); ctx.fill(); }
  function drawRock(r) { ctx.fillStyle = "#6b6256"; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.fill(); }
  function drawBoulder(b) { ctx.fillStyle = "#6b5540"; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.2)"; ctx.stroke(); }
  function drawRuins() { ctx.fillStyle = "rgba(76,52,30,.26)"; [840, 1120, 2300, 3080].forEach((x) => { ctx.fillRect(x, 280, 46, 190); ctx.fillRect(x - 18, 260, 82, 24); }); }
  function drawSign(s) { ctx.fillStyle = "#5f3d22"; ctx.fillRect(s.x + 22, s.y + 15, 5, 38); roundRect(s.x, s.y, 74, 24, 5, true, false); ctx.fillStyle = "#fff2bf"; ctx.font = "800 8px Inter"; ctx.textAlign = "center"; ctx.fillText(s.text, s.x + 37, s.y + 15); }

  function updateCamera() { camera = clamp(run.player.x - W * .42, 0, WORLD_W - W); }
  function currentArea() { return [...areas].reverse().find((a) => run?.player.x >= a.x) || areas[0]; }
  function updateArea() {
    const area = currentArea().name;
    if (area !== run.areaName) {
      run.areaName = area;
      toast(area);
    }
  }
  function updateHud() {
    if (!run) return;
    ui.area.textContent = currentArea().name; ui.coins.textContent = `${save.coins.length}/${run.world.coins.length}`; ui.artifacts.textContent = `${save.artifacts.length}/${run.world.artifacts.length}`;
    ui.keys.textContent = String(save.keys.length); ui.deaths.textContent = String(save.deaths || 0); ui.time.textContent = formatTime(run.time);
    const whistleButton = $("whistleButton");
    if (whistleButton) {
      whistleButton.disabled = whistleCooldown > 0;
      whistleButton.textContent = whistleCooldown > 0 ? `${Math.ceil(whistleCooldown)}s` : "Whistle";
    }
  }
  function renderMap() {
    const x = run?.player.x || save.checkpoint.x;
    ui.map.innerHTML = areas.map((a, i) => `<div><span>${x >= a.x && (!areas[i + 1] || x < areas[i + 1].x) ? "Tamer" : ""}</span><strong>${a.name}</strong></div>`).join("");
  }

  function showOverlay(name) { [ui.menu, ui.pause, ui.complete].forEach((el) => el.classList.remove("visible")); if (name) ui[name].classList.add("visible"); }
  function pause() { if (state !== "playing") return; state = "paused"; showOverlay("pause"); }
  function resume() { if (state !== "paused") return; state = "playing"; showOverlay(null); canvas.focus({ preventScroll: true }); }
  function toast(text) { ui.toast.textContent = text; ui.toast.classList.add("show"); toastTimer = 1.45; }
  function triggerShake(amount = .2) { if (run) run.shake = Math.max(run.shake || 0, amount); }
  function formatTime(sec) { const m = Math.floor(sec / 60).toString().padStart(2, "0"), s = Math.floor(sec % 60).toString().padStart(2, "0"); return `${m}:${s}`; }
  function roundRect(x, y, w, h, r, fill, stroke) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); if (fill) ctx.fill(); if (stroke) ctx.stroke(); }
  function overlap(a, b) { return a.x < b.x + b.w && a.x + PLAYER_W > b.x && a.y < b.y + b.h && a.y + PLAYER_H > b.y; }
  function circleRect(cx, cy, r, x, y, w, h) { const nx = clamp(cx, x, x + w), ny = clamp(cy, y, y + h); return Math.hypot(cx - nx, cy - ny) <= r; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function approach(v, target, step) { return v < target ? Math.min(target, v + step) : Math.max(target, v - step); }
  function puff(x, y) { for (let i = 0; i < 6; i += 1) run.dust.push({ x, y, vx: (Math.random() - .5) * 90, vy: -20 - Math.random() * 35, life: .3 + Math.random() * .15 }); }
  function beep(freq, dur, type = "sine") { if (!soundOn) return; try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); const o = audio.createOscillator(), g = audio.createGain(); o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(.045, audio.currentTime); g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + dur); o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + dur); } catch (_) {} }
  function getWhistleBus() {
    if (whistleBus) return whistleBus;
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const master = audio.createGain();
    const reverb = audio.createConvolver();
    const wet = audio.createGain();
    const length = Math.floor(audio.sampleRate * 1.15);
    const impulse = audio.createBuffer(2, length, audio.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2);
    }
    master.gain.value = .3;
    wet.gain.value = .14;
    reverb.buffer = impulse;
    reverb.connect(wet).connect(master);
    master.connect(audio.destination);
    whistleBus = { dry: master, reverb };
    return whistleBus;
  }
  function scheduleWhistleNote(frequency, duration, volume, delay = 0) {
    if (!soundOn) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const start = audio.currentTime + delay;
      const end = start + duration;
      const whistle = audio.createOscillator();
      const harmonic = audio.createOscillator();
      const harmonicGain = audio.createGain();
      const envelope = audio.createGain();
      const vibrato = audio.createOscillator();
      const vibratoDepth = audio.createGain();
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
  function play(name) { if (name === "coin") beep(740, .04); if (name === "key") beep(920, .07, "triangle"); if (name === "artifact") beep(660, .08, "triangle"), setTimeout(() => beep(880, .08, "triangle"), 70); if (name === "checkpoint") beep(520, .06); if (name === "yoyo") beep(240, .05, "triangle"); if (name === "hook") beep(610, .07); if (name === "trap") beep(170, .045, "square"), setTimeout(() => beep(95, .07, "sawtooth"), 55); if (name === "death") beep(100, .1, "sawtooth"); if (name === "whistle") scheduleWhistleMelody(); }

  function bindKey(code, down, event) {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(code)) event.preventDefault();
    if (code === "ArrowLeft" || code === "KeyA") input.left = down;
    if (code === "ArrowRight" || code === "KeyD") input.right = down;
    if (code === "ArrowUp" || code === "KeyW" || code === "Space") { if (down && !input.jump) input.jumpPressed = true; input.jump = down; }
    if (code === "KeyF" && down) input.yoyoPressed = true;
  }
  function bindTouch(id, prop, pulse = false) { const el = $(id); const on = (e) => { e.preventDefault(); if (pulse) input[`${prop}Pressed`] = true; input[prop] = true; }; const off = (e) => { e.preventDefault(); input[prop] = false; }; el.addEventListener("pointerdown", on); el.addEventListener("pointerup", off); el.addEventListener("pointercancel", off); el.addEventListener("pointerleave", off); }

  window.addEventListener("keydown", (e) => { if (e.code === "Escape" || e.code === "KeyP") { state === "playing" ? pause() : resume(); return; } if (e.code === "KeyR" && run) { respawn(); return; } if (e.code === "KeyG" && !e.repeat) { whistle(); return; } if (e.repeat && e.code === "KeyF") return; bindKey(e.code, true, e); });
  window.addEventListener("keyup", (e) => bindKey(e.code, false, e));
  bindTouch("leftButton", "left"); bindTouch("rightButton", "right"); bindTouch("jumpButton", "jump", true); bindTouch("yoyoButton", "yoyo", true);
  $("whistleButton").addEventListener("click", () => whistle());
  ui.start.addEventListener("click", () => newRun(true)); ui.cont.addEventListener("click", () => newRun(false)); ui.pauseBtn.addEventListener("click", pause); $("mobilePauseButton").addEventListener("click", pause); ui.resume.addEventListener("click", resume); ui.restart.addEventListener("click", () => { respawn(); resume(); }); ui.replay.addEventListener("click", () => newRun(true));
  const toggleMap = () => { renderMap(); ui.map.classList.toggle("hidden"); canvas.focus({ preventScroll: true }); };
  ui.mapButton.addEventListener("click", toggleMap); ui.pauseMap.addEventListener("click", toggleMap);
  ui.sound.addEventListener("click", () => { soundOn = !soundOn; ui.sound.textContent = soundOn ? "Sound On" : "Sound Off"; ui.sound.setAttribute("aria-pressed", String(soundOn)); });
  ui.fullscreen.addEventListener("click", () => { const el = document.documentElement; if (!document.fullscreenElement) el.requestFullscreen?.(); else document.exitFullscreen?.(); });

  function loop(now) { const dt = last ? (now - last) / 1000 : 0; last = now; update(dt); draw(); requestAnimationFrame(loop); }
  newRun(false); state = "menu"; showOverlay("menu"); updateHud(); requestAnimationFrame(loop);
})();
