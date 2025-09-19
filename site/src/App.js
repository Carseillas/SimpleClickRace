import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";

const SERVER_URL = "http://192.168.1.58:5000"; // Replace with your LAN IP

function App() {
  const socket = useRef(null);

  const [deviceNumber, setDeviceNumber] = useState(null);
  const [status, setStatus] = useState("Connecting...");
  const [exchangeActive, setExchangeActive] = useState(false);
  const [files, setFiles] = useState(null);
  const [progress, setProgress] = useState({ started: false, pc: 0 });
  const [msg, setMsg] = useState(null);
  const [fileList, setFileList] = useState([]);

  useEffect(() => {
    // Connect immediately
    const s = io(SERVER_URL);
    socket.current = s;

    s.on("connect", () => setStatus("Connected"));
    s.on("disconnect", () => setStatus("Disconnected"));
    s.on("files", setFileList);
    s.on("joined", ({ deviceNumber }) => setDeviceNumber(deviceNumber));
    s.on("start", () => setExchangeActive(true));
    s.on("end", () => setExchangeActive(false));
    s.on("devices", (devices) => setStatus(`Devices connected: ${devices.length}`));
    s.on("full", () => setStatus("Exchange full, wait"));

    return () => {
      if (socket.current) socket.current.disconnect();
    };
  }, []);

  const handleUpload = () => {
    if (!exchangeActive) return setMsg("Exchange not active");
    if (!files || files.length === 0) return setMsg("No file selected");
    if (!socket.current) return setMsg("Socket not ready");

    const MAX_SIZE_MB = 1024;
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > MAX_SIZE_MB * 1024 * 1024) {
        return setMsg(`"${files[i].name}" is too large`);
      }
    }

    socket.current.emit("upload");

    const fd = new FormData();
    for (let i = 0; i < files.length; i++) fd.append("files", files[i]);

    setMsg("Uploading...");
    setProgress({ started: true, pc: 0 });

    axios.post(`${SERVER_URL}/upload`, fd, {
      onUploadProgress: (e) =>
        setProgress((prev) => ({ ...prev, pc: (e.loaded / e.total) * 100 }))
    })
    .then(() => {
      setMsg("Upload Successful");
      if (socket.current) socket.current.emit("end");
    })
    .catch(() => setMsg("Upload Failed"));
  };

  const handleStart = () => {
    if (socket.current) {
      socket.current.emit("start");
    } else {
      setMsg("Socket not connected yet");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>File Exchange By LAN</h1>
      <p>Device no: {deviceNumber || "?"}</p>
      <p>Status: {status}</p>

      <div style={{ width: "40%", margin: "0 auto", padding: "20px", backgroundColor: "#f0f0f0", border: "5px solid #ccc", borderRadius: "8px" }}>
        <button onClick={handleStart} disabled={!socket.current || exchangeActive}>
          Start Exchange
        </button>
        <br /><br />
        <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
        <br /><br />
        <button onClick={handleUpload} disabled={!exchangeActive || !socket.current} style={{ padding: "20px", fontSize: "24px" }}>
          Upload
        </button>
        {progress.started && <progress max="100" value={progress.pc}></progress>}
        {msg && <p>{msg}</p>}
      </div>

      <div style={{ width: "40%", margin: "20px auto", padding: "20px", backgroundColor: "#f0f0f0", border: "5px solid #ccc", borderRadius: "8px" }}>
        <h2>Uploaded Files</h2>
        {fileList.length === 0 && <p>No files yet</p>}
        <ul>
          {fileList.map((file, idx) => (
            <li key={idx}>
              <a href={`${SERVER_URL}/uploads/${encodeURIComponent(file)}`} download>{file}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
