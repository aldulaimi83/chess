/* ════════════════════════════════════════════════════════════
   YOUOOO GAMES — Chess · Checkers · Gems Crush · 2048
   ════════════════════════════════════════════════════════════ */
'use strict';

const db = firebase.database();

function getPlayerId() {
  let id = localStorage.getItem('youooo_pid');
  if (!id) { id = Math.random().toString(36).slice(2,10); localStorage.setItem('youooo_pid', id); }
  return id;
}
function genRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:6}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
}

// ── HUB NAVIGATION ───────────────────────────────────────────
document.querySelectorAll('.game-card').forEach(card => {
  card.addEventListener('click', () => showView(card.dataset.game));
});
document.querySelectorAll('.back-btn').forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.target));
});

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
  window.scrollTo(0, 0);
  if (name === 'chess')    requestAnimationFrame(()=>requestAnimationFrame(initChessView));
  if (name === 'checkers') initCheckersView();
  if (name === 'gems')     initGemsView();
  if (name === 't2048')    initT2048View();
}

// ════════════════════════════════════════════════════════════
// ██████  CHESS
// ════════════════════════════════════════════════════════════
let chessGame = null, chessBoard = null;
let chessMode = 'ai', chessDiff = 'medium';
let chessOnlineColor = 'w', chessRoomCode = null, chessOnlineRef = null;
const CVALS = {p:100,n:320,b:330,r:500,q:900,k:20000};

function initChessView() {
  if (chessBoard) { chessBoard.destroy(); chessBoard = null; }
  chessGame = new Chess();
  chessBoard = Chessboard('chessboard', {
    draggable: true, position: 'start',
    pieceTheme: 'https://raw.githubusercontent.com/oakmac/chessboardjs/master/website/img/chesspieces/wikipedia/{piece}.png',
    onDragStart: chOnDragStart, onDrop: chOnDrop,
    onSnapEnd: () => chessBoard.position(chessGame.fen()),
  });
  chessBoard.resize();
  updateChessStatus(); clearChessMoveHistory();
  document.getElementById('chessDiffCard').style.display = '';
}

function chOnDragStart(src, piece) {
  if (chessGame.game_over()) return false;
  if (chessMode === 'ai' && chessGame.turn() === 'b') return false;
  if (chessMode === 'online' && piece[0] !== chessOnlineColor) return false;
  if (chessGame.turn() === 'w' && piece[0] === 'b') return false;
  if (chessGame.turn() === 'b' && piece[0] === 'w') return false;
  return true;
}

function chOnDrop(src, tgt) {
  const m = chessGame.move({from:src,to:tgt,promotion:'q'});
  if (!m) return 'snapback';
  addChessMove(m.san);
  updateChessStatus();
  if (chessMode === 'ai') setTimeout(makeChessAiMove, 350);
  if (chessMode === 'online' && chessRoomCode) syncChessMove();
}

function makeChessAiMove() {
  if (chessGame.game_over()) return;
  const depth = {easy:1,medium:2,hard:3,expert:4}[chessDiff] || 2;
  if (chessDiff === 'easy') {
    const moves = chessGame.moves();
    chessGame.move(moves[Math.floor(Math.random()*moves.length)]);
  } else { chBestMove(depth); }
  chessBoard.position(chessGame.fen());
  addChessMove(chessGame.history().slice(-1)[0]);
  updateChessStatus();
}

function chBestMove(depth) {
  const moves = chessGame.moves({verbose:true});
  let best = null, bestScore = -Infinity;
  for (const m of moves) {
    chessGame.move(m);
    const s = -chNegamax(depth-1, -Infinity, Infinity);
    chessGame.undo();
    if (s > bestScore) { bestScore = s; best = m; }
  }
  if (best) chessGame.move(best);
}

function chNegamax(depth, alpha, beta) {
  if (depth === 0 || chessGame.game_over()) return chEval();
  let score = -Infinity;
  for (const m of chessGame.moves({verbose:true})) {
    chessGame.move(m);
    score = Math.max(score, -chNegamax(depth-1, -beta, -alpha));
    chessGame.undo();
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }
  return score;
}

function chEval() {
  let s = 0;
  const turn = chessGame.turn();
  for (const row of chessGame.board()) {
    for (const p of row) {
      if (!p) continue;
      const v = CVALS[p.type] || 0;
      s += p.color === turn ? v : -v;
    }
  }
  if (chessGame.in_checkmate()) s -= 100000;
  if (chessGame.in_check()) s -= 50;
  return s;
}

function updateChessStatus() {
  const el = document.getElementById('chessStatus'); if (!el) return;
  if (chessGame.in_checkmate()) el.textContent = `Checkmate! ${chessGame.turn()==='w'?'Black':'White'} wins! 🏆`;
  else if (chessGame.in_draw()) el.textContent = 'Draw! 🤝';
  else if (chessGame.in_check()) el.textContent = `${chessGame.turn()==='w'?'White':'Black'} is in check! ⚠️`;
  else el.textContent = `${chessGame.turn()==='w'?'White ♙':'Black ♟'}'s turn`;
}

function addChessMove(san) {
  const el = document.getElementById('chessMoveHistory'); if (!el || !san) return;
  const li = document.createElement('li'); li.textContent = san;
  el.appendChild(li); el.scrollTop = el.scrollHeight;
}
function clearChessMoveHistory() {
  const el = document.getElementById('chessMoveHistory'); if (el) el.innerHTML = '';
}

document.querySelectorAll('[data-chess-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-chess-mode]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); chessMode = btn.dataset.chessMode;
    const diffCard = document.getElementById('chessDiffCard');
    if (chessMode==='ai') { diffCard.style.display=''; initChessView(); }
    else if (chessMode==='local') { diffCard.style.display='none'; initChessView(); }
    else if (chessMode==='create') { diffCard.style.display='none'; openRoomModal('create','chess'); }
    else if (chessMode==='join') { diffCard.style.display='none'; openRoomModal('join','chess'); }
  });
});

document.querySelectorAll('[data-chess-diff]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-chess-diff]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); chessDiff = btn.dataset.chessDiff;
  });
});

document.getElementById('chessResetBtn').addEventListener('click', initChessView);
document.getElementById('chessFlipBtn').addEventListener('click', () => { if (chessBoard) chessBoard.flip(); });

function syncChessMove() {
  db.ref(`rooms/chess/${chessRoomCode}`).update({ fen: chessGame.fen(), turn: chessGame.turn() });
}
function listenChessRoom(code, myColor) {
  chessOnlineColor = myColor === 'white' ? 'w' : 'b';
  chessRoomCode = code; chessMode = 'online';
  if (chessOnlineRef) chessOnlineRef.off();
  chessOnlineRef = db.ref(`rooms/chess/${code}`);
  chessOnlineRef.on('value', snap => {
    const d = snap.val(); if (!d) return;
    if (d.fen && d.fen !== chessGame.fen()) {
      chessGame.load(d.fen); chessBoard.position(chessGame.fen()); updateChessStatus();
    }
    if (d.status === 'playing') document.getElementById('chessOnlineBadge').classList.remove('hidden');
  });
}

// ════════════════════════════════════════════════════════════
// ██████  CHECKERS
// ════════════════════════════════════════════════════════════
let ck = {
  board:[], turn:'red', selected:null, validMoves:[],
  mode:'ai', diff:'medium', redCap:0, blackCap:0,
  onlineColor:null, roomCode:null, onlineRef:null
};

function initCheckersView() {
  ck.board = [];
  for (let r=0;r<8;r++) {
    ck.board[r] = [];
    for (let c=0;c<8;c++) {
      if ((r+c)%2!==0) {
        if (r<3) ck.board[r][c]={color:'black',king:false};
        else if (r>4) ck.board[r][c]={color:'red',king:false};
        else ck.board[r][c]=null;
      } else ck.board[r][c]=null;
    }
  }
  ck.turn='red'; ck.selected=null; ck.validMoves=[];
  ck.redCap=0; ck.blackCap=0;
  renderCheckers(); updateCkStatus();
  document.getElementById('ckRedCaptures').textContent='0';
  document.getElementById('ckBlackCaptures').textContent='0';
}

