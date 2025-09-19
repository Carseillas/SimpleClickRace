const express = require("express");
const http = require("http");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// 🔐 CORS - allow localhost + LAN frontend
const FRONTEND_URLS = ["http://localhost:3000", "http://192.168.1.58:3000"]; // add your LAN IP
app.use(cors({
  origin: FRONTEND_URLS,
  credentials: true,
}));

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URLS,
    methods: ["GET", "POST"],
  }
});

// Upload folder
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// Multer storage & filter
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, safeName);
  }
});

const allowedExtensions = ['.jpg', '.png', '.pdf', '.docx', '.zip', '.txt', '.exe'];
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) return cb(new Error("File type not allowed"));
    cb(null, true);
  },
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
});

// Helper to list files
const getUploadedFiles = () => fs.readdirSync(UPLOAD_DIR);

let userUploads = {};
let devices = [];
let exchangeStarted = false;

// Upload endpoint
app.post("/upload", upload.array("files"), (req, res) => {
  const userId = req.headers["socket-id"] || "guest";
  const uploaded = req.files.map(f => f.filename);

  if (!userUploads[userId]) userUploads[userId] = [];
  userUploads[userId].push(...uploaded);

  io.emit("files", getUploadedFiles());
  res.status(200).json({ message: "Upload successful", files: uploaded });
});

// Serve uploaded files
app.use("/uploads", express.static(UPLOAD_DIR));

// Socket.IO
io.on("connection", (socket) => {
  console.log("Device connected:", socket.id);

  if (devices.length < 2) {
    devices.push(socket.id);
    socket.emit("joined", { deviceNumber: devices.length });
    io.emit("devices", devices);
    socket.emit("files", getUploadedFiles());
  } else {
    socket.emit("full");
    return;
  }

  socket.on("start", () => {
    if (!exchangeStarted && devices.length === 2) {
      exchangeStarted = true;
      io.emit("start");
    }
  });

  socket.on("upload", () => io.emit("upload"));

  socket.on("end", () => {
    io.emit("end");
    exchangeStarted = false;
  });

  socket.on("disconnect", () => {
    console.log("Device left:", socket.id);

    // Delete files uploaded by this device
    const filesToDelete = userUploads[socket.id] || [];
    filesToDelete.forEach(filename => {
      const filePath = path.join(UPLOAD_DIR, filename);
      fs.unlink(filePath, err => {
        if (err) console.error("Couldn't delete:", filename, err);
        else console.log("Deleted:", filename);
      });
    });

    delete userUploads[socket.id];
    devices = devices.filter(id => id !== socket.id);
    io.emit("devices", devices);
    io.emit("files", getUploadedFiles());
    exchangeStarted = false;
  });
});

server.listen(5000, () => {
  console.log("🚀 File Exchange Server running on http://192.168.1.58:5000");
});
