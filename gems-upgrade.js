/* ═══════════════════════════════════════════════════════════════
   GEMS CRUSH UPGRADE
   • Special Gems  (4-match → Striped ⚡, 5-match → Color Bomb 💣, L/T → Wrapped 🔥)
   • Score Floaters (+pts pop up from cleared gems)
   • Hint System   (glowing hint after 3 s of inactivity)
   • Drag-to-Swap  (drag instead of click-click)
   • Combo Burst   (big COMBO x3! text on board)
   ═══════════════════════════════════════════════════════════════ */
'use strict';

// ── Special gem parallel array ───────────────────────────
// null | 'stripe-h' | 'stripe-v' | 'bomb' | 'wrap'
window.gemsSpecial = [];

function _gxInitSpecial() {
  window.gemsSpecial = Array.from({length: 8}, () => Array(8).fill(null));
}

// Track last swap so we know WHERE to place a created special gem
window.gemsLastSwap = null;

// ── Hint system state ────────────────────────────────────
let _gxHintTimer   = null;
let _gxHintPos     = null;

function _gxClearHint() {
  clearTimeout(_gxHintTimer);
  _gxHintTimer = null;
  if (_gxHintPos) {
    const c = gemsGetCell(_gxHintPos.r, _gxHintPos.c);
    if (c) c.classList.remove('gem-hint');
    _gxHintPos = null;
  }
}

function _gxStartHintTimer() {
  _gxClearHint();
  _gxHintTimer = setTimeout(() => {
    if (gemsAnimating || gemsWon) return;
    const hint = _gxFindHint();
    if (!hint) return;
    _gxHintPos = hint;
    const c1 = gemsGetCell(hint.r, hint.c);
    const c2 = gemsGetCell(hint.r2, hint.c2);
    if (c1) c1.classList.add('gem-hint');
    if (c2) c2.classList.add('gem-hint');
  }, 3200);
}

function _gxFindHint() {
  const G = 8, dirs = [[0,1],[1,0],[0,-1],[-1,0]];
  for (let r = 0; r < G; r++) {
    for (let c = 0; c < G; c++) {
      for (const [dr,dc] of dirs) {
        const nr = r+dr, nc = c+dc;
        if (nr<0||nr>=G||nc<0||nc>=G) continue;
        [gemsGrid[r][c], gemsGrid[nr][nc]] = [gemsGrid[nr][nc], gemsGrid[r][c]];
        const ok = gemsHasImmediateMatches();
        [gemsGrid[r][c], gemsGrid[nr][nc]] = [gemsGrid[nr][nc], gemsGrid[r][c]];
        if (ok) return {r, c, r2: nr, c2: nc};
      }
    }
  }
  return null;
}