function renderCheckers() {
  const grid = document.getElementById('checkersGrid'); if (!grid) return;
  grid.innerHTML = '';
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const cell = document.createElement('div');
    const isDark = (r+c)%2!==0;
    cell.className = `ck-cell ${isDark?'dark':'light'}`;
    const isValidMove = ck.validMoves.some(m=>m.tr===r&&m.tc===c);
    const isJump = ck.validMoves.some(m=>m.tr===r&&m.tc===c&&m.jump);
    if (isValidMove) cell.classList.add(isJump?'valid-jump':'valid-move');
    const piece = ck.board[r][c];
    if (piece) {
      const p = document.createElement('div');
      p.className = `ck-piece ${piece.color}${piece.king?' king':''}`;
      if (ck.selected&&ck.selected.r===r&&ck.selected.c===c) p.classList.add('selected');
      cell.appendChild(p);
    }
    cell.addEventListener('click', ()=>onCkClick(r,c));
    grid.appendChild(cell);
  }
}

function onCkClick(r, c) {
  if (ck.mode==='online'&&ck.turn!==ck.onlineColor) return;
  const piece = ck.board[r][c];
  const isValidDest = ck.validMoves.some(m=>m.tr===r&&m.tc===c);
  if (isValidDest&&ck.selected) { applyCkMove(ck.validMoves.find(m=>m.tr===r&&m.tc===c)); return; }
  if (piece&&piece.color===ck.turn) {
    ck.selected={r,c}; ck.validMoves=getCkMoves(r,c,ck.board);
    const allJumps=getAllCkJumps(ck.turn,ck.board);
    if (allJumps.length>0) ck.validMoves=ck.validMoves.filter(m=>m.jump);
    renderCheckers(); return;
  }
  ck.selected=null; ck.validMoves=[]; renderCheckers();
}

function getCkMoves(r,c,board) {
  const piece=board[r][c]; if (!piece) return [];
  const dirs=piece.color==='red'?[[-1,-1],[-1,1]]:[[1,-1],[1,1]];
  if (piece.king) dirs.push(...(piece.color==='red'?[[1,-1],[1,1]]:[[-1,-1],[-1,1]]));
  const moves=[],jumps=[];
  for (const [dr,dc] of dirs) {
    const nr=r+dr,nc=c+dc;
    if (nr<0||nr>7||nc<0||nc>7) continue;
    if (!board[nr][nc]) moves.push({fr:r,fc:c,tr:nr,tc:nc,jump:false});
    else if (board[nr][nc].color!==piece.color) {
      const jr=nr+dr,jc=nc+dc;
      if (jr>=0&&jr<=7&&jc>=0&&jc<=7&&!board[jr][jc])
        jumps.push({fr:r,fc:c,tr:jr,tc:jc,cr:nr,cc:nc,jump:true});
    }
  }
  return jumps.length?jumps:moves;
}

function getAllCkMoves(color,board) {
  const all=[];
  for (let r=0;r<8;r++) for (let c=0;c<8;c++)
    if (board[r][c]?.color===color) all.push(...getCkMoves(r,c,board));
  const jumps=all.filter(m=>m.jump);
  return jumps.length?jumps:all;
}

function getAllCkJumps(color,board) {
  const all=[];
  for (let r=0;r<8;r++) for (let c=0;c<8;c++)
    if (board[r][c]?.color===color) all.push(...getCkMoves(r,c,board).filter(x=>x.jump));
  return all;
}

function applyCkMove(move) {
  const b=deepCopyBoard(ck.board);
  const piece=b[move.fr][move.fc];
  b[move.tr][move.tc]=piece; b[move.fr][move.fc]=null;
  if (move.jump) {
    b[move.cr][move.cc]=null;
    if (piece.color==='red') { ck.redCap++; document.getElementById('ckRedCaptures').textContent=ck.redCap; }
    else { ck.blackCap++; document.getElementById('ckBlackCaptures').textContent=ck.blackCap; }
  }
  if (piece.color==='red'&&move.tr===0) piece.king=true;
  if (piece.color==='black'&&move.tr===7) piece.king=true;
  ck.board=b;
  if (move.jump) {
    const moreJumps=getCkMoves(move.tr,move.tc,ck.board).filter(m=>m.jump);
    if (moreJumps.length>0) {
      ck.selected={r:move.tr,c:move.tc}; ck.validMoves=moreJumps;
      renderCheckers(); updateCkStatus();
      if (ck.mode==='online'&&ck.onlineColor===ck.turn) syncCkBoard();
      return;
    }
  }
  ck.turn=ck.turn==='red'?'black':'red';
  ck.selected=null; ck.validMoves=[];
  if (ck.mode==='online'&&ck.onlineColor) syncCkBoard();
  renderCheckers(); updateCkStatus(); checkCkGameOver();
  if (!ckIsGameOver()&&ck.mode==='ai'&&ck.turn==='black') setTimeout(makeCkAiMove,500);
}

function deepCopyBoard(board) { return board.map(row=>row.map(cell=>cell?{...cell}:null)); }
function ckIsGameOver() { return getAllCkMoves('red',ck.board).length===0||getAllCkMoves('black',ck.board).length===0; }
function checkCkGameOver() {
  const el=document.getElementById('ckStatus'); if (!el) return;
  if (getAllCkMoves('red',ck.board).length===0) el.textContent='⚫ Black wins! 🏆';
  else if (getAllCkMoves('black',ck.board).length===0) el.textContent='🔴 Red wins! 🏆';
}
function updateCkStatus() {
  const el=document.getElementById('ckStatus'); if (!el) return;
  if (!ckIsGameOver()) el.textContent=`${ck.turn==='red'?'🔴 Red':'⚫ Black'}'s turn`;
}

function makeCkAiMove() {
  if (ck.mode!=='ai'||ckIsGameOver()) return;
  const moves=getAllCkMoves('black',ck.board); if (!moves.length) return;
  let move;
  if (ck.diff==='easy') move=moves[Math.floor(Math.random()*moves.length)];
  else if (ck.diff==='medium') { const j=moves.filter(m=>m.jump); move=j.length?j[Math.floor(Math.random()*j.length)]:moves[Math.floor(Math.random()*moves.length)]; }
  else move=ckMinimaxMove(3);
  ck.selected=null; ck.validMoves=[]; applyCkMove(move);
}

function ckMinimaxMove(depth) {
  const moves=getAllCkMoves('black',ck.board);
  let best=null,bestScore=-Infinity;
  for (const m of moves) {
    const saved=deepCopyBoard(ck.board),savedTurn=ck.turn,savedRed=ck.redCap,savedBlack=ck.blackCap;
    applyCkMoveSimulate(m,ck.board);
    const score=-ckMinimax(ck.board,depth-1,-Infinity,Infinity,'red');
    ck.board=saved; ck.turn=savedTurn; ck.redCap=savedRed; ck.blackCap=savedBlack;
    if (score>bestScore) { bestScore=score; best=m; }
  }
  return best||moves[0];
}

function applyCkMoveSimulate(move,board) {
  const piece=board[move.fr][move.fc];
  board[move.tr][move.tc]=piece?{...piece}:null; board[move.fr][move.fc]=null;
  if (move.jump&&board[move.cr]) board[move.cr][move.cc]=null;
  if (piece) {
    if (piece.color==='red'&&move.tr===0) piece.king=true;
    if (piece.color==='black'&&move.tr===7) piece.king=true;
  }
}

function ckMinimax(board,depth,alpha,beta,color) {
  const moves=getAllCkMoves(color,board);
  if (depth===0||!moves.length) return ckEvalBoard(board);
  let score=-Infinity;
  for (const m of moves) {
    const b2=deepCopyBoard(board); applyCkMoveSimulate(m,b2);
    const s=-ckMinimax(b2,depth-1,-beta,-alpha,color==='red'?'black':'red');
    score=Math.max(score,s); alpha=Math.max(alpha,s);
    if (alpha>=beta) break;
  }
  return score;
}

function ckEvalBoard(board) {
  let score=0;
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const p=board[r][c]; if (!p) continue;
    score+=p.color==='black'?(p.king?3:1):-(p.king?3:1);
  }
  return score;
}

document.querySelectorAll('[data-ck-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-ck-mode]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); ck.mode=btn.dataset.ckMode;
    const diffCard=document.getElementById('ckDiffCard');
    if (ck.mode==='ai') { diffCard.style.display=''; initCheckersView(); }
    else if (ck.mode==='local') { diffCard.style.display='none'; initCheckersView(); }
    else if (ck.mode==='create') { diffCard.style.display='none'; openRoomModal('create','checkers'); }
    else if (ck.mode==='join') { diffCard.style.display='none'; openRoomModal('join','checkers'); }
  });
});
document.querySelectorAll('[data-ck-diff]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-ck-diff]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); ck.diff=btn.dataset.ckDiff;
  });
});
document.getElementById('ckResetBtn').addEventListener('click', initCheckersView);

