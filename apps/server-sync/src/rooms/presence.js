// rooms/presence.js

export class Presence {

  constructor(io) {
    this.io = io;
  }

  userJoined(room, user) {
    this.io.to(room.id).emit("presence", {
      type: "JOINED",
      user,
      users: room.getUserList()
    });
  }

  userLeft(room, userId) {
    this.io.to(room.id).emit("presence", {
      type: "LEFT",
      userId,
      users: room.getUserList()
    });
  }

  state(room) {
    this.io.to(room.id).emit("presence", {
      type: "STATE",
      users: room.getUserList()
    });
  }
}
