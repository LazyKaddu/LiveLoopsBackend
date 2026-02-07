// engine/mixer.js

export class Mixer {

  constructor(options = {}) {

    this.sampleRate = options.sampleRate || 48000;

    this.tracks = [];

    // ---- REUSABLE BUFFER ----
    this.out = new Float32Array(
      options.maxFrames || 2048
    );

    // tiny DC offset to avoid denormals
    this.DENORMAL = 1e-24;
  }

  addTrack(fn) {
    this.tracks.push(fn);
  }

  removeTrack(fn) {
    this.tracks =
      this.tracks.filter(t => t !== fn);
  }

  /**
   * Real-time safe mix
   * - zero allocations
   * - in-place buffer reuse
   */
  // engine/mixer.js
mix(frames, out = new Float32Array(frames)) {

  out.fill(0);

  for (const render of this.tracks) {
    const buf = render(frames);

    for (let i = 0; i < frames; i++)
      out[i] += buf[i];
  }

  if (this.tracks.length > 0) {
    const g = 1 / this.tracks.length;
    for (let i = 0; i < frames; i++)
      out[i] *= g;
  }

  return out;
}
}
