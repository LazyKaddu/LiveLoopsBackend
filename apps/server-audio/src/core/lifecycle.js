// core/lifeCycle.js

export const RoomState = {
  STARTING: "starting",
  RUNNING:  "running",
  STOPPING: "stopping",
  DEAD:     "dead"
};

// ---- VALID TRANSITIONS ----
const ALLOWED = {
  starting: ["running", "dead"],
  running:  ["stopping", "dead"],
  stopping: ["dead"],
  dead:     []
};

export class LifeCycle {

  constructor(roomId, logger = console) {

    this.roomId = roomId;
    this.log = logger;

    this.state = RoomState.STARTING;

    this.createdAt = Date.now();
    this.lastActive = Date.now();

    this.listeners = new Set();

    // prevent double stop
    this._transitioning = false;
  }

  touch() {
    this.lastActive = Date.now();
  }

  onChange(fn) {
    this.listeners.add(fn);
  }

  offChange(fn) {
    this.listeners.delete(fn);
  }

  /**
   * @param {RoomState} next
   * @param {object} [meta]
   */
  async setState(next, meta = {}) {

    if (this._transitioning)
      return false;

    const prev = this.state;

    // ---- GUARD ----
    if (!ALLOWED[prev]?.includes(next)) {

      this.log.warn?.(
        `[ROOM ${this.roomId}] invalid transition ${prev} → ${next}`
      );

      return false;
    }

    try {

      this._transitioning = true;

      this.state = next;

      // ---- NOTIFY ----
      for (const fn of this.listeners) {
        await fn(next, this.roomId, meta);
      }

      this.log.info?.(
        `[ROOM ${this.roomId}] ${prev} → ${next}`,
        meta?.reason || ""
      );

      return true;

    } finally {
      this._transitioning = false;
    }
  }

  isIdle(maxMs = 5 * 60_000) {
    return Date.now() - this.lastActive > maxMs;
  }

  age() {
    return Date.now() - this.createdAt;
  }

  snapshot() {

    return {
      roomId: this.roomId,
      state: this.state,
      age: this.age(),
      idleMs: Date.now() - this.lastActive,
      createdAt: this.createdAt
    };
  }
}
