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

    socket.on("ping-check", (clientTime, cb) => {

      const start = Date.now();

      cb({ serverTime: start });

      const rtt = Date.now() - start;

      roomManager.timeSync.registerSample(
        socket.id,
        clientTime,
        start,
        rtt
      );

      roomManager.latency.record(
        socket.user.id,
        rtt
      );

      roomManager.drift.register(
        socket.user.id,
        roomManager.timeSync.toServerTime(
          socket.id,
          clientTime
        )
      );
    });


  });
}
