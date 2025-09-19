require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");
const os = require("os");

const app = express();
const server = http.createServer(app);

// 🔐 CORS - allow any LAN device
app.use(cors({
  origin: true, // allow all origins
  credentials: true,
}));

// 🌐 Socket.IO
const io = new Server(server, {
  cors: { origin: true, methods: ["GET", "POST"] },
});

const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// ✅ Multer storage & safe filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, safeName);
  },
});

const allowedExtensions = ['.jpg', '.png', '.pdf', '.docx', '.zip', '.txt', '.exe'];
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) return cb(new Error("File type not allowed"));
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ✅ Upload endpoint
const userUploads = {};
app.post("/upload", upload.array("files"), (req, res) => {
  const userId = req.headers["socket-id"];
  if (!userUploads[userId]) userUploads[userId] = [];
  const uploaded = req.files.map(f => f.filename);
  userUploads[userId].push(...uploaded);

  io.emit("files", getUploadedFiles());
  res.status(200).json({ message: "Upload successful", files: uploaded });
});

// ✅ Serve uploads
app.use("/uploads", express.static(UPLOAD_DIR));

// 🔁 Helper
const getUploadedFiles = () => fs.readdirSync(UPLOAD_DIR);

let devices = [];
let exchangeStarted = false;

// ✅ Socket.IO
io.on("connection", (socket) => {
  const userId = socket.id;
  console.log("New device connected:", userId);

  if (devices.length < 2) {
    devices.push(userId);
    io.emit("joined", { deviceNumber: devices.length });
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
    console.log("Device left:", userId);

    const filesToDelete = userUploads[userId] || [];
    filesToDelete.forEach(filename => {
      const filePath = path.join(UPLOAD_DIR, filename);
      fs.unlink(filePath, (err) => {
        if (err) console.error("Couldn't delete:", filename, err);
        else console.log("Deleted:", filename);
      });
    });

    delete userUploads[userId];
    devices = devices.filter(id => id !== userId);
    io.emit("devices", devices);
    io.emit("files", getUploadedFiles());
    exchangeStarted = false;
  });
});

// 🔹 Dynamic LAN IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

const PORT = 5000;
server.listen(PORT, () => {
  const ip = getLocalIP();
  console.log(`🚀 File Exchange Server running on http://${ip}:${PORT}`);
});
