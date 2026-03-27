const SERVER_URL = "https://youooo-chess-backend.onrender.com";

let socket = null;
let board = null;
let game = null;

let currentSection = "play"; // play | academy
let playMode = "local"; // local | ai | online
let roomId = null;
let playerColor = "white";
let isMyTurn = true;

let currentLevel = "beginner";
let currentLessonId = null;
let currentLessonStepIndex = 0;
let lessonCompleted = {};
let academyLocked = false;

let statusEl;
let roomInput;
let roomCodeEl;
let moveHistoryEl;
let serverStateEl;
let playPanel;
let academyPanel;
let currentSectionLabel;
let lessonListEl;
let lessonTitleEl;
let lessonSummaryEl;
let coachBoxEl;
let lessonLevelTagEl;
let lessonTypeTagEl;
let academyProgressBadgeEl;
let progressStatsEl;

const lessons = [
  {
    id: "rook-lines",
    level: "beginner",
    type: "lesson",
    title: "Rook Moves in Straight Lines",
    summary: "A rook moves horizontally or vertically. Move the rook from a1 to a8.",
    fen: "8/8/8/8/8/8/8/R3K3 w - - 0 1",
    orientation: "white",
    coachIntro: "The rook is strongest on open files and ranks. It cannot move diagonally.",
    hints: ["Look straight up the board.", "Move the rook from a1 to a8."],
    completionText: "Great. You moved the rook in a straight line.",
    expectedMoves: [
      { by: "user", from: "a1", to: "a8", note: "Exactly. Rooks travel in straight lines." }
    ]
  },
  {
    id: "bishop-diagonal",
    level: "beginner",
    type: "lesson",
    title: "Bishop Moves Diagonally",
    summary: "A bishop moves on diagonals only. Move the bishop from c1 to h6.",
    fen: "8/8/8/8/8/8/8/2B1K3 w - - 0 1",
    orientation: "white",
    coachIntro: "Bishops stay on the same color squares for the entire game.",
    hints: ["Trace the diagonal from c1.", "The target square is h6."],
    completionText: "Nice. You used the bishop correctly on a diagonal.",
    expectedMoves: [
      { by: "user", from: "c1", to: "h6", note: "Correct. Bishops slide diagonally." }
    ]
  },
  {
    id: "knight-jump",
    level: "beginner",
    type: "lesson",
    title: "Knight Jumps in an L Shape",
    summary: "Knights move in an L shape and can jump over pieces. Move the knight from d4 to f5.",
    fen: "8/8/8/8/3N4/8/8/4K3 w - - 0 1",
    orientation: "white",
    coachIntro: "Knights move two squares one way and one square the other way.",
    hints: ["Think: two and one.", "From d4 the target is f5."],
    completionText: "Perfect. Knights are tricky because they jump.",
    expectedMoves: [
      { by: "user", from: "d4", to: "f5", note: "Correct. The knight jumped in an L shape." }
    ]
  },
  {
    id: "castle-king-safety",
    level: "beginner",
    type: "lesson",
    title: "Castling for King Safety",
    summary: "Castle kingside to bring the king to safety and connect your rook.",
    fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
    orientation: "white",
    coachIntro: "Castling is one of the most important opening habits for king safety.",
    hints: ["Move the king two squares toward the rook.", "White castles kingside by moving king e1 to g1."],
    completionText: "Well done. Castling keeps your king safer.",
    expectedMoves: [
      { by: "user", from: "e1", to: "g1", note: "Good. That is kingside castling." }
    ]
  },
  {
    id: "mate-in-one",
    level: "beginner",
    type: "puzzle",
    title: "Checkmate in One",
    summary: "Find the move that gives immediate checkmate.",
    fen: "6k1/5ppp/8/8/8/8/5PPP/6RK w - - 0 1",
    orientation: "white",
    coachIntro: "Look for forcing moves. Checks are the first thing to consider in tactics.",
    hints: ["Use the rook on g1.", "Move the rook to e1 for mate."],
    completionText: "Excellent. You found a simple mating net.",
    expectedMoves: [
      { by: "user", from: "g1", to: "e1", note: "Correct. Re1# is checkmate." }
    ]
  },
  {
    id: "fork-tactic",
    level: "intermediate",
    type: "puzzle",
    title: "Knight Fork",
    summary: "Use the knight to attack two important pieces at once.",
    fen: "4k3/8/8/3q4/8/2N5/8/4K3 w - - 0 1",
    orientation: "white",
    coachIntro: "Forks win material by attacking more than one target at the same time.",
    hints: ["The knight can check the king and hit the queen.", "Try b5+."],
    completionText: "Great tactical vision. Forks are powerful beginner-intermediate weapons.",
    expectedMoves: [
      { by: "user", from: "c3", to: "b5", note: "Exactly. Nb5+ forks the king and queen." }
    ]
  },
  {
    id: "pin-tactic",
    level: "intermediate",
    type: "puzzle",
    title: "Use a Pin",
    summary: "Pin the knight to the king with your bishop.",
    fen: "4k3/8/8/8/8/5n2/4b3/4K2B w - - 0 1",
    orientation: "white",
    coachIntro: "Pinned pieces often cannot move because they would expose something more valuable behind them.",
    hints: ["Your bishop on h1 can attack the king's diagonal.", "Move bishop to c6."],
    completionText: "Nice. A pin can completely freeze a defender.",
    expectedMoves: [
      { by: "user", from: "h1", to: "c6", note: "Correct. The knight is pinned to the king." }
    ]
  },
  {
    id: "opening-center",
    level: "intermediate",
    type: "lesson",
    title: "Fight for the Center",
    summary: "Play a strong central opening move.",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    orientation: "white",
    coachIntro: "In the opening, control the center, develop pieces, and protect your king.",
    hints: ["Push a central pawn two squares.", "e4 is the classical choice here."],
    completionText: "Good start. Central space helps all your pieces.",
    expectedMoves: [
      { by: "user", from: "e2", to: "e4", note: "Correct. e4 claims central space." },
      { by: "coach", from: "e7", to: "e5", note: "Black responds in the center too." },
      { by: "user", from: "g1", to: "f3", note: "Excellent. Develop a knight and attack e5." }
    ]
  },
  {
    id: "remove-defender",
    level: "advanced",
    type: "puzzle",
    title: "Remove the Defender",
    summary: "Eliminate the defender first, then win the target.",
    fen: "4k3/8/8/8/4q3/8/4R3/4K2Q w - - 0 1",
    orientation: "white",
    coachIntro: "Many advanced tactics start by removing the one piece that protects everything.",
    hints: ["Your rook can capture the queen.", "Play Rxe4+."],
    completionText: "Excellent. Removing the defender is a classic tactical idea.",
    expectedMoves: [
      { by: "user", from: "e2", to: "e4", note: "Correct. You removed the strongest defender immediately." }
    ]
  },
  {
    id: "back-rank",
    level: "advanced",
    type: "puzzle",
    title: "Back Rank Mate",
    summary: "Use the weak back rank to checkmate.",
    fen: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1",
    orientation: "white",
    coachIntro: "If the king has no escape squares and the pawns trap it, heavy pieces become deadly.",
    hints: ["Use the rook on d1.", "Rd8+ is the winning move."],
    completionText: "Correct. Back-rank weaknesses decide many practical games.",
    expectedMoves: [
      { by: "user", from: "d1", to: "d8", note: "Beautiful. Rd8# finishes the game." }
    ]
  },
  {
    id: "queen-sac-mate",
    level: "expert",
    type: "puzzle",
    title: "Queen Sacrifice Pattern",
    summary: "A forcing attack sometimes requires a sacrifice. Find the first move.",
    fen: "6k1/5ppp/8/8/8/5Q2/5PPP/6K1 w - - 0 1",
    orientation: "white",
    coachIntro: "Expert players calculate forcing lines with checks, captures, and threats.",
    hints: ["Start with a checking move.", "Qa8+ is the move."],
    completionText: "Strong pattern recognition. Forcing lines are everything in tactical attacks.",
    expectedMoves: [
      { by: "user", from: "f3", to: "a8", note: "Correct. A forcing queen check starts the sequence." }
    ]
  },
  {
    id: "mate-net-sequence",
    level: "expert",
    type: "lesson",
    title: "Build a Mate Net",
    summary: "Play the forcing sequence to trap the king.",
    fen: "6k1/5ppp/8/8/8/5Q2/5PPP/4R1K1 w - - 0 1",
    orientation: "white",
    coachIntro: "When you attack, coordinate your pieces so every escape square disappears.",
    hints: ["Start with Re8+.", "Then use your queen if needed to finish the net."],
    completionText: "Excellent. You coordinated rook and queen to trap the king.",
    expectedMoves: [
      { by: "user", from: "e1", to: "e8", note: "Nice. Force the king to react." },
      { by: "coach", from: "g8", to: "h7", note: "The king tries to run." },
      { by: "user", from: "f3", to: "h3", note: "Perfect. Qh3 seals the mating net." }
    ]
  }
];

function safeSetStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function saveProgress() {
  localStorage.setItem("youooo_chess_academy_progress", JSON.stringify(lessonCompleted));
}

function loadProgress() {
  try {
    lessonCompleted = JSON.parse(localStorage.getItem("youooo_chess_academy_progress")) || {};
  } catch (e) {
    lessonCompleted = {};
  }
}

function getLessonById(id) {
  return lessons.find((lesson) => lesson.id === id);
}

function getLessonsByLevel(level) {
  return lessons.filter((lesson) => lesson.level === level);
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

  if (currentSection === "play") {
    if (playMode === "ai") text += " | Play vs AI";
    if (playMode === "local") text += " | 2 Players";
    if (playMode === "online") {
      text += ` | Online | You are ${playerColor}`;
      text += isMyTurn ? " | Your turn" : " | Opponent turn";
    }
  } else if (currentSection === "academy") {
    const lesson = getLessonById(currentLessonId);
    if (lesson) {
      text += ` | Academy | ${lesson.title}`;
    }
  }

  safeSetStatus(text);
}

function clearSquareHighlights() {
  if (typeof $ === "undefined") return;
  $("#board .square-55d63").removeClass("square-hint square-target");
}

function highlightSquares(from, to) {
  clearSquareHighlights();
  if (from) $(`#board .square-${from}`).addClass("square-hint");
  if (to) $(`#board .square-${to}`).addClass("square-target");
}

