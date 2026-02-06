
// sync/driftComp.js

export class DriftComp {

  constructor() {
    // userId → correction state
    this.state = new Map();
  }

  register(userId, offset) {

    const s = this.state.get(userId) || {
      current: offset,
      target: offset
    };

    s.target = offset;
    this.state.set(userId, s);
  }

  // called each bucket tick
  getSmoothed(userId) {

    const s = this.state.get(userId);
    if (!s) return 0;

    // move 10% toward target each tick
    s.current =
      s.current * 0.9 +
      s.target * 0.1;

    return s.current;
  }

  remove(userId) {
    this.state.delete(userId);
  }
}
