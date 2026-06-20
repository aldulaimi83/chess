(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const SAVE_KEY = "youooo_stickman_escape_v1";

  const P = (x, y, w, h = 24) => ({ x, y, w, h });
  const M = (x, y, w, axis, range, speed, phase = 0) => ({ x, y, w, h: 20, axis, range, speed, phase });
  const F = (x, y, w) => ({ x, y, w, h: 18 });
  const S = (x, y, count = 1) => ({ x, y, count });
  const C = (x, y) => ({ x, y });
  const K = (x, y) => ({ x, y });
  const T = (x, y, axis = "x", range = 55, speed = 2) => ({ x, y, axis, range, speed });

  const LEVELS = [
    {
      name: "First Steps", width: 1880, start: { x: 70, y: 414 }, door: { x: 1795, y: 390 },
      platforms: [P(0,470,520,70),P(610,470,420,70),P(1120,470,760,70),P(270,380,120),P(760,365,120),P(1320,360,130)],
      moving: [M(500,410,110,"x",90,1.7)], falling: [],
      spikes: [S(350,470,2),S(840,470,2),S(1490,470,3)], traps: [],
      checkpoints: [K(1165,410)], coins: [C(320,340),C(550,360),C(810,325),C(1380,320),C(1690,425)]
    },
    {
      name: "Broken Floor", width: 2060, start: { x: 60, y: 414 }, door: { x: 1965, y: 390 },
      platforms: [P(0,470,390,70),P(530,470,310,70),P(980,470,300,70),P(1430,470,630,70),P(220,355,110),P(680,335,105),P(1120,340,110),P(1600,350,120)],
      moving: [M(390,420,115,"x",130,1.5),M(1280,400,120,"x",145,1.9)], falling: [F(850,405,100),F(1320,330,90)],
      spikes: [S(590,470,2),S(1040,470,2),S(1690,470,3)], traps: [T(1510,420,"y",42,2.2)],
      checkpoints: [K(1005,410)], coins: [C(265,315),C(445,365),C(720,295),C(890,360),C(1165,300),C(1360,290),C(1655,310),C(1900,425)]
    },
    {
      name: "Lift Shaft", width: 2200, start: { x: 70, y: 414 }, door: { x: 2100, y: 210 },
      platforms: [P(0,470,430,70),P(620,470,300,70),P(1080,470,310,70),P(1540,470,250,70),P(1960,290,240,250),P(260,360,110),P(720,325,110),P(1140,350,120),P(1600,345,110),P(1840,330,90)],
      moving: [M(430,420,105,"x",170,1.8),M(930,390,105,"y",120,1.4,1),M(1400,410,110,"x",135,2),M(1790,390,100,"y",140,1.3,2)], falling: [],
      spikes: [S(680,470,2),S(1200,470,2),S(1600,470,3)], traps: [T(1000,430,"x",70,2.6)],
      checkpoints: [K(1095,410),K(1975,230)], coins: [C(315,320),C(490,365),C(765,285),C(980,300),C(1195,310),C(1460,360),C(1650,305),C(1845,270),C(2040,245)]
    },
    {
      name: "Unstable Route", width: 2260, start: { x: 70, y: 414 }, door: { x: 2170, y: 390 },
      platforms: [P(0,470,360,70),P(740,470,330,70),P(1370,470,300,70),P(1920,470,340,70),P(260,335,105),P(820,330,110),P(1450,325,105),P(1980,345,110)],
      moving: [M(1070,385,110,"x",285,1.7)], falling: [F(390,420,100),F(510,375,95),F(625,420,95),F(1110,410,90),F(1220,360,90),F(1690,410,90),F(1800,365,90)],
      spikes: [S(800,470,2),S(1460,470,2),S(2030,470,2)], traps: [T(950,410,"y",50,2.4),T(1550,400,"x",60,2)],
      checkpoints: [K(760,410),K(1390,410)], coins: [C(300,295),C(435,375),C(555,330),C(670,375),C(860,290),C(1160,315),C(1270,315),C(1495,285),C(1740,320),C(1845,320),C(2030,305)]
    },
    {
      name: "Saw Works", width: 2400, start: { x: 70, y: 414 }, door: { x: 2305, y: 390 },
      platforms: [P(0,470,500,70),P(610,470,440,70),P(1170,470,360,70),P(1650,470,310,70),P(2080,470,320,70),P(320,345,120),P(710,350,110),P(1250,330,110),P(1730,340,110),P(2140,350,110)],
      moving: [M(500,395,110,"x",105,2),M(1050,365,110,"x",115,2.2),M(1530,380,110,"x",115,2),M(1960,380,110,"x",115,2.2)], falling: [],
      spikes: [S(390,470,2),S(690,470,2),S(1270,470,3),S(1750,470,2),S(2160,470,2)], traps: [T(560,420,"y",45,2.7),T(1110,415,"y",60,2.3),T(1590,410,"y",55,2.8),T(2015,410,"y",55,2.5)],
      checkpoints: [K(1185,410),K(2095,410)], coins: [C(365,305),C(550,345),C(760,310),C(1105,315),C(1305,290),C(1590,330),C(1785,300),C(2015,330),C(2195,310),C(2260,425)]
    },
    {
      name: "High Voltage", width: 2480, start: { x: 70, y: 414 }, door: { x: 2385, y: 190 },
      platforms: [P(0,470,380,70),P(560,470,340,70),P(1080,470,300,70),P(1570,470,300,70),P(2060,270,420,270),P(220,360,100),P(650,345,110),P(1160,350,100),P(1650,335,110),P(1900,320,100)],
      moving: [M(380,420,105,"x",180,2.1),M(900,390,110,"x",180,1.8),M(1380,395,110,"x",180,2.3),M(1880,390,105,"y",145,1.6)], falling: [F(1010,315,85),F(1980,280,85)],
      spikes: [S(270,470,2),S(650,470,3),S(1170,470,2),S(1660,470,3)], traps: [T(490,390,"y",80,2.4),T(1000,410,"y",70,2.8),T(1480,400,"y",70,2.5),T(1950,370,"x",65,2.6)],
      checkpoints: [K(1095,410),K(2075,210)], coins: [C(265,320),C(450,365),C(700,305),C(960,335),C(1195,310),C(1450,345),C(1705,295),C(1930,260),C(2150,225),C(2330,225)]
    },
    {
      name: "Precision Run", width: 2600, start: { x: 70, y: 414 }, door: { x: 2500, y: 390 },
      platforms: [P(0,470,330,70),P(520,470,250,70),P(950,470,250,70),P(1390,470,250,70),P(1830,470,250,70),P(2280,470,320,70),P(210,340,90),P(590,330,90),P(1010,325,90),P(1450,320,90),P(1890,315,90),P(2340,330,100)],
      moving: [M(330,395,90,"x",190,2.5),M(770,370,90,"x",180,2.3),M(1200,390,90,"x",190,2.6),M(1640,365,90,"x",190,2.4),M(2080,385,90,"x",200,2.7)], falling: [],
      spikes: [S(230,470,2),S(570,470,2),S(1000,470,2),S(1440,470,2),S(1880,470,2),S(2350,470,2)], traps: [T(430,410,"y",55,3),T(865,400,"y",60,3.1),T(1300,400,"y",65,3),T(1740,400,"y",60,3.2),T(2180,400,"y",60,3.1)],
      checkpoints: [K(965,410),K(1845,410)], coins: [C(250,300),C(410,350),C(630,290),C(840,320),C(1050,285),C(1280,340),C(1490,280),C(1720,315),C(1930,275),C(2160,330),C(2390,290)]
    },
    {
      name: "Dark Conveyor", width: 2720, start: { x: 70, y: 414 }, door: { x: 2625, y: 390 },
      platforms: [P(0,470,450,70),P(620,470,360,70),P(1130,470,330,70),P(1600,470,340,70),P(2090,470,630,70),P(300,350,110),P(720,320,110),P(1210,340,110),P(1680,320,110),P(2200,340,110)],
      moving: [M(450,410,110,"x",170,2.8),M(980,370,110,"x",150,2.6),M(1460,390,110,"x",140,2.9),M(1940,375,110,"x",150,2.7)], falling: [F(840,390,90),F(1810,380,90)],
      spikes: [S(340,470,2),S(700,470,3),S(1200,470,2),S(1690,470,3),S(2210,470,2),S(2440,470,3)], traps: [T(535,420,"y",52,3.3),T(1055,400,"y",70,3.1),T(1530,410,"y",60,3.4),T(2015,400,"y",65,3.2),T(2350,405,"x",85,3)],
      checkpoints: [K(1145,410),K(2105,410)], coins: [C(345,310),C(520,355),C(770,280),C(875,345),C(1040,320),C(1260,300),C(1515,340),C(1735,280),C(1850,335),C(2010,325),C(2255,300),C(2520,425)]
    },
    {
      name: "Final Ascent", width: 2820, start: { x: 70, y: 414 }, door: { x: 2720, y: 130 },
      platforms: [P(0,470,400,70),P(560,470,300,70),P(1010,470,300,70),P(1460,470,300,70),P(1910,470,300,70),P(2470,210,350,330),P(250,350,100),P(650,330,100),P(1090,320,100),P(1540,310,100),P(1990,300,100),P(2280,280,90)],
      moving: [M(400,410,100,"x",160,2.5),M(860,380,100,"x",150,2.7),M(1310,390,100,"x",150,2.6),M(1760,370,100,"x",150,2.8),M(2210,365,90,"y",150,2)], falling: [F(950,300,80),F(1400,285,80),F(1850,275,80),F(2380,250,80)],
      spikes: [S(300,470,2),S(620,470,2),S(1080,470,2),S(1530,470,2),S(1980,470,2)], traps: [T(480,405,"y",60,3.4),T(930,390,"y",65,3.2),T(1380,400,"y",60,3.5),T(1830,390,"y",70,3.3),T(2320,330,"x",70,3.5)],
      checkpoints: [K(1025,410),K(1925,410),K(2485,150)], coins: [C(290,310),C(470,350),C(700,290),C(920,330),C(1135,280),C(1370,330),C(1585,270),C(1815,320),C(2035,260),C(2250,260),C(2415,205),C(2610,165)]
    },
    {
      name: "The Last Door", width: 3100, start: { x: 70, y: 414 }, door: { x: 3005, y: 390 },
      platforms: [P(0,470,360,70),P(520,470,300,70),P(990,470,280,70),P(1430,470,300,70),P(1900,470,280,70),P(2350,470,300,70),P(2820,470,280,70),P(220,340,100),P(610,320,100),P(1070,310,100),P(1510,300,100),P(1980,310,100),P(2430,300,100),P(2870,330,100)],
      moving: [M(360,390,95,"x",160,3),M(820,365,95,"x",170,3.1),M(1270,380,95,"x",160,3.2),M(1730,355,95,"x",170,3.15),M(2180,375,95,"x",170,3.25),M(2650,370,95,"x",170,3.3)], falling: [F(455,310,75),F(915,290,75),F(1365,300,75),F(1825,280,75),F(2275,295,75),F(2745,290,75)],
      spikes: [S(250,470,2),S(600,470,3),S(1040,470,2),S(1490,470,3),S(1960,470,2),S(2410,470,3),S(2880,470,2)], traps: [T(440,410,"y",65,3.6),T(900,400,"y",70,3.5),T(1350,405,"y",65,3.7),T(1810,395,"y",70,3.6),T(2260,405,"y",65,3.8),T(2730,400,"y",70,3.7)],
      checkpoints: [K(1005,410),K(1915,410),K(2835,410)], coins: [C(270,300),C(430,345),C(655,280),C(880,320),C(1115,270),C(1340,335),C(1555,260),C(1790,320),C(2025,270),C(2245,330),C(2475,260),C(2715,325),C(2915,290),C(2960,425)]
    }
  ];

  const dom = {
    level: document.getElementById("levelReadout"), coin: document.getElementById("coinReadout"), lives: document.getElementById("lifeReadout"),
    startOverlay: document.getElementById("startOverlay"), pauseOverlay: document.getElementById("pauseOverlay"), completeOverlay: document.getElementById("completeOverlay"),
    start: document.getElementById("startButton"), pause: document.getElementById("pauseButton"), resume: document.getElementById("resumeButton"), restart: document.getElementById("restartButton"),
    next: document.getElementById("nextButton"), menu: document.getElementById("levelMenuButton"), picker: document.getElementById("levelPicker"),
    toast: document.getElementById("statusToast"), sound: document.getElementById("soundButton"),
    completeKicker: document.getElementById("completeKicker"), completeTitle: document.getElementById("completeTitle"), completeSummary: document.getElementById("completeSummary")
  };

  let save = loadSave();
  let levelIndex = Math.min(save.unlocked - 1, LEVELS.length - 1);
  let level;
  let player;
  let cameraX = 0;
  let running = false;
  let paused = false;
  let completed = false;
  let lastTime = 0;
  let toastTimer = 0;
  let audioContext = null;
  let soundOn = save.sound !== false;
  const keys = { left: false, right: false, jump: false, jumpQueued: false };

  function loadSave() {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY));
      return {
        unlocked: Math.max(1, Math.min(10, Number(data?.unlocked) || 1)),
        coins: Array.isArray(data?.coins) ? data.coins : [],
        sound: data?.sound !== false
      };
    } catch (_) {
      return { unlocked: 1, coins: [], sound: true };
    }
  }

  function writeSave() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }

  function cloneLevel(source) {
    return {
      ...source,
      platforms: source.platforms.map(p => ({ ...p, type: "static" })),
      moving: source.moving.map((p, i) => ({ ...p, baseX: p.x, baseY: p.y, dx: 0, type: "moving", id: i })),
      falling: source.falling.map((p, i) => ({ ...p, baseY: p.y, state: "idle", timer: 0, type: "falling", id: i })),
      checkpoints: source.checkpoints.map((p, i) => ({ ...p, active: false, id: i })),
      coins: source.coins.map((p, i) => ({ ...p, id: i, collected: save.coins.includes(`${levelIndex}:${i}`) })),
      traps: source.traps.map((p, i) => ({ ...p, baseX: p.x, baseY: p.y, id: i }))
    };
  }

  function loadLevel(index, showMenu = false) {
    levelIndex = Math.max(0, Math.min(index, LEVELS.length - 1));
    level = cloneLevel(LEVELS[levelIndex]);
    player = {
      x: level.start.x, y: level.start.y, w: 28, h: 56, vx: 0, vy: 0,
      grounded: false, coyote: 0, facing: 1, spawnX: level.start.x, spawnY: level.start.y,
      lives: 3, invulnerable: 0, runTime: 0
    };
    cameraX = 0;
    completed = false;
    paused = false;
    running = !showMenu;
    dom.startOverlay.classList.toggle("visible", showMenu);
    dom.pauseOverlay.classList.remove("visible");
    dom.completeOverlay.classList.remove("visible");
    dom.pause.textContent = "Pause";
    renderLevelPicker();
    updateHud();
    if (!showMenu) canvas.focus();
  }

  function renderLevelPicker() {
    dom.picker.innerHTML = "";
    LEVELS.forEach((item, index) => {
      const button = document.createElement("button");
      button.className = `level-choice${index < save.unlocked ? " unlocked" : ""}${index === levelIndex ? " selected" : ""}`;
      button.type = "button";
      button.textContent = String(index + 1);
      button.title = index < save.unlocked ? `Level ${index + 1}: ${item.name}` : `Level ${index + 1} locked`;
      button.disabled = index >= save.unlocked;
      button.addEventListener("click", () => {
        levelIndex = index;
        renderLevelPicker();
        dom.start.textContent = `Start Level ${index + 1}`;
      });
      dom.picker.appendChild(button);
    });
    dom.start.textContent = `Start Level ${levelIndex + 1}`;
  }

  function updateHud() {
    const collected = level.coins.filter(c => c.collected).length;
    dom.level.textContent = `${levelIndex + 1} / ${LEVELS.length}`;
    dom.coin.textContent = `${collected} / ${level.coins.length}`;
    dom.lives.textContent = Array.from({ length: 3 }, (_, i) => i < player.lives ? "●" : "○").join(" ");
    dom.sound.textContent = soundOn ? "Sound: On" : "Sound: Off";
    dom.sound.setAttribute("aria-pressed", String(soundOn));
  }

  function showToast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add("visible");
    toastTimer = 1.8;
  }

  function beep(frequency, duration = .08, type = "sine", volume = .05) {
    if (!soundOn) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (_) { /* Sound is an enhancement. */ }
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function solids() {
    return [...level.platforms, ...level.moving, ...level.falling.filter(p => p.state !== "gone")];
  }

  function updatePlatforms(dt, time) {
    level.moving.forEach(platform => {
      const oldX = platform.x;
      const wave = Math.sin(time * platform.speed + platform.phase) * platform.range;
      platform.x = platform.baseX + (platform.axis === "x" ? wave : 0);
      platform.y = platform.baseY + (platform.axis === "y" ? wave : 0);
      platform.dx = platform.x - oldX;
    });
    level.falling.forEach(platform => {
      if (platform.state === "triggered") {
        platform.timer += dt;
        if (platform.timer > .35) platform.state = "falling";
      } else if (platform.state === "falling") {
        platform.y += 430 * dt;
        if (platform.y > H + 180) platform.state = "gone";
      }
    });
  }

  function moveHorizontal(dt) {
    const acceleration = player.grounded ? 2500 : 1450;
    const target = (keys.left ? -320 : 0) + (keys.right ? 320 : 0);
    if (target) {
      player.vx += Math.sign(target - player.vx) * Math.min(Math.abs(target - player.vx), acceleration * dt);
      player.facing = Math.sign(target);
    } else {
      player.vx *= Math.pow(.0008, dt);
      if (Math.abs(player.vx) < 2) player.vx = 0;
    }
    player.x += player.vx * dt;
    solids().forEach(platform => {
      if (!overlap(player, platform)) return;
      if (player.vx > 0) player.x = platform.x - player.w;
      else if (player.vx < 0) player.x = platform.x + platform.w;
      player.vx = 0;
    });
    player.x = Math.max(0, Math.min(level.width - player.w, player.x));
  }

  function moveVertical(dt) {
    const previousBottom = player.y + player.h;
    player.vy = Math.min(980, player.vy + 2200 * dt);
    player.y += player.vy * dt;
    player.grounded = false;
    let standingOn = null;
    solids().forEach(platform => {
      if (!overlap(player, platform)) return;
      if (player.vy >= 0 && previousBottom <= platform.y + 12) {
        player.y = platform.y - player.h;
        player.vy = 0;
        player.grounded = true;
        standingOn = platform;
      } else if (player.vy < 0) {
        player.y = platform.y + platform.h;
        player.vy = 0;
      }
    });
    if (standingOn?.type === "moving") player.x += standingOn.dx;
    if (standingOn?.type === "falling" && standingOn.state === "idle") standingOn.state = "triggered";
    if (player.grounded) player.coyote = .12;
    else player.coyote = Math.max(0, player.coyote - dt);
  }

  function tryJump() {
    if (!keys.jumpQueued) return;
    keys.jumpQueued = false;
    if (player.grounded || player.coyote > 0) {
      player.vy = -790;
      player.grounded = false;
      player.coyote = 0;
      beep(280, .08, "square", .035);
    }
  }

  function movingTrapPosition(trap, time) {
    const wave = Math.sin(time * trap.speed + trap.id) * trap.range;
    return { x: trap.baseX + (trap.axis === "x" ? wave : 0), y: trap.baseY + (trap.axis === "y" ? wave : 0) };
  }

  function checkWorld(time) {
    const hitbox = { x: player.x + 4, y: player.y + 4, w: player.w - 8, h: player.h - 5 };
    for (const spike of level.spikes) {
      const hazard = { x: spike.x, y: spike.y - 25, w: spike.count * 28, h: 25 };
      if (overlap(hitbox, hazard)) return die();
    }
    for (const trap of level.traps) {
      const pos = movingTrapPosition(trap, time);
      const dx = player.x + player.w / 2 - pos.x;
      const dy = player.y + player.h / 2 - pos.y;
      if (Math.hypot(dx, dy) < 28) return die();
    }
    if (player.y > H + 150) return die();

    level.coins.forEach(coin => {
      if (coin.collected) return;
      if (Math.hypot(player.x + player.w / 2 - coin.x, player.y + player.h / 2 - coin.y) < 30) {
        coin.collected = true;
        const id = `${levelIndex}:${coin.id}`;
        if (!save.coins.includes(id)) save.coins.push(id);
        writeSave();
        updateHud();
        beep(720, .09, "sine", .05);
      }
    });

    level.checkpoints.forEach(checkpoint => {
      if (checkpoint.active) return;
      const zone = { x: checkpoint.x - 10, y: checkpoint.y - 64, w: 34, h: 70 };
      if (overlap(player, zone)) {
        level.checkpoints.forEach(item => { item.active = false; });
        checkpoint.active = true;
        player.spawnX = checkpoint.x;
        player.spawnY = checkpoint.y - player.h;
        showToast("Checkpoint activated");
        beep(520, .14, "triangle", .05);
      }
    });

    const door = { x: level.door.x, y: level.door.y, w: 54, h: 80 };
    if (overlap(player, door)) finishLevel();
  }

  function die() {
    if (player.invulnerable > 0 || completed) return;
    player.lives -= 1;
    beep(115, .2, "sawtooth", .045);
    if (player.lives <= 0) {
      player.lives = 3;
      showToast("Three more tries");
    } else {
      showToast("Try again");
    }
    level.falling.forEach(p => { p.y = p.baseY; p.state = "idle"; p.timer = 0; });
    player.x = player.spawnX;
    player.y = player.spawnY;
    player.vx = 0;
    player.vy = 0;
    player.invulnerable = 1;
    updateHud();
  }

  function finishLevel() {
    if (completed) return;
    completed = true;
    running = false;
    const count = level.coins.filter(c => c.collected).length;
    if (levelIndex < LEVELS.length - 1) save.unlocked = Math.max(save.unlocked, levelIndex + 2);
    else save.unlocked = LEVELS.length;
    writeSave();
    renderLevelPicker();
    dom.completeKicker.textContent = levelIndex === LEVELS.length - 1 ? "Escape Complete" : "Level Clear";
    dom.completeTitle.textContent = levelIndex === LEVELS.length - 1 ? "Every door is open." : "Portal reached!";
    dom.completeSummary.textContent = `${level.name} cleared with ${count} of ${level.coins.length} coins.`;
    dom.next.textContent = levelIndex === LEVELS.length - 1 ? "Play Again" : `Continue to Level ${levelIndex + 2}`;
    dom.completeOverlay.classList.add("visible");
    beep(660, .12, "triangle", .05);
    window.setTimeout(() => beep(880, .18, "triangle", .045), 100);
  }

  function update(dt, time) {
    if (!running || paused || completed) return;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.runTime += dt * Math.abs(player.vx) / 160;
    updatePlatforms(dt, time);
    tryJump();
    moveHorizontal(dt);
    moveVertical(dt);
    checkWorld(time);
    const targetCamera = Math.max(0, Math.min(level.width - W, player.x - W * .38));
    cameraX += (targetCamera - cameraX) * Math.min(1, dt * 7);
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) dom.toast.classList.remove("visible");
    }
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "#111b36");
    gradient.addColorStop(.62, "#091123");
    gradient.addColorStop(1, "#050912");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(-(cameraX * .15) % 80, 0);
    ctx.strokeStyle = "rgba(54,229,255,.065)";
    ctx.lineWidth = 1;
    for (let x = -80; x < W + 160; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 60; y < H; y += 80) {
      ctx.beginPath(); ctx.moveTo(-80, y); ctx.lineTo(W + 160, y); ctx.stroke();
    }
    ctx.restore();

    for (let i = 0; i < 20; i++) {
      const x = ((i * 157 - cameraX * .08) % (W + 120) + W + 120) % (W + 120) - 60;
      const y = 45 + (i * 83) % 310;
      ctx.fillStyle = i % 3 ? "rgba(54,229,255,.16)" : "rgba(184,255,87,.18)";
      ctx.fillRect(x, y, 2, 2);
    }
  }

  function drawPlatform(platform, color = "#263a58") {
    const x = platform.x - cameraX;
    if (x + platform.w < -30 || x > W + 30) return;
    ctx.fillStyle = color;
    ctx.fillRect(x, platform.y, platform.w, platform.h);
    ctx.fillStyle = "rgba(91,220,255,.55)";
    ctx.fillRect(x, platform.y, platform.w, 3);
    ctx.fillStyle = "rgba(255,255,255,.04)";
    for (let px = x + 13; px < x + platform.w; px += 32) ctx.fillRect(px, platform.y + 9, 12, 3);
  }

  function drawSpikeGroup(spike) {
    const startX = spike.x - cameraX;
    ctx.fillStyle = "#ff4f72";
    ctx.shadowColor = "rgba(255,79,114,.7)";
    ctx.shadowBlur = 10;
    for (let i = 0; i < spike.count; i++) {
      const x = startX + i * 28;
      ctx.beginPath();
      ctx.moveTo(x, spike.y); ctx.lineTo(x + 14, spike.y - 27); ctx.lineTo(x + 28, spike.y); ctx.closePath(); ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function drawCoin(coin, time) {
    if (coin.collected) return;
    const x = coin.x - cameraX;
    const scale = .45 + Math.abs(Math.sin(time * 5 + coin.id)) * .55;
    ctx.save(); ctx.translate(x, coin.y); ctx.scale(scale, 1);
    ctx.fillStyle = "#ffd54a"; ctx.shadowColor = "#ffd54a"; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff0a5"; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore(); ctx.shadowBlur = 0;
  }

  function drawCheckpoint(checkpoint, time) {
    const x = checkpoint.x - cameraX;
    ctx.strokeStyle = checkpoint.active ? "#b8ff57" : "#73839d";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, checkpoint.y); ctx.lineTo(x, checkpoint.y - 58); ctx.stroke();
    ctx.fillStyle = checkpoint.active ? "#b8ff57" : "#53627a";
    ctx.shadowColor = checkpoint.active ? "#b8ff57" : "transparent"; ctx.shadowBlur = checkpoint.active ? 18 : 0;
    ctx.beginPath(); ctx.moveTo(x + 2, checkpoint.y - 57); ctx.lineTo(x + 28, checkpoint.y - 47); ctx.lineTo(x + 2, checkpoint.y - 36); ctx.closePath(); ctx.fill();
    if (checkpoint.active) {
      ctx.globalAlpha = .18 + Math.sin(time * 5) * .05;
      ctx.fillRect(x - 16, checkpoint.y - 70, 52, 72);
      ctx.globalAlpha = 1;
    }
    ctx.shadowBlur = 0;
  }

  function drawTrap(trap, time) {
    const pos = movingTrapPosition(trap, time);
    const x = pos.x - cameraX;
    ctx.save(); ctx.translate(x, pos.y); ctx.rotate(time * 4.5);
    ctx.fillStyle = "#ff4f9a"; ctx.shadowColor = "#ff4f9a"; ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const radius = i % 2 ? 14 : 24;
      const angle = i * Math.PI / 8;
      const px = Math.cos(angle) * radius, py = Math.sin(angle) * radius;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#111827"; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); ctx.shadowBlur = 0;
  }

  function drawDoor(time) {
    const x = level.door.x - cameraX;
    const y = level.door.y;
    const pulse = 10 + Math.sin(time * 4) * 4;
    ctx.save();
    ctx.shadowColor = "#36e5ff"; ctx.shadowBlur = 24 + pulse;
    ctx.strokeStyle = "#36e5ff"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.roundRect(x, y, 54, 80, 23); ctx.stroke();
    const glow = ctx.createLinearGradient(x, y, x + 54, y + 80);
    glow.addColorStop(0, "rgba(54,229,255,.18)"); glow.addColorStop(1, "rgba(184,255,87,.4)");
    ctx.fillStyle = glow; ctx.fill();
    ctx.fillStyle = "#eaffff"; ctx.font = "900 19px Orbitron"; ctx.textAlign = "center"; ctx.fillText("Y", x + 27, y + 48);
    ctx.restore();
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
    drawBackground();
    level.platforms.forEach(p => drawPlatform(p));
    level.moving.forEach(p => drawPlatform(p, "#244f66"));
    level.falling.filter(p => p.state !== "gone").forEach(p => {
      const flicker = p.state === "triggered" && Math.floor(p.timer * 18) % 2;
      drawPlatform(p, flicker ? "#7c304d" : "#5b3852");
    });
    level.spikes.forEach(drawSpikeGroup);
    level.coins.forEach(c => drawCoin(c, time));
    level.checkpoints.forEach(c => drawCheckpoint(c, time));
    level.traps.forEach(t => drawTrap(t, time));
    drawDoor(time);
    drawPlayer();

    ctx.fillStyle = "rgba(255,255,255,.45)";
    ctx.font = "700 12px Inter";
    ctx.textAlign = "left";
    ctx.fillText(`LEVEL ${levelIndex + 1} · ${level.name.toUpperCase()}`, 18, 28);
  }

  function loop(timestamp) {
    const seconds = timestamp / 1000;
    const dt = Math.min(.033, (timestamp - lastTime) / 1000 || 0);
    lastTime = timestamp;
    update(dt, seconds);
    draw(seconds);
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
    const press = event => { event.preventDefault(); keys[key] = true; button.classList.add("active"); if (key === "jump") keys.jumpQueued = true; };
    const release = event => { event.preventDefault(); keys[key] = false; button.classList.remove("active"); };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  }

  window.addEventListener("keydown", event => {
    const code = event.code;
    if (["ArrowLeft","ArrowRight","ArrowUp","Space","KeyA","KeyD","KeyW"].includes(code)) event.preventDefault();
    if (["ArrowLeft","KeyA"].includes(code)) keys.left = true;
    if (["ArrowRight","KeyD"].includes(code)) keys.right = true;
    if (["ArrowUp","KeyW","Space"].includes(code)) {
      if (!keys.jump) keys.jumpQueued = true;
      keys.jump = true;
    }
    if (code === "KeyR" && running) loadLevel(levelIndex);
    if (code === "Escape") setPaused(!paused);
  });
  window.addEventListener("keyup", event => {
    if (["ArrowLeft","KeyA"].includes(event.code)) keys.left = false;
    if (["ArrowRight","KeyD"].includes(event.code)) keys.right = false;
    if (["ArrowUp","KeyW","Space"].includes(event.code)) keys.jump = false;
  });
  window.addEventListener("blur", () => { keys.left = keys.right = keys.jump = false; if (running && !completed) setPaused(true); });

  bindHold(document.getElementById("leftButton"), "left");
  bindHold(document.getElementById("rightButton"), "right");
  bindHold(document.getElementById("jumpButton"), "jump");

  dom.start.addEventListener("click", () => loadLevel(levelIndex));
  dom.pause.addEventListener("click", () => setPaused(!paused));
  dom.resume.addEventListener("click", () => setPaused(false));
  dom.restart.addEventListener("click", () => loadLevel(levelIndex));
  dom.next.addEventListener("click", () => loadLevel(levelIndex === LEVELS.length - 1 ? 0 : levelIndex + 1));
  dom.menu.addEventListener("click", () => loadLevel(levelIndex, true));
  dom.sound.addEventListener("click", () => { soundOn = !soundOn; save.sound = soundOn; writeSave(); updateHud(); if (soundOn) beep(520); });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running && !completed) setPaused(true);
  });

  loadLevel(levelIndex, true);
  requestAnimationFrame(loop);
})();
