// synths/fx/chorus.js

export class Chorus {

  constructor(sampleRate = 48000) {

    this.sampleRate = sampleRate;

    this.rate = 0.25;      // Hz
    this.depth = 0.003;    // seconds
    this.mix = 0.35;

    this.phase = 0;

    this.maxDelay = Math.floor(sampleRate * 0.05);
    this.buffer = new Float32Array(this.maxDelay);
    this.idx = 0;
  }

  setRate(r) { this.rate = r; }
  setDepth(d) { this.depth = d; }
  setMix(m) { this.mix = m; }

  process(input) {

    const out = new Float32Array(input.length);

    for (let i = 0; i < input.length; i++) {

      const lfo =
        (Math.sin(this.phase) + 1) * 0.5;

      this.phase +=
        (2 * Math.PI * this.rate) /
        this.sampleRate;

      const delaySamps =
        1 +
        lfo *
        this.depth *
        this.sampleRate;

      const read =
        (this.idx -
          Math.floor(delaySamps) +
          this.maxDelay) %
        this.maxDelay;

      const wet =
        this.buffer[read] || 0;

      this.buffer[this.idx] = input[i];

      out[i] =
        input[i] * (1 - this.mix) +
        wet * this.mix;

      this.idx =
        (this.idx + 1) % this.maxDelay;
    }

    return out;
  }
}
