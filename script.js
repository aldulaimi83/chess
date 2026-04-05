/* ════════════════════════════════════════════════════════════
   YOUOOO GAMES — Hub Script
   Games: Chess · Checkers (+ Online) · Snake & Ladders · Dominoes
   ════════════════════════════════════════════════════════════ */

'use strict';

// ── FIREBASE ─────────────────────────────────────────────────
const db = firebase.database();

function getPlayerId() {
  let id = localStorage.getItem('youooo_pid');
  if (!id) { id = Math.random().toString(36).slice(2, 10); localStorage.setItem('youooo_pid', id); }
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
  if (name === 'chess')     setTimeout(initChessView, 50);
  if (name === 'checkers')  initCheckersView();
  if (name === 'snake')     initSnakeView();
  if (name === 'domino')    {/* domino inits on button click */}
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
  const size = Math.min(520, window.innerWidth - (window.innerWidth > 860 ? 340 : 32));
  $('#chessboard').css('width', size + 'px');
  chessBoard = Chessboard('chessboard', {
    width: size,
    draggable: true, position: 'start',
    pieceTheme: 'https://cdnjs.cloudflare.com/ajax/libs/chessboard-js/1.0.0/img/chesspieces/wikipedia/{piece}.png',
    onDragStart: chOnDragStart, onDrop: chOnDrop,
    onSnapEnd: () => chessBoard.position(chessGame.fen()),
  });
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
  } else {
    chBestMove(depth);
  }
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
  const el = document.getElementById('chessStatus');
  if (!el) return;
  if (chessGame.in_checkmate()) el.textContent = `Checkmate! ${chessGame.turn()==='w'?'Black':'White'} wins! 🏆`;
  else if (chessGame.in_draw()) el.textContent = 'Draw! 🤝';
  else if (chessGame.in_check()) el.textContent = `${chessGame.turn()==='w'?'White':'Black'} is in check! ⚠️`;
  else el.textContent = `${chessGame.turn()==='w'?'White ♙':'Black ♟'}'s turn`;
}

function addChessMove(san) {
  const el = document.getElementById('chessMoveHistory');
  if (!el || !san) return;
  const li = document.createElement('li'); li.textContent = san;
  el.appendChild(li); el.scrollTop = el.scrollHeight;
}

function clearChessMoveHistory() {
  const el = document.getElementById('chessMoveHistory'); if (el) el.innerHTML = '';
}

// Chess mode buttons
document.querySelectorAll('[data-chess-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-chess-mode]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    chessMode = btn.dataset.chessMode;
    const diffCard = document.getElementById('chessDiffCard');
    if (chessMode === 'ai') {
      diffCard.style.display = '';
      initChessView();
    } else if (chessMode === 'local') {
      diffCard.style.display = 'none';
      initChessView();
    } else if (chessMode === 'create') {
      diffCard.style.display = 'none';
      openRoomModal('create', 'chess');
    } else if (chessMode === 'join') {
      diffCard.style.display = 'none';
      openRoomModal('join', 'chess');
    }
  });
});

document.querySelectorAll('[data-chess-diff]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-chess-diff]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    chessDiff = btn.dataset.chessDiff;
  });
});

document.getElementById('chessResetBtn').addEventListener('click', initChessView);
document.getElementById('chessFlipBtn').addEventListener('click', () => { if (chessBoard) chessBoard.flip(); });

// Chess Online sync
function syncChessMove() {
  db.ref(`rooms/chess/${chessRoomCode}`).update({ fen: chessGame.fen(), turn: chessGame.turn() });
}

function listenChessRoom(code, myColor) {
  chessOnlineColor = myColor === 'white' ? 'w' : 'b';
  chessRoomCode = code;
  chessMode = 'online';
  if (chessOnlineRef) chessOnlineRef.off();
  chessOnlineRef = db.ref(`rooms/chess/${code}`);
  chessOnlineRef.on('value', snap => {
    const d = snap.val();
    if (!d) return;
    if (d.fen && d.fen !== chessGame.fen()) {
      chessGame.load(d.fen);
      chessBoard.position(chessGame.fen());
      updateChessStatus();
    }
    if (d.status === 'playing') {
      document.getElementById('chessOnlineBadge').classList.remove('hidden');
    }
  });
}

// ════════════════════════════════════════════════════════════
// ██████  CHECKERS
// ════════════════════════════════════════════════════════════
let ck = {
  board: [], turn: 'red', selected: null, validMoves: [],
  mode: 'ai', diff: 'medium', redCap: 0, blackCap: 0,
  onlineColor: null, roomCode: null, onlineRef: null,
  mustJumpFrom: null
};

function initCheckersView() {
  ck.board = [];
  for (let r = 0; r < 8; r++) {
    ck.board[r] = [];
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 !== 0) {
        if (r < 3) ck.board[r][c] = {color:'black', king:false};
        else if (r > 4) ck.board[r][c] = {color:'red', king:false};
        else ck.board[r][c] = null;
      } else {
        ck.board[r][c] = null;
      }
    }
  }
  ck.turn = 'red'; ck.selected = null; ck.validMoves = [];
  ck.redCap = 0; ck.blackCap = 0; ck.mustJumpFrom = null;
  renderCheckers();
  updateCkStatus();
  document.getElementById('ckRedCaptures').textContent = '0';
  document.getElementById('ckBlackCaptures').textContent = '0';
}

