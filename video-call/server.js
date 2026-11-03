// 双人视频通话 — 极简信令服务器（Express 静态页 + Socket.IO 信令）
// 房间最多 2 人；服务器只转发 SDP/ICE，不碰媒体流（WebRTC 点对点）。
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (req, res) => res.send("ok"));

const MAX_PER_ROOM = 2;

io.on("connection", (socket) => {
  let room = null;

  socket.on("join", (code) => {
    code = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    if (!code) return socket.emit("join-error", "房间码无效");
    const peers = io.sockets.adapter.rooms.get(code);
    const count = peers ? peers.size : 0;
    if (count >= MAX_PER_ROOM) return socket.emit("join-error", "房间已满（最多 2 人）");
    room = code;
    socket.join(code);
    // 先到者等对方，后到者触发建联（后到者做发起方，避免双边同时 offer 冲突）
    socket.emit("joined", { room: code, initiator: count === 1 });
    socket.to(code).emit("peer-joined");
  });

  socket.on("signal", (data) => {
    if (!room) return;
    socket.to(room).emit("signal", data);
  });

  socket.on("disconnect", () => {
    if (room) socket.to(room).emit("peer-left");
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => console.log("video-call listening on " + PORT));
