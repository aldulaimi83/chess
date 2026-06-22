(() => {
  "use strict";

  const canvas = document.getElementById("arenaCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const FLOOR = 470;
  const SAVE_KEY = "youooo_stickman_arena_v1";
  const WEAPONS = [
    { id: "yoyo", name: "Yo-Yo", cooldown: .46 },
    { id: "stick", name: "Stick", cooldown: .24 },
    { id: "slingshot", name: "Slingshot", cooldown: .72 },
    { id: "boomerang", name: "Boomerang", cooldown: .82 },
    { id: "rope", name: "Energy Rope", cooldown: 1.05 }
  ];
  const platforms = [{ x: 235, y: 365, w: 150, h: 18 }, { x: 585, y: 315, w: 145, h: 18 }];

  const dom = {
    wave: document.getElementById("waveReadout"), score: document.getElementById("scoreReadout"), kills: document.getElementById("killsReadout"), coins: document.getElementById("coinsReadout"), best: document.getElementById("bestReadout"), weapon: document.getElementById("weaponReadout"), health: document.getElementById("healthReadout"), healthFill: document.getElementById("healthFill"),
    startOverlay: document.getElementById("startOverlay"), pauseOverlay: document.getElementById("pauseOverlay"), gameOverOverlay: document.getElementById("gameOverOverlay"), start: document.getElementById("startButton"), pause: document.getElementById("pauseButton"), resume: document.getElementById("resumeButton"), restart: document.getElementById("restartButton"), playAgain: document.getElementById("playAgainButton"), finalStats: document.getElementById("finalStats"),
    menuBest: document.getElementById("menuBest"), menuWave: document.getElementById("menuWave"), menuCoins: document.getElementById("menuCoins"), weaponList: document.getElementById("weaponList"), toast: document.getElementById("toast"), sound: document.getElementById("soundButton"),
    mobileControls: document.querySelector(".mobile-controls"), fullscreen: document.getElementById("fullscreenButton"), mobilePause: document.getElementById("mobilePauseButton"), weaponButton: document.getElementById("weaponButton"), attack: document.getElementById("attackButton"), previous: document.getElementById("previousWeaponButton"), next: document.getElementById("nextWeaponButton"), whistle: document.getElementById("whistleButton"), whistleToolbar: document.getElementById("whistleToolbarButton")
  };

  function loadSave() {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
      const unlocked = Array.isArray(data.unlocked) ? data.unlocked.filter(id => WEAPONS.some(w => w.id === id)) : [];
      if (!unlocked.includes("yoyo")) unlocked.unshift("yoyo");
      return { bestScore: Math.max(0, Number(data.bestScore) || 0), coins: Math.max(0, Number(data.coins) || 0), highestWave: Math.max(1, Number(data.highestWave) || 1), totalKills: Math.max(0, Number(data.totalKills) || 0), unlocked, sound: data.sound !== false };
    } catch (_) {
      return { bestScore: 0, coins: 0, highestWave: 1, totalKills: 0, unlocked: ["yoyo"], sound: true };
    }
  }

  let save = loadSave();
  let player;
  let enemies = [];
  let projectiles = [];
  let coins = [];
  let effects = [];
  let wave = 1;
  let score = 0;
  let kills = 0;
  let running = false;
  let paused = false;
  let gameOver = false;
  let betweenWave = 0;
  let traveling = false;
  let worldOffset = 0;
  let selectedWeapon = 0;
  let lastTime = 0;
  let toastTimer = 0;
  let cameraX = 0;
  let audioContext = null;
  let whistleBus = null;
  let whistleCooldown = 0;
  const keys = { left: false, right: false, jumpQueued: false, attack: false };

  function writeSave() { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }

  function sound(frequency, duration = .08, type = "sine") {
    if (!save.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gain.gain.setValueAtTime(.055, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
    } catch (_) {}
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

  function scheduleWhistleNote(frequency, duration, volume, delay = 0) {
    if (!save.sound || !audioContext) return;
    const start = audioContext.currentTime + delay;
    const end = start + duration;
    const whistle = audioContext.createOscillator();
    const harmonic = audioContext.createOscillator();
    const harmonicGain = audioContext.createGain();
    const envelope = audioContext.createGain();
    const vibrato = audioContext.createOscillator();
    const vibratoDepth = audioContext.createGain();
    const bus = getWhistleBus();
    whistle.type = "sine"; harmonic.type = "sine"; vibrato.type = "sine";
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
    whistle.connect(envelope); harmonic.connect(harmonicGain).connect(envelope);
    envelope.connect(bus.dry); envelope.connect(bus.reverb);
    whistle.start(start); harmonic.start(start); vibrato.start(start);
    whistle.stop(end + .01); harmonic.stop(end + .01); vibrato.stop(end + .01);
  }

  function playWhistle(automatic = false) {
    if (!save.sound || !running || paused || gameOver || (!automatic && whistleCooldown > 0)) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const note = (frequency, duration, start, volume = .15) => scheduleWhistleNote(frequency, duration, volume, start);
      note(659.25,.5,0); note(783.99,.5,.5); note(880,1,1,.16); note(783.99,.5,2); note(659.25,.5,2.5); note(587.33,1,3,.14);
      note(659.25,.5,4.5); note(783.99,.5,5); note(987.77,1,5.5,.16); note(880,.5,6.5); note(783.99,.5,7); note(659.25,1,7.5,.145);
      whistleCooldown = 8.5;
    } catch (_) {}
  }

  function showToast(message, duration = 2.4) {
    dom.toast.textContent = message;
    dom.toast.classList.add("visible");
    toastTimer = duration;
  }

  function selected() { return WEAPONS[selectedWeapon]; }
  function unlockedWeapons() { return WEAPONS.filter(w => save.unlocked.includes(w.id)); }

  function renderWeapons() {
    dom.weaponList.innerHTML = "";
    WEAPONS.forEach(weapon => {
      const chip = document.createElement("span");
      chip.className = `weapon-chip${save.unlocked.includes(weapon.id) ? " unlocked" : ""}`;
      chip.textContent = weapon.name;
      dom.weaponList.appendChild(chip);
    });
  }

  function updateMenu() {
    dom.menuBest.textContent = save.bestScore;
    dom.menuWave.textContent = save.highestWave;
    dom.menuCoins.textContent = save.coins;
    renderWeapons();
  }

  function updateHud() {
    dom.wave.textContent = wave;
    dom.score.textContent = score;
    dom.kills.textContent = kills;
    dom.coins.textContent = save.coins;
    dom.best.textContent = Math.max(save.bestScore, score);
    dom.weapon.textContent = selected().name;
    dom.weaponButton.textContent = selected().name;
    dom.health.textContent = Math.max(0, Math.ceil(player?.health || 0));
    dom.healthFill.style.width = `${Math.max(0, player?.health || 0)}%`;
    dom.sound.textContent = save.sound ? "Sound: On" : "Sound: Off";
    dom.sound.setAttribute("aria-pressed", String(save.sound));
    const whistleLabel = whistleCooldown > 0 ? `${Math.ceil(whistleCooldown)}s` : "Whistle";
    dom.whistle.textContent = whistleLabel;
    dom.whistle.disabled = whistleCooldown > 0;
    dom.whistleToolbar.textContent = whistleCooldown > 0 ? `Whistle ${Math.ceil(whistleCooldown)}s` : "Whistle (G)";
    dom.whistleToolbar.disabled = whistleCooldown > 0;
  }

  function unlock(id, message) {
    if (save.unlocked.includes(id)) return;
    save.unlocked.push(id);
    writeSave();
    renderWeapons();
    showToast(`Weapon unlocked: ${message}`, 3.2);
    sound(760, .18, "triangle");
  }

  function checkUnlocks() {
    if (save.totalKills >= 25) unlock("stick", "Stick");
    if (save.coins >= 75) unlock("slingshot", "Slingshot");
    if (wave > 5) unlock("boomerang", "Boomerang");
    if (wave > 10) unlock("rope", "Energy Rope");
  }

  function resetGame() {
    player = { x: W / 2 - 14, y: FLOOR - 56, w: 28, h: 56, vx: 0, vy: 0, grounded: true, coyote: .1, facing: 1, health: 100, invulnerable: 0, attackCooldown: 0, runTime: 0 };
    enemies = []; projectiles = []; coins = []; effects = [];
    wave = 1; score = 0; kills = 0; betweenWave = 0; traveling = false; worldOffset = 0; whistleCooldown = 0; selectedWeapon = 0;
    running = true; paused = false; gameOver = false;
    dom.startOverlay.classList.remove("visible"); dom.pauseOverlay.classList.remove("visible"); dom.gameOverOverlay.classList.remove("visible");
    document.body.classList.add("playing");
    spawnWave(); updateHud(); canvas.focus();
  }

  function spawnWave() {
    const count = Math.min(14, 2 + Math.ceil(wave * 1.25));
    for (let i = 0; i < count; i += 1) {
      const ranged = wave >= 3 && i % Math.max(2, 6 - Math.floor(wave / 3)) === 0;
      const side = i % 2 ? -1 : 1;
      const health = 2 + Math.floor((wave - 1) / 3) + (ranged ? 0 : Math.floor(wave / 7));
      enemies.push({ x: side < 0 ? -50 - i * 26 : W + 22 + i * 26, y: FLOOR - 56, w: 28, h: 56, vx: 0, vy: 0, grounded: true, facing: -side, health, maxHealth: health, speed: 72 + wave * 5 + (ranged ? 3 : 0), damage: 7 + Math.floor(wave / 3), type: ranged ? "ranged" : "fighter", attackTimer: .5 + i * .13, stun: 0, knockback: 0, flash: 0, id: `${wave}-${i}` });
    }
    showToast(`Wave ${wave} — ${count} challengers`, 2.1);
    sound(330 + wave * 8, .12, "triangle");
    save.highestWave = Math.max(save.highestWave, wave); writeSave();
  }

  function switchWeapon(direction) {
    const available = unlockedWeapons();
    const current = Math.max(0, available.findIndex(w => w.id === selected().id));
    const nextWeapon = available[(current + direction + available.length) % available.length];
    selectedWeapon = WEAPONS.findIndex(w => w.id === nextWeapon.id);
    updateHud(); showToast(nextWeapon.name, .9); sound(470, .05, "square");
  }

  function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function hitCircle(enemy, x, y, radius) { return x + radius > enemy.x && x - radius < enemy.x + enemy.w && y + radius > enemy.y && y - radius < enemy.y + enemy.h; }

  function damageEnemy(enemy, amount, knockback = 0) {
    if (enemy.health <= 0) return;
    enemy.health -= amount; enemy.flash = .1; enemy.knockback = knockback;
    effects.push({ x: enemy.x + 14, y: enemy.y + 25, life: .22, color: "#ff4f9a" });
    sound(125 + Math.random() * 35, .05, "square");
    if (enemy.health <= 0) {
      kills += 1; save.totalKills += 1;
      const reward = 1 + (wave % 3 === 0 ? 1 : 0);
      score += 100 + wave * 12;
      coins.push({ x: enemy.x + 8, y: enemy.y + 18, w: 16, h: 16, vy: -145, value: reward, life: 12 });
      writeSave(); checkUnlocks();
    }
  }

  function attack() {
    if (!running || paused || gameOver || traveling || player.attackCooldown > 0) return;
    const weapon = selected();
    player.attackCooldown = weapon.cooldown;
    const handX = player.x + player.w / 2 + player.facing * 12;
    const handY = player.y + 30;
    if (weapon.id === "stick") {
      enemies.forEach(enemy => { if (enemy.health > 0 && Math.abs(enemy.x + 14 - handX) < 66 && Math.abs(enemy.y - player.y) < 65 && Math.sign(enemy.x - player.x) === player.facing) damageEnemy(enemy, 2, player.facing * 260); });
      effects.push({ x: handX + player.facing * 28, y: handY, life: .16, color: "#ffd54a", arc: true }); sound(250, .06, "square");
    } else if (weapon.id === "slingshot") {
      projectiles.push({ owner: "player", type: "stone", x: handX, y: handY, vx: player.facing * 520, vy: -22, radius: 5, damage: 2, life: 1.8, hit: new Set() }); sound(620, .06, "triangle");
    } else if (weapon.id === "rope") {
      const targets = enemies.filter(e => e.health > 0 && Math.sign(e.x - player.x) === player.facing && Math.abs(e.x - player.x) < 340).sort((a,b) => Math.abs(a.x-player.x)-Math.abs(b.x-player.x));
      const target = targets[0];
      if (target) { target.stun = 1.5; target.x += (player.x - target.x) * .35; damageEnemy(target, 3, -player.facing * 90); projectiles.push({ owner: "player", type: "rope", x: handX, y: handY, target, life: .22 }); sound(390, .18, "sawtooth"); }
      else showToast("No enemy in rope range", .8);
    } else {
      projectiles.push({ owner: "player", type: weapon.id, x: handX, y: handY, vx: player.facing * (weapon.id === "yoyo" ? 500 : 430), vy: 0, radius: weapon.id === "yoyo" ? 10 : 13, damage: weapon.id === "yoyo" ? 2 : 3, life: weapon.id === "yoyo" ? 1.05 : 1.35, age: 0, returning: false, hitOut: new Set(), hitBack: new Set() });
      sound(weapon.id === "yoyo" ? 510 : 420, .09, "triangle");
    }
  }

  function updatePlayer(dt) {
    const target = (keys.left ? -285 : 0) + (keys.right ? 285 : 0);
    const acceleration = player.grounded ? 2300 : 1350;
    if (target) { player.vx += Math.sign(target - player.vx) * Math.min(Math.abs(target - player.vx), acceleration * dt); player.facing = Math.sign(target); }
    else player.vx *= Math.pow(.001, dt);
    if (keys.jumpQueued) { if (player.grounded || player.coyote > 0) { player.vy = -570; player.grounded = false; player.coyote = 0; sound(300, .08, "triangle"); } keys.jumpQueued = false; }
    player.vy += 1450 * dt; player.x += player.vx * dt; player.y += player.vy * dt;
    player.grounded = false;
    if (player.y + player.h >= FLOOR && player.vy >= 0) { player.y = FLOOR - player.h; player.vy = 0; player.grounded = true; player.coyote = .1; }
    platforms.forEach(platform => { const previousBottom = player.y + player.h - player.vy * dt; if (player.vy >= 0 && previousBottom <= platform.y + 4 && player.x + player.w > platform.x && player.x < platform.x + platform.w && player.y + player.h >= platform.y) { player.y = platform.y - player.h; player.vy = 0; player.grounded = true; player.coyote = .1; } });
    if (!player.grounded) player.coyote = Math.max(0, player.coyote - dt);
    player.x = Math.max(4, Math.min(W - player.w - 4, player.x));
    player.invulnerable = Math.max(0, player.invulnerable - dt); player.attackCooldown = Math.max(0, player.attackCooldown - dt); player.runTime += Math.abs(player.vx) * dt / 52;
    if (keys.attack) attack();
  }

  function updateEnemies(dt) {
    enemies.forEach(enemy => {
      if (enemy.health <= 0) return;
      enemy.flash = Math.max(0, enemy.flash - dt); enemy.attackTimer -= dt; enemy.stun = Math.max(0, enemy.stun - dt);
      const delta = player.x - enemy.x; enemy.facing = Math.sign(delta) || enemy.facing;
      if (enemy.knockback) { enemy.x += enemy.knockback * dt; enemy.knockback *= Math.pow(.02, dt); if (Math.abs(enemy.knockback) < 5) enemy.knockback = 0; }
      else if (enemy.stun <= 0) {
        const desired = enemy.type === "ranged" ? (Math.abs(delta) < 235 ? -enemy.facing : Math.abs(delta) > 365 ? enemy.facing : 0) : enemy.facing;
        enemy.x += desired * enemy.speed * dt;
      }
      enemy.x = Math.max(-5, Math.min(W - enemy.w + 5, enemy.x));
      if (enemy.type === "ranged" && enemy.attackTimer <= 0 && Math.abs(delta) < 520 && enemy.stun <= 0) {
        projectiles.push({ owner: "enemy", type: "bolt", x: enemy.x + 14, y: enemy.y + 25, vx: enemy.facing * (230 + wave * 5), vy: 0, radius: 5, damage: enemy.damage, life: 3 }); enemy.attackTimer = Math.max(.72, 1.65 - wave * .035);
      } else if (enemy.type === "fighter" && enemy.attackTimer <= 0 && overlaps({ x: enemy.x - 8, y: enemy.y, w: enemy.w + 16, h: enemy.h }, player) && enemy.stun <= 0) {
        hurtPlayer(enemy.damage, enemy.facing * 190); enemy.attackTimer = Math.max(.48, .95 - wave * .02);
      }
    });
    enemies = enemies.filter(enemy => enemy.health > 0);
  }

  function hurtPlayer(amount, knockback = 0) {
    if (player.invulnerable > 0 || gameOver) return;
    player.health -= amount; player.vx += knockback; player.vy = -150; player.invulnerable = .7; sound(90, .18, "sawtooth");
    if (player.health <= 0) endGame();
  }

  function updateProjectiles(dt) {
    projectiles.forEach(p => {
      p.life -= dt;
      if (p.type === "rope") return;
      if (p.owner === "enemy") {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (hitCircle(player, p.x, p.y, p.radius)) { hurtPlayer(p.damage, Math.sign(p.vx) * 130); p.life = 0; }
        return;
      }
      if (p.type === "stone") {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt;
        enemies.forEach(enemy => { if (!p.hit.has(enemy.id) && hitCircle(enemy,p.x,p.y,p.radius)) { p.hit.add(enemy.id); damageEnemy(enemy,p.damage,Math.sign(p.vx)*140); p.life=0; } });
        return;
      }
      p.age += dt;
      if (!p.returning && p.age > p.life * .48) p.returning = true;
      if (p.returning) {
        const tx = player.x + 14, ty = player.y + 30, dx = tx - p.x, dy = ty - p.y, length = Math.hypot(dx,dy) || 1;
        p.vx = dx / length * 590; p.vy = dy / length * 590;
        if (length < 18) p.life = 0;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const hitSet = p.returning ? p.hitBack : p.hitOut;
      enemies.forEach(enemy => { if (!hitSet.has(enemy.id) && hitCircle(enemy,p.x,p.y,p.radius)) { hitSet.add(enemy.id); damageEnemy(enemy,p.damage,Math.sign(p.vx)*120); } });
    });
    projectiles = projectiles.filter(p => p.life > 0 && p.x > -100 && p.x < W + 100);
  }

  function updateCoins(dt) {
    coins.forEach(coin => { coin.life -= dt; coin.vy += 700 * dt; coin.y += coin.vy * dt; if (coin.y + coin.h > FLOOR) { coin.y = FLOOR - coin.h; coin.vy = 0; } if (overlaps(player,coin)) { save.coins += coin.value; score += coin.value * 20; coin.life = 0; writeSave(); checkUnlocks(); sound(820,.08,"triangle"); } });
    coins = coins.filter(coin => coin.life > 0);
  }

  function updateTravel(dt) {
    player.facing = 1;
    player.vx = 175;
    player.vy = 0;
    player.y = FLOOR - player.h;
    player.grounded = true;
    player.runTime += 3.35 * dt;
    player.x = Math.min(W * .56, player.x + 72 * dt);
    worldOffset += (W / 3.35) * dt;
    projectiles = [];
  }

  function update(dt) {
    if (!running || paused || gameOver) return;
    whistleCooldown = Math.max(0, whistleCooldown - dt);
    if (traveling) updateTravel(dt);
    else { updatePlayer(dt); updateEnemies(dt); updateProjectiles(dt); }
    updateCoins(dt);
    effects.forEach(effect => effect.life -= dt); effects = effects.filter(effect => effect.life > 0);
    if (!enemies.length && !traveling) {
      traveling = true;
      betweenWave = 3.35;
      keys.attack = false;
      showToast("Path clear — walking to the next arena", 2.8);
      playWhistle(true);
    }
    if (traveling) {
      betweenWave -= dt;
      if (betweenWave <= 0) {
        traveling = false;
        wave += 1;
        score += 250 + wave * 25;
        checkUnlocks();
        player.health = Math.min(100, player.health + 12);
        player.x = W * .38;
        player.vx = 0;
        worldOffset = Math.round(worldOffset / W) * W;
        spawnWave();
      }
    }
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) dom.toast.classList.remove("visible"); }
    updateHud();
  }

  function endGame() {
    gameOver = true; running = false; document.body.classList.remove("playing");
    save.bestScore = Math.max(save.bestScore, score); save.highestWave = Math.max(save.highestWave, wave); writeSave(); updateMenu(); updateHud();
    dom.finalStats.innerHTML = `<span>Score <strong>${score}</strong></span><span>Wave <strong>${wave}</strong></span><span>Kills <strong>${kills}</strong></span><span>Total Coins <strong>${save.coins}</strong></span>`;
    dom.gameOverOverlay.classList.add("visible"); sound(75,.35,"sawtooth");
  }

  function setPaused(value) {
    if (!running || gameOver) return;
    paused = value; dom.pauseOverlay.classList.toggle("visible", paused); dom.pause.textContent = paused ? "Resume" : "Pause";
    if (!paused) canvas.focus();
  }

  function drawPalm(x, ground, scale = 1) {
    ctx.strokeStyle = "rgba(18,28,38,.72)"; ctx.lineWidth = 8 * scale; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, ground); ctx.quadraticCurveTo(x - 8 * scale, ground - 70 * scale, x, ground - 126 * scale); ctx.stroke();
    ctx.lineWidth = 5 * scale;
    for (let i = -2; i <= 2; i += 1) { ctx.beginPath(); ctx.moveTo(x, ground - 126 * scale); ctx.quadraticCurveTo(x + i * 28 * scale, ground - (152 - Math.abs(i) * 8) * scale, x + i * 44 * scale, ground - 112 * scale); ctx.stroke(); }
  }

  function drawScene(sceneNumber, offsetX, time) {
    const scene = ((sceneNumber % 4) + 4) % 4;
    ctx.save(); ctx.translate(offsetX, 0);
    if (scene === 0) {
      ctx.fillStyle = "rgba(255,226,137,.13)"; ctx.beginPath(); ctx.arc(760,105,58,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "rgba(19,28,48,.8)"; ctx.beginPath(); ctx.moveTo(0,420);ctx.lineTo(160,260);ctx.lineTo(300,420);ctx.lineTo(470,245);ctx.lineTo(650,420);ctx.lineTo(820,280);ctx.lineTo(W,420);ctx.closePath();ctx.fill();
      ctx.fillStyle = "rgba(30,43,60,.86)"; ctx.fillRect(90,300,230,170); for(let i=0;i<4;i+=1)ctx.fillRect(75+i*67,280-i%2*18,48,28);
    } else if (scene === 1) {
      ctx.fillStyle = "rgba(22,40,60,.9)"; ctx.fillRect(330,205,300,265); ctx.fillRect(290,250,40,220); ctx.fillRect(630,250,40,220);
      ctx.fillStyle = "rgba(54,229,255,.08)"; for(let y=230;y<430;y+=42)for(let x=355;x<610;x+=48)ctx.fillRect(x,y,25,18);
      ctx.fillStyle = "rgba(7,13,25,.75)"; ctx.beginPath();ctx.moveTo(420,470);ctx.lineTo(420,330);ctx.quadraticCurveTo(480,270,540,330);ctx.lineTo(540,470);ctx.fill(); drawPalm(170,470,.9);drawPalm(790,470,.85);
    } else if (scene === 2) {
      const sun = ctx.createRadialGradient(180,120,5,180,120,85);sun.addColorStop(0,"rgba(255,214,90,.28)");sun.addColorStop(1,"rgba(255,214,90,0)");ctx.fillStyle=sun;ctx.fillRect(80,20,200,200);
      ctx.fillStyle="rgba(31,43,54,.88)";for(let i=0;i<5;i+=1)ctx.fillRect(565+i*17,350-i*42,230-i*34,120+i*42);
      ctx.fillStyle="rgba(65,48,40,.35)";ctx.beginPath();ctx.moveTo(0,430);ctx.quadraticCurveTo(180,330,360,430);ctx.quadraticCurveTo(570,340,760,430);ctx.lineTo(W,380);ctx.lineTo(W,470);ctx.lineTo(0,470);ctx.fill();
    } else {
      ctx.fillStyle="rgba(26,58,74,.6)";ctx.fillRect(0,410,W,60);ctx.strokeStyle="rgba(54,229,255,.18)";ctx.lineWidth=2;for(let i=0;i<8;i+=1){ctx.beginPath();ctx.moveTo(i*140-Math.sin(time)*12,430+i%2*9);ctx.quadraticCurveTo(i*140+45,415,i*140+95,435);ctx.stroke()}
      ctx.fillStyle="rgba(39,48,52,.86)";for(let i=0;i<5;i+=1){const x=100+i*180;ctx.fillRect(x,310+(i%2)*35,95,160);ctx.strokeStyle="rgba(255,213,74,.13)";ctx.strokeRect(x+16,335+(i%2)*35,62,58)}drawPalm(55,470,.65);drawPalm(900,470,.7);
    }
    ctx.fillStyle="rgba(255,255,255,.035)";ctx.font="900 70px Orbitron";ctx.textAlign="center";ctx.fillText("Y",W/2,175+Math.sin(time)*2);
    ctx.restore();
  }

  function drawArena(time) {
    const scenePosition = worldOffset / W;
    const sceneNumber = Math.floor(scenePosition);
    const slide = (scenePosition - sceneNumber) * W;
    const gradient = ctx.createLinearGradient(0,0,0,H); gradient.addColorStop(0,"#18254a"); gradient.addColorStop(.68,"#14172a"); gradient.addColorStop(1,"#090d18"); ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
    drawScene(sceneNumber,-slide,time); drawScene(sceneNumber+1,W-slide,time);
    ctx.fillStyle="rgba(22,29,45,.88)";ctx.fillRect(0,FLOOR,W,H-FLOOR);ctx.fillStyle="#36e5ff";ctx.fillRect(0,FLOOR,W,3);
    const platformShift = traveling ? slide : 0;
    platforms.forEach(p=>{for(let copy=0;copy<2;copy+=1){const x=p.x-platformShift+copy*W;ctx.fillStyle="#243a58";ctx.fillRect(x,p.y,p.w,p.h);ctx.fillStyle="#36e5ff";ctx.fillRect(x,p.y,p.w,3)}});
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

  function drawEnemy(enemy, time) {
    const swing = Math.sin(time*6+enemy.x*.02)*7;ctx.save();ctx.translate(enemy.x+14,enemy.y);ctx.globalAlpha=enemy.stun>0?.65:1;ctx.strokeStyle=enemy.flash>0?"#fff":"#ff4f9a";ctx.lineWidth=5;ctx.lineCap="round";ctx.beginPath();ctx.arc(0,10,9,0,Math.PI*2);ctx.moveTo(0,19);ctx.lineTo(0,39);ctx.moveTo(0,26);ctx.lineTo(-11,35);ctx.moveTo(0,26);ctx.lineTo(11,35);ctx.moveTo(0,39);ctx.lineTo(-8+swing,55);ctx.moveTo(0,39);ctx.lineTo(8-swing,55);ctx.stroke();if(enemy.type==="ranged"){ctx.fillStyle="#ffd54a";ctx.fillRect(enemy.facing>0?10:-19,25,9,5)}ctx.restore();ctx.fillStyle="rgba(0,0,0,.55)";ctx.fillRect(enemy.x-2,enemy.y-8,32,4);ctx.fillStyle=enemy.type==="ranged"?"#ffd54a":"#ff4f9a";ctx.fillRect(enemy.x-2,enemy.y-8,32*Math.max(0,enemy.health/enemy.maxHealth),4);
  }

  function drawProjectile(p) {
    if(p.type==="rope"){if(!p.target||p.target.health<=0)return;ctx.strokeStyle="#36e5ff";ctx.lineWidth=3;ctx.shadowColor="#36e5ff";ctx.shadowBlur=12;ctx.beginPath();ctx.moveTo(player.x+14,player.y+30);ctx.lineTo(p.target.x+14,p.target.y+28);ctx.stroke();ctx.shadowBlur=0;return}ctx.fillStyle=p.owner==="enemy"?"#ff4f9a":p.type==="stone"?"#ffd54a":"#36e5ff";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;if(p.owner==="player"&&(p.type==="yoyo"||p.type==="boomerang")){ctx.strokeStyle="rgba(240,250,255,.65)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(player.x+14,player.y+30);ctx.lineTo(p.x,p.y);ctx.stroke()}
  }

  function drawCoin(coin,time){ctx.fillStyle="#ffd54a";ctx.shadowColor="#ffd54a";ctx.shadowBlur=10;ctx.beginPath();ctx.arc(coin.x+8,coin.y+8,7+Math.sin(time*7+coin.x)*1.2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
  function drawEffect(effect){ctx.globalAlpha=Math.max(0,effect.life/.22);ctx.strokeStyle=effect.color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(effect.x,effect.y,(.22-effect.life)*75,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
  function draw(time){drawArena(time);coins.forEach(c=>drawCoin(c,time));projectiles.forEach(drawProjectile);enemies.forEach(e=>drawEnemy(e,time));effects.forEach(drawEffect);drawPlayer();ctx.fillStyle="rgba(234,244,255,.8)";ctx.font="900 9px Orbitron";ctx.textAlign="center";ctx.fillText("TAMER",player.x+14,player.y-12);if(traveling){ctx.fillStyle="rgba(255,255,255,.9)";ctx.font="900 21px Orbitron";ctx.fillText(`WAVE ${wave} CLEARED`,W/2,72);ctx.fillStyle="rgba(184,255,87,.82)";ctx.font="800 12px Inter";ctx.fillText("THE NEXT FIGHT WAITS AHEAD",W/2,94)}}

  function loop(timestamp){const time=timestamp/1000;const dt=Math.min(.033,(timestamp-lastTime)/1000||0);lastTime=timestamp;update(dt);draw(time);requestAnimationFrame(loop)}

  function bindHold(button,key){let pointer=null;const press=e=>{e.preventDefault();if(pointer!==null)return;pointer=e.pointerId;button.setPointerCapture?.(e.pointerId);button.classList.add("active");if(key==="jump")keys.jumpQueued=true;else keys[key]=true};const release=e=>{if(e.pointerId!==pointer)return;e.preventDefault();pointer=null;button.classList.remove("active");if(key!=="jump")keys[key]=false};button.addEventListener("pointerdown",press);button.addEventListener("pointerup",release);button.addEventListener("pointercancel",release);button.addEventListener("lostpointercapture",release)}
  function bindTap(button,action){const press=e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);button.classList.add("active");action();canvas.focus()};const release=e=>{e.preventDefault();button.classList.remove("active")};button.addEventListener("pointerdown",press);button.addEventListener("pointerup",release);button.addEventListener("pointercancel",release);button.addEventListener("lostpointercapture",release)}

  async function toggleFullscreen(){const active=document.fullscreenElement||document.webkitFullscreenElement;try{if(active){const exit=document.exitFullscreen||document.webkitExitFullscreen;if(exit)await exit.call(document)}else{const target=document.querySelector(".arena-card");const enter=target.requestFullscreen||target.webkitRequestFullscreen;if(enter)await enter.call(target);else showToast("Rotate sideways for full-screen play",3)}}catch(_){showToast("Rotate sideways for full-screen play",3)}}
  function updateFullscreen(){const active=document.fullscreenElement||document.webkitFullscreenElement;dom.fullscreen.textContent=active?"Exit Fullscreen":"⛶ Fullscreen"}

  window.addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight","ArrowUp","Space","KeyA","KeyD","KeyW","KeyJ","KeyQ","KeyE","KeyG"].includes(e.code))e.preventDefault();if(["ArrowLeft","KeyA"].includes(e.code))keys.left=true;if(["ArrowRight","KeyD"].includes(e.code))keys.right=true;if(["ArrowUp","KeyW","Space"].includes(e.code)&&!e.repeat)keys.jumpQueued=true;if(e.code==="KeyJ")keys.attack=true;if(e.code==="KeyQ"&&!e.repeat)switchWeapon(-1);if(e.code==="KeyE"&&!e.repeat)switchWeapon(1);if(e.code==="KeyG"&&!e.repeat)playWhistle();if(e.code==="KeyP"&&!e.repeat)setPaused(!paused)});
  window.addEventListener("keyup",e=>{if(["ArrowLeft","KeyA"].includes(e.code))keys.left=false;if(["ArrowRight","KeyD"].includes(e.code))keys.right=false;if(e.code==="KeyJ")keys.attack=false});
  window.addEventListener("blur",()=>{keys.left=keys.right=keys.attack=false;if(running&&!gameOver)setPaused(true)});
  canvas.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"){e.preventDefault();keys.attack=true;attack()}});window.addEventListener("pointerup",e=>{if(e.pointerType==="mouse")keys.attack=false});
  bindHold(document.getElementById("leftButton"),"left");bindHold(document.getElementById("rightButton"),"right");bindHold(document.getElementById("jumpButton"),"jump");bindHold(dom.attack,"attack");bindTap(dom.previous,()=>switchWeapon(-1));bindTap(dom.next,()=>switchWeapon(1));bindTap(dom.weaponButton,()=>switchWeapon(1));bindTap(dom.whistle,()=>playWhistle());
  ["touchstart","touchmove"].forEach(type=>dom.mobileControls.addEventListener(type,e=>e.preventDefault(),{passive:false}));
  dom.start.addEventListener("click",resetGame);dom.playAgain.addEventListener("click",resetGame);dom.restart.addEventListener("click",resetGame);dom.pause.addEventListener("click",()=>setPaused(!paused));dom.resume.addEventListener("click",()=>setPaused(false));dom.mobilePause.addEventListener("click",()=>setPaused(true));dom.fullscreen.addEventListener("click",toggleFullscreen);dom.whistleToolbar.addEventListener("click",()=>playWhistle());document.addEventListener("fullscreenchange",updateFullscreen);document.addEventListener("webkitfullscreenchange",updateFullscreen);
  dom.sound.addEventListener("click",()=>{save.sound=!save.sound;writeSave();if(!save.sound)whistleBus=null;updateHud();if(save.sound)sound(520,.07,"triangle")});
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&running&&!gameOver)setPaused(true)});window.addEventListener("beforeunload",writeSave);

  player={x:W/2-14,y:FLOOR-56,w:28,h:56,vx:0,vy:0,grounded:true,coyote:.1,facing:1,health:100,invulnerable:0,attackCooldown:0,runTime:0};
  updateMenu();updateHud();requestAnimationFrame(loop);
})();
