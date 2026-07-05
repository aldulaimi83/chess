// ════════════════════════════════════════════════════════════
// ██████  SNAKE GAME
// ════════════════════════════════════════════════════════════
(function() {
  const GRID = 20;
  const SPEEDS = { slow: 160, normal: 100, fast: 60 };
  let canvas, ctx, snake, dir, nextDir, food, score, best, running, loop, speed, playerName;
  let gameStarted = false;

  function initSnakeView() {
    canvas = document.getElementById('snakeCanvas');
    ctx = canvas.getContext('2d');
    const size = Math.min(500, window.innerWidth - 48);
    canvas.width = size; canvas.height = size;
    canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
    speed = SPEEDS.normal;
    best = parseInt(localStorage.getItem('snake_best') || '0');
    playerName = localStorage.getItem('snake_name') || 'Guest';
    document.getElementById('snakePlayerName').value = playerName;
    document.getElementById('snakeBest').textContent = 'Best: ' + best.toLocaleString();
    document.getElementById('snakeScore').textContent = '0';
    document.getElementById('snakeOverlay').classList.add('hidden');
    document.getElementById('snakeShareBtn').style.display = 'none';
    clearInterval(loop); loop = null; running = false; gameStarted = false;
    drawWelcome();
  }

  function startSnake() {
    playerName = (document.getElementById('snakePlayerName').value.trim() || 'Guest');
    localStorage.setItem('snake_name', playerName);
    snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
    dir = {x:1,y:0}; nextDir = {x:1,y:0};
    score = 0; running = true; gameStarted = true;
    document.getElementById('snakeScore').textContent = '0';
    document.getElementById('snakeOverlay').classList.add('hidden');
    document.getElementById('snakeShareBtn').style.display = 'none';
    placeFood();
    clearInterval(loop);
    loop = setInterval(tick, speed);
  }

  function tick() {
    dir = nextDir;
    const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) return endSnake();
    if (snake.some(s => s.x === head.x && s.y === head.y)) return endSnake();
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10 + Math.floor(score / 100) * 5;
      document.getElementById('snakeScore').textContent = score.toLocaleString();
      if (score > best) {
        best = score;
        localStorage.setItem('snake_best', best);
        document.getElementById('snakeBest').textContent = 'Best: ' + best.toLocaleString();
      }
      placeFood();
    } else {
      snake.pop();
    }
    draw();
  }

  function placeFood() {
    let f;
    do { f = {x:Math.floor(Math.random()*GRID), y:Math.floor(Math.random()*GRID)}; }
    while (snake.some(s => s.x === f.x && s.y === f.y));
    food = f;
  }

  function draw() {
    const cs = canvas.width / GRID;
    ctx.fillStyle = '#06130a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Subtle grid
    ctx.strokeStyle = 'rgba(34,197,94,0.06)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i*cs,0); ctx.lineTo(i*cs,canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,i*cs); ctx.lineTo(canvas.width,i*cs); ctx.stroke();
    }
    // Food
    ctx.font = Math.floor(cs*0.78)+'px serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🍎', food.x*cs+cs/2, food.y*cs+cs/2);
    // Snake
    snake.forEach((seg, i) => {
      const x = seg.x*cs, y = seg.y*cs;
      const t = i/snake.length;
      const gr = Math.round(34+(16-34)*t), gg = Math.round(197+(185-197)*t), gb = Math.round(94+(129-94)*t);
      ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
      const pad = i===0?1:2, r = cs*0.35;
      roundRect(ctx, x+pad, y+pad, cs-pad*2, cs-pad*2, r);
      ctx.fill();
      if (i===0) {
        ctx.fillStyle='#fff';
        const ew = cs*0.12;
        const eo = getEyeOffsets(dir, cs);
        ctx.beginPath(); ctx.arc(x+eo[0], y+eo[1], ew, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+eo[2], y+eo[3], ew, 0, Math.PI*2); ctx.fill();
      }
    });
  }

  function getEyeOffsets(d, cs) {
    if (d.x===1)  return [cs*.72, cs*.3, cs*.72, cs*.7];
    if (d.x===-1) return [cs*.28, cs*.3, cs*.28, cs*.7];
    if (d.y===-1) return [cs*.3, cs*.28, cs*.7, cs*.28];
    return [cs*.3, cs*.72, cs*.7, cs*.72];
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
    ctx.closePath();
  }

  function drawWelcome() {
    if (!canvas||!ctx) return;
    ctx.fillStyle = '#06130a';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = 'rgba(34,197,94,0.85)';
    ctx.font = 'bold '+Math.floor(canvas.width*0.07)+'px Orbitron,Inter,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('SNAKE', canvas.width/2, canvas.height/2-24);
    ctx.font = Math.floor(canvas.width*0.05)+'px serif';
    ctx.fillText('🐍', canvas.width/2, canvas.height/2-80);
    ctx.font = Math.floor(canvas.width*0.038)+'px Inter,sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.fillText('Tap New Game or press any arrow to start', canvas.width/2, canvas.height/2+22);
  }

  function endSnake() {
    clearInterval(loop); running = false;
    submitLeaderScore('snake', playerName, score);
    document.getElementById('snakeOverIcon').textContent = score>200?'🏆':'🐍';
    document.getElementById('snakeOverTitle').textContent = score>200?'Amazing!':'Game Over!';
    document.getElementById('snakeOverScore').textContent = 'Score: '+score.toLocaleString()+' · Best: '+best.toLocaleString();
    document.getElementById('snakeOverlay').classList.remove('hidden');
    document.getElementById('snakeShareBtn').style.display='';
  }

  // Keyboard
  document.addEventListener('keydown', e => {
    const view = document.querySelector('.view.active');
    if (!view || view.id !== 'view-snake') return;
    if (!gameStarted) { startSnake(); }
    const map = {ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},a:{x:-1,y:0},d:{x:1,y:0},w:{x:0,y:-1},s:{x:0,y:1}};
    if (map[e.key]) {
      e.preventDefault();
      const nd = map[e.key];
      if (nd.x+dir.x!==0 || nd.y+dir.y!==0) nextDir = nd;
    }
  });

  // Touch
  let tx=0,ty=0;
  document.addEventListener('touchstart',e=>{
    const v=document.querySelector('.view.active');
    if(!v||v.id!=='view-snake')return;
    tx=e.touches[0].clientX; ty=e.touches[0].clientY;
  },{passive:true});
  document.addEventListener('touchend',e=>{
    const v=document.querySelector('.view.active');
    if(!v||v.id!=='view-snake')return;
    const dx=e.changedTouches[0].clientX-tx, dy=e.changedTouches[0].clientY-ty;
    if(!gameStarted){startSnake();return;}
    if(Math.max(Math.abs(dx),Math.abs(dy))<20) return;
    let nd;
    if(Math.abs(dx)>Math.abs(dy)) nd={x:dx>0?1:-1,y:0};
    else nd={x:0,y:dy>0?1:-1};
    if(nd.x+dir.x!==0||nd.y+dir.y!==0) nextDir=nd;
  },{passive:true});

  // Speed buttons
  document.querySelectorAll('[data-snake-speed]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-snake-speed]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      speed = SPEEDS[btn.dataset.snakeSpeed];
      if (running) { clearInterval(loop); loop=setInterval(tick,speed); }
    });
  });

  document.getElementById('snakeNewBtn').addEventListener('click', startSnake);
  document.getElementById('snakeRetryBtn').addEventListener('click', startSnake);

  function shareSnakeScore() {
    const text = 'I scored '+score.toLocaleString()+' on Snake at Youooo Games! Can you beat me? https://game.youooo.com';
    if (navigator.share) navigator.share({title:'Youooo Snake',text,url:'https://game.youooo.com'});
    else if (navigator.clipboard) navigator.clipboard.writeText(text).then(()=>alert('Copied! Paste to share.'));
  }
  document.getElementById('snakeShareBtn').addEventListener('click', shareSnakeScore);
  document.getElementById('snakeShareOverBtn').addEventListener('click', shareSnakeScore);
  document.getElementById('snakeLeaderBtn').addEventListener('click', ()=>openLeaderboard('snake'));

  // Expose init so navigation hook can call it
  window._initSnake = initSnakeView;
  if (document.querySelector('.view.active')?.id === 'view-snake') initSnakeView();
})();

