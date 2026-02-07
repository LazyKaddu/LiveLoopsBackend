// ffmpeg/monitor.js

export class FfmpegMonitor {

  constructor(roomId) {

    this.roomId = roomId;

    this.stats = {
      frames: 0,
      errors: 0,
      last: Date.now(),
      bitrate: 0
    };
  }

  feed(line) {

    // parse useful info from ffmpeg log
    if (line.includes("frame=")) {
      this.stats.frames++;
      this.stats.last = Date.now();
    }

    if (line.includes("bitrate=")) {

      const m =
        /bitrate=\s*([\d.]+)/.exec(line);

      if (m)
        this.stats.bitrate =
          parseFloat(m[1]);
    }

    if (line.toLowerCase().includes("error")) {
      this.stats.errors++;
    }
  }

  exit(code) {

    console.log(
      `[FFMPEG:${this.roomId}] exit`,
      code,
      this.stats
    );
  }

  snapshot() {

    return {
      roomId: this.roomId,
      ...this.stats,
      age: Date.now() - this.stats.last
    };
  }
}
