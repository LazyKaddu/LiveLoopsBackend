// synths/instruments/sineSynth.js

import { Envelope } from "../base/envelop.js";

export class SineSynth {

  constructor(sampleRate = 48000) {

    this.sampleRate = sampleRate;

    this.voices = new Map();
  }

  noteOn(note, velocity) {

    const freq =
      440 * Math.pow(2, (note - 69) / 12);

    this.voices.set(note, {
      phase: 0,
      freq,
      env: new Envelope(),
      velocity
    });
  }

  noteOff(note) {

    const v = this.voices.get(note);

    if (v) v.env.noteOff();
  }

  render(frames) {

    const buf =
      new Float32Array(frames);

    const dt = 1 / this.sampleRate;

    for (let i = 0; i < frames; i++) {

      let s = 0;

      for (const [note, v] of this.voices) {

        v.phase +=
          (2 * Math.PI * v.freq) /
          this.sampleRate;

        const e = v.env.next(dt);

        s +=
          Math.sin(v.phase) *
          e *
          (v.velocity / 127);

        // remove finished
        if (e === 0 &&
            v.env.stage === "release") {

          this.voices.delete(note);
        }
      }

      buf[i] = s;
    }

    return buf;
  }
}
