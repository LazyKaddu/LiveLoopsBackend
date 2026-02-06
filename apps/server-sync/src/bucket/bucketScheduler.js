// bucket/bucketScheduler.js

import { NoteBuffer } from "./noteBuffer.js";
import { Merger } from "./merger.js";
import { Dispatcher } from "./dispatcher.js";

export class BucketScheduler {

  constructor(io, audioForwarder) {

    this.buffer = new NoteBuffer();
    this.merger = new Merger();
    this.dispatcher = new Dispatcher(io, audioForwarder);

    this.TICK = parseInt(process.env.BUCKET_TICK_MS) || 50;   // 50ms master clock
  }

  start() {
    setInterval(() => this.flushAll(), this.TICK);
  }

  // called by roomManager when midi arrives
  push(roomId, event) {
    this.buffer.add(roomId, event);
  }

  flushAll() {
    for (const roomId of this.buffer.buffers.keys()) {
      this.flushRoom(roomId);
    }
  }

  flushRoom(roomId) {

    const events = this.buffer.getAndClear(roomId);

    if (events.length === 0) return;

    const bundle = this.merger.merge(roomId, events);

    this.dispatcher.dispatch(bundle);
  }

  removeRoom(roomId) {
    this.buffer.clearRoom(roomId);
  }
}
