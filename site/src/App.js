import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";

// Auto-detect server IP based on current host
const SERVER_URL = `http://${window.location.hostname}:5000`;

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
    socket.current = io(SERVER_URL);

    socket.current.on("joined", ({ deviceNumber }) => {
      setDeviceNumber(deviceNumber);
      setStatus("Ready, waiting for another device...");
    });

    socket.current.on("files", (files) => setFileList(files));
    socket.current.on("full", () => setStatus("Someone is currently exchanging"));
    socket.current.on("devices", (devices) => {
      if (devices.length === 2) setStatus("Click to start exchange");
    });
    socket.current.on("start", () => {
      setStatus("Exchange Ready");
      setExchangeActive(true);
    });
    socket.current.on("end", () => {
      setExchangeActive(false);
      setStatus("Exchange Finished");
    });

    return () => socket.current.disconnect();
  }, []);

  const handleStart = () => {
    if (socket.current) socket.current.emit("start");
  };

  const handleUpload = () => {
    if (!exchangeActive || !files || files.length === 0) {
      setMsg("No file selected or exchange not active");
      return;
    }

    const fd = new FormData();
    for (let i = 0; i < files.length; i++) fd.append("files", files[i]);

    setMsg("Uploading...");
    setProgress({ started: true, pc: 0 });

    axios.post(`${SERVER_URL}/upload`, fd, {
      headers: { "socket-id": socket.current.id },
      onUploadProgress: (e) => {
        const percent = Math.round((e.loaded / e.total) * 100);
        setProgress({ started: true, pc: percent });
      },
    })
    .then(() => {
      setMsg("Upload successful");
      socket.current.emit("end");
    })
    .catch(() => setMsg("Upload failed"));
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>File Exchange Via LAN</h1>
      <p>Device no: {deviceNumber || "?"}</p>
      <p>Status: {status}</p>

      <div style={{
        width: "40%", margin: "0 auto", padding: "20px",
        backgroundColor: "#f0f0f0", border: "5px solid #ccc", borderRadius: "8px",
      }}>
        <button onClick={handleStart} disabled={!deviceNumber || exchangeActive}>Start Exchange</button>
        <br /><br />
        <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
        <button onClick={handleUpload} disabled={!exchangeActive} style={{ padding: "20px", fontSize: "24px" }}>
          Upload
        </button>
        {progress.started && <progress max="100" value={progress.pc}></progress>}
        {msg && <p>{msg}</p>}
      </div>

      <div style={{
        width: "40%", margin: "20px auto", padding: "20px",
        backgroundColor: "#f0f0f0", border: "5px solid #ccc", borderRadius: "8px",
      }}>
        <h1>Uploaded Files</h1>
        {fileList.length === 0 ? <p>No files yet</p> : (
          <ul>
            {fileList.map((file, idx) => (
              <li key={idx}>
                <a href={`${SERVER_URL}/uploads/${encodeURIComponent(file)}`} download>{file}</a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