function applyBoardPosition() {
  if (board && game) {
    board.position(game.fen(), true);
  }
}

function setCoachMessage(text) {
  if (coachBoxEl) coachBoxEl.textContent = text;
}

function setCurrentSection(section) {
  currentSection = section;

  document.getElementById("playTabBtn").classList.toggle("active", section === "play");
  document.getElementById("academyTabBtn").classList.toggle("active", section === "academy");

  playPanel.classList.toggle("active-panel", section === "play");
  academyPanel.classList.toggle("active-panel", section === "academy");

  currentSectionLabel.textContent = section === "play" ? "Play Mode" : "Academy Mode";

  clearSquareHighlights();
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

function resetGameLocal() {
  if (!game) game = new Chess();
  game.reset();

  if (board) {
    board.orientation("white");
    board.position("start", true);
  }

  isMyTurn = true;
  renderMoveHistory();
  clearSquareHighlights();
  updateStatus();
}

function startAI() {
  leaveOnlineRoom();
  currentSection = "play";
  playMode = "ai";
  setCurrentSection("play");
  resetGameLocal();
}

function startLocal() {
  leaveOnlineRoom();
  currentSection = "play";
  playMode = "local";
  setCurrentSection("play");
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
    setCurrentSection("play");
    playMode = "online";
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

    clearSquareHighlights();
    renderMoveHistory();
    updateStatus();
  });

  socket.on("room-joined", (data) => {
    setCurrentSection("play");
    playMode = "online";
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

    clearSquareHighlights();
    renderMoveHistory();
    updateStatus();
  });

  socket.on("opponent-joined", () => {
    setCoachMessage("Your online opponent joined the room.");
    updateStatus();
  });

  socket.on("move-played", (data) => {
    if (!game) game = new Chess();

    if (data.fen && data.fen !== game.fen()) {
      game.load(data.fen);
      applyBoardPosition();
      isMyTurn = true;
      clearSquareHighlights();
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
    clearSquareHighlights();
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
  setCurrentSection("play");
  connectSocket();
  const newRoomId = randomRoomCode();
  socket.emit("create-room", { roomId: newRoomId });
}

function joinRoom() {
  setCurrentSection("play");
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

function getCurrentLesson() {
  return getLessonById(currentLessonId);
}

function markLessonComplete(lessonId) {
  lessonCompleted[lessonId] = true;
  saveProgress();
  renderLessonList();
  renderProgress();
}

function renderProgress() {
  const total = lessons.length;
  const done = lessons.filter((l) => lessonCompleted[l.id]).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  academyProgressBadgeEl.textContent = `${percent}% Complete`;

  const levels = ["beginner", "intermediate", "advanced", "expert"];
  progressStatsEl.innerHTML = "";

  levels.forEach((level) => {
    const levelLessons = lessons.filter((l) => l.level === level);
    const levelDone = levelLessons.filter((l) => lessonCompleted[l.id]).length;

    const row = document.createElement("div");
    row.className = "progress-row";
    row.innerHTML = `
      <span>${capitalize(level)}</span>
      <span>${levelDone}/${levelLessons.length} complete</span>
    `;
    progressStatsEl.appendChild(row);
  });

  const totalRow = document.createElement("div");
  totalRow.className = "progress-row";
  totalRow.innerHTML = `<strong>Total</strong><strong>${done}/${total}</strong>`;
  progressStatsEl.appendChild(totalRow);
}

function renderLessonList() {
  const levelLessons = getLessonsByLevel(currentLevel);
  lessonListEl.innerHTML = "";

  levelLessons.forEach((lesson, index) => {
    const item = document.createElement("div");
    item.className = "lesson-item";
    if (lesson.id === currentLessonId) item.classList.add("active-lesson");
    if (lessonCompleted[lesson.id]) item.classList.add("done");

    item.innerHTML = `
      <div class="lesson-item-title">${index + 1}. ${lesson.title}</div>
      <div class="lesson-item-meta">${capitalize(lesson.type)} • ${lessonCompleted[lesson.id] ? "Completed" : "Not completed"}</div>
    `;

    item.addEventListener("click", () => {
      loadLesson(lesson.id);
    });

    lessonListEl.appendChild(item);
  });
}

function loadLesson(id) {
  const lesson = getLessonById(id);
  if (!lesson) return;

  leaveOnlineRoom();
  setCurrentSection("academy");
  playMode = "local";

  currentLessonId = lesson.id;
  currentLessonStepIndex = 0;
  academyLocked = false;

  if (!game) game = new Chess(lesson.fen);
  game.load(lesson.fen);

  if (board) {
    board.orientation(lesson.orientation || "white");
    applyBoardPosition();
  }

  lessonTitleEl.textContent = lesson.title;
  lessonSummaryEl.textContent = lesson.summary;
  lessonLevelTagEl.textContent = capitalize(lesson.level);
  lessonTypeTagEl.textContent = capitalize(lesson.type);
  setCoachMessage(lesson.coachIntro);

  clearSquareHighlights();
  renderMoveHistory();
  renderLessonList();
  renderProgress();
  updateStatus();

  const nextStep = lesson.expectedMoves[currentLessonStepIndex];
  if (nextStep && nextStep.by === "coach") {
    setTimeout(runCoachSteps, 500);
  }
}

function retryCurrentLesson() {
  if (!currentLessonId) return;
  loadLesson(currentLessonId);
}

function runCoachSteps() {
  const lesson = getCurrentLesson();
  if (!lesson || academyLocked) return;

  while (lesson.expectedMoves[currentLessonStepIndex] && lesson.expectedMoves[currentLessonStepIndex].by === "coach") {
    const step = lesson.expectedMoves[currentLessonStepIndex];
    const move = game.move({
      from: step.from,
      to: step.to,
      promotion: step.promotion || "q"
    });

    if (!move) {
      setCoachMessage("There was a lesson script problem. Retry the lesson.");
      return;
    }

    currentLessonStepIndex++;
    applyBoardPosition();
    renderMoveHistory();
    if (step.note) setCoachMessage(step.note);
  }

  updateStatus();

  if (currentLessonStepIndex >= lesson.expectedMoves.length) {
    finishLesson(lesson);
  }
}

function finishLesson(lesson) {
  academyLocked = true;
  markLessonComplete(lesson.id);
  setCoachMessage(lesson.completionText || "Lesson complete. Great job.");
  safeSetStatus(`Lesson complete: ${lesson.title}`);
}

function handleAcademyMove(source, target) {
  const lesson = getCurrentLesson();
  if (!lesson || academyLocked) return "snapback";

  const step = lesson.expectedMoves[currentLessonStepIndex];
  if (!step) return "snapback";

  if (step.by !== "user") {
    setCoachMessage("Wait for the coach move first.");
    return "snapback";
  }

  const attemptedMove = game.move({
    from: source,
    to: target,
    promotion: "q"
  });

  if (attemptedMove === null) return "snapback";

  const correct =
    source === step.from &&
    target === step.to &&
    ((step.promotion || "q") === "q" || !step.promotion || step.promotion === "q");

  if (!correct) {
    game.undo();
    setCoachMessage("Not the teaching move for this lesson. Use Hint if you want help.");
    highlightSquares(step.from, step.to);
    return "snapback";
  }

  currentLessonStepIndex++;
  applyBoardPosition();
  renderMoveHistory();
  clearSquareHighlights();
  if (step.note) setCoachMessage(step.note);
  updateStatus();

  if (currentLessonStepIndex >= lesson.expectedMoves.length) {
    finishLesson(lesson);
    return;
  }

  setTimeout(runCoachSteps, 500);
}

function showHint() {
  const lesson = getCurrentLesson();
  if (!lesson) {
    setCoachMessage("Choose a lesson first.");
    return;
  }

  const step = lesson.expectedMoves[currentLessonStepIndex];
  if (!step) {
    setCoachMessage("This lesson is already finished.");
    return;
  }

  if (step.by === "user") {
    highlightSquares(step.from, step.to);
    setCoachMessage(lesson.hints?.[0] || `Try ${step.from} to ${step.to}.`);
  } else {
    setCoachMessage("The next move belongs to the coach line. Watch what happens.");
  }
}

function goToAdjacentLesson(direction) {
  const levelLessons = getLessonsByLevel(currentLevel);
  if (!levelLessons.length) return;

  let index = levelLessons.findIndex((l) => l.id === currentLessonId);
  if (index === -1) index = 0;

  index += direction;

  if (index < 0) index = 0;
  if (index >= levelLessons.length) index = levelLessons.length - 1;

  loadLesson(levelLessons[index].id);
}

function setLevel(level) {
  currentLevel = level;

  document.querySelectorAll(".level-btn").forEach((btn) => {
    btn.classList.toggle("active-level", btn.dataset.level === level);
  });

  const levelLessons = getLessonsByLevel(level);
  const fallbackLesson = levelLessons[0]?.id || null;

  if (!currentLessonId || !getLessonsByLevel(level).some((l) => l.id === currentLessonId)) {
    currentLessonId = fallbackLesson;
  }

  renderLessonList();
  if (currentLessonId) loadLesson(currentLessonId);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
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

  if (currentSection === "play" && playMode === "online") {
    if (!isMyTurn) return false;
    const turnColor = game.turn() === "w" ? "white" : "black";
    if (turnColor !== playerColor) return false;
  }

  if (currentSection === "academy") {
    const lesson = getCurrentLesson();
    if (!lesson || academyLocked) return false;

    const step = lesson.expectedMoves[currentLessonStepIndex];
    if (!step || step.by !== "user") return false;
  }

  return true;
}

function onDrop(source, target) {
  if (!game) return "snapback";

  if (currentSection === "academy") {
    return handleAcademyMove(source, target);
  }

  const move = game.move({
    from: source,
    to: target,
    promotion: "q"
  });

  if (move === null) return "snapback";

  applyBoardPosition();
  clearSquareHighlights();
  renderMoveHistory();
  updateStatus();

  if (playMode === "ai" && !game.game_over()) {
    setTimeout(makeAIMove, 300);
  }

  if (playMode === "online" && socket && roomId) {
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
    pieceTheme: "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png",
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
  });

  renderMoveHistory();
  updateStatus();
}

function bindEvents() {
  document.getElementById("playTabBtn")?.addEventListener("click", () => {
    setCurrentSection("play");
    if (!game || currentSection !== "play") return;
    clearSquareHighlights();
    updateStatus();
  });

  document.getElementById("academyTabBtn")?.addEventListener("click", () => {
    setCurrentSection("academy");
    if (!currentLessonId) {
      const first = getLessonsByLevel(currentLevel)[0];
      if (first) loadLesson(first.id);
    } else {
      loadLesson(currentLessonId);
    }
  });

  document.getElementById("aiBtn")?.addEventListener("click", startAI);
  document.getElementById("localBtn")?.addEventListener("click", startLocal);
  document.getElementById("createRoomBtn")?.addEventListener("click", createRoom);
  document.getElementById("joinRoomBtn")?.addEventListener("click", joinRoom);
  document.getElementById("flipBtn")?.addEventListener("click", flipBoard);

  document.getElementById("resetBtn")?.addEventListener("click", () => {
    if (currentSection === "academy") {
      retryCurrentLesson();
    } else if (playMode === "online") {
      resetOnlineGame();
    } else {
      resetGameLocal();
    }
  });

  document.getElementById("hintBtn")?.addEventListener("click", showHint);
  document.getElementById("retryLessonBtn")?.addEventListener("click", retryCurrentLesson);
  document.getElementById("prevLessonBtn")?.addEventListener("click", () => goToAdjacentLesson(-1));
  document.getElementById("nextLessonBtn")?.addEventListener("click", () => goToAdjacentLesson(1));

  document.querySelectorAll(".level-btn").forEach((btn) => {
    btn.addEventListener("click", () => setLevel(btn.dataset.level));
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

  playPanel = document.getElementById("playPanel");
  academyPanel = document.getElementById("academyPanel");
  currentSectionLabel = document.getElementById("currentSectionLabel");
  lessonListEl = document.getElementById("lessonList");
  lessonTitleEl = document.getElementById("lessonTitle");
  lessonSummaryEl = document.getElementById("lessonSummary");
  coachBoxEl = document.getElementById("coachBox");
  lessonLevelTagEl = document.getElementById("lessonLevelTag");
  lessonTypeTagEl = document.getElementById("lessonTypeTag");
  academyProgressBadgeEl = document.getElementById("academyProgressBadge");
  progressStatsEl = document.getElementById("progressStats");

  loadProgress();
  bindEvents();
  initBoard();
  connectSocket();
  renderProgress();
  setCurrentSection("play");
  startLocal();
  setLevel("beginner");
});
