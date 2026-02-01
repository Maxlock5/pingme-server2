const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

/* ================= API ================= */

app.post("/api/register", (req, res) => {
  console.log("[API] REGISTER:", req.body);
  res.json({ ok: true });
});

app.post("/api/login", (req, res) => {
  console.log("[API] LOGIN:", req.body);

  res.json({
    ok: true,
    token: "DEV-TOKEN-" + Date.now(),
    username: req.body?.username || "user"
  });
});

app.get("/health", (req, res) => {
  res.send("OK");
});

/* ================= HTTP ================= */

const server = http.createServer(app);

/* ================= WS ================= */

const wss = new WebSocket.Server({ noServer: true });

const users = new Map();

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", ws => {
  console.log("[WS] Client connected");

  ws.on("message", data => {
    try {
      const msg = JSON.parse(data.toString());

      console.log("[WS] RECV:", msg);

      if (msg.type === "register") {
        users.set(ws, msg.userId);
      }

      if (msg.type === "message") {
        const from = users.get(ws);

        if (!from) return;

        const payload = JSON.stringify({
          type: "message",
          from,
          text: msg.text,
          time: Date.now()
        });

        wss.clients.forEach(c => {
          if (c.readyState === WebSocket.OPEN) {
            c.send(payload);
          }
        });
      }
    } catch (e) {
      console.error("[WS] Parse error", e);
    }
  });

  ws.on("close", () => {
    users.delete(ws);
    console.log("[WS] Client disconnected");
  });
});

/* ================= START ================= */

server.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port", PORT);
});
