(function() {
  const FRUITS = [
    { emoji: '🍒', r: 16, score: 4, color: '#ff5b73' },
    { emoji: '🍓', r: 20, score: 8, color: '#ff7a66' },
    { emoji: '🍊', r: 24, score: 16, color: '#ffad4d' },
    { emoji: '🍋', r: 28, score: 32, color: '#ffe06a' },
    { emoji: '🍏', r: 32, score: 64, color: '#89db7a' },
    { emoji: '🍎', r: 36, score: 128, color: '#ff6666' },
    { emoji: '🍑', r: 42, score: 256, color: '#ffb173' },
    { emoji: '🍍', r: 48, score: 512, color: '#f6d55c' },
    { emoji: '🥥', r: 56, score: 1024, color: '#c8a87a' },
    { emoji: '🍉', r: 66, score: 2048, color: '#70e18d' },
  ];

  const GRAVITY = 0.18;
  const RESTITUTION = 0.2;
  const FRICTION = 0.992;
  const WALL = 16;
  const SPAWN_DELAY = 420;

  let canvas, ctx, dropGuide;
  let width = 380, height = 560, cupLeft = 30, cupRight = 350, cupBottom = 540;
  let fruits = [];
  let nextFruit = 0;
  let score = 0;
  let best = 0;
  let playerName = 'Guest';
  let gameOver = false;
  let canDrop = true;
  let pointerX = 190;
  let animationFrame = null;
  let lastTime = 0;

  function initFruitView() {
    canvas = document.getElementById('fruitCanvas');
    dropGuide = document.getElementById('fruitDropGuide');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    const boardWidth = Math.min(420, window.innerWidth - 26);
    width = boardWidth;
    height = Math.min(620, Math.round(boardWidth * 1.48));
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    cupLeft = 24;
    cupRight = width - 24;
    cupBottom = height - 18;
    pointerX = width / 2;
    best = parseInt(localStorage.getItem('fruit_best') || '0', 10);
    playerName = localStorage.getItem('fruit_name') || 'Guest';
    document.getElementById('fruitPlayerName').value = playerName;
    document.getElementById('fruitBest').textContent = `Best: ${best.toLocaleString()}`;
    startFruitGame();
  }

  function startFruitGame() {
    fruits = [];
    score = 0;
    gameOver = false;
    canDrop = true;
    nextFruit = randomFruitIndex(0, 3);
    setFruitScore(0);
    document.getElementById('fruitOverlay').classList.add('hidden');
    document.getElementById('fruitShareBtn').style.display = 'none';
    updateNextPreview();
    lastTime = 0;
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(loop);
  }

  function randomFruitIndex(min, maxExclusive) {
    return min + Math.floor(Math.random() * (maxExclusive - min));
  }

  function updateNextPreview() {
    const info = FRUITS[nextFruit];
    document.getElementById('fruitNextPreview').textContent = info.emoji;
  }

  function setFruitScore(value) {
    score = value;
    document.getElementById('fruitScore').textContent = score.toLocaleString();
    if (score > best) {
      best = score;
      localStorage.setItem('fruit_best', String(best));
      document.getElementById('fruitBest').textContent = `Best: ${best.toLocaleString()}`;
    }
  }

  function spawnFruit(x) {
    if (gameOver || !canDrop) return;
    const kind = nextFruit;
    const data = FRUITS[kind];
    const clampedX = Math.max(cupLeft + data.r + 6, Math.min(cupRight - data.r - 6, x));
    fruits.push({
      kind,
      x: clampedX,
      y: 44,
      vx: 0,
      vy: 0,
      age: 0,
      restingFrames: 0,
      merged: false,
    });
    nextFruit = randomFruitIndex(0, 5);
    updateNextPreview();
    canDrop = false;
    setTimeout(() => { if (!gameOver) canDrop = true; }, SPAWN_DELAY);
  }

  function loop(ts) {
    const dt = Math.min(1.2, (ts - lastTime) / 16.666 || 1);
    lastTime = ts;
    updateFruitPhysics(dt);
    drawFruitGame();
    animationFrame = requestAnimationFrame(loop);
  }

  function updateFruitPhysics(dt) {
    for (const fruit of fruits) {
      fruit.age = (fruit.age || 0) + dt;
      fruit.vy += GRAVITY * dt;
      fruit.x += fruit.vx * dt;
      fruit.y += fruit.vy * dt;
      fruit.vx *= FRICTION;

      const r = FRUITS[fruit.kind].r;
      if (fruit.x - r < cupLeft + WALL) {
        fruit.x = cupLeft + WALL + r;
        fruit.vx *= -0.55;
      }
      if (fruit.x + r > cupRight - WALL) {
        fruit.x = cupRight - WALL - r;
        fruit.vx *= -0.55;
      }
      if (fruit.y + r > cupBottom) {
        fruit.y = cupBottom - r;
        fruit.vy *= -RESTITUTION;
        if (Math.abs(fruit.vy) < 0.7) fruit.vy = 0;
      }
    }

    resolveFruitCollisions();
    checkFruitGameOver();
  }

  function resolveFruitCollisions() {
    for (let i = 0; i < fruits.length; i += 1) {
      const a = fruits[i];
      if (!a) continue;
      const ar = FRUITS[a.kind].r;

      for (let j = i + 1; j < fruits.length; j += 1) {
        const b = fruits[j];
        if (!b) continue;
        const br = FRUITS[b.kind].r;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const minDist = ar + br;

        if (dist >= minDist) continue;

        const overlap = (minDist - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;

        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const impact = rvx * nx + rvy * ny;
        if (impact < 0) {
          const impulse = -(1 + RESTITUTION) * impact * 0.5;
          a.vx -= impulse * nx;
          a.vy -= impulse * ny;
          b.vx += impulse * nx;
          b.vy += impulse * ny;
        }

        const bothStable = Math.abs(a.vy) < 1.3 && Math.abs(b.vy) < 1.3 && Math.abs(a.vx) < 1.2 && Math.abs(b.vx) < 1.2;
        if (a.kind === b.kind && bothStable) {
          a.restingFrames += 1;
          b.restingFrames += 1;
          if (a.restingFrames > 10 && b.restingFrames > 10) {
            mergeFruitPair(i, j);
            return;
          }
        } else {
          a.restingFrames = 0;
          b.restingFrames = 0;
        }
      }
    }
  }

  function mergeFruitPair(i, j) {
    const a = fruits[i];
    const b = fruits[j];
    if (!a || !b || a.kind !== b.kind) return;

    const nextKind = Math.min(a.kind + 1, FRUITS.length - 1);
    const mergedX = (a.x + b.x) / 2;
    const mergedY = (a.y + b.y) / 2;
    const bonus = FRUITS[nextKind].score;
    setFruitScore(score + bonus);

    fruits.splice(j, 1);
    fruits.splice(i, 1, {
      kind: nextKind,
      x: mergedX,
      y: mergedY,
      vx: (a.vx + b.vx) / 2,
      vy: -1.8,
      age: 0,
      restingFrames: 0,
    });
  }

  function drawFruitGame() {
    ctx.clearRect(0, 0, width, height);

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#12091e');
    bg.addColorStop(1, '#08120d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    drawCup();
    drawNextGuide();

    for (const fruit of fruits) {
      const info = FRUITS[fruit.kind];
      ctx.beginPath();
      ctx.fillStyle = info.color;
      ctx.shadowColor = info.color;
      ctx.shadowBlur = 18;
      ctx.arc(fruit.x, fruit.y, info.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = `${Math.round(info.r * 1.1)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(info.emoji, fruit.x, fruit.y + 2);
    }
  }

  function drawCup() {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cupLeft, 28);
    ctx.lineTo(cupLeft, cupBottom);
    ctx.lineTo(cupRight, cupBottom);
    ctx.lineTo(cupRight, 28);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(cupLeft, 28, cupRight - cupLeft, cupBottom - 28);

    ctx.strokeStyle = 'rgba(255,107,142,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cupLeft + 8, 96);
    ctx.lineTo(cupRight - 8, 96);
    ctx.stroke();
  }

  function drawNextGuide() {
    const info = FRUITS[nextFruit];
    const guideX = Math.max(cupLeft + info.r + 6, Math.min(cupRight - info.r - 6, pointerX));
    if (dropGuide) {
      dropGuide.style.left = `${guideX}px`;
      dropGuide.style.height = `${cupBottom - 28}px`;
    }
    ctx.globalAlpha = canDrop ? 0.75 : 0.32;
    ctx.font = `${Math.round(info.r * 1.15)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(info.emoji, guideX, 34);
    ctx.globalAlpha = 1;
  }

  function checkFruitGameOver() {
    if (gameOver) return;
    const dangerLine = 96;
    const risky = fruits.some((fruit) => {
      const info = FRUITS[fruit.kind];
      return fruit.age > 20 && fruit.y - info.r < dangerLine && Math.abs(fruit.vy) < 0.45;
    });
    if (risky) endFruitGame();
  }

  function endFruitGame() {
    gameOver = true;
    canDrop = false;
    submitLeaderScore('fruit', playerName, score);
    document.getElementById('fruitOverScore').textContent = `Score: ${score.toLocaleString()} · Best: ${best.toLocaleString()}`;
    document.getElementById('fruitOverlay').classList.remove('hidden');
    document.getElementById('fruitShareBtn').style.display = '';
  }

  function updatePointerFromEvent(clientX) {
    const rect = canvas.getBoundingClientRect();
    pointerX = ((clientX - rect.left) / rect.width) * width;
  }

  function shareFruitScore() {
    const text = `I scored ${score.toLocaleString()} in Merge Fruit on Youooo Games. Can you beat me? https://game.youooo.com/#merge-fruit`;
    if (navigator.share) {
      navigator.share({ title: 'Youooo Merge Fruit', text, url: 'https://game.youooo.com/#merge-fruit' });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => alert('Copied! Paste to share.'));
    }
  }

  document.addEventListener('mousemove', (event) => {
    const view = document.querySelector('.view.active');
    if (!view || view.id !== 'view-fruit' || !canvas) return;
    updatePointerFromEvent(event.clientX);
  });

  document.addEventListener('click', (event) => {
    const view = document.querySelector('.view.active');
    if (!view || view.id !== 'view-fruit' || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (event.target.closest('#fruitNewBtn, #fruitRetryBtn, #fruitLeaderBtn, #fruitShareBtn, #fruitShareOverBtn')) return;
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
    if (!gameOver) spawnFruit(pointerX);
  });

  let touchStartX = 0;
  document.addEventListener('touchstart', (event) => {
    const view = document.querySelector('.view.active');
    if (!view || view.id !== 'view-fruit' || !canvas) return;
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    updatePointerFromEvent(touch.clientX);
  }, { passive: true });

  document.addEventListener('touchmove', (event) => {
    const view = document.querySelector('.view.active');
    if (!view || view.id !== 'view-fruit' || !canvas) return;
    const touch = event.touches[0];
    updatePointerFromEvent(touch.clientX);
  }, { passive: true });

  document.addEventListener('touchend', (event) => {
    const view = document.querySelector('.view.active');
    if (!view || view.id !== 'view-fruit' || !canvas || gameOver) return;
    const touch = event.changedTouches[0];
    if (Math.abs(touch.clientX - touchStartX) < 20 && canDrop) spawnFruit(pointerX);
  }, { passive: true });

  document.getElementById('fruitNewBtn')?.addEventListener('click', () => {
    playerName = (document.getElementById('fruitPlayerName')?.value.trim() || 'Guest').slice(0, 16);
    localStorage.setItem('fruit_name', playerName);
    startFruitGame();
  });
  document.getElementById('fruitRetryBtn')?.addEventListener('click', () => {
    playerName = (document.getElementById('fruitPlayerName')?.value.trim() || 'Guest').slice(0, 16);
    localStorage.setItem('fruit_name', playerName);
    startFruitGame();
  });
  document.getElementById('fruitLeaderBtn')?.addEventListener('click', () => {
    if (window.openLeaderboard) window.openLeaderboard('fruit');
  });
  document.getElementById('fruitShareBtn')?.addEventListener('click', shareFruitScore);
  document.getElementById('fruitShareOverBtn')?.addEventListener('click', shareFruitScore);

  window._initFruit = initFruitView;
  if (document.querySelector('.view.active')?.id === 'view-fruit') initFruitView();
})();
