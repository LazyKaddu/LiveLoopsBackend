// rooms/roomManager.js

import { RoomState } from "./roomState.js";
import { Permissions } from "./permissions.js";
import { Presence } from "./presence.js";

import { BucketScheduler } from "../bucket/bucketScheduler.js";

export class RoomManager {

  constructor(io, audioForwarder = null) {

    this.io = io;

    this.rooms = new Map();        // roomId → RoomState
    this.userRoom = new Map();     // userId → roomId

    this.permissions = new Permissions();
    this.presence = new Presence(io);

    // the sync engine
    this.scheduler = new BucketScheduler(io, audioForwarder);
    this.scheduler.start();
  }

  // ---------- ROOM LIFECYCLE ----------

  getOrCreate(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new RoomState(roomId));
    }
    return this.rooms.get(roomId);
  }

  joinRoom({ roomId, user, socketId }) {

    const room = this.getOrCreate(roomId);

    if (!this.permissions.canJoin(room, user)) {
      return { ok: false, error: "NOT_ALLOWED" };
    }

    room.addUser(user, socketId);
    this.userRoom.set(user.id, roomId);

    this.presence.userJoined(room, user);

    return { ok: true };
  }

  leaveRoom(roomId, userId) {

    const room = this.rooms.get(roomId);
    if (!room) return;

    room.removeUser(userId);
    this.userRoom.delete(userId);

    this.presence.userLeft(room, userId);

    // cleanup empty room
    if (room.users.size === 0) {
      this.destroyRoom(roomId);
    }
  }

  destroyRoom(roomId) {
    this.rooms.delete(roomId);
    this.scheduler.removeRoom(roomId);
  }

  removeUserEverywhere(userId) {
    const roomId = this.userRoom.get(userId);
    if (!roomId) return;

    this.leaveRoom(roomId, userId);
  }

  // ---------- MIDI PATH ----------

  handleMidi({ roomId, userId, note, velocity, time }) {

    const room = this.rooms.get(roomId);
    if (!room) return;

    if (!this.permissions.canSendMidi(room, userId)) {
      return;
    }

    // → send to sync engine
    this.scheduler.push(roomId, {
      userId,
      note,
      velocity,
      time
    });
  }

  // ---------- INFO ----------

  getRoomInfo(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      id: room.id,
      users: room.getUserList(),
      public: room.isPublic
    };
  }
}