function renderCheckers() {
  const grid = document.getElementById('checkersGrid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = document.createElement('div');
      const isDark = (r + c) % 2 !== 0;
      cell.className = `ck-cell ${isDark ? 'dark' : 'light'}`;
      cell.dataset.r = r; cell.dataset.c = c;

      const isValidMove = ck.validMoves.some(m => m.tr === r && m.tc === c);
      const isJump = ck.validMoves.some(m => m.tr === r && m.tc === c && m.jump);
      if (isValidMove) cell.classList.add(isJump ? 'valid-jump' : 'valid-move');

      const piece = ck.board[r][c];
      if (piece) {
        const p = document.createElement('div');
        p.className = `ck-piece ${piece.color}${piece.king ? ' king' : ''}`;
        if (ck.selected && ck.selected.r === r && ck.selected.c === c) p.classList.add('selected');
        cell.appendChild(p);
      }
      cell.addEventListener('click', () => onCkClick(r, c));
      grid.appendChild(cell);
    }
  }
}

function onCkClick(r, c) {
  if (ck.mode === 'online' && ck.turn !== ck.onlineColor) return;
  const piece = ck.board[r][c];
  const isValidDest = ck.validMoves.some(m => m.tr === r && m.tc === c);

  if (isValidDest && ck.selected) {
    const move = ck.validMoves.find(m => m.tr === r && m.tc === c);
    applyCkMove(move);
    return;
  }

  if (piece && piece.color === ck.turn) {
    ck.selected = {r, c};
    ck.validMoves = getCkMoves(r, c, ck.board);
    // If there are jumps available on board, only allow jumps
    const allJumps = getAllCkJumps(ck.turn, ck.board);
    if (allJumps.length > 0) ck.validMoves = ck.validMoves.filter(m => m.jump);
    renderCheckers();
    return;
  }

  ck.selected = null; ck.validMoves = [];
  renderCheckers();
}

function getCkMoves(r, c, board) {
  const piece = board[r][c];
  if (!piece) return [];
  const dirs = piece.color === 'red' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
  if (piece.king) { dirs.push(...(piece.color==='red'?[[1,-1],[1,1]]:[[-1,-1],[-1,1]])); }
  const moves = [], jumps = [];
  for (const [dr, dc] of dirs) {
    const nr = r+dr, nc = c+dc;
    if (nr<0||nr>7||nc<0||nc>7) continue;
    if (!board[nr][nc]) {
      moves.push({fr:r,fc:c,tr:nr,tc:nc,jump:false});
    } else if (board[nr][nc].color !== piece.color) {
      const jr = nr+dr, jc = nc+dc;
      if (jr>=0&&jr<=7&&jc>=0&&jc<=7&&!board[jr][jc]) {
        jumps.push({fr:r,fc:c,tr:jr,tc:jc,cr:nr,cc:nc,jump:true});
      }
    }
  }
  return jumps.length ? jumps : moves;
}

function getAllCkMoves(color, board) {
  const all = [];
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    if (board[r][c]?.color === color) all.push(...getCkMoves(r,c,board));
  }
  const jumps = all.filter(m=>m.jump);
  return jumps.length ? jumps : all;
}

function getAllCkJumps(color, board) {
  const all = [];
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    if (board[r][c]?.color === color) {
      const m = getCkMoves(r,c,board).filter(x=>x.jump);
      all.push(...m);
    }
  }
  return all;
}

function applyCkMove(move) {
  const boardCopy = deepCopyBoard(ck.board);
  const piece = boardCopy[move.fr][move.fc];
  boardCopy[move.tr][move.tc] = piece;
  boardCopy[move.fr][move.fc] = null;
  if (move.jump) {
    boardCopy[move.cr][move.cc] = null;
    if (move.fr > move.tr ? piece.color === 'black' : piece.color === 'red') {}
    if (piece.color === 'red') ck.redCap++;
    else ck.blackCap++;
    document.getElementById('ckRedCaptures').textContent = ck.redCap;
    document.getElementById('ckBlackCaptures').textContent = ck.blackCap;
  }
  // King promotion
  if (piece.color === 'red' && move.tr === 0) piece.king = true;
  if (piece.color === 'black' && move.tr === 7) piece.king = true;

  ck.board = boardCopy;

  // Multi-jump check
  if (move.jump) {
    const moreJumps = getCkMoves(move.tr, move.tc, ck.board).filter(m=>m.jump);
    if (moreJumps.length > 0) {
      ck.selected = {r:move.tr, c:move.tc};
      ck.validMoves = moreJumps;
      renderCheckers();
      updateCkStatus();
      if (ck.mode === 'online' && ck.onlineColor === ck.turn) syncCkBoard();
      return;
    }
  }

  ck.turn = ck.turn === 'red' ? 'black' : 'red';
  ck.selected = null; ck.validMoves = [];

  if (ck.mode === 'online' && ck.onlineColor) syncCkBoard();

  renderCheckers();
  updateCkStatus();
  checkCkGameOver();

  if (!ckIsGameOver() && (ck.mode === 'ai' && ck.turn === 'black')) {
    setTimeout(makeCkAiMove, 500);
  }
}

function deepCopyBoard(board) {
  return board.map(row => row.map(cell => cell ? {...cell} : null));
}

function ckIsGameOver() {
  const rMoves = getAllCkMoves('red', ck.board);
  const bMoves = getAllCkMoves('black', ck.board);
  return rMoves.length === 0 || bMoves.length === 0;
}

function checkCkGameOver() {
  const el = document.getElementById('ckStatus');
  if (!el) return;
  if (getAllCkMoves('red', ck.board).length === 0) el.textContent = '⚫ Black wins! 🏆';
  else if (getAllCkMoves('black', ck.board).length === 0) el.textContent = '🔴 Red wins! 🏆';
}

function updateCkStatus() {
  const el = document.getElementById('ckStatus');
  if (!el) return;
  if (!ckIsGameOver()) el.textContent = `${ck.turn === 'red' ? '🔴 Red' : '⚫ Black'}'s turn`;
}

