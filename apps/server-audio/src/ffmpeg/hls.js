// ffmpeg/hls.js

import path from "path";
import fs from "fs";

export class HlsSession {

  constructor(roomId, options = {}) {

    this.roomId = roomId;

    this.baseDir =
      options.baseDir || path.join("streams", roomId);

    this.segmentTime =
      options.segmentTime || 2;      // seconds

    this.playlist = path.join(
      this.baseDir,
      "playlist.m3u8"
    );

    this.ensureDir();
  }

  ensureDir() {
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  getOutputArgs() {

    return [
      "-f", "s16le",
      "-ar", "48000",
      "-ac", "1",
      "-i", "pipe:0",

      // HLS settings
      "-c:a", "aac",
      "-b:a", "192k",

      "-f", "hls",
      "-hls_time", String(this.segmentTime),
      "-hls_list_size", "6",
      "-hls_flags", "delete_segments+append_list",

      this.playlist
    ];
  }

  getUrl(publicBase = "/streams") {
    return `${publicBase}/${this.roomId}/playlist.m3u8`;
  }
}
