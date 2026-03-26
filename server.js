const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Chess } = require("chess.js");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Youooo Chess backend is running.");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      game: new Chess(),
      players: {
        white: null,
        black: null
      }
    });
  }
  return rooms.get(roomId);
}

function cleanupRoomIfEmpty(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const noWhite = !room.players.white;
  const noBlack = !room.players.black;

  if (noWhite && noBlack) {
    rooms.delete(roomId);
  }
}

io.on("connection", (socket) => {
  socket.on("create-room", ({ roomId }) => {
    const existingRoom = rooms.get(roomId);

    if (existingRoom && existingRoom.players.white) {
      socket.emit("error-message", "Room already exists. Try another code.");
      return;
    }

    const room = getOrCreateRoom(roomId);
    room.players.white = socket.id;

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.color = "white";

    socket.emit("room-created", {
      roomId,
      color: "white"
    });
  });

  socket.on("join-room", ({ roomId }) => {
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit("error-message", "Room not found.");
      return;
    }

    if (room.players.black) {
      socket.emit("error-message", "Room is full.");
      return;
    }

    room.players.black = socket.id;

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.color = "black";

    socket.emit("room-joined", {
      roomId,
      color: "black",
      fen: room.game.fen()
    });

    io.to(room.players.white).emit("opponent-joined");
  });

  socket.on("move", ({ roomId, move }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const color = socket.data.color;
    const turnColor = room.game.turn() === "w" ? "white" : "black";

    if (color !== turnColor) {
      socket.emit("error-message", "Not your turn.");
      return;
    }

    const result = room.game.move(move);
    if (!result) {
      socket.emit("error-message", "Illegal move.");
      return;
    }

    io.to(roomId).emit("move-played", {
      fen: room.game.fen()
    });
  });

  socket.on("reset-room", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.game.reset();

    io.to(roomId).emit("room-reset", {
      fen: room.game.fen()
    });
  });

  socket.on("leave-room", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    if (room.players.white === socket.id) {
      room.players.white = null;
    }

    if (room.players.black === socket.id) {
      room.players.black = null;
    }

    socket.leave(roomId);
    socket.to(roomId).emit("opponent-left");

    cleanupRoomIfEmpty(roomId);
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    if (room.players.white === socket.id) {
      room.players.white = null;
    }

    if (room.players.black === socket.id) {
      room.players.black = null;
    }

    socket.to(roomId).emit("opponent-left");
    cleanupRoomIfEmpty(roomId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Youooo Chess server running on port ${PORT}`);
});