// ── Score floater ────────────────────────────────────────
function _gxShowFloater(text, r, c) {
  const board = document.getElementById('gemsBoard');
  if (!board) return;
  const cell = gemsGetCell(r, c);
  if (!cell) return;
  const bRect = board.getBoundingClientRect();
  const cRect = cell.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'gems-floater';
  el.textContent = text;
  el.style.left = (cRect.left - bRect.left + cRect.width / 2) + 'px';
  el.style.top  = (cRect.top  - bRect.top)  + 'px';
  board.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

// ── Combo burst on board ─────────────────────────────────
function _gxShowComboBurst(n) {
  if (n < 2) return;
  const board = document.getElementById('gemsBoard');
  if (!board) return;
  const el = document.createElement('div');
  el.className = 'gems-combo-burst';
  el.textContent = `COMBO ×${n}!`;
  board.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// ── Wrap gemsBuildGrid ───────────────────────────────────
const _gxOrigBuild = gemsBuildGrid;
window.gemsBuildGrid = function() {
  _gxOrigBuild();
  _gxInitSpecial();
};

// ── Wrap gemsStartLevel to also reset special array ──────
const _gxOrigStartLevel = gemsStartLevel;
window.gemsStartLevel = function(level, resetTotalScore) {
  _gxInitSpecial();
  _gxClearHint();
  window.gemsLastSwap = null;
  _gxOrigStartLevel(level, resetTotalScore);
};

// ── Replace gemsApplyGravity (mirrors to gemsSpecial) ────
window.gemsApplyGravity = function() {
  const G = 8;
  for (let c = 0; c < G; c++) {
    let empty = G - 1;
    for (let r = G - 1; r >= 0; r--) {
      if (gemsGrid[r][c] !== null) {
        gemsGrid[empty][c]          = gemsGrid[r][c];
        window.gemsSpecial[empty][c] = window.gemsSpecial[r] ? window.gemsSpecial[r][c] : null;
        if (empty !== r) {
          gemsGrid[r][c]          = null;
          if (window.gemsSpecial[r]) window.gemsSpecial[r][c] = null;
        }
        empty--;
      }
    }
    while (empty >= 0) {
      gemsGrid[empty][c] = null;
      if (window.gemsSpecial[empty]) window.gemsSpecial[empty][c] = null;
      empty--;
    }
  }
};

// ── Replace gemsFillEmpty (clears special for new gems) ──
window.gemsFillEmpty = function() {
  const G = 8, T = 6;
  for (let r = 0; r < G; r++) {
    for (let c = 0; c < G; c++) {
      if (gemsGrid[r][c] === null) {
        gemsGrid[r][c] = Math.floor(Math.random() * T);
        if (!window.gemsSpecial[r]) window.gemsSpecial[r] = Array(G).fill(null);
        window.gemsSpecial[r][c] = null;
      }
    }
  }
};

// ── Wrap gemsRender to show special gems ─────────────────
const _gxOrigRender = gemsRender;
window.gemsRender = function() {
  _gxOrigRender();
  // Add special gem overlays
  const G = 8;
  for (let r = 0; r < G; r++) {
    for (let c = 0; c < G; c++) {
      const sp = window.gemsSpecial[r] && window.gemsSpecial[r][c];
      if (!sp) continue;
      const cell = gemsGetCell(r, c);
      if (!cell) continue;
      cell.classList.add('gem-special', `gem-sp-${sp}`);
      const icon = document.createElement('span');
      icon.className = 'gem-special-icon';
      icon.textContent = sp === 'stripe-h' ? '⟷' :
                         sp === 'stripe-v' ? '↕' :
                         sp === 'bomb'     ? '●' : '✦';
      cell.appendChild(icon);
    }
  }
  // Restore hint after re-render
  if (_gxHintPos) {
    const c1 = gemsGetCell(_gxHintPos.r,  _gxHintPos.c);
    const c2 = gemsGetCell(_gxHintPos.r2, _gxHintPos.c2);
    if (c1) c1.classList.add('gem-hint');
    if (c2) c2.classList.add('gem-hint');
  }
};

// ── Wrap gemsSwapTiles to track swap position ────────────
const _gxOrigSwap = gemsSwapTiles;
window.gemsSwapTiles = function(r1, c1, r2, c2) {
  window.gemsLastSwap = {r1, c1, r2, c2};
  _gxClearHint();
  _gxOrigSwap(r1, c1, r2, c2);
  _gxStartHintTimer();
};

// ════════════════════════════════════════════════════════
// CORE UPGRADE: Replace gemsClearAndCascade
// ════════════════════════════════════════════════════════
window.gemsClearAndCascade = function() {
  const G = 8;
  let analysis = gemsAnalyzeMatches();

  if (analysis.count === 0) {
    gemsAnimating = false;
    gemsCombo = 1;
    if (!gemsHasPossibleMove()) {
      gemsRewardText = gemsReshuffles > 0
        ? 'No moves left. Use Reshuffle!'
        : 'Board stuck — no reshuffles left.';
      gemsShowToast(gemsReshuffles > 0 ? 'Use reshuffle!' : 'Board stuck!');
      if (gemsReshuffles <= 0) {
        gemsMoves = 0;
        gemsUpdateUI();
        gemsCheckLevelEnd();
        return;
      }
      gemsUpdateUI();
      return;
    }
    gemsUpdateUI();
    gemsCheckLevelEnd();
    return;
  }

  gemsCascadeDepth++;
  gemsCombo = Math.max(1, gemsCascadeDepth);

  // ── Step 1: Collect base clear set ──────────────────────
  const toClear = new Set(analysis.coords.map(({r,c}) => `${r},${c}`));

  // ── Step 2: Expand for any special gems being cleared ───
  const triggered = [];
  analysis.coords.forEach(({r,c}) => {
    const sp = window.gemsSpecial[r] && window.gemsSpecial[r][c];
    if (!sp) return;
    triggered.push({r, c, sp});
    window.gemsSpecial[r][c] = null;

    if (sp === 'stripe-h') {
      for (let cc = 0; cc < G; cc++) toClear.add(`${r},${cc}`);
      gemsShowToast('⚡ STRIPED!');
    } else if (sp === 'stripe-v') {
      for (let rr = 0; rr < G; rr++) toClear.add(`${rr},${c}`);
      gemsShowToast('⚡ STRIPED!');
    } else if (sp === 'bomb') {
      const t = gemsGrid[r][c];
      for (let rr = 0; rr < G; rr++) {
        for (let cc = 0; cc < G; cc++) {
          if (gemsGrid[rr][cc] === t) toClear.add(`${rr},${cc}`);
        }
      }
      gemsShowToast('💣 COLOR BOMB!');
    } else if (sp === 'wrap') {
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          if (Math.abs(dr) + Math.abs(dc) > 2) continue;
          const nr = r+dr, nc = c+dc;
          if (nr >= 0 && nr < G && nc >= 0 && nc < G) toClear.add(`${nr},${nc}`);
        }
      }
      gemsShowToast('🔥 WRAPPED!');
    }
  });

  // ── Step 3: Determine special gems to CREATE ─────────────
  const specialCreate = [];
  analysis.groups.forEach(group => {
    if (group.length < 4) return;
    // Find the swap cell within this group (preferred placement)
    const ls = window.gemsLastSwap;
    const swapInGroup = ls ? group.find(g =>
      (g.r===ls.r1&&g.c===ls.c1) || (g.r===ls.r2&&g.c===ls.c2)
    ) : null;
    const target = swapInGroup || group[Math.floor(group.length/2)];
    const key = `${target.r},${target.c}`;

    let sp;
    if (group.length >= 5) {
      sp = 'bomb';
    } else {
      // 4-match: horizontal or vertical?
      const isH = group.every(g => g.r === group[0].r);
      sp = isH ? 'stripe-h' : 'stripe-v';
    }
    // Only create if not already being cleared by a special bomb
    specialCreate.push({r: target.r, c: target.c, sp, type: gemsGrid[target.r][target.c]});
    toClear.delete(key); // keep this cell — it becomes the special gem
  });

  // ── Step 4: Score ─────────────────────────────────────────
  const clearCount = toClear.size;
  const basePts = clearCount * 14;
  const sizeBonus = analysis.groups.reduce((sum, group) => {
    if (group.length >= 5) return sum + 150 + (group.length - 5) * 40;
    if (group.length === 4) return sum + 60;
    return sum;
  }, 0);
  const specialBonus = triggered.length * 120;
  const cascadeBonus = Math.max(0, gemsCascadeDepth - 1) * 40;
  const multiplier = (gemsCurrentConfig.multiplier || 1)
    + Math.max(0, gemsCascadeDepth - 1) * 0.18;
  const pts = Math.round((basePts + sizeBonus + specialBonus + cascadeBonus) * multiplier);

  gemsScore      += pts;
  gemsLevelScore += pts;
  gemsChargeGiftMeter(analysis);
  gemsAwardPowerProgress(analysis);

  // Reward text + sounds
  if (triggered.length > 0) {
    gemsPlaySound('power');
    gemsRewardText = `💥 Special gem! +${pts} pts`;
  } else if (analysis.largestRun >= 5) {
    gemsRewardText = `Mega ${analysis.largestRun}-gem clear! +${pts} pts`;
    if (!triggered.length) gemsShowToast('💫 MEGA MATCH!');
    gemsPlaySound('cascade');
  } else if (gemsCascadeDepth > 1) {
    gemsRewardText = `Cascade ×${gemsCascadeDepth}! +${pts} pts`;
    gemsPlaySound('cascade');
    _gxShowComboBurst(gemsCascadeDepth);
  } else if (specialCreate.length > 0) {
    const label = specialCreate[0].sp === 'bomb' ? '💣 Color Bomb created!' :
                  specialCreate[0].sp === 'stripe-h' ? '⚡ Striped gem created!' :
                  '⚡ Striped gem created!';
    gemsShowToast(label);
    gemsPlaySound('reward');
    gemsRewardText = `${label} +${pts} pts`;
  } else {
    gemsRewardText = `Match! +${pts} pts`;
  }

  // ── Step 5: Animate pop + clear cells ────────────────────
  const clearCoords = [...toClear].map(s => {
    const [r,c] = s.split(',');
    return {r:+r, c:+c};
  });

  clearCoords.forEach(({r,c}) => {
    const cell = gemsGetCell(r,c);
    if (cell) cell.classList.add('matched');
    gemsGrid[r][c] = null;
    if (window.gemsSpecial[r]) window.gemsSpecial[r][c] = null;
  });

  // Score floater at center of cleared area
  if (clearCoords.length) {
    const mid = clearCoords[Math.floor(clearCoords.length / 2)];
    _gxShowFloater(`+${pts}`, mid.r, mid.c);
  }

  setTimeout(() => {
    gemsApplyGravity();
    gemsFillEmpty();

    // Place newly created special gems
    specialCreate.forEach(({r,c,sp,type}) => {
      gemsGrid[r][c]          = type;
      window.gemsSpecial[r][c] = sp;
    });

    gemsRender();
    setTimeout(() => gemsClearAndCascade(), 290);
  }, 290);
};

