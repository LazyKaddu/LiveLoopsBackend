// synths/fx/reverb.js

class Comb {

  constructor(size, feedback) {
    this.buffer = new Float32Array(size);
    this.idx = 0;
    this.feedback = feedback;
  }

  process(x) {

    const y = this.buffer[this.idx];

    this.buffer[this.idx] =
      x + y * this.feedback;

    this.idx =
      (this.idx + 1) %
      this.buffer.length;

    return y;
  }
}


class AllPass {

  constructor(size, feedback) {

    this.buffer =
      new Float32Array(size);

    this.idx = 0;
    this.feedback = feedback;
  }

  process(x) {

    const bufout =
      this.buffer[this.idx];

    const y =
      -x +
      bufout;

    this.buffer[this.idx] =
      x + bufout * this.feedback;

    this.idx =
      (this.idx + 1) %
      this.buffer.length;

    return y;
  }
}


export class Reverb {

  constructor(sampleRate = 48000) {

    const s = sampleRate;

    // classic schroeder sizes
    this.combs = [
      new Comb(Math.floor(s * 0.0297), 0.805),
      new Comb(Math.floor(s * 0.0371), 0.827),
      new Comb(Math.floor(s * 0.0411), 0.783),
      new Comb(Math.floor(s * 0.0437), 0.764)
    ];

    this.all = [
      new AllPass(Math.floor(s * 0.005), 0.7),
      new AllPass(Math.floor(s * 0.0017), 0.7)
    ];

    this.mix = 0.35;
  }

  setMix(m) { this.mix = m; }

  process(input) {

    const out =
      new Float32Array(input.length);

    for (let i = 0; i < input.length; i++) {

      let x = input[i];

      // parallel combs
      let c = 0;
      for (const comb of this.combs)
        c += comb.process(x);

      c /= this.combs.length;

      // series allpass
      let a = c;
      for (const ap of this.all)
        a = ap.process(a);

      out[i] =
        input[i] * (1 - this.mix) +
        a * this.mix;
    }

    return out;
  }
}
