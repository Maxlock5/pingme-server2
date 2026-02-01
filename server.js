const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("PingMe WebSocket server is running");
});

const wss = new WebSocket.Server({ noServer: true });
const users = new Map();

function broadcastUsers() {
  const list = Array.from(users.values());
  const msg = JSON.stringify({ type: "users", users: list });

  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(msg);
    }
  });

  console.log("[SERVER] users:", list);
}

function removeUser(ws) {
  const user = users.get(ws);
  if (user) {
    console.log("[SERVER] disconnected:", user);
    users.delete(ws);
    broadcastUsers();
  }
}

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", ws => {
  console.log("[SERVER] connected");

  ws.on("message", data => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "register") {
        users.set(ws, msg.userId);
        console.log("[SERVER] registered:", msg.userId);
        broadcastUsers();
      } else if (msg.type === "message") {
        const from = users.get(ws);
        if (from != null && msg.text != null) {
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
      }
    } catch (e) {
      console.error("[SERVER] parse error:", e);
    }
  });

  ws.on("error", () => removeUser(ws));
  ws.on("close", () => removeUser(ws));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("[SERVER] running on port", PORT);
});
