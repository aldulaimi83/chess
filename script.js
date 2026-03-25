let board;
let game = new Chess();

let mode = "local";
let roomId = null;

function initBoard() {
  board = Chessboard('board', {
    draggable: true,
    position: 'start',
    onDrop: onDrop
  });
}

function onDrop(source, target) {
  let move = game.move({
    from: source,
    to: target,
    promotion: 'q'
  });

  if (move === null) return 'snapback';

  updateStatus();

  if (mode === "ai") {
    window.setTimeout(makeAIMove, 250);
  }

  if (mode === "online") {
    sendMove(move);
  }
}

function updateStatus() {
  let status = "";

  if (game.in_checkmate()) {
    status = "Game over, checkmate!";
  } else if (game.in_draw()) {
    status = "Draw!";
  } else {
    status = (game.turn() === 'w' ? "White" : "Black") + " to move";
  }

  document.getElementById('status').innerText = status;
}

function makeAIMove() {
  let moves = game.moves();
  let move = moves[Math.floor(Math.random() * moves.length)];
  game.move(move);
  board.position(game.fen());
  updateStatus();
}

function startAI() {
  mode = "ai";
  game.reset();
  board.start();
}

function startLocal() {
  mode = "local";
  game.reset();
  board.start();
}

function flipBoard() {
  board.flip();
}

/* ================= ONLINE ================= */

function createRoom() {
  mode = "online";
  roomId = Math.random().toString(36).substring(2, 7);
  document.getElementById('status').innerText = "Room: " + roomId;

  firebase.database().ref("rooms/" + roomId).set({
    fen: game.fen()
  });

  listenRoom();
}

function joinRoom() {
  mode = "online";
  roomId = document.getElementById("roomInput").value;

  listenRoom();
}

function sendMove(move) {
  firebase.database().ref("rooms/" + roomId).set({
    fen: game.fen()
  });
}

function listenRoom() {
  firebase.database().ref("rooms/" + roomId).on("value", (snapshot) => {
    let data = snapshot.val();
    if (!data) return;

    game.load(data.fen);
    board.position(data.fen);
    updateStatus();
  });
}

/* ================= INIT ================= */

initBoard();
updateStatus();
