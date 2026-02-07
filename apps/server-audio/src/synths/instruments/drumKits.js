// synths/drumKits.js

import fs from "fs";

export class DrumKits {

  constructor(sampleRate = 48000) {

    this.sampleRate = sampleRate;

    this.sounds = new Map();

    this.voices = [];

    // e.g. open hat chokes closed
    this.chokeGroups = {
      42: "hat",
      46: "hat"
    };
  }

  load(id, path) {

    const buf = fs.readFileSync(path);

    const f = new Float32Array(
      buf.buffer,
      buf.byteOffset,
      buf.byteLength / 4
    );

    this.sounds.set(id, f);
  }

  trigger(id, vel = 1) {

    const s = this.sounds.get(id);
    if (!s) return;

    // choke logic
    const g = this.chokeGroups[id];

    if (g) {
      for (const v of this.voices)
        if (v.group === g)
          v.active = false;
    }

    this.voices.push({
      sample: s,
      pos: 0,
      vel,
      active: true,
      group: g || null
    });
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

        s += v.sample[p] * v.vel;

        v.pos += 1;
      }

      out[i] = s;
    }

    this.voices =
      this.voices.filter(v => v.active);

    return out;
  }
}
