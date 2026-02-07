// engine/roomEngine.js

import { AudioRenderer } from "../renderer/audioRenderer.js";
import { FfmpegPipeline } from "../ffmpeg/pipeline.js";

import { Mixer } from "./mixer.js";
import { Limiter } from "./limiter.js";
import { Meter } from "./meter.js";
import { VoiceManager } from "./voiceManager.js";

export class RoomEngine {

  constructor(roomId, sharedClock) {

    this.roomId = roomId;

    // ---- INJECTED GLOBAL CLOCK ----
    this.clock = sharedClock;

    // ---- PREALLOCATED BLOCK ----
    this.blockSize = 256;

    this.block =
      new Float32Array(this.blockSize);

    // core pieces
    this.renderer =
      new AudioRenderer(this.blockSize);

    this.ffmpeg =
      new FfmpegPipeline(roomId);

    // dsp
    this.voices =
      new VoiceManager();

    this.mixer =
      new Mixer();

    this.limiter =
      new Limiter();

    this.meter =
      new Meter();

    // ---- WIRE MIXER ----
    this.mixer.addTrack(
      frames =>
        this.voices.render(frames)
    );

    // ---- CLOCK HOOK ----
    this._boundTick =
      ({ frames }) => this.tick(frames);

    this.clock.onTick(this._boundTick);
  }

  // from midiReceiver
  pushMidi(e) {

    try {

      if (e.type === "noteOn")
        this.voices.noteOn(
          e.note,
          e.velocity
        );

      if (e.type === "noteOff")
        this.voices.noteOff(e.note);

    } catch (err) {
      console.error(
        "[RoomEngine midi]",
        err
      );
    }
  }

  async tick(frames) {

    try {

      // ---- 1. MIX ----
      let pcm =
        this.mixer.mix(
          frames,
          this.block   // reuse buffer
        );

      // ---- 2. LIMIT ----
      pcm =
        this.limiter.process(pcm);

      // ---- 3. METER ----
      this.meter.process(pcm);

      // ---- 4. RENDER FORMAT ----
      const out =
        this.renderer.format(pcm);

      // ---- 5. STREAM ----
      await this.ffmpeg.writeFloat32(out);

    } catch (err) {

      console.error(
        "[RoomEngine tick]",
        err
      );
    }
  }

  stats() {

    return {
      roomId: this.roomId,

      meter:
        this.meter.snapshot(),

      ffmpeg:
        this.ffmpeg.monitor?.snapshot?.(),

      voices:
        this.voices.count()
    };
  }

  stop() {

    this.clock.offTick(this._boundTick);

    this.ffmpeg.stop();

    this.voices.reset();
  }
}