function syncCkBoard() {
  if (!ck.roomCode) return;
  db.ref(`rooms/checkers/${ck.roomCode}`).update({board:JSON.stringify(ck.board),turn:ck.turn});
}
function listenCkRoom(code,myColor) {
  ck.onlineColor=myColor; ck.roomCode=code; ck.mode='online';
  if (ck.onlineRef) ck.onlineRef.off();
  ck.onlineRef=db.ref(`rooms/checkers/${code}`);
  ck.onlineRef.on('value',snap=>{
    const d=snap.val(); if (!d) return;
    if (d.board) {
      const incoming=JSON.parse(d.board);
      if (JSON.stringify(incoming)!==JSON.stringify(ck.board)) {
        ck.board=incoming; ck.turn=d.turn; ck.selected=null; ck.validMoves=[];
        renderCheckers(); updateCkStatus();
      }
    }
    if (d.status==='playing') document.getElementById('ckOnlineBadge').classList.remove('hidden');
  });
}

// ════════════════════════════════════════════════════════════
// ██████  ONLINE ROOM MODAL
// ════════════════════════════════════════════════════════════
let _roomGame = null;

function openRoomModal(type,game) {
  _roomGame=game;
  const modal=document.getElementById('roomModal');
  modal.classList.remove('hidden');
  document.getElementById('createRoomPanel').classList.add('hidden');
  document.getElementById('joinRoomPanel').classList.add('hidden');
  document.getElementById('roomError').classList.add('hidden');
  if (type==='create') {
    document.getElementById('createRoomPanel').classList.remove('hidden');
    const code=genRoomCode();
    document.getElementById('displayRoomCode').textContent=code;
    document.getElementById('waitingText').textContent='Waiting for opponent...';
    createOnlineRoom(game,code);
  } else {
    document.getElementById('joinRoomPanel').classList.remove('hidden');
    document.getElementById('joinCodeInput').value='';
  }
}

function createOnlineRoom(game,code) {
  const ref=db.ref(`rooms/${game}/${code}`);
  const initData={game,status:'waiting',players:{host:getPlayerId(),guest:null},hostColor:'white'};
  if (game==='chess') initData.fen=new Chess().fen();
  if (game==='checkers') { initCheckersView(); initData.board=JSON.stringify(ck.board); initData.turn='red'; }
  ref.set(initData);
  ref.child('players/guest').on('value',snap=>{
    if (snap.val()) {
      document.getElementById('waitingText').textContent='Opponent joined! Starting...';
      ref.update({status:'playing'});
      setTimeout(()=>{
        document.getElementById('roomModal').classList.add('hidden');
        if (game==='chess') { chessMode='online'; listenChessRoom(code,'white'); }
        if (game==='checkers') listenCkRoom(code,'red');
      },1000);
    }
  });
}

document.getElementById('confirmJoinBtn').addEventListener('click',()=>{
  const code=document.getElementById('joinCodeInput').value.trim().toUpperCase();
  if (code.length<4) return;
  const ref=db.ref(`rooms/${_roomGame}/${code}`);
  ref.once('value',snap=>{
    const d=snap.val();
    if (!d||d.status!=='waiting') { document.getElementById('roomError').classList.remove('hidden'); return; }
    ref.child('players/guest').set(getPlayerId());
    ref.update({status:'playing'});
    document.getElementById('roomModal').classList.add('hidden');
    if (_roomGame==='chess') { chessMode='online'; listenChessRoom(code,'black'); }
    if (_roomGame==='checkers') { ck.board=JSON.parse(d.board); ck.turn=d.turn; renderCheckers(); updateCkStatus(); listenCkRoom(code,'black'); }
  });
});

document.getElementById('closeRoomModal').addEventListener('click',()=>{
  document.getElementById('roomModal').classList.add('hidden');
  if (_roomGame==='chess') { chessMode='ai'; document.querySelector('[data-chess-mode="ai"]').click(); }
  if (_roomGame==='checkers') { ck.mode='ai'; document.querySelector('[data-ck-mode="ai"]').click(); }
});

document.getElementById('copyRoomCodeBtn').addEventListener('click',()=>{
  const code=document.getElementById('displayRoomCode').textContent;
  navigator.clipboard.writeText(code).catch(()=>{});
  document.getElementById('copyRoomCodeBtn').textContent='Copied!';
  setTimeout(()=>document.getElementById('copyRoomCodeBtn').textContent='Copy Code',1500);
});

// ════════════════════════════════════════════════════════════
// ██████  GEMS CRUSH  (Match-3)
// ════════════════════════════════════════════════════════════
const GEMS_SIZE  = 8;
const GEMS_TYPES = 6;
const GEMS_BALANCE = {
  continueMoves: 4,
  maxReshuffles: 3,
  maxRowBlasts: 2,
  maxColBlasts: 2,
  wheelMoveReward: 3,
  wheelTrophyReward: 1
};
const GEMS_LEVELS = [
  { name:'Candy Meadow',   target:500,  moves:20, giftGoal:88,  multiplier:1.00, goal:'Warm up with simple matches and quick chains.' },
  { name:'Sugar Rush',     target:900,  moves:20, giftGoal:92,  multiplier:1.04, goal:'Build one cascade chain to speed up scoring.' },
  { name:'Jelly Harbor',   target:1325, moves:21, giftGoal:96,  multiplier:1.08, goal:'Aim for 4-gem clears to charge gifts faster.' },
  { name:'Mint Circuit',   target:1780, moves:21, giftGoal:100, multiplier:1.12, goal:'Use combos to stay ahead of the target.' },
  { name:'Neon Nougat',    target:2280, moves:22, giftGoal:104, multiplier:1.16, goal:'Large clears now matter more than small swaps.' },
  { name:'Caramel Core',   target:2840, moves:22, giftGoal:109, multiplier:1.20, goal:'Gift rewards become part of the winning strategy.' },
  { name:'Prism Pop',      target:3460, moves:23, giftGoal:114, multiplier:1.24, goal:'Chain multiple cascades for bonus multipliers.' },
  { name:'Velvet Taffy',   target:4160, moves:23, giftGoal:119, multiplier:1.28, goal:'Keep your move count healthy with smart gifts.' },
  { name:'Frost Fizz',     target:4950, moves:24, giftGoal:124, multiplier:1.32, goal:'5-gem clears give the biggest swing in score.' },
  { name:'Galaxy Gummies', target:5840, moves:24, giftGoal:130, multiplier:1.36, goal:'Push for aggressive boards and color-heavy matches.' },
  { name:'Meteor Mints',   target:6840, moves:25, giftGoal:136, multiplier:1.40, goal:'Cascades and gifts decide this stage.' },
  { name:'Infinity Candy', target:7960, moves:25, giftGoal:142, multiplier:1.44, goal:'Endless-style pressure. Maximize every move.' },
  { name:'Royal Jelly',    target:9220, moves:26, giftGoal:148, multiplier:1.49, goal:'Trophy runs begin here. Keep building power hits.' },
  { name:'Comet Crunch',   target:10640,moves:26, giftGoal:154, multiplier:1.54, goal:'Use the wheel for momentum, not recovery.' },
  { name:'Aurora Pops',    target:12220,moves:27, giftGoal:160, multiplier:1.60, goal:'Board wipes should create scoring avalanches.' },
  { name:'Starlight Toffee',target:13980,moves:27,giftGoal:167, multiplier:1.66, goal:'Big matches and trophy play decide the finish.' },
  { name:'Crown Candy',    target:15940,moves:28, giftGoal:174, multiplier:1.72, goal:'Final preset world. Master continues, spins, and powers.' }
];

let gemsGrid     = [];   // 2D array of gem type (0-5) or null
let gemsSelected = null; // {r,c}
let gemsScore    = 0;
let gemsLevel    = 1;
let gemsMoves    = 20;
let gemsBest     = 0;
let gemsAnimating= false;
let gemsLevelScore = 0;
let gemsCombo    = 1;
let gemsCascadeDepth = 0;
let gemsGiftCharge = 0;
let gemsGiftReady = false;
let gemsRewardText = 'Big matches and cascades charge your gift meter.';
let gemsCurrentConfig = GEMS_LEVELS[0];
let gemsLevelTarget = gemsCurrentConfig.target;
let gemsWon      = false;
let gemsTrophies = 0;
let gemsContinuesUsed = 0;
let gemsContinueAvailable = true;
let gemsReshuffles = 1;
let gemsRowBlasts = 0;
let gemsColBlasts = 0;
let gemsSpinAnimating = false;
let gemsPendingPower = null;
let gemsToastTimer = null;
let gemsAudioEnabled = localStorage.getItem('gems_audio') !== 'off';
let gemsAudioContext = null;
let gemsAudioUnlocked = false;
let gemsPlayerName = localStorage.getItem('gems_player_name') || 'Guest';
let gemsHighScores = loadGemsHighScores();

