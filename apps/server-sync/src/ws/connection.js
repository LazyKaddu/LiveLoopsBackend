// ws/connection.js

import { authenticate } from "./auth.js";
import { attachHeartbeat } from "./heartBeat.js";
import { attachRoomHandlers } from "./roomSocket.js";

export function setupSocketServer(io, roomManager) {

  // --- AUTH MIDDLEWARE ---
  io.use(authenticate);

  // --- ON CONNECT ---
  io.on("connection", (socket) => {

    console.log("Connected:", socket.user.id);

    // attach features
    attachHeartbeat(socket);
    attachRoomHandlers(io, socket, roomManager);

    // welcome
    socket.emit("welcome", {
      user: socket.user,
      serverTime: Date.now()
    });
  });
}
