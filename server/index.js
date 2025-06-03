const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let players = [];
let clicks = {};
let gameStarted = false;

io.on("connection", (socket) => {
  console.log("Yeni oyuncu:", socket.id);

  if (players.length < 2) {
    players.push(socket.id);
    clicks[socket.id] = 0;
    socket.emit("joined", { id: socket.id, playerNumber: players.length });
    io.emit("players", players);
  } else {
    socket.emit("full");
  }

  socket.on("start", () => {
    if (!gameStarted && players.length === 2) {
      gameStarted = true;
      clicks[players[0]] = 0;
      clicks[players[1]] = 0;
      io.emit("start");
      setTimeout(() => {
        const score1 = clicks[players[0]];
        const score2 = clicks[players[1]];
        let result;
        if (score1 > score2) result = "Oyuncu 1 kazandı!";
        else if (score2 > score1) result = "Oyuncu 2 kazandı!";
        else result = "Berabere!";
        io.emit("end", { score1, score2, result });
        gameStarted = false;
      }, 5000);
    }
  });

  socket.on("click", () => {
    if (gameStarted && clicks[socket.id] !== undefined) {
      clicks[socket.id]++;
    }
  });

  socket.on("disconnect", () => {
    console.log("Oyuncu ayrıldı:", socket.id);
    players = players.filter((id) => id !== socket.id);
    delete clicks[socket.id];
    io.emit("players", players);
    gameStarted = false;
  });
});

server.listen(5000, () => {
  console.log("Sunucu 5000 portunda çalışıyor");
});
