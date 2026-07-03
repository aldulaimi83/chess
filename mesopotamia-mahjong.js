(() => {
  'use strict';

  const STORAGE_KEY = 'youooo_mesopotamia_mahjong_v1';
  const TILE_TYPES = [
    { id:'lion', name:'Lion', symbol:'𒌋', mark:'L' },
    { id:'lamassu', name:'Lamassu', symbol:'𒀭', mark:'B' },
    { id:'ziggurat', name:'Ziggurat', symbol:'𒉺', mark:'Z' },
    { id:'tablet', name:'Tablet', symbol:'𒁹', mark:'T' },
    { id:'sun', name:'Sun', symbol:'☀', mark:'S' },
    { id:'moon', name:'Moon', symbol:'☾', mark:'M' },
    { id:'palm', name:'Palm', symbol:'𐀀', mark:'P' },
    { id:'boat', name:'Boat', symbol:'𒄩', mark:'O' },
    { id:'eagle', name:'Eagle', symbol:'𒅎', mark:'E' },
    { id:'bull', name:'Bull', symbol:'𒄞', mark:'U' },
    { id:'crown', name:'Crown', symbol:'𒈗', mark:'K' },
    { id:'gate', name:'Gate', symbol:'𒆍', mark:'G' },
    { id:'wheat', name:'Wheat', symbol:'𒊺', mark:'W' },
    { id:'water', name:'Water', symbol:'𒀀', mark:'A' },
    { id:'star', name:'Star', symbol:'✦', mark:'R' },
    { id:'artifact', name:'Artifact', symbol:'𒆠', mark:'F' }
  ];

  const els = {
    board: document.getElementById('mahjongBoard'),
    toast: document.getElementById('toast'),
    modeLabel: document.getElementById('modeLabel'),
    levelLabel: document.getElementById('levelLabel'),
    timeLabel: document.getElementById('timeLabel'),
    tilesLabel: document.getElementById('tilesLabel'),
    hintsLabel: document.getElementById('hintsLabel'),
    shuffleLabel: document.getElementById('shuffleLabel'),
    menuOverlay: document.getElementById('menuOverlay'),
    levelOverlay: document.getElementById('levelOverlay'),
    statsOverlay: document.getElementById('statsOverlay'),
    settingsOverlay: document.getElementById('settingsOverlay'),
    victoryOverlay: document.getElementById('victoryOverlay'),
    levelGrid: document.getElementById('levelGrid'),
    statsContent: document.getElementById('statsContent'),
    starRating: document.getElementById('starRating'),
    victoryStats: document.getElementById('victoryStats'),
    soundToggle: document.getElementById('soundToggle'),
    soundSetting: document.getElementById('soundSetting')
  };

  const buttons = {
    play: document.getElementById('playButton'),
    daily: document.getElementById('dailyButton'),
    levelSelect: document.getElementById('levelSelectButton'),
    stats: document.getElementById('statsButton'),
    settings: document.getElementById('settingsButton'),
    menu: document.getElementById('menuButton'),
    restart: document.getElementById('restartButton'),
    hint: document.getElementById('hintButton'),
    shuffle: document.getElementById('shuffleButton'),
    pause: document.getElementById('pauseButton'),
    next: document.getElementById('nextLevelButton'),
    replay: document.getElementById('replayButton'),
    victoryLevels: document.getElementById('victoryLevelsButton'),
    victoryMenu: document.getElementById('victoryMenuButton'),
    resetProgress: document.getElementById('resetProgressButton'),
    mobileHint: document.getElementById('mobileHint'),
    mobileShuffle: document.getElementById('mobileShuffle'),
    mobileRestart: document.getElementById('mobileRestart'),
    mobileMenu: document.getElementById('mobileMenu')
  };

  const layoutFactories = [
    ['Ur Ziggurat', makeZiggurat],
    ['Babylon Gate', makeGate],
    ['Assyrian Wings', makeWings],
    ['Tigris Flow', makeRiver],
    ['Tablet Stack', makeTablet],
    ['Palm Oasis', makeOasis],
    ['King Seal', makeSeal],
    ['Crescent Shrine', makeCrescent],
    ['Lion Road', makeRoad],
    ['Hanging Gardens', makeGardens]
  ];

  const levels = Array.from({ length:50 }, (_, index) => {
    const [name, factory] = layoutFactories[index % layoutFactories.length];
    const tier = Math.floor(index / layoutFactories.length);
    return {
      number:index + 1,
      name,
      seed: 7300 + index * 97,
      coords: factory(tier),
      hints: Math.max(1, 4 - Math.floor(index / 13)),
      shuffles: Math.max(1, 3 - Math.floor(index / 18)),
      target: 110 + tier * 35 + (index % 10) * 9
    };
  });

  let save = loadSave();
  let audio = { ctx:null, muted:!save.sound };
  let state = createEmptyState();
  let timerId = 0;
  let toastId = 0;

  function createEmptyState() {
    return {
      mode:'campaign',
      levelIndex:0,
      level:null,
      tiles:[],
      selected:null,
      startedAt:0,
      elapsed:0,
      paused:false,
      hintsLeft:3,
      shufflesLeft:2,
      hintsUsed:0,
      shufflesUsed:0,
      matches:0,
      dailyKey:'',
      completed:false
    };
  }

  function loadSave() {
    const fallback = {
      unlocked:1,
      stars:{},
      bestTimes:{},
      daily:{},
      stats:{ levelsCompleted:0, totalMatches:0, totalPlayTime:0, gamesWon:0 },
      sound:true
    };
    try {
      return { ...fallback, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) };
    } catch (error) {
      return fallback;
    }
  }

  function writeSave() {
    save.sound = !audio.muted;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function shuffleList(list, seed) {
    const random = seededRandom(seed);
    const result = [...list];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function keyOf(pos) {
    return `${pos.x},${pos.y},${pos.z}`;
  }

  function normalizeCoords(coords) {
    const unique = new Map();
    coords.forEach((pos) => unique.set(keyOf(pos), { x:pos.x, y:pos.y, z:pos.z }));
    const list = [...unique.values()];
    if (list.length % 2) list.pop();
    return list.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  }

  function isPositionFree(pos, active) {
    const uncovered = !active.has(`${pos.x},${pos.y},${pos.z + 1}`);
    if (!uncovered) return false;
    const leftBlocked = active.has(`${pos.x - 1},${pos.y},${pos.z}`);
    const rightBlocked = active.has(`${pos.x + 1},${pos.y},${pos.z}`);
    return !leftBlocked || !rightBlocked;
  }

  function buildSolvableTiles(level, dailySeed = 0) {
    const coords = normalizeCoords(level.coords);
    const byKey = new Map(coords.map((pos) => [keyOf(pos), pos]));
    let pairs = null;

    for (let attempt = 0; attempt < 120 && !pairs; attempt++) {
      const active = new Set(byKey.keys());
      const candidatePairs = [];
      const random = seededRandom(level.seed + dailySeed + attempt * 1009);

      while (active.size > 0) {
        const free = [...active]
          .map((key) => byKey.get(key))
          .filter((pos) => isPositionFree(pos, active));
        if (free.length < 2) {
          candidatePairs.length = 0;
          break;
        }
        const orderedFree = shuffleList(free, Math.floor(random() * 1000000));
        const first = orderedFree[0];
        const second = orderedFree[orderedFree.length - 1];
        active.delete(keyOf(first));
        active.delete(keyOf(second));
        candidatePairs.push([first, second]);
      }
      if (candidatePairs.length && candidatePairs.length * 2 === coords.length) {
        pairs = candidatePairs;
      }
    }

    if (!pairs) pairs = makeSimplePairOrder(coords);

    const symbolOrder = shuffleList(TILE_TYPES, level.seed + dailySeed + 31);
    const tiles = [];
    pairs.forEach((pair, pairIndex) => {
      const type = symbolOrder[pairIndex % symbolOrder.length];
      pair.forEach((pos, half) => {
        tiles.push({
          id:`${level.number}-${pairIndex}-${half}-${pos.x}-${pos.y}-${pos.z}`,
          x:pos.x,
          y:pos.y,
          z:pos.z,
          type:type.id,
          name:type.name,
          symbol:type.symbol,
          mark:type.mark,
          removed:false,
          hinted:false
        });
      });
    });
    return tiles.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  }

  function makeSimplePairOrder(coords) {
    const ordered = [...coords].sort((a, b) => b.z - a.z || a.y - b.y || a.x - b.x);
    const pairs = [];
    while (ordered.length >= 2) pairs.push([ordered.shift(), ordered.pop()]);
    return pairs;
  }

  function startCampaign(index = save.unlocked - 1) {
    const safeIndex = Math.max(0, Math.min(index, levels.length - 1));
    startLevel('campaign', safeIndex);
  }

  function startDaily() {
    const today = new Date();
    const key = today.toISOString().slice(0, 10);
    const daySeed = Number(key.replaceAll('-', ''));
    const base = {
      ...levels[daySeed % levels.length],
      number:'Daily',
      name:'Daily Ziggurat',
      seed:daySeed,
      coords:layoutFactories[daySeed % layoutFactories.length][1](3),
      hints:3,
      shuffles:2,
      target:210
    };
    state = createEmptyState();
    state.mode = 'daily';
    state.dailyKey = key;
    state.level = base;
    state.levelIndex = -1;
    state.tiles = buildSolvableTiles(base, 19);
    beginPreparedLevel();
  }

  function startLevel(mode, index) {
    state = createEmptyState();
    state.mode = mode;
    state.levelIndex = index;
    state.level = levels[index];
    state.tiles = buildSolvableTiles(state.level);
    beginPreparedLevel();
  }

  function beginPreparedLevel() {
    state.hintsLeft = state.level.hints;
    state.shufflesLeft = state.level.shuffles;
    state.startedAt = Date.now();
    state.elapsed = 0;
    state.selected = null;
    state.matches = 0;
    state.completed = false;
    hideAllOverlays();
    renderBoard();
    updateHud();
    startTimer();
    playClick();
    showToast(`${state.level.name} begins`);
  }

  function startTimer() {
    clearInterval(timerId);
    timerId = setInterval(() => {
      if (!state.paused && state.startedAt && !state.completed) {
        state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
        els.timeLabel.textContent = formatTime(state.elapsed);
      }
    }, 250);
  }

  function updateHud() {
    els.modeLabel.textContent = state.mode === 'daily' ? 'Daily' : 'Campaign';
    els.levelLabel.textContent = state.mode === 'daily' ? 'Daily' : String(state.levelIndex + 1);
    els.timeLabel.textContent = formatTime(state.elapsed);
    els.tilesLabel.textContent = String(activeTiles().length);
    els.hintsLabel.textContent = String(state.hintsLeft);
    els.shuffleLabel.textContent = String(state.shufflesLeft);
    buttons.hint.disabled = buttons.mobileHint.disabled = state.hintsLeft <= 0;
    buttons.shuffle.disabled = buttons.mobileShuffle.disabled = state.shufflesLeft <= 0;
  }

  function activeTiles() {
    return state.tiles.filter((tile) => !tile.removed);
  }

  function isTileFree(tile) {
    const active = new Set(activeTiles().map((item) => keyOf(item)));
    return isPositionFree(tile, active);
  }

  function renderBoard() {
    const active = activeTiles();
    els.board.innerHTML = '';
    if (!active.length) return;

    const minX = Math.min(...state.tiles.map((tile) => tile.x));
    const maxX = Math.max(...state.tiles.map((tile) => tile.x));
    const minY = Math.min(...state.tiles.map((tile) => tile.y));
    const maxY = Math.max(...state.tiles.map((tile) => tile.y));
    const maxZ = Math.max(...state.tiles.map((tile) => tile.z));
    const tileW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile-w')) || 72;
    const tileH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile-h')) || 92;
    const stepX = tileW * .82;
    const stepY = tileH * .76;
    const depth = 9;
    const width = (maxX - minX + 1) * stepX + tileW + maxZ * depth + 18;
    const height = (maxY - minY + 1) * stepY + tileH + maxZ * depth + 18;
    els.board.style.width = `${width}px`;
    els.board.style.height = `${height}px`;
    els.board.style.transformOrigin = 'center top';
    els.board.style.position = 'relative';
    els.board.style.left = 'auto';
    els.board.style.top = 'auto';
    els.board.style.transform = 'none';

    const isPhone = window.matchMedia('(max-width: 820px)').matches;
    if (isPhone) {
      const frame = els.board.parentElement;
      const frameWidth = frame?.clientWidth || window.innerWidth;
      const frameHeight = frame?.clientHeight || window.innerHeight;
      const fitWidth = Math.max(240, frameWidth - 8);
      const fitHeight = Math.max(260, frameHeight - 8);
      const scale = Math.min(fitWidth / width, fitHeight / height, 1);
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      const offsetX = Math.max(0, (fitWidth - scaledWidth) / 2);
      const offsetY = Math.max(0, (fitHeight - scaledHeight) / 2);
      els.board.style.position = 'absolute';
      els.board.style.left = `${offsetX}px`;
      els.board.style.top = `${offsetY}px`;
      els.board.style.transformOrigin = 'top left';
      els.board.style.transform = `scale(${scale})`;
    }

    state.tiles.forEach((tile) => {
      if (tile.removed) return;
      const free = isTileFree(tile);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `tile ${free ? 'free' : 'blocked'} ${state.selected?.id === tile.id ? 'selected' : ''} ${tile.hinted ? 'hinted' : ''}`;
      button.dataset.id = tile.id;
      button.style.setProperty('--tx', `${(tile.x - minX) * stepX + tile.z * depth}px`);
      button.style.setProperty('--ty', `${(tile.y - minY) * stepY - tile.z * depth}px`);
      button.style.zIndex = String(tile.y * 20 + tile.x + tile.z * 100);
      button.setAttribute('aria-label', `${tile.name} tile ${free ? 'free' : 'blocked'}`);
      button.innerHTML = `<span class="tile-symbol">${tile.symbol}</span><span class="tile-mark">${tile.mark}</span><span class="tile-name">${tile.name}</span>`;
      button.addEventListener('click', () => selectTile(tile.id));
      els.board.appendChild(button);
    });
    updateHud();
  }

  function selectTile(id) {
    const tile = state.tiles.find((item) => item.id === id);
    if (!tile || tile.removed || state.paused || state.completed) return;
    clearHints();
    if (!isTileFree(tile)) {
      showToast('This tablet is blocked');
      playClick(120);
      renderBoard();
      return;
    }
    if (!state.selected) {
      state.selected = tile;
      playClick(220);
      renderBoard();
      return;
    }
    if (state.selected.id === tile.id) {
      state.selected = null;
      renderBoard();
      return;
    }
    if (state.selected.type === tile.type) {
      removePair(state.selected, tile);
    } else {
      state.selected = tile;
      showToast('Find the matching symbol');
      playClick(150);
      renderBoard();
    }
  }

  function removePair(first, second) {
    first.removed = true;
    second.removed = true;
    state.selected = null;
    state.matches += 1;
    save.stats.totalMatches += 1;
    emitDust(first);
    emitDust(second);
    playMatch();
    setTimeout(() => {
      renderBoard();
      const remaining = activeTiles();
      if (!remaining.length) {
        completeLevel();
      } else if (!findMatch()) {
        showToast('No open matches. Use shuffle.');
      }
    }, 180);
  }

  function emitDust(tile) {
    const button = els.board.querySelector(`[data-id="${CSS.escape(tile.id)}"]`);
    if (button) button.classList.add('removing');
    const rect = button?.getBoundingClientRect();
    const boardRect = els.board.getBoundingClientRect();
    const cx = rect ? rect.left - boardRect.left + rect.width / 2 : 0;
    const cy = rect ? rect.top - boardRect.top + rect.height / 2 : 0;
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('i');
      p.className = 'particle';
      p.style.left = `${cx}px`;
      p.style.top = `${cy}px`;
      p.style.setProperty('--px', `${Math.cos(i) * (22 + i * 2)}px`);
      p.style.setProperty('--py', `${Math.sin(i * 1.7) * (20 + i)}px`);
      els.board.appendChild(p);
      setTimeout(() => p.remove(), 560);
    }
  }

  function findMatch() {
    const free = activeTiles().filter((tile) => isTileFree(tile));
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        if (free[i].type === free[j].type) return [free[i], free[j]];
      }
    }
    return null;
  }

  function useHint() {
    if (state.hintsLeft <= 0 || state.completed) return;
    const pair = findMatch();
    if (!pair) {
      showToast('No open pair. Shuffle the board.');
      return;
    }
    clearHints();
    pair.forEach((tile) => { tile.hinted = true; });
    state.hintsLeft -= 1;
    state.hintsUsed += 1;
    playClick(420);
    renderBoard();
    showToast('Matching tablets highlighted');
    setTimeout(() => {
      clearHints();
      renderBoard();
    }, 1600);
  }

  function clearHints() {
    state.tiles.forEach((tile) => { tile.hinted = false; });
  }

  function shuffleRemaining() {
    if (state.shufflesLeft <= 0 || state.completed) return;
    const remaining = activeTiles();
    const types = shuffleList(remaining.map((tile) => ({
      type:tile.type,
      name:tile.name,
      symbol:tile.symbol,
      mark:tile.mark
    })), state.level.seed + Date.now() % 100000);
    remaining.forEach((tile, index) => Object.assign(tile, types[index]));
    state.selected = null;
    state.shufflesLeft -= 1;
    state.shufflesUsed += 1;
    playShuffle();
    renderBoard();
    showToast('Clay tablets shuffled');
  }

  function completeLevel() {
    state.completed = true;
    state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
    clearInterval(timerId);
    const stars = calculateStars();
    save.stats.gamesWon += 1;
    save.stats.totalPlayTime += state.elapsed;
    if (state.mode === 'campaign') {
      const levelNumber = state.levelIndex + 1;
      save.unlocked = Math.max(save.unlocked, Math.min(levels.length, levelNumber + 1));
      save.stars[levelNumber] = Math.max(save.stars[levelNumber] || 0, stars);
      if (!save.bestTimes[levelNumber] || state.elapsed < save.bestTimes[levelNumber]) {
        save.bestTimes[levelNumber] = state.elapsed;
      }
      save.stats.levelsCompleted = Object.keys(save.stars).length;
    } else {
      const current = save.daily[state.dailyKey] || {};
      save.daily[state.dailyKey] = {
        best: current.best ? Math.min(current.best, state.elapsed) : state.elapsed,
        stars: Math.max(current.stars || 0, stars)
      };
    }
    writeSave();
    playVictory();
    els.starRating.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    els.victoryStats.textContent = `Time ${formatTime(state.elapsed)} · Hints ${state.hintsUsed} · Shuffles ${state.shufflesUsed}`;
    showOverlay(els.victoryOverlay);
    renderLevelGrid();
  }

  function calculateStars() {
    let stars = 3;
    if (state.elapsed > state.level.target) stars -= 1;
    if (state.elapsed > state.level.target * 1.6 || state.hintsUsed > 1 || state.shufflesUsed > 0) stars -= 1;
    return Math.max(1, stars);
  }

  function restartLevel() {
    if (state.mode === 'daily') startDaily();
    else startCampaign(state.levelIndex);
  }

  function togglePause() {
    if (!state.startedAt || state.completed) return;
    state.paused = !state.paused;
    if (state.paused) {
      state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
      showToast('Paused');
    } else {
      state.startedAt = Date.now() - state.elapsed * 1000;
      showToast('Resumed');
    }
  }

  function showToast(message) {
    clearTimeout(toastId);
    els.toast.textContent = message;
    els.toast.classList.add('show');
    toastId = setTimeout(() => els.toast.classList.remove('show'), 1800);
  }

  function showOverlay(overlay) {
    overlay.classList.add('active');
  }

  function hideAllOverlays() {
    document.querySelectorAll('.overlay').forEach((overlay) => overlay.classList.remove('active'));
  }

  function renderLevelGrid() {
    els.levelGrid.innerHTML = '';
    levels.forEach((level, index) => {
      const levelNumber = index + 1;
      const unlocked = levelNumber <= save.unlocked;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `level-card ${unlocked ? '' : 'locked'}`;
      card.disabled = !unlocked;
      const stars = save.stars[levelNumber] || 0;
      const best = save.bestTimes[levelNumber] ? formatTime(save.bestTimes[levelNumber]) : '--:--';
      card.innerHTML = `<strong>${levelNumber}. ${level.name}</strong><span>${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · Best ${best}</span>`;
      card.addEventListener('click', () => startCampaign(index));
      els.levelGrid.appendChild(card);
    });
  }

  function renderStats() {
    const stars = Object.values(save.stars).reduce((total, item) => total + item, 0);
    const dailyWins = Object.keys(save.daily || {}).length;
    els.statsContent.innerHTML = [
      ['Levels completed', save.stats.levelsCompleted || 0],
      ['Campaign stars', `${stars} / ${levels.length * 3}`],
      ['Total matches', save.stats.totalMatches || 0],
      ['Total play time', formatTime(save.stats.totalPlayTime || 0)],
      ['Daily challenges cleared', dailyWins],
      ['Unlocked level', `${save.unlocked} / ${levels.length}`]
    ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('');
  }

  function formatTime(seconds) {
    const value = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(value / 60).toString().padStart(2, '0');
    const secs = (value % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  function initAudio() {
    if (audio.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio.ctx = new Ctx();
  }

  function tone(freq, duration = .12, type = 'sine', gain = .04, delay = 0) {
    if (audio.muted) return;
    initAudio();
    if (!audio.ctx) return;
    const now = audio.ctx.currentTime + delay;
    const osc = audio.ctx.createOscillator();
    const amp = audio.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    amp.gain.setValueAtTime(0, now);
    amp.gain.linearRampToValueAtTime(gain, now + .015);
    amp.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(amp).connect(audio.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + .03);
  }

  function playClick(freq = 260) {
    tone(freq, .04, 'triangle', .022);
    tone(freq * 1.42, .02, 'sine', .012, .012);
  }

  function playMatch() {
    tone(294, .06, 'sine', .03);
    tone(392, .08, 'triangle', .026, .025);
    tone(587, .11, 'sine', .022, .06);
  }

  function playShuffle() {
    tone(180, .05, 'sine', .016);
    tone(247, .06, 'triangle', .014, .05);
    tone(330, .07, 'sine', .012, .1);
  }

  function playVictory() {
    [262, 330, 392, 523].forEach((freq, i) => tone(freq, .13, 'triangle', .028, i * .08));
  }

  function toggleSound(force) {
    audio.muted = typeof force === 'boolean' ? !force : !audio.muted;
    els.soundToggle.textContent = audio.muted ? 'Sound Off' : 'Sound On';
    els.soundSetting.checked = !audio.muted;
    writeSave();
  }

  function bindEvents() {
    buttons.play.addEventListener('click', () => startCampaign(Math.max(0, save.unlocked - 1)));
    buttons.daily.addEventListener('click', startDaily);
    buttons.levelSelect.addEventListener('click', () => { renderLevelGrid(); showOverlay(els.levelOverlay); });
    buttons.stats.addEventListener('click', () => { renderStats(); showOverlay(els.statsOverlay); });
    buttons.settings.addEventListener('click', () => showOverlay(els.settingsOverlay));
    buttons.menu.addEventListener('click', () => showOverlay(els.menuOverlay));
    buttons.restart.addEventListener('click', restartLevel);
    buttons.hint.addEventListener('click', useHint);
    buttons.shuffle.addEventListener('click', shuffleRemaining);
    buttons.pause.addEventListener('click', togglePause);
    buttons.next.addEventListener('click', () => {
      if (state.mode === 'daily') startCampaign(Math.max(0, save.unlocked - 1));
      else startCampaign(Math.min(state.levelIndex + 1, levels.length - 1));
    });
    buttons.replay.addEventListener('click', restartLevel);
    buttons.victoryLevels.addEventListener('click', () => { renderLevelGrid(); showOverlay(els.levelOverlay); });
    buttons.victoryMenu.addEventListener('click', () => showOverlay(els.menuOverlay));
    buttons.mobileHint.addEventListener('click', useHint);
    buttons.mobileShuffle.addEventListener('click', shuffleRemaining);
    buttons.mobileRestart.addEventListener('click', restartLevel);
    buttons.mobileMenu.addEventListener('click', () => showOverlay(els.menuOverlay));
    els.soundToggle.addEventListener('click', () => toggleSound());
    els.soundSetting.addEventListener('change', () => toggleSound(els.soundSetting.checked));
    buttons.resetProgress.addEventListener('click', () => {
      if (!confirm('Reset Mesopotamia Mahjong progress?')) return;
      localStorage.removeItem(STORAGE_KEY);
      save = loadSave();
      toggleSound(save.sound);
      renderLevelGrid();
      renderStats();
      showToast('Progress reset');
    });
    document.querySelectorAll('[data-close]').forEach((button) => {
      button.addEventListener('click', () => document.getElementById(button.dataset.close)?.classList.remove('active'));
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') showOverlay(els.menuOverlay);
      if (event.key.toLowerCase() === 'h') useHint();
      if (event.key.toLowerCase() === 's') shuffleRemaining();
      if (event.key.toLowerCase() === 'r') restartLevel();
      if (event.key.toLowerCase() === 'p') togglePause();
    });
  }

  function rectCoords(width, height, x0 = 0, y0 = 0, z = 0) {
    const coords = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) coords.push({ x:x0 + x, y:y0 + y, z });
    }
    return coords;
  }

  function makeZiggurat(tier) {
    return normalizeCoords([
      ...rectCoords(8 + tier, 4, 0, 2, 0),
      ...rectCoords(6 + tier, 3, 1, 2, 1),
      ...rectCoords(4 + tier, 2, 2, 3, 2),
      ...rectCoords(2 + (tier % 2), 1, 3, 3, 3)
    ]);
  }

  function makeGate(tier) {
    return normalizeCoords([
      ...rectCoords(3, 6, 0, 0, 0),
      ...rectCoords(3, 6, 7, 0, 0),
      ...rectCoords(10, 2, 0, 0, 0),
      ...rectCoords(8, 2, 1, 1, 1),
      ...rectCoords(4 + tier, 1, 3, 2, 2)
    ]);
  }

  function makeWings(tier) {
    const coords = [];
    for (let y = 0; y < 6; y++) {
      const spread = Math.abs(3 - y);
      coords.push(...rectCoords(5 - Math.min(spread, 3), 1, spread, y, 0));
      coords.push(...rectCoords(5 - Math.min(spread, 3), 1, 9 - spread - (5 - Math.min(spread, 3)), y, 0));
    }
    coords.push(...rectCoords(4 + tier, 2, 4, 2, 1), ...rectCoords(2, 2, 5, 2, 2));
    return normalizeCoords(coords);
  }

  function makeRiver(tier) {
    const coords = [];
    for (let y = 0; y < 7; y++) {
      const x = (y % 3) + 1;
      coords.push(...rectCoords(7, 1, x, y, 0));
    }
    coords.push(...rectCoords(5 + tier, 2, 3, 2, 1), ...rectCoords(3, 1, 4, 3, 2));
    return normalizeCoords(coords);
  }

  function makeTablet(tier) {
    return normalizeCoords([
      ...rectCoords(9, 6, 0, 0, 0),
      ...rectCoords(7, 4, 1, 1, 1),
      ...rectCoords(5, 2 + (tier % 2), 2, 2, 2)
    ]);
  }

  function makeOasis(tier) {
    const coords = [
      ...rectCoords(4, 3, 0, 0, 0),
      ...rectCoords(4, 3, 7, 0, 0),
      ...rectCoords(8, 2, 2, 4, 0),
      ...rectCoords(5 + tier, 2, 3, 2, 1),
      ...rectCoords(3, 1, 4, 3, 2)
    ];
    return normalizeCoords(coords);
  }

  function makeSeal(tier) {
    const coords = [];
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 9; x++) {
        if (Math.abs(x - 4) + Math.abs(y - 3) <= 5) coords.push({ x, y, z:0 });
      }
    }
    coords.push(...rectCoords(5 + (tier % 2), 3, 2, 2, 1), ...rectCoords(3, 1, 3, 3, 2));
    return normalizeCoords(coords);
  }

  function makeCrescent(tier) {
    const coords = [];
    for (let y = 0; y < 8; y++) {
      const left = y < 4 ? y : 7 - y;
      coords.push(...rectCoords(3 + left, 1, 0, y, 0));
      if (y > 1 && y < 6) coords.push(...rectCoords(3 + tier, 1, 6, y, 0));
    }
    coords.push(...rectCoords(5, 2, 2, 3, 1), ...rectCoords(2, 1, 3, 3, 2));
    return normalizeCoords(coords);
  }

  function makeRoad(tier) {
    const coords = [];
    for (let y = 0; y < 6; y++) coords.push(...rectCoords(10, 1, 0, y, 0));
    coords.push(...rectCoords(2, 4, 1, 1, 1), ...rectCoords(2, 4, 7, 1, 1), ...rectCoords(2 + tier, 2, 4, 2, 2));
    return normalizeCoords(coords);
  }

  function makeGardens(tier) {
    return normalizeCoords([
      ...rectCoords(10, 2, 0, 5, 0),
      ...rectCoords(8, 2, 1, 3, 0),
      ...rectCoords(6, 2, 2, 1, 0),
      ...rectCoords(4 + tier, 2, 3, 3, 1),
      ...rectCoords(3, 1, 4, 2, 2)
    ]);
  }

  function init() {
    bindEvents();
    renderLevelGrid();
    toggleSound(save.sound);
    els.menuOverlay.classList.add('active');
    state.level = levels[0];
    state.tiles = buildSolvableTiles(levels[0]);
    state.hintsLeft = state.level.hints;
    state.shufflesLeft = state.level.shuffles;
    renderBoard();
    updateHud();
  }

  init();
})();
