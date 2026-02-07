// synths/base/envelope.js

export class Envelope {

  constructor(a = 0.01, d = 0.1, s = 0.8, r = 0.2) {

    this.a = a;
    this.d = d;
    this.s = s;
    this.r = r;

    this.level = 0;
    this.stage = "attack";
  }

  next(dt) {

    switch (this.stage) {

      case "attack":
        this.level += dt / this.a;
        if (this.level >= 1) {
          this.level = 1;
          this.stage = "decay";
        }
        break;

      case "decay":
        this.level -= dt / this.d;
        if (this.level <= this.s) {
          this.level = this.s;
          this.stage = "sustain";
        }
        break;

      case "release":
        this.level -= dt / this.r;
        if (this.level <= 0) {
          this.level = 0;
        }
        break;
    }

    return this.level;
  }

  noteOff() {
    this.stage = "release";
  }
}