function makeCkAiMove() {
  if (ck.mode !== 'ai' || ckIsGameOver()) return;
  const moves = getAllCkMoves('black', ck.board);
  if (!moves.length) return;
  let move;
  if (ck.diff === 'easy') {
    move = moves[Math.floor(Math.random()*moves.length)];
  } else if (ck.diff === 'medium') {
    const jumps = moves.filter(m=>m.jump);
    move = jumps.length ? jumps[Math.floor(Math.random()*jumps.length)] : moves[Math.floor(Math.random()*moves.length)];
  } else {
    move = ckMinimaxMove(3);
  }
  ck.selected = null; ck.validMoves = [];
  applyCkMove(move);
}

function ckMinimaxMove(depth) {
  const moves = getAllCkMoves('black', ck.board);
  let best = null, bestScore = -Infinity;
  for (const m of moves) {
    const saved = deepCopyBoard(ck.board);
    const savedTurn = ck.turn;
    const savedRed = ck.redCap, savedBlack = ck.blackCap;
    applyCkMoveSimulate(m, ck.board);
    const score = -ckMinimax(ck.board, depth-1, -Infinity, Infinity, 'red');
    ck.board = saved; ck.turn = savedTurn;
    ck.redCap = savedRed; ck.blackCap = savedBlack;
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best || moves[0];
}

function applyCkMoveSimulate(move, board) {
  const piece = board[move.fr][move.fc];
  board[move.tr][move.tc] = piece ? {...piece} : null;
  board[move.fr][move.fc] = null;
  if (move.jump && board[move.cr]) board[move.cr][move.cc] = null;
  if (piece) {
    if (piece.color==='red'&&move.tr===0) piece.king=true;
    if (piece.color==='black'&&move.tr===7) piece.king=true;
  }
}

function ckMinimax(board, depth, alpha, beta, color) {
  const moves = getAllCkMoves(color, board);
  if (depth===0||!moves.length) return ckEvalBoard(board);
  let score = -Infinity;
  for (const m of moves) {
    const b2 = deepCopyBoard(board);
    applyCkMoveSimulate(m, b2);
    const s = -ckMinimax(b2, depth-1, -beta, -alpha, color==='red'?'black':'red');
    score = Math.max(score, s);
    alpha = Math.max(alpha, s);
    if (alpha >= beta) break;
  }
  return score;
}

function ckEvalBoard(board) {
  let score = 0;
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const p = board[r][c];
    if (!p) continue;
    const v = p.king ? 3 : 1;
    score += p.color === 'black' ? v : -v;
  }
  return score;
}

// Checkers mode buttons
document.querySelectorAll('[data-ck-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-ck-mode]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    ck.mode = btn.dataset.ckMode;
    const diffCard = document.getElementById('ckDiffCard');
    if (ck.mode === 'ai') { diffCard.style.display=''; initCheckersView(); }
    else if (ck.mode === 'local') { diffCard.style.display='none'; initCheckersView(); }
    else if (ck.mode === 'create') { diffCard.style.display='none'; openRoomModal('create','checkers'); }
    else if (ck.mode === 'join') { diffCard.style.display='none'; openRoomModal('join','checkers'); }
  });
});

document.querySelectorAll('[data-ck-diff]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-ck-diff]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); ck.diff = btn.dataset.ckDiff;
  });
});

document.getElementById('ckResetBtn').addEventListener('click', initCheckersView);

// Checkers Online
function syncCkBoard() {
  if (!ck.roomCode) return;
  db.ref(`rooms/checkers/${ck.roomCode}`).update({
    board: JSON.stringify(ck.board),
    turn: ck.turn
  });
}

function listenCkRoom(code, myColor) {
  ck.onlineColor = myColor; ck.roomCode = code; ck.mode = 'online';
  if (ck.onlineRef) ck.onlineRef.off();
  ck.onlineRef = db.ref(`rooms/checkers/${code}`);
  ck.onlineRef.on('value', snap => {
    const d = snap.val(); if (!d) return;
    if (d.board) {
      const incoming = JSON.parse(d.board);
      if (JSON.stringify(incoming) !== JSON.stringify(ck.board)) {
        ck.board = incoming; ck.turn = d.turn;
        ck.selected = null; ck.validMoves = [];
        renderCheckers(); updateCkStatus();
      }
    }
    if (d.status === 'playing') document.getElementById('ckOnlineBadge').classList.remove('hidden');
  });
}

// ════════════════════════════════════════════════════════════
// ██████  ONLINE ROOM MODAL
// ════════════════════════════════════════════════════════════
let _roomGame = null;

function openRoomModal(type, game) {
  _roomGame = game;
  const modal = document.getElementById('roomModal');
  modal.classList.remove('hidden');
  document.getElementById('createRoomPanel').classList.add('hidden');
  document.getElementById('joinRoomPanel').classList.add('hidden');
  document.getElementById('roomError').classList.add('hidden');

  if (type === 'create') {
    document.getElementById('createRoomPanel').classList.remove('hidden');
    const code = genRoomCode();
    document.getElementById('displayRoomCode').textContent = code;
    document.getElementById('waitingText').textContent = 'Waiting for opponent...';
    createOnlineRoom(game, code);
  } else {
    document.getElementById('joinRoomPanel').classList.remove('hidden');
    document.getElementById('joinCodeInput').value = '';
  }
}