function loadGemsHighScores() {
  try {
    const raw = localStorage.getItem('gems_high_scores');
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveGemsHighScores() {
  localStorage.setItem('gems_high_scores', JSON.stringify(gemsHighScores));
}

function normalizeGemsPlayerName(name) {
  const cleaned = String(name || '').trim().replace(/\s+/g, ' ');
  return cleaned || 'Guest';
}

function initGemsView() {
  gemsPlayerName = normalizeGemsPlayerName(localStorage.getItem('gems_player_name') || gemsPlayerName);
  gemsBest = parseInt(gemsHighScores[gemsPlayerName] || '0');
  gemsTrophies = parseInt(localStorage.getItem('gems_trophies') || '0');
  document.getElementById('gemsBest').textContent = `Best: ${gemsBest.toLocaleString()}`;
  document.getElementById('gemsBestOwner').textContent = `Player: ${gemsPlayerName}`;
  document.getElementById('gemsTrophies').textContent = `Trophies: ${gemsTrophies.toLocaleString()}`;
  document.getElementById('gemsPlayerName').value = gemsPlayerName;
  updateGemsSoundButton();
  gemsNewGame();
}

function gemsNewGame() {
  gemsScore = 0;
  gemsGiftCharge = 0;
  gemsGiftReady = false;
  gemsContinuesUsed = 0;
  gemsRowBlasts = 0;
  gemsColBlasts = 0;
  gemsReshuffles = 1;
  gemsPendingPower = null;
  gemsRewardText = 'Big matches and cascades charge your gift meter.';
  gemsStartLevel(1, true);
}

function gemsGetLevelConfig(level) {
  const preset = GEMS_LEVELS[level - 1];
  if (preset) return preset;
  const extra = level - GEMS_LEVELS.length;
  const last = GEMS_LEVELS[GEMS_LEVELS.length - 1];
  return {
    name: `Infinity Candy ${level}`,
    target: last.target + (extra * 2200),
    moves: last.moves + Math.min(extra, 6),
    giftGoal: last.giftGoal + (extra * 5),
    multiplier: Math.min(2.1, last.multiplier + (extra * 0.05)),
    goal: 'Endless challenge. Use gifts and cascades to outrun the target.'
  };
}

function gemsStartLevel(level, resetTotalScore = false) {
  gemsLevel = level;
  gemsCurrentConfig = gemsGetLevelConfig(level);
  gemsLevelTarget = gemsCurrentConfig.target;
  gemsMoves = gemsCurrentConfig.moves;
  gemsLevelScore = 0;
  gemsCombo = 1;
  gemsCascadeDepth = 0;
  gemsSelected = null;
  gemsWon = false;
  gemsAnimating = false;
  gemsPendingPower = null;
  gemsContinueAvailable = true;
  gemsReshuffles = Math.min(GEMS_BALANCE.maxReshuffles, 1 + (gemsLevel % 7 === 0 ? 1 : 0));
  gemsRowBlasts = Math.min(GEMS_BALANCE.maxRowBlasts, Math.min(gemsRowBlasts, 1) + (gemsLevel % 5 === 0 ? 1 : 0));
  gemsColBlasts = Math.min(GEMS_BALANCE.maxColBlasts, Math.min(gemsColBlasts, 1) + (gemsLevel % 8 === 0 ? 1 : 0));
  if (resetTotalScore) gemsScore = 0;
  document.getElementById('gemsOverlay').classList.add('hidden');
  gemsBuildGrid();
  gemsEnsurePlayableBoard();
  gemsUpdateUI();
  gemsRender();
}

function gemsReplayCurrentLevel(resetTotalScore = true) {
  gemsGiftCharge = 0;
  gemsGiftReady = false;
  gemsPendingPower = null;
  gemsRewardText = resetTotalScore
    ? `Level ${gemsLevel} restarted. Score reset.`
    : `Level ${gemsLevel} restarted.`;
  gemsStartLevel(gemsLevel, resetTotalScore);
}

function gemsBuildGrid() {
  gemsGrid = [];
  for (let r=0;r<GEMS_SIZE;r++) {
    gemsGrid[r] = [];
    for (let c=0;c<GEMS_SIZE;c++) {
      let type;
      do { type = Math.floor(Math.random()*GEMS_TYPES); }
      while (gemsWouldMatch(r,c,type));
      gemsGrid[r][c] = type;
    }
  }
}

function gemsCloneGrid(grid) {
  return grid.map(row => [...row]);
}

function gemsWouldMatch(r,c,type) {
  if (c>=2 && gemsGrid[r][c-1]===type && gemsGrid[r][c-2]===type) return true;
  if (r>=2 && gemsGrid[r-1]?.[c]===type && gemsGrid[r-2]?.[c]===type) return true;
  return false;
}

function gemsHasImmediateMatches(grid = gemsGrid) {
  for (let r = 0; r < GEMS_SIZE; r++) {
    for (let c = 0; c < GEMS_SIZE; c++) {
      const type = grid[r][c];
      if (type === null) continue;
      if (c <= GEMS_SIZE - 3 && grid[r][c + 1] === type && grid[r][c + 2] === type) return true;
      if (r <= GEMS_SIZE - 3 && grid[r + 1][c] === type && grid[r + 2][c] === type) return true;
    }
  }
  return false;
}

function gemsHasPossibleMove(grid = gemsGrid) {
  const dirs = [[0, 1], [1, 0]];
  for (let r = 0; r < GEMS_SIZE; r++) {
    for (let c = 0; c < GEMS_SIZE; c++) {
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= GEMS_SIZE || nc >= GEMS_SIZE) continue;
        const copy = gemsCloneGrid(grid);
        [copy[r][c], copy[nr][nc]] = [copy[nr][nc], copy[r][c]];
        if (gemsHasImmediateMatches(copy)) return true;
      }
    }
  }
  return false;
}

function gemsEnsurePlayableBoard() {
  let attempts = 0;
  while ((!gemsHasPossibleMove() || gemsHasImmediateMatches()) && attempts < 40) {
    gemsBuildGrid();
    attempts++;
  }
}

function gemsRender() {
  const board = document.getElementById('gemsBoard');
  if (!board) return;
  board.innerHTML = '';
  for (let r=0;r<GEMS_SIZE;r++) for (let c=0;c<GEMS_SIZE;c++) {
    const cell = document.createElement('div');
    const type = gemsGrid[r][c];
    cell.className = `gem-cell gem-${type}`;
    cell.dataset.r = r; cell.dataset.c = c;
    cell.addEventListener('click', () => gemsOnClick(r, c));
    if (gemsPendingPower === 'row') cell.classList.add('power-target-row');
    if (gemsPendingPower === 'col') cell.classList.add('power-target-col');
    board.appendChild(cell);
  }
}

function updateGemsSoundButton() {
  const btn = document.getElementById('gemsSoundBtn');
  if (!btn) return;
  btn.textContent = gemsAudioEnabled ? '🔊 Sound On' : '🔈 Sound Off';
}

function updateGemsPlayerProfile() {
  gemsPlayerName = normalizeGemsPlayerName(document.getElementById('gemsPlayerName')?.value || gemsPlayerName);
  localStorage.setItem('gems_player_name', gemsPlayerName);
  gemsBest = parseInt(gemsHighScores[gemsPlayerName] || '0');
  document.getElementById('gemsBest').textContent = `Best: ${gemsBest.toLocaleString()}`;
  document.getElementById('gemsBestOwner').textContent = `Player: ${gemsPlayerName}`;
  document.getElementById('gemsPlayerName').value = gemsPlayerName;
}

function initGemsAudio() {
  if (!gemsAudioEnabled) return null;
  if (!window.AudioContext && !window.webkitAudioContext) return null;
  if (!gemsAudioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    gemsAudioContext = new Ctx();
  }
  if (gemsAudioContext.state === 'suspended') {
    gemsAudioContext.resume().catch(() => {});
  }
  return gemsAudioContext;
}

