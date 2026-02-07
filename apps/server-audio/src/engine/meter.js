// engine/meter.js

export class Meter {

  constructor() {

    this.peak = 0;
    this.rms = 0;
    this.clips = 0;
  }

  process(buffer) {

    let sum = 0;

    for (let i = 0; i < buffer.length; i++) {

      const s = Math.abs(buffer[i]);

      if (s > 1) this.clips++;

      if (s > this.peak)
        this.peak = s;

      sum += s * s;
    }

    this.rms =
      Math.sqrt(sum / buffer.length);
  }

  snapshot() {

    return {
      peak: this.peak,
      rms: this.rms,
      clips: this.clips
    };
  }
}
