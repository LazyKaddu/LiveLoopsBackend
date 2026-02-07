// core/audioRenderer.js

export class AudioRenderer {

  constructor(blockSize = 256, options = {}) {

    this.sampleRate =
      options.sampleRate || 48000;

    this.blockSize = blockSize;

    // reusable conversion buffer
    this.out =
      new Float32Array(blockSize);
  }

  /**
   * Convert engine PCM → ffmpeg-ready PCM
   * - clamp
   * - denormal guard
   * - copy to reusable buffer
   */
  format(pcm) {

    const out = this.out;

    for (let i = 0; i < pcm.length; i++) {

      let s = pcm[i];

      // denormal protection
      s += 1e-24;
      s -= 1e-24;

      // hard ceiling
      if (s > 0.999) s = 0.999;
      if (s < -0.999) s = -0.999;

      // NaN guard
      if (!Number.isFinite(s))
        s = 0;

      out[i] = s;
    }

    return out;
  }

  /**
   * Optional: Float32 → Int16 for some ffmpeg builds
   */
  toInt16(pcm) {

    const buf =
      new Int16Array(pcm.length);

    for (let i = 0; i < pcm.length; i++)
      buf[i] = pcm[i] * 32767;

    return buf;
  }
}