function unlockGemsAudio() {
  if (!gemsAudioEnabled) return;
  const ctx = initGemsAudio();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  if (gemsAudioUnlocked) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.00001, now);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.01);
  gemsAudioUnlocked = true;
}

function gemsPlaySound(type) {
  const ctx = initGemsAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.connect(ctx.destination);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.14, now + 0.01);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

  const voice = (freq, start, dur, wave = 'sine', endFreq = freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, now + start);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + start + dur);
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.02);
  };

  if (type === 'select') voice(520, 0, 0.07, 'triangle', 620);
  else if (type === 'badSwap') voice(240, 0, 0.12, 'sawtooth', 180);
  else if (type === 'match') {
    voice(440, 0, 0.09, 'triangle', 520);
    voice(660, 0.06, 0.12, 'sine', 820);
  } else if (type === 'cascade') {
    voice(520, 0, 0.08, 'triangle', 660);
    voice(660, 0.05, 0.1, 'triangle', 840);
    voice(880, 0.1, 0.12, 'sine', 1100);
  } else if (type === 'reshuffle') {
    voice(280, 0, 0.18, 'sawtooth', 520);
    voice(520, 0.08, 0.16, 'triangle', 340);
  } else if (type === 'spin') {
    for (let i = 0; i < 5; i++) voice(350 + (i * 90), i * 0.05, 0.08, 'triangle', 420 + (i * 90));
  } else if (type === 'reward') {
    voice(620, 0, 0.1, 'triangle', 820);
    voice(820, 0.06, 0.14, 'triangle', 1180);
  } else if (type === 'power') {
    voice(190, 0, 0.22, 'square', 120);
    voice(640, 0.08, 0.16, 'sawtooth', 280);
  } else if (type === 'win') {
    voice(520, 0, 0.14, 'triangle', 780);
    voice(780, 0.1, 0.16, 'triangle', 1040);
    voice(1040, 0.2, 0.22, 'sine', 1320);
  } else if (type === 'lose') {
    voice(320, 0, 0.2, 'sawtooth', 180);
    voice(220, 0.1, 0.18, 'triangle', 140);
  }
}

function gemsOnClick(r, c) {
  unlockGemsAudio();
  if (gemsAnimating || gemsWon || gemsSpinAnimating) return;
  if (gemsMoves <= 0) return;

  if (gemsPendingPower === 'row') {
    gemsUseLinePower('row', r);
    return;
  }
  if (gemsPendingPower === 'col') {
    gemsUseLinePower('col', c);
    return;
  }

  if (!gemsSelected) {
    gemsSelected = {r, c};
    gemsPlaySound('select');
    gemsRender();
    const cell = gemsGetCell(r, c);
    if (cell) cell.classList.add('selected');
    return;
  }

  const {r: sr, c: sc} = gemsSelected;
  gemsSelected = null;

  // Same cell — deselect
  if (sr === r && sc === c) { gemsRender(); return; }

  // Must be adjacent
  const dist = Math.abs(sr-r) + Math.abs(sc-c);
  if (dist !== 1) {
    // Re-select new cell if clicking non-adjacent
    gemsSelected = {r, c};
    gemsRender();
    gemsGetCell(r, c)?.classList.add('selected');
    return;
  }

  // Attempt swap
  gemsSwapTiles(sr, sc, r, c);
}

function gemsGetCell(r, c) {
  return document.querySelector(`#gemsBoard .gem-cell[data-r="${r}"][data-c="${c}"]`);
}

function gemsSwapTiles(r1, c1, r2, c2) {
  // Swap in grid
  [gemsGrid[r1][c1], gemsGrid[r2][c2]] = [gemsGrid[r2][c2], gemsGrid[r1][c1]];
  const matches = gemsAnalyzeMatches();

  if (matches.count === 0) {
    // Swap back — no match
    [gemsGrid[r1][c1], gemsGrid[r2][c2]] = [gemsGrid[r2][c2], gemsGrid[r1][c1]];
    gemsPlaySound('badSwap');
    gemsRender();
    // Shake effect
    const c1el = gemsGetCell(r1,c1), c2el = gemsGetCell(r2,c2);
    [c1el,c2el].forEach(el => { if(el){el.classList.add('swapping');setTimeout(()=>el.classList.remove('swapping'),220);} });
    return;
  }

  gemsMoves--;
  gemsAnimating = true;
  gemsCascadeDepth = 0;
  gemsCombo = 1;
  gemsRewardText = 'Match confirmed. Let the cascade roll.';
  gemsPlaySound('match');
  gemsRender();
  setTimeout(() => gemsClearAndCascade(), 50);
}

function gemsAnalyzeMatches() {
  const matched = new Set();
  const groups = [];
  // Horizontal
  for (let r=0;r<GEMS_SIZE;r++) {
    let run=1;
    for (let c=1;c<GEMS_SIZE;c++) {
      if (gemsGrid[r][c]!==null && gemsGrid[r][c]===gemsGrid[r][c-1]) {
        run++;
      } else {
        if (run>=3) {
          const group = [];
          for (let k=c-run;k<c;k++) {
            matched.add(`${r},${k}`);
            group.push({r,c:k});
          }
          groups.push(group);
        }
        run=1;
      }
    }
    if (run>=3) {
      const group = [];
      for (let k=GEMS_SIZE-run;k<GEMS_SIZE;k++) {
        matched.add(`${r},${k}`);
        group.push({r,c:k});
      }
      groups.push(group);
    }
  }
  // Vertical
  for (let c=0;c<GEMS_SIZE;c++) {
    let run=1;
    for (let r=1;r<GEMS_SIZE;r++) {
      if (gemsGrid[r][c]!==null && gemsGrid[r][c]===gemsGrid[r-1][c]) {
        run++;
      } else {
        if (run>=3) {
          const group = [];
          for (let k=r-run;k<r;k++) {
            matched.add(`${k},${c}`);
            group.push({r:k,c});
          }
          groups.push(group);
        }
        run=1;
      }
    }
    if (run>=3) {
      const group = [];
      for (let k=GEMS_SIZE-run;k<GEMS_SIZE;k++) {
        matched.add(`${k},${c}`);
        group.push({r:k,c});
      }
      groups.push(group);
    }
  }
  const coords = [...matched].map(s=>{ const [r,c]=s.split(','); return {r:+r,c:+c}; });
  const largestRun = groups.reduce((max, group) => Math.max(max, group.length), 0);
  return { coords, groups, largestRun, count: coords.length };
}

