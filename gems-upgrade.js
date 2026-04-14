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
