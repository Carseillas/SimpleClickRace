import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://192.168.1.50:5000");

function App() {
  const [deviceNumber, setdeviceNumber] = useState(null);
  const [status, setStatus] = useState("Device waiting...");
  const [exchangeActive, setExchangeActive] = useState(false);

  useEffect(() => {
    socket.on("joined", ({ deviceNumber }) => {
      setdeviceNumber(deviceNumber);
      setStatus("Ready, waiting another device...");
    });

    socket.on("upload", () => {

    });

    socket.on("full", () => {
      setStatus("Someone exchanging");
    });

    socket.on("devices", (devices) => {
      if (devices.length === 2) {
        setStatus("Click to start exchange");
      }
    });

    socket.on("start", () => {
      setStatus("Exchange Ready");
      setExchangeActive(true);
    });

    socket.on("end", () => {
      setExchangeActive(false);
      setStatus(`Exchange Finished`);
    });
  }, []);

  const handleClick = () => {
    if (exchangeActive) {
      socket.emit("upload");
    }
  };

  const handleStart = () => {
    socket.emit("start");
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>File Exchange By LAN</h1>
      <p>Device no: {deviceNumber || "?"}</p>
      <div 
        style={{
          width: '40%',
          margin: '0 auto',
          padding: '20px',
          backgroundColor: '#f0f0f0',
          border: '5px solid #ccc',
          borderRadius: '8px'
        }}
      >
        <p>{status}</p>
        {deviceNumber && (
          <>
            <button onClick={handleStart} disabled={exchangeActive}>
              Start Exchange
            </button>
            <br />
            <br />
            <button className = "filebutton"
              onClick={handleClick}
              disabled={!exchangeActive}
              style={{ padding: "20px", fontSize: "24px" }}
            >
              Select File
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