function gemsClearAndCascade() {
  const analysis = gemsAnalyzeMatches();
  if (analysis.count === 0) {
    gemsAnimating = false;
    gemsCombo = 1;
    if (!gemsHasPossibleMove()) {
      gemsRewardText = gemsReshuffles > 0
        ? 'No more moves on the board. Use reshuffle to continue.'
        : 'No more moves and no reshuffles left.';
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

  const basePts = analysis.count * 12;
  const sizeBonus = analysis.groups.reduce((sum, group) => {
    if (group.length >= 5) return sum + 120 + ((group.length - 5) * 35);
    if (group.length === 4) return sum + 45;
    return sum;
  }, 0);
  const cascadeBonus = Math.max(0, gemsCascadeDepth - 1) * 35;
  const multiplier = (gemsCurrentConfig.multiplier || 1) + Math.max(0, gemsCascadeDepth - 1) * 0.15;
  const pts = Math.round((basePts + sizeBonus + cascadeBonus) * multiplier);
  gemsScore += pts;
  gemsLevelScore += pts;
  gemsChargeGiftMeter(analysis);
  gemsAwardPowerProgress(analysis);

  if (analysis.largestRun >= 5) {
    gemsRewardText = `Mega bonus: ${pts} pts with a ${analysis.largestRun}-gem clear.`;
    gemsShowToast('Delicious!');
    gemsPlaySound('cascade');
  } else if (gemsCascadeDepth > 1) {
    gemsRewardText = `Cascade x${gemsCascadeDepth} earned ${pts} pts.`;
    gemsShowToast(`Sweet x${gemsCascadeDepth}!`);
    gemsPlaySound('cascade');
  } else {
    gemsRewardText = `Clean match: +${pts} pts.`;
  }

  // Animate pop
  analysis.coords.forEach(({r,c}) => {
    const cell = gemsGetCell(r,c);
    if (cell) cell.classList.add('matched');
    gemsGrid[r][c] = null;
  });

  setTimeout(() => {
    gemsApplyGravity();
    gemsFillEmpty();
    gemsRender();
    // Cascade: check for new matches
    setTimeout(() => gemsClearAndCascade(), 300);
  }, 300);
}

function gemsApplyGravity() {
  for (let c=0;c<GEMS_SIZE;c++) {
    let empty = GEMS_SIZE-1;
    for (let r=GEMS_SIZE-1;r>=0;r--) {
      if (gemsGrid[r][c] !== null) {
        gemsGrid[empty][c] = gemsGrid[r][c];
        if (empty !== r) gemsGrid[r][c] = null;
        empty--;
      }
    }
  }
}

function gemsFillEmpty() {
  for (let r=0;r<GEMS_SIZE;r++) for (let c=0;c<GEMS_SIZE;c++) {
    if (gemsGrid[r][c] === null) gemsGrid[r][c] = Math.floor(Math.random()*GEMS_TYPES);
  }
}

function gemsShowToast(message) {
  const el = document.getElementById('gemsStatusToast');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  el.classList.add('visible');
  clearTimeout(gemsToastTimer);
  gemsToastTimer = setTimeout(() => {
    el.classList.remove('visible');
    el.classList.add('hidden');
  }, 1200);
}

function gemsCelebrate(mode = 'win') {
  const layer = document.getElementById('gemsCelebration');
  if (!layer) return;
  layer.innerHTML = '';
  const icons = mode === 'win'
    ? ['🎉', '✨', '💖', '🍬', '🏆', '🌟']
    : ['✨', '🍭', '💥', '🍬'];
  for (let i = 0; i < 18; i++) {
    const piece = document.createElement('span');
    piece.className = 'gems-confetti';
    piece.textContent = icons[i % icons.length];
    piece.style.left = `${5 + Math.random() * 90}%`;
    piece.style.animationDelay = `${Math.random() * 0.25}s`;
    piece.style.animationDuration = `${1.6 + Math.random() * 0.9}s`;
    layer.appendChild(piece);
  }
  layer.classList.remove('hidden');
  layer.classList.add('active');
  setTimeout(() => {
    layer.classList.remove('active');
    layer.classList.add('hidden');
    layer.innerHTML = '';
  }, 2600);
}

function gemsUpdateUI() {
  document.getElementById('gemsScore').textContent = gemsScore.toLocaleString();
  document.getElementById('gemsMoves').textContent = gemsMoves;
  document.getElementById('gemsLevelNum').textContent = gemsLevel;
  document.getElementById('gemsStageName').textContent = gemsCurrentConfig.name;
  document.getElementById('gemsTrophies').textContent = `Trophies: ${gemsTrophies.toLocaleString()}`;
  document.getElementById('gemsTargetTxt').textContent = `Target: ${gemsLevelTarget.toLocaleString()}`;
  document.getElementById('gemsGoalTxt').textContent = `Goal: ${gemsCurrentConfig.goal}`;
  document.getElementById('gemsShellSubtitle').textContent = gemsRewardText;
  const pct = Math.min(100, (gemsLevelScore / gemsLevelTarget) * 100);
  document.getElementById('gemsProgressFill').style.width = `${pct}%`;
  document.getElementById('gemsComboNum').textContent = `x${gemsCombo}`;
  document.getElementById('gemsShellBadge').textContent = gemsGiftReady ? 'Wheel Ready' : `Sweet x${gemsCombo}`;
  const giftPct = Math.min(100, (gemsGiftCharge / gemsCurrentConfig.giftGoal) * 100);
  document.getElementById('gemsGiftFill').style.width = `${giftPct}%`;
  document.getElementById('gemsGiftTxt').textContent = gemsGiftReady
    ? 'Gift Meter: Ready to open'
    : `Gift Meter: ${Math.round(giftPct)}%`;
  document.getElementById('gemsRewardText').textContent = gemsRewardText;
  const giftBtn = document.getElementById('gemsGiftBtn');
  giftBtn.disabled = !gemsGiftReady || gemsAnimating || gemsWon || gemsSpinAnimating;
  giftBtn.textContent = gemsGiftReady ? '🎡 Spin Wheel' : '🎡 Charging...';
  document.getElementById('gemsContinueTxt').textContent = gemsContinueAvailable
    ? 'Continue: ready'
    : 'Continue: used';
  document.getElementById('gemsReshuffleCount').textContent = gemsReshuffles;
  document.getElementById('gemsRowBlastCount').textContent = gemsRowBlasts;
  document.getElementById('gemsColBlastCount').textContent = gemsColBlasts;
  document.getElementById('gemsReshuffleBtn').disabled = gemsReshuffles <= 0 || gemsAnimating || gemsWon;
  document.getElementById('gemsRowBlastBtn').disabled = gemsRowBlasts <= 0 || gemsAnimating || gemsWon || gemsSpinAnimating;
  document.getElementById('gemsColBlastBtn').disabled = gemsColBlasts <= 0 || gemsAnimating || gemsWon || gemsSpinAnimating;
  if (gemsScore > gemsBest) {
    gemsBest = gemsScore;
    gemsHighScores[gemsPlayerName] = gemsBest;
    saveGemsHighScores();
    document.getElementById('gemsBest').textContent = `Best: ${gemsBest.toLocaleString()}`;
    document.getElementById('gemsBestOwner').textContent = `Player: ${gemsPlayerName}`;
  }
}

function gemsChargeGiftMeter(analysis) {
  if (gemsGiftReady) return;
  gemsGiftCharge += (analysis.count * 8) + (analysis.groups.length * 5) + (analysis.largestRun >= 5 ? 18 : 0);
  if (gemsGiftCharge >= gemsCurrentConfig.giftGoal) {
    gemsGiftCharge = gemsCurrentConfig.giftGoal;
    gemsGiftReady = true;
    gemsRewardText = 'Gift ready. Open it for moves, points, a blast, or a fresh board.';
  }
}

function gemsAwardPowerProgress(analysis) {
  if (analysis.largestRun >= 5) {
    gemsRowBlasts = Math.min(GEMS_BALANCE.maxRowBlasts, gemsRowBlasts + 1);
  }
  if (analysis.largestRun >= 6 || (analysis.largestRun >= 5 && gemsCascadeDepth >= 2)) {
    gemsColBlasts = Math.min(GEMS_BALANCE.maxColBlasts, gemsColBlasts + 1);
  }
  if (gemsCascadeDepth >= 3) {
    gemsReshuffles = Math.min(GEMS_BALANCE.maxReshuffles, gemsReshuffles + 1);
  }
}

function gemsShuffleBoard() {
  let safety = 0;
  do {
    gemsBuildGrid();
    safety++;
  } while ((!gemsHasPossibleMove() || gemsHasImmediateMatches()) && safety < 60);
}

function gemsTriggerReshuffle(spendCharge = true, freeAuto = false) {
  if (spendCharge && gemsReshuffles <= 0) return;
  if (spendCharge) gemsReshuffles--;
  gemsPendingPower = null;
  gemsSelected = null;
  gemsShuffleBoard();
  gemsRewardText = freeAuto
    ? 'No moves left on the board. Free reshuffle activated.'
    : 'Board reshuffled. Hunt for a bigger combo.';
  gemsShowToast(freeAuto ? 'Lucky shuffle!' : 'Shuffle!');
  gemsPlaySound('reshuffle');
  gemsRender();
  gemsUpdateUI();
}

function gemsArmPower(type) {
  if (gemsAnimating || gemsWon || gemsSpinAnimating) return;
  if (type === 'row' && gemsRowBlasts <= 0) return;
  if (type === 'col' && gemsColBlasts <= 0) return;
  gemsPendingPower = gemsPendingPower === type ? null : type;
  gemsSelected = null;
  gemsRewardText = gemsPendingPower
    ? `Super power armed: tap any ${type === 'row' ? 'row' : 'column'} to wipe it.`
    : 'Super power canceled.';
  gemsRender();
  gemsUpdateUI();
}

function gemsUseLinePower(type, index) {
  if (type === 'row' && gemsRowBlasts <= 0) return;
  if (type === 'col' && gemsColBlasts <= 0) return;

  gemsAnimating = true;
  gemsPendingPower = null;
  gemsSelected = null;
  if (type === 'row') gemsRowBlasts--;
  else gemsColBlasts--;

  const cleared = [];
  for (let i=0;i<GEMS_SIZE;i++) {
    const r = type === 'row' ? index : i;
    const c = type === 'col' ? index : i;
    if (gemsGrid[r][c] !== null) cleared.push({r,c});
  }

  cleared.forEach(({r,c}) => {
    const cell = gemsGetCell(r,c);
    if (cell) cell.classList.add('matched');
    gemsGrid[r][c] = null;
  });

  const powerPts = cleared.length * (30 + gemsLevel);
  gemsScore += powerPts;
  gemsLevelScore += powerPts;
  gemsRewardText = `${type === 'row' ? 'Row' : 'Column'} wipe activated for +${powerPts} pts.`;
  gemsPlaySound('power');
  gemsUpdateUI();

  setTimeout(() => {
    gemsApplyGravity();
    gemsFillEmpty();
    gemsRender();
    gemsCascadeDepth = 0;
    setTimeout(() => gemsClearAndCascade(), 250);
  }, 260);
}

function gemsOpenGift() {
  if (!gemsGiftReady || gemsAnimating || gemsWon || gemsSpinAnimating) return;

  gemsGiftReady = false;
  gemsGiftCharge = 0;
  gemsSpinAnimating = true;
  const wheelRewards = ['+3 Moves', 'Score Burst', 'Reshuffle', 'Row Wipe', 'Column Wipe', 'Color Blast', '1 Trophy'];
  let spins = 0;
  gemsRewardText = 'Wheel spinning...';
  gemsShowToast('Spin to win!');
  gemsPlaySound('spin');
  gemsUpdateUI();
  const spinTimer = setInterval(() => {
    spins++;
    const preview = wheelRewards[spins % wheelRewards.length];
    gemsRewardText = `Wheel spinning... ${preview}`;
    gemsUpdateUI();
  }, 110);

  setTimeout(() => {
    clearInterval(spinTimer);
    gemsSpinAnimating = false;
    const reward = wheelRewards[Math.floor(Math.random() * wheelRewards.length)];
    gemsApplyWheelReward(reward);
  }, 1350);
}

function gemsApplyWheelReward(reward) {
  if (reward === '+3 Moves') {
    gemsMoves += GEMS_BALANCE.wheelMoveReward;
    gemsRewardText = `Wheel reward: +${GEMS_BALANCE.wheelMoveReward} moves.`;
    gemsShowToast('Extra moves!');
    gemsPlaySound('reward');
    gemsUpdateUI();
    return;
  }
  if (reward === 'Score Burst') {
    const bonus = 180 + (gemsLevel * 60);
    gemsScore += bonus;
    gemsLevelScore += bonus;
    gemsRewardText = `Wheel reward: +${bonus} pts.`;
    gemsShowToast('Sugar rush!');
    gemsPlaySound('reward');
    gemsUpdateUI();
    gemsCheckLevelEnd();
    return;
  }
  if (reward === 'Reshuffle') {
    gemsReshuffles = Math.min(GEMS_BALANCE.maxReshuffles, gemsReshuffles + 1);
    gemsRewardText = 'Wheel reward: +1 reshuffle.';
    gemsShowToast('Reshuffle won!');
    gemsPlaySound('reward');
    gemsUpdateUI();
    return;
  }
  if (reward === 'Row Wipe') {
    gemsRowBlasts = Math.min(GEMS_BALANCE.maxRowBlasts, gemsRowBlasts + 1);
    gemsRewardText = 'Wheel reward: +1 row wipe.';
    gemsShowToast('Row blast!');
    gemsPlaySound('reward');
    gemsUpdateUI();
    return;
  }
  if (reward === 'Column Wipe') {
    gemsColBlasts = Math.min(GEMS_BALANCE.maxColBlasts, gemsColBlasts + 1);
    gemsRewardText = 'Wheel reward: +1 column wipe.';
    gemsShowToast('Column blast!');
    gemsPlaySound('reward');
    gemsUpdateUI();
    return;
  }
  if (reward === '1 Trophy') {
    gemsTrophies += GEMS_BALANCE.wheelTrophyReward;
    localStorage.setItem('gems_trophies', gemsTrophies);
    gemsRewardText = `Wheel reward: +${GEMS_BALANCE.wheelTrophyReward} trophy.`;
    gemsShowToast('Trophy won!');
    gemsPlaySound('reward');
    gemsUpdateUI();
    return;
  }

  const availableTypes = new Set();
  for (let r=0;r<GEMS_SIZE;r++) for (let c=0;c<GEMS_SIZE;c++) {
    if (gemsGrid[r][c] !== null) availableTypes.add(gemsGrid[r][c]);
  }
  const types = [...availableTypes];
  if (!types.length) {
    gemsRewardText = 'Wheel reward missed. Board unchanged.';
    gemsUpdateUI();
    return;
  }
  const targetType = types[Math.floor(Math.random() * types.length)];
  const blasted = [];
  for (let r=0;r<GEMS_SIZE;r++) for (let c=0;c<GEMS_SIZE;c++) {
    if (gemsGrid[r][c] === targetType) blasted.push({r, c});
  }
  gemsAnimating = true;
  gemsRewardText = `Wheel reward: color blast removed ${blasted.length} gems.`;
  gemsShowToast('Color blast!');
  gemsPlaySound('reward');
  blasted.forEach(({r,c}) => {
    const cell = gemsGetCell(r,c);
    if (cell) cell.classList.add('matched');
    gemsGrid[r][c] = null;
  });
  const blastScore = blasted.length * (24 + gemsLevel * 2);
  gemsScore += blastScore;
  gemsLevelScore += blastScore;
  gemsUpdateUI();
  setTimeout(() => {
    gemsApplyGravity();
    gemsFillEmpty();
    gemsRender();
    gemsCascadeDepth = 0;
    setTimeout(() => gemsClearAndCascade(), 280);
  }, 280);
}

function gemsContinueRun() {
  if (!gemsContinueAvailable || !gemsWon) return;
  gemsContinueAvailable = false;
  gemsContinuesUsed += 1;
  gemsMoves += GEMS_BALANCE.continueMoves;
  gemsWon = false;
  document.getElementById('gemsOverlay').classList.add('hidden');
  gemsRewardText = `Continue activated. +${GEMS_BALANCE.continueMoves} moves added to save the run.`;
  gemsShowToast('Keep going!');
  gemsPlaySound('reward');
  gemsUpdateUI();
}

function gemsAwardTrophy(amount) {
  gemsTrophies += amount;
  localStorage.setItem('gems_trophies', gemsTrophies);
}

function gemsCheckLevelEnd() {
  if (gemsLevelScore >= gemsLevelTarget) {
    // Level complete
    const nextLevel = gemsLevel + 1;
    const icon = document.getElementById('gemsOverIcon');
    const title = document.getElementById('gemsOverTitle');
    const scoreEl = document.getElementById('gemsOverScore');
    const nextBtn = document.getElementById('gemsNextBtn');
    const continueBtn = document.getElementById('gemsContinueBtn');
    const replayBtn = document.getElementById('gemsReplayBtn');
    const retryBtn = document.getElementById('gemsRetryBtn');

    gemsAwardTrophy(1 + (gemsLevel % 5 === 0 ? 1 : 0));
    icon.textContent = '🏆';
    title.textContent = `Level ${gemsLevel} Complete! Sweet Victory!`;
    scoreEl.textContent = `Level Score: ${gemsLevelScore.toLocaleString()} · Total Score: ${gemsScore.toLocaleString()} · Trophy earned`;
    nextBtn.style.display = '';
    continueBtn.style.display = 'none';
    replayBtn.style.display = 'none';
    retryBtn.textContent = 'Restart Level 1';
    document.getElementById('gemsOverlay').classList.remove('hidden');
    gemsWon = true;
    gemsCelebrate('win');
    gemsShowToast('Sugar crush!');
    gemsPlaySound('win');
    gemsUpdateUI();

    nextBtn.onclick = () => {
      gemsStartLevel(nextLevel, false);
    };

  } else if (gemsMoves <= 0) {
    // Out of moves
    document.getElementById('gemsOverIcon').textContent = '💔';
    document.getElementById('gemsOverTitle').textContent = 'Out of Moves!';
    document.getElementById('gemsOverScore').textContent = `Level Score: ${gemsLevelScore.toLocaleString()} / ${gemsLevelTarget.toLocaleString()} · Total: ${gemsScore.toLocaleString()}`;
    document.getElementById('gemsNextBtn').style.display = 'none';
    document.getElementById('gemsContinueBtn').style.display = gemsContinueAvailable ? '' : 'none';
    document.getElementById('gemsReplayBtn').style.display = '';
    document.getElementById('gemsRetryBtn').textContent = 'Restart Level 1';
    document.getElementById('gemsOverlay').classList.remove('hidden');
    gemsWon = true;
    gemsPlaySound('lose');
    gemsUpdateUI();
  }
}

document.getElementById('gemsNewGameBtn').addEventListener('click', gemsNewGame);
document.getElementById('gemsRetryBtn').addEventListener('click', gemsNewGame);
document.getElementById('gemsReplayBtn').addEventListener('click', () => gemsReplayCurrentLevel(true));
document.getElementById('gemsGiftBtn').addEventListener('click', gemsOpenGift);
document.getElementById('gemsContinueBtn').addEventListener('click', gemsContinueRun);
document.getElementById('gemsReshuffleBtn').addEventListener('click', () => gemsTriggerReshuffle(true));
document.getElementById('gemsRowBlastBtn').addEventListener('click', () => gemsArmPower('row'));
document.getElementById('gemsColBlastBtn').addEventListener('click', () => gemsArmPower('col'));
document.getElementById('gemsSoundBtn').addEventListener('click', () => {
  gemsAudioEnabled = !gemsAudioEnabled;
  localStorage.setItem('gems_audio', gemsAudioEnabled ? 'on' : 'off');
  updateGemsSoundButton();
  if (gemsAudioEnabled) {
    gemsAudioUnlocked = false;
    unlockGemsAudio();
    gemsPlaySound('select');
  }
});
document.getElementById('gemsSavePlayerBtn').addEventListener('click', updateGemsPlayerProfile);
document.getElementById('gemsPlayerName').addEventListener('change', updateGemsPlayerProfile);
document.addEventListener('touchstart', unlockGemsAudio, { passive: true });
document.addEventListener('pointerdown', unlockGemsAudio, { passive: true });
document.addEventListener('click', unlockGemsAudio, { passive: true });

// ════════════════════════════════════════════════════════════
// ██████  2048
// ════════════════════════════════════════════════════════════
const T_SIZE = 4;
let tGrid = [], tScore = 0, tBest = 0, tGameOver = false, tWon = false, tKeptGoing = false;

function initT2048View() {
  tBest = parseInt(localStorage.getItem('t2048_best') || '0');
  document.getElementById('t2048Best').textContent = `Best: ${tBest.toLocaleString()}`;
  t2048NewGame();
}

function t2048NewGame() {
  tGrid = Array.from({length:T_SIZE}, () => Array(T_SIZE).fill(0));
  tScore = 0; tGameOver = false; tWon = false; tKeptGoing = false;
  document.getElementById('t2048Overlay').classList.add('hidden');
  t2048AddRandom(); t2048AddRandom();
  t2048UpdateScore();
  t2048Render();
}

function t2048AddRandom() {
  const empty = [];
  for (let r=0;r<T_SIZE;r++) for (let c=0;c<T_SIZE;c++) if (!tGrid[r][c]) empty.push({r,c});
  if (!empty.length) return;
  const {r,c} = empty[Math.floor(Math.random()*empty.length)];
  tGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function t2048Render() {
  const container = document.getElementById('t2048Tiles');
  if (!container) return;
  container.innerHTML = '';
  for (let r=0;r<T_SIZE;r++) for (let c=0;c<T_SIZE;c++) {
    if (!tGrid[r][c]) continue;
    const tile = document.createElement('div');
    tile.className = `t2048-tile t-${Math.min(tGrid[r][c],2048)}`;
    tile.textContent = tGrid[r][c].toLocaleString();
    // Position using grid
    tile.style.gridRow = r+1;
    tile.style.gridColumn = c+1;
    container.appendChild(tile);
  }
}

function t2048Slide(row) {
  const filtered = row.filter(v=>v);
  const merged = [];
  let i=0, gained=0;
  while (i<filtered.length) {
    if (i+1<filtered.length && filtered[i]===filtered[i+1]) {
      const val = filtered[i]*2;
      merged.push(val);
      gained += val;
      i += 2;
    } else { merged.push(filtered[i]); i++; }
  }
  while (merged.length<T_SIZE) merged.push(0);
  return {row:merged, gained};
}

function t2048Move(dir) {
  if (tGameOver) return;
  let moved=false, totalGained=0;
  const prev = JSON.stringify(tGrid);

  if (dir==='left') {
    for (let r=0;r<T_SIZE;r++) {
      const {row,gained}=t2048Slide(tGrid[r]);
      tGrid[r]=row; totalGained+=gained;
    }
  } else if (dir==='right') {
    for (let r=0;r<T_SIZE;r++) {
      const {row,gained}=t2048Slide([...tGrid[r]].reverse());
      tGrid[r]=row.reverse(); totalGained+=gained;
    }
  } else if (dir==='up') {
    for (let c=0;c<T_SIZE;c++) {
      const col=tGrid.map(r=>r[c]);
      const {row,gained}=t2048Slide(col);
      row.forEach((v,r)=>tGrid[r][c]=v); totalGained+=gained;
    }
  } else if (dir==='down') {
    for (let c=0;c<T_SIZE;c++) {
      const col=tGrid.map(r=>r[c]).reverse();
      const {row,gained}=t2048Slide(col);
      row.reverse().forEach((v,r)=>tGrid[r][c]=v); totalGained+=gained;
    }
  }

  moved = JSON.stringify(tGrid) !== prev;
  if (!moved) return;

  tScore += totalGained;
  t2048AddRandom();
  t2048UpdateScore();
  t2048Render();

  // Check win
  if (!tWon && !tKeptGoing) {
    const flat = tGrid.flat();
    if (flat.includes(2048)) {
      tWon = true;
      document.getElementById('t2048OverIcon').textContent = '🏆';
      document.getElementById('t2048OverTitle').textContent = 'You reached 2048!';
      document.getElementById('t2048OverScore').textContent = `Score: ${tScore.toLocaleString()}`;
      document.getElementById('t2048ContinueBtn').style.display = '';
      document.getElementById('t2048Overlay').classList.remove('hidden');
      return;
    }
  }

  // Check game over
  if (!t2048HasMoves()) {
    tGameOver = true;
    document.getElementById('t2048OverIcon').textContent = '😓';
    document.getElementById('t2048OverTitle').textContent = 'Game Over!';
    document.getElementById('t2048OverScore').textContent = `Score: ${tScore.toLocaleString()}`;
    document.getElementById('t2048ContinueBtn').style.display = 'none';
    document.getElementById('t2048Overlay').classList.remove('hidden');
  }
}

function t2048HasMoves() {
  for (let r=0;r<T_SIZE;r++) for (let c=0;c<T_SIZE;c++) {
    if (!tGrid[r][c]) return true;
    if (c+1<T_SIZE && tGrid[r][c]===tGrid[r][c+1]) return true;
    if (r+1<T_SIZE && tGrid[r][c]===tGrid[r+1][c]) return true;
  }
  return false;
}

function t2048UpdateScore() {
  document.getElementById('t2048Score').textContent = tScore.toLocaleString();
  if (tScore > tBest) {
    tBest = tScore; localStorage.setItem('t2048_best', tBest);
    document.getElementById('t2048Best').textContent = `Best: ${tBest.toLocaleString()}`;
  }
}

// Keyboard controls
document.addEventListener('keydown', e => {
  const view = document.querySelector('.view.active');
  if (!view || view.id !== 'view-t2048') return;
  const map = {ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
  if (map[e.key]) { e.preventDefault(); t2048Move(map[e.key]); }
});

// Touch/swipe controls
(function() {
  let tx=0,ty=0;
  document.addEventListener('touchstart', e=>{
    const v=document.querySelector('.view.active');
    if (!v||v.id!=='view-t2048') return;
    tx=e.touches[0].clientX; ty=e.touches[0].clientY;
  }, {passive:true});
  document.addEventListener('touchend', e=>{
    const v=document.querySelector('.view.active');
    if (!v||v.id!=='view-t2048') return;
    const dx=e.changedTouches[0].clientX-tx;
    const dy=e.changedTouches[0].clientY-ty;
    if (Math.max(Math.abs(dx),Math.abs(dy))<30) return;
    if (Math.abs(dx)>Math.abs(dy)) t2048Move(dx>0?'right':'left');
    else t2048Move(dy>0?'down':'up');
  }, {passive:true});
})();

document.getElementById('t2048NewBtn').addEventListener('click', t2048NewGame);
document.getElementById('t2048RetryBtn').addEventListener('click', t2048NewGame);
document.getElementById('t2048ContinueBtn').addEventListener('click', ()=>{
  tKeptGoing=true; tWon=false;
  document.getElementById('t2048Overlay').classList.add('hidden');
});
