const SERVER_URL = "https://youooo-chess-backend.onrender.com";

let socket = null;
let board = null;
let game = null;

let mode = "local";
let roomId = null;
let playerColor = "white";
let isMyTurn = true;

let statusEl;
let roomInput;
let roomCodeEl;
let moveHistoryEl;
let serverStateEl;

function safeSetStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function renderMoveHistory() {
  if (!moveHistoryEl || !game) return;

  moveHistoryEl.innerHTML = "";
  const history = game.history();

  history.forEach((move, i) => {
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${move}`;
    moveHistoryEl.appendChild(li);
  });
}

function updateStatus() {
  if (!game) return;

  let text = "";

  if (game.in_checkmate()) {
    text = `Checkmate. ${game.turn() === "w" ? "Black" : "White"} wins.`;
  } else if (game.in_draw()) {
    text = "Draw.";
  } else {
    text = `${game.turn() === "w" ? "White" : "Black"} to move`;
    if (game.in_check()) text += " — Check!";
  }

  if (mode === "ai") text += " | Mode: AI";
  if (mode === "local") text += " | Mode: Local";
  if (mode === "online") {
    text += ` | Mode: Online | You are ${playerColor}`;
    text += isMyTurn ? " | Your turn" : " | Opponent turn";
  }

  safeSetStatus(text);
}

function applyBoardPosition() {
  if (board && game) {
    board.position(game.fen(), true);
  }
}

function resetGameLocal() {
  if (!game) game = new Chess();
  game.reset();

  if (board) {
    board.position("start", true);
    board.orientation("white");
  }

  isMyTurn = true;
  renderMoveHistory();
  updateStatus();
}

function onDragStart(source, piece) {
  if (!game) return false;
  if (game.game_over()) return false;

  if (
    (game.turn() === "w" && piece.startsWith("b")) ||
    (game.turn() === "b" && piece.startsWith("w"))
  ) {
    return false;
  }

  if (mode === "online") {
    if (!isMyTurn) return false;
    const turnColor = game.turn() === "w" ? "white" : "black";
    if (turnColor !== playerColor) return false;
  }

  return true;
}

function onDrop(source, target) {
  if (!game) return "snapback";

  const move = game.move({
    from: source,
    to: target,
    promotion: "q"
  });

  if (move === null) return "snapback";

  applyBoardPosition();
  renderMoveHistory();
  updateStatus();

  if (mode === "ai" && !game.game_over()) {
    setTimeout(makeAIMove, 300);
  }

  if (mode === "online" && socket && roomId) {
    isMyTurn = false;
    socket.emit("move", {
      roomId,
      move: {
        from: source,
        to: target,
        promotion: "q"
      }
    });
    updateStatus();
  }
}

function onSnapEnd() {
  applyBoardPosition();
}

function makeAIMove() {
  if (!game || !board) return;

  const moves = game.moves();
  if (!moves.length) return;

  const randomMove = moves[Math.floor(Math.random() * moves.length)];
  game.move(randomMove);
  applyBoardPosition();
  renderMoveHistory();
  updateStatus();
}

function leaveOnlineRoom() {
  if (socket && roomId) {
    socket.emit("leave-room", { roomId });
  }

  roomId = null;
  playerColor = "white";
  isMyTurn = true;

  if (roomCodeEl) roomCodeEl.textContent = "None";
}

function startAI() {
  leaveOnlineRoom();
  mode = "ai";
  resetGameLocal();
}

function startLocal() {
  leaveOnlineRoom();
  mode = "local";
  resetGameLocal();
}

function flipBoard() {
  if (board) board.flip();
}

function randomRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function connectSocket() {
  if (socket) return;

  socket = io(SERVER_URL, {
    transports: ["websocket", "polling"]
  });

  socket.on("connect", () => {
    if (serverStateEl) serverStateEl.textContent = "Connected";
  });

  socket.on("disconnect", () => {
    if (serverStateEl) serverStateEl.textContent = "Disconnected";
  });

  socket.on("room-created", (data) => {
    mode = "online";
    roomId = data.roomId;
    playerColor = data.color;
    isMyTurn = data.color === "white";

    if (roomCodeEl) roomCodeEl.textContent = roomId;

    if (!game) game = new Chess();
    game.reset();

    if (board) {
      board.orientation("white");
      board.position("start", true);
    }

    renderMoveHistory();
    updateStatus();
  });

  socket.on("room-joined", (data) => {
    mode = "online";
    roomId = data.roomId;
    playerColor = data.color;

    if (roomCodeEl) roomCodeEl.textContent = roomId;

    if (!game) game = new Chess();
    game.reset();

    if (data.fen) {
      game.load(data.fen);
    }

    if (board) {
      board.orientation(playerColor === "black" ? "black" : "white");
      applyBoardPosition();
    }

    isMyTurn = playerColor === "white" ? game.turn() === "w" : game.turn() === "b";

    renderMoveHistory();
    updateStatus();
  });

  socket.on("opponent-joined", () => {
    updateStatus();
  });

  socket.on("move-played", (data) => {
    if (!game) game = new Chess();

    if (data.fen && data.fen !== game.fen()) {
      game.load(data.fen);
      applyBoardPosition();
      isMyTurn = true;
      renderMoveHistory();
      updateStatus();
    }
  });

  socket.on("room-reset", (data) => {
    if (!game) game = new Chess();

    if (data.fen) {
      game.load(data.fen);
    } else {
      game.reset();
    }

    applyBoardPosition();
    isMyTurn = playerColor === "white";
    renderMoveHistory();
    updateStatus();
  });

  socket.on("error-message", (message) => {
    alert(message);
  });

  socket.on("opponent-left", () => {
    safeSetStatus("Opponent left the room.");
  });
}

function createRoom() {
  connectSocket();
  const newRoomId = randomRoomCode();
  socket.emit("create-room", { roomId: newRoomId });
}

function joinRoom() {
  connectSocket();

  const enteredRoom = roomInput.value.trim().toUpperCase();
  if (!enteredRoom) {
    alert("Enter a room code first.");
    return;
  }

  socket.emit("join-room", { roomId: enteredRoom });
}

function resetOnlineGame() {
  if (!socket || !roomId) return;
  socket.emit("reset-room", { roomId });
}

function initBoard() {
  const boardElement = document.getElementById("board");

  if (!boardElement) {
    safeSetStatus("Error: board element not found");
    return;
  }

  if (typeof $ === "undefined") {
    safeSetStatus("Error: jQuery did not load");
    return;
  }

  if (typeof Chess === "undefined") {
    safeSetStatus("Error: chess.js did not load");
    return;
  }

  if (typeof Chessboard === "undefined") {
    safeSetStatus("Error: chessboard.js did not load");
    return;
  }

  game = new Chess();

  board = Chessboard("board", {
    draggable: true,
    position: "start",
    pieceTheme:
      "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png",
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
  });

  renderMoveHistory();
  updateStatus();
}

function bindEvents() {
  document.getElementById("aiBtn")?.addEventListener("click", startAI);
  document.getElementById("localBtn")?.addEventListener("click", startLocal);
  document.getElementById("createRoomBtn")?.addEventListener("click", createRoom);
  document.getElementById("joinRoomBtn")?.addEventListener("click", joinRoom);
  document.getElementById("flipBtn")?.addEventListener("click", flipBoard);
  document.getElementById("resetBtn")?.addEventListener("click", () => {
    if (mode === "online") {
      resetOnlineGame();
    } else {
      resetGameLocal();
    }
  });
}

window.addEventListener("error", (e) => {
  safeSetStatus(`JS Error: ${e.message}`);
});

document.addEventListener("DOMContentLoaded", () => {
  statusEl = document.getElementById("status");
  roomInput = document.getElementById("roomInput");
  roomCodeEl = document.getElementById("roomCode");
  moveHistoryEl = document.getElementById("moveHistory");
  serverStateEl = document.getElementById("serverState");

  bindEvents();
  initBoard();
  connectSocket();
});
