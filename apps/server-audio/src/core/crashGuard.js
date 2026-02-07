// core/crashGuard.js

export class CrashGuard {

  constructor(roomId, options = {}) {

    this.roomId = roomId;

    this.maxRestarts =
      options.maxRestarts || 5;

    this.windowMs =
      options.windowMs || 2 * 60_000;   // 2 min

    this.cooldownMs =
      options.cooldownMs || 30_000;

    this.restarts = [];

    this.lastCrashReason = null;

    this.state = "healthy"; // healthy | cooling | dead
  }

  canRestart() {

    const now = Date.now();

    // ---- prune old ----
    this.restarts =
      this.restarts.filter(
        t => now - t < this.windowMs
      );

    // ---- circuit breaker ----
    if (this.state === "dead")
      return false;

    if (this.state === "cooling") {

      const last =
        this.restarts[
          this.restarts.length - 1
        ];

      if (now - last < this.cooldownMs)
        return false;

      this.state = "healthy";
    }

    return this.restarts.length < this.maxRestarts;
  }

  registerCrash(err, type = "unknown") {

    const now = Date.now();

    this.restarts.push(now);

    this.lastCrashReason = {
      type,
      message: err?.message || String(err),
      at: now
    };

    // ---- escalate state ----
    if (
      this.restarts.length >=
      this.maxRestarts
    ) {
      this.state = "dead";
    } else {
      this.state = "cooling";
    }

    console.error(
      `[CRASH:${this.roomId}]`,
      type,
      err?.message || err
    );
  }

  backoffMs() {

    // gentler curve for audio rooms
    const n = this.restarts.length;

    return Math.min(
      200 * n * n,   // 200, 800, 1800...
      8000
    );
  }

  snapshot() {

    return {
      roomId: this.roomId,

      state: this.state,

      recentCrashes:
        this.restarts.length,

      last:
        this.lastCrashReason,

      canRestart:
        this.canRestart()
    };
  }
}
