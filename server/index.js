const express = require("express");
const http = require("http");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const upload = multer({ dest: 'uploads/' });

const uploadedFiles = {};

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let devices = [];
let exchangeStarted = false;

function getUploadedFiles() {
  return fs.readdirSync(path.join(__dirname, "uploads"));
}

app.post("/upload", upload.array("files"), (req, res) => {
  const socketId = req.headers["socket-id"]; // React’ten gönderilecek
  const fileNames = req.files.map((file) => file.filename);

  // Bu socket ID'ye ait yüklenen dosyaları kaydet
  if (!uploadedFiles[socketId]) {
    uploadedFiles[socketId] = [];
  }
  uploadedFiles[socketId].push(...fileNames);

  // Listeyi herkese gönder
  fs.readdir(path.join(__dirname, "uploads"), (err, files) => {
    if (err) return res.status(500).send("Server error");
    io.emit("files", files);
    res.send({ message: "Files uploaded", files });
  });
});

// Statik dosyaları sun (indirilebilir dosyalar)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

io.on("connection", (socket) => {
  console.log("New device connected:", socket.id);

  if (devices.length < 2) {
    devices.push(socket.id);
    io.emit("joined", { id: socket.id, deviceNumber: devices.length });
    io.emit("devices", devices);
    // Yeni bağlanan client'a mevcut dosya listesini gönder
    socket.emit("files", getUploadedFiles());
  } else {
    socket.emit("full");
    return;
  }

  socket.on("start", () => {
    if (!exchangeStarted && devices.length === 2) {
      exchangeStarted = true;
      io.emit("start")
    }
  });

  socket.on("upload", () => {
    io.emit("upload")
  });

  socket.on("end", () => {
    io.emit("end")
    exchangeStarted = false;
  });

  socket.on("disconnect", () => {
    console.log("Device left:", socket.id);
    const filesToDelete = uploadedFiles[socket.id] || [];
    filesToDelete.forEach((filename) => {
      const filePath = path.join(__dirname, "uploads", filename);
      fs.unlink(filePath, (err) => {
        if (err) console.error("Dosya silinemedi:", filename, err);
        else console.log("Silindi:", filename);
      });
    });
    fs.readdir(path.join(__dirname, "uploads"), (err, files) => {
      if (!err) io.emit("files", files);
    });
    devices = devices.filter((id) => id !== socket.id);
    io.emit("devices", devices);
    // Temizle
    delete uploadedFiles[socket.id];
    exchangeStarted = false;
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000...");
});
