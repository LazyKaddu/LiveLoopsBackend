// bucket/noteBuffer.js

export class NoteBuffer {
  constructor() {
    // roomId → array of events
    this.buffers = new Map();
  }

  add(roomId, event) {
    if (!this.buffers.has(roomId)) {
      this.buffers.set(roomId, []);
    }

    this.buffers.get(roomId).push(event);
  }

  getAndClear(roomId) {
    const events = this.buffers.get(roomId) || [];
    this.buffers.set(roomId, []);
    return events;
  }

  clearRoom(roomId) {
    this.buffers.delete(roomId);
  }
}