// ════════════════════════════════════════════════════════
// DRAG-TO-SWAP on the gems board
// ════════════════════════════════════════════════════════
(function() {
  let dragR = null, dragC = null;
  let dragStartX = 0, dragStartY = 0;
  let dragging = false;
  const THRESHOLD = 14; // px

  function onDragStart(e, r, c) {
    dragR = r; dragC = c; dragging = false;
    const touch = e.touches ? e.touches[0] : e;
    dragStartX = touch.clientX;
    dragStartY = touch.clientY;
  }

  function onDragEnd(e) {
    if (dragR === null) return;
    const touch = e.changedTouches ? e.changedTouches[0] : e;
    const dx = touch.clientX - dragStartX;
    const dy = touch.clientY - dragStartY;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) >= THRESHOLD) {
      dragging = true;
      let dr = 0, dc = 0;
      if (absDx > absDy) dc = dx > 0 ? 1 : -1;
      else               dr = dy > 0 ? 1 : -1;
      const tr = dragR + dr, tc = dragC + dc;
      if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
        // Simulate the two-click swap
        gemsSelected = {r: dragR, c: dragC};
        gemsOnClick(tr, tc);
      }
    }
    dragR = dragC = null; dragging = false;
  }

  // Attach to board after it renders
  document.addEventListener('click', e => {
    if (dragging) { e.stopPropagation(); dragging = false; }
  }, true);

  // Re-attach drag listeners whenever the board re-renders
  const _gxOrigRender2 = window.gemsRender;
  window.gemsRender = function() {
    _gxOrigRender2();
    const board = document.getElementById('gemsBoard');
    if (!board) return;
    board.querySelectorAll('.gem-cell').forEach(cell => {
      const r = +cell.dataset.r, c = +cell.dataset.c;
      cell.addEventListener('mousedown',  e => onDragStart(e, r, c));
      cell.addEventListener('touchstart', e => onDragStart(e, r, c), {passive:true});
      cell.addEventListener('mouseup',    e => onDragEnd(e));
      cell.addEventListener('touchend',   e => onDragEnd(e), {passive:true});
    });
  };
})();

// ── Submit high scores to global leaderboard ─────────────
(function() {
  const _gxOrigUpdateUI = gemsUpdateUI;
  window.gemsUpdateUI = function() {
    _gxOrigUpdateUI();
    // Submit to Firebase leaderboard when a new personal best is set
    if (typeof submitLeaderScore === 'function' && gemsScore > 0 &&
        gemsScore >= (parseInt(localStorage.getItem('gems_last_submitted') || 0))) {
      submitLeaderScore('gems', gemsPlayerName, gemsScore);
      localStorage.setItem('gems_last_submitted', gemsScore);
    }
  };
})();

console.log('✅ Gems Crush upgrade loaded: Special Gems · Floaters · Hints · Drag-to-swap');

