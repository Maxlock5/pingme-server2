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

function broadcastUserList() {
  const list = [...users.values()];
  const payload = { type: "users", users: list };
  const msg = JSON.stringify(payload);
  const clientCount = wss.clients.size;
  let sentCount = 0;
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(msg);
      sentCount++;
    }
  });
  console.log("[SERVER] broadcastUserList | list:", list, "| clients:", clientCount, "| sent:", sentCount, "| payload:", msg.substring(0, 120));
}

server.on("upgrade", (req, socket, head) => {
  console.log("[SERVER] WebSocket upgrade request");
  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", ws => {
  console.log("[SERVER] WebSocket connection OPEN");

  ws.on("message", data => {
    try {
      const msg = JSON.parse(data.toString());

      console.log("[SERVER] RECV:", msg.type, JSON.stringify(msg));

      if (msg.type === "register") {
        const name = msg.displayName || msg.userId || ws.userId;

        if (!name) {
          console.log("[SERVER] REGISTER FAILED - no name");
          return;
        }

        users.set(ws, name);

        console.log("[SERVER] USER REGISTERED:", name);
        console.log("[SERVER] USERS ONLINE:", [...users.values()]);

        broadcastUserList();
        return;
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
    const name = users.get(ws);
    users.delete(ws);
    console.log("[SERVER] USER DISCONNECTED:", name, "| users Map size:", users.size);
    broadcastUserList();
  });
});

/* ================= START ================= */

server.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port", PORT);
});
