// rooms/roomState.js

export class RoomState {
  constructor(id) {
    this.id = id;

    this.users = new Map();   // userId → user info
    this.createdAt = Date.now();

    this.isPublic = false;

    // runtime stats
    this.lastActivity = Date.now();
  }

  addUser(user, socketId) {
    this.users.set(user.id, {
      ...user,
      socketId,
      joinedAt: Date.now(),
      role: "player"   // default
    });

    this.touch();
  }

  removeUser(userId) {
    this.users.delete(userId);
    this.touch();
  }

  hasUser(userId) {
    return this.users.has(userId);
  }

  touch() {
    this.lastActivity = Date.now();
  }

  getUserList() {
    return Array.from(this.users.values());
  }
}
