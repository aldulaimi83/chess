(function () {
  "use strict";

  const W = 1280;
  const H = 720;
  const STORAGE_KEY = "youooo.tamer-stickman-car.v1";
  const LEVEL_COUNT = 12;
  const FIXED_DT = 1 / 120;

  const $ = (id) => document.getElementById(id);
  const dom = {
    canvas: $("gameCanvas"),
    toast: $("toast"),
    levelReadout: $("levelReadout"),
    speedReadout: $("speedReadout"),
    fuelReadout: $("fuelReadout"),
    healthReadout: $("healthReadout"),
    coinReadout: $("coinReadout"),
    timeReadout: $("timeReadout"),
    yoyoReadout: $("yoyoReadout"),
    whistleReadout: $("whistleReadout"),
    pauseButton: $("pauseButton"),
    recoverButton: $("recoverButton"),
    musicButton: $("musicButton"),
    soundButton: $("soundButton"),
    fullscreenButton: $("fullscreenButton"),
    mobileFullscreenButton: $("mobileFullscreenButton"),
    playButton: $("playButton"),
    continueButton: $("continueButton"),
    levelSelectButton: $("levelSelectButton"),
    garageButton: $("garageButton"),
    howButton: $("howButton"),
    settingsButton: $("settingsButton"),
    creditsButton: $("creditsButton"),
    menuOverlay: $("menuOverlay"),
    pauseOverlay: $("pauseOverlay"),
    levelSelectOverlay: $("levelSelectOverlay"),
    garageOverlay: $("garageOverlay"),
    settingsOverlay: $("settingsOverlay"),
    howOverlay: $("howOverlay"),
    creditsOverlay: $("creditsOverlay"),
    completeOverlay: $("completeOverlay"),
    levelSelectGrid: $("levelSelectGrid"),
    garageUpgrades: $("garageUpgrades"),
    garageCoins: $("garageCoins"),
    garageYoyos: $("garageYoyos"),
    soundVolume: $("soundVolume"),
    musicVolume: $("musicVolume"),
    muteToggle: $("muteToggle"),
    motionToggle: $("motionToggle"),
    resetProgressButton: $("resetProgressButton"),
    settingsBackButton: $("settingsBackButton"),
    howBackButton: $("howBackButton"),
    creditsBackButton: $("creditsBackButton"),
    garageBackButton: $("garageBackButton"),
    levelSelectBackButton: $("levelSelectBackButton"),
    resumeButton: $("resumeButton"),
    restartButton: $("restartButton"),
    pauseLevelSelectButton: $("pauseLevelSelectButton"),
    pauseGarageButton: $("pauseGarageButton"),
    completeKicker: $("completeKicker"),
    completeTitle: $("completeTitle"),
    completeStats: $("completeStats"),
    nextLevelButton: $("nextLevelButton"),
    retryLevelButton: $("retryLevelButton"),
    completeLevelSelectButton: $("completeLevelSelectButton"),
    completeGarageButton: $("completeGarageButton"),
    restartMobileButton: $("restartMobileButton"),
    leftButton: $("leftButton"),
    rightButton: $("rightButton"),
    upButton: $("upButton"),
    downButton: $("downButton"),
    brakeButton: $("brakeButton"),
    interactButton: $("interactButton"),
    yoyoButton: $("yoyoButton"),
    whistleButton: $("whistleButton"),
    mobilePauseButton: $("mobilePauseButton")
  };

  const ctx = dom.canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;

  const state = {
    mode: "menu",
    paused: false,
    time: 0,
    dt: 0,
    lastTs: 0,
    accumulator: 0,
    shake: 0,
    revealTimer: 0,
    freezeTimer: 0,
    dustTimer: 0,
    messageTimer: 0,
    cameraX: 0,
    cameraY: 0,
    cameraZoom: 1,
    levelIndex: 0,
    complete: false,
    completeInfo: null,
    activePanel: "menu",
    collectedCoins: 0,
    debug: false
  };

  const controls = {
    left: false,
    right: false,
    up: false,
    down: false,
    brake: false,
    interact: false,
    yoyo: false,
    whistle: false
  };

  const audio = {
    ctx: null,
    unlocked: false,
    master: null,
    soundGain: null,
    musicGain: null,
    musicOsc: null,
    musicTimer: null,
    whistleBus: null,
    whistleVoices: new Set(),
    musicStep: 0,
    soundVolume: 0.8,
    musicVolume: 0.45
  };

  const save = loadSave();
  const car = createCar();
  let level = null;
  let levelRuntime = null;
  let raf = 0;
  let toastTimer = 0;

  const themePalette = {
    sunrise: { sky1: "#f6d7a6", sky2: "#c8844e", sky3: "#71472e", fog: "rgba(255, 227, 182, .28)", ground: "#7a5536", ground2: "#5a3a25", accent: "#f4cb75" },
    bridge: { sky1: "#e9c47f", sky2: "#a55d2d", sky3: "#4e311d", fog: "rgba(255, 227, 182, .22)", ground: "#705136", ground2: "#4d3020", accent: "#e9c27f" },
    hills: { sky1: "#ead69a", sky2: "#b87d4e", sky3: "#5d3924", fog: "rgba(255, 234, 201, .18)", ground: "#7c633f", ground2: "#61462a", accent: "#d9c07a" },
    construction: { sky1: "#f3c985", sky2: "#b96f3d", sky3: "#52311d", fog: "rgba(255, 227, 179, .18)", ground: "#6c543d", ground2: "#493426", accent: "#f0c26d" },
    desert: { sky1: "#f5d39a", sky2: "#ca9358", sky3: "#6d452b", fog: "rgba(255, 231, 192, .24)", ground: "#8f6a40", ground2: "#6d4d2f", accent: "#e5bf69" },
    mountain: { sky1: "#d6d0bf", sky2: "#87755c", sky3: "#3f2d22", fog: "rgba(255, 245, 228, .20)", ground: "#695241", ground2: "#48372f", accent: "#eadfb4" },
    factory: { sky1: "#ead3a3", sky2: "#a67c52", sky3: "#42312a", fog: "rgba(255, 238, 204, .16)", ground: "#675547", ground2: "#4c3c32", accent: "#d4ba7b" },
    ice: { sky1: "#e8f1ff", sky2: "#90acc5", sky3: "#4f6478", fog: "rgba(255,255,255,.20)", ground: "#849ab1", ground2: "#60748b", accent: "#eff7ff" },
    mine: { sky1: "#43362f", sky2: "#1f1915", sky3: "#090706", fog: "rgba(255,245,228,.10)", ground: "#5e4a3b", ground2: "#2f2218", accent: "#d9c38f" },
    flood: { sky1: "#d9e7ef", sky2: "#8db0c6", sky3: "#47627b", fog: "rgba(255,255,255,.14)", ground: "#5d705f", ground2: "#344746", accent: "#9fc7d4" },
    trap: { sky1: "#f0ce8a", sky2: "#bb7c4e", sky3: "#52331f", fog: "rgba(255, 236, 198, .18)", ground: "#7a5539", ground2: "#503320", accent: "#f2d17c" },
    final: { sky1: "#ebc27c", sky2: "#9d6539", sky3: "#40261c", fog: "rgba(255, 230, 185, .18)", ground: "#735032", ground2: "#53341f", accent: "#f2cf7c" }
  };

  function createCar() {
    return {
      x: 160,
      y: 360,
      vx: 0,
      vy: 0,
      angle: 0,
      angVel: 0,
      facing: 1,
      width: 176,
      bodyHeight: 86,
      wheelBase: 124,
      wheelRadius: 24,
      bodyCenterDrop: 30,
      cabinLean: 0,
      wheelL: { y: 0, vy: 0, grounded: false, wobble: 0 },
      wheelR: { y: 0, vy: 0, grounded: false, wobble: 0 },
      fuel: 100,
      fuelMax: 100,
      health: 3,
      maxHealth: 3,
      invuln: 0,
      upsideDown: 0,
      smoke: 0,
      dust: 0,
      exhaust: 0,
      landed: false,
      finished: false,
      yoyo: { state: "ready", x: 0, y: 0, tx: 0, ty: 0, timer: 0, cooldown: 0, target: null, returning: false },
      whistleCooldown: 0,
      respawnShield: 0,
      noControlTimer: 0,
      deathTimer: 0,
      landed: false
    };
  }

  function defaultSave() {
    return {
      unlocked: 1,
      lastLevel: 0,
      checkpoint: { level: 0, index: 0 },
      levelCheckpoints: {},
      levelStars: {},
      bestTimes: {},
      totalDeaths: 0,
      totalCoins: 0,
      coins: 0,
      goldenYoyos: 0,
      upgrades: { engine: 0, suspension: 0, grip: 0, fuel: 0, armor: 0 },
      sound: true,
      music: true,
      muted: false,
      soundVolume: 0.8,
      musicVolume: 0.45,
      reducedMotion: false
    };
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSave();
      const data = JSON.parse(raw);
      const fallback = defaultSave();
      return {
        ...fallback,
        ...data,
        checkpoint: data.checkpoint && typeof data.checkpoint === "object" ? data.checkpoint : fallback.checkpoint,
        levelCheckpoints: data.levelCheckpoints && typeof data.levelCheckpoints === "object" ? data.levelCheckpoints : {},
        levelStars: data.levelStars && typeof data.levelStars === "object" ? data.levelStars : {},
        bestTimes: data.bestTimes && typeof data.bestTimes === "object" ? data.bestTimes : {},
        upgrades: { ...fallback.upgrades, ...(data.upgrades || {}) },
        soundVolume: Number.isFinite(data.soundVolume) ? data.soundVolume : fallback.soundVolume,
        musicVolume: Number.isFinite(data.musicVolume) ? data.musicVolume : fallback.musicVolume
      };
    } catch {
      return defaultSave();
    }
  }

  function writeSave() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch (_) {}
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function fmtTime(sec) {
    sec = Math.max(0, sec);
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function rect(x, y, w, h) {
    return { x, y, w, h };
  }

  function seg(x1, y1, x2, y2, surface = "road", extra = {}) {
    return {
      x1, y1, x2, y2,
      surface,
      visible: extra.visible !== false,
      kind: extra.kind || "solid",
      solid: extra.solid !== false,
      hidden: !!extra.hidden,
      revealOnly: !!extra.revealOnly,
      moving: !!extra.moving,
      motion: extra.motion || null,
      baseX1: x1, baseY1: y1, baseX2: x2, baseY2: y2,
      amplitudeX: extra.amplitudeX || 0,
      amplitudeY: extra.amplitudeY || 0,
      speed: extra.speed || 0,
      phase: extra.phase || 0,
      collapseAfter: extra.collapseAfter || 0,
      collapsed: !!extra.collapsed,
      crumbleTimer: 0,
      triggerType: extra.triggerType || null,
      linked: extra.linked || null
    };
  }

  function pickup(type, x, y, extra = {}) {
    return {
      type,
      x, y,
      w: extra.w || 24,
      h: extra.h || 24,
      collected: false,
      visible: extra.visible !== false,
      value: extra.value || 1,
      label: extra.label || "",
      hidden: !!extra.hidden,
      revealOnly: !!extra.revealOnly,
      target: extra.target || null
    };
  }

  function hazard(type, x, y, w, h, extra = {}) {
    return {
      type,
      x, y, w, h,
      visible: extra.visible !== false,
      active: extra.active !== false,
      damage: extra.damage || 1,
      oneShot: !!extra.oneShot,
      triggered: !!extra.triggered,
      timer: 0,
      wait: extra.wait || 0,
      speed: extra.speed || 0,
      dir: extra.dir || 1,
      range: extra.range || 0,
      baseX: x,
      baseY: y,
      linked: extra.linked || null,
      hidden: !!extra.hidden,
      revealOnly: !!extra.revealOnly,
      message: extra.message || "Trap activated!",
      collapse: !!extra.collapse,
      life: extra.life || 0
    };
  }

  function checkpoint(x, y, id) {
    return { x, y, id, active: false };
  }

  function makeLevel(name, theme, length, targetTime, coinTarget, solids, pickups, hazards, checkpoints, extras = {}) {
    return {
      name,
      theme,
      length,
      targetTime,
      coinTarget,
      solids,
      pickups,
      hazards,
      checkpoints,
      finishX: extras.finishX || length - 80,
      intro: extras.intro || "",
      script: extras.script || null,
      hiddenMessage: extras.hiddenMessage || ""
    };
  }

  function cloneLevel(def) {
    return {
      ...def,
      solids: def.solids.map((s) => ({ ...s })),
      pickups: def.pickups.map((p) => ({ ...p })),
      hazards: def.hazards.map((h) => ({ ...h })),
      checkpoints: def.checkpoints.map((c) => ({ ...c })),
      hiddenShown: false,
      time: 0,
      storm: 0,
      waterRise: 0,
      revealBonus: 0,
      gateOpen: false,
      trapArmed: false,
      mineLight: 0
    };
  }

  const LEVELS = [
    makeLevel(
      "Driving School",
      "sunrise",
      2600,
      90,
      12,
      [
        seg(0, 510, 320, 500, "road"),
        seg(320, 500, 620, 470, "road"),
        seg(620, 470, 940, 462, "road"),
        seg(940, 462, 1220, 434, "road"),
        seg(1220, 434, 1540, 426, "road"),
        seg(1540, 426, 1940, 446, "road"),
        seg(1940, 446, 2600, 438, "road")
      ],
      [pickup("coin", 240, 462), pickup("coin", 430, 442), pickup("coin", 740, 418), pickup("fuel", 1020, 396), pickup("coin", 1300, 400), pickup("coin", 1720, 420), pickup("coin", 2100, 410), pickup("goldYoyo", 2360, 394, { hidden: true, revealOnly: true })],
      [hazard("speedBump", 910, 446, 88, 22, { damage: 1, message: "Speed bump!" })],
      [checkpoint(110, 462, "start"), checkpoint(1140, 412, "mid"), checkpoint(2020, 418, "late")],
      {
        intro: "Learn the car, keep it steady, and finish the first road.",
        script(dt, run) {
          if (run.car.x > 2200 && !run.level.hiddenShown) showToast("The road keeps going.", 1.2);
        }
      }
    ),
    makeLevel(
      "Broken Road",
      "bridge",
      3000,
      110,
      14,
      [
        seg(0, 480, 520, 480, "road"),
        seg(520, 480, 760, 468, "road"),
        seg(760, 468, 980, 466, "road"),
        seg(1160, 452, 1520, 448, "bridge", { hidden: true, visible: false, linked: "bridgeA" }),
        seg(1520, 448, 1800, 438, "road"),
        seg(1800, 438, 2200, 452, "road"),
        seg(2200, 452, 2600, 430, "road"),
        seg(2600, 430, 3000, 436, "road")
      ],
      [pickup("coin", 160, 442), pickup("coin", 320, 438), pickup("coin", 620, 448), pickup("coin", 880, 438), pickup("fuel", 1440, 408), pickup("coin", 1660, 416), pickup("coin", 2360, 404), pickup("goldYoyo", 2720, 390, { hidden: true, revealOnly: true })],
      [hazard("switch", 650, 430, 32, 38, { linked: "bridgeA", message: "Yo-yo switch" }), hazard("pit", 980, 520, 160, 120, { damage: 3, oneShot: true }), hazard("trapSign", 1380, 412, 46, 60, { message: "Trap activated!" })],
      [checkpoint(100, 440, "start"), checkpoint(860, 430, "bridge"), checkpoint(1980, 412, "afterPit")],
      {
        intro: "Use the yo-yo switch to reveal the hidden bridge before the gap.",
        script(dt, run, lvl) {
          const bridge = lvl.solids.find((s) => s.linked === "bridgeA");
          if (bridge && run.revealTimer > 0) bridge.visible = true;
        }
      }
    ),
    makeLevel(
      "Rolling Hills",
      "hills",
      3000,
      115,
      16,
      [
        seg(0, 500, 260, 484, "road"),
        seg(260, 484, 560, 450, "road"),
        seg(560, 450, 900, 438, "road"),
        seg(900, 438, 1240, 406, "road"),
        seg(1240, 406, 1520, 444, "road"),
        seg(1520, 444, 1800, 426, "road"),
        seg(1800, 426, 2140, 388, "road"),
        seg(2140, 388, 2580, 420, "road"),
        seg(2580, 420, 3000, 410, "road")
      ],
      [pickup("coin", 160, 462), pickup("fuel", 690, 404), pickup("coin", 980, 374), pickup("fuel", 1380, 414), pickup("coin", 1700, 390), pickup("coin", 2080, 350), pickup("coin", 2440, 372), pickup("goldYoyo", 2800, 374, { hidden: true, revealOnly: true })],
      [hazard("boulderGap", 1290, 500, 120, 100, { damage: 3, oneShot: true }), hazard("windGust", 1880, 336, 160, 120, { damage: 0 })],
      [checkpoint(120, 460, "start"), checkpoint(1220, 396, "hills"), checkpoint(2280, 366, "ridge")],
      {
        intro: "Build speed on the hills and keep enough fuel for the long jump.",
        script(dt, run) {
          if (run.car.x > 1600 && run.level.time < 0.5) showToast("Long jump coming up.", 1.2);
        }
      }
    ),
    makeLevel(
      "Construction Zone",
      "construction",
      3200,
      120,
      16,
      [
        seg(0, 496, 380, 486, "road"),
        seg(380, 486, 760, 478, "road"),
        seg(760, 478, 1080, 468, "road"),
        seg(1080, 468, 1440, 452, "road"),
        seg(1440, 452, 1760, 438, "road"),
        seg(1760, 438, 2040, 428, "road"),
        seg(2040, 428, 2400, 444, "road"),
        seg(2400, 444, 2760, 420, "road"),
        seg(2760, 420, 3200, 408, "road")
      ],
      [pickup("coin", 170, 458), pickup("coin", 520, 458), pickup("fuel", 930, 430), pickup("coin", 1240, 416), pickup("coin", 1560, 402), pickup("coin", 1880, 400), pickup("coin", 2180, 412), pickup("goldYoyo", 2620, 386, { hidden: true, revealOnly: true })],
      [hazard("barrelSpawner", 920, 300, 100, 100, { message: "Barrels incoming!" }), hazard("barrier", 1700, 408, 36, 72, { damage: 2 }), hazard("crane", 1980, 322, 160, 14, { linked: "crane1" })],
      [checkpoint(120, 458, "start"), checkpoint(1160, 418, "crane"), checkpoint(2260, 398, "barriers")],
      {
        intro: "Timing matters here: moving parts, falling barrels, and a crane bridge.",
        script(dt, run, lvl) {
          const bridge = lvl.solids.find((s) => s.linked === "crane1");
          if (bridge) {
            const t = lvl.time;
            bridge.y1 = bridge.y2 = 344 + Math.sin(t * 1.3) * 48;
          }
        }
      }
    ),
    makeLevel(
      "Desert Run",
      "desert",
      3200,
      120,
      18,
      [
        seg(0, 510, 340, 500, "sand"),
        seg(340, 500, 660, 474, "sand"),
        seg(660, 474, 980, 482, "sand"),
        seg(980, 482, 1320, 452, "sand"),
        seg(1320, 452, 1700, 442, "sand"),
        seg(1700, 442, 2060, 410, "sand"),
        seg(2060, 410, 2460, 430, "sand"),
        seg(2460, 430, 2820, 390, "sand"),
        seg(2820, 390, 3200, 404, "sand")
      ],
      [pickup("coin", 220, 472), pickup("fuel", 760, 430), pickup("coin", 1140, 412), pickup("coin", 1480, 392), pickup("fuel", 1880, 378), pickup("coin", 2280, 388), pickup("coin", 2620, 360), pickup("goldYoyo", 3000, 360, { hidden: true, revealOnly: true })],
      [hazard("dustStorm", 860, 320, 1280, 210, { damage: 0 }), hazard("rockRamp", 1460, 404, 170, 60, { damage: 1 }), hazard("cactus", 2150, 380, 40, 70, { damage: 1 })],
      [checkpoint(120, 470, "start"), checkpoint(1500, 388, "dune"), checkpoint(2500, 356, "ridge")],
      {
        intro: "Sand steals speed. Use hills and fuel carefully.",
        script(dt, run, lvl) {
          if (run.car.x > 900 && run.car.x < 2200) lvl.storm = Math.min(1, lvl.storm + dt * .4);
          else lvl.storm = Math.max(0, lvl.storm - dt * .2);
        }
      }
    ),
    makeLevel(
      "Mountain Pass",
      "mountain",
      3200,
      125,
      18,
      [
        seg(0, 470, 260, 462, "road"),
        seg(260, 462, 620, 442, "road"),
        seg(620, 442, 960, 450, "road"),
        seg(960, 450, 1220, 410, "road"),
        seg(1220, 410, 1600, 426, "road"),
        seg(1600, 426, 1960, 398, "road"),
        seg(1960, 398, 2360, 412, "road"),
        seg(2360, 412, 2740, 378, "road"),
        seg(2740, 378, 3200, 394, "road")
      ],
      [pickup("coin", 160, 434), pickup("coin", 500, 414), pickup("fuel", 860, 414), pickup("coin", 1320, 382), pickup("coin", 1760, 374), pickup("fuel", 2140, 366), pickup("coin", 2500, 340), pickup("goldYoyo", 2960, 332, { hidden: true, revealOnly: true })],
      [hazard("rockfall", 1120, 180, 200, 160, { damage: 2, message: "Falling rock!" }), hazard("rockfall", 1880, 160, 220, 160, { damage: 2 }), hazard("cliff", 2260, 372, 140, 90, { damage: 3, oneShot: true })],
      [checkpoint(110, 438, "start"), checkpoint(1320, 374, "cliff"), checkpoint(2480, 332, "ridge")],
      {
        intro: "Stay centered on the narrow path and watch the falling rocks.",
        script(dt, run, lvl) {
          lvl.mineLight = 0;
        }
      }
    ),
    makeLevel(
      "Factory Escape",
      "factory",
      3300,
      130,
      18,
      [
        seg(0, 496, 300, 488, "road"),
        seg(300, 488, 620, 480, "road"),
        seg(620, 480, 920, 470, "conveyorR"),
        seg(920, 470, 1240, 460, "road"),
        seg(1240, 460, 1560, 452, "road"),
        seg(1560, 452, 1860, 440, "conveyorL"),
        seg(1860, 440, 2160, 430, "road"),
        seg(2160, 430, 2520, 420, "road"),
        seg(2520, 420, 2920, 406, "road"),
        seg(2920, 406, 3300, 398, "road")
      ],
      [pickup("coin", 180, 466), pickup("fuel", 760, 436), pickup("coin", 1080, 424), pickup("coin", 1500, 404), pickup("coin", 1980, 392), pickup("coin", 2380, 378), pickup("fuel", 2800, 368), pickup("goldYoyo", 3120, 350, { hidden: true, revealOnly: true })],
      [hazard("crusher", 1310, 320, 150, 40, { damage: 3 }), hazard("gateSwitch", 1700, 402, 32, 38, { linked: "factoryGate", message: "Gate switch" }), hazard("gate", 1820, 348, 36, 92, { linked: "factoryGate" }), hazard("barrelSpawner", 720, 280, 120, 80, { message: "Factory barrels!" })],
      [checkpoint(110, 470, "start"), checkpoint(1280, 392, "conveyor"), checkpoint(2460, 356, "gate")],
      {
        intro: "Conveyors push the car, and a yoyo switch opens the factory gate.",
        script(dt, run, lvl) {
          const gate = lvl.hazards.find((h) => h.type === "gate" && h.linked === "factoryGate");
          if (gate) gate.active = !lvl.gateOpen;
        }
      }
    ),
    makeLevel(
      "Ice Road",
      "ice",
      3200,
      130,
      18,
      [
        seg(0, 484, 360, 482, "ice"),
        seg(360, 482, 660, 476, "ice"),
        seg(660, 476, 980, 484, "ice"),
        seg(980, 484, 1280, 462, "ice"),
        seg(1280, 462, 1600, 472, "ice"),
        seg(1600, 472, 1940, 454, "ice"),
        seg(1940, 454, 2260, 446, "ice"),
        seg(2260, 446, 2640, 424, "ice"),
        seg(2640, 424, 3200, 416, "ice")
      ],
      [pickup("coin", 180, 446), pickup("coin", 520, 444), pickup("fuel", 800, 420), pickup("coin", 1160, 404), pickup("coin", 1680, 398), pickup("coin", 2100, 392), pickup("fuel", 2520, 388), pickup("goldYoyo", 2920, 374, { hidden: true, revealOnly: true })],
      [hazard("crack", 1020, 432, 160, 30, { damage: 3, collapse: true }), hazard("crack", 1860, 410, 180, 30, { damage: 3, collapse: true }), hazard("frozenSpike", 2440, 396, 60, 60, { damage: 2 })],
      [checkpoint(110, 446, "start"), checkpoint(1460, 390, "ice"), checkpoint(2600, 372, "ridge")],
      {
        intro: "Ice reduces grip. Keep the throttle smooth and avoid the cracks.",
        script(dt, run, lvl) {
          if (run.revealTimer > 0) lvl.hiddenShown = true;
        }
      }
    ),
    makeLevel(
      "Underground Mine",
      "mine",
      3200,
      140,
      18,
      [
        seg(0, 478, 320, 474, "road"),
        seg(320, 474, 660, 462, "road"),
        seg(660, 462, 960, 452, "road"),
        seg(960, 452, 1220, 438, "road"),
        seg(1220, 438, 1560, 430, "road"),
        seg(1560, 430, 1880, 418, "road"),
        seg(1880, 418, 2200, 406, "road"),
        seg(2200, 406, 2580, 394, "road"),
        seg(2580, 394, 3200, 386, "road")
      ],
      [pickup("coin", 140, 448), pickup("coin", 420, 440), pickup("fuel", 760, 414), pickup("coin", 1080, 392), pickup("coin", 1460, 382), pickup("fuel", 1840, 372), pickup("coin", 2340, 354), pickup("goldYoyo", 2920, 344, { hidden: true, revealOnly: true })],
      [hazard("mineCart", 1180, 350, 120, 50, { damage: 2 }), hazard("fallPlatform", 1780, 402, 160, 28, { collapse: true, damage: 3 }), hazard("darkRock", 2140, 310, 90, 110, { damage: 2 })],
      [checkpoint(110, 448, "start"), checkpoint(1380, 372, "cart"), checkpoint(2440, 344, "deep")],
      {
        intro: "The mine is dark. Use the headlights and watch for collapsing platforms.",
        script(dt, run, lvl) {
          lvl.mineLight = 1;
        }
      }
    ),
    makeLevel(
      "Flooded City",
      "flood",
      3300,
      145,
      18,
      [
        seg(0, 492, 320, 484, "road"),
        seg(320, 484, 620, 472, "road"),
        seg(620, 472, 940, 458, "road"),
        seg(940, 458, 1260, 452, "road"),
        seg(1260, 452, 1520, 430, "road"),
        seg(1520, 430, 1880, 414, "road"),
        seg(1880, 414, 2240, 426, "road"),
        seg(2240, 426, 2620, 398, "road"),
        seg(2620, 398, 3300, 390, "road")
      ],
      [pickup("coin", 140, 462), pickup("coin", 460, 446), pickup("fuel", 800, 420), pickup("coin", 1120, 404), pickup("coin", 1660, 382), pickup("coin", 2060, 374), pickup("fuel", 2500, 356), pickup("goldYoyo", 3040, 342, { hidden: true, revealOnly: true })],
      [hazard("water", 1160, 500, 320, 120, { damage: 3, oneShot: true }), hazard("electric", 1860, 368, 140, 30, { damage: 2 }), hazard("floating", 2420, 346, 160, 22, { damage: 0 })],
      [checkpoint(110, 452, "start"), checkpoint(1520, 376, "water"), checkpoint(2780, 342, "city")],
      {
        intro: "Water rises and electric hazards blink on the route forward.",
        script(dt, run, lvl) {
          lvl.waterRise = Math.min(1, lvl.waterRise + dt * 0.08);
        }
      }
    ),
    makeLevel(
      "Trap Highway",
      "trap",
      3300,
      150,
      20,
      [
        seg(0, 484, 360, 478, "road"),
        seg(360, 478, 640, 468, "road"),
        seg(640, 468, 980, 462, "road"),
        seg(1160, 454, 1460, 444, "bridge", { hidden: true, visible: false, linked: "trapBridge" }),
        seg(1460, 444, 1780, 438, "road"),
        seg(1780, 438, 2080, 430, "road"),
        seg(2080, 430, 2440, 420, "road"),
        seg(2440, 420, 2860, 406, "road"),
        seg(2860, 406, 3300, 398, "road")
      ],
      [pickup("coin", 160, 452), pickup("coin", 480, 440), pickup("coin", 780, 436), pickup("coin", 1260, 414), pickup("fuel", 1580, 402), pickup("coin", 1900, 392), pickup("coin", 2320, 378), pickup("goldYoyo", 3020, 356, { hidden: true, revealOnly: true })],
      [hazard("fakeSign", 740, 410, 70, 60, { message: "Trap activated!" }), hazard("switch", 1040, 406, 30, 38, { linked: "trapBridge", message: "Yo-yo bridge switch" }), hazard("spikes", 930, 438, 90, 44, { hidden: true, revealOnly: true, damage: 3 }), hazard("spikes", 2220, 398, 100, 44, { hidden: true, revealOnly: true, damage: 3 }), hazard("trapGate", 2860, 350, 48, 96, { linked: "trapBridge" })],
      [checkpoint(110, 448, "start"), checkpoint(1280, 396, "bridge"), checkpoint(2640, 360, "last")],
      {
        intro: "The highway lies. Whistle to reveal what the road is hiding.",
        script(dt, run, lvl) {
          const bridge = lvl.solids.find((s) => s.linked === "trapBridge");
          if (bridge) bridge.visible = run.revealTimer > 0;
        }
      }
    ),
    makeLevel(
      "Final Chase",
      "final",
      3600,
      165,
      22,
      [
        seg(0, 492, 280, 486, "road"),
        seg(280, 486, 620, 474, "road"),
        seg(620, 474, 940, 452, "road"),
        seg(940, 452, 1220, 446, "road"),
        seg(1220, 446, 1560, 430, "road"),
        seg(1560, 430, 1920, 418, "road"),
        seg(1920, 418, 2240, 404, "road"),
        seg(2240, 404, 2640, 392, "road"),
        seg(2640, 392, 3000, 378, "road"),
        seg(3000, 378, 3600, 360, "road")
      ],
      [pickup("coin", 140, 460), pickup("coin", 440, 444), pickup("fuel", 760, 414), pickup("coin", 1100, 402), pickup("coin", 1450, 388), pickup("coin", 1760, 376), pickup("coin", 2160, 360), pickup("coin", 2580, 346), pickup("coin", 3140, 328), pickup("goldYoyo", 3360, 312, { hidden: true, revealOnly: true })],
      [hazard("fallRoad", 1460, 408, 160, 28, { collapse: true, damage: 3 }), hazard("fallRoad", 2100, 380, 180, 28, { collapse: true, damage: 3 }), hazard("bigJump", 2400, 300, 120, 180, { damage: 0 }), hazard("rockfall", 2760, 200, 200, 160, { damage: 2 })],
      [checkpoint(110, 450, "start"), checkpoint(1580, 380, "chase"), checkpoint(2860, 316, "final")],
      {
        intro: "The final road collapses behind you. Keep moving to the escape point.",
        script(dt, run, lvl) {
          lvl.storm = 0;
        }
      }
    )
  ];

  function ensureAudio() {
    if (audio.unlocked) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audio.ctx = audio.ctx || new AudioContextClass();
    if (audio.ctx.state === "suspended") audio.ctx.resume().catch(() => {});
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.9;
    audio.soundGain = audio.ctx.createGain();
    audio.musicGain = audio.ctx.createGain();
    audio.soundGain.gain.value = save.muted ? 0 : save.soundVolume;
    audio.musicGain.gain.value = save.muted ? 0 : save.musicVolume;
    audio.soundGain.connect(audio.master);
    audio.musicGain.connect(audio.master);
    audio.master.connect(audio.ctx.destination);
    audio.unlocked = true;
    if (save.music && !save.muted) startMusic();
  }

  function stopMusic() {
    if (audio.musicTimer) {
      window.clearInterval(audio.musicTimer);
      audio.musicTimer = null;
    }
    if (audio.musicOsc) {
      try { audio.musicOsc.stop(); } catch (_) {}
      audio.musicOsc = null;
    }
  }

  function startMusic() {
    if (!audio.ctx || audio.musicOsc || !save.music || save.muted) return;
    const ctxA = audio.ctx;
    const filter = ctxA.createBiquadFilter();
    const oscA = ctxA.createOscillator();
    const oscB = ctxA.createOscillator();
    const gain = ctxA.createGain();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    gain.gain.value = 0.08;
    oscA.type = "triangle";
    oscB.type = "sine";
    oscA.frequency.value = 110;
    oscB.frequency.value = 55;
    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain).connect(audio.musicGain);
    oscA.start();
    oscB.start();
    audio.musicOsc = { oscA, oscB, filter, gain };
    const scale = [110, 131, 147, 165, 175, 196, 220];
    audio.musicTimer = window.setInterval(() => {
      if (!audio.ctx || save.muted || !save.music) return;
      const now = audio.ctx.currentTime;
      const step = scale[audio.musicStep % scale.length];
      const next = scale[(audio.musicStep + 2) % scale.length];
      oscA.frequency.setValueAtTime(step, now);
      oscB.frequency.setValueAtTime(step * 0.5, now);
      filter.frequency.setValueAtTime(700 + (audio.musicStep % 4) * 70, now);
      audio.musicStep += 1;
      if (audio.musicStep % 2 === 0) {
        const blip = ctxA.createOscillator();
        const g = ctxA.createGain();
        blip.type = "sine";
        blip.frequency.setValueAtTime(next * 2, now);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.018, now + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        blip.connect(g).connect(audio.musicGain);
        blip.start(now);
        blip.stop(now + 0.25);
      }
    }, 420);
  }

  function scheduleTone(from, to, duration, type, volume, delay = 0) {
    if (!audio.ctx || save.muted || !save.sound) return;
    const start = audio.ctx.currentTime + delay;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.03, duration * 0.3));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(audio.soundGain);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function getWhistleBus() {
    if (audio.whistleBus) return audio.whistleBus;
    const master = audio.ctx.createGain();
    const reverb = audio.ctx.createConvolver();
    const wet = audio.ctx.createGain();
    const length = Math.floor(audio.ctx.sampleRate * 1.15);
    const impulse = audio.ctx.createBuffer(2, length, audio.ctx.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2);
    }
    master.gain.value = 0.3;
    wet.gain.value = 0.14;
    reverb.buffer = impulse;
    reverb.connect(wet).connect(master);
    master.connect(audio.soundGain);
    audio.whistleBus = { dry: master, reverb };
    return audio.whistleBus;
  }

  function scheduleWhistleNote(frequency, duration, volume, delay = 0, introVoice = false) {
    if (!audio.ctx || save.muted || !save.sound) return;
    const start = audio.ctx.currentTime + delay;
    const end = start + duration;
    const whistle = audio.ctx.createOscillator();
    const harmonic = audio.ctx.createOscillator();
    const harmonicGain = audio.ctx.createGain();
    const envelope = audio.ctx.createGain();
    const vibrato = audio.ctx.createOscillator();
    const vibratoDepth = audio.ctx.createGain();
    const bus = getWhistleBus();
    whistle.type = "sine";
    harmonic.type = "sine";
    vibrato.type = "sine";
    whistle.frequency.setValueAtTime(frequency * 0.985, start);
    whistle.frequency.exponentialRampToValueAtTime(frequency, start + Math.min(0.09, duration * 0.3));
    harmonic.frequency.setValueAtTime(frequency * 2, start);
    harmonicGain.gain.setValueAtTime(0.045, start);
    vibrato.frequency.setValueAtTime(5.1, start);
    vibratoDepth.gain.setValueAtTime(frequency * 0.007, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.055, duration * 0.25));
    envelope.gain.setValueAtTime(volume * 0.88, Math.max(start + 0.06, end - 0.09));
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    vibrato.connect(vibratoDepth).connect(whistle.frequency);
    whistle.connect(envelope);
    harmonic.connect(harmonicGain).connect(envelope);
    envelope.connect(bus.dry);
    envelope.connect(bus.reverb);
    const voice = { whistle, harmonic, vibrato };
    if (introVoice) audio.whistleVoices.add(voice);
    whistle.onended = () => audio.whistleVoices.delete(voice);
    whistle.start(start);
    harmonic.start(start);
    vibrato.start(start);
    whistle.stop(end + 0.01);
    harmonic.stop(end + 0.01);
    vibrato.stop(end + 0.01);
  }

  function scheduleWhistleMelody(delay = 0, introVoice = false) {
    const note = (frequency, duration, start, volume = 0.15) => scheduleWhistleNote(frequency, duration, volume, delay + start, introVoice);
    note(659.25, 0.5, 0);
    note(783.99, 0.5, 0.5);
    note(880, 1, 1, 0.16);
    note(783.99, 0.5, 2);
    note(659.25, 0.5, 2.5);
    note(587.33, 1, 3, 0.14);
    note(659.25, 0.5, 4.5);
    note(783.99, 0.5, 5);
    note(987.77, 1, 5.5, 0.16);
    note(880, 0.5, 6.5);
    note(783.99, 0.5, 7);
    note(659.25, 1, 7.5, 0.145);
  }

  function playSound(name) {
    if (!audio.ctx || save.muted || !save.sound) return;
    if (name === "coin") scheduleTone(880, 1320, 0.07, "sine", 0.05);
    if (name === "fuel") scheduleTone(520, 840, 0.09, "triangle", 0.055);
    if (name === "checkpoint") scheduleTone(520, 760, 0.08, "triangle", 0.055);
    if (name === "jump") scheduleTone(240, 520, 0.11, "square", 0.035);
    if (name === "impact") scheduleTone(180, 90, 0.14, "sawtooth", 0.05);
    if (name === "damage") scheduleTone(140, 65, 0.16, "sawtooth", 0.065);
    if (name === "death") scheduleTone(100, 48, 0.22, "sawtooth", 0.08);
    if (name === "trap") {
      scheduleTone(170, 105, 0.045, "square", 0.04);
      scheduleTone(95, 80, 0.07, "sawtooth", 0.05, 0.05);
    }
    if (name === "yoyo") {
      scheduleTone(280, 650, 0.08, "triangle", 0.05);
      scheduleTone(840, 520, 0.06, "sine", 0.03, 0.05);
    }
    if (name === "whistle") scheduleWhistleMelody();
    if (name === "complete") {
      scheduleTone(440, 660, 0.12, "triangle", 0.06);
      scheduleTone(660, 880, 0.12, "triangle", 0.06, 0.08);
    }
    if (name === "recover") scheduleTone(330, 500, 0.09, "triangle", 0.05);
  }

  function showToast(text, duration = 1.5) {
    dom.toast.textContent = text;
    dom.toast.classList.add("visible");
    toastTimer = duration;
  }

  function setScreen(mode) {
    state.mode = mode;
    state.paused = false;
    [
      dom.menuOverlay,
      dom.pauseOverlay,
      dom.levelSelectOverlay,
      dom.garageOverlay,
      dom.settingsOverlay,
      dom.howOverlay,
      dom.creditsOverlay,
      dom.completeOverlay
    ].forEach((node) => node.classList.remove("visible"));
    if (mode === "menu") dom.menuOverlay.classList.add("visible");
    if (mode === "paused") dom.pauseOverlay.classList.add("visible");
    if (mode === "levelSelect") dom.levelSelectOverlay.classList.add("visible");
    if (mode === "garage") dom.garageOverlay.classList.add("visible");
    if (mode === "settings") dom.settingsOverlay.classList.add("visible");
    if (mode === "how") dom.howOverlay.classList.add("visible");
    if (mode === "credits") dom.creditsOverlay.classList.add("visible");
    if (mode === "complete") dom.completeOverlay.classList.add("visible");
    dom.recoverButton.classList.toggle("hidden", !(car.upsideDown > 3 && state.mode === "playing"));
  }

  function openPanel(mode) {
    setScreen(mode);
    if (mode === "menu") updateMenuButtons();
    if (mode === "levelSelect") renderLevelSelect();
    if (mode === "garage") renderGarage();
    if (mode === "settings") syncSettingsUI();
  }

  function clearInputs() {
    Object.keys(controls).forEach((k) => controls[k] = false);
  }

  function resetTouchState() {
    [dom.leftButton, dom.rightButton, dom.upButton, dom.downButton, dom.brakeButton, dom.interactButton, dom.yoyoButton, dom.whistleButton].forEach((btn) => {
      if (btn) btn.dataset.active = "0";
    });
  }

  function unlockAudio() {
    ensureAudio();
  }

  function currentLevel() {
    return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, state.levelIndex))];
  }

  function runtimeLevel() {
    return levelRuntime || cloneLevel(currentLevel());
  }

  function setCheckpoint(index) {
    const cp = level.checkpoints[index];
    if (!cp) return;
    level.checkpoints.forEach((point, i) => point.active = i === index);
    save.checkpoint = { level: state.levelIndex, index };
    save.levelCheckpoints[state.levelIndex] = index;
    writeSave();
    showToast("Checkpoint saved", 1.4);
    playSound("checkpoint");
  }

  function nearestCheckpoint(levelIndex) {
    const def = LEVELS[levelIndex];
    const saved = save.levelCheckpoints[levelIndex];
    const cpIndex = Number.isInteger(saved) ? saved : (save.checkpoint.level === levelIndex ? save.checkpoint.index : 0);
    return def.checkpoints[Math.max(0, Math.min(def.checkpoints.length - 1, cpIndex))] || def.checkpoints[0];
  }

  function spawnAtCheckpoint(levelIndex = state.levelIndex, forceCheckpoint = null) {
    state.levelIndex = levelIndex;
    level = cloneLevel(LEVELS[levelIndex]);
    levelRuntime = level;
    state.collectedCoins = 0;
    const cp = forceCheckpoint || nearestCheckpoint(levelIndex);
    car.x = cp.x;
    const ground = sampleSolid(level, cp.x);
    car.y = ground ? ground.y - car.wheelRadius - car.bodyCenterDrop : cp.y - 28;
    car.vx = 0;
    car.vy = 0;
    car.angle = 0;
    car.angVel = 0;
    car.facing = 1;
    car.fuelMax = 100 + save.upgrades.fuel * 18;
    car.fuel = car.fuelMax;
    car.maxHealth = 3 + save.upgrades.armor;
    car.health = car.maxHealth;
    car.invuln = 1;
    car.upsideDown = 0;
    car.smoke = 0;
    car.dust = 0;
    car.exhaust = 0;
    car.finished = false;
    car.respawnShield = 1.2;
    car.noControlTimer = 0.35;
    car.deathTimer = 0;
    car.whistleCooldown = 0;
    car.wheelL.y = car.y + car.bodyCenterDrop;
    car.wheelR.y = car.y + car.bodyCenterDrop;
    car.wheelL.vy = 0;
    car.wheelR.vy = 0;
    car.wheelL.grounded = false;
    car.wheelR.grounded = false;
    car.yoyo = { state: "ready", x: car.x, y: car.y, tx: car.x, ty: car.y, timer: 0, cooldown: 0, target: null, returning: false };
    state.time = 0;
    state.accumulator = 0;
    state.shake = 0;
    state.revealTimer = 0;
    state.freezeTimer = 0;
    state.dustTimer = 0;
    state.messageTimer = 0;
    state.complete = false;
    state.completeInfo = null;
    state.cameraZoom = 1.18;
    state.cameraX = clamp(car.x - W * 0.4, 0, Math.max(0, level.length - W / state.cameraZoom));
    state.cameraY = 350;
    showToast(level.intro || level.name, 1.6);
    updateHud();
    clearInputs();
    resetTouchState();
    renderPanels();
    save.lastLevel = levelIndex;
    writeSave();
  }

  function startGame(levelIndex = save.lastLevel || 0) {
    unlockAudio();
    hideAllPanels();
    state.mode = "playing";
    state.complete = false;
    spawnAtCheckpoint(levelIndex);
    playMusicIfReady();
  }

  function continueGame() {
    unlockAudio();
    const lvl = Math.max(0, Math.min(LEVELS.length - 1, save.lastLevel || save.checkpoint.level || 0));
    state.levelIndex = lvl;
    startGame(lvl);
  }

  function playMusicIfReady() {
    if (!audio.unlocked || save.muted || !save.music) return;
    startMusic();
  }

  function stopAllAudio() {
    stopMusic();
    if (audio.whistleVoices.size) {
      audio.whistleVoices.forEach((voice) => {
        [voice.whistle, voice.harmonic, voice.vibrato].forEach((osc) => {
          try { osc.stop(); } catch (_) {}
        });
      });
      audio.whistleVoices.clear();
    }
  }

  function updateMenuButtons() {
    const hasProgress =
      save.lastLevel > 0 ||
      (save.checkpoint && (save.checkpoint.level > 0 || save.checkpoint.index > 0)) ||
      (save.levelCheckpoints && Object.keys(save.levelCheckpoints).length > 0) ||
      save.totalCoins > 0;
    dom.continueButton.disabled = !hasProgress;
  }

  function renderLevelSelect() {
    dom.levelSelectGrid.innerHTML = "";
    LEVELS.forEach((lvl, index) => {
      const btn = document.createElement("button");
      const unlocked = index < (save.unlocked || 1);
      const stars = Number(save.levelStars[index] || 0);
      btn.type = "button";
      btn.className = unlocked ? "" : "locked";
      btn.disabled = !unlocked;
      btn.innerHTML = `<strong>Level ${index + 1}</strong><span>${lvl.name}</span><span>${lvl.theme}</span><span class="stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</span>`;
      btn.addEventListener("click", () => {
        setScreen("none");
        startGame(index);
      });
      dom.levelSelectGrid.appendChild(btn);
    });
  }

  function renderGarage() {
    dom.garageCoins.textContent = `Coins: ${save.coins}`;
    dom.garageYoyos.textContent = `Golden Yo-Yos: ${save.goldenYoyos}`;
    const upgrades = [
      { key: "engine", name: "Engine", desc: "More torque and a higher top speed.", cost: 18, max: 5 },
      { key: "suspension", name: "Suspension", desc: "Softer landing and smoother hill travel.", cost: 16, max: 5 },
      { key: "grip", name: "Tire Grip", desc: "Less sliding on ice, mud, and sand.", cost: 16, max: 5 },
      { key: "fuel", name: "Fuel Capacity", desc: "Carry more fuel for long routes.", cost: 14, max: 5 },
      { key: "armor", name: "Armor", desc: "Add another health point for tougher roads.", cost: 20, max: 4 }
    ];
    dom.garageUpgrades.innerHTML = "";
    upgrades.forEach((upg) => {
      const card = document.createElement("div");
      card.className = "upgrade-card";
      const levelValue = save.upgrades[upg.key] || 0;
      const cost = upg.cost + levelValue * 8;
      const canBuy = save.coins >= cost && levelValue < upg.max;
      card.innerHTML = `
        <div class="row"><strong>${upg.name} Lv ${levelValue}/${upg.max}</strong><span>${cost} coins</span></div>
        <span>${upg.desc}</span>
      `;
      const buy = document.createElement("button");
      buy.type = "button";
      buy.textContent = canBuy ? "Upgrade" : (levelValue >= upg.max ? "Maxed" : "Need More Coins");
      buy.disabled = !canBuy;
      buy.addEventListener("click", () => {
        const current = save.upgrades[upg.key] || 0;
        const price = upg.cost + current * 8;
        if (current >= upg.max || save.coins < price) return;
        save.coins -= price;
        save.upgrades[upg.key] = current + 1;
        writeSave();
        renderGarage();
        updateHud();
        showToast(`${upg.name} upgraded`, 1.1);
        playSound("checkpoint");
      });
      card.appendChild(buy);
      dom.garageUpgrades.appendChild(card);
    });
  }

  function syncSettingsUI() {
    dom.soundVolume.value = String(save.soundVolume);
    dom.musicVolume.value = String(save.musicVolume);
    dom.muteToggle.textContent = save.muted ? "On" : "Off";
    dom.motionToggle.textContent = save.reducedMotion ? "On" : "Off";
  }

  function hideAllPanels() {
    [
      dom.menuOverlay,
      dom.pauseOverlay,
      dom.levelSelectOverlay,
      dom.garageOverlay,
      dom.settingsOverlay,
      dom.howOverlay,
      dom.creditsOverlay,
      dom.completeOverlay
    ].forEach((el) => el.classList.remove("visible"));
  }

  function pauseGame() {
    if (state.mode !== "playing") return;
    state.mode = "paused";
    dom.pauseOverlay.classList.add("visible");
    clearInputs();
    resetTouchState();
  }

  function resumeGame() {
    if (state.mode !== "paused") return;
    hideAllPanels();
    state.mode = "playing";
    clearInputs();
    resetTouchState();
  }

  function resetLevelCheckpoint() {
    const cp = nearestCheckpoint(state.levelIndex);
    spawnAtCheckpoint(state.levelIndex, cp);
    state.mode = "playing";
    hideAllPanels();
    showToast("Checkpoint reset", 1.1);
  }

  function completeLevel() {
    if (state.complete) return;
    state.complete = true;
    state.mode = "complete";
    car.vx = 0;
    car.angVel = 0;
    car.exhaust = 0;
    const stars = calcStars();
    save.levelStars[state.levelIndex] = Math.max(save.levelStars[state.levelIndex] || 0, stars);
    save.bestTimes[state.levelIndex] = Number.isFinite(save.bestTimes[state.levelIndex]) ? Math.min(save.bestTimes[state.levelIndex], state.time) : state.time;
    save.unlocked = Math.max(save.unlocked, state.levelIndex + 2);
    save.lastLevel = Math.max(save.lastLevel, state.levelIndex + 1);
    writeSave();
    buildCompletionPanel(false);
    setScreen("complete");
    playSound("complete");
  }

  function finishAllLevels() {
    state.complete = true;
    car.vx = 0;
    car.angVel = 0;
    car.exhaust = 0;
    save.levelStars[state.levelIndex] = Math.max(save.levelStars[state.levelIndex] || 0, calcStars());
    save.bestTimes[state.levelIndex] = Number.isFinite(save.bestTimes[state.levelIndex]) ? Math.min(save.bestTimes[state.levelIndex], state.time) : state.time;
    save.unlocked = Math.max(save.unlocked, LEVELS.length);
    save.lastLevel = Math.max(save.lastLevel, LEVELS.length - 1);
    writeSave();
    buildCompletionPanel(true);
    setScreen("complete");
    playSound("complete");
  }

  function buildCompletionPanel(final = false) {
    dom.completeKicker.textContent = final ? "Adventure Complete" : "Level Complete";
    dom.completeTitle.textContent = final ? "Tamer made it through the full driving quest." : `${level.name} cleared.`;
    const stars = calcStars();
    dom.completeStats.innerHTML = `
      <div>Time<strong>${fmtTime(state.time)}</strong></div>
      <div>Best<strong>${fmtTime(save.bestTimes[state.levelIndex] || state.time)}</strong></div>
      <div>Coins<strong>${state.collectedCoins || 0} / ${level.coinTarget}</strong></div>
      <div>Stars<strong>${"★".repeat(stars)}${"☆".repeat(3 - stars)}</strong></div>
      <div>Deaths<strong>${save.totalDeaths}</strong></div>
      <div>Golden Yo-Yos<strong>${save.goldenYoyos}</strong></div>
    `;
    dom.nextLevelButton.textContent = final ? "Play Again" : "Next Level";
  }

  function calcStars() {
    const finish = state.complete ? 1 : 0;
    const coinStar = (state.collectedCoins || 0) >= level.coinTarget ? 1 : 0;
    const timeStar = state.time <= level.targetTime ? 1 : 0;
    return clamp(finish + coinStar + timeStar, 1, 3);
  }

  function updateHud() {
    dom.levelReadout.textContent = `${Math.min(state.levelIndex + 1, LEVEL_COUNT)} / ${LEVEL_COUNT}`;
    dom.speedReadout.textContent = Math.round(Math.abs(car.vx)).toString();
    dom.fuelReadout.textContent = `${Math.max(0, Math.round((car.fuel / car.fuelMax) * 100))}%`;
    dom.healthReadout.textContent = `${car.health} / ${car.maxHealth}`;
    dom.coinReadout.textContent = `${state.collectedCoins || 0} / ${level ? level.coinTarget : 0}`;
    dom.timeReadout.textContent = fmtTime(state.time || 0);
    dom.yoyoReadout.textContent = car.yoyo.state === "ready" ? "Ready" : "Busy";
    dom.whistleReadout.textContent = car.whistleCooldown > 0 ? "Cooling" : "Ready";
    dom.recoverButton.classList.toggle("hidden", !(state.mode === "playing" && car.upsideDown > 3));
    dom.soundButton.textContent = save.sound && !save.muted ? "Sound On" : "Sound Off";
    dom.soundButton.setAttribute("aria-pressed", String(save.sound && !save.muted));
    dom.musicButton.textContent = save.music && !save.muted ? "Music On" : "Music Off";
    dom.musicButton.setAttribute("aria-pressed", String(save.music && !save.muted));
  }

  function groundThickness(surface) {
    if (surface === "bridge") return 24;
    if (surface === "conveyorL" || surface === "conveyorR") return 24;
    if (surface === "ice") return 28;
    if (surface === "sand") return 30;
    return 34;
  }

  function sampleSolid(levelObj, x) {
    let best = null;
    for (const s of levelObj.solids) {
      if (!s.visible || s.collapsed) continue;
      if (s.hidden && state.revealTimer <= 0) continue;
      const minX = Math.min(s.x1, s.x2);
      const maxX = Math.max(s.x1, s.x2);
      if (x < minX || x > maxX) continue;
      const span = Math.max(1, s.x2 - s.x1);
      const t = clamp((x - s.x1) / span, 0, 1);
      const y = lerp(s.y1, s.y2, t);
      if (!best || y < best.y) best = { y, surface: s.surface, solid: s };
    }
    return best;
  }

  function getSurface(levelObj, x) {
    const hit = sampleSolid(levelObj, x);
    return hit ? hit.surface : "air";
  }

  function carBounds() {
    return rect(car.x - 78, car.y - 46, 156, 96);
  }

  function wheelX(side) {
    return car.x + side * (car.wheelBase / 2);
  }

  function handPosition() {
    const forward = car.facing;
    return { x: car.x + forward * 18, y: car.y - 12 };
  }

  function revealHiddenThings(duration = 3) {
    state.revealTimer = Math.max(state.revealTimer, duration);
    showToast("Whistle reveals the route", 1.4);
    playSound("whistle");
  }

  function triggerTrapMessage(msg = "Trap activated!") {
    showToast(msg, 1.2);
    state.shake = Math.max(state.shake, 0.18);
    playSound("trap");
  }

  function collectPickup(item, silent = false) {
    if (!item || item.collected) return;
    item.collected = true;
    if (item.type === "coin") {
      state.collectedCoins += 1;
      save.coins += 1;
      save.totalCoins += 1;
      spawnBurst(item.x, item.y, "#ffd66b", 6);
      if (!silent) playSound("coin");
    }
    if (item.type === "fuel") {
      car.fuel = Math.min(car.fuelMax, car.fuel + 24);
      spawnBurst(item.x, item.y, "#f4cb75", 8);
      if (!silent) playSound("fuel");
    }
    if (item.type === "goldYoyo") {
      save.goldenYoyos += 1;
      save.coins += 5;
      spawnBurst(item.x, item.y, "#f0d67d", 12);
      showToast("Golden yo-yo found", 1.4);
      if (!silent) playSound("complete");
    }
    writeSave();
    updateHud();
  }

  function spawnBurst(x, y, color, amount) {
    if (save.reducedMotion) return;
    for (let i = 0; i < amount; i += 1) {
      particles.push({
        x, y,
        vx: (Math.random() * 2 - 1) * 90,
        vy: -Math.random() * 120 - 30,
        life: 0.55 + Math.random() * 0.35,
        age: 0,
        color,
        size: 2 + Math.random() * 3,
        type: "spark"
      });
    }
  }

  function spawnDust(x, y, amount = 8) {
    if (save.reducedMotion) return;
    for (let i = 0; i < amount; i += 1) {
      particles.push({
        x, y,
        vx: (Math.random() * 2 - 1) * 40,
        vy: -Math.random() * 60 - 10,
        life: 0.8 + Math.random() * 0.35,
        age: 0,
        color: "rgba(248, 227, 186, .7)",
        size: 5 + Math.random() * 7,
        type: "dust"
      });
    }
  }

  function spawnSmoke(x, y, amount = 4) {
    if (save.reducedMotion) return;
    for (let i = 0; i < amount; i += 1) {
      particles.push({
        x, y,
        vx: (Math.random() * 2 - 1) * 20,
        vy: -Math.random() * 40 - 20,
        life: 1 + Math.random() * 0.5,
        age: 0,
        color: "rgba(242, 238, 232, .55)",
        size: 8 + Math.random() * 8,
        type: "smoke"
      });
    }
  }

  function addCarCrashPieces(x, y, direction = 1) {
    const pieces = [
      { dx: -18, dy: -32, vx: -130, vy: -180, len: 12 },
      { dx: 0, dy: -48, vx: 20, vy: -240, len: 12 },
      { dx: 18, dy: -28, vx: 150, vy: -150, len: 14 },
      { dx: -26, dy: -8, vx: -170, vy: -70, len: 18 },
      { dx: 26, dy: -8, vx: 170, vy: -70, len: 18 },
      { dx: -10, dy: 10, vx: -90, vy: 40, len: 20 },
      { dx: 10, dy: 10, vx: 90, vy: 40, len: 20 }
    ];
    pieces.forEach((p) => {
      particles.push({
        x: x + p.dx,
        y: y + p.dy,
        vx: p.vx * direction * (0.65 + Math.random() * 0.45),
        vy: p.vy * (0.75 + Math.random() * 0.5),
        life: 1.2 + Math.random() * 0.5,
        age: 0,
        color: "#050403",
        size: p.len,
        type: "stick"
      });
    });
    spawnDust(x, y + 12, 12);
  }

  function hitCar(amount, reason = "impact") {
    if (car.invuln > 0 || state.complete) return;
    amount = Math.max(1, amount);
    car.health -= amount;
    car.invuln = 1.2;
    car.smoke = 1.2;
    state.shake = Math.max(state.shake, 0.28);
    playSound("damage");
    showToast(reason, 1.1);
    if (car.health <= 0) {
      destroyCar(reason);
    }
  }

  function destroyCar(reason = "crash") {
    if (state.complete) return;
    car.health = 0;
    state.shake = Math.max(state.shake, 0.38);
    playSound("death");
    addCarCrashPieces(car.x, car.y - 8, car.facing || 1);
    save.totalDeaths += 1;
    writeSave();
    showToast(reason, 1.4);
    window.setTimeout(() => {
      if (state.mode === "playing" || state.mode === "paused") resetLevelCheckpoint();
    }, 760);
  }

  function recoverCar() {
    const cp = nearestCheckpoint(state.levelIndex);
    const ground = sampleSolid(level, cp.x);
    car.x = cp.x;
    car.y = ground ? ground.y - car.wheelRadius - car.bodyCenterDrop : cp.y - 28;
    car.vx = 0;
    car.vy = 0;
    car.angle = 0;
    car.angVel = 0;
    car.health = car.maxHealth;
    car.invuln = 0.8;
    car.upsideDown = 0;
    car.wheelL.y = car.y + car.bodyCenterDrop;
    car.wheelR.y = car.y + car.bodyCenterDrop;
    car.wheelL.vy = 0;
    car.wheelR.vy = 0;
    car.yoyo = { state: "ready", x: car.x, y: car.y, tx: car.x, ty: car.y, timer: 0, cooldown: 0, target: null, returning: false };
    playSound("recover");
    showToast("Car recovered", 1.2);
    writeSave();
  }

  function toggleCheckpointByX(x) {
    let chosen = 0;
    level.checkpoints.forEach((cp, index) => {
      if (x >= cp.x) chosen = index;
    });
    if (save.levelCheckpoints[state.levelIndex] !== chosen) setCheckpoint(chosen);
  }

  function tryCollectVisibleItems() {
    for (const item of level.pickups) {
      if (item.collected) continue;
      if (item.hidden && state.revealTimer <= 0) continue;
      const radius = item.type === "goldYoyo" ? 42 : 24;
      if (Math.hypot(car.x - item.x, car.y - item.y) < radius) collectPickup(item);
    }
  }

  function updateDynamicSolids(dt) {
    level.solids.forEach((s) => {
      if (s.motion === "vertical") {
        s.phase += dt * (s.speed || 1);
        const y = s.baseY1 + Math.sin(s.phase) * (s.amplitudeY || 40);
        const x1 = s.baseX1 + Math.sin(s.phase * 0.7) * (s.amplitudeX || 0);
        const x2 = s.baseX2 + Math.sin(s.phase * 0.7) * (s.amplitudeX || 0);
        s.x1 = x1;
        s.x2 = x2;
        s.y1 = y;
        s.y2 = y;
      }
      if (s.collapseAfter > 0 && !s.collapsed) {
        if (Math.abs(car.x - (s.x1 + s.x2) / 2) < 80 && (Math.abs(car.wheelL.y - s.y1) < 40 || Math.abs(car.wheelR.y - s.y2) < 40)) {
          s.crumbleTimer += dt;
          if (s.crumbleTimer > s.collapseAfter) {
            s.collapsed = true;
            triggerTrapMessage("Trap activated!");
          }
        }
      }
    });
  }

  function updateHazards(dt) {
    const levelObj = level;
    const trapFrozen = state.freezeTimer > 0;
    levelObj.hazards.forEach((h) => {
      if (!h.active) return;
      if (h.hidden && state.revealTimer <= 0) return;
      if (h.type === "barrelSpawner") {
        h.timer += dt;
        if (!trapFrozen && h.timer > 1.4) {
          h.timer = 0;
          const dir = Math.random() > 0.5 ? -1 : 1;
          levelObj.hazards.push(hazard("barrel", h.x, h.y, 34, 34, { speed: dir * 240, damage: 2, oneShot: true }));
          triggerTrapMessage("Trap activated!");
        }
      }
      if (h.type === "barrel") {
        h.x += h.speed * dt;
        h.y += 140 * dt;
        if (sampleSolid(levelObj, h.x)) h.y = sampleSolid(levelObj, h.x).y - 20;
        if (h.x < -200 || h.x > level.length + 200 || h.y > H + 300) h.active = false;
      }
      if (h.type === "rockfall") {
        h.timer += dt;
        if (!trapFrozen && h.timer > 1.4) {
          h.timer = 0;
          const rock = hazard("fallingRock", h.x + Math.random() * h.w - h.w / 2, h.y, 34, 34, { speed: 220, damage: 2, oneShot: true });
          rock.vy = 0;
          levelObj.hazards.push(rock);
        }
      }
      if (h.type === "fallingRock") {
        h.vy = (h.vy || 0) + 980 * dt;
        h.y += h.vy * dt;
        if (h.y > H + 200) h.active = false;
      }
      if (h.type === "crusher") {
        h.timer += dt;
        const t = (Math.sin(h.timer * 2) + 1) / 2;
        h.y = h.baseY + lerp(0, -84, t);
      }
      if (h.type === "gate") {
        h.active = !level.gateOpen;
      }
      if (h.type === "water") {
        h.y = h.baseY - level.waterRise * 90;
      }
      if (h.type === "floating") {
        h.timer += dt;
        h.y = h.baseY + Math.sin(h.timer * 1.2) * 10 - level.waterRise * 65;
      }
      if (h.type === "fakeSign" && !h.triggered && Math.abs(car.x - h.x) < 110) {
        h.triggered = true;
        levelObj.hazards.push(hazard("spikes", h.x + 86, h.y + 18, 100, 44, { damage: 3, hidden: false }));
        triggerTrapMessage(h.message || "Trap activated!");
      }
      if (h.type === "trapGate" && levelObj.solids.find((s) => s.linked === h.linked)) {
        const bridge = levelObj.solids.find((s) => s.linked === h.linked);
        bridge.visible = state.revealTimer > 0 || h.triggered;
      }
      if (h.type === "fallRoad") {
        h.timer += dt;
        if (Math.abs(car.x - h.x) < 100) {
          h.triggered = true;
          h.collapse = true;
          h.life = 1.6;
        }
        if (h.triggered) {
          h.life -= dt;
          if (h.life <= 0) {
            const target = levelObj.solids.find((s) => Math.abs((s.x1 + s.x2) / 2 - h.x) < 140);
            if (target) target.collapsed = true;
            h.active = false;
          }
        }
      }
      if (h.type === "fallPlatform") {
        h.timer += dt;
        if (!h.triggered && Math.abs(car.x - h.x) < 120) {
          h.triggered = true;
          h.life = 1.2;
          triggerTrapMessage("Trap activated!");
        }
        if (h.triggered) {
          h.life -= dt;
          if (h.life <= 0) {
            const target = levelObj.solids.find((s) => Math.abs((s.x1 + s.x2) / 2 - h.x) < 160);
            if (target) target.collapsed = true;
            h.active = false;
          }
        }
      }
      if (h.type === "dustStorm") {
        if (car.x > h.x - 100 && car.x < h.x + h.w + 100) levelObj.storm = 1;
      }
      if (h.type === "mineCart") {
        h.timer += dt;
        h.x = h.baseX + Math.sin(h.timer * 1.6) * 90;
      }
      if (h.type === "crack") {
        if (!h.triggered && Math.abs(car.x - h.x) < 80) {
          h.triggered = true;
          triggerTrapMessage("Trap activated!");
          h.life = 1.8;
        }
        if (h.triggered) {
          h.life -= dt;
          if (h.life <= 0) {
            const target = levelObj.solids.find((s) => Math.abs((s.x1 + s.x2) / 2 - h.x) < 120);
            if (target) target.collapsed = true;
            h.active = false;
          }
        }
      }
    });
  }

  function updatePlayerPhysics(dt) {
    const levelObj = level;
    const leftX = wheelX(-1);
    const rightX = wheelX(1);
    const leftGround = sampleSolid(levelObj, leftX);
    const rightGround = sampleSolid(levelObj, rightX);
    const leftTarget = leftGround ? leftGround.y - car.wheelRadius : null;
    const rightTarget = rightGround ? rightGround.y - car.wheelRadius : null;
    const spring = 56 + save.upgrades.suspension * 9;
    const damping = 12 + save.upgrades.suspension * 1.6;
    const gravity = 1180;
    let groundedCount = 0;

    function settleWheel(wheel, target, surface) {
      if (target != null) {
        const offset = target - wheel.y;
        wheel.vy += offset * spring * dt;
        wheel.vy -= wheel.vy * Math.min(1, damping * dt);
        wheel.y += wheel.vy * dt;
        if (wheel.y > target) {
          wheel.y = target;
          wheel.vy = Math.min(0, wheel.vy);
        }
        wheel.grounded = Math.abs(target - wheel.y) < 2.5 && wheel.vy <= 0.5;
        if (wheel.grounded) groundedCount += 1;
        if (surface === "sand") wheel.vy *= 0.99;
        if (surface === "ice") wheel.vy *= 0.995;
      } else {
        wheel.vy += gravity * dt;
        wheel.y += wheel.vy * dt;
        wheel.grounded = false;
      }
    }

    settleWheel(car.wheelL, leftTarget, leftGround ? leftGround.surface : "air");
    settleWheel(car.wheelR, rightTarget, rightGround ? rightGround.surface : "air");

    const grounded = groundedCount > 0;
    const avgWheel = (car.wheelL.y + car.wheelR.y) / 2;
    const wheelSlope = Math.atan2(car.wheelR.y - car.wheelL.y, car.wheelBase);
    const surf = getSurface(levelObj, car.x);
    const grip = 1 + save.upgrades.grip * 0.12;
    const engine = 150 * (1 + save.upgrades.engine * 0.19);
    const maxSpeed = 350 + save.upgrades.engine * 52;
    const maxReverse = 130 + save.upgrades.engine * 16;
    const brakeDrag = 0.72 - Math.min(0.2, save.upgrades.grip * 0.02);
    const coastDrag = surf === "ice" ? 0.993 : surf === "sand" ? 0.972 : surf === "mud" ? 0.965 : surf === "conveyorL" || surf === "conveyorR" ? 0.99 : 0.984;

    let throttle = 0;
    if (controls.right) throttle += 1;
    if (controls.left) throttle -= 1;
    if (car.noControlTimer > 0 || car.fuel <= 0) throttle = 0;

    if (grounded) {
      car.facing = throttle !== 0 ? Math.sign(throttle) : (Math.abs(car.vx) > 10 ? Math.sign(car.vx) : car.facing);
      car.vx += throttle * engine * dt;
      if (surf === "conveyorL") car.vx -= 110 * dt;
      if (surf === "conveyorR") car.vx += 110 * dt;
      const slopeAssist = Math.sin(-wheelSlope) * 240;
      car.vx += slopeAssist * dt;
      car.vx *= Math.pow(coastDrag, dt * 60 * grip);
      if (controls.brake) car.vx *= Math.pow(brakeDrag, dt * 60);
      if (Math.abs(car.vx) < 1.2 && throttle === 0) car.vx = 0;
      car.angle = lerp(car.angle, clamp(wheelSlope, -0.85, 0.85), Math.min(1, dt * 8));
      car.angVel *= Math.pow(0.42, dt * 60);
      if (Math.abs(car.vx) > 14) {
        car.dust = Math.min(1, car.dust + dt * 2);
      }
      if (!car.landed && Math.abs(car.vx) > 18) {
        spawnDust(car.x - car.facing * 20, car.y + 28, 8);
        playSound("impact");
      }
      car.landed = true;
    } else {
      if (controls.up) car.angVel -= 3.0 * dt;
      car.angVel += clamp(car.vx / 520, -0.55, 0.55) * dt;
      car.angVel *= Math.pow(0.985, dt * 60);
      car.angle += car.angVel * dt;
      car.vx *= Math.pow(0.998, dt * 60);
      car.landed = false;
    }

    car.x += car.vx * dt;
    if (car.x < 20) car.x = 20;
    if (car.x > level.length - 20) car.x = level.length - 20;

    car.y = avgWheel - car.bodyCenterDrop;
    car.vy = (car.wheelL.vy + car.wheelR.vy) / 2;

    if (Math.abs(car.angle) > 1.2) car.upsideDown += dt;
    else car.upsideDown = Math.max(0, car.upsideDown - dt * 1.5);

    if (Math.abs(car.vx) > 12 && grounded) {
      const fuelDrain = dt * (0.48 + Math.abs(throttle) * 0.28 + Math.abs(car.vx) / 1150);
      car.fuel = Math.max(0, car.fuel - fuelDrain);
    }
    if (car.invuln > 0) car.invuln -= dt;
    if (car.respawnShield > 0) car.respawnShield -= dt;
    if (car.noControlTimer > 0) car.noControlTimer -= dt;
    if (car.whistleCooldown > 0) car.whistleCooldown -= dt;
    if (car.smoke > 0) {
      car.smoke -= dt;
      spawnSmoke(car.x - 48 * car.facing, car.y - 10, 1);
    }

    if (controls.brake && grounded && Math.abs(car.vx) > 14) spawnDust(car.x - car.facing * 38, car.y + 28, 2);
    if (Math.abs(car.vx) > 18 && grounded && Math.random() < 0.09 * dt * 60) spawnDust(car.x - car.facing * 34, car.y + 28, 1);

    car.wheelL.wobble = car.health <= 1 ? Math.sin(state.time * 20) * 0.15 : 0;
    car.wheelR.wobble = car.health <= 1 ? Math.cos(state.time * 22) * 0.15 : 0;
    car.exhaust = grounded ? (Math.abs(car.vx) > 10 || throttle !== 0 ? 1 : 0.4) : 0.7;
    car.vx = clamp(car.vx, -maxReverse, maxSpeed);

    if (levelObj.script) levelObj.script(dt, { car, level: levelObj, state, save, controls });
    toggleCheckpointByX(car.x);
  }

  function updatePitAndHazardCollisions() {
    const levelObj = level;
    const bounds = carBounds();
    const midpoint = sampleSolid(levelObj, car.x);
    const groundMissing = !midpoint;
    if (groundMissing && car.y > 520) {
      hitCar(3, "Fell into a pit");
      return;
    }
    if (car.y > H + 120) {
      hitCar(3, "Fell off road");
      return;
    }

    for (const h of levelObj.hazards) {
      if (!h.active) continue;
      if (h.hidden && state.revealTimer <= 0) continue;
      if (h.type === "trapSign" && Math.abs(car.x - h.x) < 120) {
        if (!h.triggered) {
          h.triggered = true;
          triggerTrapMessage(h.message || "Trap activated!");
          playSound("trap");
          state.freezeTimer = Math.max(state.freezeTimer, 1.4);
        }
      }
      if (h.type === "spikes" || h.type === "frozenSpike" || h.type === "speedBump" || h.type === "cliff") {
        const hb = rect(h.x, h.y, h.w, h.h);
        if (overlap(bounds, hb)) {
          hitCar(h.damage || 1, h.message || "Spike trap");
          if (h.oneShot) h.active = false;
        }
      }
      if (h.type === "water") {
        if (bounds.x + bounds.w > h.x && bounds.x < h.x + h.w && car.y + 20 > h.y - 4) {
          hitCar(3, "Sank into water");
        }
      }
      if (h.type === "crusher") {
        const hb = rect(h.x - h.w / 2, h.y, h.w, h.h);
        if (overlap(bounds, hb)) hitCar(3, "Crushed");
      }
      if (h.type === "barrel" || h.type === "fallingRock" || h.type === "mineCart" || h.type === "darkRock") {
        const hb = rect(h.x - 20, h.y - 20, 40, 40);
        if (overlap(bounds, hb)) {
          hitCar(h.damage || 2, h.type === "barrel" ? "Barrel hit" : "Rock hit");
          if (h.oneShot) h.active = false;
        }
      }
      if (h.type === "bigJump") {
        const hb = rect(h.x - 36, h.y, h.w, h.h);
        if (overlap(bounds, hb)) {
          showToast("Big jump ahead", 0.9);
        }
      }
      if (h.type === "gate" && h.active) {
        const hb = rect(h.x, h.y, h.w, h.h);
        if (overlap(bounds, hb)) hitCar(2, "Timed gate");
      }
      if (h.type === "electric") {
        const hb = rect(h.x, h.y, h.w, h.h);
        if (overlap(bounds, hb)) hitCar(2, "Electric hazard");
      }
      if (h.type === "fallPlatform" || h.type === "fallRoad") {
        const hb = rect(h.x - h.w / 2, h.y, h.w, h.h);
        if (overlap(bounds, hb) && h.triggered) hitCar(1, "Crumbling road");
      }
    }
  }

  function activateSwitch(target) {
    if (!target) return false;
    if (target.type === "switch") {
      target.triggered = true;
      const bridge = level.solids.find((s) => s.linked === target.linked);
      if (bridge) bridge.visible = true;
      target.activated = true;
      level.gateOpen = true;
      showToast("Switch pulled", 1.1);
      playSound("checkpoint");
      state.shake = Math.max(state.shake, 0.1);
      return true;
    }
    if (target.type === "gateSwitch") {
      target.triggered = true;
      level.gateOpen = true;
      showToast("Gate opened", 1.1);
      playSound("checkpoint");
      return true;
    }
    if (target.type === "anchor") {
      car.vx += car.facing * 180;
      car.vy -= 70;
      showToast("Yo-yo swing boost", 1.1);
      playSound("yoyo");
      return true;
    }
    return false;
  }

  function useInteract() {
    if (state.mode !== "playing" || car.noControlTimer > 0) return;
    const hand = handPosition();
    const target = findInteractable(hand, 120);
    if (target) {
      if (target.type === "fuel") {
        collectPickup(target);
        showToast("Fuel collected", 1.0);
        playSound("fuel");
        return;
      }
      if (target.type === "coin") {
        collectPickup(target);
        return;
      }
      activateSwitch(target);
      return;
    }
    showToast("Nothing nearby", 0.9);
  }

  function useYoyo() {
    if (state.mode !== "playing" || car.yoyo.cooldown > 0 || car.noControlTimer > 0) return;
    const hand = handPosition();
    const target = findInteractable(hand, 230, true) || { type: "anchor", x: hand.x + car.facing * 190, y: hand.y - 24 };
    car.yoyo.state = "out";
    car.yoyo.x = hand.x;
    car.yoyo.y = hand.y;
    car.yoyo.tx = target.x;
    car.yoyo.ty = target.y;
    car.yoyo.timer = 0;
    car.yoyo.target = target;
    car.yoyo.returning = false;
    car.yoyo.cooldown = 0.35;
    playSound("yoyo");
  }

  function whistle() {
    if (state.mode !== "playing") return;
    if (car.whistleCooldown > 0) return;
    car.whistleCooldown = 1.1;
    revealHiddenThings(3.4);
    state.freezeTimer = Math.max(state.freezeTimer, 1.4);
  }

  function findInteractable(hand, range, yoyoMode = false) {
    const all = [];
    for (const item of level.pickups) {
      if (item.collected) continue;
      if (item.hidden && state.revealTimer <= 0 && item.type !== "goldYoyo") continue;
      if (item.type === "coin" && !yoyoMode) continue;
      all.push({ type: item.type, x: item.x, y: item.y, target: item, dist: Math.hypot(item.x - hand.x, item.y - hand.y) });
    }
    for (const h of level.hazards) {
      if (!h.active) continue;
      if (h.hidden && state.revealTimer <= 0) continue;
      if (h.type === "switch" || h.type === "gateSwitch" || h.type === "anchor") {
        all.push({ type: h.type, x: h.x, y: h.y, target: h, dist: Math.hypot(h.x - hand.x, h.y - hand.y) });
      }
    }
    for (const s of level.solids) {
      if (s.hidden && state.revealTimer <= 0) continue;
      if (s.linked) {
        all.push({ type: "anchor", x: (s.x1 + s.x2) / 2, y: s.y1, target: s, dist: Math.hypot(((s.x1 + s.x2) / 2) - hand.x, s.y1 - hand.y) });
      }
    }
    all.sort((a, b) => a.dist - b.dist);
    return all.find((entry) => entry.dist <= range) || null;
  }

  function updateYoyo(dt) {
    if (car.yoyo.cooldown > 0) car.yoyo.cooldown -= dt;
    const hand = handPosition();
    if (car.yoyo.state === "ready") {
      car.yoyo.x = hand.x;
      car.yoyo.y = hand.y;
      car.yoyo.tx = hand.x;
      car.yoyo.ty = hand.y;
      return;
    }
    car.yoyo.timer += dt;
    const target = car.yoyo.target;
    const speed = 980;
    if (!car.yoyo.returning) {
      const dx = target.x - car.yoyo.x;
      const dy = target.y - car.yoyo.y;
      const d = Math.hypot(dx, dy) || 1;
      car.yoyo.x += (dx / d) * speed * dt;
      car.yoyo.y += (dy / d) * speed * dt;
      if (d < 18 || car.yoyo.timer > 0.45) {
        if (target && (target.type === "coin" || target.type === "fuel" || target.type === "goldYoyo")) collectPickup(target);
        if (target && (target.type === "switch" || target.type === "gateSwitch" || target.type === "anchor")) activateSwitch(target);
        car.yoyo.returning = true;
      }
    } else {
      const dx = hand.x - car.yoyo.x;
      const dy = hand.y - car.yoyo.y;
      const d = Math.hypot(dx, dy) || 1;
      car.yoyo.x += (dx / d) * speed * dt;
      car.yoyo.y += (dy / d) * speed * dt;
      if (d < 12) {
        car.yoyo.state = "ready";
        car.yoyo.target = null;
        car.yoyo.returning = false;
        car.yoyo.timer = 0;
      }
    }
  }

  function updateParticles(dt) {
    particles.forEach((p) => {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt;
      if (p.type === "smoke") p.vy -= 12 * dt;
      if (p.type === "dust") p.vx *= Math.pow(0.98, dt * 60);
    });
    particles = particles.filter((p) => p.age < p.life);
  }

  function updateCamera(dt) {
    const viewW = W / state.cameraZoom;
    const targetX = clamp(car.x - viewW * 0.4 + clamp(car.vx * 0.22, -110, 180), 0, Math.max(0, level.length - viewW));
    const targetY = clamp(car.y - 250, 160, 500);
    const speed = 4.8;
    state.cameraX = lerp(state.cameraX, targetX, Math.min(1, dt * speed));
    state.cameraY = lerp(state.cameraY, targetY, Math.min(1, dt * 3));
    const jumpZoom = clamp(1.18 - Math.min(0.12, Math.abs(car.vy) / 2600), 1.06, 1.22);
    state.cameraZoom = lerp(state.cameraZoom, jumpZoom, Math.min(1, dt * 3.5));
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
    if (state.revealTimer > 0) state.revealTimer = Math.max(0, state.revealTimer - dt);
    if (state.freezeTimer > 0) state.freezeTimer = Math.max(0, state.freezeTimer - dt);
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) dom.toast.classList.remove("visible");
    }
    dom.recoverButton.classList.toggle("hidden", !(state.mode === "playing" && car.upsideDown > 3));
  }

  function checkFinish() {
    if (state.complete) return;
    if (car.x >= level.finishX && Math.abs(car.vx) < 220 && car.y < H + 50) {
      if (state.levelIndex === LEVELS.length - 1) {
        finishAllLevels();
      } else {
        completeLevel();
      }
    }
  }

  function updateLevel(dt) {
    if (state.mode !== "playing") return;
    state.time += dt;
    level.time += dt;
    updateDynamicSolids(dt);
    updateHazards(dt);
    updatePlayerPhysics(dt);
    updateYoyo(dt);
    tryCollectVisibleItems();
    updatePitAndHazardCollisions();
    updateParticles(dt);
    checkFinish();
    updateCamera(dt);
    updateHud();
  }

  function drawBackdrop() {
    const theme = themePalette[level.theme] || themePalette.sunrise;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, theme.sky1);
    sky.addColorStop(0.55, theme.sky2);
    sky.addColorStop(1, theme.sky3);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    const parallax = state.cameraX * 0.15;
    const parallax2 = state.cameraX * 0.3;
    drawParallaxRidges(theme, parallax);
    drawParallaxHills(theme, parallax2);
    drawAtmospherics(theme);
    if (level.theme === "mine") {
      const g = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 420);
      g.addColorStop(0, "rgba(255, 241, 205, .18)");
      g.addColorStop(1, "rgba(0,0,0,.72)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    if (level.theme === "flood") {
      drawWaterBackground(theme);
    }
  }

  function drawParallaxRidges(theme, offset) {
    ctx.fillStyle = theme.fog;
    const baseY = 270;
    const points = [
      [0, baseY + 20], [220, baseY - 10], [420, baseY + 22], [680, baseY - 14], [980, baseY + 15], [1280, baseY - 6]
    ];
    ctx.beginPath();
    ctx.moveTo(-300 - offset * 0.6, H);
    points.forEach((p) => ctx.lineTo(p[0] - offset * 0.6, p[1]));
    ctx.lineTo(W + 400, H);
    ctx.closePath();
    ctx.fill();
  }

  function drawParallaxHills(theme, offset) {
    ctx.fillStyle = "rgba(56, 35, 20, .16)";
    const baseY = 360;
    ctx.beginPath();
    ctx.moveTo(-280 - offset, H);
    const hillPoints = [
      [0, baseY + 14], [160, baseY - 22], [360, baseY + 18], [560, baseY - 30], [820, baseY + 20], [1100, baseY - 16], [1400, baseY + 18]
    ];
    hillPoints.forEach((p) => ctx.lineTo(p[0] - offset, p[1]));
    ctx.lineTo(W + 400, H);
    ctx.closePath();
    ctx.fill();
  }

  function drawAtmospherics(theme) {
    if (level.theme === "desert" || level.theme === "trap") {
      ctx.fillStyle = "rgba(255, 232, 184, .05)";
      for (let i = 0; i < 10; i += 1) {
        const y = 80 + ((state.time * 18 + i * 44) % H);
        ctx.fillRect(0, y, W, 2);
      }
    }
    if (level.theme === "construction" || level.theme === "factory") {
      ctx.fillStyle = "rgba(255,255,255,.06)";
      for (let i = 0; i < 6; i += 1) {
        const x = ((state.time * 24 + i * 220) % (W + 300)) - 120;
        ctx.fillRect(x, 82 + i * 16, 90, 3);
      }
    }
    if (level.theme === "ice") {
      ctx.fillStyle = "rgba(255,255,255,.06)";
      for (let i = 0; i < 26; i += 1) {
        const x = ((state.time * 20 + i * 90) % (W + 80)) - 40;
        const y = 54 + (i % 5) * 80;
        ctx.fillRect(x, y, 2, 12);
      }
    }
  }

  function drawWaterBackground(theme) {
    const waterY = 500 - level.waterRise * 84;
    const g = ctx.createLinearGradient(0, waterY - 40, 0, H);
    g.addColorStop(0, "rgba(120, 173, 194, .18)");
    g.addColorStop(1, "rgba(35, 61, 76, .68)");
    ctx.fillStyle = g;
    ctx.fillRect(0, waterY, W, H - waterY);
  }

  function drawWorld() {
    const zoom = state.cameraZoom;
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * 18 * state.shake : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * 12 * state.shake : 0;
    const offsetX = W / 2 - state.cameraX * zoom + shakeX;
    const offsetY = H / 2 - state.cameraY * zoom + shakeY;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawBackdrop();
    ctx.setTransform(zoom, 0, 0, zoom, offsetX, offsetY);
    drawTerrain();
    drawLevelDecorations();
    drawCheckpoints();
    drawPickups();
    drawHazards();
    drawCar();
    drawParticles();
    drawYoyo();
    drawFinish();
    if (state.revealTimer > 0) drawRevealOverlay();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (level.theme === "mine") drawMineVignette();
  }

  function drawTerrain() {
    const theme = themePalette[level.theme] || themePalette.sunrise;
    level.solids.forEach((s) => {
      if (!s.visible || s.collapsed) return;
      if (s.hidden && state.revealTimer <= 0) return;
      drawSolid(s, theme);
    });
  }

  function drawLevelDecorations() {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (state.levelIndex === 0) {
      const props = [
        { x: 108, y: 432, text: "D / A", sub: "Drive" },
        { x: 420, y: 400, text: "Space", sub: "Brake" },
        { x: 760, y: 360, text: "W", sub: "Air tilt only" },
        { x: 1190, y: 332, text: "F", sub: "Yo-Yo" }
      ];
      props.forEach((p) => {
        ctx.fillStyle = "rgba(88, 58, 34, .82)";
        ctx.fillRect(p.x, p.y, 14, 34);
        ctx.fillStyle = "#8a623a";
        roundRect(p.x - 18, p.y - 20, 86, 34, 8, true, false);
        ctx.fillStyle = "#f7e8c2";
        ctx.font = "900 11px Orbitron";
        ctx.textAlign = "center";
        ctx.fillText(p.text, p.x + 25, p.y - 1);
        ctx.fillStyle = "rgba(40, 24, 15, .78)";
        ctx.font = "700 9px Inter";
        ctx.fillText(p.sub, p.x + 25, p.y + 11);
      });
      const cones = [250, 325, 1450];
      cones.forEach((x) => {
        ctx.fillStyle = "#e18738";
        ctx.beginPath();
        ctx.moveTo(x, 470);
        ctx.lineTo(x + 12, 446);
        ctx.lineTo(x + 24, 470);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#f5dcb1";
        ctx.fillRect(x + 4, 458, 16, 4);
      });
      ctx.strokeStyle = "rgba(245,220,177,.42)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(550, 424);
      ctx.lineTo(715, 398);
      ctx.stroke();
      ctx.fillStyle = "#8d6239";
      roundRect(680, 388, 58, 18, 6, true, false);
      ctx.fillStyle = "#f7e8c2";
      ctx.font = "800 8px Inter";
      ctx.fillText("Small ramp", 709, 404);
      ctx.fillStyle = "rgba(255,255,255,.12)";
      ctx.fillRect(980, 468, 240, 5);
    }
    if (state.levelIndex > 0) {
      ctx.fillStyle = "rgba(255, 240, 209, .10)";
      for (let i = 0; i < 10; i += 1) {
        const x = 140 + i * 140;
        ctx.fillRect(x, 470 + (i % 2) * 6, 36, 4);
      }
    }
    ctx.restore();
  }

  function drawSolid(s, theme) {
    const x1 = s.x1;
    const x2 = s.x2;
    const y1 = s.y1;
    const y2 = s.y2;
    const thickness = groundThickness(s.surface);
    const isBridge = s.surface === "bridge";
    const baseColor = s.surface === "ice" ? "#dfefff"
      : s.surface === "sand" ? "#d7b77a"
      : s.surface === "conveyorL" || s.surface === "conveyorR" ? "#6d5b4b"
      : s.surface === "road" ? "#7b593c"
      : s.surface === "road" ? "#7b593c"
      : "#75533a";
    const top = s.hidden ? "rgba(255,255,255,.22)" : baseColor;
    const shadow = s.surface === "ice" ? "rgba(255,255,255,.22)" : "rgba(0,0,0,.18)";
    ctx.fillStyle = baseColor;
    ctx.strokeStyle = shadow;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2, y2 + thickness);
    ctx.lineTo(x1, y1 + thickness);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = top;
    ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), 4);
    if (s.surface === "conveyorL" || s.surface === "conveyorR") {
      ctx.fillStyle = "rgba(255,255,255,.12)";
      for (let i = 0; i < Math.abs(x2 - x1); i += 42) {
        const px = Math.min(x1, x2) + i + ((state.time * 60) % 42);
        ctx.fillRect(px, Math.min(y1, y2) + 10, 18, 3);
      }
    }
    if (s.surface === "ice") {
      ctx.fillStyle = "rgba(255,255,255,.22)";
      for (let i = 0; i < 8; i += 1) {
        const px = Math.min(x1, x2) + ((i * 64 + state.time * 10) % Math.max(1, Math.abs(x2 - x1)));
        ctx.fillRect(px, Math.min(y1, y2) + 8, 20, 2);
      }
    }
    if (s.hidden || s.revealOnly) {
      ctx.fillStyle = "rgba(255, 238, 177, .18)";
      ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2) + 6, Math.abs(x2 - x1), 8);
    }
  }

  function drawCheckpoints() {
    level.checkpoints.forEach((cp, index) => {
      const active = save.levelCheckpoints[state.levelIndex] === index;
      const color = active ? "#f4cb75" : "rgba(255,255,255,.58)";
      ctx.save();
      ctx.translate(cp.x, cp.y - 52);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 56);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.lineTo(26, 16);
      ctx.lineTo(0, 28);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }

  function drawPickups() {
    level.pickups.forEach((item) => {
      if (item.collected) return;
      if (item.hidden && state.revealTimer <= 0 && item.type !== "goldYoyo") return;
      const blink = 0.5 + Math.sin(state.time * 4 + item.x * 0.01) * 0.2;
      ctx.save();
      ctx.translate(item.x, item.y);
      if (item.type === "coin") {
        ctx.fillStyle = "#ffd56b";
        ctx.shadowColor = "#ffd56b";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(0, 0, 9 * blink, 0, Math.PI * 2);
        ctx.fill();
      } else if (item.type === "fuel") {
        ctx.fillStyle = "#f4cb75";
        ctx.fillRect(-8, -11, 16, 22);
        ctx.fillStyle = "#7a4d24";
        ctx.fillRect(-4, -5, 8, 10);
      } else if (item.type === "goldYoyo") {
        ctx.fillStyle = "#e8d16f";
        ctx.shadowColor = "#e8d16f";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#7b5a22";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  function drawHazards() {
    level.hazards.forEach((h) => {
      if (!h.active) return;
      if (h.hidden && state.revealTimer <= 0) return;
      if (h.type === "spikes" || h.type === "frozenSpike") {
        ctx.fillStyle = h.type === "frozenSpike" ? "#d6f2ff" : "#7b2d23";
        for (let i = 0; i < h.w; i += 20) {
          ctx.beginPath();
          ctx.moveTo(h.x + i, h.y + h.h);
          ctx.lineTo(h.x + i + 10, h.y);
          ctx.lineTo(h.x + i + 20, h.y + h.h);
          ctx.closePath();
          ctx.fill();
        }
      } else if (h.type === "speedBump") {
        ctx.fillStyle = "#6c563d";
        ctx.fillRect(h.x, h.y, h.w, h.h);
      } else if (h.type === "barrel" || h.type === "mineCart") {
        ctx.fillStyle = "#7a5535";
        ctx.beginPath();
        ctx.arc(h.x, h.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#322116";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(h.x, h.y, 16, 0, Math.PI * 2);
        ctx.stroke();
      } else if (h.type === "fallingRock" || h.type === "darkRock") {
        ctx.fillStyle = "#6d5849";
        ctx.beginPath();
        ctx.arc(h.x, h.y, 20, 0, Math.PI * 2);
        ctx.fill();
      } else if (h.type === "crusher") {
        ctx.fillStyle = "#8a6a49";
        ctx.fillRect(h.x - h.w / 2, h.y, h.w, h.h);
        ctx.strokeStyle = "rgba(255,255,255,.18)";
        ctx.strokeRect(h.x - h.w / 2, h.y, h.w, h.h);
      } else if (h.type === "water") {
        ctx.fillStyle = "rgba(95, 143, 171, .55)";
        ctx.fillRect(h.x, h.y, h.w, h.h);
      } else if (h.type === "electric") {
        ctx.fillStyle = "rgba(147, 229, 255, .82)";
        ctx.fillRect(h.x, h.y, h.w, h.h);
      } else if (h.type === "fakeSign") {
        ctx.fillStyle = "#9f7145";
        ctx.fillRect(h.x, h.y, 36, 52);
        ctx.fillStyle = "#efe0b8";
        ctx.fillRect(h.x + 6, h.y + 10, 24, 8);
      } else if (h.type === "fallPlatform" || h.type === "fallRoad" || h.type === "cliff") {
        ctx.fillStyle = "rgba(92, 64, 42, .6)";
        ctx.fillRect(h.x - h.w / 2, h.y, h.w, h.h);
        ctx.strokeStyle = "rgba(255, 224, 160, .2)";
        ctx.strokeRect(h.x - h.w / 2, h.y, h.w, h.h);
        ctx.fillStyle = "rgba(255,255,255,.14)";
        ctx.fillRect(h.x - h.w / 2 + 8, h.y + 7, h.w - 16, 4);
      } else if (h.type === "switch" || h.type === "gateSwitch") {
        ctx.fillStyle = "#7a5a37";
        ctx.fillRect(h.x, h.y, h.w, h.h);
        ctx.strokeStyle = "#f1d07c";
        ctx.strokeRect(h.x, h.y, h.w, h.h);
        ctx.fillStyle = "#f9efcf";
        ctx.fillRect(h.x + 7, h.y + 6, h.w - 14, 6);
        ctx.fillStyle = "#f0c26d";
        ctx.beginPath();
        ctx.arc(h.x + h.w / 2, h.y + h.h / 2 + 2, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (h.type === "gate") {
        if (h.active) {
          ctx.fillStyle = "#5a4637";
          ctx.fillRect(h.x, h.y, h.w, h.h);
          ctx.strokeStyle = "#f1d07c";
          ctx.strokeRect(h.x, h.y, h.w, h.h);
        }
      } else if (h.type === "trapGate") {
        ctx.fillStyle = "#7b5536";
        ctx.fillRect(h.x, h.y, h.w, h.h);
      }
    });
  }

  function drawCar() {
    const wobble = car.health <= 1 ? Math.sin(state.time * 24) * 0.04 : 0;
    const driveLean = clamp(car.angle + wobble, -1.05, 1.05);
    const flip = car.facing < 0 ? -1 : 1;
    const wheelLY = car.wheelL.y - car.y;
    const wheelRY = car.wheelR.y - car.y;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(driveLean * 0.52);
    ctx.scale(flip, 1);
    drawCarShadow();
    drawSuspension(-1, wheelLY);
    drawSuspension(1, wheelRY);
    drawWheel(-1, wheelLY);
    drawWheel(1, wheelRY);
    drawChassis();
    drawCabin();
    drawDriver();
    drawHeadlights();
    drawExhaust();
    drawDamage();
    ctx.restore();
  }

  function drawCarShadow() {
    ctx.fillStyle = "rgba(22, 12, 7, .16)";
    ctx.beginPath();
    ctx.ellipse(0, 34, 82, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSuspension(side, wheelY) {
    ctx.save();
    ctx.strokeStyle = "rgba(52, 31, 20, .9)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(side * 44, 12);
    ctx.lineTo(side * 54, wheelY - 10);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,236,180,.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(side * 42, 10);
    ctx.lineTo(side * 50, wheelY - 12);
    ctx.stroke();
    ctx.restore();
  }

  function drawWheel(side, wheelY) {
    const wobble = side < 0 ? car.wheelL.wobble : car.wheelR.wobble;
    const x = side * car.wheelBase / 2;
    const y = wheelY;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((state.time * 10 + car.vx * 0.02) * (side < 0 ? 1 : -1) + wobble);
    ctx.fillStyle = "#20140d";
    ctx.beginPath();
    ctx.arc(0, 0, car.wheelRadius + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d7ad53";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, car.wheelRadius - 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(12, 0);
    ctx.moveTo(0, -12);
    ctx.lineTo(0, 12);
    ctx.moveTo(-8, -8);
    ctx.lineTo(8, 8);
    ctx.moveTo(-8, 8);
    ctx.lineTo(8, -8);
    ctx.stroke();
    ctx.restore();
  }

  function drawChassis() {
    const damage = 1 - (car.health - 1) / Math.max(1, car.maxHealth - 1);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255, 220, 154, .22)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(-58, 18);
    ctx.lineTo(-40, -2);
    ctx.lineTo(-6, -10);
    ctx.lineTo(34, -10);
    ctx.lineTo(62, 10);
    ctx.stroke();
    ctx.strokeStyle = "#462a18";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-58, 18);
    ctx.lineTo(-40, -2);
    ctx.lineTo(-6, -10);
    ctx.lineTo(34, -10);
    ctx.lineTo(62, 10);
    ctx.stroke();
    ctx.fillStyle = "#8c6036";
    ctx.beginPath();
    ctx.moveTo(-64, 16);
    ctx.lineTo(-46, -8);
    ctx.lineTo(-12, -22);
    ctx.lineTo(18, -22);
    ctx.lineTo(42, -14);
    ctx.lineTo(64, 4);
    ctx.lineTo(60, 18);
    ctx.lineTo(-60, 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#6f4728";
    ctx.fillRect(-48, 0, 104, 18);
    ctx.fillStyle = "#5d381f";
    roundRect(-22, -18, 60, 20, 8, true, false);
    ctx.fillStyle = "#4b2d1d";
    ctx.fillRect(-56, 12, 18, 8);
    ctx.fillRect(44, 12, 18, 8);
    ctx.fillStyle = "#d9b06a";
    ctx.fillRect(-52, -14, 8, 8);
    ctx.fillRect(50, -12, 10, 8);
    ctx.fillStyle = "#7b4e2a";
    ctx.fillRect(-10, -6, 56, 18);
    ctx.fillStyle = damage > 0.6 ? "#a64c36" : "#7b4e2a";
    ctx.fillRect(56, 4, 16, 8);
    ctx.fillStyle = "#f1dbae";
    ctx.fillRect(56, 6, 16, 3);
  }

  function drawCabin() {
    ctx.save();
    ctx.fillStyle = "#5e3d24";
    roundRect(-24, -31, 58, 28, 10, true, false);
    ctx.fillStyle = "rgba(23, 14, 9, .88)";
    roundRect(-18, -26, 28, 20, 7, true, false);
    ctx.fillStyle = "rgba(235, 236, 228, .16)";
    ctx.beginPath();
    ctx.moveTo(18, -30);
    ctx.lineTo(46, -24);
    ctx.lineTo(52, -4);
    ctx.lineTo(18, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 236, 180, .35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, -28);
    ctx.lineTo(46, -22);
    ctx.lineTo(50, -6);
    ctx.stroke();
    ctx.fillStyle = "#392318";
    ctx.fillRect(-4, -8, 20, 4);
    ctx.fillStyle = "rgba(255, 247, 220, .08)";
    ctx.fillRect(-20, -20, 24, 4);
    ctx.restore();
  }

  function drawHeadlights() {
    ctx.fillStyle = "rgba(255, 230, 171, .92)";
    ctx.shadowColor = "rgba(255, 230, 171, .86)";
    ctx.shadowBlur = 14;
    ctx.fillRect(60, -8, 10, 8);
    ctx.fillRect(60, 4, 10, 8);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 106, 98, .85)";
    ctx.fillRect(-70, -2, 8, 6);
    ctx.fillRect(-70, 10, 8, 6);
  }

  function drawExhaust() {
    if (car.exhaust <= 0) return;
    const smokeAlpha = car.health <= 1 ? 0.8 : 0.45;
    ctx.fillStyle = `rgba(242, 236, 228, ${smokeAlpha})`;
    ctx.beginPath();
    ctx.arc(-72, 8, 10 + Math.sin(state.time * 8) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5c3b24";
    ctx.fillRect(-76, 3, 10, 5);
  }

  function drawDamage() {
    if (car.invuln > 0 && Math.floor(state.time * 12) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }
    if (car.smoke > 0 || car.health <= 1) {
      spawnSmoke(car.x - 16, car.y - 50, 0);
      ctx.fillStyle = "rgba(255,255,255,.2)";
      ctx.fillRect(-14, -60, 18, 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawDriver() {
    const bodyLean = clamp(car.angle * 0.28, -0.36, 0.36);
    const mirror = car.facing < 0 ? -1 : 1;
    const seatX = -7;
    const seatY = -10;
    const wheelXPos = 20;
    const wheelYPos = -2;
    ctx.save();
    ctx.translate(seatX, seatY);
    ctx.scale(mirror, 1);
    ctx.rotate(bodyLean);
    ctx.strokeStyle = "rgba(80,220,255,.42)";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.arc(0, -26, 9, 0, Math.PI * 2);
    ctx.moveTo(0, -17);
    ctx.lineTo(0, 8);
    ctx.moveTo(0, -5);
    ctx.lineTo(wheelXPos - 8, wheelYPos - 2);
    ctx.moveTo(0, 1);
    ctx.lineTo(wheelXPos - 2, wheelYPos + 8);
    ctx.moveTo(0, 8);
    ctx.lineTo(-8, 28);
    ctx.moveTo(0, 8);
    ctx.lineTo(10, 28);
    ctx.stroke();
    ctx.strokeStyle = "#020308";
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(0, -26, 9, 0, Math.PI * 2);
    ctx.moveTo(0, -17);
    ctx.lineTo(0, 8);
    ctx.moveTo(0, -5);
    ctx.lineTo(wheelXPos - 8, wheelYPos - 2);
    ctx.moveTo(0, 1);
    ctx.lineTo(wheelXPos - 2, wheelYPos + 8);
    ctx.moveTo(0, 8);
    ctx.lineTo(-8, 28);
    ctx.moveTo(0, 8);
    ctx.lineTo(10, 28);
    ctx.stroke();
    ctx.fillStyle = "#36e5ff";
    ctx.font = "900 8px Orbitron";
    ctx.textAlign = "center";
    ctx.fillText("Y", 0, -6);
    ctx.strokeStyle = "#020308";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(14, 0);
    ctx.lineTo(wheelXPos - 2, wheelYPos);
    ctx.stroke();
    ctx.strokeStyle = "#020308";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(-7, 22);
    ctx.moveTo(0, 8);
    ctx.lineTo(7, 22);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(20, -10);
    ctx.strokeStyle = "#2d1b12";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawYoyo() {
    const hand = handPosition();
    if (car.yoyo.state === "ready") return;
    ctx.save();
    ctx.strokeStyle = "rgba(247, 248, 244, .88)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hand.x, hand.y);
    ctx.lineTo(car.yoyo.x, car.yoyo.y);
    ctx.stroke();
    ctx.fillStyle = "#f1d07c";
    ctx.shadowColor = "#f1d07c";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(car.yoyo.x, car.yoyo.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff7e8";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawParticles() {
    particles.forEach((p) => {
      const t = 1 - p.age / p.life;
      ctx.save();
      ctx.globalAlpha = clamp(t, 0, 1);
      ctx.fillStyle = p.color;
      if (p.type === "dust" || p.type === "smoke") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + (1 - t) * 0.4), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "stick") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.x - 6, p.y - 6);
        ctx.lineTo(p.x + 8, p.y + 8);
        ctx.moveTo(p.x + 8, p.y - 8);
        ctx.lineTo(p.x - 8, p.y + 8);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawFinish() {
    const x = level.finishX;
    ctx.save();
    ctx.translate(x, 336);
    ctx.strokeStyle = "#f1d07c";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 92);
    ctx.stroke();
    ctx.fillStyle = "#f1d07c";
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(58, 18);
    ctx.lineTo(0, 32);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawRevealOverlay() {
    ctx.save();
    ctx.fillStyle = "rgba(255, 236, 174, .08)";
    ctx.fillRect(state.cameraX - 80, state.cameraY - 80, 900, 540);
    ctx.restore();
  }

  function drawMineVignette() {
    const g = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 420);
    g.addColorStop(0, "rgba(255, 240, 200, .12)");
    g.addColorStop(1, "rgba(0, 0, 0, .84)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawScene() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (level) drawWorld();
    if (state.debug && level) drawDebugOverlay();
    if (state.complete) buildCompletionPanel(state.levelIndex === LEVELS.length - 1 && save.unlocked >= LEVELS.length);
  }

  function drawDebugOverlay() {
    const wheelLY = car.wheelL.y - car.y;
    const wheelRY = car.wheelR.y - car.y;
    const zoom = state.cameraZoom;
    const toScreen = (x, y) => ({ x: (x - state.cameraX) * zoom + W / 2, y: (y - state.cameraY) * zoom + H / 2 });
    const chassis = carBounds();
    const c = toScreen(car.x, car.y);
    const wl = toScreen(car.x - car.wheelBase / 2, car.wheelL.y);
    const wr = toScreen(car.x + car.wheelBase / 2, car.wheelR.y);
    const cb = toScreen(chassis.x, chassis.y);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "rgba(9, 12, 16, .74)";
    ctx.fillRect(16, 16, 330, 170);
    ctx.strokeStyle = "rgba(255, 236, 180, .55)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(16, 16, 330, 170);
    ctx.fillStyle = "#f7e8c2";
    ctx.font = "900 12px Orbitron";
    ctx.fillText("DEBUG F2", 30, 38);
    ctx.font = "700 11px Inter";
    ctx.fillText(`Velocity: ${car.vx.toFixed(1)}, ${car.vy.toFixed(1)}`, 30, 60);
    ctx.fillText(`Angular: ${car.angVel.toFixed(2)} | Angle: ${car.angle.toFixed(2)}`, 30, 78);
    ctx.fillText(`Input: L ${controls.left ? 1 : 0} R ${controls.right ? 1 : 0} B ${controls.brake ? 1 : 0} U ${controls.up ? 1 : 0}`, 30, 96);
    ctx.fillText(`Ground: ${car.wheelL.grounded ? "L" : "-"} ${car.wheelR.grounded ? "R" : "-"}`, 30, 114);
    ctx.fillText(`Wheel Y: ${wheelLY.toFixed(1)} / ${wheelRY.toFixed(1)}`, 30, 132);
    ctx.fillText(`COG: ${car.x.toFixed(1)}, ${car.y.toFixed(1)}`, 30, 150);
    ctx.fillText(`Camera: ${state.cameraX.toFixed(1)}, ${state.cameraY.toFixed(1)} z ${state.cameraZoom.toFixed(2)}`, 30, 168);
    ctx.strokeStyle = "rgba(255, 127, 127, .8)";
    ctx.strokeRect(cb.x, cb.y, chassis.w * zoom, chassis.h * zoom);
    ctx.beginPath();
    ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ff7f7f";
    ctx.fill();
    ctx.strokeStyle = "rgba(127, 221, 255, .85)";
    ctx.beginPath();
    ctx.arc(wl.x, wl.y, car.wheelRadius * zoom, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(wr.x, wr.y, car.wheelRadius * zoom, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function updateNow(ts) {
    if (!state.lastTs) state.lastTs = ts;
    const rawDt = (ts - state.lastTs) / 1000;
    state.lastTs = ts;
    const dt = clamp(rawDt, 0, 0.05);
    state.accumulator = Math.min(0.25, state.accumulator + dt);
    while (state.accumulator >= FIXED_DT) {
      if (state.mode === "playing") updateLevel(FIXED_DT);
      else updateCamera(FIXED_DT);
      state.accumulator -= FIXED_DT;
    }
    drawScene();
    raf = requestAnimationFrame(updateNow);
  }

  function setButtonState(btn, active) {
    if (!btn) return;
    btn.dataset.active = active ? "1" : "0";
  }

  function bindHold(btn, key) {
    if (!btn) return;
    const on = (ev) => {
      ev.preventDefault();
      unlockAudio();
      controls[key] = true;
      setButtonState(btn, true);
      btn.setPointerCapture?.(ev.pointerId);
    };
    const off = (ev) => {
      ev.preventDefault();
      controls[key] = false;
      setButtonState(btn, false);
    };
    btn.addEventListener("pointerdown", on);
    btn.addEventListener("pointerup", off);
    btn.addEventListener("pointercancel", off);
    btn.addEventListener("pointerleave", off);
    btn.addEventListener("lostpointercapture", off);
  }

  function bindTap(btn, handler) {
    if (!btn) return;
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      unlockAudio();
      handler();
    });
  }

  function handleKey(e, down) {
    unlockAudio();
    if (down) {
      if (e.code === "Escape" || e.code === "KeyP") {
        if (state.mode === "playing") pauseGame();
        else if (state.mode === "paused") resumeGame();
        else if (state.mode === "menu") openPanel("menu");
        e.preventDefault();
        return;
      }
      if (e.code === "KeyR" && state.mode === "playing") {
        resetLevelCheckpoint();
        e.preventDefault();
        return;
      }
      if (e.code === "KeyF") {
        useYoyo();
        e.preventDefault();
        return;
      }
      if (e.code === "KeyG") {
        whistle();
        e.preventDefault();
        return;
      }
      if (e.code === "KeyE") {
        useInteract();
        e.preventDefault();
        return;
      }
      if (e.code === "F2") {
        state.debug = !state.debug;
        showToast(state.debug ? "Debug mode on" : "Debug mode off", 1.0);
        e.preventDefault();
        return;
      }
    }
    const map = {
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
      ArrowUp: "up",
      KeyW: "up",
      ArrowDown: "brake",
      KeyS: "brake",
      Space: "brake"
    };
    const key = map[e.code];
    if (key) {
      controls[key] = down;
      if (down && e.repeat) return;
      e.preventDefault();
    }
  }

  function resetProgress() {
    if (!confirm("Reset all Tamer Car progress?")) return;
    const fresh = defaultSave();
    Object.keys(save).forEach((k) => delete save[k]);
    Object.assign(save, fresh);
    writeSave();
    updateMenuButtons();
    syncSettingsUI();
    renderLevelSelect();
    renderGarage();
    showToast("Progress reset", 1.2);
  }

  function toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function syncAudioState() {
    if (audio.soundGain) audio.soundGain.gain.value = save.muted ? 0 : save.soundVolume;
    if (audio.musicGain) audio.musicGain.gain.value = save.muted ? 0 : save.musicVolume;
    if (save.muted || !save.music) stopMusic();
    else if (audio.unlocked) startMusic();
    updateHud();
  }

  function renderPanels() {
    updateMenuButtons();
    syncSettingsUI();
    renderLevelSelect();
    renderGarage();
    updateHud();
  }

  function boot() {
    if (raf) cancelAnimationFrame(raf);
    if (!level) spawnAtCheckpoint(0, LEVELS[0].checkpoints[0]);
    renderPanels();
    raf = requestAnimationFrame(updateNow);
  }

  function setupEvents() {
    window.addEventListener("keydown", (e) => handleKey(e, true));
    window.addEventListener("keyup", (e) => handleKey(e, false));
    window.addEventListener("blur", () => {
      if (state.mode === "playing") pauseGame();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.mode === "playing") pauseGame();
    });
    dom.canvas.addEventListener("pointerdown", unlockAudio);

    bindHold(dom.leftButton, "left");
    bindHold(dom.rightButton, "right");
    bindHold(dom.upButton, "up");
    bindHold(dom.downButton, "brake");
    bindHold(dom.brakeButton, "brake");
    bindTap(dom.interactButton, useInteract);
    bindTap(dom.yoyoButton, useYoyo);
    bindTap(dom.whistleButton, whistle);
    bindTap(dom.mobilePauseButton, () => state.mode === "playing" ? pauseGame() : resumeGame());
    bindTap(dom.restartMobileButton, resetLevelCheckpoint);

    bindTap(dom.pauseButton, () => pauseGame());
    bindTap(dom.resumeButton, () => resumeGame());
    bindTap(dom.restartButton, resetLevelCheckpoint);
    bindTap(dom.pauseLevelSelectButton, () => openPanel("levelSelect"));
    bindTap(dom.pauseGarageButton, () => openPanel("garage"));
    bindTap(dom.playButton, () => startGame(0));
    bindTap(dom.continueButton, continueGame);
    bindTap(dom.levelSelectButton, () => openPanel("levelSelect"));
    bindTap(dom.garageButton, () => openPanel("garage"));
    bindTap(dom.howButton, () => openPanel("how"));
    bindTap(dom.settingsButton, () => openPanel("settings"));
    bindTap(dom.creditsButton, () => openPanel("credits"));
    bindTap(dom.levelSelectBackButton, () => openPanel("menu"));
    bindTap(dom.garageBackButton, () => openPanel("menu"));
    bindTap(dom.settingsBackButton, () => openPanel("menu"));
    bindTap(dom.howBackButton, () => openPanel("menu"));
    bindTap(dom.creditsBackButton, () => openPanel("menu"));
    bindTap(dom.completeLevelSelectButton, () => openPanel("levelSelect"));
    bindTap(dom.completeGarageButton, () => openPanel("garage"));
    bindTap(dom.retryLevelButton, () => {
      spawnAtCheckpoint(state.levelIndex);
      state.mode = "playing";
      hideAllPanels();
    });
    bindTap(dom.nextLevelButton, () => {
      if (state.levelIndex >= LEVELS.length - 1) {
        state.levelIndex = 0;
        startGame(0);
      } else {
        startGame(state.levelIndex + 1);
      }
    });
    bindTap(dom.recoverButton, recoverCar);
    bindTap(dom.fullscreenButton, toggleFullscreen);
    bindTap(dom.mobileFullscreenButton, toggleFullscreen);
    bindTap(dom.soundButton, () => {
      save.sound = !save.sound;
      if (save.sound) save.muted = false;
      writeSave();
      syncAudioState();
      syncSettingsUI();
    });
    bindTap(dom.musicButton, () => {
      save.music = !save.music;
      writeSave();
      syncAudioState();
      syncSettingsUI();
    });
    dom.soundVolume.addEventListener("input", () => {
      save.soundVolume = clamp(Number(dom.soundVolume.value), 0, 1);
      save.sound = true;
      save.muted = false;
      writeSave();
      syncAudioState();
    });
    dom.musicVolume.addEventListener("input", () => {
      save.musicVolume = clamp(Number(dom.musicVolume.value), 0, 1);
      save.music = true;
      save.muted = false;
      writeSave();
      syncAudioState();
    });
    bindTap(dom.muteToggle, () => {
      save.muted = !save.muted;
      writeSave();
      syncAudioState();
      syncSettingsUI();
    });
    bindTap(dom.motionToggle, () => {
      save.reducedMotion = !save.reducedMotion;
      writeSave();
      syncSettingsUI();
    });
    bindTap(dom.resetProgressButton, resetProgress);
    window.addEventListener("resize", () => updateHud());
  }

  function initDefaults() {
    dom.soundVolume.value = String(save.soundVolume);
    dom.musicVolume.value = String(save.musicVolume);
    renderPanels();
    spawnAtCheckpoint(0, LEVELS[0].checkpoints[0]);
    hideAllPanels();
    setScreen("menu");
    updateMenuButtons();
    syncAudioState();
  }

  setupEvents();
  initDefaults();
  boot();
})();
