// forwarder/retry.js

export class Retry {

  constructor(opts = {}) {
    this.base = opts.base ?? 300;        // 300ms
    this.max = opts.max ?? 5000;         // 5s
    this.factor = opts.factor ?? 1.7;

    this.attempt = 0;
  }

  nextDelay() {
    const delay =
      Math.min(
        this.max,
        this.base * Math.pow(this.factor, this.attempt)
      );

    this.attempt++;
    return delay;
  }

  reset() {
    this.attempt = 0;
  }

  async wait() {
    const d = this.nextDelay();
    return new Promise(r => setTimeout(r, d));
  }
}
