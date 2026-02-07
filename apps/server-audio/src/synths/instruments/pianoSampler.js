// synths/pianoSampler.js

import fs from "fs";

export class PianoSampler {

  constructor(sampleRate = 48000) {

    this.sampleRate = sampleRate;

    // map: note -> Float32Array
    this.samples = new Map();

    // active voices
    this.voices = [];
  }

  loadNote(note, path) {

    const buf = fs.readFileSync(path);

    // assume raw f32 mono for simplicity
    const f = new Float32Array(
      buf.buffer,
      buf.byteOffset,
      buf.byteLength / 4
    );

    this.samples.set(note, f);
  }

  noteOn(note, velocity = 1) {

    const sample = this.samples.get(note);
    if (!sample) return;

    this.voices.push({
      sample,
      pos: 0,
      vel: velocity,
      active: true
    });
  }

  noteOff(note) {

    // simple release: mark inactive
    for (const v of this.voices)
      if (v.sample === this.samples.get(note))
        v.active = false;
  }

  process(frames = 128) {

    const out = new Float32Array(frames);

    for (let i = 0; i < frames; i++) {

      let s = 0;

      for (const v of this.voices) {

        const p = v.pos | 0;

        if (p >= v.sample.length) {
          v.active = false;
          continue;
        }

        // linear interpolation
        const frac = v.pos - p;

        const a = v.sample[p] || 0;
        const b = v.sample[p + 1] || 0;

        s += (a + (b - a) * frac) * v.vel;

        v.pos += 1;
      }

      out[i] = s;
    }

    // remove dead voices
    this.voices =
      this.voices.filter(v => v.active);

    return out;
  }
}
