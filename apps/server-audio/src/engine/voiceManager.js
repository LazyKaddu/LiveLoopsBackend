// engine/voiceManager.js

export class VoiceManager {

  constructor(sampleRate = 48000) {

    this.sampleRate = sampleRate;

    this.voices = new Map();
  }

  noteOn(note, velocity) {

    this.voices.set(note, {
      phase: 0,
      velocity,
      freq:
        440 * Math.pow(2, (note - 69) / 12)
    });
  }

  noteOff(note) {
    this.voices.delete(note);
  }


  count() {
    return this.voices.size;
  }

  reset() {
    this.voices.clear();
  }

  render(frames) {

    const buf =
      new Float32Array(frames);

    for (let i = 0; i < frames; i++) {

      let sample = 0;

      for (const v of this.voices.values()) {

        v.phase +=
          (2 * Math.PI * v.freq) /
          this.sampleRate;

        sample +=
          Math.sin(v.phase) *
          (v.velocity / 127);
      }

      buf[i] = sample;
    }

    return buf;
  }
}
