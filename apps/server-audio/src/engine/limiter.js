// engine/limiter.js

export class Limiter {

  constructor(options = {}) {

    this.threshold = options.threshold || 0.95;
    this.releaseMs = options.releaseMs || 80;
    this.sampleRate = options.sampleRate || 48000;

    // envelope follower
    this.gain = 1;

    // release coefficient
    this.releaseCoeff =
      Math.exp(
        -1 / (
          (this.releaseMs / 1000) *
          this.sampleRate
        )
      );

    // tiny value to avoid denormals
    this.DENORMAL = 1e-24;
  }

  process(buffer) {

    let g = this.gain;
    const t = this.threshold;
    const r = this.releaseCoeff;

    for (let i = 0; i < buffer.length; i++) {

      let s = buffer[i];

      const abs = s < 0 ? -s : s;

      // ---- DETECT OVER ----
      if (abs > t) {

        const needed = t / (abs + 1e-12);

        // instant attack
        if (needed < g)
          g = needed;
      }
      else {
        // release back to 1
        g = g * r + (1 - r);
      }

      s = s * g;

      // final safety clip
      if (s > 1) s = 1;
      if (s < -1) s = -1;

      buffer[i] = s + this.DENORMAL;
    }

    this.gain = g;

    return buffer;
  }
}