function createOnlineRoom(game, code) {
  const ref = db.ref(`rooms/${game}/${code}`);
  const initData = {
    game, status:'waiting',
    players:{host: getPlayerId(), guest: null},
    hostColor:'white'
  };
  if (game === 'chess') initData.fen = new Chess().fen();
  if (game === 'checkers') {
    initCheckersView();
    initData.board = JSON.stringify(ck.board);
    initData.turn = 'red';
  }
  if (game === 'domino') {
    const tiles=shuffle(createTileSet());
    initData.playerHand=JSON.stringify(tiles.slice(0,7));
    initData.guestHand=JSON.stringify(tiles.slice(7,14));
    initData.boneyard=JSON.stringify(tiles.slice(14));
    initData.boardTiles=JSON.stringify([]);
    initData.leftEnd=null; initData.rightEnd=null;
    initData.turn='host';
  }
  ref.set(initData);

  ref.child('players/guest').on('value', snap => {
    if (snap.val()) {
      document.getElementById('waitingText').textContent = 'Opponent joined! Starting...';
      ref.update({status:'playing'});
      setTimeout(() => {
        document.getElementById('roomModal').classList.add('hidden');
        if (game === 'chess') { chessMode='online'; listenChessRoom(code,'white'); }
        if (game === 'checkers') listenCkRoom(code,'red');
        if (game === 'domino') listenDominoRoom(code,'host');
      }, 1000);
    }
  });
}

document.getElementById('confirmJoinBtn').addEventListener('click', () => {
  const code = document.getElementById('joinCodeInput').value.trim().toUpperCase();
  if (code.length < 4) return;
  const ref = db.ref(`rooms/${_roomGame}/${code}`);
  ref.once('value', snap => {
    const d = snap.val();
    if (!d || d.status !== 'waiting') {
      document.getElementById('roomError').classList.remove('hidden'); return;
    }
    ref.child('players/guest').set(getPlayerId());
    ref.update({status:'playing'});
    document.getElementById('roomModal').classList.add('hidden');
    if (_roomGame === 'chess') { chessMode='online'; listenChessRoom(code,'black'); }
    if (_roomGame === 'checkers') {
      ck.board = JSON.parse(d.board); ck.turn = d.turn;
      renderCheckers(); updateCkStatus();
      listenCkRoom(code,'black');
    }
    if (_roomGame === 'domino') listenDominoRoom(code,'guest');
  });
});

document.getElementById('closeRoomModal').addEventListener('click', () => {
  document.getElementById('roomModal').classList.add('hidden');
  if (_roomGame === 'chess') { chessMode='ai'; document.querySelector('[data-chess-mode="ai"]').click(); }
  if (_roomGame === 'checkers') { ck.mode='ai'; document.querySelector('[data-ck-mode="ai"]').click(); }
  if (_roomGame === 'domino') { DOM.mode='ai'; document.getElementById('dominoSetup').style.display=''; }
});

document.getElementById('copyRoomCodeBtn').addEventListener('click', () => {
  const code = document.getElementById('displayRoomCode').textContent;
  navigator.clipboard.writeText(code).catch(()=>{});
  document.getElementById('copyRoomCodeBtn').textContent = 'Copied!';
  setTimeout(()=>document.getElementById('copyRoomCodeBtn').textContent='Copy Code', 1500);
});

// ════════════════════════════════════════════════════════════
// ██████  SNAKE & LADDERS
// ════════════════════════════════════════════════════════════
const SL = {
  SNAKES: {97:78,95:56,88:24,62:18,48:26,36:6,32:10,99:54},
  LADDERS: {1:38,4:14,9:31,28:84,40:59,51:67,63:81,71:91},
  COLORS: ['#ff6b6b','#4ecdc4','#ffe66d','#a8e6cf'],
  players:[], current:0, rolling:false, gameOver:false, numPlayers:2
};

function initSnakeView() {
  const numSel = document.querySelector('.count-btn.active');
  SL.numPlayers = numSel ? parseInt(numSel.dataset.players) : 2;
  renderSnakePlayerInputs();
}

document.querySelectorAll('.count-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.count-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    SL.numPlayers = parseInt(btn.dataset.players);
    renderSnakePlayerInputs();
  });
});

function renderSnakePlayerInputs() {
  const container = document.getElementById('snakePlayerNames');
  const names = ['Player 1','Player 2','Player 3','Player 4'];
  container.innerHTML = '';
  for (let i=0; i<SL.numPlayers; i++) {
    const inp = document.createElement('input');
    inp.type='text'; inp.className='player-name-input';
    inp.placeholder = names[i]; inp.maxLength=16;
    inp.style.borderLeft = `4px solid ${SL.COLORS[i]}`;
    container.appendChild(inp);
  }
}

document.getElementById('snakeStartBtn').addEventListener('click', startSnakeGame);
document.getElementById('snakeResetBtn').addEventListener('click', () => {
  document.getElementById('snakeGameCard').style.display='none';
  document.getElementById('snakeSetupCard').style.display='';
  initSnakeView();
});

function startSnakeGame() {
  const inputs = document.querySelectorAll('.player-name-input');
  SL.players = [];
  inputs.forEach((inp, i) => {
    SL.players.push({name: inp.value.trim() || `Player ${i+1}`, pos:1, color:SL.COLORS[i]});
  });
  SL.current = 0; SL.rolling = false; SL.gameOver = false;
  document.getElementById('snakeSetupCard').style.display='none';
  document.getElementById('snakeGameCard').style.display='';
  updateSnakePlayerList();
  drawSnakeBoard();
  updateSnakeTurn();
}

document.getElementById('rollDiceBtn').addEventListener('click', rollDice);

