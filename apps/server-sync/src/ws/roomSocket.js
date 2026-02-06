// ws/roomSocket.js

export function attachRoomHandlers(io, socket, roomManager) {

  // JOIN ROOM
  socket.on("join-room", (roomId, cb) => {

    const result = roomManager.joinRoom({
      roomId,
      user: socket.user,
      socketId: socket.id
    });

    socket.join(roomId);

    // notify others
    io.to(roomId).emit("user-joined", {
      user: socket.user
    });

    cb?.({ ok: true });
  });


  // LEAVE ROOM
  socket.on("leave-room", (roomId) => {

    roomManager.leaveRoom(roomId, socket.user.id);

    socket.leave(roomId);

    io.to(roomId).emit("user-left", {
      userId: socket.user.id
    });
  });


  // MIDI FROM CLIENT
  socket.on("midi", (data) => {

    // minimal validation
    if (!data?.note) return;

    roomManager.handleMidi({
      roomId: data.roomId,
      userId: socket.user.id,
      note: data.note,
      velocity: data.velocity,
      time: Date.now()
    });
  });


  // DISCONNECT
  socket.on("disconnect", () => {
    roomManager.removeUserEverywhere(socket.user.id);
  });
}
