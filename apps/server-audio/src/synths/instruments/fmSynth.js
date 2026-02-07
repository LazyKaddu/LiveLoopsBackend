// synths/fmSynth.js

export class FMSynth {

  constructor(sampleRate = 48000) {

    this.sampleRate = sampleRate;

    this.voices = [];

    // default patch
    this.patch = {
      ratio: [1, 2, 3, 4],
      index: [2, 1, 0.5, 0.3],
      env: {
        a: 0.01,
        d: 0.2,
        s: 0.7,
        r: 0.3
      }
    };
  }

  noteOn(freq, vel = 1) {

    this.voices.push({
      freq,
      vel,

      phase: [0, 0, 0, 0],

      level: 0,
      state: "attack"
    });
  }

  noteOff(freq) {

    for (const v of this.voices)
      if (v.freq === freq)
        v.state = "release";
  }

  _envStep(v) {

    const e = this.patch.env;

    switch (v.state) {

      case "attack":
        v.level += 1 / (e.a * this.sampleRate);
        if (v.level >= 1) v.state = "decay";
        break;

      case "decay":
        v.level -= 1 / (e.d * this.sampleRate);
        if (v.level <= e.s) v.state = "sustain";
        break;

      case "release":
        v.level -= 1 / (e.r * this.sampleRate);
        if (v.level <= 0) v.state = "dead";
        break;
    }

    v.level = Math.max(0, Math.min(1, v.level));
  }

  process(frames = 128) {

    const out = new Float32Array(frames);

    for (let i = 0; i < frames; i++) {

      let s = 0;

      for (const v of this.voices) {

        this._envStep(v);

        let mod = 0;

        for (let op = 0; op < 4; op++) {

          const r = this.patch.ratio[op];
          const idx = this.patch.index[op];

          v.phase[op] +=
            (2 * Math.PI * v.freq * r) /
            this.sampleRate;

          const osc =
            Math.sin(v.phase[op] + mod);

          mod = osc * idx;
        }

        s += mod * v.level * v.vel;
      }

      out[i] = s;
    }

    this.voices =
      this.voices.filter(v => v.state !== "dead");

    return out;
  }
}
