const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "pingme-dev-secret-change-in-production";
const JWT_EXPIRY = "24h";
const SALT_ROUNDS = 10;

// In-memory mock DB: { username: hashedPassword }
const users = new Map();

async function register(username, password) {
  if (!username || !password) {
    return { ok: false, error: "Username and password required" };
  }
  const u = String(username).trim().toLowerCase();
  if (u.length < 2) {
    return { ok: false, error: "Username too short" };
  }
  if (users.has(u)) {
    return { ok: false, error: "Username already exists" };
  }
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  users.set(u, hash);
  return { ok: true, username: u };
}

async function login(username, password) {
  if (!username || !password) {
    return { ok: false, error: "Username and password required" };
  }
  const u = String(username).trim().toLowerCase();
  const hash = users.get(u);
  if (!hash) {
    return { ok: false, error: "Invalid credentials" };
  }
  const match = await bcrypt.compare(password, hash);
  if (!match) {
    return { ok: false, error: "Invalid credentials" };
  }
  const token = jwt.sign({ userId: u }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  return { ok: true, token, username: u };
}

function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return { ok: true, userId: payload.userId };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = {
  register,
  login,
  verifyToken,
  JWT_SECRET
};
