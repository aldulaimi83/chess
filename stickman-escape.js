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
  const Y = (x, y) => ({ x, y });
  const E = (x, y, range = 55, speed = 1.5) => ({ x, y, range, speed });
  const SH = (x, y, rangeX = 70, rangeY = 30, speed = 1.3) => ({ x, y, rangeX, rangeY, speed });

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
      checkpoints: [K(1005,410)], coins: [C(265,315),C(445,365),C(720,295),C(890,360),C(1165,300),C(1360,290),C(1655,310),C(1900,425)],
      yoyoPickup: { x: 770, y: 300 }
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

  const ADVANCED_LEVEL_NAMES = [
    "Second Shift", "Needle Bridge", "Pulse Crossing", "Low Margin", "Falling Rhythm",
    "Saw Corridor", "Clockwork Steps", "Narrow Route", "Red Circuit", "Double Motion",
    "Glass Run", "Trap Relay", "No Easy Floor", "Blinking Gap", "Machine Core",
    "Last Checkpoint", "Edge Control", "Precision Line", "The Long Crossing", "Final Escape"
  ];

  function buildAdvancedLevel(number) {
    const difficulty = number - 11;
    const islandCount = 9 + Math.floor(difficulty / 7);
    const platforms = [], moving = [], falling = [], spikes = [], traps = [], checkpoints = [], coins = [], yoyoHooks = [], enemies = [], shadows = [];
    let x = 0;

    for (let i = 0; i < islandCount; i += 1) {
      const width = i === 0 ? 350 : Math.max(190, 280 - difficulty * 3 + (i % 3) * 20);
      platforms.push(P(x, 470, width, 70));
      coins.push(C(x + Math.min(width - 45, 100 + (i % 3) * 32), 420 - (i % 2) * 82));

      if (i > 0 && i < islandCount - 1) {
        const spikeCount = 1 + ((i + difficulty) % (difficulty > 8 ? 3 : 2));
        spikes.push(S(x + 90 + (i % 2) * 16, 470, spikeCount));
      }
      if (i === Math.floor(islandCount / 3) || i === Math.floor(islandCount * 2 / 3)) checkpoints.push(K(x + 24, 410));
      if (i > 0 && i < islandCount - 1 && i % 3 === 0) {
        traps.push(T(x + width * .52, 420, "y", 28 + difficulty * 1.4, 2.2 + difficulty * .055));
        if (difficulty > 6) traps.push(T(x + width * .76, 405, "x", 24 + difficulty, 2.5 + difficulty * .05));
      }
      if (number === 25 && i === 4) enemies.push(E(x + width * .62, 444, 48, 1.65));

      if (i < islandCount - 1) {
        const yoyoGap = (number === 22 && i === 4) || (number === 28 && i === 6);
        const gap = yoyoGap ? 300 : Math.min(172, 116 + difficulty * 2 + (i % 3) * 10);
        const gapStart = x + width;
        spikes.push(S(gapStart, 535, Math.max(4, Math.ceil(gap / 28))));
        if (yoyoGap) yoyoHooks.push(Y(gapStart + gap * .58, 320));
        else if (i % 2 === 0) moving.push(M(gapStart + gap / 2 - 43, 400 - (i % 3) * 20, 86, i % 4 ? "x" : "y", 28 + difficulty * 2, 1.8 + difficulty * .06, i));
        else falling.push(F(gapStart + gap / 2 - 38, 402 - (i % 3) * 22, 76));
        x += width + gap;
      }
    }

    const last = platforms[platforms.length - 1];
    const shadowCount = number >= 21 ? 2 : 1;
    for (let i = 0; i < shadowCount; i += 1) {
      const platform = platforms[Math.floor((i + 1) * platforms.length / (shadowCount + 1))];
      shadows.push(SH(platform.x + platform.w * .55, 285 - i * 24, 58 + difficulty * 2, 24 + difficulty, 1.15 + difficulty * .025 + i * .12));
    }
    return {
      name: ADVANCED_LEVEL_NAMES[difficulty], width: last.x + last.w,
      start: { x: 70, y: 414 }, door: { x: last.x + last.w - 86, y: 390 },
      platforms, moving, falling, spikes, traps, checkpoints, coins, yoyoHooks, enemies, shadows
    };
  }

  for (let number = 11; number <= 30; number += 1) LEVELS.push(buildAdvancedLevel(number));

  function validateAdvancedLevels() {
    if (LEVELS.length !== 30) throw new Error("Stickman Escape requires exactly 30 levels");
    LEVELS.slice(10).forEach((level, index) => {
      const ground = level.platforms.filter(platform => platform.y === 470).sort((a, b) => a.x - b.x);
      for (let i = 1; i < ground.length; i += 1) {
        const gap = ground[i].x - (ground[i - 1].x + ground[i - 1].w);
        const hasHook = level.yoyoHooks?.some(hook => hook.x > ground[i - 1].x + ground[i - 1].w && hook.x < ground[i].x);
        if (gap > 172 && (!hasHook || gap > 300)) throw new Error(`Level ${index + 11} has an unreachable gap`);
      }
      if (!level.moving.length || !level.falling.length || !level.spikes.length || !level.traps.length) throw new Error(`Level ${index + 11} is missing advanced obstacles`);
    });
  }

  const ACHIEVEMENTS = [
    { id: "first_escape", label: "First Escape" },
    { id: "coin_hunter", label: "Coin Hunter" },
    { id: "treasure_master", label: "Treasure Master" },
    { id: "survivor", label: "Survivor" },
    { id: "perfectionist", label: "Perfectionist" },
    { id: "speed_runner", label: "Speed Runner" },
    { id: "explorer", label: "Explorer" },
    { id: "veteran", label: "Veteran Escapee" },
    { id: "master_escape", label: "Master Escape" }
  ];

  const dom = {
    level: document.getElementById("levelReadout"), coin: document.getElementById("coinReadout"), totalCoins: document.getElementById("totalCoinReadout"),
    deaths: document.getElementById("deathReadout"), timer: document.getElementById("timerReadout"),
    startOverlay: document.getElementById("startOverlay"), pauseOverlay: document.getElementById("pauseOverlay"), completeOverlay: document.getElementById("completeOverlay"), gameCompleteOverlay: document.getElementById("gameCompleteOverlay"),
    start: document.getElementById("startButton"), pause: document.getElementById("pauseButton"), resume: document.getElementById("resumeButton"), restart: document.getElementById("restartButton"),
    next: document.getElementById("nextButton"), replayLevel: document.getElementById("replayLevelButton"), menu: document.getElementById("levelMenuButton"), picker: document.getElementById("levelPicker"),
    toast: document.getElementById("statusToast"), sound: document.getElementById("soundButton"),
    completeKicker: document.getElementById("completeKicker"), completeTitle: document.getElementById("completeTitle"), earnedStars: document.getElementById("earnedStars"), completionStats: document.getElementById("completionStats"),
    achievementList: document.getElementById("achievementList"), achievementCount: document.getElementById("achievementCount"),
    gameCompleteStats: document.getElementById("gameCompleteStats"), playAgain: document.getElementById("playAgainButton"), gameLevelSelect: document.getElementById("gameLevelSelectButton"), confetti: document.getElementById("confettiLayer"),
    introOverlay: document.getElementById("introOverlay"), introCanvas: document.getElementById("introCanvas"), introTitle: document.getElementById("introTitleCard"), introStart: document.getElementById("introStartButton"), skipIntro: document.getElementById("skipIntroButton"),
    replayIntro: document.getElementById("replayIntroButton"), endingReplayIntro: document.getElementById("endingReplayIntroButton"),
    yoyoStatus: document.getElementById("yoyoStatus"), yoyoFill: document.getElementById("yoyoCooldownFill"), yoyoText: document.getElementById("yoyoCooldownText"), yoyoButton: document.getElementById("yoyoButton"), whistleButton: document.getElementById("whistleButton"), whistleToolbar: document.getElementById("whistleToolbarButton")
  };

  const YOYO_FALLBACK_LEVEL = 21;
  const YOYO_COOLDOWN = .7;
  const YOYO_RANGE = 380;
  const WHISTLE_COOLDOWN = 8.6;
  const WHISTLE_LOOP_DURATION = 8.5;
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
  let sessionDeaths = 0;
  let levelDeaths = 0;
  let levelElapsed = 0;
  let campaignElapsed = save.campaignTime;
  let saveTimer = 0;
  let audioContext = null;
  let audioUnlocked = false;
  let whistleBus = null;
  let introWhistleTimer = null;
  let introWhistleNextTime = 0;
  const introWhistleVoices = new Set();
  let soundOn = save.sound !== false;
  let yoyo;
  let whistleCooldown = 0;
  const keys = { left: false, right: false, jump: false, jumpQueued: false };

  function loadSave() {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY));
      const coins = Array.isArray(data?.coins) ? [...new Set(data.coins)] : [];
      return {
        unlocked: Math.max(1, Math.min(LEVELS.length, Number(data?.unlocked) || 1)),
        coins,
        sound: data?.sound !== false,
        introSeen: data?.introSeen === true,
        totalDeaths: Math.max(0, Number(data?.totalDeaths) || 0),
        deathsByLevel: data?.deathsByLevel && typeof data.deathsByLevel === "object" ? data.deathsByLevel : {},
        bestTimes: data?.bestTimes && typeof data.bestTimes === "object" ? data.bestTimes : {},
        bestGameTime: Number(data?.bestGameTime) > 0 ? Number(data.bestGameTime) : null,
        stars: data?.stars && typeof data.stars === "object" ? data.stars : {},
        achievements: Array.isArray(data?.achievements) ? [...new Set(data.achievements)] : [],
        lifetimeCoins: Math.max(coins.length, Number(data?.lifetimeCoins) || 0),
        campaignTime: Math.max(0, Number(data?.campaignTime) || 0),
        yoyoTutorialSeen: data?.yoyoTutorialSeen === true,
        yoyoUnlocked: data?.yoyoUnlocked === true || (Number(data?.unlocked) || 1) >= YOYO_FALLBACK_LEVEL + 1
      };
    } catch (_) {
      return { unlocked: 1, coins: [], sound: true, introSeen: false, totalDeaths: 0, deathsByLevel: {}, bestTimes: {}, bestGameTime: null, stars: {}, achievements: [], lifetimeCoins: 0, campaignTime: 0, yoyoTutorialSeen: false, yoyoUnlocked: false };
    }
  }

  function writeSave() {
    save.lifetimeCoins = Math.max(save.lifetimeCoins, save.coins.length);
    save.campaignTime = campaignElapsed;
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(total / 60);
    return `${String(minutes).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  function totalStars() {
    return Object.values(save.stars).reduce((sum, value) => sum + Math.max(0, Math.min(3, Number(value) || 0)), 0);
  }

  function cloneLevel(source) {
    return {
      ...source,
      platforms: source.platforms.map(p => ({ ...p, type: "static" })),
      moving: source.moving.map((p, i) => ({ ...p, baseX: p.x, baseY: p.y, dx: 0, type: "moving", id: i })),
      falling: source.falling.map((p, i) => ({ ...p, baseY: p.y, state: "idle", timer: 0, type: "falling", id: i })),
      checkpoints: source.checkpoints.map((p, i) => ({ ...p, active: false, id: i })),
      coins: source.coins.map((p, i) => ({ ...p, id: i, collected: save.coins.includes(`${levelIndex}:${i}`) })),
      traps: source.traps.map((p, i) => ({ ...p, baseX: p.x, baseY: p.y, id: i })),
      yoyoHooks: (source.yoyoHooks || []).map((p, i) => ({ ...p, id: i })),
      enemies: (source.enemies || []).map((p, i) => ({ ...p, baseX: p.x, id: i, disabled: false, knockback: 0 })),
      shadows: (source.shadows || []).map((p, i) => ({ ...p, baseX: p.x, baseY: p.y, id: i, defeated: false, knockback: 0 })),
      yoyoPickup: source.yoyoPickup ? { ...source.yoyoPickup, collected: save.yoyoUnlocked } : null
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
    resetYoyo();
    whistleCooldown = 0;
    cameraX = 0;
    levelDeaths = 0;
    levelElapsed = 0;
    completed = false;
    paused = false;
    running = !showMenu;
    dom.startOverlay.classList.toggle("visible", showMenu);
    dom.pauseOverlay.classList.remove("visible");
    dom.completeOverlay.classList.remove("visible");
    dom.gameCompleteOverlay.classList.remove("visible");
    dom.pause.textContent = "Pause";
    renderLevelPicker();
    updateHud();
    if (!showMenu) {
      canvas.focus();
      if (yoyoAvailable() && !save.yoyoTutorialSeen) {
        save.yoyoTutorialSeen = true;
        writeSave();
        showToast("Press F to throw yo-yo. Hit hooks to cross big gaps.", 5);
      }
    }
  }

  function renderLevelPicker() {
    dom.picker.innerHTML = "";
    LEVELS.forEach((item, index) => {
      const button = document.createElement("button");
      button.className = `level-choice${index < save.unlocked ? " unlocked" : ""}${index === levelIndex ? " selected" : ""}`;
      button.type = "button";
      const stars = Math.max(0, Math.min(3, Number(save.stars[index]) || 0));
      button.innerHTML = `<span class="level-choice-number">${index + 1}</span><span class="level-stars${stars ? " earned" : ""}">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</span>`;
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
    renderAchievements();
  }

  function updateHud() {
    const collected = level.coins.filter(c => c.collected).length;
    dom.level.textContent = `${levelIndex + 1} / ${LEVELS.length}`;
    dom.coin.textContent = `${collected} / ${level.coins.length}`;
    dom.totalCoins.textContent = String(save.coins.length);
    dom.deaths.textContent = String(sessionDeaths);
    dom.timer.textContent = formatTime(levelElapsed);
    dom.sound.textContent = soundOn ? "Sound: On" : "Sound: Off";
    dom.sound.setAttribute("aria-pressed", String(soundOn));
    const available = yoyoAvailable();
    const ready = available && yoyo?.state === "ready" && yoyo.cooldown <= 0;
    const cooldownProgress = available ? Math.max(0, Math.min(1, 1 - yoyo.cooldown / YOYO_COOLDOWN)) : 0;
    dom.yoyoFill.style.width = `${cooldownProgress * 100}%`;
    dom.yoyoText.textContent = !available ? "Locked" : ready ? "Ready" : yoyo.state === "hooked" ? "Hooked" : "Busy";
    dom.yoyoStatus.classList.toggle("ready", ready);
    dom.yoyoButton.disabled = !available;
    dom.whistleButton.disabled = whistleCooldown > 0;
    dom.whistleButton.textContent = whistleCooldown > 0 ? `${Math.ceil(whistleCooldown)}s` : "Whistle";
    dom.whistleToolbar.disabled = whistleCooldown > 0;
    dom.whistleToolbar.textContent = whistleCooldown > 0 ? `Whistle ${Math.ceil(whistleCooldown)}s` : "Whistle (G)";
  }

  function showToast(message, duration = 1.8) {
    dom.toast.textContent = message;
    dom.toast.classList.add("visible");
    toastTimer = duration;
  }

  function showAchievementToast(message) {
    dom.toast.classList.add("achievement-toast");
    showToast(`Achievement: ${message}`);
  }

  function unlockAudio() {
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      audioUnlocked = true;
      if (!dom.introOverlay.classList.contains("hidden") && !introWhistlePlayed) {
        startIntroWhistle();
      }
    } catch (_) { /* Sound is an enhancement. */ }
  }

  function scheduleTone(frequency, endFrequency, duration, type, volume, delay = 0) {
    if (!soundOn || !audioUnlocked || !audioContext) return;
    const start = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(.012, duration * .2));
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .01);
  }

  function getWhistleBus() {
    if (whistleBus) return whistleBus;
    const master = audioContext.createGain();
    const reverb = audioContext.createConvolver();
    const wet = audioContext.createGain();
    const length = Math.floor(audioContext.sampleRate * 1.15);
    const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2);
    }
    master.gain.value = .3;
    wet.gain.value = .14;
    reverb.buffer = impulse;
    reverb.connect(wet).connect(master);
    master.connect(audioContext.destination);
    whistleBus = { dry: master, reverb };
    return whistleBus;
  }

  function scheduleWhistleNote(frequency, duration, volume, delay = 0, introVoice = false) {
    if (!soundOn || !audioUnlocked || !audioContext) return;
    const start = audioContext.currentTime + delay;
    const end = start + duration;
    const whistle = audioContext.createOscillator();
    const harmonic = audioContext.createOscillator();
    const harmonicGain = audioContext.createGain();
    const envelope = audioContext.createGain();
    const vibrato = audioContext.createOscillator();
    const vibratoDepth = audioContext.createGain();
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
    const voice = { whistle, harmonic, vibrato };
    if (introVoice) introWhistleVoices.add(voice);
    whistle.onended = () => introWhistleVoices.delete(voice);
    whistle.start(start); harmonic.start(start); vibrato.start(start);
    whistle.stop(end + .01); harmonic.stop(end + .01); vibrato.stop(end + .01);
  }

  function scheduleWhistleMelody(delay = 0, introVoice = false) {
    const note = (frequency, duration, start, volume = .09) => scheduleWhistleNote(frequency, duration, volume, delay + start, introVoice);
    note(659.25, .5, 0); note(783.99, .5, .5); note(880, 1, 1, .095);
    note(783.99, .5, 2); note(659.25, .5, 2.5); note(587.33, 1, 3, .085);
    note(659.25, .5, 4.5); note(783.99, .5, 5); note(987.77, 1, 5.5, .095);
    note(880, .5, 6.5); note(783.99, .5, 7); note(659.25, 1, 7.5, .088);
  }

  function stopIntroWhistle() {
    if (introWhistleTimer) window.clearInterval(introWhistleTimer);
    introWhistleTimer = null;
    introWhistleVoices.forEach(voice => {
      [voice.whistle, voice.harmonic, voice.vibrato].forEach(oscillator => { try { oscillator.stop(); } catch (_) {} });
    });
    introWhistleVoices.clear();
    introWhistlePlayed = false;
  }

  function startIntroWhistle() {
    if (!soundOn || !audioUnlocked || !audioContext) return;
    stopIntroWhistle();
    introWhistlePlayed = true;
    introWhistleNextTime = audioContext.currentTime;
    const pump = () => {
      while (introWhistleNextTime < audioContext.currentTime + .6) {
        scheduleWhistleMelody(Math.max(0, introWhistleNextTime - audioContext.currentTime), true);
        introWhistleNextTime += WHISTLE_LOOP_DURATION - .04;
      }
    };
    pump();
    introWhistleTimer = window.setInterval(pump, 250);
  }

  function playSound(name) {
    if (!soundOn || !audioUnlocked) return;
    const tone = (from, to, duration, type, volume, delay = 0) => scheduleTone(from, to, duration, type, volume, delay);
    if (name === "jump") tone(240, 520, .11, "square", .035);
    if (name === "coin") {
      tone(880, 1320, .07, "sine", .05);
      tone(1480, 1960, .06, "triangle", .035, .045);
    }
    if (name === "checkpoint") {
      tone(440, 520, .16, "sine", .035);
      tone(660, 784, .2, "sine", .04, .1);
    }
    if (name === "death") tone(190, 65, .32, "sawtooth", .045);
    if (name === "complete") {
      tone(523, 523, .11, "triangle", .04);
      tone(659, 659, .12, "triangle", .045, .1);
      tone(784, 880, .2, "triangle", .05, .2);
    }
    if (name === "achievement") {
      tone(587, 659, .1, "triangle", .035);
      tone(784, 880, .12, "triangle", .04, .08);
      tone(1047, 1319, .23, "sine", .05, .17);
    }
    if (name === "gameComplete") {
      tone(523, 587, .16, "triangle", .04);
      tone(659, 698, .16, "triangle", .045, .14);
      tone(784, 880, .18, "triangle", .05, .28);
      tone(1047, 1175, .2, "sine", .05, .43);
      tone(1319, 1568, .42, "sine", .055, .61);
    }
    if (name === "yoyoThrow") tone(240, 620, .14, "triangle", .035);
    if (name === "yoyoHook") {
      tone(520, 720, .12, "sine", .04);
      tone(880, 1040, .18, "triangle", .035, .08);
    }
    if (name === "yoyoHit") {
      tone(210, 95, .16, "square", .035);
      tone(420, 300, .1, "triangle", .025, .04);
    }
    if (name === "whistle") {
      scheduleWhistleMelody();
    }
    if (name === "button") tone(300, 220, .035, "square", .018);
  }

  window.addEventListener("pointerdown", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio);

  function renderAchievements() {
    dom.achievementList.innerHTML = "";
    ACHIEVEMENTS.forEach(item => {
      const badge = document.createElement("span");
      const unlocked = save.achievements.includes(item.id);
      badge.className = `achievement-badge${unlocked ? " unlocked" : ""}`;
      badge.textContent = `${unlocked ? "✓" : "○"} ${item.label}`;
      dom.achievementList.appendChild(badge);
    });
    dom.achievementCount.textContent = `${save.achievements.length} / ${ACHIEVEMENTS.length}`;
  }

  function unlockAchievement(id) {
    if (save.achievements.includes(id)) return;
    const achievement = ACHIEVEMENTS.find(item => item.id === id);
    if (!achievement) return;
    save.achievements.push(id);
    writeSave();
    renderAchievements();
    showAchievementToast(achievement.label);
    playSound("achievement");
  }

  function checkCoinAchievements() {
    if (save.coins.length >= 25) unlockAchievement("coin_hunter");
    if (save.coins.length >= 50) unlockAchievement("treasure_master");
  }

  function starTarget(index) {
    return 35 + index * 3;
  }

  function calculateStars() {
    const coins = level.coins.filter(coin => coin.collected).length;
    if (coins === level.coins.length && levelDeaths === 0 && levelElapsed <= starTarget(levelIndex)) return 3;
    if (coins >= Math.ceil(level.coins.length * .7) && levelDeaths <= 2) return 2;
    return 1;
  }

  function completionStatsHtml(items) {
    return items.map(([label, value]) => `<div class="completion-stat"><span>${label}</span><strong>${value}</strong></div>`).join("");
  }

  function completionPercentage() {
    const levelProgress = Math.min(30, save.unlocked) / 30;
    const starProgress = totalStars() / 90;
    const achievementProgress = save.achievements.length / ACHIEVEMENTS.length;
    return Math.round((levelProgress * .6 + starProgress * .25 + achievementProgress * .15) * 100);
  }

  function createConfetti() {
    dom.confetti.innerHTML = "";
    const colors = ["#36e5ff", "#b8ff57", "#ff4f9a", "#ffd54a"];
    for (let i = 0; i < 28; i += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti";
      piece.style.left = `${(i * 37) % 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${(i % 9) * .13}s`;
      dom.confetti.appendChild(piece);
    }
  }

  function showGameComplete() {
    dom.completeOverlay.classList.remove("visible");
    dom.gameCompleteStats.innerHTML = completionStatsHtml([
      ["Total Time", formatTime(campaignElapsed)], ["Best Time", formatTime(save.bestGameTime)],
      ["Total Deaths", String(save.totalDeaths)], ["Total Coins", String(save.coins.length)],
      ["Total Stars", `${totalStars()} / 90`], ["Achievements", `${save.achievements.length} / ${ACHIEVEMENTS.length}`],
      ["Completion", `${completionPercentage()}%`], ["Badge", "Master Escape"]
    ]);
    createConfetti();
    dom.gameCompleteOverlay.classList.add("visible");
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function yoyoAvailable() {
    return save.yoyoUnlocked || levelIndex >= YOYO_FALLBACK_LEVEL;
  }

  function gameplayWhistle() {
    if (!running || paused || completed || whistleCooldown > 0) return;
    whistleCooldown = WHISTLE_COOLDOWN;
    showToast("♪ Whistling...", 1.5);
    playSound("whistle");
    updateHud();
  }

  function yoyoHand() {
    return { x: player.x + player.w / 2 + player.facing * 12, y: player.y + 35 };
  }

  function resetYoyo() {
    const hand = yoyoHand();
    yoyo = { state: "ready", x: hand.x, y: hand.y, vx: 0, vy: 0, distance: 0, cooldown: 0, direction: player.facing, hook: null, hookTime: 0 };
  }

  function throwYoyo() {
    if (!running || paused || completed || !yoyoAvailable() || yoyo.state !== "ready" || yoyo.cooldown > 0) return;
    const hand = yoyoHand();
    const hookTarget = level.yoyoHooks
      .filter(hook => (hook.x - hand.x) * player.facing > 12 && Math.hypot(hook.x - hand.x, hook.y - hand.y) <= YOYO_RANGE)
      .sort((a, b) => Math.hypot(a.x - hand.x, a.y - hand.y) - Math.hypot(b.x - hand.x, b.y - hand.y))[0];
    const combatTarget = [...level.shadows.filter(shadow => !shadow.defeated), ...level.enemies.filter(enemy => !enemy.disabled)]
      .filter(item => (item.x - hand.x) * player.facing > 12 && Math.hypot(item.x - hand.x, item.y - hand.y) <= YOYO_RANGE)
      .sort((a, b) => Math.hypot(a.x - hand.x, a.y - hand.y) - Math.hypot(b.x - hand.x, b.y - hand.y))[0];
    const target = hookTarget || combatTarget;
    const dx = target ? target.x - hand.x : player.facing;
    const dy = target ? target.y - hand.y : 0;
    const length = Math.max(1, Math.hypot(dx, dy));
    yoyo.state = "outbound";
    yoyo.x = hand.x;
    yoyo.y = hand.y;
    yoyo.vx = dx / length * 820;
    yoyo.vy = dy / length * 820;
    yoyo.distance = 0;
    yoyo.direction = player.facing;
    yoyo.cooldown = YOYO_COOLDOWN;
    playSound("yoyoThrow");
  }

  function returnYoyo() {
    if (yoyo.state !== "ready") {
      yoyo.state = "returning";
      yoyo.hook = null;
    }
  }

  function updateEnemies(dt, time) {
    level.enemies.forEach(enemy => {
      if (enemy.disabled) {
        enemy.x += enemy.knockback * dt;
        enemy.knockback *= Math.pow(.01, dt);
      } else {
        enemy.x = enemy.baseX + Math.sin(time * enemy.speed + enemy.id) * enemy.range;
      }
    });
  }

  function updateShadows(dt, time) {
    level.shadows.forEach(shadow => {
      if (shadow.defeated) {
        shadow.x += shadow.knockback * dt;
        shadow.y -= 70 * dt;
        shadow.knockback *= Math.pow(.02, dt);
      } else {
        shadow.x = shadow.baseX + Math.sin(time * shadow.speed + shadow.id * 1.7) * shadow.rangeX;
        shadow.y = shadow.baseY + Math.cos(time * shadow.speed * .8 + shadow.id) * shadow.rangeY;
      }
    });
  }

  function collectCoin(coin) {
    if (coin.collected) return;
    coin.collected = true;
    const id = `${levelIndex}:${coin.id}`;
    if (!save.coins.includes(id)) save.coins.push(id);
    checkCoinAchievements();
    writeSave();
    updateHud();
    playSound("coin");
  }

  function checkYoyoTargets() {
    if (yoyo.state === "ready") return;
    level.coins.forEach(coin => {
      if (!coin.collected && Math.hypot(yoyo.x - coin.x, yoyo.y - coin.y) < 27) collectCoin(coin);
    });
    const enemy = level.enemies.find(item => !item.disabled && Math.hypot(yoyo.x - item.x, yoyo.y - item.y) < 28);
    if (enemy) {
      enemy.disabled = true;
      enemy.knockback = yoyo.direction * 260;
      enemy.x += yoyo.direction * 18;
      showToast("Hazard disabled", 1.8);
      playSound("yoyoHit");
      returnYoyo();
      return;
    }
    const shadow = level.shadows.find(item => !item.defeated && Math.hypot(yoyo.x - item.x, yoyo.y - item.y) < 32);
    if (shadow) {
      shadow.defeated = true;
      shadow.knockback = yoyo.direction * 300;
      showToast("Flying shadow defeated", 1.8);
      playSound("yoyoHit");
      returnYoyo();
    }
  }

  function updateYoyo(dt) {
    yoyo.cooldown = Math.max(0, yoyo.cooldown - dt);
    const hand = yoyoHand();
    if (yoyo.state === "ready") {
      yoyo.x = hand.x;
      yoyo.y = hand.y;
      return;
    }
    if (yoyo.state === "outbound") {
      const stepX = yoyo.vx * dt;
      const stepY = yoyo.vy * dt;
      yoyo.x += stepX;
      yoyo.y += stepY;
      yoyo.distance += Math.hypot(stepX, stepY);
      const hook = level.yoyoHooks.find(item => Math.hypot(yoyo.x - item.x, yoyo.y - item.y) < 30);
      if (hook) {
        yoyo.state = "hooked";
        yoyo.hook = hook;
        yoyo.hookTime = .86;
        yoyo.x = hook.x;
        yoyo.y = hook.y;
        yoyo.direction = Math.sign(hook.x - hand.x) || player.facing;
        player.facing = yoyo.direction;
        player.vx = yoyo.direction * 500;
        player.vy = Math.min(player.vy, -560);
        showToast("Yo-yo hook connected!", 2.2);
        playSound("yoyoHook");
        return;
      }
      if (yoyo.distance >= YOYO_RANGE) returnYoyo();
    } else if (yoyo.state === "hooked") {
      yoyo.x = yoyo.hook.x;
      yoyo.y = yoyo.hook.y;
      yoyo.hookTime -= dt;
      if (yoyo.hookTime <= 0) returnYoyo();
    } else if (yoyo.state === "returning") {
      const dx = hand.x - yoyo.x;
      const dy = hand.y - yoyo.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 18) {
        yoyo.state = "ready";
        yoyo.x = hand.x;
        yoyo.y = hand.y;
      } else {
        const step = Math.min(distance, 1050 * dt);
        yoyo.x += dx / distance * step;
        yoyo.y += dy / distance * step;
      }
    }
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
    const hooked = yoyo?.state === "hooked";
    const acceleration = hooked ? 3600 : player.grounded ? 2500 : 1450;
    const target = hooked ? yoyo.direction * 520 : (keys.left ? -320 : 0) + (keys.right ? 320 : 0);
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
    const gravity = yoyo?.state === "hooked" ? 900 : 2200;
    player.vy = Math.min(980, player.vy + gravity * dt);
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
      playSound("jump");
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
    for (const enemy of level.enemies) {
      if (!enemy.disabled && overlap(hitbox, { x: enemy.x - 18, y: enemy.y - 20, w: 36, h: 40 })) return die();
    }
    for (const shadow of level.shadows) {
      if (!shadow.defeated && overlap(hitbox, { x: shadow.x - 23, y: shadow.y - 15, w: 46, h: 30 })) return die();
    }
    if (player.y > H + 150) return die();

    if (level.yoyoPickup && !level.yoyoPickup.collected && Math.hypot(player.x + player.w / 2 - level.yoyoPickup.x, player.y + player.h / 2 - level.yoyoPickup.y) < 34) {
      level.yoyoPickup.collected = true;
      save.yoyoUnlocked = true;
      save.yoyoTutorialSeen = true;
      writeSave();
      updateHud();
      showToast("Yo-yo found! Press F to throw yo-yo. Hit hooks to cross big gaps.", 5);
      playSound("yoyoHook");
    }

    level.coins.forEach(coin => {
      if (coin.collected) return;
      if (Math.hypot(player.x + player.w / 2 - coin.x, player.y + player.h / 2 - coin.y) < 30) collectCoin(coin);
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
        playSound("checkpoint");
      }
    });

    const door = { x: level.door.x, y: level.door.y, w: 54, h: 80 };
    if (overlap(player, door)) finishLevel();
  }

  function die() {
    if (player.invulnerable > 0 || completed) return;
    player.lives -= 1;
    sessionDeaths += 1;
    levelDeaths += 1;
    save.totalDeaths += 1;
    save.deathsByLevel[levelIndex] = Math.max(0, Number(save.deathsByLevel[levelIndex]) || 0) + 1;
    writeSave();
    playSound("death");
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
    resetYoyo();
    updateHud();
  }

  function finishLevel() {
    if (completed) return;
    completed = true;
    running = false;
    const count = level.coins.filter(c => c.collected).length;
    const stars = calculateStars();
    const previousBest = Number(save.bestTimes[levelIndex]) || Infinity;
    save.bestTimes[levelIndex] = Math.min(previousBest, levelElapsed);
    save.stars[levelIndex] = Math.max(Number(save.stars[levelIndex]) || 0, stars);
    if (levelIndex < LEVELS.length - 1) save.unlocked = Math.max(save.unlocked, levelIndex + 2);
    else save.unlocked = LEVELS.length;
    if (levelIndex === 0) unlockAchievement("first_escape");
    if (levelDeaths === 0) unlockAchievement("survivor");
    if (stars === 3) unlockAchievement("perfectionist");
    if (levelElapsed <= starTarget(levelIndex)) unlockAchievement("speed_runner");
    if (levelIndex + 1 >= 10) unlockAchievement("explorer");
    if (levelIndex + 1 >= 20) unlockAchievement("veteran");
    writeSave();
    renderLevelPicker();
    if (levelIndex === LEVELS.length - 1) {
      unlockAchievement("master_escape");
      save.bestGameTime = save.bestGameTime ? Math.min(save.bestGameTime, campaignElapsed) : campaignElapsed;
      writeSave();
      showGameComplete();
      playSound("gameComplete");
      return;
    }
    dom.completeKicker.textContent = `Level ${levelIndex + 1} Complete`;
    dom.completeTitle.textContent = "Portal reached!";
    dom.earnedStars.textContent = `${"★".repeat(stars)}${"☆".repeat(3 - stars)}`;
    dom.completionStats.innerHTML = completionStatsHtml([
      ["Time", formatTime(levelElapsed)], ["Best", formatTime(save.bestTimes[levelIndex])],
      ["Coins", `${count} / ${level.coins.length}`], ["Deaths", String(levelDeaths)],
      ["Stars", `${stars} / 3`], ["Total Stars", `${totalStars()} / 90`]
    ]);
    dom.next.textContent = `Continue to Level ${levelIndex + 2}`;
    dom.completeOverlay.classList.add("visible");
    playSound("complete");
  }

  function update(dt, time) {
    if (!running || paused || completed) return;
    levelElapsed += dt;
    campaignElapsed += dt;
    saveTimer += dt;
    if (saveTimer >= 1) { saveTimer = 0; writeSave(); }
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    whistleCooldown = Math.max(0, whistleCooldown - dt);
    player.runTime += dt * Math.abs(player.vx) / 160;
    updatePlatforms(dt, time);
    updateEnemies(dt, time);
    updateShadows(dt, time);
    updateYoyo(dt);
    checkYoyoTargets();
    tryJump();
    moveHorizontal(dt);
    moveVertical(dt);
    checkWorld(time);
    const targetCamera = Math.max(0, Math.min(level.width - W, player.x - W * .38));
    cameraX += (targetCamera - cameraX) * Math.min(1, dt * 7);
    updateHud();
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) dom.toast.classList.remove("visible", "achievement-toast");
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

  function drawYoyoHook(hook, time) {
    const x = hook.x - cameraX;
    const pulse = 1 + Math.sin(time * 4 + hook.id) * .08;
    ctx.save(); ctx.translate(x, hook.y); ctx.scale(pulse, pulse);
    ctx.strokeStyle = "#ffd54a"; ctx.lineWidth = 5; ctx.shadowColor = "#ffd54a"; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(255,240,165,.8)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, -32); ctx.lineTo(12, -42); ctx.stroke();
    ctx.restore();
  }

  function drawYoyoPickup(pickup, time) {
    if (pickup.collected) return;
    const x = pickup.x - cameraX;
    const bob = Math.sin(time * 3.5) * 5;
    ctx.save(); ctx.translate(x, pickup.y + bob);
    ctx.fillStyle = "rgba(54,229,255,.12)"; ctx.shadowColor = "#36e5ff"; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#36e5ff";
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#eaffff"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#eaffff"; ctx.font = "900 10px Orbitron"; ctx.textAlign = "center"; ctx.fillText("YO-YO", 0, -29);
    ctx.restore();
  }

  function drawEnemy(enemy, time) {
    const x = enemy.x - cameraX;
    ctx.save(); ctx.translate(x, enemy.y); ctx.globalAlpha = enemy.disabled ? .3 : 1;
    if (!enemy.disabled) ctx.rotate(Math.sin(time * 4 + enemy.id) * .08);
    ctx.fillStyle = enemy.disabled ? "#53627a" : "#ff4f9a";
    ctx.shadowColor = enemy.disabled ? "transparent" : "#ff4f9a"; ctx.shadowBlur = enemy.disabled ? 0 : 14;
    ctx.fillRect(-17, -17, 34, 28);
    ctx.strokeStyle = "#eaffff"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-10, 12); ctx.lineTo(-14, 21); ctx.moveTo(10, 12); ctx.lineTo(14, 21); ctx.stroke();
    ctx.fillStyle = "#111827"; ctx.beginPath(); ctx.arc(7, -5, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawShadow(shadow, time) {
    const x = shadow.x - cameraX;
    const flap = 8 + Math.sin(time * 7 + shadow.id) * 5;
    ctx.save(); ctx.translate(x, shadow.y); ctx.globalAlpha = shadow.defeated ? .18 : .9;
    ctx.fillStyle = "#080713"; ctx.strokeStyle = "#704c9f"; ctx.lineWidth = 2;
    ctx.shadowColor = "#8f5de7"; ctx.shadowBlur = shadow.defeated ? 0 : 15;
    ctx.beginPath(); ctx.moveTo(-15, -4); ctx.quadraticCurveTo(-34, -20 - flap, -28, 7); ctx.quadraticCurveTo(-20, 2, -14, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(15, -4); ctx.quadraticCurveTo(34, -20 - flap, 28, 7); ctx.quadraticCurveTo(20, 2, 14, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (!shadow.defeated) {
      ctx.fillStyle = "#36e5ff";
      ctx.beginPath(); ctx.arc(-6, -2, 2.5, 0, Math.PI * 2); ctx.arc(6, -2, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawYoyo() {
    if (!yoyoAvailable()) return;
    const hand = yoyoHand();
    const handX = hand.x - cameraX;
    const yoyoX = yoyo.x - cameraX;
    if (yoyo.state !== "ready") {
      ctx.strokeStyle = "rgba(234,244,255,.82)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(handX, hand.y); ctx.lineTo(yoyoX, yoyo.y); ctx.stroke();
    }
    ctx.fillStyle = "#36e5ff"; ctx.shadowColor = "#36e5ff"; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(yoyoX, yoyo.y, yoyo.state === "ready" ? 7 : 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#eaffff"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.shadowBlur = 0;
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

  let introAnimationFrame = null;
  let introWhistlePlayed = false;

  function drawIntroStickman(introContext, x, y, runTime) {
    const swing = Math.sin(runTime * 5.5) * 11;
    introContext.save(); introContext.translate(x, y);
    introContext.strokeStyle = "rgba(80,220,255,.45)"; introContext.lineWidth = 8; introContext.lineCap = "round"; introContext.lineJoin = "round";
    introContext.beginPath(); introContext.arc(0, 10, 9, 0, Math.PI * 2); introContext.moveTo(0,19); introContext.lineTo(0,39); introContext.moveTo(0,26); introContext.lineTo(-12 - swing*.25,35); introContext.moveTo(0,26); introContext.lineTo(12 + swing*.25,35); introContext.moveTo(0,39); introContext.lineTo(-9 + swing,55); introContext.moveTo(0,39); introContext.lineTo(9 - swing,55); introContext.stroke();
    introContext.strokeStyle = "#020308"; introContext.lineWidth = 5;
    introContext.beginPath(); introContext.arc(0, 10, 9, 0, Math.PI * 2); introContext.moveTo(0,19); introContext.lineTo(0,39); introContext.moveTo(0,26); introContext.lineTo(-12 - swing*.25,35); introContext.moveTo(0,26); introContext.lineTo(12 + swing*.25,35); introContext.moveTo(0,39); introContext.lineTo(-9 + swing,55); introContext.moveTo(0,39); introContext.lineTo(9 - swing,55); introContext.stroke();
    introContext.fillStyle = "#36e5ff"; introContext.font = "900 8px Orbitron"; introContext.textAlign = "center"; introContext.fillText("Y", 0, 33);
    introContext.restore();
  }

  function playIntro() {
    if (introAnimationFrame) cancelAnimationFrame(introAnimationFrame);
    stopIntroWhistle();
    dom.introOverlay.classList.remove("hidden");
    dom.introTitle.classList.remove("visible");
    if (audioUnlocked) startIntroWhistle();
    const introContext = dom.introCanvas.getContext("2d");
    const startedAt = performance.now();
    const walkDuration = 3.2;
    const introDuration = 6.1;
    const animate = now => {
      const elapsed = (now - startedAt) / 1000;
      const gradient = introContext.createLinearGradient(0, 0, 0, 540);
      gradient.addColorStop(0, "#111b36"); gradient.addColorStop(1, "#050912");
      introContext.fillStyle = gradient; introContext.fillRect(0, 0, 960, 540);
      introContext.strokeStyle = "rgba(54,229,255,.07)"; introContext.lineWidth = 1;
      for (let line = 0; line < 960; line += 64) { introContext.beginPath(); introContext.moveTo(line,0); introContext.lineTo(line,540); introContext.stroke(); }
      for (let line = 0; line < 540; line += 64) { introContext.beginPath(); introContext.moveTo(0,line); introContext.lineTo(960,line); introContext.stroke(); }
      const groundY = 356;
      introContext.fillStyle = "rgba(13,25,44,.96)"; introContext.fillRect(0, groundY, 960, 184);
      introContext.fillStyle = "rgba(54,229,255,.75)"; introContext.fillRect(0, groundY, 960, 3);
      introContext.fillStyle = "rgba(184,255,87,.18)";
      for (let mark = 0; mark < 960; mark += 64) introContext.fillRect(mark + 16, groundY + 14, 32, 3);
      const walking = elapsed < walkDuration;
      const x = walking ? -30 + Math.min(1, elapsed / walkDuration) * 510 : 480;
      const runTime = walking ? elapsed * 1.5 : 0;
      drawIntroStickman(introContext, x, 300, runTime);
      if (!walking && elapsed < introDuration) {
        const yoTime = elapsed - walkDuration;
        const drop = 24 + Math.abs(Math.sin(yoTime * Math.PI * .55)) * 105;
        introContext.strokeStyle = "rgba(234,244,255,.8)"; introContext.lineWidth = 1.5;
        introContext.beginPath(); introContext.moveTo(x + 12, 335); introContext.lineTo(x + 12, 335 + drop); introContext.stroke();
        introContext.fillStyle = "#36e5ff"; introContext.shadowColor = "#36e5ff"; introContext.shadowBlur = 12;
        introContext.beginPath(); introContext.arc(x + 12, 335 + drop, 10, 0, Math.PI * 2); introContext.fill(); introContext.shadowBlur = 0;
      }
      if (elapsed >= introDuration) {
        dom.introTitle.classList.add("visible");
        introAnimationFrame = null;
        return;
      }
      introAnimationFrame = requestAnimationFrame(animate);
    };
    introAnimationFrame = requestAnimationFrame(animate);
  }

  function closeIntro(startGame) {
    if (introAnimationFrame) cancelAnimationFrame(introAnimationFrame);
    introAnimationFrame = null;
    stopIntroWhistle();
    save.introSeen = true;
    writeSave();
    dom.introOverlay.classList.add("hidden");
    if (startGame) loadLevel(levelIndex);
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
    if (level.yoyoPickup) drawYoyoPickup(level.yoyoPickup, time);
    level.yoyoHooks.forEach(hook => drawYoyoHook(hook, time));
    level.enemies.forEach(enemy => drawEnemy(enemy, time));
    level.shadows.forEach(shadow => drawShadow(shadow, time));
    drawDoor(time);
    drawPlayer();
    drawYoyo();

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
    if (["ArrowLeft","ArrowRight","ArrowUp","Space","KeyA","KeyD","KeyW","KeyF","KeyG"].includes(code)) event.preventDefault();
    if (["ArrowLeft","KeyA"].includes(code)) keys.left = true;
    if (["ArrowRight","KeyD"].includes(code)) keys.right = true;
    if (["ArrowUp","KeyW","Space"].includes(code)) {
      if (!keys.jump) keys.jumpQueued = true;
      keys.jump = true;
    }
    if (code === "KeyF" && !event.repeat) throwYoyo();
    if (code === "KeyG" && !event.repeat) gameplayWhistle();
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
  dom.yoyoButton.addEventListener("click", () => { throwYoyo(); canvas.focus(); });
  dom.whistleButton.addEventListener("click", () => { gameplayWhistle(); canvas.focus(); });
  dom.whistleToolbar.addEventListener("click", () => { gameplayWhistle(); canvas.focus(); });

  dom.start.addEventListener("click", () => loadLevel(levelIndex));
  dom.pause.addEventListener("click", () => setPaused(!paused));
  dom.resume.addEventListener("click", () => setPaused(false));
  dom.restart.addEventListener("click", () => loadLevel(levelIndex));
  dom.next.addEventListener("click", () => loadLevel(levelIndex + 1));
  dom.replayLevel.addEventListener("click", () => loadLevel(levelIndex));
  dom.menu.addEventListener("click", () => loadLevel(levelIndex, true));
  dom.sound.addEventListener("click", () => {
    soundOn = !soundOn;
    save.sound = soundOn;
    writeSave();
    updateHud();
    if (!soundOn) stopIntroWhistle();
    else if (audioUnlocked && !dom.introOverlay.classList.contains("hidden")) startIntroWhistle();
  });
  dom.introStart.addEventListener("click", () => closeIntro(true));
  dom.skipIntro.addEventListener("click", () => closeIntro(false));
  dom.replayIntro.addEventListener("click", playIntro);
  dom.endingReplayIntro.addEventListener("click", () => { dom.gameCompleteOverlay.classList.remove("visible"); loadLevel(levelIndex, true); playIntro(); });
  dom.playAgain.addEventListener("click", () => { campaignElapsed = 0; save.campaignTime = 0; writeSave(); loadLevel(0); });
  dom.gameLevelSelect.addEventListener("click", () => loadLevel(levelIndex, true));
  document.querySelectorAll("button").forEach(button => button.addEventListener("click", () => { if (![dom.yoyoButton, dom.whistleButton, dom.whistleToolbar].includes(button)) playSound("button"); }));

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running && !completed) setPaused(true);
  });
  window.addEventListener("beforeunload", writeSave);

  validateAdvancedLevels();
  checkCoinAchievements();
  loadLevel(levelIndex, true);
  renderAchievements();
  if (save.introSeen) dom.introOverlay.classList.add("hidden");
  else playIntro();
  requestAnimationFrame(loop);
})();
