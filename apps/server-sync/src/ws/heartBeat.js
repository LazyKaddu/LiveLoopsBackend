// ws/heartbeat.js
export function attachHeartbeat(socket) {

  socket.on("ping-check", (clientTime, cb) => {
    // client asks: “what time is it?”
    cb({
      serverTime: Date.now()
    });
  });

  // auto cleanup
  const interval = setInterval(() => {
    socket.emit("heartbeat");
  }, 5000);

  socket.on("disconnect", () => {
    clearInterval(interval);
  });
}
