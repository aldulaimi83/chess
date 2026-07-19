(() => {
  'use strict';

  const GAMES = [
    { id:'chess', title:'Chess', category:'Strategy', icon:'♟', color:'#9a6840', url:'classic-games.html#chess', description:'Strategy, tactics, AI challenges, and local play.', rating:'4.8' },
    { id:'checkers', title:'Checkers', category:'Strategy', icon:'⛀', color:'#7b6858', url:'classic-games.html#checkers', description:'Classic checkers against AI or a local opponent.', rating:'4.7' },
    { id:'gems-crush', title:'Gems Crush', category:'Match-3', icon:'💎', color:'#f2a15f', url:'classic-games.html#gems-crush', description:'Swap bright gems and build satisfying score chains.', rating:'4.8' },
    { id:'mesopotamia-mahjong', title:'Mesopotamia Mahjong', category:'Mahjong', icon:'✦', color:'#caa571', url:'mesopotamia-mahjong.html', description:'Match ancient clay tiles across handcrafted layouts.', rating:'4.9' },
    { id:'snake', title:'Snake', category:'Arcade', icon:'🐍', color:'#6fa654', url:'classic-games.html#snake', description:'Eat, grow, and survive in a polished arcade classic.', rating:'4.6' },
    { id:'merge-fruit', title:'Merge Fruit', category:'Arcade', icon:'🍉', color:'#ea7965', url:'classic-games.html#merge-fruit', description:'Drop and merge fruit to climb the score board.', rating:'4.7' },
    { id:'stickman-escape', title:'Stickman Escape', category:'Stickman', icon:'🏃', color:'#5d7faf', url:'stickman-escape.html', description:'Run, jump, dodge traps, and find the portal.', rating:'4.8' },
    { id:'stickman-arena', title:'Stickman Arena', category:'Stickman', icon:'⚔️', color:'#d15d5f', url:'stickman-arena.html', description:'Fight enemy waves and unlock arena weapons.', rating:'4.8' },
    { id:'stickman-maze-run', title:'Stickman Maze Run', category:'Stickman', icon:'🧩', color:'#8668ad', url:'stickman-maze-run.html', description:'Solve unpredictable platform mazes full of traps.', rating:'4.7' },
    { id:'stickman-smart-escape', title:'Stickman Smart Escape', category:'Stickman', icon:'🧠', color:'#2ca99d', url:'stickman-smart-escape.html', description:'Think through tricks, time traps, and escape.', rating:'4.9' },
    { id:'stickman-odyssey', title:'Stickman Odyssey', category:'Stickman', icon:'🗺️', color:'#6b999c', url:'stickman-odyssey.html', description:'Explore connected worlds with a yo-yo and whistle.', rating:'4.9' }
  ];

  const ACHIEVEMENTS = [
    { id:'first-play', icon:'▶', name:'First Steps', description:'Play your first game.', target:1, reward:10, type:'plays' },
    { id:'explorer', icon:'🧭', name:'Explorer', description:'Try five different games.', target:5, reward:25, type:'unique' },
    { id:'collector', icon:'♥', name:'Game Collector', description:'Add three games to favorites.', target:3, reward:30, type:'favorites' },
    { id:'devotee', icon:'🔥', name:'Daily Devotee', description:'Build a seven-day reward streak.', target:7, reward:75, type:'streak' },
    { id:'arcade-tour', icon:'🕹', name:'Arcade Tour', description:'Play ten total game sessions.', target:10, reward:50, type:'plays' },
    { id:'stickman-fan', icon:'⚡', name:'Stickman Fan', description:'Try four Stickman adventures.', target:4, reward:45, type:'stickman' }
  ];

  const DEMO_PLAYERS = ['PixelPanda','NeonNova','TurboTaco','MazeMaven','OrangeKnight','GemPilot','QuietRook','ArcadeAce','MahjongMoon','SwiftSnake'];
  const STORAGE_KEY = 'youooo_platform_state_v1';
  const today = () => new Date().toISOString().slice(0,10);
  const defaultState = { playerName:'Player One', coins:100, xp:0, favorites:[], recent:[], plays:[], rewardStreak:0, lastReward:'', rewardHistory:[] };

  const loadState = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return { ...defaultState, ...value, favorites:Array.isArray(value.favorites)?value.favorites:[], recent:Array.isArray(value.recent)?value.recent:[], plays:Array.isArray(value.plays)?value.plays:[], rewardHistory:Array.isArray(value.rewardHistory)?value.rewardHistory:[] };
    } catch (_) { return { ...defaultState }; }
  };
  let state = loadState();
  const saveState = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {} };
  const level = () => Math.floor(state.xp / 500) + 1;
  const xpIntoLevel = () => state.xp % 500;
  const uniquePlayed = () => [...new Set(state.plays.map(item => item.id))];
  const gameById = id => GAMES.find(game => game.id === id);
  const initials = name => name.split(/\s+/).map(part => part[0]).join('').slice(0,2).toUpperCase();

  const icons = { home:'⌂', dashboard:'▦', games:'🎮', leaderboards:'♜', achievements:'♙', rewards:'🎁', admin:'◇' };
  const pages = [
    ['home','Home','index.html'], ['dashboard','Dashboard','dashboard.html'], ['games','Game Library','games.html'],
    ['leaderboards','Leaderboards','leaderboards.html'], ['achievements','Achievements','achievements.html'],
    ['rewards','Daily Rewards','rewards.html'], ['admin','Admin','admin.html']
  ];

  const shell = page => `
    <a class="skip-link" href="#main-content">Skip to content</a>
    <div class="app-shell">
      <aside class="sidebar" aria-label="Main navigation">
        <a class="brand" href="index.html"><span class="brand-mark">Y</span><span>Youooo <span class="brand-accent">Games</span></span></a>
        <nav class="side-nav">${pages.map(([id,label,url]) => `<a class="nav-link" href="${url}"${page===id?' aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${icons[id]}</span>${label}</a>`).join('')}</nav>
        <div class="sidebar-note">Free browser games. Progress is stored on this device.</div>
      </aside>
      <button class="nav-scrim" type="button" aria-label="Close menu" data-close-nav></button>
      <header class="topbar">
        <button class="menu-button" type="button" data-menu aria-expanded="false" aria-label="Open menu">☰</button>
        <label class="top-search"><span aria-hidden="true">⌕</span><input type="search" data-global-search placeholder="Search games" aria-label="Search games"></label>
        <div class="player-bar"><span class="metric-pill">◉ <b data-coins>${state.coins}</b></span><span class="metric-pill xp-pill">⚡ <b data-xp>${state.xp}</b></span><span class="player-meta"><strong data-player>${state.playerName}</strong><small>Level <span data-level>${level()}</span></small></span><span class="avatar" aria-hidden="true">${initials(state.playerName)}</span></div>
      </header>
      <main class="main" id="main-content"><div class="content" data-page-content></div></main>
    </div>
    <div class="toast" data-toast role="status" aria-live="polite" hidden></div>`;

  const gameCard = game => {
    const selected = state.favorites.includes(game.id);
    return `<article class="game-card" data-game-card data-id="${game.id}" data-category="${game.category.toLowerCase()}" data-title="${game.title.toLowerCase()}">
      <div class="game-art" style="--game-color:${game.color}"><span aria-hidden="true">${game.icon}</span><span class="category-badge">${game.category}</span><button class="favorite-button" type="button" data-favorite="${game.id}" aria-pressed="${selected}" aria-label="${selected?'Remove':'Add'} ${game.title} ${selected?'from':'to'} favorites">${selected?'♥':'♡'}</button></div>
      <div class="game-body"><h3>${game.title}</h3><p>${game.description}</p><div class="game-meta"><span>★ ${game.rating}</span><span>Browser game</span></div><a class="button small" href="${game.url}" data-play="${game.id}">▷ Play Now</a></div>
    </article>`;
  };

  const stats = () => `<div class="stats-grid">
    <article class="stat-card"><span class="stat-icon">🎮</span><div><strong>${GAMES.length}</strong><span>Games</span></div></article>
    <article class="stat-card"><span class="stat-icon">▶</span><div><strong>${state.plays.length}</strong><span>Games played</span></div></article>
    <article class="stat-card"><span class="stat-icon">♥</span><div><strong>${state.favorites.length}</strong><span>Favorites</span></div></article>
    <article class="stat-card"><span class="stat-icon">⭐</span><div><strong>${level()}</strong><span>Your level</span></div></article>
  </div>`;

  const sectionGames = (title, games, link=true) => `<section class="section"><div class="section-head"><h2>${title}</h2>${link?'<a class="text-link" href="games.html">View all →</a>':''}</div><div class="game-grid">${games.map(gameCard).join('')}</div></section>`;
  const heading = (title, copy, eyebrow='Youooo Games') => `<header class="page-heading"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${copy}</p></header>`;
  const recentGames = () => state.recent.map(gameById).filter(Boolean);

  function renderHome() {
    const featured = GAMES.find(g=>g.id==='stickman-smart-escape');
    return `<section class="hero"><div class="hero-copy"><span class="eyebrow" style="color:white">Play something great</span><h1>Free browser games, made to feel good.</h1><p>Puzzles, strategy, arcade action, mahjong, and original stickman adventures. No downloads—just pick a game and play.</p><div class="hero-actions"><a class="button light" href="${featured.url}" data-play="${featured.id}">Play ${featured.title}</a><a class="button soft" href="games.html">Browse all games</a></div></div><div class="hero-art"><div class="hero-controller" aria-hidden="true">🎮</div></div></section>
      ${stats()}
      ${recentGames().length ? sectionGames('Continue Playing', recentGames().slice(0,4)) : ''}
      <section class="section"><div class="reward-hero"><div><span class="eyebrow" style="color:white">Today’s challenge</span><h2>Try three different games</h2><p>Explore the library and earn 75 coins for completing the demo challenge.</p></div><a class="button light" href="games.html">Take the challenge</a></div></section>
      ${sectionGames('Popular Games', [GAMES[9],GAMES[3],GAMES[7],GAMES[0]])}
      ${sectionGames('New Adventures', [GAMES[10],GAMES[8],GAMES[6],GAMES[2]])}
      <section class="section dashboard-grid"><div class="panel"><div class="section-head"><h2>Weekly Leaderboard</h2><a class="text-link" href="leaderboards.html">Full board →</a></div>${leaderRows(4)}</div><div class="panel"><span class="eyebrow">Daily reward</span><h2>${state.lastReward===today()?'Reward claimed':'Your next reward is ready'}</h2><p>Keep a local streak and collect coins and XP.</p><a class="button" href="rewards.html">Open Rewards</a></div></section>`;
  }

  function renderDashboard() {
    const unlocked = achievementData().filter(a=>a.unlocked).length;
    return `${heading('Your Dashboard','Your local game progress, favorites, rewards, and recent activity.','Player overview')}
      <section class="panel profile-card"><div class="profile-avatar">${initials(state.playerName)}</div><div><h2 style="margin-bottom:.25rem">${state.playerName}</h2><p style="margin-bottom:.7rem">Level ${level()} · ${state.xp} total XP</p><div class="progress" aria-label="${xpIntoLevel()} of 500 XP toward next level"><span style="width:${xpIntoLevel()/5}%"></span></div><small>${xpIntoLevel()} / 500 XP to Level ${level()+1}</small></div><div><strong>${state.coins} coins</strong><div style="margin-top:.6rem"><button class="button outline small" type="button" data-edit-profile>Edit profile</button></div></div></section>
      <div class="stats-grid"><article class="stat-card"><span class="stat-icon">▶</span><div><strong>${state.plays.length}</strong><span>Games played</span></div></article><article class="stat-card"><span class="stat-icon">⏱</span><div><strong>${Math.max(0,state.plays.length*4)}m</strong><span>Estimated play time</span></div></article><article class="stat-card"><span class="stat-icon">🏅</span><div><strong>${unlocked}</strong><span>Achievements</span></div></article><article class="stat-card"><span class="stat-icon">🔥</span><div><strong>${state.rewardStreak}</strong><span>Daily streak</span></div></article></div>
      ${recentGames().length?sectionGames('Recent Games',recentGames().slice(0,4)):sectionGames('Start Playing',GAMES.slice(0,4))}
      ${state.favorites.length?sectionGames('Your Favorites',state.favorites.map(gameById).filter(Boolean),false):'<section class="section"><h2>Your Favorites</h2><div class="empty-state">Tap the heart on any game to save it here.</div></section>'}
      <section class="section panel"><div class="section-head"><h2>Recent Activity</h2></div>${activityList()}</section>`;
  }

  function renderGames() {
    const categories=['All','Stickman','Mahjong','Arcade','Match-3','Strategy'];
    return `${heading('Game Library','Search and filter every game currently available on Youooo Games.','Eleven games · one place')}
      <div class="toolbar"><label class="search-box"><input type="search" data-library-search placeholder="Search games..." aria-label="Search game library"></label><button class="button outline" type="button" data-favorites-only aria-pressed="false">♡ Favorites only</button></div>
      <div class="chips" aria-label="Filter games by category">${categories.map((c,i)=>`<button class="chip${i===0?' active':''}" type="button" data-category-filter="${c.toLowerCase()}" aria-pressed="${i===0}">${c}</button>`).join('')}</div>
      <div class="game-grid" data-library-grid>${GAMES.map(gameCard).join('')}</div><div class="empty-state" data-library-empty hidden>No games match this filter.</div>`;
  }

  const demoScores = () => DEMO_PLAYERS.map((name,i)=>({name,score:1259-i*47,game:GAMES[i%GAMES.length].title,move:i%3===0?'↑':i%3===1?'—':'↓'}));
  function leaderRows(count=10, game='all') {
    const rows=demoScores().filter(row=>game==='all'||row.game===game).slice(0,count);
    return `<div class="leader-list">${rows.map((row,i)=>`<div class="leader-row"><span class="leader-rank">${i+1}</span><span class="avatar">${initials(row.name)}</span><span class="leader-player"><strong>${row.name}</strong><span>Demo player · ${row.game}</span></span><span aria-label="Rank movement">${row.move}</span><strong class="leader-score">${row.score.toLocaleString()}</strong></div>`).join('')}</div>`;
  }
  function renderLeaderboards() {
    const scores=demoScores();
    return `${heading('Leaderboards','Compare demo scores across the Youooo game catalog.','Weekly and all-time')}
      <p class="demo-note"><strong>Demo leaderboard:</strong> these names and scores are sample interface data, not actual player records.</p>
      <div class="chips" style="margin-top:20px"><button class="chip active" data-board-period="weekly" aria-pressed="true">Weekly</button><button class="chip" data-board-period="all" aria-pressed="false">All-time</button></div>
      <label class="search-box"><select data-board-game aria-label="Filter leaderboard by game" style="width:100%;min-height:48px;padding:.7rem 1rem;border:1px solid var(--line);border-radius:13px;background:var(--paper)"><option value="all">All games</option>${GAMES.map(g=>`<option>${g.title}</option>`).join('')}</select></label>
      <section class="podium">${[scores[1],scores[0],scores[2]].map((row,i)=>`<article class="podium-card${i===1?' first':''}"><div class="podium-rank">${i===1?'1':i===0?'2':'3'}</div><h2>${row.name}</h2><p>${row.game}</p><strong>${row.score.toLocaleString()}</strong></article>`).join('')}</section>
      <section class="panel" data-board-list>${leaderRows()}</section>`;
  }

  function achievementData() {
    const played=uniquePlayed();
    const stickman=played.filter(id=>gameById(id)?.category==='Stickman').length;
    return ACHIEVEMENTS.map(item=>{const progress=item.type==='plays'?state.plays.length:item.type==='unique'?played.length:item.type==='favorites'?state.favorites.length:item.type==='streak'?state.rewardStreak:stickman;return {...item,progress:Math.min(progress,item.target),unlocked:progress>=item.target};});
  }
  function renderAchievements() {
    const data=achievementData();
    return `${heading('Achievements','Unlock badges through game activity saved on this device.','Collect and progress')}
      <div class="stats-grid"><article class="stat-card"><span class="stat-icon">🏅</span><div><strong>${data.filter(a=>a.unlocked).length}/${data.length}</strong><span>Unlocked</span></div></article><article class="stat-card"><span class="stat-icon">⭐</span><div><strong>${data.filter(a=>a.unlocked).reduce((sum,a)=>sum+a.reward,0)}</strong><span>Reward points earned</span></div></article></div>
      <section class="section achievement-grid">${data.map(a=>`<article class="achievement-card${a.unlocked?'':' locked'}"><div class="achievement-top"><span class="achievement-icon">${a.unlocked?a.icon:'🔒'}</span><div><h2>${a.name}</h2><span class="reward-tag">★ ${a.reward} XP</span></div></div><p>${a.description}</p><div class="progress"><span style="width:${a.progress/a.target*100}%"></span></div><small>${a.progress}/${a.target} · ${a.unlocked?'Unlocked':'In progress'}</small></article>`).join('')}</section>`;
  }

  const rewardValues=[50,75,100,150,200,300,500];
  function renderRewards() {
    const claimed=state.lastReward===today();
    return `${heading('Daily Rewards','Come back each day to build a streak and collect local demo rewards.','Seven-day calendar')}
      <section class="reward-hero"><div><span class="eyebrow" style="color:white">Current streak</span><h2>${state.rewardStreak} day${state.rewardStreak===1?'':'s'}</h2><p>${claimed?'Today’s reward has been claimed.':'Today’s reward is ready.'}</p></div><button class="button light" type="button" data-claim-reward ${claimed?'disabled':''}>${claimed?'Claimed Today':'🎁 Claim Now'}</button></section>
      <section class="reward-days">${rewardValues.map((value,i)=>`<article class="reward-day${i===state.rewardStreak%7&&!claimed?' current':''}${i<state.rewardStreak%7||claimed&&i===(state.rewardStreak-1)%7?' claimed':''}"><strong>Day ${i+1}</strong><span class="reward-emoji">${i<4?'◉':i<6?'🎁':'🏆'}</span><strong>${value} coins</strong><span>${Math.round(value/2)} XP</span></article>`).join('')}</section>
      <section class="section dashboard-grid"><div class="panel"><h2>Daily Challenge</h2><p>Play three different games today. Challenge tracking is a local prototype.</p><a class="button" href="games.html">Browse Games</a></div><div class="panel"><h2>Reward History</h2>${state.rewardHistory.length?`<div class="history-list">${state.rewardHistory.slice(0,5).map(item=>`<div class="history-item"><span>🎁</span><p>${item.coins} coins and ${item.xp} XP</p><time>${item.date}</time></div>`).join('')}</div>`:'<div class="empty-state">No rewards claimed yet.</div>'}</div></section>`;
  }

  function renderAdmin() {
    const counts=GAMES.map(game=>({game,plays:state.plays.filter(p=>p.id===game.id).length})).sort((a,b)=>b.plays-a.plays);
    return `${heading('Admin Dashboard','A safe front-end prototype with local, non-sensitive activity summaries.','Prototype only')}
      <p class="demo-note"><strong>Public prototype:</strong> this page contains no private user data, privileged controls, or backend administration.</p>
      <section class="section admin-stats"><article class="stat-card"><span class="stat-icon">🎮</span><div><strong>${GAMES.length}</strong><span>Total games</span></div></article><article class="stat-card"><span class="stat-icon">👤</span><div><strong>1</strong><span>Local profile</span></div></article><article class="stat-card"><span class="stat-icon">▶</span><div><strong>${state.plays.length}</strong><span>Local launches</span></div></article><article class="stat-card"><span class="stat-icon">🏆</span><div><strong>${ACHIEVEMENTS.length}</strong><span>Achievements</span></div></article><article class="stat-card"><span class="stat-icon">💬</span><div><strong>0</strong><span>Feedback items</span></div></article></section>
      <section class="section dashboard-grid"><div class="panel"><h2>Most-played games</h2><div class="leader-list">${counts.slice(0,6).map((item,i)=>`<div class="leader-row"><span class="leader-rank">${i+1}</span><span>${item.game.icon}</span><span class="leader-player"><strong>${item.game.title}</strong><span>${item.game.category}</span></span><strong>${item.plays} launches</strong></div>`).join('')}</div></div><div class="panel"><h2>Session chart</h2><div class="chart" aria-label="Illustrative seven-day session chart">${[35,55,42,76,61,88,68].map((v,i)=>`<span class="chart-bar" style="--value:${v}%"><span>${i+1}</span></span>`).join('')}</div><p>Illustrative CSS chart. Connect to analytics later.</p></div></section>
      <section class="section panel"><h2>Recent local activity</h2>${activityList()}</section>`;
  }

  function activityList() {
    if(!state.plays.length) return '<div class="empty-state">No game activity on this device yet.</div>';
    return `<div class="activity-list">${state.plays.slice(0,8).map(item=>{const game=gameById(item.id);return game?`<div class="activity-item"><span>${game.icon}</span><p><strong>${game.title}</strong><br>Game launched</p><time>${new Date(item.at).toLocaleDateString()}</time></div>`:''}).join('')}</div>`;
  }

  const renderers={home:renderHome,dashboard:renderDashboard,games:renderGames,leaderboards:renderLeaderboards,achievements:renderAchievements,rewards:renderRewards,admin:renderAdmin};
  const page=document.body.dataset.page||'home';
  document.body.innerHTML=shell(page);
  const content=document.querySelector('[data-page-content]');
  content.innerHTML=(renderers[page]||renderHome)();

  const toast=message=>{const node=document.querySelector('[data-toast]');node.textContent=message;node.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.hidden=true,2400);};
  const syncMetrics=()=>{document.querySelectorAll('[data-coins]').forEach(n=>n.textContent=state.coins);document.querySelectorAll('[data-xp]').forEach(n=>n.textContent=state.xp);document.querySelectorAll('[data-level]').forEach(n=>n.textContent=level());};
  const closeNav=()=>{document.body.classList.remove('nav-open');const b=document.querySelector('[data-menu]');b?.setAttribute('aria-expanded','false');b?.setAttribute('aria-label','Open menu');};
  document.querySelector('[data-menu]')?.addEventListener('click',event=>{const open=!document.body.classList.contains('nav-open');document.body.classList.toggle('nav-open',open);event.currentTarget.setAttribute('aria-expanded',String(open));event.currentTarget.setAttribute('aria-label',open?'Close menu':'Open menu');});
  document.querySelector('[data-close-nav]')?.addEventListener('click',closeNav);
  document.querySelectorAll('.nav-link').forEach(link=>link.addEventListener('click',closeNav));
  addEventListener('keydown',event=>{if(event.key==='Escape')closeNav();});

  document.addEventListener('click',event=>{
    const favorite=event.target.closest('[data-favorite]');
    if(favorite){const id=favorite.dataset.favorite;state.favorites.includes(id)?state.favorites=state.favorites.filter(x=>x!==id):state.favorites.push(id);saveState();document.querySelectorAll(`[data-favorite="${id}"]`).forEach(button=>{const selected=state.favorites.includes(id);button.textContent=selected?'♥':'♡';button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-label',`${selected?'Remove':'Add'} ${gameById(id).title} ${selected?'from':'to'} favorites`);});toast(state.favorites.includes(id)?'Added to favorites':'Removed from favorites');applyLibraryFilters();return;}
    const play=event.target.closest('[data-play]');
    if(play){const id=play.dataset.play;state.plays.unshift({id,at:new Date().toISOString()});state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,6);state.xp+=10;saveState();syncMetrics();}
    const claim=event.target.closest('[data-claim-reward]');
    if(claim&&!claim.disabled){const last=state.lastReward;const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);state.rewardStreak=last===yesterday?state.rewardStreak+1:1;const coins=rewardValues[(state.rewardStreak-1)%7],xp=Math.round(coins/2);state.coins+=coins;state.xp+=xp;state.lastReward=today();state.rewardHistory.unshift({date:today(),coins,xp});saveState();content.innerHTML=renderRewards();syncMetrics();toast(`Reward claimed: ${coins} coins and ${xp} XP`);}
    const editProfile=event.target.closest('[data-edit-profile]');
    if(editProfile){const name=prompt('Player name',state.playerName)?.trim();if(name){state.playerName=name.slice(0,32);saveState();content.innerHTML=renderDashboard();document.querySelectorAll('[data-player]').forEach(node=>node.textContent=state.playerName);toast('Profile saved on this device');}}
    const category=event.target.closest('[data-category-filter]');
    if(category){document.querySelectorAll('[data-category-filter]').forEach(b=>{const active=b===category;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});applyLibraryFilters();}
    const favOnly=event.target.closest('[data-favorites-only]');
    if(favOnly){const active=favOnly.getAttribute('aria-pressed')!=='true';favOnly.setAttribute('aria-pressed',String(active));favOnly.textContent=active?'♥ Favorites only':'♡ Favorites only';applyLibraryFilters();}
    const period=event.target.closest('[data-board-period]');
    if(period){document.querySelectorAll('[data-board-period]').forEach(b=>{const active=b===period;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});toast(`${period.textContent} demo leaderboard selected`);}
  });

  function applyLibraryFilters(){
    const search=(document.querySelector('[data-library-search]')?.value||'').trim().toLowerCase();
    const category=document.querySelector('[data-category-filter][aria-pressed="true"]')?.dataset.categoryFilter||'all';
    const favorites=document.querySelector('[data-favorites-only]')?.getAttribute('aria-pressed')==='true';let visible=0;
    document.querySelectorAll('[data-game-card]').forEach(card=>{const show=(!search||card.dataset.title.includes(search))&&(category==='all'||card.dataset.category===category)&&(!favorites||state.favorites.includes(card.dataset.id));card.hidden=!show;if(show)visible++;});
    const empty=document.querySelector('[data-library-empty]');if(empty)empty.hidden=visible>0;
  }
  document.querySelector('[data-library-search]')?.addEventListener('input',applyLibraryFilters);
  document.querySelector('[data-board-game]')?.addEventListener('change',event=>{document.querySelector('[data-board-list]').innerHTML=leaderRows(10,event.target.value);});
  document.querySelector('[data-global-search]')?.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.value.trim())location.href=`games.html?q=${encodeURIComponent(event.target.value.trim())}`;});
  if(page==='games'){const query=new URLSearchParams(location.search).get('q');if(query){const input=document.querySelector('[data-library-search]');input.value=query;applyLibraryFilters();}}
})();
