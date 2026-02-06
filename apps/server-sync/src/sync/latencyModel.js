// sync/latencyModel.js

export class LatencyModel {

  constructor() {
    // userId → stats
    this.stats = new Map();
  }

  record(userId, rtt) {

    const s = this.stats.get(userId) || {
      avg: rtt,
      jitter: 0,
      samples: 0
    };

    // moving average
    s.avg = s.avg * 0.85 + rtt * 0.15;

    // jitter estimate
    s.jitter =
      s.jitter * 0.85 +
      Math.abs(s.avg - rtt) * 0.15;

    s.samples++;

    this.stats.set(userId, s);
  }

  get(userId) {
    return (
      this.stats.get(userId) || {
        avg: 60,
        jitter: 10,
        samples: 0
      }
    );
  }

  remove(userId) {
    this.stats.delete(userId);
  }

  // suggestion for client playback delay
  suggestedBuffer(userId) {
    const s = this.get(userId);
    return Math.min(120, s.avg + s.jitter * 2);
  }
}
