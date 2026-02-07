// core/frameClock.js

export class FrameClock {

  constructor(options = {}) {

    this.sampleRate = options.sampleRate || 48000;

    // FIXED AUDIO BLOCK – deterministic
    this.blockSize = options.blockSize || 256;

    // ideal interval in ms for one block
    this.intervalMs =
      (this.blockSize / this.sampleRate) * 1000;

    this.running = false;

    this.listeners = new Set();

    // high resolution time
    this.lastTick = process.hrtime.bigint();

    // drift accumulator (ms)
    this.error = 0;

    // safety
    this.maxCatchup = options.maxCatchup || 4;
  }

  onTick(fn) {
    this.listeners.add(fn);
  }

  offTick(fn) {
    this.listeners.delete(fn);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTick = process.hrtime.bigint();
    // Schedule first loop iteration
    setImmediate(() => this.loop());
  }

  stop() {
    this.running = false;
  }

  async loop() {

    if (!this.running) return;

    const now = process.hrtime.bigint();

    const elapsedMs =
      Number(now - this.lastTick) / 1_000_000;

    // accumulate drift
    this.error += elapsedMs - this.intervalMs;

    let blocks = 0;

    // decide how many blocks to render
    while (this.error >= 0 && blocks < this.maxCatchup) {
      blocks++;
      this.error -= this.intervalMs;
    }

    if (blocks > 0) {

      for (let i = 0; i < blocks; i++) {

        const payload = {
          frames: this.blockSize,
          timestamp: Number(now),
          sampleRate: this.sampleRate
        };

        // notify in sequence
        for (const fn of this.listeners) {
          try {
            await fn(payload);
          } catch (e) {
            console.error("FrameClock listener error", e);
          }
        }
      }

      this.lastTick = now;
    }

    // yield to event loop – realtime friendly
    setImmediate(() => this.loop());
  }
}
