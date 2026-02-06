// forwarder/retry.js

export class Retry {

  constructor(opts = {}) {
    this.base = (opts.base ?? parseInt(process.env.RETRY_BASE_MS)) || 300;        // 300ms
    this.max = (opts.max ?? parseInt(process.env.RETRY_MAX_MS)) || 5000;         // 5s
    this.factor = (opts.factor ?? parseFloat(process.env.RETRY_FACTOR)) || 1.7;

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
