// synths/base/oscillator.js

export class Oscillator {

  constructor(sampleRate = 48000) {

    this.sampleRate = sampleRate;

    this.phase = 0;
    this.freq = 440;
    this.type = "sine";
  }

  setFreq(f) {
    this.freq = f;
  }

  setType(t) {
    this.type = t;
  }

  step() {

    const inc =
      (2 * Math.PI * this.freq) /
      this.sampleRate;

    this.phase += inc;

    if (this.phase > 2 * Math.PI)
      this.phase -= 2 * Math.PI;

    switch (this.type) {

      case "sine":
        return Math.sin(this.phase);

      case "square":
        return this.phase < Math.PI ? 1 : -1;

      case "saw":
        return (
          (this.phase / Math.PI) - 1
        );

      case "triangle":
        return (
          2 *
          Math.abs(
            (this.phase / Math.PI) - 1
          ) - 1
        );

      default:
        return Math.sin(this.phase);
    }
  }

  render(frames) {

    const buf =
      new Float32Array(frames);

    for (let i = 0; i < frames; i++)
      buf[i] = this.step();

    return buf;
  }
}