function rollDice() {
  if (SL.rolling || SL.gameOver) return;
  SL.rolling = true;
  document.getElementById('rollDiceBtn').disabled = true;
  const dFace = document.getElementById('diceFace');
  const faces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
  let ticks = 0;
  const interval = setInterval(() => {
    dFace.textContent = faces[Math.floor(Math.random()*6)];
    dFace.classList.add('dice-rolling');
    ticks++;
    if (ticks > 8) {
      clearInterval(interval);
      dFace.classList.remove('dice-rolling');
      const roll = Math.floor(Math.random()*6)+1;
      dFace.textContent = faces[roll-1];
      moveSnakePlayer(roll);
    }
  }, 80);
}

function moveSnakePlayer(roll) {
  const p = SL.players[SL.current];
  let newPos = p.pos + roll;
  if (newPos > 100) { newPos = p.pos; }
  p.pos = newPos;

  drawSnakeBoard();

  setTimeout(() => {
    if (SL.SNAKES[newPos]) {
      p.pos = SL.SNAKES[newPos];
      showSnakeMsg(`🐍 ${p.name} hit a snake! ${newPos} → ${p.pos}`);
    } else if (SL.LADDERS[newPos]) {
      p.pos = SL.LADDERS[newPos];
      showSnakeMsg(`🪜 ${p.name} climbed a ladder! ${newPos} → ${p.pos}`);
    } else {
      showSnakeMsg(`${p.name} rolled ${roll} → square ${newPos}`);
    }
    drawSnakeBoard();
    updateSnakePlayerList();

    if (p.pos >= 100) {
      SL.gameOver = true;
      document.getElementById('snakeTurnInfo').textContent = `🏆 ${p.name} wins!`;
      document.getElementById('rollDiceBtn').disabled = true;
      SL.rolling = false;
      return;
    }

    SL.current = (SL.current + 1) % SL.numPlayers;
    SL.rolling = false;
    document.getElementById('rollDiceBtn').disabled = false;
    updateSnakeTurn();
  }, 400);
}

function showSnakeMsg(msg) {
  document.getElementById('snakeTurnInfo').textContent = msg;
}

function updateSnakeTurn() {
  const p = SL.players[SL.current];
  if (p) document.getElementById('snakeTurnInfo').textContent = `${p.name}'s turn — Roll!`;
}

function updateSnakePlayerList() {
  const el = document.getElementById('snakePlayerList');
  if (!el) return;
  el.innerHTML = '';
  SL.players.forEach((p, i) => {
    const item = document.createElement('div');
    item.className = `snake-player-item${i===SL.current?' active-player':''}`;
    item.innerHTML = `<span class="player-dot" style="background:${p.color}"></span><span>${p.name}</span><strong style="margin-left:auto">Sq.${p.pos}</strong>`;
    el.appendChild(item);
  });
}

function slCellCenter(n, cellSize) {
  const idx = n-1, row = Math.floor(idx/10), col = idx%10;
  const cRow = 9-row, cCol = (row%2===0) ? col : (9-col);
  return {x: cCol*cellSize + cellSize/2, y: cRow*cellSize + cellSize/2};
}

function drawSnakeBoard() {
  const canvas = document.getElementById('snakeCanvas');
  if (!canvas) return;
  const wrap = canvas.parentElement;
  const size = Math.min(wrap.offsetWidth || 520, 520);
  canvas.width = size; canvas.height = size;
  const cell = size/10;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,size,size);

  // Draw cells
  for (let n=1;n<=100;n++) {
    const idx=n-1, row=Math.floor(idx/10), col=idx%10;
    const cRow=9-row, cCol=(row%2===0)?col:(9-col);
    const x=cCol*cell, y=cRow*cell;
    if (SL.SNAKES[n]) ctx.fillStyle='rgba(255,80,80,0.18)';
    else if (SL.LADDERS[n]) ctx.fillStyle='rgba(74,222,128,0.18)';
    else ctx.fillStyle=(cRow+cCol)%2===0?'#0d1a30':'#0a1220';
    ctx.fillRect(x,y,cell,cell);
    ctx.strokeStyle='rgba(255,255,255,0.05)';
    ctx.strokeRect(x,y,cell,cell);
    ctx.fillStyle='rgba(150,170,220,0.45)';
    ctx.font=`${Math.max(9,Math.floor(cell*0.22))}px Inter,sans-serif`;
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(n,x+3,y+2);
  }

  // Draw snakes
  ctx.lineWidth=Math.max(4,cell*0.12); ctx.lineCap='round';
  for (const [head,tail] of Object.entries(SL.SNAKES)) {
    const h=slCellCenter(parseInt(head),cell), t=slCellCenter(tail,cell);
    const g=ctx.createLinearGradient(h.x,h.y,t.x,t.y);
    g.addColorStop(0,'#ff4444'); g.addColorStop(1,'#ff9944');
    ctx.strokeStyle=g;
    ctx.beginPath(); ctx.moveTo(h.x,h.y);
    ctx.quadraticCurveTo((h.x+t.x)/2+(h.y-t.y)*0.4,(h.y+t.y)/2,t.x,t.y);
    ctx.stroke();
    ctx.fillStyle='#ff4444';
    ctx.beginPath(); ctx.arc(h.x,h.y,cell*0.2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffcc00'; ctx.font=`${cell*0.18}px serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('👁',h.x,h.y);
  }

  // Draw ladders
  ctx.lineWidth=Math.max(2,cell*0.07);
  for (const [bottom,top] of Object.entries(SL.LADDERS)) {
    const b=slCellCenter(parseInt(bottom),cell), t=slCellCenter(top,cell);
    const g=ctx.createLinearGradient(b.x,b.y,t.x,t.y);
    g.addColorStop(0,'#4ade80'); g.addColorStop(1,'#06b6d4');
    ctx.strokeStyle=g;
    const dx=t.x-b.x, dy=t.y-b.y, len=Math.sqrt(dx*dx+dy*dy);
    const nx=(-dy/len)*cell*0.14, ny=(dx/len)*cell*0.14;
    ctx.beginPath(); ctx.moveTo(b.x-nx,b.y-ny); ctx.lineTo(t.x-nx,t.y-ny); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b.x+nx,b.y+ny); ctx.lineTo(t.x+nx,t.y+ny); ctx.stroke();
    const rungs=Math.max(2,Math.floor(len/(cell*0.6)));
    for (let i=1;i<rungs;i++) {
      const rx=b.x+(dx/rungs)*i, ry=b.y+(dy/rungs)*i;
      ctx.beginPath(); ctx.moveTo(rx-nx,ry-ny); ctx.lineTo(rx+nx,ry+ny); ctx.stroke();
    }
  }

  // Draw players
  ctx.save();
  SL.players.forEach((p,i) => {
    const pos = slCellCenter(Math.max(1,Math.min(100,p.pos)), cell);
    const offsets = [{x:-cell*.14,y:-cell*.14},{x:cell*.14,y:-cell*.14},{x:-cell*.14,y:cell*.14},{x:cell*.14,y:cell*.14}];
    const off = offsets[i] || {x:0,y:0};
    ctx.shadowColor = p.color; ctx.shadowBlur = 14;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(pos.x+off.x,pos.y+off.y,cell*.2,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0; ctx.fillStyle='#000';
    ctx.font=`bold ${cell*.18}px Inter`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(i+1,pos.x+off.x,pos.y+off.y);
  });
  ctx.restore();
}

