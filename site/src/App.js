import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";

const socket = io("http://192.168.1.86:5000");

function App() {
  const [deviceNumber, setdeviceNumber] = useState(null);
  const [status, setStatus] = useState("Device waiting...");
  const [exchangeActive, setExchangeActive] = useState(false);
  const [files, setFiles] = useState(null);
  const [progress, setProgress] = useState( {started: false, pc: 0} );
  const [msg, setMsg] = useState(null);

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

  function handleUpload() {
    if (exchangeActive) {
      if (!files) {
      setMsg("No file selected");
      return;
      }
      else {
        socket.emit("upload");
        const fd = new FormData();
        for (let i=0; i<files.length; i++) {
          fd.append('file ${i+1}', files[i]);
        }

        setMsg("Uploading...");
        setProgress(prevState => {
          return{...prevState, started: true}
        })
        axios.post('http://httpbin.org/post', fd, {
          onUploadProgress:(progressEvent) => {setProgress(prevState => {
            return {...prevState, pc: progressEvent.progress*100}
          }) },
          headers: {
            "Custom-Header": "value",
          }
        })
        .then(res => {
          setMsg("Upload Successful")
          console.log(res.data)
          socket.emit("end")
        })
        .catch(err => {
          setMsg("Upload Failed")
          console.error(err)
        });
      }
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

            <input onChange = { (e) => {setFiles(e.target.files)}} type="file" multiple/>
            
            <button
              onClick={handleUpload}
              disabled={!exchangeActive}
              style={{ padding: "20px", fontSize: "24px" }}
            >
              Upload
            </button>

            {progress.started && <progress max="100" value={progress.pc}></progress>}

            {msg && <span>{msg}</span>}

          </>
        )}
      </div>
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
        <h1>Uploadings</h1>
      </div>
    </div>
  );
}

export default App;
