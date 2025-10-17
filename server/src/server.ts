import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { roomStore } from "./rooms";
import { registerSocketHandlers } from "./socket-handlers";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- Health check ---
app.get("/healthz", (_, res) => res.json({ status: "ok" }));

// --- REST endpoint for room creation (optional, frontend could also use socket) ---
app.post("/create-room", (req, res) => {
  const room = roomStore.createRoom();
  res.json({ roomCode: room.code });
});

// --- Cleanup loop (inactive rooms auto-delete) ---
setInterval(() => {
  roomStore.cleanupInactiveRooms(60 * 60 * 1000); // 1h inactivity
}, 5 * 60 * 1000);

// --- Socket.io handling ---
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  registerSocketHandlers(io, socket);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