// ════════════════════════════════════════════════════════════
// ██████  DOMINOES
// ════════════════════════════════════════════════════════════
const DOM = {
  playerHand:[], aiHand:[], boneyard:[], boardTiles:[],
  leftEnd:null, rightEnd:null, turn:'player',
  mode:'ai', gameOver:false, selected:null, passCount:0
};

const PIP_MAP = {
  0:[],
  1:['mc'],
  2:['tl','br'],
  3:['tl','mc','br'],
  4:['tl','tr','bl','br'],
  5:['tl','tr','mc','bl','br'],
  6:['tl','tr','ml','mr','bl','br']
};

function createTileSet() {
  const tiles=[];
  for (let a=0;a<=6;a++) for (let b=a;b<=6;b++) tiles.push({a,b,id:`${a}-${b}`});
  return tiles;
}

function shuffle(arr) {
  for (let i=arr.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function startDominoGame(mode) {
  DOM.mode=mode; DOM.gameOver=false; DOM.passCount=0;
  DOM.boardTiles=[]; DOM.leftEnd=null; DOM.rightEnd=null; DOM.selected=null;
  const tiles=shuffle(createTileSet());
  DOM.playerHand=tiles.slice(0,7);
  DOM.aiHand=tiles.slice(7,14);
  DOM.boneyard=tiles.slice(14);
  DOM.turn='player';
  document.getElementById('dominoSetup').style.display='none';
  document.getElementById('dominoBoardEmpty').style.display='';
  renderDominoHands();
  updateDominoStatus('Your turn — pick a tile to play');
  updateBoneyardCount();
}

document.getElementById('dominoVsAiBtn').addEventListener('click', ()=>startDominoGame('ai'));
document.getElementById('dominoLocalBtn').addEventListener('click', ()=>startDominoGame('local'));
document.getElementById('dominoCreateBtn').addEventListener('click', ()=>openRoomModal('create','domino'));
document.getElementById('dominoJoinBtn').addEventListener('click', ()=>openRoomModal('join','domino'));

function makeDominoTileEl(tile, faceDown=false) {
  const el=document.createElement('div');
  el.className=`domino-tile${faceDown?' face-down':''}`;
  el.dataset.id=tile.id;
  if (faceDown) {
    el.innerHTML=`<div class="domino-half"></div><div class="domino-divider-v"></div><div class="domino-half"></div>`;
    return el;
  }
  el.innerHTML=`
    <div class="domino-half">${makePips(tile.a)}</div>
    <div class="domino-divider-v"></div>
    <div class="domino-half">${makePips(tile.b)}</div>
  `;
  return el;
}

function makePips(n) {
  const positions=PIP_MAP[n]||[];
  const all=['tl','tc','tr','ml','mc','mr','bl','bc','br'];
  return all.map(pos=>positions.includes(pos)?`<span class="pip ${pos}"></span>`:`<span class="pip-empty ${pos}" style="grid-area:${pos}"></span>`).join('');
}

function renderDominoHands() {
  const playerEl=document.getElementById('playerHand');
  const aiEl=document.getElementById('aiHand');
  playerEl.innerHTML=''; aiEl.innerHTML='';
  document.getElementById('aiHandCount').textContent=DOM.aiHand.length;

  DOM.playerHand.forEach(tile=>{
    const el=makeDominoTileEl(tile);
    if (DOM.selected===tile.id) el.classList.add('selected-tile');
    el.addEventListener('click',()=>selectDominoTile(tile.id));
    playerEl.appendChild(el);
  });

  DOM.aiHand.forEach(tile=>{
    const el=makeDominoTileEl(tile, true);
    aiEl.appendChild(el);
  });
}

function renderDominoBoard() {
  const boardEl=document.getElementById('dominoBoard');
  // Remove only played tiles — don't destroy the static empty-msg element
  Array.from(boardEl.children).forEach(child=>{
    if (!child.classList.contains('domino-empty-msg')) child.remove();
  });
  const emptyMsg=document.getElementById('dominoBoardEmpty');
  if (emptyMsg) emptyMsg.style.display=DOM.boardTiles.length?'none':'';
  DOM.boardTiles.forEach(bt=>{
    const el=makeDominoTileEl({a:bt.da,b:bt.db,id:bt.id});
    el.classList.add('on-board','horizontal');
    el.querySelector('.domino-divider-v').className='domino-divider-h';
    el.style.flexDirection='row';
    boardEl.appendChild(el);
  });
  boardEl.scrollLeft=boardEl.scrollWidth;
}

function selectDominoTile(id) {
  if (DOM.turn!=='player'||DOM.gameOver) return;
  const tile=DOM.playerHand.find(t=>t.id===id);
  if (!tile) return;

  if (DOM.boardTiles.length===0) {
    if (DOM.selected===id) {
      // Second click on empty board — play it as first tile
      tryPlayTile(tile, DOM.playerHand, 'player');
    } else {
      DOM.selected=id; renderDominoHands();
      updateDominoStatus('Click the tile again to play it as the first tile');
    }
    return;
  }

  // Board has tiles — try to play immediately
  const played=tryPlayTile(tile, DOM.playerHand, 'player');
  if (!played) {
    DOM.selected=id; renderDominoHands();
    updateDominoStatus('This tile cannot be played — try drawing or select another');
  }
}

function tryPlayTile(tile, hand, who) {
  if (DOM.boardTiles.length===0) {
    if (DOM.selected!==tile.id && who==='player') return false;
    // First tile
    placeTile(tile, tile.a, tile.b);
    DOM.leftEnd=tile.a; DOM.rightEnd=tile.b;
    hand.splice(hand.indexOf(tile),1);
    DOM.selected=null;
    afterTilePlay(who);
    return true;
  }

  let playedA=tile.a, playedB=tile.b, flipped=false;
  let side=null;

  if (tile.a===DOM.leftEnd||tile.b===DOM.leftEnd) {
    // orient so db connects to leftEnd, da becomes new outer left
    if (tile.a===DOM.leftEnd) { playedA=tile.b; playedB=tile.a; }
    else { playedA=tile.a; playedB=tile.b; }
    DOM.leftEnd=playedA;
    side='left';
  } else if (tile.a===DOM.rightEnd||tile.b===DOM.rightEnd) {
    // orient so da connects to rightEnd, db becomes new outer right
    if (tile.a===DOM.rightEnd) { playedA=tile.a; playedB=tile.b; }
    else { playedA=tile.b; playedB=tile.a; }
    DOM.rightEnd=playedB;
    side='right';
  } else {
    return false;
  }

  if (side==='left') {
    DOM.boardTiles.unshift({id:tile.id, da:playedA, db:playedB});
  } else {
    DOM.boardTiles.push({id:tile.id, da:playedA, db:playedB});
  }

  hand.splice(hand.indexOf(tile),1);
  DOM.selected=null;
  afterTilePlay(who);
  return true;
}

function placeTile(tile, a, b) {
  DOM.boardTiles.push({id:tile.id, da:a, db:b});
}

function afterTilePlay(who) {
  DOM.passCount=0;
  renderDominoBoard();
  renderDominoHands();
  updateBoneyardCount();

  if (DOM.playerHand.length===0||DOM.aiHand.length===0) {
    const winner=DOM.playerHand.length===0?'You win':'AI wins';
    updateDominoStatus(`🏆 ${winner}! Game over.`);
    DOM.gameOver=true;
    if (DOM.mode==='online' && dominoRoomCode) syncDominoState();
    return;
  }

  if (who==='player') {
    DOM.turn='ai';
    if (DOM.mode==='online' && dominoRoomCode) {
      const nextRole=dominoMyRole==='host'?'guest':'host';
      db.ref(`rooms/domino/${dominoRoomCode}`).update({
        boardTiles:JSON.stringify(DOM.boardTiles), leftEnd:DOM.leftEnd, rightEnd:DOM.rightEnd,
        boneyard:JSON.stringify(DOM.boneyard),
        hostHand:JSON.stringify(dominoMyRole==='host'?DOM.playerHand:DOM.aiHand),
        guestHand:JSON.stringify(dominoMyRole==='guest'?DOM.playerHand:DOM.aiHand),
        turn:nextRole
      });
      updateDominoStatus('Waiting for opponent...');
    } else {
      updateDominoStatus('AI is thinking...');
      setTimeout(aiDominoTurn, 900);
    }
  } else {
    DOM.turn='player';
    updateDominoStatus('Your turn — pick a tile');
  }
}

function aiDominoTurn() {
  if (DOM.gameOver) return;
  // Find playable tile (prefer highest value)
  const playable=DOM.aiHand.filter(t=>canPlay(t));
  if (playable.length>0) {
    playable.sort((a,b)=>(b.a+b.b)-(a.a+a.b));
    tryPlayTile(playable[0], DOM.aiHand, 'ai');
    return;
  }
  // Draw
  if (DOM.boneyard.length>0) {
    const drawn=DOM.boneyard.pop();
    DOM.aiHand.push(drawn);
    updateBoneyardCount();
    renderDominoHands();
    updateDominoStatus('AI drew a tile...');
    setTimeout(aiDominoTurn,600);
    return;
  }
  // Pass
  DOM.passCount++;
  if (DOM.passCount>=2) {
    endDominoByCount();
  } else {
    DOM.turn='player';
    updateDominoStatus('AI passed — your turn');
  }
}

function canPlay(tile) {
  if (DOM.boardTiles.length===0) return true;
  return tile.a===DOM.leftEnd||tile.b===DOM.leftEnd||tile.a===DOM.rightEnd||tile.b===DOM.rightEnd;
}

document.getElementById('dominoDrawBtn').addEventListener('click', ()=>{
  if (DOM.turn!=='player'||DOM.gameOver) return;
  if (DOM.boneyard.length===0) {
    DOM.passCount++;
    if (DOM.passCount>=2) { endDominoByCount(); return; }
    DOM.turn='ai';
    updateDominoStatus('You passed — AI thinking...');
    setTimeout(aiDominoTurn,600);
    return;
  }
  const tile=DOM.boneyard.pop();
  DOM.playerHand.push(tile);
  DOM.selected=null;
  renderDominoHands();
  updateBoneyardCount();
  updateDominoStatus(`Drew a tile [${tile.a}|${tile.b}] — now play or draw again`);
});

function endDominoByCount() {
  const pScore=DOM.playerHand.reduce((s,t)=>s+t.a+t.b,0);
  const aScore=DOM.aiHand.reduce((s,t)=>s+t.a+t.b,0);
  let msg;
  if (pScore<aScore) msg=`🏆 You win! (${pScore} vs ${aScore})`;
  else if (aScore<pScore) msg=`AI wins! (${aScore} vs ${pScore})`;
  else msg=`Tie! Both have ${pScore} points.`;
  updateDominoStatus(msg);
  DOM.gameOver=true;
}

function updateDominoStatus(msg) {
  const el=document.getElementById('dominoStatus');
  if (el) el.textContent=msg;
}

function updateBoneyardCount() {
  const el=document.getElementById('boneyardCount');
  if (el) el.textContent=DOM.boneyard.length;
}

// Domino Online
let dominoRoomCode=null, dominoMyRole=null, dominoOnlineRef=null;

function syncDominoState() {
  if (!dominoRoomCode) return;
  const myHand = dominoMyRole==='host' ? DOM.playerHand : DOM.aiHand;
  const oppHand = dominoMyRole==='host' ? DOM.aiHand : DOM.playerHand;
  db.ref(`rooms/domino/${dominoRoomCode}`).update({
    boardTiles: JSON.stringify(DOM.boardTiles),
    leftEnd: DOM.leftEnd,
    rightEnd: DOM.rightEnd,
    turn: DOM.turn,
    hostHand: JSON.stringify(dominoMyRole==='host' ? myHand : oppHand),
    guestHand: JSON.stringify(dominoMyRole==='guest' ? myHand : oppHand),
    boneyard: JSON.stringify(DOM.boneyard)
  });
}

function listenDominoRoom(code, role) {
  dominoRoomCode=code; dominoMyRole=role;
  DOM.mode='online'; DOM.gameOver=false; DOM.passCount=0; DOM.selected=null;
  if (dominoOnlineRef) dominoOnlineRef.off();
  dominoOnlineRef=db.ref(`rooms/domino/${code}`);
  dominoOnlineRef.once('value', snap => {
    const d=snap.val(); if (!d) return;
    DOM.playerHand=JSON.parse(role==='host' ? d.playerHand||d.hostHand||'[]' : d.guestHand||'[]');
    DOM.aiHand=JSON.parse(role==='host' ? d.guestHand||'[]' : d.playerHand||d.hostHand||'[]');
    DOM.boneyard=JSON.parse(d.boneyard||'[]');
    DOM.boardTiles=JSON.parse(d.boardTiles||'[]');
    DOM.leftEnd=d.leftEnd; DOM.rightEnd=d.rightEnd;
    DOM.turn=d.turn==='host' ? (role==='host'?'player':'ai') : (role==='guest'?'player':'ai');
    document.getElementById('dominoSetup').style.display='none';
    document.getElementById('dominoBoardEmpty').style.display=DOM.boardTiles.length?'none':'';
    renderDominoHands(); renderDominoBoard(); updateBoneyardCount();
    updateDominoStatus(DOM.turn==='player' ? 'Your turn!' : 'Waiting for opponent...');
  });

  dominoOnlineRef.on('value', snap => {
    const d=snap.val(); if (!d) return;
    const remoteBoard=JSON.parse(d.boardTiles||'[]');
    if (JSON.stringify(remoteBoard)!==JSON.stringify(DOM.boardTiles)) {
      DOM.boardTiles=remoteBoard;
      DOM.leftEnd=d.leftEnd; DOM.rightEnd=d.rightEnd;
      DOM.boneyard=JSON.parse(d.boneyard||'[]');
      DOM.playerHand=JSON.parse(role==='host' ? d.hostHand||'[]' : d.guestHand||'[]');
      DOM.aiHand=JSON.parse(role==='host' ? d.guestHand||'[]' : d.hostHand||'[]');
      const remoteTurn=d.turn;
      DOM.turn=remoteTurn===role ? 'player' : 'ai';
      renderDominoBoard(); renderDominoHands(); updateBoneyardCount();
      const myTurn=DOM.turn==='player';
      updateDominoStatus(myTurn ? 'Your turn!' : 'Waiting for opponent...');
      if (d.status==='playing') document.getElementById('dominoSetup').style.display='none';
    }
  });
}


// ════════════════════════════════════════════════════════════
// ██████  WINDOW RESIZE — redraw canvas
// ════════════════════════════════════════════════════════════
window.addEventListener('resize', ()=>{
  if (document.getElementById('view-snake').classList.contains('active')) drawSnakeBoard();
  if (document.getElementById('view-chess').classList.contains('active') && chessBoard) {
    const size=Math.min(520,window.innerWidth-(window.innerWidth>860?340:32));
    $('#chessboard').css('width',size+'px'); chessBoard.resize();
  }
  if (document.getElementById('view-checkers').classList.contains('active')) {
    const s=Math.min(520,window.innerWidth-(window.innerWidth>860?320:32));
    document.getElementById('checkersGrid').style.width=s+'px';
  }
});

// ── INIT ─────────────────────────────────────────────────────
(function init() {
  renderSnakePlayerInputs();
  // Default chess view will init when user clicks
})();
