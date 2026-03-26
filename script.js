const SERVER_URL = "https://youooo-chess-backend.onrender.com";

let socket = null;
let board = null;
let game = new Chess();

let mode = "local";
let roomId = null;
let playerColor = "white";
let isMyTurn = true;

const statusEl = document.getElementById("status");
const roomInput = document.getElementById("roomInput");
const roomCodeEl = document.getElementById("roomCode");
const moveHistoryEl = document.getElementById("moveHistory");
const serverStateEl = document.getElementById("serverState");

function safeSetStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function updateStatus() {
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

function renderMoveHistory() {
  moveHistoryEl.innerHTML = "";
  const history = game.history();

  history.forEach((move, i) => {
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${move}`;
    moveHistoryEl.appendChild(li);
  });
}

function onDragStart(source, piece) {
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
  const move = game.move({
    from: source,
    to: target,
    promotion: "q"
  });

  if (move === null) return "snapback";

  board.position(game.fen(), true);
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
      },
      fen: game.fen()
    });
    updateStatus();
  }
}

function onSnapEnd() {
  board.position(game.fen());
}

function makeAIMove() {
  const moves = game.moves();
  if (!moves.length) return;

  const randomMove = moves[Math.floor(Math.random() * moves.length)];
  game.move(randomMove);
  board.position(game.fen(), true);
  renderMoveHistory();
  updateStatus();
}

function resetGameLocal() {
  game.reset();
  board.start();
  renderMoveHistory();
  updateStatus();
}

function startAI() {
  leaveOnlineRoom();
  mode = "ai";
  roomId = null;
  playerColor = "white";
  isMyTurn = true;
  roomCodeEl.textContent = "None";
  resetGameLocal();
}

function startLocal() {
  leaveOnlineRoom();
  mode = "local";
  roomId = null;
  playerColor = "white";
  isMyTurn = true;
  roomCodeEl.textContent = "None";
  resetGameLocal();
}

function flipBoard() {
  board.flip();
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
    serverStateEl.textContent = "Connected";
  });

  socket.on("disconnect", () => {
    serverStateEl.textContent = "Disconnected";
  });

  socket.on("room-created", (data) => {
    mode = "online";
    roomId = data.roomId;
    playerColor = data.color;
    isMyTurn = data.color === "white";
    roomCodeEl.textContent = roomId;

    game.reset();
    board.start();
    renderMoveHistory();
    updateStatus();
  });

  socket.on("room-joined", (data) => {
    mode = "online";
    roomId = data.roomId;
    playerColor = data.color;
    isMyTurn = data.color === "white" ? game.turn() === "w" : game.turn() === "b";
    roomCodeEl.textContent = roomId;

    if (data.fen) {
      game.load(data.fen);
      board.position(data.fen, true);
    }

    if (playerColor === "black") {
      board.orientation("black");
    } else {
      board.orientation("white");
    }

    renderMoveHistory();
    updateStatus();
  });

  socket.on("opponent-joined", () => {
    safeSetStatus("Opponent joined. Game started.");
    updateStatus();
  });

  socket.on("move-played", (data) => {
    if (data.fen !== game.fen()) {
      game.load(data.fen);
      board.position(data.fen, true);
      isMyTurn = true;
      renderMoveHistory();
      updateStatus();
    }
  });

  socket.on("room-reset", (data) => {
    game.load(data.fen);
    board.position(data.fen, true);
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

function leaveOnlineRoom() {
  if (socket && roomId) {
    socket.emit("leave-room", { roomId });
  }

  roomId = null;
  playerColor = "white";
  isMyTurn = true;
  roomCodeEl.textContent = "None";
}

function initBoard() {
  if (typeof Chess === "undefined") {
    safeSetStatus("Error: chess.js did not load");
    return;
  }

  if (typeof Chessboard === "undefined") {
    safeSetStatus("Error: chessboard.js did not load");
    return;
  }

  board = Chessboard("board", {
    draggable: true,
    position: "start",
    pieceTheme:
      "https://cdnjs.cloudflare.com/ajax/libs/chessboard.js/1.0.0/img/chesspieces/wikipedia/{piece}.png",
    onDragStart,
    onDrop,
    onSnapEnd
  });

  renderMoveHistory();
  updateStatus();
}

document.getElementById("aiBtn").addEventListener("click", startAI);
document.getElementById("localBtn").addEventListener("click", startLocal);
document.getElementById("createRoomBtn").addEventListener("click", createRoom);
document.getElementById("joinRoomBtn").addEventListener("click", joinRoom);
document.getElementById("flipBtn").addEventListener("click", flipBoard);
document.getElementById("resetBtn").addEventListener("click", () => {
  if (mode === "online") {
    resetOnlineGame();
  } else {
    resetGameLocal();
  }
});

window.addEventListener("error", (e) => {
  safeSetStatus(`JS Error: ${e.message}`);
});

initBoard();
connectSocket();
