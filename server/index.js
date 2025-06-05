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

let devices = [];

io.on("connection", (socket) => {
  console.log("New device connected:", socket.id);

  if (devices.length < 2) {
    devices.push(socket.id);
    socket.emit("joined", { id: socket.id, deviceNumber: devices.length });
    io.emit("devices", devices);
  } else {
    socket.emit("full");
  }

  socket.on("start", () => {
    if (!exchangeStarted && devices.length === 2) {
      exchangeStarted = true;
    }
  });

  socket.on("disconnect", () => {
    console.log("Device left:", socket.id);
    devices = devices.filter((id) => id !== socket.id);
    io.emit("devices", devices);
    exchangeStarted = false;
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000...");
});
