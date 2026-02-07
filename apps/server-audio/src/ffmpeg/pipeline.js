// ffmpeg/pipeline.js

import { spawn } from "child_process";
import { HlsSession } from "./hls.js";
import { FfmpegMonitor } from "./monitor.js";

export class FfmpegPipeline {

  constructor(roomId, options = {}) {

    this.roomId = roomId;

    this.hls =
      new HlsSession(roomId, options);

    this.monitor =
      new FfmpegMonitor(roomId);

    this.process = null;

    // ---- BACKPRESSURE QUEUE ----
    this.queue = [];

    this.writing = false;

    this.maxQueue = 64;
  }

  start() {

    if (this.process) return;

    const args =
      this.hls.getOutputArgs();

    this.process =
      spawn("ffmpeg", args);

    // ---- monitoring ----
    this.process.stderr.on(
      "data",
      d => this.monitor.feed(d.toString())
    );

    this.process.on(
      "exit",
      code => this.monitor.exit(code)
    );

    // drain when ready
    this.process.stdin.on(
      "drain",
      () => this._flush()
    );
  }

  async writeFloat32(buffer) {

    this.start();

    // ---- QUEUE PROTECTION ----
    if (this.queue.length > this.maxQueue) {

      this.monitor.warn(
        "ffmpeg queue overflow"
      );

      this.queue.shift(); // drop oldest
    }

    this.queue.push(buffer);

    if (!this.writing)
      await this._flush();
  }

  async _flush() {

    if (!this.process) return;

    this.writing = true;

    while (this.queue.length) {

      const buf =
        this.queue.shift();

      const int16 =
        this._toInt16(buf);

      const ok =
        this.process.stdin.write(int16);

      // ---- BACKPRESSURE ----
      if (!ok) {
        await new Promise(r =>
          this.process.stdin.once(
            "drain",
            r
          )
        );
      }
    }

    this.writing = false;
  }

  _toInt16(buffer) {

    const out =
      Buffer.alloc(buffer.length * 2);

    for (let i = 0; i < buffer.length; i++) {

      let s = buffer[i];

      // NaN guard
      if (!Number.isFinite(s)) s = 0;

      // clamp
      if (s > 1) s = 1;
      if (s < -1) s = -1;

      const v =
        s < 0
          ? s * 0x8000
          : s * 0x7fff;

      out.writeInt16LE(v, i * 2);
    }

    return out;
  }

  stop() {

    if (!this.process) return;

    try {

      this.process.stdin.end();

      this.process.kill("SIGINT");

    } catch (e) {
      console.error(
        "ffmpeg stop",
        e
      );
    }
  }
}