// ════════════════════════════════════════════════════════════
// ██████  GLOBAL LEADERBOARD
// ════════════════════════════════════════════════════════════
function submitLeaderScore(game, name, score) {
  if (!score || score <= 0) return;
  name = String(name||'Guest').trim().slice(0,16) || 'Guest';
  const safeScore = parseInt(score)||0;
  db.ref('leaderboard/'+game).push({name:name, score:safeScore, ts:Date.now()}).catch(()=>{});
}

function openLeaderboard(tab) {
  tab = tab || 'snake';
  document.getElementById('leaderModal').classList.remove('hidden');
  document.querySelectorAll('.leader-tab').forEach(t=>t.classList.toggle('active', t.dataset.ltab===tab));
  loadLeaderboard(tab);
}

function loadLeaderboard(game) {
  const list = document.getElementById('leaderList');
  list.innerHTML = '<li class="leader-loading">Loading…</li>';
  db.ref('leaderboard/'+game).orderByChild('score').limitToLast(10).once('value', snap => {
    const rows = [];
    snap.forEach(c => rows.unshift(c.val()));
    if (!rows.length) { list.innerHTML='<li class="leader-loading">No scores yet — be the first!</li>'; return; }
    list.innerHTML = rows.map((r,i)=>{
      const rankClass = i===0?'gold':i===1?'silver':i===2?'bronze':'';
      const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
      const safe = String(r.name||'?').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
      return '<li><span class="leader-rank '+rankClass+'">'+medal+'</span><span class="leader-name">'+safe+'</span><span class="leader-score">'+Number(r.score).toLocaleString()+'</span></li>';
    }).join('');
  }).catch(()=>{ list.innerHTML='<li class="leader-loading">Could not load scores.</li>'; });
}

// Leaderboard modal open/close
document.getElementById('openLeaderBtn').addEventListener('click', ()=>openLeaderboard('snake'));
document.getElementById('closeLeaderModal').addEventListener('click', ()=>document.getElementById('leaderModal').classList.add('hidden'));
document.getElementById('leaderModal').addEventListener('click', e=>{ if(e.target===document.getElementById('leaderModal')) document.getElementById('leaderModal').classList.add('hidden'); });
document.querySelectorAll('.leader-tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.leader-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    loadLeaderboard(tab.dataset.ltab);
  });
});

// ── Hook Snake init into showView ─────────────────────────
const _origShowViewSnake = showView;
window.showView = function(name) {
  _origShowViewSnake(name);
  if (name==='snake' && window._initSnake) window._initSnake();
};