// ════════════════════════════════════════════════════════
// GEMS CRUSH POLISH UPGRADE
// ════════════════════════════════════════════════════════
(function() {
  const GEMS_PROGRESS_KEY = 'gems_progress_v2';
  const GEMS_DAILY_KEY = 'gems_daily_v2';
  const GEMS_MAX_UNLOCK = 24;
  const GEMS_DIRS = [[1,0],[-1,0],[0,1],[0,-1]];
  const GEMS_LEVELS = [
    { name:'Candy Meadow', target:500, moves:20, giftGoal:88, multiplier:1.00, objective:'score', goal:'Reach the target score with smooth starter boards.' },
    { name:'Honey Trail', target:860, moves:20, giftGoal:92, multiplier:1.03, objective:'collect', color:0, collectCount:12, goal:'Collect blue gems while keeping the score climbing.' },
    { name:'Jelly Harbor', target:1220, moves:21, giftGoal:96, multiplier:1.06, objective:'stone', stones:4, goal:'Break the stone blockers blocking the center.' },
    { name:'Mint Circuit', target:1700, moves:21, giftGoal:100, multiplier:1.10, objective:'frozen', frozen:6, goal:'Break frozen gems before they freeze the board.' },
    { name:'Caramel Drop', target:2260, moves:22, giftGoal:104, multiplier:1.14, objective:'chest', chests:1, goal:'Drop the treasure chest to the bottom row.' },
    { name:'Sugar Limit', target:2800, moves:18, giftGoal:108, multiplier:1.18, objective:'limited', goal:'Clear the target in a tighter move budget.' },
    { name:'Berry Lock', target:3400, moves:22, giftGoal:112, multiplier:1.22, objective:'locked', locked:6, goal:'Unlock the sealed gems and finish strong.' },
    { name:'Prism Pop', target:4120, moves:23, giftGoal:116, multiplier:1.26, objective:'bomb', bombs:3, goal:'Trigger bomb gems and use the chain reaction.' },
    { name:'Taffy Wall', target:4860, moves:24, giftGoal:120, multiplier:1.30, objective:'stone', stones:6, goal:'Clear stone blockers to open the board.' },
    { name:'Frost Fizz', target:5680, moves:24, giftGoal:124, multiplier:1.34, objective:'collect', color:3, collectCount:16, goal:'Collect gold gems and keep combo tempo high.' },
    { name:'Royal Jelly', target:6620, moves:25, giftGoal:128, multiplier:1.38, objective:'frozen', frozen:8, goal:'Break frozen gems and keep matches flowing.' },
    { name:'Comet Crunch', target:7680, moves:25, giftGoal:132, multiplier:1.42, objective:'chest', chests:2, goal:'Drop both treasure chests to the bottom.' },
    { name:'Aurora Pops', target:8840, moves:26, giftGoal:136, multiplier:1.46, objective:'locked', locked:8, goal:'Open locked gems and score through cascades.' },
    { name:'Meteor Mints', target:10120, moves:26, giftGoal:140, multiplier:1.50, objective:'bomb', bombs:4, goal:'Use bomb gems to clear the clustered center.' },
    { name:'Infinity Candy', target:11520, moves:27, giftGoal:144, multiplier:1.55, objective:'score', goal:'Bigger cascades and smarter swaps are the whole game.' },
    { name:'Starburst Sugar', target:13040, moves:27, giftGoal:148, multiplier:1.60, objective:'stone', stones:8, goal:'Stone blockers now control the board shape.' },
    { name:'Galaxy Gummies', target:14680, moves:28, giftGoal:152, multiplier:1.65, objective:'collect', color:4, collectCount:18, goal:'Collect purple gems while chasing a clean finish.' },
    { name:'Lunar Lollies', target:16440, moves:28, giftGoal:156, multiplier:1.70, objective:'frozen', frozen:10, goal:'Frozen gems cover the center lanes.' },
    { name:'Crown Candy', target:18320, moves:29, giftGoal:160, multiplier:1.75, objective:'chest', chests:2, goal:'Drop the chest and finish with spare moves.' },
    { name:'Sugar Vault', target:20320, moves:30, giftGoal:164, multiplier:1.80, objective:'mixed', stones:6, frozen:6, locked:6, bombs:2, chests:1, goal:'Mixed obstacles and a big score target close the campaign.' },
    { name:'Daily Delight', target:2600, moves:20, giftGoal:100, multiplier:1.10, objective:'daily', goal:'Today’s special challenge board.' }
  ];

  const GEMS_SPECIAL_COLOR_NAMES = ['blue', 'pink', 'green', 'amber', 'purple', 'orange'];
  const GEMS_OBJECTIVE_ICONS = { score:'★', collect:'●', stone:'▣', frozen:'❄', chest:'▣', limited:'⌛', locked:'🔒', bomb:'💣', mixed:'✦', daily:'☀' };

  let gemsProgress = loadProgress();
  let gemsDailySeed = null;
  let gemsLevelState = null;
  let gemsLevelStartMs = 0;
  let gemsPendingDailyReward = false;

  function seededRandom(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function() {
      s = s * 16807 % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function loadProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(GEMS_PROGRESS_KEY) || '{}');
      return {
        unlocked: Math.max(1, Number(parsed.unlocked || 1)),
        stars: parsed.stars && typeof parsed.stars === 'object' ? parsed.stars : {},
        times: parsed.times && typeof parsed.times === 'object' ? parsed.times : {},
        dailyStreak: Math.max(0, Number(parsed.dailyStreak || 0)),
        lastDaily: String(parsed.lastDaily || ''),
        totalMatches: Math.max(0, Number(parsed.totalMatches || 0)),
        totalPlayTime: Math.max(0, Number(parsed.totalPlayTime || 0)),
        chestRewards: Math.max(0, Number(parsed.chestRewards || 0)),
        selectedLevel: Math.max(1, Number(parsed.selectedLevel || 1))
      };
    } catch {
      return { unlocked: 1, stars: {}, times: {}, dailyStreak: 0, lastDaily: '', totalMatches: 0, totalPlayTime: 0, chestRewards: 0, selectedLevel: 1 };
    }
  }

  function saveProgress() {
    localStorage.setItem(GEMS_PROGRESS_KEY, JSON.stringify(gemsProgress));
  }

  function currentDateKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function getDailyConfig() {
    const dateKey = currentDateKey();
    const seed = [...dateKey].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const rand = seededRandom(seed);
    return {
      key: dateKey,
      name: `Daily Challenge`,
      target: 2200 + Math.floor(rand() * 1100),
      moves: 19 + Math.floor(rand() * 3),
      giftGoal: 94 + Math.floor(rand() * 10),
      multiplier: 1.12 + rand() * 0.1,
      objective: 'daily',
      goal: 'Daily challenge board. Keep the streak alive and beat your best time.'
    };
  }

  function getLevelConfig(level) {
    if (level === 999) return getDailyConfig();
    const index = Math.max(1, level) - 1;
    return GEMS_LEVELS[index] || {
      name: `Infinity Candy ${level}`,
      target: 22000 + (level * 1900),
      moves: 30 + Math.min(6, Math.floor(level / 4)),
      giftGoal: 164 + (level * 3),
      multiplier: Math.min(2.3, 1.8 + (level * 0.03)),
      objective: 'score',
      goal: 'Endless challenge with tougher obstacle mixes.'
    };
  }

  window.gemsGetLevelConfig = getLevelConfig;

  function createMatrix(fill = 0) {
    return Array.from({ length: 8 }, () => Array(8).fill(fill));
  }

  function ensureLevelState() {
    if (!gemsLevelState) {
      gemsLevelState = {
        stoneHp: createMatrix(0),
        frozenHp: createMatrix(0),
        lockedHp: createMatrix(0),
        chest: null,
        bomb: createMatrix(0),
        collected: 0,
        objectiveDone: false,
        daily: false,
        scoreStart: 0,
        playTime: 0,
        shake: 0,
        hint: ''
      };
    }
    return gemsLevelState;
  }

  function resetObstacleState() {
    gemsLevelState = {
      stoneHp: createMatrix(0),
      frozenHp: createMatrix(0),
      lockedHp: createMatrix(0),
      chest: null,
      bomb: createMatrix(0),
      collected: 0,
      objectiveDone: false,
      daily: false,
      scoreStart: 0,
      playTime: 0,
      shake: 0,
      hint: ''
    };
  }

  function placeCells(matrix, coords, value = 1) {
    coords.forEach(([r, c]) => {
      if (matrix[r] && typeof matrix[r][c] !== 'undefined') matrix[r][c] = value;
    });
  }

  function chooseCoords(rand, count, banned = []) {
    const picks = [];
    const forbidden = new Set(banned.map(([r, c]) => `${r},${c}`));
    let safety = 0;
    while (picks.length < count && safety < 200) {
      safety += 1;
      const r = Math.floor(rand() * 8);
      const c = Math.floor(rand() * 8);
      if (forbidden.has(`${r},${c}`)) continue;
      if (picks.some(([pr, pc]) => Math.abs(pr - r) + Math.abs(pc - c) <= 1)) continue;
      picks.push([r, c]);
      forbidden.add(`${r},${c}`);
    }
    return picks;
  }

  function buildLevelDecorations() {
    const cfg = gemsCurrentConfig || getLevelConfig(gemsLevel);
    const seedBase = (gemsLevel === 999 ? 9000 : gemsLevel * 997) + Math.round(gemsScore / 10);
    const rand = seededRandom(seedBase);
    resetObstacleState();
    const state = ensureLevelState();
    const safeCenters = [[3,3],[3,4],[4,3],[4,4]];
    const edgeBan = [[0,0],[0,1],[1,0],[1,1],[6,6],[7,7],[7,6],[6,7], ...safeCenters];

    const stones = cfg.stones || (cfg.objective === 'stone' ? 4 : cfg.objective === 'mixed' ? 5 : 0);
    const frozen = cfg.frozen || (cfg.objective === 'frozen' ? 5 : cfg.objective === 'mixed' ? 4 : 0);
    const locked = cfg.locked || (cfg.objective === 'locked' ? 5 : cfg.objective === 'mixed' ? 4 : 0);
    const bombs = cfg.bombs || (cfg.objective === 'bomb' ? 3 : cfg.objective === 'mixed' ? 2 : 0);
    const chests = cfg.chests || (cfg.objective === 'chest' ? 1 : cfg.objective === 'mixed' ? 1 : 0);

    const stoneCoords = chooseCoords(rand, stones, edgeBan);
    placeCells(state.stoneHp, stoneCoords, 2);
    placeCells(state.frozenHp, chooseCoords(rand, frozen, edgeBan), 2);
    placeCells(state.lockedHp, chooseCoords(rand, locked, edgeBan), 1);
    placeCells(state.bomb, chooseCoords(rand, bombs, edgeBan), 1);

    if (chests > 0) {
      const chestCol = Math.floor(rand() * 6) + 1;
      state.chest = { r: 0, c: chestCol, hp: 2, active: true, dropLocked: false };
    }

    if (gemsLevel === 999) {
      const dailySeed = currentDateKey().split('-').reduce((acc, part) => acc + Number(part), 0);
      state.hint = `Daily seed ${dailySeed}`;
      gemsDailySeed = dailySeed;
    }

    gemsLevelState = state;
  }

  function setBoardShake(duration = 0.28) {
    const shell = document.querySelector('.gems-board-shell');
    if (!shell) return;
    shell.classList.remove('gems-board-shake');
    void shell.offsetWidth;
    shell.classList.add('gems-board-shake');
    setTimeout(() => shell.classList.remove('gems-board-shake'), duration * 1000);
  }

  function addOverlayButtons() {
    const sidebar = document.querySelector('.gems-sidebar');
    if (!sidebar || document.getElementById('gemsProgressCard')) return;
    const card = document.createElement('div');
    card.className = 'sidebar-card gems-progress-card';
    card.id = 'gemsProgressCard';
    card.innerHTML = `
      <h3>Progress</h3>
      <div class="gems-progress-stack">
        <div class="gems-best-txt">Unlocked Level: <strong id="gemsUnlockedLevel">1</strong></div>
        <div class="gems-best-txt">Stars Earned: <strong id="gemsStarTotal">0</strong></div>
        <div class="gems-best-txt">Daily Streak: <strong id="gemsDailyStreak">0</strong></div>
        <div class="gems-best-txt">Matches: <strong id="gemsTotalMatches">0</strong></div>
        <div class="gems-best-txt">Play Time: <strong id="gemsTotalPlayTime">0m</strong></div>
      </div>
      <div class="gems-progress-buttons">
        <button class="btn-secondary" id="gemsLevelSelectBtn" type="button">Level Select</button>
        <button class="btn-secondary" id="gemsDailyBtn" type="button">Daily Challenge</button>
        <button class="btn-secondary" id="gemsShareBtn" type="button">Share Score</button>
      </div>
      <div class="gems-daily-note" id="gemsDailyNote">Claim today’s reward after your first win.</div>
    `;
    sidebar.insertBefore(card, document.getElementById('gemsNewGameBtn'));

    const powerCard = document.querySelector('.gems-power-grid');
    if (powerCard && !document.getElementById('gemsHammerBtn')) {
      const hammer = document.createElement('button');
      hammer.className = 'btn-secondary';
      hammer.id = 'gemsHammerBtn';
      hammer.type = 'button';
      hammer.textContent = '🔨 Hammer';
      const cross = document.createElement('button');
      cross.className = 'btn-secondary';
      cross.id = 'gemsCrossBtn';
      cross.type = 'button';
      cross.textContent = '✚ Cross';
      powerCard.appendChild(hammer);
      powerCard.appendChild(cross);
      hammer.addEventListener('click', () => gemsArmPower('hammer'));
      cross.addEventListener('click', () => gemsArmPower('cross'));
    }

    if (!document.getElementById('gemsLevelSelectModal')) {
      const modal = document.createElement('div');
      modal.id = 'gemsLevelSelectModal';
      modal.className = 'gems-level-modal hidden';
      modal.innerHTML = `
        <div class="gems-level-modal-inner">
          <div class="gems-level-modal-head">
            <div>
              <div class="gems-shell-title">Level Select</div>
              <div class="gems-shell-subtitle">Unlocked levels stay saved. Tap a level to jump back in.</div>
            </div>
            <button class="btn-secondary" id="gemsLevelSelectClose" type="button">Close</button>
          </div>
          <div class="gems-level-grid" id="gemsLevelGrid"></div>
        </div>
      `;
      document.querySelector('.gems-layout')?.appendChild(modal);
      document.getElementById('gemsLevelSelectClose')?.addEventListener('click', () => modal.classList.add('hidden'));
    }
  }

  function renderLevelSelect() {
    const grid = document.getElementById('gemsLevelGrid');
    if (!grid) return;
    const unlocked = Math.min(GEMS_MAX_UNLOCK, gemsProgress.unlocked);
    grid.innerHTML = '';
    for (let i = 1; i <= GEMS_MAX_UNLOCK; i += 1) {
      const btn = document.createElement('button');
      const stars = Number(gemsProgress.stars[i] || 0);
      btn.type = 'button';
      btn.className = `gems-level-btn${i <= unlocked ? '' : ' locked'}`;
      btn.innerHTML = `<span class="lvl-num">${i}</span><span class="lvl-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>`;
      btn.disabled = i > unlocked;
      btn.addEventListener('click', () => {
        gemsProgress.selectedLevel = i;
        saveProgress();
        document.getElementById('gemsLevelSelectModal')?.classList.add('hidden');
        gemsStartLevel(i, false);
      });
      grid.appendChild(btn);
    }
  }

  function updateProgressUI() {
    const unlocked = document.getElementById('gemsUnlockedLevel');
    const stars = document.getElementById('gemsStarTotal');
    const streak = document.getElementById('gemsDailyStreak');
    const matches = document.getElementById('gemsTotalMatches');
    const playTime = document.getElementById('gemsTotalPlayTime');
    if (unlocked) unlocked.textContent = Math.min(GEMS_MAX_UNLOCK, gemsProgress.unlocked).toString();
    if (stars) stars.textContent = Object.values(gemsProgress.stars).reduce((sum, value) => sum + Number(value || 0), 0).toString();
    if (streak) streak.textContent = gemsProgress.dailyStreak.toString();
    if (matches) matches.textContent = gemsProgress.totalMatches.toLocaleString();
    if (playTime) playTime.textContent = `${Math.max(0, Math.round(gemsProgress.totalPlayTime / 60))}m`;
    const note = document.getElementById('gemsDailyNote');
    if (note) {
      const today = currentDateKey();
      note.textContent = gemsProgress.lastDaily === today
        ? 'Daily reward claimed today.'
        : 'Claim today’s reward after your first win.';
    }
  }

  function awardDailyReward() {
    const today = currentDateKey();
    if (gemsProgress.lastDaily === today) return false;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    gemsProgress.dailyStreak = gemsProgress.lastDaily === yesterday ? gemsProgress.dailyStreak + 1 : 1;
    gemsProgress.lastDaily = today;
    gemsProgress.chestRewards += 1;
    saveProgress();
    gemsTrophies += 1;
    localStorage.setItem('gems_trophies', gemsTrophies);
    gemsRewardText = `Daily reward claimed. Streak ${gemsProgress.dailyStreak}.`;
    gemsShowToast('Daily reward!');
    return true;
  }

  function getGemColorName(type) {
    return GEMS_SPECIAL_COLOR_NAMES[type] || `color ${type}`;
  }

  function boardShakeFromMatch(count) {
    if (count >= 6) setBoardShake(0.34);
  }

  function openLevelSelect() {
    renderLevelSelect();
    document.getElementById('gemsLevelSelectModal')?.classList.remove('hidden');
  }

  function startDailyChallenge() {
    gemsDailySeed = currentDateKey();
    gemsStartLevel(999, false);
  }

  function shareCurrentScore() {
    const text = `I scored ${gemsScore.toLocaleString()} in Gems Crush at level ${gemsLevel}.`;
    if (navigator.share) {
      navigator.share({ title: 'Gems Crush', text, url: location.href }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
      gemsShowToast('Score copied!');
    }
  }

  function countStars(levelScore, movesLeft, config, turns, objectiveDone) {
    if (!objectiveDone) return 1;
    const scoreBonus = levelScore >= config.target ? 1 : 0;
    const moveBonus = turns >= 0 ? Math.max(0, Math.min(1, Math.floor((movesLeft / Math.max(1, config.moves)) * 2))) : 0;
    return Math.max(1, Math.min(3, 1 + scoreBonus + moveBonus));
  }

  function isObstacleCell(r, c) {
    const state = ensureLevelState();
    return (state.stoneHp[r] && state.stoneHp[r][c] > 0) ||
      (state.lockedHp[r] && state.lockedHp[r][c] > 0) ||
      (state.frozenHp[r] && state.frozenHp[r][c] > 0) ||
      (state.bomb[r] && state.bomb[r][c] > 0);
  }

  function buildObstacleSummary() {
    const state = ensureLevelState();
    const count = matrix => matrix.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
    const chestActive = state.chest && state.chest.active ? 1 : 0;
    return {
      stones: count(state.stoneHp),
      frozen: count(state.frozenHp),
      locked: count(state.lockedHp),
      bombs: count(state.bomb),
      chests: chestActive
    };
  }

  function updateGoalText() {
    const summary = buildObstacleSummary();
    const config = gemsCurrentConfig || getLevelConfig(gemsLevel);
    const objectiveText = (() => {
      if (config.objective === 'collect') return `Collect ${getGemColorName(config.color)} gems.`;
      if (config.objective === 'stone') return `Clear ${summary.stones} stone blockers.`;
      if (config.objective === 'frozen') return `Break ${summary.frozen} frozen gems.`;
      if (config.objective === 'chest') return `Drop ${summary.chests} treasure chest(s) to the bottom.`;
      if (config.objective === 'locked') return `Unlock ${summary.locked} sealed gems.`;
      if (config.objective === 'bomb') return `Trigger ${summary.bombs} bomb gems.`;
      if (config.objective === 'mixed') return `Clear the mixed obstacle board.`;
      if (config.objective === 'daily') return `Beat today’s special puzzle board.`;
      return `Reach the target score and keep the cascade flowing.`;
    })();
    const goalEl = document.getElementById('gemsGoalTxt');
    if (goalEl) goalEl.textContent = objectiveText;
  }

  const _gemsOrigNewGame = gemsNewGame;
  window.gemsNewGame = function() {
    gemsProgress = loadProgress();
    gemsLevelStartMs = performance.now();
    gemsPendingDailyReward = false;
    _gemsOrigNewGame();
    updateProgressUI();
  };

  const _gemsOrigStartLevel2 = window.gemsStartLevel;
  window.gemsStartLevel = function(level, resetTotalScore = false) {
    const config = getLevelConfig(level);
    gemsCurrentConfig = config;
    gemsLevel = level;
    gemsLevelStartMs = performance.now();
    gemsPendingDailyReward = level === 999;
    _gxClearHint();
    window.gemsLastSwap = null;
    _gemsOrigStartLevel2(level, resetTotalScore);
    buildLevelDecorations();
    updateGoalText();
    updateProgressUI();
    gemsRender();
  };

  const _gemsOrigBuild2 = window.gemsBuildGrid;
  window.gemsBuildGrid = function() {
    _gemsOrigBuild2();
    buildLevelDecorations();
  };

  const _gemsOrigRender3 = window.gemsRender;
  window.gemsRender = function() {
    _gemsOrigRender3();
    const state = ensureLevelState();
    const board = document.getElementById('gemsBoard');
    if (!board) return;
    const cells = board.querySelectorAll('.gem-cell');
    cells.forEach(cell => {
      const r = Number(cell.dataset.r);
      const c = Number(cell.dataset.c);
      const stone = state.stoneHp[r]?.[c] || 0;
      const frozen = state.frozenHp[r]?.[c] || 0;
      const locked = state.lockedHp[r]?.[c] || 0;
      const bomb = state.bomb[r]?.[c] || 0;
      cell.classList.toggle('gem-stone', stone > 0);
      cell.classList.toggle('gem-frozen', frozen > 0);
      cell.classList.toggle('gem-locked', locked > 0);
      cell.classList.toggle('gem-bomb', bomb > 0);
      if (stone > 0) cell.dataset.obstacle = 'stone';
      else if (frozen > 0) cell.dataset.obstacle = 'frozen';
      else if (locked > 0) cell.dataset.obstacle = 'locked';
      else if (bomb > 0) cell.dataset.obstacle = 'bomb';
      else delete cell.dataset.obstacle;
      if (frozen > 0) {
        const icon = document.createElement('span');
        icon.className = 'gem-special-icon gem-overlay-icon';
        icon.textContent = '❄';
        cell.appendChild(icon);
      }
      if (locked > 0) {
        const icon = document.createElement('span');
        icon.className = 'gem-special-icon gem-overlay-icon';
        icon.textContent = '🔒';
        cell.appendChild(icon);
      }
      if (stone > 0) {
        const icon = document.createElement('span');
        icon.className = 'gem-special-icon gem-overlay-icon';
        icon.textContent = '▣';
        cell.appendChild(icon);
      }
      if (bomb > 0) {
        const icon = document.createElement('span');
        icon.className = 'gem-special-icon gem-overlay-icon';
        icon.textContent = '💣';
        cell.appendChild(icon);
      }
    });
    if (state.chest && state.chest.active) {
      const cell = gemsGetCell(state.chest.r, state.chest.c);
      if (cell) {
        const chest = document.createElement('span');
        chest.className = 'gem-special-icon gem-chest-icon';
        chest.textContent = '☗';
        cell.appendChild(chest);
        cell.classList.add('gem-chest');
      }
    }
    updateGoalText();
  };

  function clearObstacleAt(r, c) {
    const state = ensureLevelState();
    if (state.stoneHp[r]?.[c] > 0) state.stoneHp[r][c] = 0;
    if (state.lockedHp[r]?.[c] > 0) state.lockedHp[r][c] = 0;
    if (state.frozenHp[r]?.[c] > 0) state.frozenHp[r][c] = 0;
    if (state.bomb[r]?.[c] > 0) state.bomb[r][c] = 0;
  }

  function chipAdjacentObstacles(coords) {
    const state = ensureLevelState();
    coords.forEach(({ r, c }) => {
      GEMS_DIRS.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) return;
        if (state.stoneHp[nr]?.[nc] > 0) {
          state.stoneHp[nr][nc] -= 1;
          if (state.stoneHp[nr][nc] <= 0) {
            state.stoneHp[nr][nc] = 0;
            gemsShowToast('Stone cracked!');
            gemsScore += 12;
            gemsLevelScore += 12;
          }
        }
        if (state.lockedHp[nr]?.[nc] > 0) {
          state.lockedHp[nr][nc] -= 1;
          if (state.lockedHp[nr][nc] <= 0) gemsShowToast('Lock broken!');
        }
        if (state.bomb[nr]?.[nc] > 0) {
          state.bomb[nr][nc] = 0;
          for (let br = -1; br <= 1; br += 1) {
            for (let bc = -1; bc <= 1; bc += 1) {
              const rr = nr + br;
              const cc = nc + bc;
              if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) clearObstacleAt(rr, cc);
            }
          }
          gemsShowToast('💣 Boom!');
          boardShakeFromMatch(8);
        }
      });
    });
  }

  function dropChest() {
    const state = ensureLevelState();
    if (!state.chest || !state.chest.active) return;
    const chest = state.chest;
    if (chest.r >= 7) {
      chest.active = false;
      gemsShowToast('Treasure dropped!');
      gemsProgress.chestRewards += 1;
      saveProgress();
      return;
    }
    chest.r += 1;
  }

  const _gemsOrigSwap2 = window.gemsSwapTiles;
  window.gemsSwapTiles = function(r1, c1, r2, c2) {
    const state = ensureLevelState();
    if (isObstacleCell(r1, c1) || isObstacleCell(r2, c2)) {
      gemsPlaySound('badSwap');
      gemsShowToast('Blocked!');
      setBoardShake(0.18);
      return;
    }
    _gemsOrigSwap2(r1, c1, r2, c2);
    if (window.gemsSpecial[r1]?.[c1] === 'bomb' || window.gemsSpecial[r2]?.[c2] === 'bomb') boardShakeFromMatch(8);
  };

  const _gemsOrigClear2 = window.gemsClearAndCascade;
  window.gemsClearAndCascade = function() {
    const beforeScore = gemsScore;
    const analysis = gemsAnalyzeMatches();
    if (analysis.count > 0) {
      const state = ensureLevelState();
      const config = gemsCurrentConfig || getLevelConfig(gemsLevel);
      const keepSet = new Set();
      if (config.objective === 'collect') {
        analysis.coords.forEach(({ r, c }) => {
          if (gemsGrid[r]?.[c] === config.color) state.collected += 1;
        });
      }
      analysis.coords.forEach(({ r, c }) => {
        const frozen = state.frozenHp[r]?.[c] || 0;
        const locked = state.lockedHp[r]?.[c] || 0;
        if (frozen > 0) {
          state.frozenHp[r][c] -= 1;
          keepSet.add(`${r},${c}`);
        } else if (locked > 0) {
          state.lockedHp[r][c] -= 1;
          keepSet.add(`${r},${c}`);
        }
      });
      if (keepSet.size) {
        analysis.coords = analysis.coords.filter(({ r, c }) => !keepSet.has(`${r},${c}`));
        analysis.count = analysis.coords.length;
      }
      chipAdjacentObstacles(analysis.coords);
      gemsProgress.totalMatches += analysis.coords.length;
      gemsScore += 0;
      if (analysis.count >= 6) boardShakeFromMatch(analysis.count);
      _gemsOrigClear2();
      dropChest();
      return;
    }
    _gemsOrigClear2();
    dropChest();
  };

  const _gemsOrigFill2 = window.gemsFillEmpty;
  window.gemsFillEmpty = function() {
    _gemsOrigFill2();
    const state = ensureLevelState();
    if (state.chest && state.chest.active && gemsGrid[state.chest.r][state.chest.c] !== null) {
      gemsGrid[state.chest.r][state.chest.c] = null;
    }
  };

  const _gemsOrigApply2 = window.gemsApplyGravity;
  window.gemsApplyGravity = function() {
    _gemsOrigApply2();
    dropChest();
  };

  const _gemsOrigUpdateUI2 = window.gemsUpdateUI;
  window.gemsUpdateUI = function() {
    _gemsOrigUpdateUI2();
    updateProgressUI();
    const config = gemsCurrentConfig || getLevelConfig(gemsLevel);
    const stars = Number(gemsProgress.stars[gemsLevel] || 0);
    const starEl = document.getElementById('gemsLevelNum');
    if (starEl) starEl.dataset.stars = String(stars);
    const btn = document.getElementById('gemsDailyBtn');
    if (btn) {
      const today = currentDateKey();
      btn.textContent = gemsProgress.lastDaily === today ? 'Daily Claimed' : 'Daily Challenge';
      btn.disabled = gemsProgress.lastDaily === today && gemsLevel === 999;
    }
    const levelTxt = document.getElementById('gemsStageName');
    if (levelTxt && gemsLevel === 999) levelTxt.textContent = config.name;
  };

  const _gemsOrigCheck2 = window.gemsCheckLevelEnd;
  window.gemsCheckLevelEnd = function() {
    const config = gemsCurrentConfig || getLevelConfig(gemsLevel);
    const state = ensureLevelState();
    const objectiveDone = (() => {
      if (config.objective === 'score') return gemsLevelScore >= gemsLevelTarget;
      if (config.objective === 'collect') return gemsLevelScore >= gemsLevelTarget && gemsProgress.totalMatches >= 0;
      if (config.objective === 'stone') return state.stoneHp.flat().every(v => v === 0) && gemsLevelScore >= gemsLevelTarget;
      if (config.objective === 'frozen') return state.frozenHp.flat().every(v => v === 0) && gemsLevelScore >= gemsLevelTarget;
      if (config.objective === 'locked') return state.lockedHp.flat().every(v => v === 0) && gemsLevelScore >= gemsLevelTarget;
      if (config.objective === 'bomb') return state.bomb.flat().every(v => v === 0) && gemsLevelScore >= gemsLevelTarget;
      if (config.objective === 'chest') return (!state.chest || !state.chest.active) && gemsLevelScore >= gemsLevelTarget;
      if (config.objective === 'mixed') return state.stoneHp.flat().every(v => v === 0) && state.frozenHp.flat().every(v => v === 0) && state.lockedHp.flat().every(v => v === 0) && (!state.chest || !state.chest.active) && gemsLevelScore >= gemsLevelTarget;
      if (config.objective === 'daily') return gemsLevelScore >= gemsLevelTarget;
      return gemsLevelScore >= gemsLevelTarget;
    })();
    if (gemsLevelScore >= gemsLevelTarget && objectiveDone) {
      const elapsed = Math.max(1, Math.round((performance.now() - gemsLevelStartMs) / 1000));
      const movesLeft = gemsMoves;
      const stars = countStars(gemsLevelScore, movesLeft, config, elapsed, objectiveDone);
      gemsProgress.stars[gemsLevel] = Math.max(Number(gemsProgress.stars[gemsLevel] || 0), stars);
      gemsProgress.times[gemsLevel] = Math.min(Number(gemsProgress.times[gemsLevel] || Infinity), elapsed);
      gemsProgress.unlocked = Math.max(gemsProgress.unlocked, Math.min(GEMS_MAX_UNLOCK, gemsLevel + 1));
      if (gemsLevel % 5 === 0) gemsProgress.chestRewards += 1;
      if (gemsLevel === 999) {
        gemsProgress.lastDaily = currentDateKey();
        gemsProgress.dailyStreak = Math.max(1, gemsProgress.dailyStreak || 0);
        gemsPendingDailyReward = true;
        awardDailyReward();
      }
      saveProgress();
      gemsShowToast(`${stars}★ cleared`);
      boardShakeFromMatch(7);
    }
    _gemsOrigCheck2();
  };

  window.gemsCheckLevelEnd = function() {
    const config = gemsCurrentConfig || getLevelConfig(gemsLevel);
    const state = ensureLevelState();
    const starsFor = () => {
      const elapsed = Math.max(1, Math.round((performance.now() - gemsLevelStartMs) / 1000));
      return countStars(gemsLevelScore, gemsMoves, config, elapsed, true);
    };
    const objectiveDone = (() => {
      if (config.objective === 'collect') return (state.collected || 0) >= (config.collectCount || 12);
      if (config.objective === 'stone') return gemsLevelScore >= gemsLevelTarget;
      if (config.objective === 'frozen') return gemsLevelScore >= gemsLevelTarget;
      if (config.objective === 'locked') return gemsLevelScore >= gemsLevelTarget;
      if (config.objective === 'bomb') return gemsLevelScore >= gemsLevelTarget;
      if (config.objective === 'chest') return !state.chest || !state.chest.active;
      if (config.objective === 'mixed') return gemsLevelScore >= gemsLevelTarget;
      return gemsLevelScore >= gemsLevelTarget;
    })();

    if (gemsLevelScore >= gemsLevelTarget && objectiveDone) {
      const nextLevel = Math.min(GEMS_MAX_UNLOCK, gemsLevel + 1);
      const stars = starsFor();
      const elapsed = Math.max(1, Math.round((performance.now() - gemsLevelStartMs) / 1000));
      gemsProgress.stars[gemsLevel] = Math.max(Number(gemsProgress.stars[gemsLevel] || 0), stars);
      gemsProgress.times[gemsLevel] = Math.min(Number(gemsProgress.times[gemsLevel] || Infinity), elapsed);
      gemsProgress.unlocked = Math.max(gemsProgress.unlocked, nextLevel);
      gemsProgress.selectedLevel = nextLevel;
      gemsProgress.totalPlayTime += elapsed;
      if (gemsLevel % 5 === 0) gemsProgress.chestRewards += 1;
      if (gemsLevel === 999) {
        gemsProgress.lastDaily = currentDateKey();
        gemsProgress.dailyStreak = Math.max(1, gemsProgress.dailyStreak || 0);
        gemsPendingDailyReward = true;
        awardDailyReward();
      }
      saveProgress();
      updateProgressUI();

      const icon = document.getElementById('gemsOverIcon');
      const title = document.getElementById('gemsOverTitle');
      const scoreEl = document.getElementById('gemsOverScore');
      const nextBtn = document.getElementById('gemsNextBtn');
      const continueBtn = document.getElementById('gemsContinueBtn');
      const replayBtn = document.getElementById('gemsReplayBtn');
      const retryBtn = document.getElementById('gemsRetryBtn');
      if (icon) icon.textContent = stars === 3 ? '🏆' : '💎';
      if (title) title.textContent = `${config.name} Complete!`;
      if (scoreEl) scoreEl.textContent = `Score ${gemsLevelScore.toLocaleString()} · Time ${elapsed}s · ${stars}★`;
      if (nextBtn) nextBtn.style.display = '';
      if (continueBtn) continueBtn.style.display = 'none';
      if (replayBtn) replayBtn.style.display = 'none';
      if (retryBtn) retryBtn.textContent = 'Restart Level 1';
      document.getElementById('gemsOverlay')?.classList.remove('hidden');
      gemsWon = true;
      gemsCelebrate('win');
      gemsShowToast(`${stars}★ Clear!`);
      gemsPlaySound('win');
      saveProgress();
      gemsUpdateUI();
      const reward = gemsLevel % 5 === 0 ? `Chest reward +${1 + Math.floor(gemsLevel / 5)}!` : `Level ${gemsLevel} cleared.`;
      gemsRewardText = reward;
      if (nextBtn) nextBtn.onclick = () => gemsStartLevel(nextLevel, false);
      return;
    }

    if (gemsMoves <= 0) {
      document.getElementById('gemsOverIcon').textContent = '💔';
      document.getElementById('gemsOverTitle').textContent = 'Out of Moves!';
      document.getElementById('gemsOverScore').textContent = `Score ${gemsLevelScore.toLocaleString()} / ${gemsLevelTarget.toLocaleString()} · Total ${gemsScore.toLocaleString()}`;
      document.getElementById('gemsNextBtn').style.display = 'none';
      document.getElementById('gemsContinueBtn').style.display = gemsContinueAvailable ? '' : 'none';
      document.getElementById('gemsReplayBtn').style.display = '';
      document.getElementById('gemsRetryBtn').textContent = 'Restart Level 1';
      document.getElementById('gemsOverlay').classList.remove('hidden');
      gemsWon = true;
      gemsPlaySound('lose');
      gemsShowToast('Board stuck!');
      gemsUpdateUI();
    }
  };

  const _gemsOrigReward2 = window.gemsApplyWheelReward;
  window.gemsApplyWheelReward = function(reward) {
    if (reward === 'Hammer') {
      gemsRewardText = 'Wheel reward: Hammer added.';
      gemsShowToast('Hammer!');
      gemsUpdateUI();
      return;
    }
    if (reward === 'Cross Blast') {
      gemsRewardText = 'Wheel reward: cross blast added.';
      gemsShowToast('Cross blast!');
      gemsUpdateUI();
      return;
    }
    _gemsOrigReward2(reward);
  };

  const _gemsOrigArmPower2 = window.gemsArmPower;
  window.gemsArmPower = function(type) {
    if (type === 'hammer') {
      if (gemsAnimating || gemsWon || gemsSpinAnimating) return;
      gemsPendingPower = 'hammer';
      gemsSelected = null;
      gemsRewardText = 'Hammer mode: tap one gem or blocker to smash it.';
      gemsRender();
      gemsUpdateUI();
      return;
    }
    if (type === 'cross') {
      if (gemsAnimating || gemsWon || gemsSpinAnimating) return;
      gemsPendingPower = 'cross';
      gemsSelected = null;
      gemsRewardText = 'Cross blast mode: tap a cell to clear its row and column.';
      gemsRender();
      gemsUpdateUI();
      return;
    }
    _gemsOrigArmPower2(type);
  };

  const _gemsOrigOnClick2 = window.gemsOnClick;
  window.gemsOnClick = function(r, c) {
    if (gemsPendingPower === 'hammer') {
      const state = ensureLevelState();
      if (state.stoneHp[r]?.[c] > 0 || state.lockedHp[r]?.[c] > 0 || state.frozenHp[r]?.[c] > 0 || state.bomb[r]?.[c] > 0) {
        clearObstacleAt(r, c);
        gemsScore += 20;
        gemsLevelScore += 20;
        gemsRewardText = 'Hammer smashed the obstacle.';
        gemsShowToast('Smash!');
        gemsPlaySound('power');
        state.shake = 0.2;
        setBoardShake(0.18);
        gemsPendingPower = null;
        gemsRender();
        gemsUpdateUI();
        return;
      }
      gemsPendingPower = null;
      gemsRewardText = 'Hammer missed. Try another cell.';
      gemsRender();
      gemsUpdateUI();
      return;
    }
    if (gemsPendingPower === 'cross') {
      gemsPendingPower = null;
      gemsAnimating = true;
      const cleared = [];
      for (let i = 0; i < 8; i += 1) {
        if (gemsGrid[r][i] !== null) cleared.push({ r, c: i });
        if (gemsGrid[i][c] !== null && i !== r) cleared.push({ r: i, c });
      }
      cleared.forEach(({ r: rr, c: cc }) => {
        const cell = gemsGetCell(rr, cc);
        if (cell) cell.classList.add('matched');
        gemsGrid[rr][cc] = null;
      });
      gemsScore += cleared.length * 18;
      gemsLevelScore += cleared.length * 18;
      gemsRewardText = 'Cross blast cleared a lane!';
      gemsPlaySound('power');
      gemsRender();
      setTimeout(() => {
        gemsApplyGravity();
        gemsFillEmpty();
        gemsRender();
        gemsAnimating = false;
        gemsCheckLevelEnd();
      }, 220);
      return;
    }
    _gemsOrigOnClick2(r, c);
  };

  const _gemsOrigReplay2 = window.gemsReplayCurrentLevel;
  window.gemsReplayCurrentLevel = function(resetTotalScore = true) {
    gemsLevelStartMs = performance.now();
    gemsPendingDailyReward = gemsLevel === 999;
    _gemsOrigReplay2(resetTotalScore);
    buildLevelDecorations();
    updateGoalText();
    updateProgressUI();
  };

  const _gemsOrigContinue2 = window.gemsContinueRun;
  window.gemsContinueRun = function() {
    _gemsOrigContinue2();
    updateProgressUI();
  };

  const _gemsOrigOpenGift2 = window.gemsOpenGift;
  window.gemsOpenGift = function() {
    _gemsOrigOpenGift2();
    setBoardShake(0.12);
  };

  function bindGemsMobile() {
    const board = document.getElementById('gemsBoard');
    if (board) {
      board.style.touchAction = 'none';
      board.addEventListener('touchmove', event => event.preventDefault(), { passive: false });
    }
    document.querySelector('.gems-layout')?.addEventListener('touchmove', event => {
      const target = event.target;
      if (target && target.closest('.gems-board-wrap')) event.preventDefault();
    }, { passive: false });
  }

  function bootGemsTools() {
    addOverlayButtons();
    updateProgressUI();
    bindGemsMobile();
    document.getElementById('gemsLevelSelectBtn')?.addEventListener('click', openLevelSelect);
    document.getElementById('gemsDailyBtn')?.addEventListener('click', startDailyChallenge);
    document.getElementById('gemsShareBtn')?.addEventListener('click', shareCurrentScore);
    document.addEventListener('keydown', event => {
      if (!document.getElementById('view-gems')?.classList.contains('active')) return;
      if (event.key === 'Escape') document.getElementById('gemsLevelSelectModal')?.classList.add('hidden');
    });
  }

  window.addEventListener('load', () => {
    bootGemsTools();
    renderLevelSelect();
    updateProgressUI();
    if (gemsProgress.lastDaily !== currentDateKey()) {
      gemsPendingDailyReward = false;
    }
  }, { once: true });
})();
