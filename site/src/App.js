import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://192.168.1.37:5000");

function App() {
  const [playerNumber, setPlayerNumber] = useState(null);
  const [status, setStatus] = useState("Oyuncu bekleniyor...");
  const [count, setCount] = useState(0);
  const [gameActive, setGameActive] = useState(false);

  useEffect(() => {
    socket.on("joined", ({ playerNumber }) => {
      setPlayerNumber(playerNumber);
      setStatus("Hazırsın, diğer oyuncuyu bekle...");
    });

    socket.on("full", () => {
      setStatus("Oda dolu, bekle.");
    });

    socket.on("players", (players) => {
      if (players.length === 2) {
        setStatus("Başlatmak için butona tıkla");
      }
    });

    socket.on("start", () => {
      setStatus("Oyun başladı! Tıkla! Tıkla! Tıkla!");
      setCount(0);
      setGameActive(true);
    });

    socket.on("end", ({ score1, score2, result }) => {
      setGameActive(false);
      setStatus(`${result} Skorlar: Oyuncu 1: ${score1}, Oyuncu 2: ${score2}`);
    });
  }, []);

  const handleClick = () => {
    if (gameActive) {
      setCount((prev) => prev + 1);
      socket.emit("click");
    }
  };

  const handleStart = () => {
    socket.emit("start");
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Tıklama Savaşı</h1>
      <p>Sen Oyuncu: {playerNumber || "?"}</p>
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
        {playerNumber && (
          <>
            <button onClick={handleStart} disabled={gameActive}>
              Oyunu Başlat
            </button>
            <br />
            <br />
            <button className = "tıkla"
              onClick={handleClick}
              disabled={!gameActive}
              style={{ padding: "20px", fontSize: "24px" }}
            >
              Tıkla ({count})
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
